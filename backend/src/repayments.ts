
import { Router } from 'express'
import pool from './db.js'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'

const router = Router()

interface Repayment extends RowDataPacket {
  id: number
  loan_id: number
  amount: string
  payment_date: Date
  payment_method: string | null
  reference: string | null
  status: string
}

interface Loan extends RowDataPacket {
  id: number
  total_repayable: string
  amount_paid: string
  outstanding_balance: string
  status: string
}

interface RepaymentInput {
  loan_id?: number
  amount?: number
  payment_method?: string
  reference?: string
}

// GET all repayments
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query<Repayment[]>(
      `SELECT r.*, b.first_name, b.last_name
       FROM repayments r
       JOIN loans l ON r.loan_id = l.id
       JOIN borrowers b ON l.borrower_id = b.id
       ORDER BY r.id DESC`
    )

    res.json({
      success: true,
      count: rows.length,
      data: rows,
    })
  } catch (error) {
    console.error('List repayments error:', error)
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve repayments',
    })
  }
})

// GET repayments for one loan
router.get('/loan/:loanId', async (req, res) => {
  try {
    const loanId = Number(req.params.loanId)

    if (!Number.isInteger(loanId) || loanId < 1) {
      res.status(400).json({
        success: false,
        message: 'Invalid loan ID',
      })
      return
    }

    const [rows] = await pool.query<Repayment[]>(
      `SELECT * FROM repayments
       WHERE loan_id = ?
       ORDER BY payment_date DESC`,
      [loanId]
    )

    res.json({
      success: true,
      count: rows.length,
      data: rows,
    })
  } catch (error) {
    console.error('Loan repayment history error:', error)
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve repayment history',
    })
  }
})

// GET one repayment
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({
        success: false,
        message: 'Invalid repayment ID',
      })
      return
    }

    const [rows] = await pool.query<Repayment[]>(
      'SELECT * FROM repayments WHERE id = ?',
      [id]
    )

    if (rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Repayment not found',
      })
      return
    }

    res.json({
      success: true,
      data: rows[0],
    })
  } catch (error) {
    console.error('Get repayment error:', error)
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve repayment',
    })
  }
})

// RECORD a repayment
router.post('/', async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const body = req.body as RepaymentInput
    const loanId = Number(body.loan_id)
    const amount = Number(body.amount)
    const paymentMethod = body.payment_method?.trim() || null
    const reference = body.reference?.trim() || null

    if (
      !Number.isInteger(loanId) ||
      loanId < 1 ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      res.status(400).json({
        success: false,
        message: 'Provide a valid loan ID and a positive payment amount',
      })
      return
    }

    await connection.beginTransaction()

    const [loans] = await connection.query<Loan[]>(
      'SELECT * FROM loans WHERE id = ? FOR UPDATE',
      [loanId]
    )

    if (loans.length === 0) {
      await connection.rollback()
      res.status(404).json({
        success: false,
        message: 'Loan not found',
      })
      return
    }

    const loan = loans[0]
    const outstanding = Number(loan.outstanding_balance)

    if (['completed', 'defaulted'].includes(loan.status)) {
      await connection.rollback()
      res.status(409).json({
        success: false,
        message: 'This loan cannot accept repayments in its current status',
      })
      return
    }

    if (amount > outstanding + 0.000001) {
      await connection.rollback()
      res.status(400).json({
        success: false,
        message: 'Payment exceeds the outstanding balance',
        outstanding_balance: outstanding,
      })
      return
    }

    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO repayments
       (loan_id, amount, payment_method, reference, status)
       VALUES (?, ?, ?, ?, 'successful')`,
      [loanId, amount, paymentMethod, reference]
    )

    const newAmountPaid =
      Math.round((Number(loan.amount_paid) + amount) * 100) / 100

    const newOutstanding =
      Math.max(0, Math.round((outstanding - amount) * 100) / 100)

    const newStatus = newOutstanding === 0 ? 'completed' : 'active'

    await connection.execute(
      `UPDATE loans
       SET amount_paid = ?,
           outstanding_balance = ?,
           status = ?
       WHERE id = ?`,
      [newAmountPaid, newOutstanding, newStatus, loanId]
    )

    await connection.commit()

    const [rows] = await pool.query<Repayment[]>(
      'SELECT * FROM repayments WHERE id = ?',
      [result.insertId]
    )

    res.status(201).json({
      success: true,
      message: 'Repayment recorded successfully',
      data: rows[0],
      loan_summary: {
        loan_id: loanId,
        amount_paid: newAmountPaid,
        outstanding_balance: newOutstanding,
        status: newStatus,
      },
    })
  } catch (error) {
    await connection.rollback()
    console.error('Record repayment error:', error)

    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ER_DUP_ENTRY'
    ) {
      res.status(409).json({
        success: false,
        message: 'This payment reference already exists',
      })
      return
    }

    res.status(500).json({
      success: false,
      message: 'Unable to record repayment',
    })
  } finally {
    connection.release()
  }
})

export default router

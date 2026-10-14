
import { Router } from 'express'
import pool from './db.js'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'

const router = Router()

interface Loan extends RowDataPacket {
  id: number
  application_id: number
  borrower_id: number
  principal_amount: string
  interest_rate: string
  duration_months: number
  total_repayable: string
  amount_paid: string
  outstanding_balance: string
  disbursement_date: string | null
  due_date: string | null
  status: string
}

interface Application extends RowDataPacket {
  id: number
  borrower_id: number
  amount_requested: string
  interest_rate: string
  duration_months: number
  status: string
}

interface CreateLoanInput {
  application_id?: number
}

interface DisbursementInput {
  disbursement_date?: string
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00.000Z`)

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  )
}

// GET all loans
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query<Loan[]>(
      `SELECT l.*, b.first_name, b.last_name, b.email
       FROM loans l
       JOIN borrowers b ON l.borrower_id = b.id
       ORDER BY l.id DESC`
    )

    res.json({
      success: true,
      count: rows.length,
      data: rows,
    })
  } catch (error) {
    console.error('List loans error:', error)

    res.status(500).json({
      success: false,
      message: 'Unable to retrieve loans',
    })
  }
})

// GET one loan
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({
        success: false,
        message: 'Invalid loan ID',
      })
      return
    }

    const [rows] = await pool.query<Loan[]>(
      `SELECT l.*, b.first_name, b.last_name, b.email, b.phone
       FROM loans l
       JOIN borrowers b ON l.borrower_id = b.id
       WHERE l.id = ?`,
      [id]
    )

    if (rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Loan not found',
      })
      return
    }

    res.json({
      success: true,
      data: rows[0],
    })
  } catch (error) {
    console.error('Get loan error:', error)

    res.status(500).json({
      success: false,
      message: 'Unable to retrieve loan',
    })
  }
})

// CREATE a loan from an approved application.
// Creating a loan does NOT mean it has been disbursed.
router.post('/', async (req, res) => {
  const connection = await pool.getConnection()
  let transactionStarted = false

  try {
    const body = req.body as CreateLoanInput
    const applicationId = Number(body.application_id)

    if (!Number.isInteger(applicationId) || applicationId < 1) {
      res.status(400).json({
        success: false,
        message: 'A valid application_id is required',
      })
      return
    }

    await connection.beginTransaction()
    transactionStarted = true

    const [applications] = await connection.query<Application[]>(
      `SELECT * FROM loan_applications
       WHERE id = ?
       FOR UPDATE`,
      [applicationId]
    )

    if (applications.length === 0) {
      await connection.rollback()
      transactionStarted = false

      res.status(404).json({
        success: false,
        message: 'Loan application not found',
      })
      return
    }

    const application = applications[0]

    if (application.status !== 'approved') {
      await connection.rollback()
      transactionStarted = false

      res.status(409).json({
        success: false,
        message: 'Only approved applications can become loans',
      })
      return
    }

    const [existingLoans] = await connection.query<Loan[]>(
      'SELECT id FROM loans WHERE application_id = ?',
      [applicationId]
    )

    if (existingLoans.length > 0) {
      await connection.rollback()
      transactionStarted = false

      res.status(409).json({
        success: false,
        message: 'A loan already exists for this application',
      })
      return
    }

    const principal = Number(application.amount_requested)
    const rate = Number(application.interest_rate)
    const months = Number(application.duration_months)

    if (
      !Number.isFinite(principal) ||
      principal <= 0 ||
      !Number.isFinite(rate) ||
      rate < 0 ||
      !Number.isInteger(months) ||
      months < 1
    ) {
      await connection.rollback()
      transactionStarted = false

      res.status(400).json({
        success: false,
        message: 'The application contains invalid loan terms',
      })
      return
    }

    // Prototype calculation using simple annual interest.
    // Confirm the lending policy before using this in production.
    const totalRepayable =
      Math.round(
        principal * (1 + (rate / 100) * (months / 12)) * 100
      ) / 100

    const dueDate = new Date()
    dueDate.setMonth(dueDate.getMonth() + months)

    const dueDateString = dueDate.toISOString().slice(0, 10)

    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO loans
       (application_id, borrower_id, principal_amount,
        interest_rate, duration_months, total_repayable,
        amount_paid, outstanding_balance, disbursement_date,
        due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, NULL, ?, 'approved')`,
      [
        application.id,
        application.borrower_id,
        principal,
        rate,
        months,
        totalRepayable,
        totalRepayable,
        dueDateString,
      ]
    )

    await connection.commit()
    transactionStarted = false

    const [rows] = await pool.query<Loan[]>(
      'SELECT * FROM loans WHERE id = ?',
      [result.insertId]
    )

    res.status(201).json({
      success: true,
      message: 'Loan record created. Disbursement has not been recorded.',
      data: rows[0],
    })
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback()
    }

    console.error('Create loan error:', error)

    res.status(500).json({
      success: false,
      message: 'Unable to create loan',
    })
  } finally {
    connection.release()
  }
})

// DISBURSE an approved loan.
// POST /api/loans/:id/disburse
router.post('/:id/disburse', async (req, res) => {
  const connection = await pool.getConnection()
  let transactionStarted = false

  try {
    const id = Number(req.params.id)
    const body = req.body as DisbursementInput

    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({
        success: false,
        message: 'Invalid loan ID',
      })
      return
    }

    const disbursementDate =
      body.disbursement_date ||
      new Date().toISOString().slice(0, 10)

    if (!isValidDate(disbursementDate)) {
      res.status(400).json({
        success: false,
        message: 'disbursement_date must be a valid date in YYYY-MM-DD format',
      })
      return
    }

    const today = new Date().toISOString().slice(0, 10)

    if (disbursementDate > today) {
      res.status(400).json({
        success: false,
        message: 'Disbursement date cannot be in the future',
      })
      return
    }

    await connection.beginTransaction()
    transactionStarted = true

    const [rows] = await connection.query<Loan[]>(
      `SELECT * FROM loans
       WHERE id = ?
       FOR UPDATE`,
      [id]
    )

    if (rows.length === 0) {
      await connection.rollback()
      transactionStarted = false

      res.status(404).json({
        success: false,
        message: 'Loan not found',
      })
      return
    }

    const loan = rows[0]

    if (loan.disbursement_date !== null) {
      await connection.rollback()
      transactionStarted = false

      res.status(409).json({
        success: false,
        message: 'This loan has already been disbursed',
        data: {
          id: loan.id,
          disbursement_date: loan.disbursement_date,
          status: loan.status,
        },
      })
      return
    }

    if (loan.status !== 'approved') {
      await connection.rollback()
      transactionStarted = false

      res.status(409).json({
        success: false,
        message: 'Only approved, undisburbed loans can be disbursed',
      })
      return
    }

    await connection.execute<ResultSetHeader>(
      `UPDATE loans
       SET disbursement_date = ?, status = 'active'
       WHERE id = ?`,
      [disbursementDate, id]
    )

    await connection.commit()
    transactionStarted = false

    const [updatedRows] = await pool.query<Loan[]>(
      `SELECT l.*, b.first_name, b.last_name, b.email
       FROM loans l
       JOIN borrowers b ON l.borrower_id = b.id
       WHERE l.id = ?`,
      [id]
    )

    res.json({
      success: true,
      message: 'Loan disbursement recorded successfully',
      data: updatedRows[0],
    })
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback()
    }

    console.error('Disburse loan error:', error)

    res.status(500).json({
      success: false,
      message: 'Unable to record loan disbursement',
    })
  } finally {
    connection.release()
  }
})

// UPDATE loan status
router.patch('/:id/status', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { status } = req.body as { status?: string }

    const allowedStatuses = [
      'approved',
      'active',
      'completed',
      'overdue',
      'defaulted',
    ]

    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({
        success: false,
        message: 'Invalid loan ID',
      })
      return
    }

    if (!status || !allowedStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Invalid loan status',
      })
      return
    }

    const [rows] = await pool.query<Loan[]>(
      'SELECT * FROM loans WHERE id = ?',
      [id]
    )

    if (rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Loan not found',
      })
      return
    }

    const loan = rows[0]

    // An active loan must have a recorded disbursement date.
    // Use the dedicated /disburse endpoint to activate an approved loan.
    if (status === 'active' && loan.disbursement_date === null) {
      res.status(409).json({
        success: false,
        message: 'Record the loan disbursement before setting it to active',
      })
      return
    }

    // Do not allow a disbursed loan to be changed back to approved.
    if (status === 'approved' && loan.disbursement_date !== null) {
      res.status(409).json({
        success: false,
        message: 'A disbursed loan cannot be changed back to approved',
      })
      return
    }

    await pool.execute<ResultSetHeader>(
      'UPDATE loans SET status = ? WHERE id = ?',
      [status, id]
    )

    const [updatedRows] = await pool.query<Loan[]>(
      'SELECT * FROM loans WHERE id = ?',
      [id]
    )

    res.json({
      success: true,
      message: 'Loan status updated successfully',
      data: updatedRows[0],
    })
  } catch (error) {
    console.error('Update loan status error:', error)

    res.status(500).json({
      success: false,
      message: 'Unable to update loan status',
    })
  }
})

export default router

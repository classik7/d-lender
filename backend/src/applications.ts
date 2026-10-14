
import { Router } from 'express'
import pool from './db.js'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'

const router = Router()

interface Application extends RowDataPacket {
  id: number
  borrower_id: number
  amount_requested: string
  purpose: string
  duration_months: number
  interest_rate: string
  status: string
  application_date: Date
  updated_at: Date
}

interface Borrower extends RowDataPacket {
  id: number
}

interface ApplicationInput {
  borrower_id?: number
  amount_requested?: number
  purpose?: string
  duration_months?: number
  interest_rate?: number
}

// GET all loan applications
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query<Application[]>(
      `SELECT a.*, b.first_name, b.last_name, b.email
       FROM loan_applications a
       JOIN borrowers b ON a.borrower_id = b.id
       ORDER BY a.id DESC`
    )

    res.json({
      success: true,
      count: rows.length,
      data: rows,
    })
  } catch (error) {
    console.error('List applications error:', error)
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve loan applications',
    })
  }
})

// GET one loan application
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({
        success: false,
        message: 'Invalid application ID',
      })
      return
    }

    const [rows] = await pool.query<Application[]>(
      `SELECT a.*, b.first_name, b.last_name, b.email, b.phone
       FROM loan_applications a
       JOIN borrowers b ON a.borrower_id = b.id
       WHERE a.id = ?`,
      [id]
    )

    if (rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Loan application not found',
      })
      return
    }

    res.json({
      success: true,
      data: rows[0],
    })
  } catch (error) {
    console.error('Get application error:', error)
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve loan application',
    })
  }
})

// POST a new loan application
router.post('/', async (req, res) => {
  try {
    const body = req.body as ApplicationInput

    const borrowerId = Number(body.borrower_id)
    const amount = Number(body.amount_requested)
    const duration = Number(body.duration_months)
    const interestRate = Number(body.interest_rate ?? 0)
    const purpose = body.purpose?.trim()

    if (
      !Number.isInteger(borrowerId) ||
      borrowerId < 1 ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isInteger(duration) ||
      duration < 1 ||
      !purpose
    ) {
      res.status(400).json({
        success: false,
        message:
          'Provide a valid borrower ID, positive loan amount, purpose and duration in months',
      })
      return
    }

    if (
      !Number.isFinite(interestRate) ||
      interestRate < 0 ||
      interestRate > 100
    ) {
      res.status(400).json({
        success: false,
        message: 'Interest rate must be between 0 and 100',
      })
      return
    }

    const [borrowers] = await pool.query<Borrower[]>(
      'SELECT id FROM borrowers WHERE id = ?',
      [borrowerId]
    )

    if (borrowers.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Borrower not found',
      })
      return
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO loan_applications
       (borrower_id, amount_requested, purpose,
        duration_months, interest_rate, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [borrowerId, amount, purpose, duration, interestRate]
    )

    const [rows] = await pool.query<Application[]>(
      'SELECT * FROM loan_applications WHERE id = ?',
      [result.insertId]
    )

    res.status(201).json({
      success: true,
      message: 'Loan application submitted successfully',
      data: rows[0],
    })
  } catch (error) {
    console.error('Create application error:', error)
    res.status(500).json({
      success: false,
      message: 'Unable to submit loan application',
    })
  }
})

// PUT: update application status
router.patch('/:id/status', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { status } = req.body as { status?: string }

    const allowedStatuses = [
      'pending',
      'under_review',
      'approved',
      'rejected',
    ]

    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({
        success: false,
        message: 'Invalid application ID',
      })
      return
    }

    if (!status || !allowedStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Invalid application status',
      })
      return
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE loan_applications
       SET status = ?
       WHERE id = ?`,
      [status, id]
    )

    if (result.affectedRows === 0) {
      const [rows] = await pool.query<Application[]>(
        'SELECT id FROM loan_applications WHERE id = ?',
        [id]
      )

      if (rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Loan application not found',
        })
        return
      }
    }

    res.json({
      success: true,
      message: 'Loan application status updated successfully',
      data: {
        id,
        status,
      },
    })
  } catch (error) {
    console.error('Update application status error:', error)
    res.status(500).json({
      success: false,
      message: 'Unable to update application status',
    })
  }
})

export default router

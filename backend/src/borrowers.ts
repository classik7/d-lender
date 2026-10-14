
import { Router } from 'express'
import pool from './db.js'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'

const router = Router()

interface Borrower extends RowDataPacket {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string | null
  employment_status: string | null
  monthly_income: string
  created_at: Date
  updated_at: Date
}

interface BorrowerInput {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  address?: string | null
  employment_status?: string | null
  monthly_income?: number
}

// List borrowers
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query<Borrower[]>(
      'SELECT * FROM borrowers ORDER BY id DESC'
    )

    res.json({
      success: true,
      count: rows.length,
      data: rows,
    })
  } catch (error) {
    console.error('List borrowers error:', error)
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve borrowers',
    })
  }
})

// Get one borrower
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({
        success: false,
        message: 'Invalid borrower ID',
      })
      return
    }

    const [rows] = await pool.query<Borrower[]>(
      'SELECT * FROM borrowers WHERE id = ?',
      [id]
    )

    if (rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Borrower not found',
      })
      return
    }

    res.json({
      success: true,
      data: rows[0],
    })
  } catch (error) {
    console.error('Get borrower error:', error)
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve borrower',
    })
  }
})

// Register a borrower
router.post('/', async (req, res) => {
  try {
    const body = req.body as BorrowerInput
    const firstName = body.first_name?.trim()
    const lastName = body.last_name?.trim()
    const email = body.email?.trim().toLowerCase()
    const phone = body.phone?.trim()
    const income = Number(body.monthly_income ?? 0)

    if (!firstName || !lastName || !email || !phone) {
      res.status(400).json({
        success: false,
        message: 'First name, last name, email and phone are required',
      })
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({
        success: false,
        message: 'Enter a valid email address',
      })
      return
    }

    if (!Number.isFinite(income) || income < 0) {
      res.status(400).json({
        success: false,
        message: 'Monthly income must be a non-negative number',
      })
      return
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO borrowers
       (first_name, last_name, email, phone, address,
        employment_status, monthly_income)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        firstName,
        lastName,
        email,
        phone,
        body.address?.trim() || null,
        body.employment_status?.trim() || null,
        income,
      ]
    )

    const [rows] = await pool.query<Borrower[]>(
      'SELECT * FROM borrowers WHERE id = ?',
      [result.insertId]
    )

    res.status(201).json({
      success: true,
      message: 'Borrower registered successfully',
      data: rows[0],
    })
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ER_DUP_ENTRY'
    ) {
      res.status(409).json({
        success: false,
        message: 'A borrower with this email already exists',
      })
      return
    }

    console.error('Create borrower error:', error)
    res.status(500).json({
      success: false,
      message: 'Unable to register borrower',
    })
  }
})

// Update borrower
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const body = req.body as BorrowerInput

    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({
        success: false,
        message: 'Invalid borrower ID',
      })
      return
    }

    const [existing] = await pool.query<Borrower[]>(
      'SELECT * FROM borrowers WHERE id = ?',
      [id]
    )

    if (existing.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Borrower not found',
      })
      return
    }

    const current = existing[0]
    const firstName = body.first_name?.trim() ?? current.first_name
    const lastName = body.last_name?.trim() ?? current.last_name
    const email = body.email?.trim().toLowerCase() ?? current.email
    const phone = body.phone?.trim() ?? current.phone
    const address = body.address === undefined
      ? current.address
      : body.address?.trim() || null
    const employmentStatus = body.employment_status === undefined
      ? current.employment_status
      : body.employment_status?.trim() || null
    const income = body.monthly_income === undefined
      ? Number(current.monthly_income)
      : Number(body.monthly_income)

    if (!firstName || !lastName || !email || !phone) {
      res.status(400).json({
        success: false,
        message: 'Name, email and phone cannot be empty',
      })
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({
        success: false,
        message: 'Enter a valid email address',
      })
      return
    }

    if (!Number.isFinite(income) || income < 0) {
      res.status(400).json({
        success: false,
        message: 'Monthly income must be a non-negative number',
      })
      return
    }

    await pool.execute(
      `UPDATE borrowers
       SET first_name = ?, last_name = ?, email = ?, phone = ?,
           address = ?, employment_status = ?, monthly_income = ?
       WHERE id = ?`,
      [
        firstName,
        lastName,
        email,
        phone,
        address,
        employmentStatus,
        income,
        id,
      ]
    )

    const [updated] = await pool.query<Borrower[]>(
      'SELECT * FROM borrowers WHERE id = ?',
      [id]
    )

    res.json({
      success: true,
      message: 'Borrower updated successfully',
      data: updated[0],
    })
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ER_DUP_ENTRY'
    ) {
      res.status(409).json({
        success: false,
        message: 'A borrower with this email already exists',
      })
      return
    }

    console.error('Update borrower error:', error)
    res.status(500).json({
      success: false,
      message: 'Unable to update borrower',
    })
  }
})

// Delete borrower (only if no linked applications exist)
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({
        success: false,
        message: 'Invalid borrower ID',
      })
      return
    }

    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM borrowers WHERE id = ?',
      [id]
    )

    if (result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        message: 'Borrower not found',
      })
      return
    }

    res.json({
      success: true,
      message: 'Borrower deleted successfully',
    })
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ER_ROW_IS_REFERENCED_2'
    ) {
      res.status(409).json({
        success: false,
        message: 'Cannot delete a borrower with linked loan applications',
      })
      return
    }

    console.error('Delete borrower error:', error)
    res.status(500).json({
      success: false,
      message: 'Unable to delete borrower',
    })
  }
})

export default router

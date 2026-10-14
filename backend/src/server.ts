
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import pool from './db.js'
import borrowersRouter from './borrowers.js'
import applicationsRouter from './applications.js'
import loansRouter from './loans.js'
import repaymentsRouter from './repayments.js'

dotenv.config()

const app = express()
const PORT = Number(process.env.PORT) || 5000

// Middleware
app.use(cors())
app.use(express.json())

// Welcome endpoint
app.get('/', (_req, res) => {
  res.json({
    message: 'Welcome to the D-LENDER API',
    status: 'running',
    version: '1.0.0',
  })
})

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'D-LENDER API is healthy',
    timestamp: new Date().toISOString(),
  })
})

// Dashboard summary (sample figures for now)
app.get('/api/dashboard', (_req, res) => {
  res.json({
    success: true,
    data: {
      totalDisbursed: 24800000,
      outstandingLoans: 16200000,
      collectedThisMonth: 3450000,
      pendingApplications: 28,
    },
  })
})

// MySQL connection test
app.get('/api/db-test', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT 1 AS connected'
    )

    res.json({
      success: true,
      message: 'MySQL database connected successfully',
      data: rows,
    })
  } catch (error) {
    console.error('Database connection error:', error)

    res.status(500).json({
      success: false,
      message: 'Database connection failed',
    })
  }
})

// Borrowers API routes
app.use('/api/borrowers', borrowersRouter)

// Application API routes
app.use('/api/applications', applicationsRouter)

// loan API routes
app.use('/api/loans', loansRouter)

// repayments API routes
app.use('/api/repayments', repaymentsRouter)

// Start server
app.listen(PORT, () => {
  console.log(
    `D-LENDER API running at http://localhost:${PORT}`
  )
})

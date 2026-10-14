
const API_BASE_URL = 'http://localhost:5000/api'

export interface Borrower {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string | null
  employment_status: string | null
  monthly_income: string
  created_at: string
  updated_at: string
}

export interface LoanApplication {
  id: number
  borrower_id: number
  amount_requested: string
  purpose: string
  duration_months: number
  interest_rate: string
  status: 'pending' | 'under_review' | 'approved' | 'rejected'
  application_date: string
  updated_at: string
  first_name?: string
  last_name?: string
  email?: string
}

export interface Loan {
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
  status: 'approved' | 'active' | 'completed' | 'overdue' | 'defaulted'
  first_name?: string
  last_name?: string
  email?: string
}

export interface Repayment {
  id: number
  loan_id: number
  amount: string
  payment_date: string
  payment_method: string | null
  reference: string | null
  status: 'pending' | 'successful' | 'failed'
}

interface ApiList<T> {
  success: boolean
  count: number
  data: T[]
}

interface ApiItem<T> {
  success: boolean
  data: T
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`)

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const api = {
  getBorrowers: () =>
    request<ApiList<Borrower>>('/borrowers'),

  getApplications: () =>
    request<ApiList<LoanApplication>>('/applications'),

  getLoans: () =>
    request<ApiList<Loan>>('/loans'),

  getRepayments: () =>
    request<ApiList<Repayment>>('/repayments'),

  getBorrower: (id: number) =>
    request<ApiItem<Borrower>>(`/borrowers/${id}`),

  getApplication: (id: number) =>
    request<ApiItem<LoanApplication>>(`/applications/${id}`),

  getLoan: (id: number) =>
    request<ApiItem<Loan>>(`/loans/${id}`),
}

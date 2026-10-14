
import { useEffect, useState } from 'react'
import { api } from './api'
import type {
  Borrower,
  LoanApplication,
  Loan,
  Repayment,
} from './api'

type WorkspacePageProps = {
  page: string
}

const money = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount)

const cardClass =
  'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900'

const mutedClass = 'text-slate-500 dark:text-slate-400'

const tableHead =
  'bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-300'

const tableRows =
  'divide-y divide-slate-100 dark:divide-slate-800'

const cell = 'whitespace-nowrap px-5 py-4'

function Panel({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <div className={cardClass}>
      <p className={`text-sm ${mutedClass}`}>{title}</p>
      <p className="mt-3 text-2xl font-bold">{value}</p>
      <p className={`mt-2 text-xs ${mutedClass}`}>{description}</p>
    </div>
  )
}

function Status({ status }: { status: string }) {
  const normalized = status.toLowerCase()

  const styles: Record<string, string> = {
    approved:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    active:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    completed:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    successful:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    pending:
      'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    under_review:
      'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    overdue:
      'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    defaulted:
      'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    rejected:
      'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    failed:
      'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  }

  const label = status.replaceAll('_', ' ')

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
        styles[normalized] ??
        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {label}
    </span>
  )
}

function WorkspacePage({ page }: WorkspacePageProps) {
  const [borrowers, setBorrowers] = useState<Borrower[]>([])
  const [applications, setApplications] = useState<LoanApplication[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [repayments, setRepayments] = useState<Repayment[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)
      setError('')

      const results = await Promise.allSettled([
        api.getBorrowers(),
        api.getApplications(),
        api.getLoans(),
        api.getRepayments(),
      ])

      if (cancelled) return

      const failures: string[] = []

      if (results[0].status === 'fulfilled') {
        setBorrowers(results[0].value.data)
      } else {
        failures.push('borrowers')
      }

      if (results[1].status === 'fulfilled') {
        setApplications(results[1].value.data)
      } else {
        failures.push('applications')
      }

      if (results[2].status === 'fulfilled') {
        setLoans(results[2].value.data)
      } else {
        failures.push('loans')
      }

      if (results[3].status === 'fulfilled') {
        setRepayments(results[3].value.data)
      } else {
        failures.push('repayments')
      }

      if (failures.length > 0) {
        setError(
          `Unable to load: ${failures.join(', ')}. Check that the backend is running.`
        )
      }

      setLoading(false)
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className={`${cardClass} py-12 text-center`}>
        <p className="font-semibold">Loading D-LENDER records...</p>
        <p className={`mt-2 text-sm ${mutedClass}`}>
          Connecting to your backend API.
        </p>
      </div>
    )
  }

  const errorNotice = error ? (
    <div
      role="alert"
      className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
    >
      {error}
    </div>
  ) : null

  if (page === 'Applications') {
    const approved = applications.filter(
      (item) => item.status === 'approved'
    ).length

    const awaiting = applications.filter(
      (item) =>
        item.status === 'pending' ||
        item.status === 'under_review'
    ).length

    return (
      <section className="space-y-6">
        {errorNotice}

        <div>
          <h3 className="text-xl font-bold">Loan applications</h3>
          <p className={`mt-1 text-sm ${mutedClass}`}>
            Live application records from your database.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Panel
            title="Total applications"
            value={String(applications.length)}
            description="Database records"
          />
          <Panel
            title="Approved"
            value={String(approved)}
            description="Approved applications"
          />
          <Panel
            title="Awaiting review"
            value={String(awaiting)}
            description="Pending or under review"
          />
        </div>

        <div className={`${cardClass} overflow-x-auto !p-0`}>
          <table className="w-full text-left text-sm">
            <thead className={tableHead}>
              <tr>
                <th className="p-4">Applicant</th>
                <th className="p-4">Purpose</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className={tableRows}>
              {applications.map((item) => (
                <tr
                  key={item.id}
                  className="transition hover:bg-slate-50 dark:hover:bg-slate-800/70"
                >
                  <td className={`${cell} font-medium`}>
                    {item.first_name} {item.last_name}
                  </td>
                  <td className={`${cell} ${mutedClass}`}>
                    {item.purpose}
                  </td>
                  <td className={`${cell} font-semibold`}>
                    {money(Number(item.amount_requested))}
                  </td>
                  <td className={cell}>
                    <Status status={item.status} />
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center">
                    No applications found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  if (page === 'Loans') {
    const principalTotal = loans.reduce(
      (sum, item) => sum + Number(item.principal_amount),
      0
    )

    const outstandingTotal = loans.reduce(
      (sum, item) => sum + Number(item.outstanding_balance),
      0
    )

    return (
      <section className="space-y-6">
        {errorNotice}

        <div>
          <h3 className="text-xl font-bold">Loan portfolio</h3>
          <p className={`mt-1 text-sm ${mutedClass}`}>
            Loans and balances retrieved from MySQL.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Panel
            title="Total loans"
            value={String(loans.length)}
            description="Recorded loan accounts"
          />
          <Panel
            title="Total principal"
            value={money(principalTotal)}
            description="Original loan amounts"
          />
          <Panel
            title="Outstanding balance"
            value={money(outstandingTotal)}
            description="Remaining amounts owed"
          />
        </div>

        <div className={`${cardClass} overflow-x-auto !p-0`}>
          <table className="w-full text-left text-sm">
            <thead className={tableHead}>
              <tr>
                <th className="p-4">Borrower</th>
                <th className="p-4">Principal</th>
                <th className="p-4">Outstanding</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className={tableRows}>
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <td className={`${cell} font-medium`}>
                    {loan.first_name} {loan.last_name}
                  </td>
                  <td className={cell}>
                    {money(Number(loan.principal_amount))}
                  </td>
                  <td className={`${cell} font-semibold`}>
                    {money(Number(loan.outstanding_balance))}
                  </td>
                  <td className={cell}>
                    <Status status={loan.status} />
                  </td>
                </tr>
              ))}
              {loans.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center">
                    No loans found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  if (page === 'Borrowers') {
    return (
      <section className="space-y-6">
        {errorNotice}

        <div>
          <h3 className="text-xl font-bold">Borrowers</h3>
          <p className={`mt-1 text-sm ${mutedClass}`}>
            Registered borrower profiles from MySQL.
          </p>
        </div>

        <Panel
          title="Registered borrowers"
          value={String(borrowers.length)}
          description="Saved borrower records"
        />

        <div className="grid gap-4 md:grid-cols-2">
          {borrowers.map((borrower) => {
            const borrowerLoans = loans.filter(
              (loan) => loan.borrower_id === borrower.id
            )

            return (
              <article key={borrower.id} className={cardClass}>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                    {borrower.first_name[0]}
                    {borrower.last_name[0]}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold">
                      {borrower.first_name} {borrower.last_name}
                    </h4>
                    <p className={`break-all text-sm ${mutedClass}`}>
                      {borrower.email}
                    </p>
                    <p className={`mt-1 text-sm ${mutedClass}`}>
                      {borrower.phone}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
                  <span className={mutedClass}>
                    Loans: {borrowerLoans.length}
                  </span>
                  <span className={mutedClass}>
                    Monthly income: {money(Number(borrower.monthly_income))}
                  </span>
                </div>
              </article>
            )
          })}

          {borrowers.length === 0 && (
            <p className={mutedClass}>No borrowers found.</p>
          )}
        </div>
      </section>
    )
  }

  if (page === 'Repayments') {
    const paid = repayments.filter(
      (item) => item.status === 'successful'
    )

    const paidTotal = paid.reduce(
      (sum, item) => sum + Number(item.amount),
      0
    )

    return (
      <section className="space-y-6">
        {errorNotice}

        <div>
          <h3 className="text-xl font-bold">Repayment tracking</h3>
          <p className={`mt-1 text-sm ${mutedClass}`}>
            Recorded repayment transactions from your database.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Panel
            title="Total transactions"
            value={String(repayments.length)}
            description="Recorded repayment entries"
          />
          <Panel
            title="Successful payments"
            value={String(paid.length)}
            description="Marked successful in the database"
          />
          <Panel
            title="Successful amount"
            value={money(paidTotal)}
            description="Total of successful records"
          />
        </div>

        <div className={`${cardClass} overflow-x-auto !p-0`}>
          <table className="w-full text-left text-sm">
            <thead className={tableHead}>
              <tr>
                <th className="p-4">Loan ID</th>
                <th className="p-4">Payment date</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Method</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className={tableRows}>
              {repayments.map((item) => (
                <tr key={item.id}>
                  <td className={`${cell} font-medium`}>
                    #{item.loan_id}
                  </td>
                  <td className={`${cell} ${mutedClass}`}>
                    {new Date(item.payment_date).toLocaleDateString('en-NG')}
                  </td>
                  <td className={`${cell} font-semibold`}>
                    {money(Number(item.amount))}
                  </td>
                  <td className={`${cell} ${mutedClass}`}>
                    {item.payment_method || '—'}
                  </td>
                  <td className={cell}>
                    <Status status={item.status} />
                  </td>
                </tr>
              ))}
              {repayments.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center">
                    No repayments recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  if (page === 'Reports') {
    const approvedApplications = applications.filter(
      (item) => item.status === 'approved'
    )

    const approvedAmount = approvedApplications.reduce(
      (sum, item) => sum + Number(item.amount_requested),
      0
    )

    const outstanding = loans.reduce(
      (sum, loan) => sum + Number(loan.outstanding_balance),
      0
    )

    return (
      <section className="space-y-6">
        {errorNotice}

        <div>
          <h3 className="text-xl font-bold">Portfolio reports</h3>
          <p className={`mt-1 text-sm ${mutedClass}`}>
            Summary of records retrieved from your backend.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Panel
            title="Applications recorded"
            value={String(applications.length)}
            description="All application statuses"
          />
          <Panel
            title="Approved applications"
            value={money(approvedAmount)}
            description="Requested amounts for approved applications"
          />
          <Panel
            title="Registered borrowers"
            value={String(borrowers.length)}
            description="Saved borrower records"
          />
          <Panel
            title="Recorded loans"
            value={String(loans.length)}
            description="Loan accounts in the database"
          />
          <Panel
            title="Outstanding portfolio"
            value={money(outstanding)}
            description="Current recorded loan balances"
          />
          <Panel
            title="Repayment transactions"
            value={String(repayments.length)}
            description="Recorded payment entries"
          />
        </div>
      </section>
    )
  }

  return (
    <div className={cardClass}>
      <h3 className="text-xl font-bold">{page}</h3>
      <p className={`mt-2 text-sm ${mutedClass}`}>
        Choose a section from the sidebar.
      </p>
    </div>
  )
}

export default WorkspacePage


import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import WorkspacePage from './WorkspacePage'
import { api } from './api'
import type { LoanApplication, Loan, Repayment } from './api'

const navigation = [
  { name: 'Overview', icon: '▦' },
  { name: 'Applications', icon: '▤' },
  { name: 'Loans', icon: '◇' },
  { name: 'Borrowers', icon: '♙' },
  { name: 'Repayments', icon: '↻' },
  { name: 'Reports', icon: '▥' },
]

const money = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount)

const categoryColors = ['#10b981', '#38bdf8', '#a78bfa', '#f59e0b', '#fb7185']

function App() {
  const [activePage, setActivePage] = useState('Overview')
  const [darkMode, setDarkMode] = useState(() => {
  return localStorage.getItem('d-lender-theme') === 'dark'
})
  const [search, setSearch] = useState('')

  const [applications, setApplications] = useState<LoanApplication[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [repayments, setRepayments] = useState<Repayment[]>([])
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState('')
  
  useEffect(() => {
    localStorage.setItem('d-lender-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])


  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      setDashboardLoading(true)
      setDashboardError('')

      const results = await Promise.allSettled([
        api.getApplications(),
        api.getLoans(),
        api.getRepayments(),
      ])

      if (cancelled) return

      const failures: string[] = []

      if (results[0].status === 'fulfilled') {
        setApplications(results[0].value.data)
      } else {
        failures.push('applications')
      }

      if (results[1].status === 'fulfilled') {
        setLoans(results[1].value.data)
      } else {
        failures.push('loans')
      }

      if (results[2].status === 'fulfilled') {
        setRepayments(results[2].value.data)
      } else {
        failures.push('repayments')
      }

      if (failures.length > 0) {
        setDashboardError(
          `Unable to load ${failures.join(', ')}. Check that your backend and database are running.`,
        )
      }

      setDashboardLoading(false)
    }

    void loadDashboard()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredApplications = applications.filter((application) =>
    `${application.first_name ?? ''} ${application.last_name ?? ''} ${application.purpose} ${application.status}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  )

  const now = new Date()

  // Count only loans with a recorded disbursement date.
  const disbursedLoans = loans.filter(
    (loan) => loan.disbursement_date !== null,
  )

  const totalDisbursed = disbursedLoans.reduce(
    (sum, loan) => sum + Number(loan.principal_amount),
    0,
  )

  const outstandingLoans = disbursedLoans.reduce(
    (sum, loan) => sum + Number(loan.outstanding_balance),
    0,
  )

  const collectedThisMonth = repayments
    .filter((repayment) => {
      const date = new Date(repayment.payment_date)

      return (
        repayment.status === 'successful' &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      )
    })
    .reduce((sum, repayment) => sum + Number(repayment.amount), 0)

  const pendingApplications = applications.filter(
    (application) =>
      application.status === 'pending' ||
      application.status === 'under_review',
  ).length

  const repaymentData = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - 5 + index,
      1,
    )

    const collected = repayments
      .filter((repayment) => {
        const paymentDate = new Date(repayment.payment_date)

        return (
          repayment.status === 'successful' &&
          paymentDate.getMonth() === date.getMonth() &&
          paymentDate.getFullYear() === date.getFullYear()
        )
      })
      .reduce((sum, repayment) => sum + Number(repayment.amount), 0)

    return {
      month: date.toLocaleDateString('en-NG', { month: 'short' }),
      collected,
    }
  })

  const purposeCounts = applications.reduce<Record<string, number>>(
    (counts, application) => {
      const purpose = application.purpose || 'Other'
      counts[purpose] = (counts[purpose] ?? 0) + 1
      return counts
    },
    {},
  )

  const distributionData = Object.entries(purposeCounts).map(
    ([name, count], index) => ({
      name,
      value: applications.length
        ? Math.round((count / applications.length) * 100)
        : 0,
      color: categoryColors[index % categoryColors.length],
    }),
  )

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100 md:flex">
        <aside className="bg-slate-950 p-5 text-white md:min-h-screen md:w-64 md:shrink-0 md:p-6">
          <div className="mb-9 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-400 font-black text-slate-950">
              D-L
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide">D-LENDER</h1>
              <p className="text-xs text-slate-400">Lending simplified</p>
            </div>
          </div>

          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Workspace
          </p>

          <nav
            aria-label="Main navigation"
            className="flex gap-2 overflow-x-auto pb-2 md:flex-col"
          >
            {navigation.map((item) => (
              <button
                key={item.name}
                type="button"
                aria-current={activePage === item.name ? 'page' : undefined}
                onClick={() => setActivePage(item.name)}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
                  activePage === item.name
                    ? 'bg-emerald-400 font-semibold text-slate-950'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span aria-hidden="true" className="w-5 text-center text-lg">
                  {item.icon}
                </span>
                {item.name}
              </button>
            ))}
          </nav>

          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm font-semibold">D-LENDER Demo</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Portfolio prototype connected to a local database.
            </p>
          </div>

          <div className="mt-6 hidden rounded-xl border border-slate-800 p-3 md:block">
            <p className="text-xs text-slate-400">Display preference</p>
            <p className="mt-1 text-sm font-medium">
              {darkMode ? 'Dark appearance' : 'Light appearance'}
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {new Date().toLocaleDateString('en-NG', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>

              <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                {activePage === 'Overview'
                  ? 'Dashboard overview'
                  : activePage}
              </h2>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Welcome back. Here is your lending portfolio at a glance.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setDarkMode((current) => !current)}
                aria-label={
                  darkMode ? 'Switch to light mode' : 'Switch to dark mode'
                }
                aria-pressed={darkMode}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <span aria-hidden="true">{darkMode ? '☀️' : '🌙'}</span>
                {darkMode ? 'Light mode' : 'Dark mode'}
              </button>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                  AD
                </div>
                <div>
                  <p className="text-sm font-semibold">Admin Demo</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Administrator
                  </p>
                </div>
              </div>
            </div>
          </header>

          {activePage === 'Overview' ? (
            <>
              {dashboardLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  Loading live dashboard data...
                </div>
              ) : (
                <>
                  {dashboardError && (
                    <div
                      role="alert"
                      className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
                    >
                      {dashboardError}
                    </div>
                  )}

                  <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                      title="Total disbursed"
                      amount={money(totalDisbursed)}
                      note="Loans with a recorded disbursement date"
                    />
                    <SummaryCard
                      title="Outstanding loans"
                      amount={money(outstandingLoans)}
                      note="Remaining balances on disbursed loans"
                    />
                    <SummaryCard
                      title="Collected this month"
                      amount={money(collectedThisMonth)}
                      note="Successful recorded repayments"
                    />
                    <SummaryCard
                      title="Pending applications"
                      amount={String(pendingApplications)}
                      note="Awaiting a decision or review"
                    />
                  </section>
                </>
              )}

              <section className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">
                        Repayment collections
                      </h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Successful repayments recorded over the last six months
                      </p>
                    </div>

                    <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      This month: {money(collectedThisMonth)}
                    </span>
                  </div>

                  <div className="mt-6 h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={repaymentData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="collectedFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#10b981"
                              stopOpacity={0.28}
                            />
                            <stop
                              offset="95%"
                              stopColor="#10b981"
                              stopOpacity={0.02}
                            />
                          </linearGradient>
                        </defs>

                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={darkMode ? '#334155' : '#e2e8f0'}
                          vertical={false}
                        />

                        <XAxis
                          dataKey="month"
                          tickLine={false}
                          axisLine={false}
                          tick={{
                            fill: darkMode ? '#cbd5e1' : '#64748b',
                            fontSize: 12,
                          }}
                        />

                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={65}
                          tick={{
                            fill: darkMode ? '#cbd5e1' : '#64748b',
                            fontSize: 11,
                          }}
                          tickFormatter={(value: number) =>
                            `₦${value / 1000000}m`
                          }
                        />

                        <Tooltip
                          formatter={(value) => money(Number(value))}
                          contentStyle={{
                            borderRadius: 12,
                            border: `1px solid ${darkMode ? '#475569' : '#e2e8f0'}`,
                            backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                            color: darkMode ? '#f1f5f9' : '#0f172a',
                          }}
                        />

                        <Legend />

                        <Area
                          type="monotone"
                          dataKey="collected"
                          name="Collected"
                          stroke="#10b981"
                          fill="url(#collectedFill)"
                          strokeWidth={3}
                          activeDot={{ r: 6 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                    Figures are based on repayment records returned by your
                    backend.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                  <h3 className="text-lg font-bold">
                    Application distribution
                  </h3>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Recorded applications grouped by purpose
                  </p>

                  <div className="relative mt-4 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={distributionData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={62}
                          outerRadius={88}
                          paddingAngle={4}
                          stroke="none"
                        >
                          {distributionData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>

                        <Tooltip
                          formatter={(value) => `${value}%`}
                          contentStyle={{
                            borderRadius: 12,
                            border: `1px solid ${darkMode ? '#475569' : '#e2e8f0'}`,
                            backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                            color: darkMode ? '#f1f5f9' : '#0f172a',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold">
                        {applications.length}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Applications
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {distributionData.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          {item.name}
                        </span>
                        <span className="font-semibold">{item.value}%</span>
                      </div>
                    ))}

                    {distributionData.length === 0 && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        No applications are available to display yet.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
                  <div>
                    <h3 className="text-lg font-bold">
                      Recent applications
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Review the latest borrower requests
                    </p>
                  </div>

                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search applications..."
                    aria-label="Search loan applications"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-emerald-950 sm:w-64"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Borrower</th>
                        <th className="px-6 py-4 font-semibold">
                          Loan purpose
                        </th>
                        <th className="px-6 py-4 font-semibold">Amount</th>
                        <th className="px-6 py-4 font-semibold">Date</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredApplications.map((application) => (
                        <tr
                          key={application.id}
                          className="transition hover:bg-slate-50 dark:hover:bg-slate-800/70"
                        >
                          <td className="whitespace-nowrap px-6 py-4 font-semibold">
                            {application.first_name} {application.last_name}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 text-slate-500 dark:text-slate-400">
                            {application.purpose}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 font-semibold">
                            {money(Number(application.amount_requested))}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 text-slate-500 dark:text-slate-400">
                            {new Date(
                              application.application_date,
                            ).toLocaleDateString('en-NG')}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4">
                            <StatusBadge
                              status={
                                application.status === 'under_review'
                                  ? 'Review'
                                  : application.status.charAt(0).toUpperCase() +
                                    application.status.slice(1)
                              }
                            />
                          </td>
                        </tr>
                      ))}

                      {filteredApplications.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-6 py-10 text-center text-slate-500 dark:text-slate-400"
                          >
                            {applications.length === 0
                              ? 'No applications have been recorded yet.'
                              : 'No applications match your search.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-slate-100 px-6 py-4 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
                  D-LENDER portfolio prototype · Data loaded from your backend
                </div>
              </section>

              <footer className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                © {new Date().getFullYear()} D-LENDER · Lending simplified
              </footer>
            </>
          ) : (
            <WorkspacePage page={activePage} />
          )}
        </main>
      </div>
    </div>
  )
}

function SummaryCard({
  title,
  amount,
  note,
}: {
  title: string
  amount: string
  note: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-3 text-2xl font-bold tracking-tight">{amount}</p>
      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
        {note}
      </p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Approved:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    Pending:
      'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    Review:
      'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    Rejected:
      'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  }

  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
        styles[status] ??
        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {status}
    </span>
  )
}

export default App

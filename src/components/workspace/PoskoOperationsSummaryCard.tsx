import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatRupiah } from '@/lib/finance'
import type {
  FinanceTransaction,
  WorkProgram,
  TaskItem,
  TaskAssignee,
  WorkspaceMemberSummary,
  KknRisk,
} from '@/types/database'
import type { DashboardInventoryAlertItem } from '@/services/dashboardApi'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Layers,
  ShieldCheck,
} from 'lucide-react'

interface PoskoOperationsSummaryCardProps {
  financeTransactions: FinanceTransaction[]
  workPrograms: WorkProgram[]
  tasks: TaskItem[]
  taskAssignees: TaskAssignee[]
  members: WorkspaceMemberSummary[]
  inventoryAlerts?: DashboardInventoryAlertItem[]
  risks?: KknRisk[]
  todayDateKey: string
}

type FinancePeriodFilter = 'this_month' | 'last_30_days' | 'all'

export const PoskoOperationsSummaryCard: React.FC<PoskoOperationsSummaryCardProps> = ({
  financeTransactions,
  workPrograms,
  tasks,
  taskAssignees,
  members,
  inventoryAlerts = [],
  risks = [],
  todayDateKey,
}) => {
  const [periodFilter, setPeriodFilter] = useState<FinancePeriodFilter>('this_month')

  // Map user ID to member name for task assignees
  const memberNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members) {
      map.set(m.user_id, m.full_name)
    }
    return map
  }, [members])

  // Map task ID to list of assignee names
  const taskAssigneeMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const a of taskAssignees) {
      const name = memberNameMap.get(a.user_id)
      if (!name) continue
      const list = map.get(a.task_id) ?? []
      list.push(name)
      map.set(a.task_id, list)
    }
    return map
  }, [taskAssignees, memberNameMap])

  // -------------------------------------------------------------
  // 1. Peringatan Operasional (Actual Operational Alerts)
  // -------------------------------------------------------------
  const alerts = useMemo(() => {
    const list: Array<{
      id: string
      type: 'danger' | 'warning' | 'info'
      title: string
      desc: string
      to: string
      linkLabel: string
    }> = []

    // A. Overdue Tasks (due_date < today and not completed)
    const overdueTasks = tasks.filter(
      (t) => t.due_date && t.due_date < todayDateKey && t.status !== 'done'
    )
    if (overdueTasks.length > 0) {
      list.push({
        id: 'overdue-tasks',
        type: 'danger',
        title: `${overdueTasks.length} Tugas Melewati Tenggat`,
        desc: `Terdapat ${overdueTasks.length} tugas yang belum selesai dan telah melewati batas waktu.`,
        to: '/workspace/tasks',
        linkLabel: 'Buka Tugas',
      })
    }

    // B. Programs scheduled soon (starts within next 7 days and not completed)
    const baseDate = new Date(`${todayDateKey}T00:00:00`)
    const nextWeekDate = new Date(baseDate.getTime() + 7 * 86_400_000)
    const nextWeekKey = nextWeekDate.toISOString().split('T')[0]

    const upcomingPrograms = workPrograms.filter(
      (p) =>
        p.start_date &&
        p.start_date >= todayDateKey &&
        p.start_date <= nextWeekKey &&
        p.status !== 'completed' &&
        p.status !== 'cancelled'
    )
    if (upcomingPrograms.length > 0) {
      list.push({
        id: 'upcoming-programs',
        type: 'warning',
        title: `${upcomingPrograms.length} Program Kerja Segera Terlaksana`,
        desc: `${upcomingPrograms.slice(0, 2).map((p) => p.title).join(', ')}${upcomingPrograms.length > 2 ? '...' : ''} dijadwalkan dalam 7 hari ke depan.`,
        to: '/workspace/programs',
        linkLabel: 'Lihat Program',
      })
    }

    // C. Inventory loans not yet returned
    const unreturnedItems = inventoryAlerts.filter(
      (i) =>
        (i.item_status === 'borrowed_external' ||
          i.item_status === 'borrowed_member' ||
          (i.borrow_due_date && i.borrow_due_date < todayDateKey)) &&
        i.item_status !== 'returned'
    )
    if (unreturnedItems.length > 0) {
      list.push({
        id: 'unreturned-inventory',
        type: 'warning',
        title: `${unreturnedItems.length} Barang Belum Dikembalikan`,
        desc: `Barang pinjaman atau peminjaman anggota membutuhkan konfirmasi pengembalian.`,
        to: '/workspace/inventory',
        linkLabel: 'Cek Inventaris',
      })
    }

    // D. Urgent Risks Needing Mitigation
    if (risks && risks.length > 0) {
      const activeUrgentRisks = risks.filter(
        (r) => (r.priority === 'critical' || r.priority === 'high') && r.status !== 'resolved'
      )
      if (activeUrgentRisks.length > 0) {
        list.push({
          id: 'urgent-risks',
          type: 'danger',
          title: `${activeUrgentRisks.length} Risiko Membutuhkan Mitigasi`,
          desc: `Terdapat ${activeUrgentRisks.length} potensi kendala prioritas tinggi/kritis pada operasional atau K3 posko.`,
          to: '/workspace/risks',
          linkLabel: 'Matriks Risiko',
        })
      }
    }

    return list
  }, [tasks, workPrograms, inventoryAlerts, risks, todayDateKey])

  // -------------------------------------------------------------
  // 2. Arus Kas KKN (Cashflow Visualizer)
  // -------------------------------------------------------------
  const { filteredIncome, filteredExpense, netFlow, periodTransactionCount, hasTransactions } =
    useMemo(() => {
      // Exclude reversals/corrections
      const activeRows = financeTransactions.filter((t) => !t.reversal_of_transaction_id)

      const currentYearMonth = todayDateKey.slice(0, 7)
      const baseDate = new Date(`${todayDateKey}T00:00:00`)
      const thirtyDaysAgo = new Date(baseDate.getTime() - 30 * 86_400_000)
      const thirtyDaysAgoKey = thirtyDaysAgo.toISOString().split('T')[0]

      const filtered = activeRows.filter((t) => {
        if (periodFilter === 'all') return true
        if (periodFilter === 'this_month') {
          return t.transaction_date.startsWith(currentYearMonth)
        }
        if (periodFilter === 'last_30_days') {
          return t.transaction_date >= thirtyDaysAgoKey && t.transaction_date <= todayDateKey
        }
        return true
      })

      let income = 0
      let expense = 0
      for (const t of filtered) {
        const amt = Number(t.amount) || 0
        if (t.type === 'income') {
          income += amt
        } else if (t.type === 'expense') {
          expense += amt
        }
      }

      return {
        filteredIncome: income,
        filteredExpense: expense,
        netFlow: income - expense,
        periodTransactionCount: filtered.length,
        hasTransactions: filtered.length > 0,
      }
    }, [financeTransactions, periodFilter, todayDateKey])

  // Percentage comparison between income and expense
  const cashflowTotal = filteredIncome + filteredExpense
  const incomePercent = cashflowTotal > 0 ? Math.round((filteredIncome / cashflowTotal) * 100) : 0
  const expensePercent = cashflowTotal > 0 ? 100 - incomePercent : 0

  // -------------------------------------------------------------
  // 3. Progres Program Kerja (Work Programs Progress)
  // -------------------------------------------------------------
  const {
    activeProgramsCount,
    completedProgramsCount,
    inProgressProgramsCount,
    notStartedProgramsCount,
    overallProgramProgress,
  } = useMemo(() => {
    // Exclude cancelled/archived
    const active = workPrograms.filter((p) => p.status !== 'cancelled')
    const completed = active.filter((p) => p.status === 'completed').length
    const inProgress = active.filter((p) => p.status === 'ongoing').length
    const notStarted = active.filter((p) => p.status === 'planned').length
    const total = active.length

    const progress = total > 0 ? Math.round((completed / total) * 100) : 0

    return {
      activeProgramsCount: total,
      completedProgramsCount: completed,
      inProgressProgramsCount: inProgress,
      notStartedProgramsCount: notStarted,
      overallProgramProgress: progress,
    }
  }, [workPrograms])

  // -------------------------------------------------------------
  // 4. Status Tugas Tim & Tugas Perlu Perhatian (Tasks Summary)
  // -------------------------------------------------------------
  const {
    todoCount,
    inProgressCount,
    completedCount,
    overdueCount,
    attentionTasks,
  } = useMemo(() => {
    const activeTasks = tasks.filter((t) => t.status !== 'cancelled')

    let todo = 0
    let inProg = 0
    let comp = 0
    let overdue = 0

    for (const t of activeTasks) {
      if (t.status === 'done') {
        comp++
      } else if (t.status === 'in_progress') {
        inProg++
        if (t.due_date && t.due_date < todayDateKey) {
          overdue++
        }
      } else {
        todo++
        if (t.due_date && t.due_date < todayDateKey) {
          overdue++
        }
      }
    }

    // Tasks needing attention: overdue or due today/soon, and not done
    const attention = activeTasks
      .filter((t) => t.status !== 'done' && t.due_date)
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
      .slice(0, 3)

    return {
      todoCount: todo,
      inProgressCount: inProg,
      completedCount: comp,
      overdueCount: overdue,
      attentionTasks: attention,
    }
  }, [tasks, todayDateKey])

  return (
    <Card className="border-warm-300 bg-white">
      <CardHeader className="pb-3 border-b border-warm-200">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-serif font-semibold text-charcoal flex items-center gap-2">
              <Layers className="h-4 w-4 text-sage-700" />
              <span>Ringkasan Operasional Posko</span>
            </CardTitle>
            <CardDescription className="text-[11px] text-charcoal-muted mt-0.5">
              Kondisi arus kas, progres program kerja, dan status penugasan tim posko
            </CardDescription>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sage-50 text-sage-800 border border-sage-200">
            Realtime
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-5">
        {/* ========================================================= */}
        {/* A. PERINGATAN OPERASIONAL (ALERTS) */}
        {/* ========================================================= */}
        <div>
          {alerts.length > 0 ? (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-2.5 rounded-lg border text-xs flex items-start justify-between gap-2.5 ${
                    alert.type === 'danger'
                      ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                      : 'bg-amber-50/80 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <AlertTriangle
                      className={`h-4 w-4 shrink-0 mt-0.5 ${
                        alert.type === 'danger' ? 'text-rose-600' : 'text-amber-600'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-xs leading-snug">{alert.title}</p>
                      <p className="text-[11px] text-charcoal-muted mt-0.5 line-clamp-2 leading-relaxed">
                        {alert.desc}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={alert.to}
                    className="shrink-0 text-[11px] font-medium text-sage-800 hover:text-sage-900 underline flex items-center gap-0.5 mt-0.5"
                  >
                    <span>{alert.linkLabel}</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5 flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Operasional posko berjalan lancar dan seluruh tugas terkendali.</span>
              </div>
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* B. GRAFIK ARUS KAS KKN */}
        {/* ========================================================= */}
        <div className="rounded-lg border border-warm-200 bg-warm-50/50 p-3 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-emerald-700" />
              <h4 className="text-xs font-semibold text-charcoal">Arus Kas Keuangan</h4>
            </div>

            {/* Filter Periode */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPeriodFilter('this_month')}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                  periodFilter === 'this_month'
                    ? 'bg-sage-800 text-white font-semibold'
                    : 'bg-white text-charcoal-muted hover:text-charcoal border border-warm-300'
                }`}
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter('last_30_days')}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                  periodFilter === 'last_30_days'
                    ? 'bg-sage-800 text-white font-semibold'
                    : 'bg-white text-charcoal-muted hover:text-charcoal border border-warm-300'
                }`}
              >
                30 Hari
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter('all')}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                  periodFilter === 'all'
                    ? 'bg-sage-800 text-white font-semibold'
                    : 'bg-white text-charcoal-muted hover:text-charcoal border border-warm-300'
                }`}
              >
                Semua
              </button>
            </div>
          </div>

          {hasTransactions ? (
            <div className="space-y-2.5">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-white border border-emerald-200 space-y-0.5">
                  <div className="flex items-center justify-between text-[11px] text-emerald-800 font-medium">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>Pemasukan</span>
                    </span>
                    <span className="text-[10px] font-mono">{incomePercent}%</span>
                  </div>
                  <p className="font-semibold text-charcoal text-xs truncate">
                    {formatRupiah(filteredIncome)}
                  </p>
                </div>

                <div className="p-2 rounded bg-white border border-rose-200 space-y-0.5">
                  <div className="flex items-center justify-between text-[11px] text-rose-800 font-medium">
                    <span className="flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      <span>Pengeluaran</span>
                    </span>
                    <span className="text-[10px] font-mono">{expensePercent}%</span>
                  </div>
                  <p className="font-semibold text-charcoal text-xs truncate">
                    {formatRupiah(filteredExpense)}
                  </p>
                </div>
              </div>

              {/* Proportional Cashflow Bar */}
              <div className="space-y-1">
                <div className="h-2.5 w-full bg-warm-200 rounded-full overflow-hidden flex">
                  {cashflowTotal > 0 ? (
                    <>
                      <div
                        style={{ width: `${incomePercent}%` }}
                        className="bg-emerald-600 transition-all duration-300"
                        title={`Pemasukan: ${formatRupiah(filteredIncome)} (${incomePercent}%)`}
                      />
                      <div
                        style={{ width: `${expensePercent}%` }}
                        className="bg-rose-500 transition-all duration-300"
                        title={`Pengeluaran: ${formatRupiah(filteredExpense)} (${expensePercent}%)`}
                      />
                    </>
                  ) : (
                    <div className="w-full bg-warm-300" />
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-charcoal-muted">
                  <span>
                    Arus Bersih:{' '}
                    <strong className={netFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                      {formatRupiah(netFlow)}
                    </strong>
                  </span>
                  <span>{periodTransactionCount} transaksi tercatat</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded border border-dashed border-warm-300 bg-white text-center space-y-1">
              <p className="text-xs font-medium text-charcoal">Belum Ada Transaksi</p>
              <p className="text-[11px] text-charcoal-muted">
                Tidak ada data keuangan pada filter periode ini.
              </p>
            </div>
          )}

          <div className="pt-1 text-right">
            <Link
              to="/workspace/finance"
              className="text-[11px] font-medium text-sage-800 hover:text-sage-900 inline-flex items-center gap-1"
            >
              <span>Buka Buku Kas Keuangan</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* ========================================================= */}
        {/* C. GRAFIK PROGRES PROGRAM KERJA */}
        {/* ========================================================= */}
        <div className="rounded-lg border border-warm-200 bg-warm-50/50 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-blue-700" />
              <h4 className="text-xs font-semibold text-charcoal">Progres Program Kerja</h4>
            </div>
            <Badge variant="outline" className="text-[10px] bg-white border-warm-300 font-mono">
              {overallProgramProgress}% Selesai
            </Badge>
          </div>

          {activeProgramsCount > 0 ? (
            <div className="space-y-2">
              {/* Stacked Progress Bar */}
              <div className="h-2 w-full bg-warm-200 rounded-full overflow-hidden flex">
                <div
                  style={{
                    width: `${Math.round((completedProgramsCount / activeProgramsCount) * 100)}%`,
                  }}
                  className="bg-emerald-600 transition-all duration-300"
                  title={`Selesai: ${completedProgramsCount}`}
                />
                <div
                  style={{
                    width: `${Math.round((inProgressProgramsCount / activeProgramsCount) * 100)}%`,
                  }}
                  className="bg-blue-600 transition-all duration-300"
                  title={`Sedang Berjalan: ${inProgressProgramsCount}`}
                />
                <div
                  style={{
                    width: `${Math.round((notStartedProgramsCount / activeProgramsCount) * 100)}%`,
                  }}
                  className="bg-warm-400 transition-all duration-300"
                  title={`Belum Dimulai: ${notStartedProgramsCount}`}
                />
              </div>

              {/* Status Breakdown Legend */}
              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                <div className="p-1.5 rounded bg-white border border-warm-200">
                  <span className="text-emerald-700 font-bold block text-xs">
                    {completedProgramsCount}
                  </span>
                  <span className="text-charcoal-muted">Selesai</span>
                </div>
                <div className="p-1.5 rounded bg-white border border-warm-200">
                  <span className="text-blue-700 font-bold block text-xs">
                    {inProgressProgramsCount}
                  </span>
                  <span className="text-charcoal-muted">Berjalan</span>
                </div>
                <div className="p-1.5 rounded bg-white border border-warm-200">
                  <span className="text-charcoal font-bold block text-xs">
                    {notStartedProgramsCount}
                  </span>
                  <span className="text-charcoal-muted">Rencana</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded border border-dashed border-warm-300 bg-white text-center text-xs text-charcoal-muted">
              Belum ada program kerja terdaftar.
            </div>
          )}

          <div className="pt-0.5 text-right">
            <Link
              to="/workspace/programs"
              className="text-[11px] font-medium text-sage-800 hover:text-sage-900 inline-flex items-center gap-1"
            >
              <span>Semua Program ({activeProgramsCount})</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* ========================================================= */}
        {/* D. RINGKASAN STATUS TUGAS TIM & TUGAS PERLU PERHATIAN */}
        {/* ========================================================= */}
        <div className="rounded-lg border border-warm-200 bg-warm-50/50 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-purple-700" />
              <h4 className="text-xs font-semibold text-charcoal">Status Penugasan Tim</h4>
            </div>
            <Link
              to="/workspace/tasks"
              className="text-[11px] font-medium text-sage-800 hover:text-sage-900 inline-flex items-center gap-1"
            >
              <span>Buka Papan Tugas</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Status Metric Pills */}
          <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
            <div className="p-1 rounded bg-white border border-warm-200">
              <span className="font-bold text-xs block text-charcoal">{todoCount}</span>
              <span className="text-charcoal-muted">Belum</span>
            </div>
            <div className="p-1 rounded bg-white border border-warm-200">
              <span className="font-bold text-xs block text-blue-700">{inProgressCount}</span>
              <span className="text-charcoal-muted">Proses</span>
            </div>
            <div className="p-1 rounded bg-white border border-warm-200">
              <span className="font-bold text-xs block text-emerald-700">{completedCount}</span>
              <span className="text-charcoal-muted">Beres</span>
            </div>
            <div
              className={`p-1 rounded border ${
                overdueCount > 0
                  ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                  : 'bg-white border-warm-200 text-charcoal'
              }`}
            >
              <span className={`font-bold text-xs block ${overdueCount > 0 ? 'text-rose-700' : ''}`}>
                {overdueCount}
              </span>
              <span className="text-charcoal-muted">Terlambat</span>
            </div>
          </div>

          {/* Quick List: Tugas Perlu Perhatian */}
          <div className="space-y-1.5 pt-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-muted">
              Tugas Mendekati / Melewati Tenggat:
            </p>

            {attentionTasks.length > 0 ? (
              <div className="space-y-1.5">
                {attentionTasks.map((t) => {
                  const isOverdue = Boolean(t.due_date && t.due_date < todayDateKey)
                  const isDueToday = t.due_date === todayDateKey
                  const assignees = taskAssigneeMap.get(t.id) ?? []

                  return (
                    <Link
                      key={t.id}
                      to="/workspace/tasks"
                      className="block p-2 rounded bg-white border border-warm-200 hover:border-sage-400 transition-colors text-xs"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <p className="font-medium text-charcoal truncate flex-1">{t.title}</p>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold shrink-0 ${
                            isOverdue
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : isDueToday
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-warm-100 text-charcoal-muted'
                          }`}
                        >
                          {isOverdue ? 'Terlambat' : isDueToday ? 'Hari Ini' : t.due_date}
                        </span>
                      </div>
                      <p className="text-[10px] text-charcoal-muted truncate mt-0.5">
                        PIC: {assignees.length > 0 ? assignees.join(', ') : 'Belum Ditugaskan'}
                      </p>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p className="text-[11px] text-charcoal-muted italic py-1">
                Tidak ada tugas mendesak atau terlambat.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

import React, { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  History,
  Lock,
  Mail,
  RefreshCw,
  Save,
  Search,
  Send,
  Shield,
  Trash2,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog, Modal } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { ManualInviteLinkPanel } from '@/components/admin/ManualInviteLinkPanel'
import { DeleteUserDialog } from '@/components/admin/DeleteUserDialog'
import {
  adminApi,
  EdgeFunctionError,
  type AdminUserDto,
  type DirectoryAccountLifecycleStatus,
  type DirectoryRosterItemDto,
  type DirectoryRosterSummaryDto,
} from '@/services/adminApi'

interface DirectoryAccountRosterProps {
  roster: DirectoryRosterItemDto[]
  summary?: DirectoryRosterSummaryDto
  isLoading: boolean
}

const LIFECYCLE_BADGES: Record<
  DirectoryAccountLifecycleStatus,
  { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' }
> = {
  belum_diisi: { label: 'Belum diisi', variant: 'secondary' },
  siap_diundang: { label: 'Siap diundang', variant: 'outline' },
  undangan_terkirim: { label: 'Undangan terkirim', variant: 'warning' },
  menunggu_aktivasi: { label: 'Menunggu aktivasi', variant: 'warning' },
  aktif: { label: 'Aktif', variant: 'success' },
  undangan_kedaluwarsa: { label: 'Undangan kedaluwarsa', variant: 'destructive' },
  undangan_dibatalkan: { label: 'Undangan dibatalkan', variant: 'secondary' },
  perlu_tindakan: { label: 'Perlu tindakan', variant: 'destructive' },
  akun_dihapus: { label: 'Akun dihapus', variant: 'destructive' },
}

const MEMBERSHIP_STATUS_LABEL: Record<string, string> = {
  active: 'Aktif',
  invited: 'Undangan Menunggu',
  suspended: 'Ditangguhkan',
  revoked: 'Dicabut',
}

const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

function formatShortDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const DirectoryAccountRoster: React.FC<DirectoryAccountRosterProps> = ({
  roster,
  summary,
  isLoading,
}) => {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | DirectoryAccountLifecycleStatus>('all')
  const [draftEmails, setDraftEmails] = useState<Record<string, string>>({})
  const [emailErrors, setEmailErrors] = useState<Record<string, string>>({})
  const [savingEmailId, setSavingEmailId] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const [inviteConfirm, setInviteConfirm] = useState<{
    item: DirectoryRosterItemDto
    email: string
  } | null>(null)

  const [existingAccountConfirm, setExistingAccountConfirm] = useState<{
    item: DirectoryRosterItemDto
    email: string
    details: {
      email?: string
      is_super_admin?: boolean
      membership_role?: string | null
      membership_status?: string | null
      full_name?: string | null
    }
    message: string
  } | null>(null)

  const [revokeConfirm, setRevokeConfirm] = useState<{
    item: DirectoryRosterItemDto
    invitationId: string
    email: string
  } | null>(null)

  const [historyTarget, setHistoryTarget] = useState<DirectoryRosterItemDto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUserDto | null>(null)
  const [manualFallback, setManualFallback] = useState<{
    fullName?: string
    email: string
    positionLabel?: string | null
    inviteLink: string
    message: string
  } | null>(null)

  const filteredRoster = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return roster.filter((item) => {
      if (statusFilter !== 'all' && item.account_lifecycle_status !== statusFilter) {
        return false
      }
      if (!query) return true
      const haystack = [
        item.full_name,
        item.identity_number,
        item.position_label,
        item.division ?? '',
        item.resolved_email ?? '',
        item.account_email ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [roster, searchTerm, statusFilter])

  const invalidateAllRosterQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
      queryClient.invalidateQueries({ queryKey: ['workspace', 'team-directory'] }),
      queryClient.invalidateQueries({ queryKey: ['public', 'team-directory'] }),
    ])
  }

  const handleSaveEmail = async (item: DirectoryRosterItemDto, overrideEmail?: string): Promise<boolean> => {
    const raw =
      overrideEmail ??
      draftEmails[item.id] ??
      item.account_email ??
      item.resolved_email ??
      ''
    const normalized = raw.trim().toLowerCase()

    if (normalized && !EMAIL_PATTERN.test(normalized)) {
      setEmailErrors((prev) => ({ ...prev, [item.id]: 'Format email tidak valid.' }))
      return false
    }

    setEmailErrors((prev) => {
      const copy = { ...prev }
      delete copy[item.id]
      return copy
    })
    setSavingEmailId(item.id)
    try {
      const res = await adminApi.setDirectoryAccountEmail(item.id, normalized || null)
      setDraftEmails((prev) => {
        const copy = { ...prev }
        delete copy[item.id]
        return copy
      })
      await invalidateAllRosterQueries()

      if (res.existing_auth_warning) {
        toast({
          variant: 'warning',
          title: 'Email Tersimpan (Akun Auth Sudah Ada)',
          description: res.message,
        })
      } else {
        toast({
          variant: 'success',
          title: 'Email Anggota Disimpan',
          description: res.message,
        })
      }
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan email anggota.'
      setEmailErrors((prev) => ({ ...prev, [item.id]: msg }))
      toast({
        variant: 'error',
        title: 'Gagal Menyimpan Email',
        description: msg,
      })
      return false
    } finally {
      setSavingEmailId(null)
    }
  }

  const handleRequestInvite = async (item: DirectoryRosterItemDto) => {
    const currentEmail = (draftEmails[item.id] ?? item.resolved_email ?? '').trim().toLowerCase()
    if (!currentEmail) {
      setEmailErrors((prev) => ({ ...prev, [item.id]: 'Masukkan alamat email anggota terlebih dahulu.' }))
      return
    }
    if (!EMAIL_PATTERN.test(currentEmail)) {
      setEmailErrors((prev) => ({ ...prev, [item.id]: 'Format email tidak valid.' }))
      return
    }

    const persistedEmail = (item.account_email ?? '').trim().toLowerCase()
    if (currentEmail !== persistedEmail) {
      const saved = await handleSaveEmail(item, currentEmail)
      if (!saved) return
    }

    setInviteConfirm({ item, email: currentEmail })
  }

  const executeInvite = async (
    item: DirectoryRosterItemDto,
    email: string,
    confirmExistingAccount: boolean
  ) => {
    setProcessingId(item.id)
    try {
      const res = await adminApi.inviteUser({
        full_name: item.full_name,
        email,
        role: item.role,
        division: item.division,
        directory_member_id: item.id,
        confirm_existing_account: confirmExistingAccount,
      })

      setInviteConfirm(null)
      setExistingAccountConfirm(null)
      await invalidateAllRosterQueries()

      if (res.delivery_method === 'manual_link' && res.invite_link) {
        setManualFallback({
          fullName: item.full_name,
          email,
          positionLabel: item.position_label,
          inviteLink: res.invite_link,
          message: res.message,
        })
      } else {
        toast({
          variant: 'success',
          title: 'Undangan Terkirim',
          description: res.message,
        })
      }
    } catch (err) {
      if (
        err instanceof EdgeFunctionError &&
        err.code === 'EXISTING_AUTH_ACCOUNT_CONFIRMATION_REQUIRED'
      ) {
        setInviteConfirm(null)
        const existing = (err.payload?.existing_account ?? {}) as {
          email?: string
          is_super_admin?: boolean
          membership_role?: string | null
          membership_status?: string | null
          full_name?: string | null
        }
        setExistingAccountConfirm({
          item,
          email,
          details: existing,
          message: err.message,
        })
        return
      }

      toast({
        variant: 'error',
        title: 'Gagal Mengirim Undangan',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan saat mengirim undangan.',
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleResendInvitation = async (item: DirectoryRosterItemDto) => {
    const invitationId = item.latest_invitation?.id
    if (!invitationId) return

    setProcessingId(item.id)
    try {
      const res = await adminApi.resendInvitation(invitationId)
      await invalidateAllRosterQueries()

      if (res.delivery_method === 'manual_link' && res.invite_link) {
        setManualFallback({
          fullName: item.full_name,
          email: item.latest_invitation?.email ?? item.resolved_email ?? '',
          positionLabel: item.position_label,
          inviteLink: res.invite_link,
          message: res.message,
        })
      } else {
        toast({
          variant: 'success',
          title: 'Undangan Dikirim Ulang',
          description: res.message,
        })
      }
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Gagal Mengirim Ulang Undangan',
        description: err instanceof Error ? err.message : 'Terjadi kendala saat mengirim ulang undangan.',
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleConfirmRevoke = async () => {
    if (!revokeConfirm) return
    setProcessingId(revokeConfirm.item.id)
    try {
      const res = await adminApi.revokeInvitation(revokeConfirm.invitationId)
      toast({
        variant: 'success',
        title: 'Undangan Dibatalkan',
        description: res.message,
      })
      setRevokeConfirm(null)
      await invalidateAllRosterQueries()
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Gagal Membatalkan Undangan',
        description: err instanceof Error ? err.message : 'Terjadi kendala saat membatalkan undangan.',
      })
    } finally {
      setProcessingId(null)
    }
  }

  const renderEmailEditor = (item: DirectoryRosterItemDto) => {
    const value = draftEmails[item.id] ?? item.resolved_email ?? ''
    const persisted = item.account_email ?? item.resolved_email ?? ''
    const isDirty = value.trim().toLowerCase() !== persisted.trim().toLowerCase()
    const isSaving = savingEmailId === item.id
    const rowError = emailErrors[item.id]

    if (item.auth_linked) {
      return (
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1 font-mono text-[11px] text-charcoal bg-warm-100/80 border border-warm-200 rounded px-2 py-1 truncate" title={item.resolved_email || ''}>
            <Lock className="h-3 w-3 text-emerald-700 shrink-0" />
            <span className="truncate">{item.resolved_email}</span>
          </div>
          <p className="text-[10px] text-emerald-700">
            Email terkunci (aktif tertaut)
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-1 w-full min-w-0">
        <div className="flex items-center gap-1.5 w-full">
          <Input
            type="email"
            value={value}
            onChange={(e) => {
              const nextVal = e.target.value
              setDraftEmails((prev) => ({ ...prev, [item.id]: nextVal }))
              if (emailErrors[item.id]) {
                setEmailErrors((prev) => {
                  const copy = { ...prev }
                  delete copy[item.id]
                  return copy
                })
              }
            }}
            placeholder="email.anggota@contoh.ac.id"
            aria-label={`Email akun ${item.full_name}`}
            disabled={isSaving || processingId === item.id}
            className="h-7 text-[11px] font-mono w-full min-w-0 px-2"
          />
          {isDirty && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSaving || processingId === item.id}
              onClick={() => void handleSaveEmail(item)}
              className="h-7 px-2 text-[10px] gap-1 shrink-0 bg-sage-50 text-sage-800 border-sage-300 hover:bg-sage-100"
              title="Simpan alamat email untuk slot ini"
            >
              {isSaving ? <RefreshCw className="h-2.5 w-2.5 animate-spin" /> : <Save className="h-2.5 w-2.5" />}
              <span>Simpan</span>
            </Button>
          )}
        </div>
        {rowError && <p className="text-[10px] text-red-600 leading-tight break-words">{rowError}</p>}
        {item.action_reason && !rowError && (
          <p className="text-[10px] text-amber-800 flex items-start gap-1 leading-tight break-words">
            <AlertTriangle className="h-2.5 w-2.5 shrink-0 mt-0.5 text-amber-600" />
            <span className="line-clamp-2" title={item.action_reason}>{item.action_reason}</span>
          </p>
        )}
      </div>
    )
  }

  const renderSlotActions = (item: DirectoryRosterItemDto) => {
    const isBusy = processingId === item.id || savingEmailId === item.id
    const hasActivePendingInvite =
      item.latest_invitation && item.latest_invitation.effective_status === 'pending'

    return (
      <div className="flex flex-wrap items-center justify-end gap-1">
        {!item.auth_linked && hasActivePendingInvite && item.latest_invitation && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={() => void handleResendInvitation(item)}
              className="h-7 px-2 text-[10px] gap-1"
              title="Kirim ulang undangan aktivasi"
            >
              <RefreshCw className={`h-2.5 w-2.5 ${isBusy ? 'animate-spin' : ''}`} />
              <span>Kirim Ulang</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={() =>
                setRevokeConfirm({
                  item,
                  invitationId: item.latest_invitation!.id,
                  email: item.latest_invitation!.email,
                })
              }
              className="h-7 px-2 text-[10px] gap-1 text-red-700 border-red-200 hover:bg-red-50"
              title="Batalkan undangan ini"
            >
              <XCircle className="h-2.5 w-2.5" />
              <span>Batalkan</span>
            </Button>
          </>
        )}

        {!item.auth_linked && !hasActivePendingInvite && (
          <Button
            type="button"
            size="sm"
            disabled={
              isBusy ||
              (!item.resolved_email && !(draftEmails[item.id] ?? '').trim())
            }
            onClick={() => void handleRequestInvite(item)}
            className="h-7 px-2.5 text-[10px] gap-1 bg-charcoal hover:bg-black text-white shrink-0"
            title="Kirim undangan aktivasi ke email anggota"
          >
            <Send className="h-2.5 w-2.5" />
            <span>Kirim Undangan</span>
          </Button>
        )}

        {item.auth_linked && item.linked_user_id && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isBusy || item.is_super_admin}
            onClick={() => {
              setDeleteTarget({
                id: item.linked_user_id!,
                email: item.resolved_email || item.account_email || '',
                full_name: item.full_name,
                is_super_admin: item.is_super_admin,
                is_active: item.account_status === 'active',
                membership_role: item.role,
                membership_division: item.division,
                membership_status: item.membership_status,
                invitation_status: null,
                created_at: item.created_at,
                last_sign_in_at: item.last_sign_in_at,
              })
            }}
            className="h-7 px-2 text-[10px] gap-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-40 shrink-0"
            title={item.is_super_admin ? 'Akun Super Admin dilindungi' : 'Hapus Akun Permanen'}
          >
            <Trash2 className="h-2.5 w-2.5" />
            <span>Hapus</span>
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setHistoryTarget(item)}
          className="h-7 px-1.5 text-[10px] gap-1 text-charcoal-muted hover:text-charcoal shrink-0"
          title="Lihat riwayat undangan slot ini"
        >
          <History className="h-2.5 w-2.5" />
          <span>({item.invitation_history.length})</span>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Directory Provisioning Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
        {[
          { label: 'Total Slot Tim', value: summary?.totalSlots ?? roster.length, icon: CheckCircle2, color: 'bg-warm-200 text-charcoal' },
          { label: 'Akun Aktif', value: summary?.activeAccounts ?? 0, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Undangan Pending', value: summary?.pendingInvitations ?? 0, icon: Clock, color: 'bg-amber-50 text-amber-700' },
          { label: 'Siap Diundang', value: summary?.readyToInvite ?? 0, icon: Mail, color: 'bg-sage-100 text-sage-800' },
          { label: 'Belum Diisi Email', value: summary?.unfilledEmails ?? 0, icon: AlertCircle, color: 'bg-warm-100 text-charcoal-muted' },
          { label: 'Testing Dibersihkan', value: summary?.cleanedTestingAccounts ?? summary?.deletedAccounts ?? 0, icon: Trash2, color: 'bg-rose-50 text-rose-700' },
          { label: 'Perlu Tindakan', value: summary?.needsAttention ?? 0, icon: AlertTriangle, color: 'bg-red-50 text-red-700' },
        ].map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.label}>
              <CardContent className="p-3.5 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-medium text-charcoal-muted uppercase tracking-wider">
                    {metric.label}
                  </p>
                  {isLoading ? (
                    <Skeleton className="h-6 w-10 mt-1" />
                  ) : (
                    <div className="text-lg font-serif font-semibold text-charcoal mt-0.5">
                      {metric.value}
                    </div>
                  )}
                </div>
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${metric.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="h-3.5 w-3.5 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama anggota, NIM/NIP, jabatan, divisi, atau email..."
              className="pl-8 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | DirectoryAccountLifecycleStatus)}
              aria-label="Filter status aktivasi akun"
              className="h-9 rounded-md border border-warm-300 bg-white px-3 text-xs text-charcoal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sage-500"
            >
              <option value="all">Semua Status ({roster.length})</option>
              {(Object.keys(LIFECYCLE_BADGES) as DirectoryAccountLifecycleStatus[]).map((key) => (
                <option key={key} value={key}>
                  {LIFECYCLE_BADGES[key].label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Roster Content */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <CardContent className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((idx) => (
              <Skeleton key={idx} className="h-14 w-full" />
            ))}
          </CardContent>
        ) : filteredRoster.length === 0 ? (
          <CardContent className="p-10 text-center space-y-2">
            <p className="text-sm font-medium text-charcoal">
              Tidak ada slot anggota yang sesuai dengan filter.
            </p>
            <p className="text-xs text-charcoal-muted">
              Ubah kata kunci pencarian atau pilih status lain untuk melihat seluruh 11 anggota KKN.
            </p>
          </CardContent>
        ) : (
          <>
            {/* Desktop Table with Strict Proportional Layout */}
            <div className="hidden lg:block w-full min-w-0">
              <table className="w-full text-left border-collapse text-xs table-fixed">
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[12%]" />
                  <col className="w-[22%]" />
                  <col className="w-[14%]" />
                  <col className="w-[16%]" />
                  <col className="w-[18%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-warm-300 bg-warm-50 text-[11px] font-semibold uppercase tracking-wider text-charcoal-muted">
                    <th className="px-3 py-2.5">Anggota &amp; Identitas</th>
                    <th className="px-3 py-2.5">Jabatan</th>
                    <th className="px-3 py-2.5">Email Akun Undangan</th>
                    <th className="px-3 py-2.5">Status Akun</th>
                    <th className="px-3 py-2.5">Auth &amp; Membership</th>
                    <th className="px-3 py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200 bg-white">
                  {filteredRoster.map((item) => {
                    const badge = LIFECYCLE_BADGES[item.account_lifecycle_status]
                    return (
                      <tr key={item.id} className="hover:bg-warm-50/70 transition-colors align-top">
                        <td className="px-3 py-2.5 overflow-hidden">
                          <div className="font-semibold text-charcoal flex items-center gap-1.5 flex-wrap leading-snug">
                            <span className="line-clamp-2 break-words" title={item.full_name}>
                              {item.full_name}
                            </span>
                            {item.is_super_admin && (
                              <Badge variant="outline" className="border-charcoal bg-charcoal text-white text-[9px] px-1 py-0 gap-0.5 shrink-0">
                                <Shield className="h-2.5 w-2.5" />
                                Super Admin
                              </Badge>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-charcoal-muted mt-0.5 truncate">
                            {item.identity_number}
                          </div>
                          <div className="text-[10px] text-charcoal-muted truncate" title={item.study_program}>
                            {item.study_program}
                          </div>
                          <div className="text-[10px] text-sage-800/90 font-medium truncate" title={item.university || 'Universitas Mataram'}>
                            {item.university || 'Universitas Mataram'}
                          </div>
                        </td>

                        <td className="px-3 py-2.5 overflow-hidden">
                          <div className="font-medium text-charcoal leading-tight break-words">
                            {item.position_label}
                          </div>
                        </td>

                        <td className="px-3 py-2.5 overflow-hidden">
                          {renderEmailEditor(item)}
                        </td>

                        <td className="px-3 py-2.5 overflow-hidden">
                          <Badge variant={badge.variant} className="text-[10px] px-1.5 py-0.5 whitespace-nowrap">
                            {badge.label}
                          </Badge>
                          {item.latest_invitation && (
                            <div className="text-[10px] text-charcoal-muted mt-1 leading-tight break-words">
                              {formatShortDate(item.latest_invitation.created_at)}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-2.5 overflow-hidden">
                          <div className="space-y-0.5 leading-tight">
                            <div
                              className="text-[10px] font-mono text-charcoal-muted truncate"
                              title={item.linked_user_id ? `UID: ${item.linked_user_id}` : undefined}
                            >
                              {item.linked_user_id
                                ? `UID: ${item.linked_user_id.slice(0, 8)}…`
                                : 'Belum tertaut'}
                            </div>
                            <div className="text-[10px] text-charcoal-muted truncate">
                              Member:{' '}
                              <span className="font-medium text-charcoal">
                                {item.membership_status
                                  ? MEMBERSHIP_STATUS_LABEL[item.membership_status] ?? item.membership_status
                                  : 'Belum aktif'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-2.5 text-right overflow-hidden">
                          {renderSlotActions(item)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Responsive Cards */}
            <div className="lg:hidden divide-y divide-warm-200 bg-white">
              {filteredRoster.map((item) => {
                const badge = LIFECYCLE_BADGES[item.account_lifecycle_status]
                return (
                  <div key={item.id} className="p-3.5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-sm font-semibold text-charcoal break-words">
                            {item.full_name}
                          </h3>
                          {item.is_super_admin && (
                            <Badge variant="outline" className="border-charcoal bg-charcoal text-white text-[9px] px-1 py-0 gap-0.5 shrink-0">
                              <Shield className="h-2.5 w-2.5" />
                              Super Admin
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-charcoal-muted mt-0.5 space-x-1.5">
                          <span className="font-mono">{item.identity_number}</span>
                          <span>·</span>
                          <span className="font-medium text-charcoal">{item.position_label}</span>
                        </div>
                        <div className="text-[10px] text-charcoal-muted truncate">
                          {item.study_program} · <span className="font-medium text-sage-800">{item.university || 'Universitas Mataram'}</span>
                        </div>
                      </div>
                      <Badge variant={badge.variant} className="text-[10px] shrink-0 mt-0.5">
                        {badge.label}
                      </Badge>
                    </div>

                    <div className="bg-warm-50/70 p-2.5 rounded-md border border-warm-200/80 space-y-1">
                      <span className="text-[10px] font-semibold text-charcoal-muted uppercase tracking-wider block">
                        Email Akun Undangan
                      </span>
                      {renderEmailEditor(item)}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-warm-100">
                      <div className="text-[10px] font-mono text-charcoal-muted truncate">
                        {item.linked_user_id
                          ? `UID: ${item.linked_user_id.slice(0, 8)}… (${item.membership_status ?? 'active'})`
                          : 'Belum tertaut ke Auth'}
                      </div>
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {renderSlotActions(item)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Card>

      {/* Standard Invite Confirmation */}
      {inviteConfirm && (
        <ConfirmDialog
          open={Boolean(inviteConfirm)}
          onClose={() => setInviteConfirm(null)}
          onConfirm={() => void executeInvite(inviteConfirm.item, inviteConfirm.email, false)}
          title="Kirim Undangan Aktivasi Akun?"
          description={`Kirim undangan ke ${inviteConfirm.email} untuk ${inviteConfirm.item.full_name} sebagai ${inviteConfirm.item.position_label}${
            inviteConfirm.item.division ? ` (Divisi ${inviteConfirm.item.division})` : ''
          }? Role dan divisi akan diterapkan sesuai direktori kelompok.`}
          confirmLabel="Ya, Kirim Undangan"
          isLoading={processingId === inviteConfirm.item.id}
        />
      )}

      {/* Existing Auth Account Confirmation */}
      {existingAccountConfirm && (
        <ConfirmDialog
          open={Boolean(existingAccountConfirm)}
          onClose={() => setExistingAccountConfirm(null)}
          onConfirm={() =>
            void executeInvite(
              existingAccountConfirm.item,
              existingAccountConfirm.email,
              true
            )
          }
          title="Konfirmasi Penautan ke Akun Auth yang Sudah Ada"
          description={`${existingAccountConfirm.message} Detail akun terdaftar: ${
            existingAccountConfirm.details.email ?? existingAccountConfirm.email
          }${
            existingAccountConfirm.details.membership_role
              ? ` · Role saat ini: ${existingAccountConfirm.details.membership_role}`
              : ''
          }${
            existingAccountConfirm.details.is_super_admin ? ' · Super Admin' : ''
          }. Lanjutkan membuat undangan resmi untuk slot ${existingAccountConfirm.item.full_name}?`}
          confirmLabel="Ya, Lanjutkan Undangan"
          isLoading={processingId === existingAccountConfirm.item.id}
        />
      )}

      {/* Revoke Invitation Confirmation */}
      {revokeConfirm && (
        <ConfirmDialog
          open={Boolean(revokeConfirm)}
          onClose={() => setRevokeConfirm(null)}
          onConfirm={() => void handleConfirmRevoke()}
          title="Batalkan Undangan Tertunda?"
          description={`Undangan aktivasi untuk ${revokeConfirm.item.full_name} (${revokeConfirm.email}) akan dibatalkan sehingga tautan lama tidak berlaku lagi.`}
          confirmLabel="Ya, Batalkan Undangan"
          variant="destructive"
          isLoading={processingId === revokeConfirm.item.id}
        />
      )}

      {/* Manual Invite Link Fallback Modal */}
      {manualFallback && (
        <Modal
          open={Boolean(manualFallback)}
          onClose={() => setManualFallback(null)}
          title="Tautan Aktivasi Akun Anggota"
          description="Email undangan otomatis tidak terkirim atau dialihkan ke mode manual. Bagikan tautan resmi berikut kepada anggota terkait."
        >
          <ManualInviteLinkPanel
            fullName={manualFallback.fullName}
            email={manualFallback.email}
            positionLabel={manualFallback.positionLabel}
            inviteLink={manualFallback.inviteLink}
            message={manualFallback.message}
            onDone={() => setManualFallback(null)}
          />
        </Modal>
      )}

      {/* Invitation History Modal */}
      {historyTarget && (
        <Modal
          open={Boolean(historyTarget)}
          onClose={() => setHistoryTarget(null)}
          title={`Riwayat Undangan — ${historyTarget.full_name}`}
          description={historyTarget.position_label}
        >
          {historyTarget.invitation_history.length === 0 ? (
            <p className="text-xs text-charcoal-muted py-4 text-center">
              Belum pernah ada undangan yang dibuat untuk slot anggota ini.
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {historyTarget.invitation_history.map((inv) => (
                <div
                  key={inv.id}
                  className="rounded-lg border border-warm-200 bg-warm-50/50 p-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-medium text-charcoal break-all">{inv.email}</span>
                    <Badge
                      variant={
                        inv.effective_status === 'accepted'
                          ? 'success'
                          : inv.effective_status === 'pending'
                            ? 'warning'
                            : inv.effective_status === 'expired'
                              ? 'destructive'
                              : 'secondary'
                      }
                      className="text-[10px] shrink-0"
                    >
                      {inv.effective_status}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-charcoal-muted">
                    Dikirim: {formatShortDate(inv.created_at)} · Kedaluwarsa: {formatShortDate(inv.expires_at)}
                  </div>
                  {inv.accepted_at && (
                    <div className="text-[11px] text-emerald-700">
                      Diterima: {formatShortDate(inv.accepted_at)}
                    </div>
                  )}
                  <div className="text-[11px] text-charcoal-muted">
                    Oleh: {inv.inviter_name} ({inv.inviter_email ?? 'Admin'})
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {deleteTarget && (
        <DeleteUserDialog
          user={deleteTarget}
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onSuccess={(result) => {
            toast({
              variant: 'success',
              title: 'Akun Berhasil Dihapus Permanen',
              description: result.message,
            })
            void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
          }}
        />
      )}
    </div>
  )
}

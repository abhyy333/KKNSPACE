import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Modal, ConfirmDialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { InviteUserDialog } from '@/components/admin/InviteUserDialog'
import { ManualInviteLinkPanel } from '@/components/admin/ManualInviteLinkPanel'
import { adminApi, type AdminInvitationDto, EdgeFunctionError } from '@/services/adminApi'
import {
  UserPlus,
  RefreshCw,
  Mail,
  Eye,
  Send,
  XCircle,
  AlertCircle,
} from 'lucide-react'

const ROLE_DISPLAY: Record<string, string> = {
  ketua: 'Ketua',
  sekretaris: 'Sekretaris',
  bendahara: 'Bendahara',
  anggota: 'Anggota',
  dpl: 'DPL',
}

const INV_STATUS_BADGE: Record<string, { label: string; variant: 'warning' | 'success' | 'outline' | 'destructive' }> = {
  pending: { label: 'Pending', variant: 'warning' },
  accepted: { label: 'Accepted', variant: 'success' },
  expired: { label: 'Expired', variant: 'outline' },
  revoked: { label: 'Revoked', variant: 'destructive' },
}

export const AdminInvitationsPage: React.FC = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [inviteOpen, setInviteOpen] = useState(false)
  const [detailTarget, setDetailTarget] = useState<AdminInvitationDto | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<AdminInvitationDto | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [revoking, setRevoking] = useState(false)
  const [resendManualLink, setResendManualLink] = useState<{
    email: string
    inviteLink: string
    message: string
  } | null>(null)
  const [nowMs] = useState(() => Date.now())

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.listUsers({ page: 1, perPage: 50 }),
    retry: false,
  })

  const invitations = data?.invitations ?? []
  const isEdgeNotDeployed = error instanceof EdgeFunctionError && error.isNotDeployed

  const handleResend = async (inv: AdminInvitationDto) => {
    setResendingId(inv.id)
    try {
      const res = await adminApi.resendInvitation(inv.id)
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      if (res.delivery_method === 'manual_link' && res.invite_link) {
        toast({
          variant: 'success',
          title: 'Tautan Undangan Baru Siap',
          description: 'SMTP menolak pengiriman email; salin tautan baru pada dialog.',
        })
        setResendManualLink({
          email: inv.email,
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
    } catch (err: any) {
      toast({
        variant: 'error',
        title: 'Gagal Mengirim Ulang',
        description: err?.message || 'Tidak dapat mengirim ulang undangan.',
      })
    } finally {
      setResendingId(null)
    }
  }

  const handleRevoke = async () => {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      const res = await adminApi.revokeInvitation(revokeTarget.id)
      toast({
        variant: 'success',
        title: 'Undangan Dicabut',
        description: res.message,
      })
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setRevokeTarget(null)
    } catch (err: any) {
      toast({
        variant: 'error',
        title: 'Gagal Mencabut Undangan',
        description: err?.message || 'Tidak dapat mencabut undangan.',
      })
    } finally {
      setRevoking(false)
    }
  }

  const formatDateTime = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal">
            Undangan Anggota KKN
          </h1>
          <p className="text-xs text-charcoal-muted mt-1">
            Pantau status undangan resmi, kirim ulang tautan aktivasi, atau cabut undangan yang belum diterima.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setInviteOpen(true)}
            className="bg-charcoal hover:bg-black text-white text-xs gap-1.5"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Undang Anggota KKN</span>
          </Button>
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <Card className="border-red-200 bg-red-50/60">
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <h4 className="font-semibold text-red-900">
                  {isEdgeNotDeployed ? 'Backend Edge Function Belum Di-deploy' : 'Gagal Memuat Daftar Undangan'}
                </h4>
                <p className="text-red-800 leading-relaxed">
                  {(error as Error)?.message || 'Tidak dapat terhubung ke layanan admin-list-users.'}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs shrink-0 bg-white">
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Invitations Table */}
      {!isError && (
        <Card className="overflow-hidden">
          {isLoading ? (
            <CardContent className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          ) : invitations.length === 0 ? (
            <CardContent className="p-12 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage-100 text-sage-700">
                <Mail className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-charcoal">
                  Belum Ada Riwayat Undangan
                </h3>
                <p className="text-xs text-charcoal-muted max-w-md mx-auto">
                  Belum ada anggota yang diundang ke KKN SPACE. Klik tombol di bawah untuk mengundang Ketua, Sekretaris, Bendahara, Anggota, atau DPL.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setInviteOpen(true)}
                className="bg-charcoal hover:bg-black text-white text-xs gap-1.5"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Undang Anggota Pertama</span>
              </Button>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-warm-300 bg-warm-50 text-[11px] font-semibold uppercase tracking-wider text-charcoal-muted">
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Nama Undangan</th>
                    <th className="px-4 py-3">Role Diundang</th>
                    <th className="px-4 py-3">Tanggal Undangan</th>
                    <th className="px-4 py-3">Kedaluwarsa</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Pengundang</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200 bg-white">
                  {invitations.map((inv) => {
                    const isExpired = inv.status === 'pending' && new Date(inv.expires_at).getTime() <= nowMs
                    const effectiveStatus = isExpired ? 'expired' : inv.status
                    const statusBadge = INV_STATUS_BADGE[effectiveStatus] || { label: effectiveStatus, variant: 'outline' }

                    return (
                      <tr key={inv.id} className="hover:bg-warm-50/70 transition-colors">
                        <td className="px-4 py-3 font-mono text-[11px] text-charcoal whitespace-nowrap">
                          {inv.email}
                        </td>
                        <td className="px-4 py-3 text-charcoal whitespace-nowrap">
                          <div className="space-y-0.5">
                            <div>
                              {inv.directory_member_name || inv.invitee_name || (
                                <span className="text-charcoal-light italic">—</span>
                              )}
                            </div>
                            {inv.directory_member_id && (
                              <span className="inline-block text-[10px] text-sage-700 bg-sage-50 border border-sage-200 rounded px-1.5 py-0.2">
                                Slot Direktori
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 flex-wrap">
                            <Badge variant="secondary" className="text-[10px]">
                              {ROLE_DISPLAY[inv.role] || inv.role}
                            </Badge>
                            {inv.division && (
                              <Badge variant="outline" className="text-[10px]">
                                Div. {inv.division}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-charcoal-muted whitespace-nowrap">
                          {formatDateTime(inv.created_at)}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-charcoal-muted whitespace-nowrap">
                          {formatDateTime(inv.expires_at)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant={statusBadge.variant} className="text-[10px]">
                            {statusBadge.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-charcoal-muted whitespace-nowrap">
                          {inv.inviter_name}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDetailTarget(inv)}
                              className="h-7 px-2 text-[11px] gap-1"
                              title="Lihat Detail"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Detail</span>
                            </Button>

                            {effectiveStatus === 'pending' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={resendingId === inv.id}
                                  onClick={() => handleResend(inv)}
                                  className="h-7 px-2 text-[11px] gap-1"
                                  title="Kirim Ulang Undangan"
                                >
                                  <Send className="h-3 w-3" />
                                  <span>{resendingId === inv.id ? 'Mengirim...' : 'Kirim Ulang'}</span>
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRevokeTarget(inv)}
                                  className="h-7 px-2 text-[11px] gap-1 text-red-700 border-red-200 hover:bg-red-50"
                                  title="Cabut Undangan"
                                >
                                  <XCircle className="h-3 w-3" />
                                  <span>Cabut</span>
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Detail Modal */}
      <Modal
        open={Boolean(detailTarget)}
        onClose={() => setDetailTarget(null)}
        title="Detail Undangan Anggota"
        maxWidthClass="max-w-md"
      >
        {detailTarget && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2 py-2 border-b border-warm-200">
              <span className="text-charcoal-muted">ID Undangan</span>
              <span className="col-span-2 font-mono text-[11px] text-charcoal break-all">{detailTarget.id}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 py-2 border-b border-warm-200">
              <span className="text-charcoal-muted">Email</span>
              <span className="col-span-2 font-mono text-charcoal">{detailTarget.email}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 py-2 border-b border-warm-200">
              <span className="text-charcoal-muted">Nama</span>
              <span className="col-span-2 text-charcoal font-medium">{detailTarget.invitee_name || '—'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 py-2 border-b border-warm-200">
              <span className="text-charcoal-muted">Role Awal</span>
              <span className="col-span-2">
                <Badge variant="secondary">{ROLE_DISPLAY[detailTarget.role] || detailTarget.role}</Badge>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 py-2 border-b border-warm-200">
              <span className="text-charcoal-muted">Status</span>
              <span className="col-span-2 font-medium uppercase">{detailTarget.status}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 py-2 border-b border-warm-200">
              <span className="text-charcoal-muted">Dikirim Oleh</span>
              <span className="col-span-2 text-charcoal">{detailTarget.inviter_name}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 py-2 border-b border-warm-200">
              <span className="text-charcoal-muted">Tanggal Dibuat</span>
              <span className="col-span-2 text-charcoal">{formatDateTime(detailTarget.created_at)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 py-2 border-b border-warm-200">
              <span className="text-charcoal-muted">Kedaluwarsa</span>
              <span className="col-span-2 text-charcoal">{formatDateTime(detailTarget.expires_at)}</span>
            </div>
            {detailTarget.accepted_at && (
              <div className="grid grid-cols-3 gap-2 py-2 border-b border-warm-200">
                <span className="text-charcoal-muted">Diterima Pada</span>
                <span className="col-span-2 text-emerald-700 font-medium">{formatDateTime(detailTarget.accepted_at)}</span>
              </div>
            )}
            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setDetailTarget(null)} className="text-xs">
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Revoke Confirmation */}
      <ConfirmDialog
        open={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title="Cabut Undangan Pending?"
        description={
          revokeTarget
            ? `Undangan untuk ${revokeTarget.email} dengan peran ${ROLE_DISPLAY[revokeTarget.role] || revokeTarget.role} akan dicabut (revoked) dan tidak dapat lagi digunakan untuk masuk.`
            : ''
        }
        confirmLabel="Ya, Cabut Undangan"
        variant="destructive"
        isLoading={revoking}
      />

      {/* Manual Fallback Link Modal on Resend */}
      <Modal
        open={Boolean(resendManualLink)}
        onClose={() => setResendManualLink(null)}
        title="Tautan Undangan Baru (Manual)"
        description="Bagikan tautan aktivasi terbaru ini kepada penerima undangan."
      >
        {resendManualLink && (
          <ManualInviteLinkPanel
            email={resendManualLink.email}
            inviteLink={resendManualLink.inviteLink}
            message={resendManualLink.message}
            onDone={() => setResendManualLink(null)}
          />
        )}
      </Modal>

      {/* Invite User Modal */}
      <InviteUserDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  )
}

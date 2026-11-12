import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { InviteUserDialog } from '@/components/admin/InviteUserDialog'
import { ChangeRoleDialog } from '@/components/admin/ChangeRoleDialog'
import { DirectoryAccountRoster } from '@/components/admin/DirectoryAccountRoster'
import { DeleteUserDialog } from '@/components/admin/DeleteUserDialog'
import { adminApi, type AdminUserDto, EdgeFunctionError } from '@/services/adminApi'
import { useAuth } from '@/hooks/useAuth'
import {
  UserPlus,
  Search,
  Shield,
  Users,
  UserCheck,
  UserX,
  Mail,
  RefreshCw,
  AlertCircle,
  Edit3,
  Ban,
  CheckCircle2,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const ROLE_DISPLAY: Record<string, string> = {
  ketua: 'Ketua',
  sekretaris: 'Sekretaris',
  bendahara: 'Bendahara',
  anggota: 'Anggota',
  dpl: 'DPL',
}

const MEMBERSHIP_STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' }> = {
  active: { label: 'Aktif', variant: 'success' },
  invited: { label: 'Undangan Menunggu', variant: 'warning' },
  suspended: { label: 'Ditangguhkan', variant: 'destructive' },
  revoked: { label: 'Dicabut', variant: 'outline' },
}

export const AdminUsersPage: React.FC = () => {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Tab & Filter/pagination state
  const [activeTab, setActiveTab] = useState<'directory' | 'auth'>('directory')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [accountStatusFilter, setAccountStatusFilter] = useState('all')
  const [membershipStatusFilter, setMembershipStatusFilter] = useState('all')

  // Dialog states
  const [inviteOpen, setInviteOpen] = useState(false)
  const [roleEditTarget, setRoleEditTarget] = useState<AdminUserDto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUserDto | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    user: AdminUserDto
    action: 'suspend' | 'reactivate' | 'revoke_membership'
    title: string
    description: string
    confirmLabel: string
    variant: 'default' | 'destructive'
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-users', page, search, roleFilter, accountStatusFilter, membershipStatusFilter],
    queryFn: () =>
      adminApi.listUsers({
        page,
        perPage: 15,
        search,
        role: roleFilter,
        accountStatus: accountStatusFilter,
        membershipStatus: membershipStatusFilter,
      }),
    retry: false,
  })

  const handleConfirmAction = async () => {
    if (!confirmAction) return
    setActionLoading(true)

    try {
      const res = await adminApi.updateMembership({
        target_user_id: confirmAction.user.id,
        action: confirmAction.action,
      })

      toast({
        variant: 'success',
        title: 'Status Akun Diperbarui',
        description: res.message,
      })

      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setConfirmAction(null)
    } catch (err: any) {
      toast({
        variant: 'error',
        title: 'Gagal Memperbarui Akun',
        description: err?.message || 'Terjadi kesalahan saat memproses tindakan.',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const users = data?.users ?? []
  const summary = data?.summary
  const pagination = data?.pagination
  const directoryRoster = data?.directoryRoster ?? []
  const directorySummary = data?.directorySummary
  const isEdgeNotDeployed = error instanceof EdgeFunctionError && error.isNotDeployed

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal">
            Manajemen Akun Pengguna
          </h1>
          <p className="text-xs text-charcoal-muted mt-1">
            Kelola akses, keanggotaan, dan status akun anggota KKN SPACE.
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

      {/* View Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-warm-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('directory')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
            activeTab === 'directory'
              ? 'bg-charcoal text-white shadow-xs'
              : 'bg-warm-100 text-charcoal-muted hover:bg-warm-200 hover:text-charcoal'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Akun 11 Anggota (Direktori)</span>
          <Badge
            variant={activeTab === 'directory' ? 'secondary' : 'outline'}
            className="text-[10px] px-1.5 py-0"
          >
            {directoryRoster.length || 11}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('auth')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
            activeTab === 'auth'
              ? 'bg-charcoal text-white shadow-xs'
              : 'bg-warm-100 text-charcoal-muted hover:bg-warm-200 hover:text-charcoal'
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          <span>Semua Akun Auth</span>
          <Badge
            variant={activeTab === 'auth' ? 'secondary' : 'outline'}
            className="text-[10px] px-1.5 py-0"
          >
            {summary?.totalAuthUsers ?? users.length}
          </Badge>
        </button>
      </div>

      {/* Error State */}
      {isError && (
        <Card className="border-red-200 bg-red-50/60">
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <h4 className="font-semibold text-red-900">
                  {isEdgeNotDeployed ? 'Backend Edge Function Belum Di-deploy' : 'Gagal Memuat Data Pengguna'}
                </h4>
                <p className="text-red-800 leading-relaxed">
                  {(error as Error)?.message || 'Tidak dapat terhubung ke layanan admin-list-users.'}
                </p>
                {isEdgeNotDeployed && (
                  <p className="text-[11px] text-red-700 font-mono pt-1">
                    Jalankan deploy: npx supabase functions deploy admin-list-users --project-ref aofwlbvxsczcpqgwtanb
                  </p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs shrink-0 bg-white">
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Primary Tab: 11-Member Directory Provisioning */}
      {!isError && activeTab === 'directory' && (
        <DirectoryAccountRoster
          roster={directoryRoster}
          summary={directorySummary}
          isLoading={isLoading}
        />
      )}

      {/* Secondary Tab: Raw Auth Accounts */}
      {!isError && activeTab === 'auth' && (
        <div className="space-y-6">
          {/* Live Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Total Akun Auth', value: summary?.totalAuthUsers, icon: Users, color: 'bg-warm-200 text-charcoal' },
              { label: 'Akun Aktif', value: summary?.activeAccounts, icon: UserCheck, color: 'bg-emerald-50 text-emerald-700' },
              { label: 'Akun Nonaktif', value: summary?.inactiveAccounts, icon: UserX, color: 'bg-red-50 text-red-700' },
              { label: 'Undangan Menunggu', value: summary?.pendingInvitations, icon: Mail, color: 'bg-amber-50 text-amber-700' },
              { label: 'Anggota Aktif KKN', value: summary?.activeMembers, icon: Shield, color: 'bg-sage-100 text-sage-800' },
            ].map((stat, idx) => {
              const Icon = stat.icon
              return (
                <Card key={idx}>
                  <CardContent className="p-4 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-medium text-charcoal-muted uppercase tracking-wider">
                        {stat.label}
                      </p>
                      {isLoading ? (
                        <Skeleton className="h-7 w-12 mt-1" />
                      ) : (
                        <div className="text-xl font-serif font-semibold text-charcoal mt-1">
                          {isError ? '—' : (stat.value ?? 0)}
                        </div>
                      )}
                    </div>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${stat.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Search & Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="Cari nama atau email..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                    className="pl-8 text-xs h-9"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value)
                    setPage(1)
                  }}
                  className="h-9 rounded-md border border-warm-300 bg-white px-3 text-xs text-charcoal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sage-500"
                  aria-label="Filter role"
                >
                  <option value="all">Semua Role</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="ketua">Ketua</option>
                  <option value="sekretaris">Sekretaris</option>
                  <option value="bendahara">Bendahara</option>
                  <option value="anggota">Anggota</option>
                  <option value="dpl">DPL</option>
                  <option value="none">Tanpa Role KKN</option>
                </select>

                <select
                  value={accountStatusFilter}
                  onChange={(e) => {
                    setAccountStatusFilter(e.target.value)
                    setPage(1)
                  }}
                  className="h-9 rounded-md border border-warm-300 bg-white px-3 text-xs text-charcoal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sage-500"
                  aria-label="Filter status akun"
                >
                  <option value="all">Semua Status Akun</option>
                  <option value="active">Akun Aktif</option>
                  <option value="inactive">Akun Nonaktif</option>
                </select>

                <select
                  value={membershipStatusFilter}
                  onChange={(e) => {
                    setMembershipStatusFilter(e.target.value)
                    setPage(1)
                  }}
                  className="h-9 rounded-md border border-warm-300 bg-white px-3 text-xs text-charcoal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sage-500"
                  aria-label="Filter status keanggotaan"
                >
                  <option value="all">Semua Status Keanggotaan</option>
                  <option value="none">Belum Menjadi Anggota</option>
                  <option value="invited">Undangan Menunggu</option>
                  <option value="active">Aktif</option>
                  <option value="suspended">Ditangguhkan</option>
                  <option value="revoked">Dicabut</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card className="overflow-hidden">
          {isLoading ? (
            <CardContent className="p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          ) : users.length === 0 ? (
            <CardContent className="p-12 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage-100 text-sage-700">
                <Users className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-charcoal">
                  Belum Ada Pengguna yang Sesuai
                </h3>
                <p className="text-xs text-charcoal-muted max-w-md mx-auto">
                  Belum ada anggota KKN atau hasil pencarian tidak ditemukan. Mulai undang anggota melalui tombol di bawah ini.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setInviteOpen(true)}
                className="bg-charcoal hover:bg-black text-white text-xs gap-1.5"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Undang Anggota KKN</span>
              </Button>
            </CardContent>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-warm-300 bg-warm-50 text-[11px] font-semibold uppercase tracking-wider text-charcoal-muted">
                      <th className="px-4 py-3">Nama</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role / Identitas</th>
                      <th className="px-4 py-3">Status Akun</th>
                      <th className="px-4 py-3">Keanggotaan</th>
                      <th className="px-4 py-3">Terakhir Login</th>
                      <th className="px-4 py-3">Dibuat</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-200 bg-white">
                    {users.map((u) => {
                      const isSelf = u.id === currentUser?.id
                      const memBadge = u.membership_status ? MEMBERSHIP_STATUS_BADGE[u.membership_status] : null

                      return (
                        <tr key={u.id} className="hover:bg-warm-50/70 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-medium text-charcoal flex items-center">
                                {u.full_name}
                                {isSelf && (
                                  <span className="ml-1.5 text-[10px] text-sage-700 font-normal">(Anda)</span>
                                )}
                              </span>
                              {u.is_linked_to_directory && u.directory_member_name ? (
                                <span className="text-[10px] text-emerald-700 flex items-center gap-1 font-normal mt-0.5">
                                  <CheckCircle2 className="h-2.5 w-2.5 inline shrink-0" />
                                  Tertaut: {u.directory_member_name}
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-700/90 flex items-center gap-1 font-normal mt-0.5">
                                  <AlertCircle className="h-2.5 w-2.5 inline shrink-0" />
                                  Belum terhubung ke direktori
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-charcoal-muted whitespace-nowrap">
                            {u.email}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {u.is_super_admin && (
                                <Badge variant="outline" className="border-charcoal bg-charcoal text-white text-[10px] gap-1">
                                  <Shield className="h-2.5 w-2.5" />
                                  Super Admin
                                </Badge>
                              )}
                              {u.membership_role ? (
                                <>
                                  <Badge variant="secondary" className="text-[10px]">
                                    {ROLE_DISPLAY[u.membership_role] || u.membership_role}
                                  </Badge>
                                  {u.membership_division && (
                                    <Badge variant="outline" className="text-[10px]">
                                      Div. {u.membership_division}
                                    </Badge>
                                  )}
                                </>
                              ) : (
                                !u.is_super_admin && (
                                  <span className="text-[11px] text-charcoal-light italic">Belum ditetapkan</span>
                                )
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {u.is_active ? (
                              <Badge variant="success" className="text-[10px]">Aktif</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px]">Nonaktif</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {memBadge ? (
                              <Badge variant={memBadge.variant} className="text-[10px]">
                                {memBadge.label}
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-charcoal-muted">Belum menjadi anggota</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[11px] text-charcoal-muted whitespace-nowrap">
                            {formatDate(u.last_sign_in_at)}
                          </td>
                          <td className="px-4 py-3 text-[11px] text-charcoal-muted whitespace-nowrap">
                            {formatDate(u.created_at)}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {u.membership_role && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRoleEditTarget(u)}
                                  className="h-7 px-2 text-[11px] gap-1"
                                  title="Ubah Role KKN"
                                >
                                  <Edit3 className="h-3 w-3" />
                                  <span>Role</span>
                                </Button>
                              )}

                              {u.is_active ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isSelf || (u.is_super_admin && summary?.activeAccounts === 1)}
                                  onClick={() =>
                                    setConfirmAction({
                                      user: u,
                                      action: 'suspend',
                                      title: 'Nonaktifkan Akun Pengguna?',
                                      description: `Akun ${u.full_name} (${u.email}) akan dinonaktifkan dan keanggotaannya ditangguhkan. Histori aktivitas dan audit tetap terjaga.`,
                                      confirmLabel: 'Ya, Nonaktifkan',
                                      variant: 'destructive',
                                    })
                                  }
                                  className="h-7 px-2 text-[11px] gap-1 text-red-700 border-red-200 hover:bg-red-50 disabled:opacity-40"
                                  title={isSelf ? 'Tidak dapat menonaktifkan akun sendiri' : 'Nonaktifkan Akun'}
                                >
                                  <Ban className="h-3 w-3" />
                                  <span>Nonaktifkan</span>
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setConfirmAction({
                                      user: u,
                                      action: 'reactivate',
                                      title: 'Aktifkan Kembali Akun?',
                                      description: `Akun ${u.full_name} (${u.email}) akan diaktifkan kembali sehingga dapat masuk ke KKN SPACE.`,
                                      confirmLabel: 'Ya, Aktifkan',
                                      variant: 'default',
                                    })
                                  }
                                  className="h-7 px-2 text-[11px] gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>Aktifkan</span>
                                </Button>
                              )}

                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isSelf || (u.is_super_admin && summary?.activeAccounts === 1)}
                                onClick={() => setDeleteTarget(u)}
                                className="h-7 px-2 text-[11px] gap-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                                title={isSelf ? 'Tidak dapat menghapus akun sendiri' : 'Hapus Akun Permanen dari Auth'}
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Hapus</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-warm-200 px-4 py-3 bg-warm-50/40 text-xs text-charcoal-muted">
                  <span>
                    Menampilkan halaman <strong className="text-charcoal">{pagination.page}</strong> dari{' '}
                    <strong className="text-charcoal">{pagination.totalPages}</strong> ({pagination.total} akun)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="h-7 px-2 text-xs gap-1"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Prev</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="h-7 px-2 text-xs gap-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
        </div>
      )}

      {/* Dialogs */}
      <InviteUserDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />

      <ChangeRoleDialog user={roleEditTarget} onClose={() => setRoleEditTarget(null)} />

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

      {confirmAction && (
        <ConfirmDialog
          open={Boolean(confirmAction)}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
          title={confirmAction.title}
          description={confirmAction.description}
          confirmLabel={confirmAction.confirmLabel}
          variant={confirmAction.variant}
          isLoading={actionLoading}
        />
      )}
    </div>
  )
}

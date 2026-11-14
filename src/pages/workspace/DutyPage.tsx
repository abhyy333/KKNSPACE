import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'
import { getPrivateFileSignedUrl } from '@/services/storageApi'
import { fetchWorkspaceMembers } from '@/services/dashboardApi'
import {
  fetchDutyShifts,
  deleteDutyShift,
} from '@/services/agendaApi'
import { DutyDocumentationFormModal } from '@/components/duty/DutyDocumentationFormModal'
import { DutyDocumentationDetailModal } from '@/components/duty/DutyDocumentationDetailModal'
import type { DutyShift, WorkspaceMemberSummary } from '@/types/database'
import {
  AlertCircle,
  Camera,
  Calendar,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'

export const DutyPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user, membership, isSuperAdmin } = useAuth()

  // Authorized to create: Super Admin, or active team members
  const canCreate = Boolean(isSuperAdmin || membership?.status === 'active')

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<DutyShift | null>(null)
  const [detailShift, setDetailShift] = useState<DutyShift | null>(null)
  const [deletingShift, setDeletingShift] = useState<DutyShift | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch duty shifts (ordered by newest first)
  const {
    data: shifts = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['workspace', 'duty-shifts'],
    queryFn: fetchDutyShifts,
    staleTime: 30_000,
  })

  // Fetch workspace members for author profile mapping
  const { data: members = [] } = useQuery({
    queryKey: ['workspace', 'members'],
    queryFn: fetchWorkspaceMembers,
    staleTime: 60_000,
  })

  const memberMap = useMemo(() => {
    const map = new Map<string, WorkspaceMemberSummary>()
    for (const m of members) map.set(m.user_id, m)
    return map
  }, [members])

  // Invalidate queries helper
  const invalidateDutyQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['workspace', 'duty-shifts'] }),
      queryClient.invalidateQueries({ queryKey: ['workspace', 'dashboard-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-activity-logs'] }),
    ])
  }

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteDutyShift,
    onSuccess: async () => {
      setDeletingShift(null)
      if (detailShift && deletingShift && detailShift.id === deletingShift.id) {
        setDetailShift(null)
      }
      await invalidateDutyQueries()
      toast({
        title: 'Dokumentasi Dihapus',
        description: 'Dokumentasi piket posko berhasil dihapus.',
        variant: 'success',
      })
    },
    onError: (err) => {
      toast({
        title: 'Gagal Menghapus Dokumentasi',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        variant: 'error',
      })
    },
  })

  // Filtered documentation list based on search
  const filteredShifts = useMemo(() => {
    if (!searchQuery.trim()) return shifts
    const q = searchQuery.toLowerCase().trim()
    return shifts.filter((s) => {
      const title = (s.title || s.notes || '').toLowerCase()
      const notes = (s.notes || '').toLowerCase()
      const creator = s.created_by ? memberMap.get(s.created_by)?.full_name.toLowerCase() : ''
      return title.includes(q) || notes.includes(q) || (creator && creator.includes(q))
    })
  }, [shifts, searchQuery, memberMap])

  // Permission helper to check edit/delete rights
  const canManageShift = (shift: DutyShift) => {
    return Boolean(
      isSuperAdmin ||
        membership?.role === 'ketua' ||
        membership?.role === 'sekretaris' ||
        (user?.id && shift.created_by === user.id)
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal">
            Jadwal Piket Posko
          </h1>
          <p className="text-xs text-charcoal-muted mt-1">
            Dokumentasi visual kegiatan dan kondisi posko harian tim KKN.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs gap-1.5 border-warm-300 hover:bg-warm-100 text-charcoal"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-forest' : ''}`} />
            <span>Segarkan</span>
          </Button>

          {canCreate && (
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                setEditingShift(null)
                setFormModalOpen(true)
              }}
              className="text-xs gap-1.5 bg-forest hover:bg-forest-dark text-white shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah Dokumentasi</span>
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {shifts.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-muted" />
            <Input
              placeholder="Cari dokumentasi kegiatan piket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs bg-warm-50/50 border-warm-300 focus-visible:ring-forest"
            />
          </div>

          <p className="text-xs text-charcoal-muted self-start sm:self-auto">
            Menampilkan <span className="font-semibold text-charcoal">{filteredShifts.length}</span> dokumentasi
          </p>
        </div>
      )}

      {/* Content State: Loading, Error, Empty, or Visual Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden border-warm-200">
              <Skeleton className="w-full aspect-4/3 bg-warm-200" />
              <CardContent className="p-4 space-y-2.5">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-charcoal">
                  Gagal Memuat Dokumentasi Piket
                </p>
                <p className="text-xs text-charcoal-muted mt-1">
                  {error instanceof Error ? error.message : 'Terjadi kesalahan saat membaca data piket.'}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs bg-white">
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      ) : shifts.length === 0 ? (
        /* Empty State */
        <Card className="border-warm-200 bg-white shadow-xs">
          <CardContent className="py-16 px-6 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-forest/10 text-forest mx-auto flex items-center justify-center">
              <Camera className="h-8 w-8 text-forest opacity-80" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-serif font-semibold text-charcoal">
                Belum ada dokumentasi piket posko
              </h3>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                Tambahkan dokumentasi kegiatan dan kondisi posko agar aktivitas kita tetap tercatat.
              </p>
            </div>
            {canCreate && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingShift(null)
                  setFormModalOpen(true)
                }}
                className="text-xs gap-1.5 bg-forest hover:bg-forest-dark text-white px-4"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Dokumentasi</span>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : filteredShifts.length === 0 ? (
        /* Search Not Found State */
        <Card className="border-warm-200 bg-white">
          <CardContent className="py-12 px-6 text-center space-y-2">
            <p className="text-sm font-semibold text-charcoal">
              Tidak ada dokumentasi piket yang cocok
            </p>
            <p className="text-xs text-charcoal-muted">
              Tidak ditemukan hasil untuk kata kunci &ldquo;{searchQuery}&rdquo;.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="text-xs mt-2 border-warm-300"
            >
              Reset Pencarian
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Visual Documentation Cards Grid (Larger Preview Cards) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredShifts.map((shift) => (
            <DutyDocumentationCard
              key={shift.id}
              shift={shift}
              memberMap={memberMap}
              canManage={canManageShift(shift)}
              onClick={() => setDetailShift(shift)}
              onEdit={() => {
                setEditingShift(shift)
                setFormModalOpen(true)
              }}
              onDelete={() => setDeletingShift(shift)}
            />
          ))}
        </div>
      )}

      {/* Form Modal (Tambah / Edit Dokumentasi Piket) */}
      <DutyDocumentationFormModal
        open={formModalOpen}
        onClose={() => {
          setFormModalOpen(false)
          setEditingShift(null)
        }}
        onSuccess={invalidateDutyQueries}
        shift={editingShift}
        currentUserId={user?.id}
      />

      {/* Detail Modal (Detail Dokumentasi & Full Gallery Lightbox) */}
      <DutyDocumentationDetailModal
        shift={detailShift}
        open={Boolean(detailShift)}
        onClose={() => setDetailShift(null)}
        onEdit={(s) => {
          setEditingShift(s)
          setFormModalOpen(true)
        }}
        onDelete={(s) => setDeletingShift(s)}
        memberMap={memberMap}
        currentUserId={user?.id}
        isSuperAdmin={isSuperAdmin}
        userRole={membership?.role}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingShift)}
        onClose={() => setDeletingShift(null)}
        onConfirm={() => {
          if (deletingShift) deleteMutation.mutate(deletingShift.id)
        }}
        title="Hapus Dokumentasi Piket?"
        description="Dokumentasi piket beserta seluruh foto terlampir akan dihapus permanen dari sistem."
        confirmLabel="Hapus Dokumentasi"
        cancelLabel="Batal"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

/**
 * Visual Documentation Card Component (Larger Visual Preview)
 */
interface DutyDocumentationCardProps {
  shift: DutyShift
  memberMap: Map<string, WorkspaceMemberSummary>
  canManage: boolean
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
}

const DutyDocumentationCard: React.FC<DutyDocumentationCardProps> = ({
  shift,
  memberMap,
  canManage,
  onClick,
  onEdit,
  onDelete,
}) => {
  const docs = shift.documentations || []
  const firstPhoto = docs.length > 0 ? docs[0] : null
  const photoCount = docs.length

  const title = shift.title || shift.notes || 'Dokumentasi Piket Posko'
  const notes = shift.notes || ''

  const creator = shift.created_by ? memberMap.get(shift.created_by) : undefined
  const creatorName = creator?.full_name || 'Anggota Posko'
  const creatorInitials = creatorName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const formattedDate = shift.created_at
    ? new Date(shift.created_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : shift.shift_date
    ? new Date(`${shift.shift_date}T00:00:00`).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Hari ini'

  return (
    <Card className="group flex flex-col justify-between overflow-hidden border-warm-200 bg-white hover:border-forest/40 hover:shadow-md transition-all duration-200 rounded-xl cursor-pointer">
      <div onClick={onClick}>
        {/* Top Visual Thumbnail (4:3 ratio) */}
        <DutyCardThumbnail
          fileId={firstPhoto?.file_id}
          alt={title}
          photoCount={photoCount}
        />

        {/* Card Body */}
        <CardContent className="p-4 sm:p-5 space-y-2">
          {/* Judul Piket */}
          <h3 className="font-serif font-semibold text-base sm:text-lg text-charcoal group-hover:text-forest transition-colors line-clamp-1">
            {title}
          </h3>

          {/* Keterangan Singkat */}
          {notes ? (
            <p className="text-xs text-charcoal-muted leading-relaxed line-clamp-2">
              {notes}
            </p>
          ) : (
            <p className="text-xs text-charcoal-muted/60 italic">
              Tidak ada keterangan tambahan.
            </p>
          )}
        </CardContent>
      </div>

      {/* Card Footer (Author & Action Buttons) */}
      <div className="px-4 sm:px-5 pb-4 pt-3 border-t border-warm-100 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0" onClick={onClick}>
          <div className="h-6 w-6 rounded-full bg-forest/10 border border-forest/20 text-forest font-semibold text-[10px] flex items-center justify-center shrink-0">
            {creatorInitials}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-charcoal truncate max-w-28 sm:max-w-32">
              {creatorName}
            </p>
            <p className="text-[10px] text-charcoal-muted flex items-center gap-1">
              <Calendar className="h-2.5 w-2.5 text-forest/70" />
              <span>{formattedDate}</span>
            </p>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="p-1.5 rounded-md text-charcoal-muted hover:text-forest hover:bg-forest/5 transition-colors"
              title="Edit dokumentasi"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="p-1.5 rounded-md text-charcoal-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Hapus dokumentasi"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}

/**
 * Thumbnail Loader for Duty Card
 */
const DutyCardThumbnail: React.FC<{
  fileId?: string
  alt: string
  photoCount: number
}> = ({ fileId, alt, photoCount }) => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['signed-url', fileId, false],
    queryFn: () => (fileId ? getPrivateFileSignedUrl(fileId, false) : null),
    enabled: Boolean(fileId),
    staleTime: 300_000,
    retry: 1,
  })

  // 1. Placeholder when no photo is attached
  if (!fileId) {
    return (
      <div className="relative w-full aspect-4/3 bg-linear-to-br from-warm-100 to-warm-200 border-b border-warm-200 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-forest/10 text-forest flex items-center justify-center mb-2">
          <Camera className="h-6 w-6 opacity-60" />
        </div>
        <p className="text-xs font-medium text-charcoal-muted">Belum ada foto dokumentasi</p>
      </div>
    )
  }

  // 2. Loading state
  if (isLoading) {
    return (
      <div className="relative w-full aspect-4/3 bg-warm-200/80 animate-pulse border-b border-warm-200 flex flex-col items-center justify-center text-charcoal-muted">
        <Skeleton className="absolute inset-0 w-full h-full" />
        <div className="relative z-10 flex flex-col items-center gap-1.5">
          <Loader2 className="h-6 w-6 text-forest animate-spin" />
          <span className="text-[11px] font-medium">Memuat foto...</span>
        </div>
      </div>
    )
  }

  // 3. Error state
  if (isError || !data?.signedUrl) {
    return (
      <div className="relative w-full aspect-4/3 bg-warm-100 border-b border-warm-200 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-1.5">
          <AlertCircle className="h-5 w-5" />
        </div>
        <p className="text-xs font-semibold text-charcoal">Gagal memuat foto</p>
        <p className="text-[10px] text-charcoal-muted mt-0.5 max-w-[200px] line-clamp-2">
          {error instanceof Error ? error.message : 'Tautan foto privat tidak dapat diakses.'}
        </p>
      </div>
    )
  }

  // 4. Render actual image
  return (
    <div className="relative w-full aspect-4/3 overflow-hidden bg-charcoal/5 border-b border-warm-200">
      <img
        src={data.signedUrl}
        alt={alt}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
      {photoCount > 0 && (
        <div className="absolute top-3 right-3 bg-charcoal/70 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
          <Camera className="h-3 w-3" />
          <span>{photoCount} Foto</span>
        </div>
      )}
    </div>
  )
}

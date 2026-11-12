import React, { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog, Modal } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'
import { fetchWorkspaceMembers } from '@/services/dashboardApi'
import {
  formatBytes,
  getPrivateFileSignedUrl,
} from '@/services/storageApi'
import {
  createMediaAssetWithUpload,
  deleteMediaAsset,
  fetchMediaAssets,
  mediaUploadSchema,
  updateMediaAsset,
  type MediaAssetWithFile,
  type MediaUploadInput,
} from '@/services/documentationApi'
import type { PublicationStatus, WorkspaceMemberSummary } from '@/types/database'
import {
  AlertCircle,
  Download,
  Edit3,
  Eye,
  Film,
  Image as ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react'

const PUB_META: Record<
  PublicationStatus,
  { label: string; variant: 'outline' | 'success' | 'secondary' }
> = {
  draft: { label: 'Draf Tim', variant: 'outline' },
  published: { label: 'Terpublikasi', variant: 'success' },
  archived: { label: 'Diarsipkan', variant: 'secondary' },
}

const PrivateMediaThumb: React.FC<{
  fileId: string
  mimeType: string
  alt: string
  onOpenPreview: () => void
}> = ({ fileId, mimeType, alt, onOpenPreview }) => {
  const isVideo = mimeType.startsWith('video/')
  const { data, isLoading, isError } = useQuery({
    queryKey: ['signed-url', fileId, false],
    queryFn: () => getPrivateFileSignedUrl(fileId, false),
    staleTime: 240_000,
    retry: 1,
  })

  return (
    <button
      type="button"
      onClick={onOpenPreview}
      className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-warm-200/70 flex items-center justify-center group"
    >
      {isLoading ? (
        <Skeleton className="h-full w-full rounded-none" />
      ) : isError || !data?.signedUrl ? (
        <div className="flex flex-col items-center gap-1 text-charcoal-muted">
          <ImageIcon className="h-6 w-6" />
          <span className="text-[11px]">Pratinjau tidak tersedia</span>
        </div>
      ) : isVideo ? (
        <div className="flex flex-col items-center justify-center gap-1.5 text-sage-800">
          <Film className="h-8 w-8" />
          <span className="text-[11px] font-medium">Klik untuk putar video</span>
        </div>
      ) : (
        <img
          src={data.signedUrl}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}
      <span className="absolute bottom-2 right-2 rounded-md bg-charcoal/75 px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1">
        <Eye className="h-3 w-3" />
        Lihat
      </span>
    </button>
  )
}

export const DocumentationWorkspacePage: React.FC = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user, membership, isSuperAdmin } = useAuth()

  const isLeadOrAdmin =
    isSuperAdmin ||
    membership?.role === 'ketua' ||
    membership?.role === 'sekretaris'

  const [pubFilter, setPubFilter] = useState<'all' | PublicationStatus>('all')
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<MediaAssetWithFile | null>(null)
  const [previewAsset, setPreviewAsset] = useState<MediaAssetWithFile | null>(null)
  const [deletingAsset, setDeletingAsset] = useState<MediaAssetWithFile | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    data: assets = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['workspace', 'media-assets'],
    queryFn: fetchMediaAssets,
    staleTime: 30_000,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['workspace', 'members'],
    queryFn: fetchWorkspaceMembers,
    staleTime: 60_000,
  })

  const { data: previewSignedUrl, isLoading: isLoadingPreview } = useQuery({
    queryKey: ['signed-url', previewAsset?.file_id ?? '', false],
    queryFn: () => getPrivateFileSignedUrl(previewAsset!.file_id, false),
    enabled: Boolean(previewAsset?.file_id),
    staleTime: 240_000,
  })

  const memberMap = useMemo(() => {
    const map = new Map<string, WorkspaceMemberSummary>()
    for (const m of members) map.set(m.user_id, m)
    return map
  }, [members])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MediaUploadInput>({
    resolver: zodResolver(mediaUploadSchema),
    defaultValues: {
      title: '',
      caption: '',
      publicationStatus: 'draft',
    },
  })

  useEffect(() => {
    if (!uploadModalOpen) return
    if (editingAsset) {
      reset({
        title: editingAsset.title ?? '',
        caption: editingAsset.caption ?? '',
        publicationStatus: editingAsset.publication_status,
      })
    } else {
      reset({
        title: '',
        caption: '',
        publicationStatus: 'draft',
      })
    }
  }, [uploadModalOpen, editingAsset, reset])

  const createMutation = useMutation({
    mutationFn: ({ file, values }: { file: File; values: MediaUploadInput }) =>
      createMediaAssetWithUpload(file, values, isLeadOrAdmin),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workspace', 'media-assets'] })
      toast({
        title: 'Dokumentasi Diunggah',
        description: 'Foto atau video berhasil disimpan secara aman ke kkn-private.',
        variant: 'success',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: MediaUploadInput }) =>
      updateMediaAsset(id, values, isLeadOrAdmin),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workspace', 'media-assets'] })
      toast({
        title: 'Dokumentasi Diperbarui',
        description: 'Metadata dan status dokumentasi berhasil disimpan.',
        variant: 'success',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMediaAsset,
    onSuccess: async () => {
      setDeletingAsset(null)
      await queryClient.invalidateQueries({ queryKey: ['workspace', 'media-assets'] })
      toast({
        title: 'Dokumentasi Dihapus',
        description: 'Item dokumentasi telah dihapus dari galeri.',
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

  const canEditAsset = (asset: MediaAssetWithFile): boolean => {
    if (isLeadOrAdmin) return true
    return Boolean(user?.id && (asset.uploaded_by === user.id || asset.assigned_to === user.id))
  }

  const handleCloseModal = () => {
    setFormError(null)
    setSelectedFile(null)
    setEditingAsset(null)
    setUploadModalOpen(false)
  }

  const onSubmit = async (values: MediaUploadInput) => {
    setFormError(null)
    try {
      if (editingAsset) {
        await updateMutation.mutateAsync({ id: editingAsset.id, values })
      } else {
        if (!selectedFile) {
          setFormError('Pilih berkas foto atau video terlebih dahulu.')
          return
        }
        await createMutation.mutateAsync({ file: selectedFile, values })
      }
      handleCloseModal()
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal menyimpan dokumentasi.'
      )
    }
  }

  const handleDownload = async (asset: MediaAssetWithFile) => {
    try {
      const signed = await getPrivateFileSignedUrl(asset.file_id, true)
      window.open(signed.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast({
        title: 'Gagal Mengunduh Berkas',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        variant: 'error',
      })
    }
  }

  const filteredAssets = useMemo(() => {
    if (pubFilter === 'all') return assets
    return assets.filter((a) => a.publication_status === pubFilter)
  }, [assets, pubFilter])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal">
            Dokumentasi Kegiatan KKN
          </h1>
          <p className="text-xs text-charcoal-muted mt-1">
            Unggah foto dan video kegiatan ke penyimpanan privat (kkn-private) dengan tautan bertanda tangan aman.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setFormError(null)
              setSelectedFile(null)
              setEditingAsset(null)
              setUploadModalOpen(true)
            }}
            className="text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Unggah Media</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-warm-300 bg-warm-50 p-1">
          {(
            [
              { id: 'all', label: 'Semua Media' },
              { id: 'draft', label: 'Draf Tim' },
              { id: 'published', label: 'Terpublikasi' },
              { id: 'archived', label: 'Diarsipkan' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPubFilter(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                pubFilter === tab.id
                  ? 'bg-sage-600 text-white shadow-xs'
                  : 'text-charcoal-muted hover:text-charcoal'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-charcoal-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-sage-700" />
          <span>Akses berkas via Edge Function Signed URL</span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <Skeleton className="aspect-video w-full rounded-b-none" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-charcoal">
                  Gagal Memuat Dokumentasi
                </p>
                <p className="text-xs text-charcoal-muted mt-1">
                  {error instanceof Error ? error.message : 'Terjadi kesalahan.'}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      ) : filteredAssets.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-2.5">
            <ImageIcon className="h-8 w-8 text-warm-400 mx-auto" />
            <h3 className="text-sm font-semibold text-charcoal">
              Belum ada dokumentasi pada kategori ini
            </h3>
            <p className="text-xs text-charcoal-muted max-w-md mx-auto">
              Seluruh anggota aktif KKN dapat mengunggah foto atau video kegiatan lapangan untuk dikurasi sebelum dipublikasikan.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => {
            const meta = PUB_META[asset.publication_status]
            const uploader = memberMap.get(asset.uploaded_by)
            const editable = canEditAsset(asset)

            return (
              <Card key={asset.id} className="overflow-hidden flex flex-col">
                <PrivateMediaThumb
                  fileId={asset.file_id}
                  mimeType={asset.file?.mime_type ?? 'image/jpeg'}
                  alt={asset.title || asset.file?.original_name || 'Dokumentasi KKN'}
                  onOpenPreview={() => setPreviewAsset(asset)}
                />

                <CardContent className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-charcoal line-clamp-1">
                        {asset.title || asset.file?.original_name || 'Dokumentasi'}
                      </h3>
                      <Badge variant={meta.variant} className="text-[10px] shrink-0">
                        {meta.label}
                      </Badge>
                    </div>
                    {asset.caption && (
                      <p className="text-xs text-charcoal-muted line-clamp-2">
                        {asset.caption}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-warm-200 text-[10px] text-charcoal-muted">
                    <span className="truncate">
                      {uploader?.full_name || 'Anggota'} ·{' '}
                      {asset.file ? formatBytes(asset.file.file_size) : ''}
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDownload(asset)}
                        className="rounded p-1 text-charcoal-muted hover:bg-warm-100 hover:text-charcoal"
                        title="Unduh berkas"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      {editable && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setFormError(null)
                              setEditingAsset(asset)
                              setUploadModalOpen(true)
                            }}
                            className="rounded p-1 text-charcoal-muted hover:bg-warm-100 hover:text-charcoal"
                            title="Edit detail / status"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingAsset(asset)}
                            className="rounded p-1 text-charcoal-muted hover:bg-red-50 hover:text-red-600"
                            title="Hapus dokumentasi"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Upload / Edit Media */}
      <Modal
        open={uploadModalOpen}
        onClose={handleCloseModal}
        title={editingAsset ? 'Edit Detail Dokumentasi' : 'Unggah Dokumentasi Kegiatan'}
        description="Unggahan disimpan di bucket privat kkn-private dan dapat ditinjau oleh seluruh anggota aktif."
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {!editingAsset && (
            <div className="space-y-1.5">
              <label htmlFor="media-file" className="text-xs font-medium text-charcoal block">
                Berkas Foto / Video (Maks. 25 MB) <span className="text-red-500">*</span>
              </label>
              <label
                htmlFor="media-file"
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-warm-300 bg-warm-50/70 p-4 text-center cursor-pointer hover:border-sage-400 transition-colors"
              >
                <Upload className="h-5 w-5 text-sage-700 mb-1" />
                <span className="text-xs font-medium text-charcoal">
                  {selectedFile ? selectedFile.name : 'Klik untuk memilih foto atau video'}
                </span>
                {selectedFile && (
                  <span className="text-[11px] text-charcoal-muted mt-0.5">
                    {formatBytes(selectedFile.size)}
                  </span>
                )}
                <input
                  id="media-file"
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null
                    setSelectedFile(file)
                  }}
                />
              </label>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="media-title" className="text-xs font-medium text-charcoal block">
              Judul Dokumentasi <span className="text-red-500">*</span>
            </label>
            <Input
              id="media-title"
              placeholder="Misal: Kerja Bakti Pembersihan Saluran Irigasi Dusun Tengah"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-[11px] text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="media-caption" className="text-xs font-medium text-charcoal block">
              Keterangan Kegiatan
            </label>
            <textarea
              id="media-caption"
              rows={3}
              placeholder="Tanggal pelaksanaan, lokasi dusun, dan deskripsi singkat momen kegiatan..."
              className="flex w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal"
              {...register('caption')}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="media-pub" className="text-xs font-medium text-charcoal block">
              Status Publikasi Portal
            </label>
            <select
              id="media-pub"
              disabled={!isLeadOrAdmin}
              className="flex h-9 w-full rounded-md border border-warm-300 bg-white px-3 py-1 text-xs text-charcoal disabled:bg-warm-100 disabled:text-charcoal-muted"
              {...register('publicationStatus')}
            >
              <option value="draft">Draf Internal Tim</option>
              <option value="published">Publikasikan ke Galeri Portal</option>
              <option value="archived">Arsipkan</option>
            </select>
            {!isLeadOrAdmin && (
              <p className="text-[10px] text-charcoal-muted">
                Unggahan baru berstatus Draf Internal hingga disetujui publikasinya oleh Ketua/Sekretaris.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-warm-200">
            <Button type="button" variant="ghost" size="sm" onClick={handleCloseModal}>
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="gap-1.5"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              <span>{editingAsset ? 'Simpan Perubahan' : 'Unggah & Simpan'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Preview Lightbox */}
      <Modal
        open={Boolean(previewAsset)}
        onClose={() => setPreviewAsset(null)}
        title={previewAsset?.title || previewAsset?.file?.original_name || 'Pratinjau Media'}
        description={previewAsset?.caption ?? undefined}
        maxWidthClass="max-w-2xl"
      >
        {previewAsset && (
          <div className="space-y-4">
            <div className="rounded-lg overflow-hidden bg-warm-100 border border-warm-200 flex items-center justify-center min-h-[260px]">
              {isLoadingPreview ? (
                <Loader2 className="h-6 w-6 animate-spin text-sage-700" />
              ) : !previewSignedUrl?.signedUrl ? (
                <p className="text-xs text-charcoal-muted">
                  Tidak dapat memuat pratinjau media.
                </p>
              ) : previewAsset.file?.mime_type.startsWith('video/') ? (
                <video
                  src={previewSignedUrl.signedUrl}
                  controls
                  className="max-h-[420px] w-full"
                />
              ) : (
                <img
                  src={previewSignedUrl.signedUrl}
                  alt={previewAsset.title || 'Dokumentasi'}
                  className="max-h-[460px] w-auto object-contain"
                />
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-charcoal-muted">
              <span>
                {previewAsset.file?.original_name}{' '}
                {previewAsset.file ? `(${formatBytes(previewAsset.file.file_size)})` : ''}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload(previewAsset)}
                className="gap-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Unduh Asli</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingAsset)}
        onClose={() => setDeletingAsset(null)}
        onConfirm={() => {
          if (deletingAsset) deleteMutation.mutate(deletingAsset.id)
        }}
        title="Hapus Item Dokumentasi?"
        description={
          deletingAsset
            ? `Dokumentasi "${deletingAsset.title || deletingAsset.file?.original_name}" akan dihapus dari galeri.`
            : ''
        }
        confirmLabel="Hapus"
        cancelLabel="Batal"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

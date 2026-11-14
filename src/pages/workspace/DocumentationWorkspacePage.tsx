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
  addDocumentationPhoto,
  createMediaAssetWithUpload,
  deleteMediaAsset,
  fetchDocumentationPhotos,
  fetchMediaAssets,
  mediaUploadSchema,
  removeDocumentationPhoto,
  setAssetCoverPhoto,
  updateMediaAsset,
  type DocumentationPhotoWithFile,
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
  Star,
  Trash2,
  Upload,
  X,
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [coverIndex, setCoverIndex] = useState<number>(0)
  const [formError, setFormError] = useState<string | null>(null)
  const [existingPhotos, setExistingPhotos] = useState<DocumentationPhotoWithFile[]>([])
  const [loadingPhotos, setLoadingPhotos] = useState<boolean>(false)

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
      category: '',
      event_date: '',
      location: '',
      photographer: '',
      description_long: '',
    },
  })

  useEffect(() => {
    if (!uploadModalOpen) return
    if (editingAsset) {
      reset({
        title: editingAsset.title ?? '',
        caption: editingAsset.caption ?? '',
        publicationStatus: editingAsset.publication_status,
        category: editingAsset.category ?? '',
        event_date: editingAsset.event_date ?? '',
        location: editingAsset.location ?? '',
        photographer: editingAsset.photographer ?? '',
        description_long: editingAsset.description_long ?? '',
      })
      // Load existing additional photos
      setLoadingPhotos(true)
      fetchDocumentationPhotos(editingAsset.id)
        .then((photos) => setExistingPhotos(photos))
        .catch(() => setExistingPhotos([]))
        .finally(() => setLoadingPhotos(false))
    } else {
      reset({
        title: '',
        caption: '',
        publicationStatus: 'draft',
        category: 'Program Kerja',
        event_date: new Date().toISOString().split('T')[0],
        location: '',
        photographer: '',
        description_long: '',
      })
      setSelectedFiles([])
      setCoverIndex(0)
      setExistingPhotos([])
    }
  }, [uploadModalOpen, editingAsset, reset])

  const createMutation = useMutation({
    mutationFn: ({
      files,
      coverIdx,
      values,
    }: {
      files: File[]
      coverIdx: number
      values: MediaUploadInput
    }) =>
      createMediaAssetWithUpload(
        files[0],
        values,
        isLeadOrAdmin,
        files.slice(1),
        coverIdx
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workspace', 'media-assets'] })
      toast({
        title: 'Dokumentasi Diunggah',
        description: 'Foto dokumentasi kegiatan berhasil disimpan secara aman ke kkn-private.',
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
    setSelectedFiles([])
    setCoverIndex(0)
    setExistingPhotos([])
    setEditingAsset(null)
    setUploadModalOpen(false)
  }

  const handleFilesChosen = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setFormError(null)

    const incoming = Array.from(fileList)
    const valid: File[] = []
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'video/mp4', 'video/quicktime', 'video/webm']

    for (const f of incoming) {
      if (f.size > 25 * 1024 * 1024) {
        setFormError(`Berkas "${f.name}" melebihi batas 25 MB.`)
        continue
      }
      if (!allowedTypes.includes(f.type) && !f.type.startsWith('image/')) {
        setFormError(`Format berkas "${f.name}" tidak didukung. Gunakan JPG, PNG, WEBP, atau Video MP4.`)
        continue
      }
      // Check duplicate
      const duplicate = selectedFiles.some((ex) => ex.name === f.name && ex.size === f.size)
      if (!duplicate) {
        valid.push(f)
      }
    }

    if (valid.length > 0) {
      setSelectedFiles((prev) => [...prev, ...valid])
    }
  }

  const handleRemoveChosenFile = (idx: number) => {
    setSelectedFiles((prev) => {
      const next = prev.filter((_, i) => i !== idx)
      if (coverIndex === idx) setCoverIndex(0)
      else if (coverIndex > idx) setCoverIndex((c) => c - 1)
      return next
    })
  }

  const onSubmit = async (values: MediaUploadInput) => {
    setFormError(null)
    try {
      if (editingAsset) {
        await updateMutation.mutateAsync({ id: editingAsset.id, values })
      } else {
        if (selectedFiles.length === 0) {
          setFormError('Pilih minimal satu berkas foto dokumentasi kegiatan.')
          return
        }
        await createMutation.mutateAsync({
          files: selectedFiles,
          coverIdx: coverIndex,
          values,
        })
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
              setSelectedFiles([])
              setCoverIndex(0)
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

          {!editingAsset ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-charcoal">
                  Foto Dokumentasi Kegiatan (Maks. 25 MB/berkas) <span className="text-red-500">*</span>
                </label>
                {selectedFiles.length > 0 && (
                  <span className="text-[11px] text-sage-800 font-semibold bg-sage-50 px-2 py-0.5 rounded border border-sage-200">
                    {selectedFiles.length} berkas dipilih
                  </span>
                )}
              </div>

              {/* Upload Dropzone */}
              <label
                htmlFor="media-files"
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-warm-300 bg-warm-50/70 p-4 text-center cursor-pointer hover:border-sage-400 hover:bg-warm-50 transition-colors"
              >
                <Upload className="h-6 w-6 text-sage-700 mb-1" />
                <span className="text-xs font-medium text-charcoal">
                  {selectedFiles.length === 0
                    ? 'Klik atau seret untuk memilih satu atau beberapa foto kegiatan'
                    : 'Tambah foto lainnya...'}
                </span>
                <span className="text-[11px] text-charcoal-muted mt-0.5">
                  Mendukung multi-select JPG, PNG, WEBP, atau Video MP4 (maks 25 MB per file)
                </span>
                <input
                  id="media-files"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/jpg,video/mp4,video/quicktime,video/webm"
                  className="hidden"
                  onChange={(e) => {
                    handleFilesChosen(e.target.files)
                    e.target.value = ''
                  }}
                />
              </label>

              {/* Photo Preview Grid */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-charcoal-muted">
                    <span>Pratinjau Berkas &amp; Pilih Foto Utama:</span>
                    <span className="italic text-[10px]">Bintang kuning = Foto Sampul</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1 border border-warm-200 rounded-lg bg-warm-50/40">
                    {selectedFiles.map((file, idx) => {
                      const isCover = coverIndex === idx
                      const isVideo = file.type.startsWith('video/')
                      const objUrl = URL.createObjectURL(file)

                      return (
                        <div
                          key={`${file.name}-${idx}`}
                          className={`relative group rounded-md overflow-hidden border ${
                            isCover ? 'border-amber-400 ring-2 ring-amber-300' : 'border-warm-200 bg-white'
                          } flex flex-col`}
                        >
                          <div className="relative aspect-[4/3] w-full bg-warm-100 flex items-center justify-center overflow-hidden">
                            {isVideo ? (
                              <Film className="h-6 w-6 text-sage-700" />
                            ) : (
                              <img
                                src={objUrl}
                                alt={file.name}
                                className="w-full h-full object-cover"
                                onLoad={() => URL.revokeObjectURL(objUrl)}
                              />
                            )}

                            {/* Cover Star Badge/Button */}
                            <button
                              type="button"
                              onClick={() => setCoverIndex(idx)}
                              title={isCover ? 'Foto Sampul Utama' : 'Jadikan Foto Sampul'}
                              className={`absolute top-1 left-1 rounded p-1 text-[10px] ${
                                isCover
                                  ? 'bg-amber-400 text-charcoal font-bold shadow-xs'
                                  : 'bg-charcoal/60 text-white opacity-80 hover:opacity-100'
                              }`}
                            >
                              <Star className={`h-3 w-3 ${isCover ? 'fill-charcoal text-charcoal' : ''}`} />
                            </button>

                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveChosenFile(idx)}
                              title="Hapus foto ini"
                              className="absolute top-1 right-1 rounded bg-red-600/80 hover:bg-red-600 text-white p-1 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>

                            {isCover && (
                              <span className="absolute bottom-1 left-1 bg-amber-400/90 text-[9px] font-semibold text-charcoal px-1.5 py-0.2 rounded">
                                Cover
                              </span>
                            )}
                          </div>
                          <div className="p-1.5 bg-white text-[10px]">
                            <p className="truncate font-medium text-charcoal" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-charcoal-muted text-[9px]">{formatBytes(file.size)}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Editing Asset: show current primary file & additional photos management */
            <div className="space-y-2 rounded-lg border border-warm-200 bg-warm-50/50 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-charcoal">Foto-Foto dalam Album Ini</span>
                <span className="text-[11px] text-charcoal-muted">
                  {existingPhotos.length + 1} foto tersimpan
                </span>
              </div>

              {/* Upload more photos to existing album */}
              <div>
                <label
                  htmlFor="add-more-photos"
                  className="flex items-center justify-center gap-1.5 py-2 px-3 border border-dashed border-sage-300 rounded-md bg-white hover:bg-sage-50/50 text-xs text-sage-800 font-medium cursor-pointer transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah Foto ke Album Ini</span>
                  <input
                    id="add-more-photos"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file || !editingAsset) return
                      try {
                        await addDocumentationPhoto(editingAsset.id, file, existingPhotos.length + 1)
                        const updated = await fetchDocumentationPhotos(editingAsset.id)
                        setExistingPhotos(updated)
                        toast({ title: 'Foto Ditambahkan', variant: 'success' })
                      } catch (err) {
                        toast({
                          title: 'Gagal Menambah Foto',
                          description: err instanceof Error ? err.message : 'Terjadi kesalahan',
                          variant: 'error',
                        })
                      }
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>

              {/* List of existing photos */}
              {loadingPhotos ? (
                <div className="py-4 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-sage-600" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 pt-1 max-h-40 overflow-y-auto">
                  {/* Primary cover */}
                  <div className="relative rounded overflow-hidden border-2 border-amber-400 bg-white p-1">
                    <div className="aspect-[4/3] bg-warm-100 flex items-center justify-center text-[10px] text-charcoal-muted">
                      <ImageIcon className="h-5 w-5 opacity-50" />
                    </div>
                    <span className="text-[9px] font-semibold text-amber-800 bg-amber-50 rounded px-1 block mt-0.5 truncate">
                      Foto Utama
                    </span>
                  </div>

                  {/* Additional photos */}
                  {existingPhotos.map((p) => (
                    <div key={p.id} className="relative rounded overflow-hidden border border-warm-200 bg-white p-1 group">
                      <div className="aspect-[4/3] bg-warm-100 flex items-center justify-center text-[10px] text-charcoal-muted">
                        <ImageIcon className="h-5 w-5 opacity-50" />
                      </div>
                      <div className="flex items-center justify-between mt-0.5 text-[9px]">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!editingAsset) return
                            try {
                              await setAssetCoverPhoto(editingAsset.id, p.file_id)
                              toast({ title: 'Foto Utama Diubah', variant: 'success' })
                            } catch (err) {
                              toast({ title: 'Gagal Mengubah Foto Utama', variant: 'error' })
                            }
                          }}
                          className="text-sage-700 hover:underline"
                          title="Jadikan Foto Utama"
                        >
                          Jadikan Cover
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await removeDocumentationPhoto(p.id)
                              setExistingPhotos((prev) => prev.filter((item) => item.id !== p.id))
                              toast({ title: 'Foto Dihapus', variant: 'success' })
                            } catch (err) {
                              toast({ title: 'Gagal Menghapus', variant: 'error' })
                            }
                          }}
                          className="text-red-600 hover:text-red-800 p-0.5"
                          title="Hapus foto"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              Keterangan Ringkas
            </label>
            <textarea
              id="media-caption"
              rows={2}
              placeholder="Deskripsi singkat yang tampil pada kartu galeri..."
              className="flex w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal"
              {...register('caption')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="media-cat" className="text-xs font-medium text-charcoal block">
                Kategori Kegiatan
              </label>
              <select
                id="media-cat"
                className="flex h-9 w-full rounded-md border border-warm-300 bg-white px-3 py-1 text-xs text-charcoal"
                {...register('category')}
              >
                <option value="Program Kerja">Program Kerja</option>
                <option value="Observasi Survei">Observasi Survei</option>
                <option value="Kegiatan Kelompok">Kegiatan Kelompok</option>
                <option value="Kegiatan Sosial">Kegiatan Sosial</option>
                <option value="Dokumentasi Lainnya">Dokumentasi Lainnya</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="media-date" className="text-xs font-medium text-charcoal block">
                Tanggal Pelaksanaan
              </label>
              <Input
                id="media-date"
                type="date"
                {...register('event_date')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="media-location" className="text-xs font-medium text-charcoal block">
                Lokasi / Dusun
              </label>
              <Input
                id="media-location"
                placeholder="Misal: Dusun Tengah, Kantor Desa"
                {...register('location')}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="media-photographer" className="text-xs font-medium text-charcoal block">
                Dokumentator / Fotografer
              </label>
              <Input
                id="media-photographer"
                placeholder="Nama anggota dokumentator"
                {...register('photographer')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="media-desc" className="text-xs font-medium text-charcoal block">
              Deskripsi Lengkap (Halaman Detail)
            </label>
            <textarea
              id="media-desc"
              rows={3}
              placeholder="Cerita lengkap mengenai latar belakang, proses, dan hasil kegiatan..."
              className="flex w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal"
              {...register('description_long')}
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

import React, { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'
import {
  deleteInventoryItemPhoto,
  fetchInventoryItemPhotos,
  getInventoryPhotoSignedUrl,
  setInventoryPrimaryPhoto,
  uploadInventoryItemPhoto,
} from '@/services/inventoryApi'
import type {
  InventoryCondition,
  InventoryDocumentationCategory,
  InventoryItem,
  InventoryPhoto,
  InventoryPhotoType,
} from '@/types/database'
import {
  AlertCircle,
  Calendar,
  Camera,
  Check,
  Eye,
  Image as ImageIcon,
  Loader2,
  Plus,
  Star,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react'

interface InventoryItemPhotoGalleryModalProps {
  open: boolean
  onClose: () => void
  item: InventoryItem | null
  onItemUpdated?: () => void
}

const DOCUMENTATION_CATEGORIES: {
  value: InventoryDocumentationCategory
  label: string
  color: string
}[] = [
  { value: 'kondisi_awal', label: 'Saat Masuk / Awal', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'pembelian', label: 'Bukti Pembelian / Nota', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'perpindahan', label: 'Serah Terima / Lokasi', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'kerusakan', label: 'Dokumentasi Kerusakan', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'pengembalian', label: 'Pengembalian / Pemilik', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'kondisi_akhir', label: 'Kondisi Akhir KKN', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { value: 'kelengkapan', label: 'Kelengkapan & Aksesori', color: 'bg-warm-200 text-charcoal border-warm-300' },
]

const PHOTO_TYPES: { value: InventoryPhotoType; label: string }[] = [
  { value: 'general', label: 'Foto Umum' },
  { value: 'front', label: 'Tampak Depan' },
  { value: 'back_side', label: 'Tampak Belakang / Samping' },
  { value: 'spec_serial', label: 'Detail Merek / Seri / Label' },
  { value: 'condition', label: 'Fisik & Kondisi' },
  { value: 'accessories', label: 'Kelengkapan & Aksesori' },
]

const CONDITION_OPTIONS: { value: InventoryCondition; label: string }[] = [
  { value: 'good', label: 'Baik (Siap Pakai)' },
  { value: 'fair', label: 'Cukup (Wajar Pakai)' },
  { value: 'damaged', label: 'Rusak (Perlu Perbaikan)' },
  { value: 'lost', label: 'Hilang / Rusak Total' },
]

export const InventoryItemPhotoGalleryModal: React.FC<InventoryItemPhotoGalleryModalProps> = ({
  open,
  onClose,
  item,
  onItemUpdated,
}) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user, isSuperAdmin } = useAuth()

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | InventoryDocumentationCategory>('all')
  const [selectedPhoto, setSelectedPhoto] = useState<InventoryPhoto | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // Upload Form State
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [stagedFile, setStagedFile] = useState<File | null>(null)
  const [stagedPreviewUrl, setStagedPreviewUrl] = useState<string | null>(null)
  const [uploadCategory, setUploadCategory] = useState<InventoryDocumentationCategory>('kondisi_awal')
  const [uploadPhotoType, setUploadPhotoType] = useState<InventoryPhotoType>('general')
  const [uploadCondition, setUploadCondition] = useState<InventoryCondition>(item?.condition || 'good')
  const [uploadCaption, setUploadCaption] = useState('')
  const [uploadDate, setUploadDate] = useState(() => new Date().toISOString().split('T')[0])
  const [uploadIsPrimary, setUploadIsPrimary] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Fetch photos for this item
  const {
    data: photos = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['workspace', 'inventory-photos', item?.id],
    queryFn: () => (item ? fetchInventoryItemPhotos(item.id) : []),
    enabled: Boolean(open && item?.id),
    staleTime: 60_000,
  })

  // Cleanup staged preview on unmount
  useEffect(() => {
    return () => {
      if (stagedPreviewUrl) URL.revokeObjectURL(stagedPreviewUrl)
    }
  }, [stagedPreviewUrl])

  // Reset form when opening or item changes
  useEffect(() => {
    if (open) {
      setShowUploadForm(false)
      if (stagedPreviewUrl) URL.revokeObjectURL(stagedPreviewUrl)
      setStagedFile(null)
      setStagedPreviewUrl(null)
      setFormError(null)
      setSelectedPhoto(null)
      setActiveCategoryFilter('all')
    }
  }, [open, item?.id])

  // Auto-select primary photo or first photo for preview pane
  useEffect(() => {
    if (photos.length > 0 && !selectedPhoto) {
      const primary = photos.find((p) => p.is_primary) || photos[0]
      setSelectedPhoto(primary)
    }
  }, [photos, selectedPhoto])

  // Resolve signed URL for currently selected photo
  const { data: selectedSignedUrl } = useQuery({
    queryKey: ['workspace', 'inventory-photo-signed-url', selectedPhoto?.file_id],
    queryFn: () => (selectedPhoto ? getInventoryPhotoSignedUrl(selectedPhoto.file_id) : null),
    enabled: Boolean(selectedPhoto?.file_id),
    staleTime: 240_000,
  })

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!stagedFile || !item) return
      return uploadInventoryItemPhoto({
        itemId: item.id,
        file: stagedFile,
        photoType: uploadPhotoType,
        documentationCategory: uploadCategory,
        conditionSnapshot: uploadCondition,
        caption: uploadCaption,
        documentationDate: uploadDate,
        isPrimary: uploadIsPrimary || photos.length === 0,
      })
    },
    onSuccess: async (newPhoto) => {
      toast({
        variant: 'success',
        title: 'Foto Berhasil Diunggah',
        description: 'Foto dokumentasi barang telah disimpan.',
      })
      handleCancelStaged()
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'inventory-items'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'inventory-item', item?.id] }),
      ])
      onItemUpdated?.()
      if (newPhoto) {
        setSelectedPhoto(newPhoto)
      }
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Gagal mengunggah foto.')
    },
  })

  // Set Primary Mutation
  const setPrimaryMutation = useMutation({
    mutationFn: async (photoId: string) => {
      return setInventoryPrimaryPhoto(photoId)
    },
    onSuccess: async () => {
      toast({
        variant: 'success',
        title: 'Foto Utama Diperbarui',
        description: 'Foto utama katalog barang berhasil diubah.',
      })
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'inventory-items'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'inventory-item', item?.id] }),
      ])
      onItemUpdated?.()
    },
    onError: (err) => {
      toast({
        variant: 'error',
        title: 'Gagal Memperbarui Foto Utama',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
      })
    },
  })

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (photoId: string) => {
      return deleteInventoryItemPhoto(photoId)
    },
    onSuccess: async () => {
      toast({
        variant: 'success',
        title: 'Foto Dihapus',
        description: 'Foto dokumentasi berhasil dihapus.',
      })
      setSelectedPhoto(null)
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'inventory-items'] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', 'inventory-item', item?.id] }),
      ])
      onItemUpdated?.()
    },
    onError: (err) => {
      toast({
        variant: 'error',
        title: 'Gagal Menghapus Foto',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
      })
    },
  })

  if (!item) return null

  const filteredPhotos = activeCategoryFilter === 'all'
    ? photos
    : photos.filter((p) => p.documentation_category === activeCategoryFilter)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setFormError(null)

    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])
    if (!allowed.has(file.type)) {
      setFormError('Format berkas harus JPG, JPEG, PNG, atau WebP.')
      return
    }

    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      setFormError('Ukuran file maksimal 5 MB.')
      return
    }

    if (stagedPreviewUrl) URL.revokeObjectURL(stagedPreviewUrl)
    setStagedFile(file)
    setStagedPreviewUrl(URL.createObjectURL(file))
  }

  const handleCancelStaged = () => {
    if (stagedPreviewUrl) URL.revokeObjectURL(stagedPreviewUrl)
    setStagedFile(null)
    setStagedPreviewUrl(null)
    setFormError(null)
    setShowUploadForm(false)
  }

  const canDeletePhoto = (photo: InventoryPhoto): boolean => {
    if (isSuperAdmin) return true
    if (user?.id && photo.uploaded_by === user.id) return true
    return false
  }

  const handleDeleteCurrent = () => {
    if (!selectedPhoto) return
    const confirmed = window.confirm('Apakah Anda yakin ingin menghapus foto dokumentasi ini?')
    if (confirmed) {
      deleteMutation.mutate(selectedPhoto.id)
    }
  }

  const openLightbox = (url: string | null) => {
    if (url) {
      setLightboxUrl(url)
      setLightboxOpen(true)
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Dokumentasi & Galeri Foto Barang"
        description={`${item.name} (${item.item_code || 'Tanpa Kode'}) — Pencatatan visual kondisi fisik, pembelian, serah terima, dan rekonsiliasi akhir.`}
        maxWidthClass="max-w-4xl"
      >
        <div className="space-y-4">
          {/* Item Quick Meta Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warm-200 bg-warm-50/60 p-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-charcoal text-sm">{item.name}</span>
              {item.item_code && (
                <code className="text-[11px] font-mono bg-warm-200/80 px-1.5 py-0.5 rounded text-charcoal">
                  {item.item_code}
                </code>
              )}
              <Badge variant="outline" className="text-[10px]">
                {item.category}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                {photos.length} Foto Terdaftar
              </Badge>
              {!showUploadForm && (
                <Button
                  size="sm"
                  onClick={() => setShowUploadForm(true)}
                  className="text-xs gap-1.5 h-8"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah Foto</span>
                </Button>
              )}
            </div>
          </div>

          {/* Form Tambah Foto (Collapsible) */}
          {showUploadForm && (
            <div className="rounded-lg border-2 border-dashed border-sage-300 bg-sage-50/40 p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-sage-200 pb-2">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-sage-700" />
                  <span className="text-xs font-semibold text-charcoal">Unggah Foto Dokumentasi Baru</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelStaged}
                  className="h-7 w-7 p-0 text-charcoal-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* File Picker or Staged Preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1 flex flex-col items-center justify-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {stagedPreviewUrl ? (
                    <div className="space-y-2 text-center w-full">
                      <div className="relative mx-auto h-40 w-full rounded-md overflow-hidden border border-emerald-300 bg-black/5 shadow-xs">
                        <img
                          src={stagedPreviewUrl}
                          alt="Pratinjau Foto"
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute top-1 right-1 bg-emerald-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow">
                          Siap Unggah
                        </span>
                      </div>
                      <p className="text-[11px] text-charcoal-muted truncate">
                        {stagedFile?.name} ({Math.round((stagedFile?.size || 0) / 1024)} KB)
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs w-full h-7"
                      >
                        Ganti File
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="h-40 w-full border-2 border-dashed border-warm-300 hover:border-sage-400 bg-white rounded-md flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-colors"
                    >
                      <Upload className="h-7 w-7 text-sage-600 mb-2" />
                      <p className="text-xs font-semibold text-charcoal">Pilih File Foto</p>
                      <p className="text-[10px] text-charcoal-muted mt-1">
                        JPG, PNG, atau WebP (maks. 5 MB)
                      </p>
                    </div>
                  )}
                </div>

                {/* Form Metadata Fields */}
                <div className="md:col-span-2 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-medium text-charcoal block mb-1">
                        Kategori Dokumentasi
                      </label>
                      <select
                        value={uploadCategory}
                        onChange={(e) => setUploadCategory(e.target.value as InventoryDocumentationCategory)}
                        className="w-full text-xs rounded-md border border-warm-300 bg-white p-2 text-charcoal"
                      >
                        {DOCUMENTATION_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-charcoal block mb-1">
                        Tipe Sudut / Detail Foto
                      </label>
                      <select
                        value={uploadPhotoType}
                        onChange={(e) => setUploadPhotoType(e.target.value as InventoryPhotoType)}
                        className="w-full text-xs rounded-md border border-warm-300 bg-white p-2 text-charcoal"
                      >
                        {PHOTO_TYPES.map((pt) => (
                          <option key={pt.value} value={pt.value}>
                            {pt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-charcoal block mb-1">
                        Kondisi Fisik Saat Difoto
                      </label>
                      <select
                        value={uploadCondition}
                        onChange={(e) => setUploadCondition(e.target.value as InventoryCondition)}
                        className="w-full text-xs rounded-md border border-warm-300 bg-white p-2 text-charcoal"
                      >
                        {CONDITION_OPTIONS.map((co) => (
                          <option key={co.value} value={co.value}>
                            {co.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-charcoal block mb-1">
                        Tanggal Dokumentasi
                      </label>
                      <input
                        type="date"
                        value={uploadDate}
                        onChange={(e) => setUploadDate(e.target.value)}
                        className="w-full text-xs rounded-md border border-warm-300 bg-white p-2 text-charcoal"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-charcoal block mb-1">
                      Keterangan / Catatan Bukti Fisik
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Tampak depan lengkap kardus, kabel power utuh, tergores di bagian samping..."
                      value={uploadCaption}
                      onChange={(e) => setUploadCaption(e.target.value)}
                      className="w-full text-xs rounded-md border border-warm-300 bg-white p-2 text-charcoal"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="isPrimaryCheckbox"
                      checked={uploadIsPrimary}
                      onChange={(e) => setUploadIsPrimary(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-warm-300 text-sage-600 focus:ring-sage-500"
                    />
                    <label htmlFor="isPrimaryCheckbox" className="text-xs text-charcoal cursor-pointer">
                      Jadikan foto utama di katalog inventaris
                    </label>
                  </div>

                  {formError && (
                    <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancelStaged}
                      disabled={uploadMutation.isPending}
                      className="text-xs"
                    >
                      Batal
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => uploadMutation.mutate()}
                      disabled={!stagedFile || uploadMutation.isPending}
                      className="text-xs gap-1.5"
                    >
                      {uploadMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      <span>{uploadMutation.isPending ? 'Menyimpan...' : 'Simpan Foto'}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filter Kategori Dokumentasi */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-warm-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategoryFilter === 'all'
                  ? 'bg-charcoal text-white'
                  : 'bg-warm-100 text-charcoal-muted hover:text-charcoal'
              }`}
            >
              Semua Foto ({photos.length})
            </button>
            {DOCUMENTATION_CATEGORIES.map((cat) => {
              const count = photos.filter((p) => p.documentation_category === cat.value).length
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setActiveCategoryFilter(cat.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    activeCategoryFilter === cat.value
                      ? 'bg-sage-800 text-white'
                      : 'bg-warm-100 text-charcoal-muted hover:text-charcoal'
                  }`}
                >
                  {cat.label} ({count})
                </button>
              )
            })}
          </div>

          {/* Main Content Area: Selected Photo Preview + Thumbnails */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-sage-600" />
            </div>
          ) : photos.length === 0 ? (
            <div className="rounded-lg border border-warm-200 bg-warm-50/50 p-8 text-center space-y-2">
              <ImageIcon className="h-8 w-8 text-warm-400 mx-auto" />
              <p className="text-sm font-semibold text-charcoal">Belum Ada Dokumentasi Foto</p>
              <p className="text-xs text-charcoal-muted max-w-md mx-auto">
                Barang ini belum memiliki foto fisik. Klik &ldquo;Tambah Foto&rdquo; untuk mengunggah kondisi awal, bukti nota pembelian, atau kelengkapan barang.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left/Main Column: Selected Photo Details */}
              <div className="lg:col-span-7 space-y-3">
                <div className="relative rounded-lg overflow-hidden border border-warm-300 bg-black/5 aspect-4/3 flex items-center justify-center">
                  {selectedSignedUrl ? (
                    <img
                      src={selectedSignedUrl}
                      alt={selectedPhoto?.caption || item.name}
                      onClick={() => openLightbox(selectedSignedUrl)}
                      className="w-full h-full object-contain cursor-zoom-in hover:opacity-95 transition-opacity"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-charcoal-muted space-y-2">
                      <Loader2 className="h-6 w-6 animate-spin text-sage-600" />
                      <span className="text-xs">Memuat foto...</span>
                    </div>
                  )}

                  {selectedPhoto?.is_primary && (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded bg-amber-500 text-white px-2 py-0.5 text-[10px] font-semibold shadow">
                      <Star className="h-3 w-3 fill-current" />
                      <span>Foto Utama Katalog</span>
                    </span>
                  )}

                  {selectedSignedUrl && (
                    <button
                      type="button"
                      onClick={() => openLightbox(selectedSignedUrl)}
                      className="absolute bottom-2 right-2 rounded bg-black/60 hover:bg-black/80 text-white p-1.5 shadow backdrop-blur-xs transition-colors"
                      title="Perbesar Tampilan Foto"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Selected Photo Info Card */}
                {selectedPhoto && (
                  <div className="rounded-md border border-warm-200 bg-white p-3 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-warm-100 pb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className={
                            DOCUMENTATION_CATEGORIES.find(
                              (c) => c.value === selectedPhoto.documentation_category
                            )?.color || ''
                          }
                        >
                          {
                            DOCUMENTATION_CATEGORIES.find(
                              (c) => c.value === selectedPhoto.documentation_category
                            )?.label
                          }
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {
                            PHOTO_TYPES.find((pt) => pt.value === selectedPhoto.photo_type)?.label ||
                            selectedPhoto.photo_type
                          }
                        </Badge>
                        {selectedPhoto.condition_snapshot && (
                          <Badge variant="secondary" className="text-[10px]">
                            Kondisi:{' '}
                            {
                              CONDITION_OPTIONS.find(
                                (c) => c.value === selectedPhoto.condition_snapshot
                              )?.label
                            }
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {!selectedPhoto.is_primary && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setPrimaryMutation.mutate(selectedPhoto.id)}
                            disabled={setPrimaryMutation.isPending}
                            className="text-[11px] h-7 gap-1"
                            title="Jadikan sebagai foto utama katalog barang"
                          >
                            <Star className="h-3 w-3 text-amber-500" />
                            <span>Jadikan Utama</span>
                          </Button>
                        )}

                        {canDeletePhoto(selectedPhoto) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={handleDeleteCurrent}
                            disabled={deleteMutation.isPending}
                            className="text-[11px] h-7 text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5"
                            title="Hapus foto ini"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {selectedPhoto.caption && (
                      <p className="text-charcoal text-xs leading-relaxed">
                        &ldquo;{selectedPhoto.caption}&rdquo;
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-charcoal-muted pt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-sage-600 shrink-0" />
                        <span>Tgl Foto: {selectedPhoto.documentation_date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-sage-600 shrink-0" />
                        <span className="truncate">Oleh: {selectedPhoto.uploader_name || 'Anggota'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Thumbnail Strip / Grid */}
              <div className="lg:col-span-5 space-y-2">
                <p className="text-[11px] font-semibold text-charcoal uppercase tracking-wider">
                  Daftar Foto ({filteredPhotos.length})
                </p>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {filteredPhotos.map((photo) => (
                    <ThumbnailRow
                      key={photo.id}
                      photo={photo}
                      isSelected={selectedPhoto?.id === photo.id}
                      onSelect={() => setSelectedPhoto(photo)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Lightbox Preview Modal */}
      {lightboxOpen && lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxUrl}
              alt="Perbesaran Foto"
              className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute top-2 right-2 rounded-full bg-black/70 hover:bg-black text-white p-2 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

const ThumbnailRow: React.FC<{
  photo: InventoryPhoto
  isSelected: boolean
  onSelect: () => void
}> = ({ photo, isSelected, onSelect }) => {
  const { data: thumbUrl } = useQuery({
    queryKey: ['workspace', 'inventory-photo-thumb', photo.file_id],
    queryFn: () => getInventoryPhotoSignedUrl(photo.file_id),
    staleTime: 240_000,
  })

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-2.5 p-2 rounded-md border cursor-pointer transition-all ${
        isSelected
          ? 'border-sage-500 bg-sage-50/80 ring-1 ring-sage-400'
          : 'border-warm-200 bg-white hover:bg-warm-50'
      }`}
    >
      <div className="h-12 w-12 shrink-0 rounded bg-black/5 overflow-hidden border border-warm-200 relative">
        {thumbUrl ? (
          <img src={thumbUrl} alt="Thumbnail" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-charcoal-muted">
            <ImageIcon className="h-4 w-4" />
          </div>
        )}
        {photo.is_primary && (
          <span className="absolute bottom-0 right-0 bg-amber-500 text-white p-0.5 rounded-tl">
            <Star className="h-2.5 w-2.5 fill-current" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-charcoal truncate">
            {DOCUMENTATION_CATEGORIES.find((c) => c.value === photo.documentation_category)?.label}
          </span>
          {photo.is_primary && (
            <Badge variant="outline" className="text-[9px] border-amber-300 text-amber-800 bg-amber-50">
              Utama
            </Badge>
          )}
        </div>
        <p className="text-[10px] text-charcoal-muted truncate mt-0.5">
          {photo.caption || photo.photo_type}
        </p>
        <p className="text-[9px] text-charcoal-muted/80 mt-0.5">
          {photo.documentation_date} · {photo.uploader_name || 'Anggota'}
        </p>
      </div>
    </div>
  )
}

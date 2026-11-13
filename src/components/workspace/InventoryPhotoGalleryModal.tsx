import React, { useRef, useState } from 'react'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import {
  fetchInventoryItemPhotos,
  uploadInventoryItemPhoto,
  setPrimaryInventoryPhoto,
  deleteInventoryPhoto,
  fetchInventorySignedPhotoUrls,
} from '@/services/inventoryApi'
import type {
  InventoryItem,
  InventoryPhoto,
  InventoryPhotoType,
  InventoryDocumentationCategory,
  InventoryConditionSnapshot,
} from '@/types/database'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Camera,
  Image as ImageIcon,
  Star,
  Trash2,
  Calendar,
  User,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react'

interface InventoryPhotoGalleryModalProps {
  open: boolean
  onClose: () => void
  item: InventoryItem | null
  canManage?: boolean
  onPhotoUpdated?: () => void
}

const PHOTO_TYPE_LABELS: Record<InventoryPhotoType, string> = {
  primary: 'Foto Utama',
  front: 'Tampak Depan',
  back_side: 'Tampak Belakang',
  spec_serial: 'Merek & No. Seri',
  condition: 'Kondisi / Detail',
  accessories: 'Aksesoris & Kelengkapan',
  general: 'Dokumentasi Umum',
}

const CATEGORY_LABELS: Record<InventoryDocumentationCategory, string> = {
  kondisi_awal: 'Kondisi Awal',
  pembelian: 'Bukti Pembelian',
  perpindahan: 'Serah Terima / Pindah',
  kerusakan: 'Bukti Kerusakan',
  pengembalian: 'Pengembalian',
  kondisi_akhir: 'Kondisi Akhir',
  kelengkapan: 'Kelengkapan',
}

const CONDITION_LABELS: Record<InventoryConditionSnapshot, string> = {
  new: 'Baru',
  good: 'Baik',
  fair: 'Cukup',
  damaged: 'Rusak',
  lost: 'Hilang',
}

export const InventoryPhotoGalleryModal: React.FC<InventoryPhotoGalleryModalProps> = ({
  open,
  onClose,
  item,
  canManage = false,
  onPhotoUpdated,
}) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const [isAddingPhoto, setIsAddingPhoto] = useState(false)
  const [stagedFile, setStagedFile] = useState<File | null>(null)
  const [stagedPreview, setStagedPreview] = useState<string | null>(null)
  const [photoType, setPhotoType] = useState<InventoryPhotoType>('condition')
  const [category, setCategory] = useState<InventoryDocumentationCategory>('kondisi_awal')
  const [conditionSnapshot, setConditionSnapshot] = useState<InventoryConditionSnapshot>('good')
  const [caption, setCaption] = useState('')
  const [makePrimary, setMakePrimary] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)

  // 1. Fetch item photos
  const { data: photos = [] } = useQuery({
    queryKey: ['workspace', 'inventory-photos', item?.id],
    queryFn: () => (item ? fetchInventoryItemPhotos(item.id) : Promise.resolve([])),
    enabled: Boolean(open && item?.id),
    staleTime: 30_000,
  })

  // 2. Fetch signed URLs for all photos
  const photoFileIds = photos.map((p) => p.file_id)
  const { data: signedUrls = {} } = useQuery({
    queryKey: ['workspace', 'inventory-photo-urls', photoFileIds],
    queryFn: () => fetchInventorySignedPhotoUrls(photoFileIds),
    enabled: photoFileIds.length > 0,
    staleTime: 240_000,
  })

  // Determine which photo is currently active in main preview
  const activePhoto =
    photos.find((p) => p.id === selectedPhotoId) ||
    photos.find((p) => p.is_primary) ||
    photos[0] ||
    null

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!item || !stagedFile) throw new Error('Berkas foto belum dipilih.')
      return uploadInventoryItemPhoto({
        itemId: item.id,
        file: stagedFile,
        photoType: makePrimary ? 'primary' : photoType,
        documentationCategory: category,
        conditionSnapshot,
        caption,
        isPrimary: makePrimary || photos.length === 0,
      })
    },
    onSuccess: (newPhoto) => {
      toast({
        variant: 'success',
        title: 'Foto Tersimpan',
        description: 'Foto dokumentasi barang berhasil diunggah.',
      })
      resetStaged()
      setIsAddingPhoto(false)
      setSelectedPhotoId(newPhoto.id)
      queryClient.invalidateQueries({ queryKey: ['workspace', 'inventory-photos', item?.id] })
      queryClient.invalidateQueries({ queryKey: ['workspace', 'inventory-items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-photo-urls'] })
      onPhotoUpdated?.()
    },
    onError: (err: Error) => {
      setFormError(err.message || 'Gagal mengunggah foto.')
    },
  })

  const setPrimaryMutation = useMutation({
    mutationFn: async (photo: InventoryPhoto) => {
      if (!item) return
      return setPrimaryInventoryPhoto(item.id, photo.id, photo.file_id)
    },
    onSuccess: () => {
      toast({
        variant: 'success',
        title: 'Foto Utama Diperbarui',
        description: 'Foto ini sekarang menjadi tampilan utama katalog barang.',
      })
      queryClient.invalidateQueries({ queryKey: ['workspace', 'inventory-photos', item?.id] })
      queryClient.invalidateQueries({ queryKey: ['workspace', 'inventory-items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-photo-urls'] })
      onPhotoUpdated?.()
    },
    onError: (err: Error) => {
      toast({
        variant: 'error',
        title: 'Gagal Mengubah Foto Utama',
        description: err.message,
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (photo: InventoryPhoto) => {
      if (!item) return
      return deleteInventoryPhoto(item.id, photo.id, photo.file_id)
    },
    onSuccess: () => {
      toast({
        variant: 'success',
        title: 'Foto Dihapus',
        description: 'Foto dokumentasi telah dihapus.',
      })
      setSelectedPhotoId(null)
      queryClient.invalidateQueries({ queryKey: ['workspace', 'inventory-photos', item?.id] })
      queryClient.invalidateQueries({ queryKey: ['workspace', 'inventory-items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-photo-urls'] })
      onPhotoUpdated?.()
    },
    onError: (err: Error) => {
      toast({
        variant: 'error',
        title: 'Gagal Menghapus Foto',
        description: err.message,
      })
    },
  })

  const resetStaged = () => {
    if (stagedPreview) URL.revokeObjectURL(stagedPreview)
    setStagedFile(null)
    setStagedPreview(null)
    setCaption('')
    setMakePrimary(false)
    setFormError(null)
  }

  const handleFileSelect = (file: File | undefined) => {
    if (!file) return
    setFormError(null)

    const validMimes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validMimes.includes(file.type)) {
      setFormError('Format foto tidak valid. Gunakan file JPG, JPEG, PNG, atau WebP.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Ukuran file foto melebihi batas maksimal 5 MB.')
      return
    }

    if (stagedPreview) URL.revokeObjectURL(stagedPreview)
    setStagedFile(file)
    setStagedPreview(URL.createObjectURL(file))
  }

  const handleClose = () => {
    resetStaged()
    setIsAddingPhoto(false)
    setSelectedPhotoId(null)
    onClose()
  }

  if (!item) return null

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Galeri Foto: ${item.name}`}
      description={`Kode: ${item.item_code || '—'} · Kepemilikan: ${item.ownership_type} · Lokasi: ${item.current_location}`}
      maxWidthClass="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Main Photo Viewer or Staged Preview */}
        {isAddingPhoto && stagedPreview ? (
          <div className="rounded-lg border border-sage-300 bg-sage-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sage-900 flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-sage-700" />
                <span>Pratinjau Foto Baru (Sebelum Disimpan)</span>
              </span>
              <Badge variant="outline" className="text-[10px] bg-white">
                {(stagedFile!.size / (1024 * 1024)).toFixed(2)} MB
              </Badge>
            </div>

            <div className="flex justify-center bg-black/5 rounded-md p-2">
              <img
                src={stagedPreview}
                alt="Pratinjau Foto Baru"
                className="max-h-[300px] w-auto max-w-full rounded object-contain"
              />
            </div>

            {/* Photo Metadata Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-medium text-charcoal block mb-1">
                  Kategori Dokumentasi
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as InventoryDocumentationCategory)}
                  className="w-full text-xs rounded-md border border-warm-300 bg-white px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sage-500"
                >
                  <option value="kondisi_awal">Kondisi Awal</option>
                  <option value="kelengkapan">Kelengkapan</option>
                  <option value="perpindahan">Perpindahan / Serah Terima</option>
                  <option value="kerusakan">Bukti Kerusakan</option>
                  <option value="pengembalian">Pengembalian</option>
                  <option value="kondisi_akhir">Kondisi Akhir</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-charcoal block mb-1">
                  Tipe Tampilan Foto
                </label>
                <select
                  value={photoType}
                  onChange={(e) => setPhotoType(e.target.value as InventoryPhotoType)}
                  className="w-full text-xs rounded-md border border-warm-300 bg-white px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sage-500"
                >
                  <option value="condition">Kondisi / Detail Fisik</option>
                  <option value="front">Tampak Depan</option>
                  <option value="back_side">Tampak Belakang</option>
                  <option value="spec_serial">Merek &amp; No. Seri</option>
                  <option value="accessories">Aksesoris &amp; Kelengkapan</option>
                  <option value="general">Dokumentasi Umum</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-charcoal block mb-1">
                  Kondisi Fisik Saat Difoto
                </label>
                <select
                  value={conditionSnapshot}
                  onChange={(e) => setConditionSnapshot(e.target.value as InventoryConditionSnapshot)}
                  className="w-full text-xs rounded-md border border-warm-300 bg-white px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sage-500"
                >
                  <option value="new">Baru</option>
                  <option value="good">Baik</option>
                  <option value="fair">Cukup (Ada bekas pakai)</option>
                  <option value="damaged">Rusak (Memerlukan tindakan)</option>
                  <option value="lost">Hilang (Catatan kehilangan)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-charcoal block mb-1">
                  Keterangan Foto (Opsional)
                </label>
                <Input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Contoh: Lecet halus di sisi kiri / Segel utuh"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={makePrimary}
                onChange={(e) => setMakePrimary(e.target.checked)}
                className="rounded border-warm-300 text-sage-600 focus:ring-sage-500"
              />
              <span className="text-xs text-charcoal font-medium">
                Jadikan sebagai Foto Utama barang di katalog
              </span>
            </label>

            {formError && (
              <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 p-2 rounded border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-sage-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetStaged}
                className="text-xs"
                disabled={uploadMutation.isPending}
              >
                Batal Pilihan
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => uploadMutation.mutate()}
                disabled={uploadMutation.isPending}
                className="text-xs gap-1.5 bg-sage-800 text-white hover:bg-sage-900"
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                <span>Simpan Foto</span>
              </Button>
            </div>
          </div>
        ) : activePhoto ? (
          <div className="space-y-3">
            {/* Active Photo Container */}
            <div className="relative rounded-lg overflow-hidden bg-warm-900/10 border border-warm-300 flex items-center justify-center min-h-[260px] max-h-[360px]">
              {signedUrls[activePhoto.file_id] ? (
                <img
                  src={signedUrls[activePhoto.file_id]}
                  alt={activePhoto.caption || item.name}
                  className="max-h-[360px] w-auto max-w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-charcoal-muted p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-sage-600" />
                  <span className="text-xs">Memuat foto otorisasi...</span>
                </div>
              )}

              {/* Badges on Top */}
              <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                {activePhoto.is_primary && (
                  <Badge className="bg-amber-500 text-white gap-1 text-[10px] shadow-sm">
                    <Star className="h-3 w-3 fill-current" />
                    <span>Foto Utama</span>
                  </Badge>
                )}
                <Badge variant="secondary" className="bg-white/90 text-charcoal text-[10px] shadow-sm">
                  {PHOTO_TYPE_LABELS[activePhoto.photo_type] || activePhoto.photo_type}
                </Badge>
                <Badge variant="outline" className="bg-white/90 text-charcoal text-[10px] shadow-sm">
                  {CATEGORY_LABELS[activePhoto.documentation_category] || activePhoto.documentation_category}
                </Badge>
              </div>

              {/* Condition Badge on Bottom Left */}
              {activePhoto.condition_snapshot && (
                <div className="absolute bottom-2.5 left-2.5">
                  <span className="inline-flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                    Kondisi: {CONDITION_LABELS[activePhoto.condition_snapshot] || activePhoto.condition_snapshot}
                  </span>
                </div>
              )}
            </div>

            {/* Photo Info Bar & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-md bg-warm-50 border border-warm-200">
              <div className="space-y-0.5 min-w-0">
                <p className="text-xs font-semibold text-charcoal truncate">
                  {activePhoto.caption || 'Tanpa keterangan khusus.'}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-charcoal-muted">
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{activePhoto.uploader_name || 'Anggota Tim'}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{activePhoto.documentation_date}</span>
                  </span>
                </div>
              </div>

              {canManage && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {!activePhoto.is_primary && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPrimaryMutation.mutate(activePhoto)}
                      disabled={setPrimaryMutation.isPending}
                      className="text-xs gap-1 h-7"
                    >
                      <Star className="h-3 w-3 text-amber-600" />
                      <span>Set Utama</span>
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Yakin ingin menghapus foto dokumentasi ini?')) {
                        deleteMutation.mutate(activePhoto)
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                    title="Hapus foto ini"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-warm-300 p-8 text-center space-y-2">
            <ImageIcon className="h-8 w-8 text-warm-400 mx-auto" />
            <p className="text-xs font-semibold text-charcoal">Belum Ada Foto Terlampir</p>
            <p className="text-[11px] text-charcoal-muted max-w-sm mx-auto">
              Dokumentasikan fisik barang, tanda kepemilikan, nomor seri, dan kondisi awal agar barang tidak tertukar selama masa KKN.
            </p>
          </div>
        )}

        {/* Thumbnail Strip */}
        {photos.length > 0 && !isAddingPhoto && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-charcoal-muted">Semua Foto ({photos.length})</p>
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5">
              {photos.map((photo) => {
                const isActive = (activePhoto?.id === photo.id)
                const url = signedUrls[photo.file_id]

                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setSelectedPhotoId(photo.id)}
                    className={`relative shrink-0 h-16 w-16 rounded-md overflow-hidden border-2 transition-all ${
                      isActive ? 'border-sage-700 ring-2 ring-sage-300' : 'border-warm-200 hover:border-warm-400 opacity-80 hover:opacity-100'
                    }`}
                  >
                    {url ? (
                      <img
                        src={url}
                        alt={photo.caption || 'Foto Barang'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-warm-100 text-[10px] text-charcoal-muted">
                        ...
                      </div>
                    )}
                    {photo.is_primary && (
                      <div className="absolute top-0.5 right-0.5 bg-amber-500 rounded-full p-0.5 text-white">
                        <Star className="h-2 w-2 fill-current" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Upload Buttons Trigger */}
        {!isAddingPhoto && canManage && (
          <div className="pt-2 border-t border-warm-200 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-charcoal-muted">
              Maksimal 5 MB per foto (JPG, PNG, WebP). Kompresi otomatis diterapkan.
            </p>

            <div className="flex items-center gap-2">
              {/* Hidden Inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  handleFileSelect(e.target.files?.[0])
                  e.target.value = ''
                  setIsAddingPhoto(true)
                }}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  handleFileSelect(e.target.files?.[0])
                  e.target.value = ''
                  setIsAddingPhoto(true)
                }}
                className="hidden"
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => cameraInputRef.current?.click()}
                className="text-xs gap-1.5"
              >
                <Camera className="h-3.5 w-3.5 text-sage-700" />
                <span>Ambil Foto (Kamera)</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => galleryInputRef.current?.click()}
                className="text-xs gap-1.5"
              >
                <ImageIcon className="h-3.5 w-3.5 text-sage-700" />
                <span>Pilih dari Galeri</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

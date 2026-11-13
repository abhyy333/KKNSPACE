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
import { formatBytes, getPrivateFileSignedUrl } from '@/services/storageApi'
import {
  createDocumentWithUpload,
  deleteDocumentItem,
  documentFormSchema,
  fetchDocuments,
  updateDocumentItem,
  type DocumentFormInput,
  type DocumentWithFile,
} from '@/services/documentsApi'
import type { PublicationStatus, WorkspaceMemberSummary } from '@/types/database'
import {
  AlertCircle,
  Download,
  Edit3,
  FileText,
  FolderOpen,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'

const PUB_META: Record<
  PublicationStatus,
  { label: string; variant: 'outline' | 'success' | 'secondary' }
> = {
  draft: { label: 'Internal (Draf)', variant: 'outline' },
  published: { label: 'Dipublikasikan', variant: 'success' },
  archived: { label: 'Diarsipkan', variant: 'secondary' },
}

export const DocumentsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user, membership, isSuperAdmin } = useAuth()

  const isLeadOrAdmin =
    isSuperAdmin ||
    membership?.role === 'ketua' ||
    membership?.role === 'sekretaris'

  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<DocumentWithFile | null>(null)
  const [deletingDoc, setDeletingDoc] = useState<DocumentWithFile | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    data: docs = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['workspace', 'documents'],
    queryFn: fetchDocuments,
    staleTime: 30_000,
  })

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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DocumentFormInput>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      title: '',
      description: '',
      publicationStatus: 'draft',
    },
  })

  useEffect(() => {
    if (!modalOpen) return
    if (editingDoc) {
      reset({
        title: editingDoc.title,
        description: editingDoc.description ?? '',
        publicationStatus: editingDoc.publication_status,
      })
    } else {
      reset({
        title: '',
        description: '',
        publicationStatus: 'draft',
      })
    }
  }, [modalOpen, editingDoc, reset])

  const createMutation = useMutation({
    mutationFn: ({ file, values }: { file: File; values: DocumentFormInput }) =>
      createDocumentWithUpload(file, values, isLeadOrAdmin),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workspace', 'documents'] })
      toast({
        title: 'Dokumen Diunggah',
        description: 'Berkas telah disimpan ke arsip privat kkn-private.',
        variant: 'success',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: DocumentFormInput }) =>
      updateDocumentItem(id, values, isLeadOrAdmin),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workspace', 'documents'] })
      toast({
        title: 'Dokumen Diperbarui',
        description: 'Metadata dokumen berhasil disimpan.',
        variant: 'success',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDocumentItem,
    onSuccess: async () => {
      setDeletingDoc(null)
      await queryClient.invalidateQueries({ queryKey: ['workspace', 'documents'] })
      toast({
        title: 'Dokumen Dihapus',
        description: 'Entri dokumen telah dihapus dari arsip.',
        variant: 'success',
      })
    },
    onError: (err) => {
      toast({
        title: 'Gagal Menghapus Dokumen',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        variant: 'error',
      })
    },
  })

  const canManageDoc = (doc: DocumentWithFile) => {
    if (isLeadOrAdmin) return true
    return Boolean(user?.id && (doc.uploaded_by === user.id || doc.assigned_to === user.id))
  }

  const handleCloseModal = () => {
    setFormError(null)
    setSelectedFile(null)
    setEditingDoc(null)
    setModalOpen(false)
  }

  const onSubmit = async (values: DocumentFormInput) => {
    setFormError(null)
    try {
      if (editingDoc) {
        await updateMutation.mutateAsync({ id: editingDoc.id, values })
      } else {
        if (!selectedFile) {
          setFormError('Pilih berkas dokumen terlebih dahulu.')
          return
        }
        await createMutation.mutateAsync({ file: selectedFile, values })
      }
      handleCloseModal()
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal menyimpan dokumen.'
      )
    }
  }

  const handleOpenFile = async (doc: DocumentWithFile, download: boolean) => {
    try {
      const signed = await getPrivateFileSignedUrl(doc.file_id, download)
      window.open(signed.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast({
        title: 'Gagal Membuka Berkas',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        variant: 'error',
      })
    }
  }

  const filteredDocs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return docs
    return docs.filter((d) =>
      `${d.title} ${d.description ?? ''} ${d.file?.original_name ?? ''}`
        .toLowerCase()
        .includes(q)
    )
  }, [docs, searchTerm])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal">
            Arsip Berkas &amp; Dokumen Posko
          </h1>
          <p className="text-xs text-charcoal-muted mt-1">
            Penyimpanan surat menyurat, proposal kegiatan, SK desa, dan berkas administrasi KKN.
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
              setEditingDoc(null)
              setModalOpen(true)
            }}
            className="text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Unggah Dokumen</span>
          </Button>
        </div>
      </div>

      <div className="relative w-full sm:w-80">
        <Search className="h-3.5 w-3.5 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari judul atau nama berkas..."
          className="pl-8 h-9 text-xs"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-3 w-40" />
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
                  Gagal Memuat Arsip Dokumen
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
      ) : filteredDocs.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-2.5">
            <FolderOpen className="h-8 w-8 text-warm-400 mx-auto" />
            <h3 className="text-sm font-semibold text-charcoal">
              {searchTerm
                ? 'Tidak ada dokumen yang cocok'
                : 'Belum ada berkas tersimpan di arsip'}
            </h3>
            <p className="text-xs text-charcoal-muted max-w-md mx-auto">
              Unggah surat pengantar, proposal, daftar hadir, atau dokumen operasional KKN ke penyimpanan privat yang aman.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredDocs.map((doc) => {
            const meta = PUB_META[doc.publication_status]
            const uploader = memberMap.get(doc.uploaded_by)
            const editable = canManageDoc(doc)

            return (
              <Card key={doc.id}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sage-100 text-sage-800">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-charcoal">
                          {doc.title}
                        </h3>
                        <Badge variant={meta.variant} className="text-[10px]">
                          {meta.label}
                        </Badge>
                      </div>
                      {doc.description && (
                        <p className="text-xs text-charcoal-muted">
                          {doc.description}
                        </p>
                      )}
                      <p className="text-[11px] text-charcoal-muted">
                        {doc.file?.original_name || 'Berkas'}{' '}
                        {doc.file ? `(${formatBytes(doc.file.file_size)})` : ''} · Diunggah oleh{' '}
                        {uploader?.full_name || 'Anggota'} pada{' '}
                        {new Date(doc.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenFile(doc, true)}
                      className="h-8 px-2.5 text-xs gap-1"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Unduh</span>
                    </Button>
                    {editable && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setFormError(null)
                            setEditingDoc(doc)
                            setModalOpen(true)
                          }}
                          className="h-8 px-2"
                          title="Edit"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingDoc(doc)}
                          className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                          title="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title={editingDoc ? 'Edit Metadata Dokumen' : 'Unggah Dokumen Baru'}
        description="Simpan berkas administrasi posko secara privat dengan kontrol akses berbasis peran."
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {!editingDoc && (
            <div className="space-y-1.5">
              <label htmlFor="doc-file" className="text-xs font-medium text-charcoal block">
                Berkas Dokumen (PDF, DOCX, XLSX, dll — Maks. 25 MB){' '}
                <span className="text-red-500">*</span>
              </label>
              <label
                htmlFor="doc-file"
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-warm-300 bg-warm-50/70 p-4 text-center cursor-pointer hover:border-sage-400"
              >
                <Upload className="h-5 w-5 text-sage-700 mb-1" />
                <span className="text-xs font-medium text-charcoal">
                  {selectedFile ? selectedFile.name : 'Klik untuk memilih berkas'}
                </span>
                {selectedFile && (
                  <span className="text-[11px] text-charcoal-muted mt-0.5">
                    {formatBytes(selectedFile.size)}
                  </span>
                )}
                <input
                  id="doc-file"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/*"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="doc-title" className="text-xs font-medium text-charcoal block">
              Judul Dokumen <span className="text-red-500">*</span>
            </label>
            <Input
              id="doc-title"
              placeholder="Misal: Proposal Kegiatan Seminar UMKM Desa"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-[11px] text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="doc-desc" className="text-xs font-medium text-charcoal block">
              Deskripsi / Nomor Surat
            </label>
            <textarea
              id="doc-desc"
              rows={2}
              placeholder="Keterangan singkat peruntukan dokumen..."
              className="flex w-full rounded-md border border-warm-300 bg-white px-3 py-2 text-xs text-charcoal"
              {...register('description')}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="doc-pub" className="text-xs font-medium text-charcoal block">
              Visibilitas Portal
            </label>
            <select
              id="doc-pub"
              disabled={!isLeadOrAdmin}
              className="flex h-9 w-full rounded-md border border-warm-300 bg-white px-3 py-1 text-xs text-charcoal disabled:bg-warm-100"
              {...register('publicationStatus')}
            >
              <option value="draft">Internal Tim (Draf)</option>
              <option value="published">Publikasikan</option>
              <option value="archived">Arsipkan</option>
            </select>
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
              <span>{editingDoc ? 'Simpan Perubahan' : 'Unggah & Simpan'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingDoc)}
        onClose={() => setDeletingDoc(null)}
        onConfirm={() => {
          if (deletingDoc) deleteMutation.mutate(deletingDoc.id)
        }}
        title="Hapus Dokumen dari Arsip?"
        description={
          deletingDoc
            ? `Dokumen "${deletingDoc.title}" akan dihapus dari daftar arsip.`
            : ''
        }
        confirmLabel="Hapus Dokumen"
        cancelLabel="Batal"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

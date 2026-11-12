import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Image as ImageIcon, Calendar, LockKeyhole } from 'lucide-react'
import { fetchPublishedMediaAssets } from '@/services/publicApi'
import { formatPublicDate } from '@/lib/publicFormat'
import {
  PublicCardGridSkeleton,
  PublicEmptyState,
  PublicSectionError,
} from '@/components/public/PublicQueryStates'

export const DocumentationPage: React.FC = () => {
  const {
    data: mediaList = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['public', 'media'],
    queryFn: () => fetchPublishedMediaAssets(40),
    staleTime: 60_000,
    retry: 2,
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="border-b border-warm-300 pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
          <ImageIcon className="h-3.5 w-3.5" />
          <span>Galeri Terpublikasi</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-charcoal mt-1">
          Dokumentasi Kegiatan Publik
        </h1>
        <p className="text-xs text-charcoal-muted mt-2 max-w-2xl">
          Ringkasan catatan dan arsip visual kegiatan pengabdian yang berstatus terpublikasi untuk masyarakat desa.
        </p>
      </div>

      {isLoading ? (
        <PublicCardGridSkeleton count={4} columnsClass="grid-cols-1 sm:grid-cols-2" />
      ) : isError ? (
        <PublicSectionError
          message={error instanceof Error ? error.message : 'Gagal memuat dokumentasi kegiatan.'}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : mediaList.length > 0 ? (
        <>
          <div className="rounded-lg border border-warm-300 bg-sage-50/60 px-4 py-3 flex items-start gap-2.5 text-xs text-charcoal-muted">
            <LockKeyhole className="h-4 w-4 text-sage-700 shrink-0 mt-0.5" />
            <span>
              Berkas media beresolusi penuh disimpan aman pada penyimpanan internal terproteksi; kartu berikut menampilkan metadata dokumentasi resmi yang sudah dipublikasikan.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {mediaList.map((item) => (
              <Card key={item.id} className="border-warm-300 bg-white overflow-hidden hover:shadow-card transition-shadow">
                <div className="h-44 bg-gradient-to-br from-sage-700 to-sage-900 flex flex-col justify-between p-6 text-white">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs bg-black/25 px-2.5 py-1 rounded-full text-warm-100">
                      <ImageIcon className="h-3 w-3" />
                      Dokumentasi Terpublikasi
                    </span>
                    <Badge variant="success">Publik</Badge>
                  </div>
                  <h2 className="text-lg font-serif font-semibold leading-snug line-clamp-2">
                    {item.title || 'Dokumentasi Kegiatan KKN'}
                  </h2>
                </div>

                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-charcoal-muted">
                    <Calendar className="h-3.5 w-3.5 text-sage-600" />
                    <span>{formatPublicDate(item.published_at || item.created_at, 'Tanggal menyusul')}</span>
                  </div>
                  <p className="text-xs text-charcoal-muted leading-relaxed">
                    {item.caption || 'Catatan kegiatan lapangan mahasiswa KKN Desa Pringgasela Selatan.'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <PublicEmptyState
          icon={<ImageIcon className="h-5 w-5" />}
          title="Belum ada dokumentasi kegiatan yang dipublikasikan"
          description="Galeri dokumentasi publik saat ini masih kosong. Media yang diterbitkan oleh Ketua atau Sekretaris KKN akan otomatis ditampilkan di halaman ini."
        />
      )}
    </div>
  )
}

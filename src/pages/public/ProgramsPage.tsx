import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Award, Calendar, Search, Info } from 'lucide-react'
import { fetchPublishedPrograms } from '@/services/publicApi'
import type { WorkProgramStatus } from '@/types/database'
import {
  formatPublicDateRange,
  PUBLIC_PROGRAM_STATUS_META,
} from '@/lib/publicFormat'
import {
  PublicCardGridSkeleton,
  PublicEmptyState,
  PublicSectionError,
} from '@/components/public/PublicQueryStates'

type StatusFilter = 'all' | WorkProgramStatus

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Semua Status' },
  { value: 'planned', label: 'Terencana' },
  { value: 'ongoing', label: 'Sedang Berjalan' },
  { value: 'completed', label: 'Selesai' },
]

export const ProgramsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const {
    data: programs = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['public', 'programs'],
    queryFn: () => fetchPublishedPrograms(50),
    staleTime: 60_000,
    retry: 2,
  })

  const filteredPrograms = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase()
    return programs.filter((program) => {
      const matchesStatus = statusFilter === 'all' || program.status === statusFilter
      const matchesQuery =
        !normalized ||
        program.title.toLowerCase().includes(normalized) ||
        (program.description ?? '').toLowerCase().includes(normalized)
      return matchesStatus && matchesQuery
    })
  }, [programs, searchQuery, statusFilter])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="border-b border-warm-300 pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
          <Award className="h-3.5 w-3.5" />
          <span>Transparansi Publik</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-charcoal mt-1">
          Daftar Program Kerja Pengabdian
        </h1>
        <p className="text-xs text-charcoal-muted mt-2 max-w-2xl">
          Daftar program kerja resmi yang telah dipublikasikan untuk masyarakat Desa Pringgasela Selatan.
        </p>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-xs">
          <Search className="h-3.5 w-3.5 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari program kerja..."
            aria-label="Cari program kerja"
            className="pl-9 bg-white border-warm-300 text-xs h-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatusFilter(option.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                statusFilter === option.value
                  ? 'bg-sage-700 text-white border-sage-700'
                  : 'bg-white text-charcoal border-warm-300 hover:bg-warm-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <PublicCardGridSkeleton count={4} columnsClass="grid-cols-1 md:grid-cols-2" />
      ) : isError ? (
        <PublicSectionError
          message={error instanceof Error ? error.message : 'Gagal memuat program kerja publik.'}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : filteredPrograms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPrograms.map((program) => {
            const statusMeta = PUBLIC_PROGRAM_STATUS_META[program.status]
            return (
              <Card key={program.id} className="border-warm-300 bg-white hover:shadow-card transition-shadow">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[11px] font-semibold text-sage-700 bg-sage-100 px-2.5 py-1 rounded">
                      Program Terpublikasi
                    </span>
                    <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                  </div>

                  <h2 className="text-base font-semibold text-charcoal leading-snug">
                    {program.title}
                  </h2>

                  <p className="text-xs text-charcoal-muted leading-relaxed">
                    {program.description || 'Deskripsi lengkap program akan segera ditambahkan oleh tim KKN.'}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-warm-200 text-xs text-charcoal-muted">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-sage-600 shrink-0" />
                      <span>{formatPublicDateRange(program.start_date, program.end_date)}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] text-sage-700">
                      <Info className="h-3 w-3" />
                      Publik
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <PublicEmptyState
          icon={<Award className="h-5 w-5" />}
          title={
            programs.length === 0
              ? 'Belum ada program kerja yang dipublikasikan'
              : 'Tidak ada program yang sesuai filter'
          }
          description={
            programs.length === 0
              ? 'Daftar program kerja publik masih kosong. Program akan tampil setelah Ketua atau Sekretaris KKN menerbitkannya dari Workspace.'
              : 'Coba ubah kata kunci pencarian atau pilih status lain untuk melihat program terpublikasi.'
          }
        />
      )}
    </div>
  )
}

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2, GraduationCap, Users, Code2, ArrowRight } from 'lucide-react'
import {
  PublicCardGridSkeleton,
  PublicEmptyState,
  PublicSectionError,
} from '@/components/public/PublicQueryStates'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ACADEMIC_STATUS_LABELS } from '@/lib/directory'
import { BrandLogo } from '@/components/brand/BrandLogo'
import {
  fetchPublicTeamDirectory,
  fetchPublicTeamPhotoUrl,
  type PublicTeamMember,
} from '@/services/publicApi'
import { SeoHead } from '@/components/seo/SeoHead'
import { SEO_DICTIONARY, generateBreadcrumbSchema } from '@/config/seo'
import { useLocale } from '@/i18n'

function getAvatarInitial(fullName: string): string {
  const initial = fullName.trim().charAt(0).toUpperCase()
  return initial || 'K'
}

function getRoleBadgeVariant(role: PublicTeamMember['role']): 'sand' | 'default' | 'secondary' {
  if (role === 'dpl') return 'sand'
  if (role === 'ketua') return 'default'
  return 'secondary'
}

const PublicMemberAvatar: React.FC<{ member: PublicTeamMember }> = ({ member }) => {
  const [imageError, setImageError] = useState(false)

  const { data: photoUrl } = useQuery({
    queryKey: ['public', 'team-photo', member.id],
    queryFn: () => fetchPublicTeamPhotoUrl(member.id),
    enabled: member.has_photo && !imageError,
    staleTime: 240_000,
    retry: 1,
  })

  if (member.has_photo && photoUrl && !imageError) {
    return (
      <img
        src={photoUrl}
        alt={`Foto profil ${member.full_name}`}
        onError={() => setImageError(true)}
        className="h-12 w-12 shrink-0 rounded-full object-cover border border-sage-200 bg-sage-50"
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-800 font-serif font-bold text-lg border border-sage-200"
    >
      {getAvatarInitial(member.full_name)}
    </div>
  )
}

export const TeamPage: React.FC = () => {
  const { locale } = useLocale()
  const seo = SEO_DICTIONARY[locale].team
  const {
    data: members = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['public', 'team-directory'],
    queryFn: fetchPublicTeamDirectory,
    staleTime: 60_000,
    retry: 2,
  })

  const breadcrumbs = [
    { name: 'Beranda', url: '/' },
    { name: 'Tim KKN', url: '/tim' },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <SeoHead
        title={seo.title}
        description={seo.description}
        canonicalPath="/tim"
        keywords={seo.keywords}
        structuredData={[generateBreadcrumbSchema(breadcrumbs)]}
      />
      <div className="border-b border-warm-300 pb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <BrandLogo size="lg" className="h-14 w-14 shrink-0 drop-shadow-xs hidden sm:block mt-0.5" />
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
              <Users className="h-3.5 w-3.5" />
              <span>KKN Pringgasela Selatan 2026–2027 · Universitas Mataram</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-charcoal mt-1">
              Tim Pengabdian Mahasiswa KKN
            </h1>
            <p className="text-xs text-charcoal-muted mt-1.5 max-w-2xl">
              Kolaborasi multidisiplin 10 mahasiswa Universitas Mataram dan Dosen Pembimbing Lapangan untuk memajukan Desa Pringgasela Selatan.
            </p>
          </div>
        </div>
        {!isLoading && !isError && members.length > 0 && (
          <div className="text-xs font-medium text-sage-800 bg-sage-100 border border-sage-200 rounded-full px-3 py-1 self-start sm:self-auto shrink-0">
            {members.length} Anggota Aktif
          </div>
        )}
      </div>

      {isLoading ? (
        <PublicCardGridSkeleton
          count={6}
          columnsClass="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        />
      ) : isError ? (
        <PublicSectionError
          title="Direktori tim belum dapat dimuat"
          message={
            error instanceof Error
              ? error.message
              : 'Terjadi kendala saat mengambil daftar resmi anggota tim KKN.'
          }
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : members.length === 0 ? (
        <PublicEmptyState
          icon={<Users className="h-5 w-5" />}
          title="Belum ada anggota tim yang ditampilkan"
          description="Daftar resmi anggota aktif tim KKN akan muncul di sini setelah tersedia di direktori kelompok."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => (
            <Card key={member.id} className="border-warm-300 bg-white hover:shadow-card transition-shadow">
              <CardContent className="p-5 flex items-start gap-4">
                <PublicMemberAvatar member={member} />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {member.position_label}
                    </Badge>
                    {member.full_name.toLowerCase().includes('abdul habir') && (
                      <Badge variant="outline" className="border-sage-400 text-sage-800 bg-sage-50 text-[10px]">
                        Developer
                      </Badge>
                    )}
                  </div>
                  {member.full_name.toLowerCase().includes('abdul habir') ? (
                    <Link
                      to="/developer/abdul-habir-al-majdi"
                      className="group block pt-1 text-sm font-semibold text-sage-800 hover:text-sage-900 transition-colors"
                      title="Lihat Profil Developer Abdul Habir Al Majdi"
                    >
                      <span>{member.full_name}</span>
                      <span className="block text-[11px] font-normal text-sage-600 group-hover:underline">
                        Lihat Profil Developer →
                      </span>
                    </Link>
                  ) : (
                    <h3 className="text-sm font-semibold text-charcoal pt-1 break-words">
                      {member.full_name}
                    </h3>
                  )}
                  <div className="flex items-start gap-1.5 text-xs text-charcoal-muted pt-0.5">
                    <Building2 className="h-3.5 w-3.5 text-sage-600 shrink-0 mt-0.5" />
                    <span className="break-words">
                      {member.university || 'Universitas Mataram'}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5 text-xs text-charcoal-muted">
                    <GraduationCap className="h-3.5 w-3.5 text-sage-600 shrink-0 mt-0.5" />
                    <span className="break-words">{member.study_program}</span>
                  </div>
                  <div className="text-[11px] text-charcoal-muted">
                    {ACADEMIC_STATUS_LABELS[member.academic_status]}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Project Authorship Notice */}
      <div className="rounded-2xl border border-warm-200 bg-white/80 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage-100 text-sage-800 border border-sage-200">
            <Code2 className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-charcoal">
              Pengembangan Sistem &amp; Digital Workspace
            </h4>
            <p className="text-[11px] text-charcoal-muted">
              Platform KKN SPACE dirancang dan dikembangkan oleh <strong>Abdul Habir Al Majdi</strong> (Teknik Elektro UNRAM).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/projects/kkn-space"
            className="inline-flex items-center gap-1 text-xs font-medium text-sage-700 hover:text-sage-800 underline underline-offset-4"
          >
            <span>Detail Project</span>
          </Link>
          <span className="text-warm-300">·</span>
          <Link
            to="/developer/abdul-habir-al-majdi"
            className="inline-flex items-center gap-1 text-xs font-semibold text-sage-700 hover:text-sage-800 underline underline-offset-4"
          >
            <span>Profil Developer</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}

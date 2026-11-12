import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, GraduationCap, Users } from 'lucide-react'
import {
  PublicCardGridSkeleton,
  PublicEmptyState,
  PublicSectionError,
} from '@/components/public/PublicQueryStates'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ACADEMIC_STATUS_LABELS } from '@/lib/directory'
import {
  fetchPublicTeamDirectory,
  fetchPublicTeamPhotoUrl,
  type PublicTeamMember,
} from '@/services/publicApi'

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="border-b border-warm-300 pb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
            <Users className="h-3.5 w-3.5" />
            <span>Struktur Kelompok</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-charcoal mt-1">
            Tim Pengabdian Mahasiswa KKN 2026
          </h1>
          <p className="text-xs text-charcoal-muted mt-2 max-w-2xl">
            Kolaborasi multidisiplin mahasiswa universitas dan dosen pembimbing lapangan untuk memajukan Desa Pringgasela Selatan.
          </p>
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
                    {member.division && (
                      <Badge variant="outline" className="text-[11px] text-charcoal-muted">
                        Div. {member.division}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-charcoal pt-1 break-words">
                    {member.full_name}
                  </h3>
                  <div className="flex items-start gap-1.5 text-xs text-charcoal-muted pt-0.5">
                    <Building2 className="h-3.5 w-3.5 text-sage-600 shrink-0 mt-0.5" />
                    <span className={member.university ? 'break-words' : 'break-words italic text-charcoal-muted/80'}>
                      {member.university ?? 'Universitas belum diisi'}
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
    </div>
  )
}

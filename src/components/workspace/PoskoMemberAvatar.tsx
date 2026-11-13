import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPublicTeamPhotoUrl } from '@/services/publicApi'
import type { KknTeamDirectoryMember } from '@/types/database'

interface PoskoMemberAvatarProps {
  member: Pick<KknTeamDirectoryMember, 'id' | 'full_name' | 'photo_file_id'>
  sizeClass?: string
  textClass?: string
}

export const PoskoMemberAvatar: React.FC<PoskoMemberAvatarProps> = ({
  member,
  sizeClass = 'h-7 w-7',
  textClass = 'text-[11px]',
}) => {
  const [imageError, setImageError] = useState(false)

  const { data: photoUrl } = useQuery({
    queryKey: ['workspace', 'team-photo', member.id],
    queryFn: () => fetchPublicTeamPhotoUrl(member.id),
    enabled: Boolean(member.photo_file_id) && !imageError,
    staleTime: 240_000,
    retry: 1,
  })

  if (member.photo_file_id && photoUrl && !imageError) {
    return (
      <img
        src={photoUrl}
        alt={`Foto profil ${member.full_name}`}
        onError={() => setImageError(true)}
        className={`${sizeClass} shrink-0 rounded-full object-cover border border-sage-200 bg-sage-50`}
      />
    )
  }

  const initial = member.full_name?.trim().charAt(0).toUpperCase() || 'K'

  return (
    <div
      aria-hidden="true"
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-800 ${textClass} font-semibold border border-sage-200`}
    >
      {initial}
    </div>
  )
}

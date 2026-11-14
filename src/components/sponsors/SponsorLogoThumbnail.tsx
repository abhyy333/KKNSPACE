import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPrivateFileSignedUrl } from '@/services/storageApi'
import { getPublicSponsorLogoUrl } from '@/services/sponsorsApi'
import { Loader2, Building2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface SponsorLogoThumbnailProps {
  fileId: string | null
  sponsorId?: string
  alt: string
  isPublic?: boolean
  className?: string
  containerClassName?: string
}

export const SponsorLogoThumbnail: React.FC<SponsorLogoThumbnailProps> = ({
  fileId,
  sponsorId,
  alt,
  isPublic = false,
  className = 'w-full h-full object-contain',
  containerClassName = 'w-24 h-16 bg-white rounded-lg border border-warm-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs',
}) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['sponsor-logo', fileId, sponsorId, isPublic],
    queryFn: async () => {
      if (!fileId && !sponsorId) return null
      if (isPublic) {
        return getPublicSponsorLogoUrl(sponsorId || '', fileId || undefined)
      }
      if (fileId) {
        const res = await getPrivateFileSignedUrl(fileId, false)
        return res.signedUrl
      }
      return null
    },
    enabled: Boolean(fileId || sponsorId),
    staleTime: 1000 * 60 * 5, // 5 mins cache
    retry: 1,
  })

  if (!fileId && !sponsorId) {
    return (
      <div className={containerClassName}>
        <Building2 className="h-6 w-6 text-warm-400" />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={containerClassName}>
        <Skeleton className="w-full h-full absolute inset-0" />
        <Loader2 className="h-4 w-4 text-sage-600 animate-spin relative z-10" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className={containerClassName}>
        <div className="flex flex-col items-center justify-center text-center p-1">
          <Building2 className="h-5 w-5 text-charcoal-muted/60" />
          <span className="text-[9px] text-charcoal-muted font-medium truncate max-w-[70px]">{alt}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={containerClassName}>
      <img
        src={data}
        alt={alt}
        className={className}
        loading="lazy"
        decoding="async"
        onError={(e) => {
          // If image fails to render, show fallback building icon
          const target = e.currentTarget
          target.style.display = 'none'
          if (target.parentElement) {
            target.parentElement.innerHTML = `<span class="text-[10px] font-semibold text-charcoal truncate px-1">${alt}</span>`
          }
        }}
      />
    </div>
  )
}

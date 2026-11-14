import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Image as ImageIcon, Loader2 } from 'lucide-react'
import { fetchPublicDocumentationPhotoUrl } from '@/services/publicApi'

interface Props {
  fileId: string | null
  assetId?: string
  alt?: string
  className?: string
  fallbackClassName?: string
  /** If true, fill parent container. Otherwise use aspect-ratio */
  fill?: boolean
  /** Aspect ratio class e.g. 'aspect-[4/3]'. Only used when fill=false */
  aspectClass?: string
}

/**
 * Renders a documentation photo for the public portal.
 * Fetches a short-lived signed URL via the public-documentation-photo Edge Function.
 * Caches for 4 minutes to stay within the 5-minute expiry.
 */
export const PublicDocPhoto: React.FC<Props> = ({
  fileId,
  assetId,
  alt = 'Foto dokumentasi kegiatan',
  className = '',
  fallbackClassName = '',
  aspectClass = 'aspect-[4/3]',
}) => {
  const [imgError, setImgError] = useState(false)

  const { data: signedUrl, isLoading } = useQuery({
    queryKey: ['public-doc-photo', fileId, assetId],
    queryFn: () => (fileId ? fetchPublicDocumentationPhotoUrl(fileId, assetId) : Promise.resolve(null)),
    enabled: !!fileId,
    staleTime: 240_000, // 4 min — well within 5-min signed URL lifetime
    retry: 1,
  })

  const hasPhoto = signedUrl && !imgError

  return (
    <div className={`relative overflow-hidden bg-warm-200/70 ${aspectClass} ${className}`}>
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-sage-500" />
        </div>
      ) : hasPhoto ? (
        <img
          src={signedUrl}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 text-charcoal-muted ${fallbackClassName}`}>
          <ImageIcon className="h-8 w-8 opacity-40" />
          <span className="text-xs opacity-60">Foto tidak tersedia</span>
        </div>
      )}
    </div>
  )
}

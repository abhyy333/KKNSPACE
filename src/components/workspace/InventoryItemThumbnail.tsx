import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getInventoryPhotoSignedUrl } from '@/services/inventoryApi'
import {
  Armchair,
  BookOpen,
  Camera,
  Hammer,
  Laptop,
  Package,
  Printer,
  Sparkles,
  Tv,
  Utensils,
} from 'lucide-react'

interface InventoryItemThumbnailProps {
  photoFileId?: string | null
  category?: string
  name: string
  sizeClass?: string
  iconSizeClass?: string
  roundedClass?: string
  className?: string
  onClick?: () => void
}

function getCategoryIcon(category = ''): React.ReactElement {
  const norm = category.toLowerCase().trim()
  if (norm.includes('dapur') || norm.includes('masak') || norm.includes('konsumsi') || norm.includes('makan')) {
    return <Utensils className="h-full w-full" />
  }
  if (norm.includes('elektronik') || norm.includes('gadget') || norm.includes('it') || norm.includes('laptop')) {
    return <Laptop className="h-full w-full" />
  }
  if (norm.includes('layar') || norm.includes('proyektor') || norm.includes('tv') || norm.includes('monitor')) {
    return <Tv className="h-full w-full" />
  }
  if (norm.includes('kamera') || norm.includes('dokumentasi') || norm.includes('foto')) {
    return <Camera className="h-full w-full" />
  }
  if (norm.includes('cetak') || norm.includes('printer')) {
    return <Printer className="h-full w-full" />
  }
  if (norm.includes('atk') || norm.includes('tulis') || norm.includes('kertas') || norm.includes('buku')) {
    return <BookOpen className="h-full w-full" />
  }
  if (norm.includes('mebel') || norm.includes('kursi') || norm.includes('meja') || norm.includes('kasur')) {
    return <Armchair className="h-full w-full" />
  }
  if (norm.includes('kebersihan') || norm.includes('sapu') || norm.includes('alat cuci')) {
    return <Sparkles className="h-full w-full" />
  }
  if (norm.includes('perkakas') || norm.includes('alat') || norm.includes('tukang')) {
    return <Hammer className="h-full w-full" />
  }
  return <Package className="h-full w-full" />
}

export const InventoryItemThumbnail: React.FC<InventoryItemThumbnailProps> = ({
  photoFileId,
  category = '',
  name,
  sizeClass = 'h-10 w-10',
  iconSizeClass = 'h-5 w-5',
  roundedClass = 'rounded-md',
  className = '',
  onClick,
}) => {
  const [imageError, setImageError] = useState(false)

  const { data: photoUrl } = useQuery({
    queryKey: ['workspace', 'inventory-photo-url', photoFileId],
    queryFn: () => (photoFileId ? getInventoryPhotoSignedUrl(photoFileId) : null),
    enabled: Boolean(photoFileId) && !imageError,
    staleTime: 240_000,
    retry: 1,
  })

  if (photoFileId && photoUrl && !imageError) {
    return (
      <img
        src={photoUrl}
        alt={`Foto ${name}`}
        onError={() => setImageError(true)}
        onClick={onClick}
        className={`${sizeClass} shrink-0 ${roundedClass} object-cover border border-warm-200 bg-warm-50 shadow-xs ${className}`}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      onClick={onClick}
      className={`${sizeClass} shrink-0 ${roundedClass} flex items-center justify-center bg-warm-100 text-sage-800 border border-warm-200/80 shadow-xs ${className}`}
      title={`Kategori: ${category || 'Umum'}`}
    >
      <div className={iconSizeClass}>{getCategoryIcon(category)}</div>
    </div>
  )
}

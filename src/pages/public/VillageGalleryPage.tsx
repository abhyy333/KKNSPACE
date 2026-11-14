import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Image as ImageIcon,
  MapPin,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  Maximize2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { VillageSubnav } from '@/components/village/VillageSubnav'
import { fetchVillageGalleryItems } from '@/services/villageApi'
import type { VillageGalleryItem } from '@/types/village'

export const VillageGalleryPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const { data: galleryItems = [] } = useQuery({
    queryKey: ['village-gallery', selectedCategory],
    queryFn: () => fetchVillageGalleryItems(selectedCategory),
  })

  const categories = [
    { id: 'all', label: 'Semua Koleksi' },
    { id: 'kerajinan', label: 'Tenun & Kerajinan' },
    { id: 'budaya', label: 'Adat & Budaya' },
    { id: 'festival', label: 'Festival Dongdala' },
    { id: 'alam', label: 'Alam & Air Terjun' },
    { id: 'masyarakat', label: 'Kehidupan Masyarakat' },
  ]

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return
      if (e.key === 'Escape') setLightboxIndex(null)
      if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) =>
          prev !== null ? (prev + 1) % galleryItems.length : null
        )
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) =>
          prev !== null ? (prev - 1 + galleryItems.length) % galleryItems.length : null
        )
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxIndex, galleryItems.length])

  const activePhoto: VillageGalleryItem | null =
    lightboxIndex !== null ? galleryItems[lightboxIndex] : null

  return (
    <div className="min-h-screen bg-warm-100/60 pb-20">
      <VillageSubnav />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-10">
        {/* Header Section */}
        <div className="border-b border-warm-300 pb-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
            <ImageIcon className="h-4 w-4" />
            <span>Dokumentasi Visual Terverifikasi</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-charcoal">
            Galeri Fotografi Desa Pringgasela Selatan
          </h1>
          <p className="text-sm text-charcoal-muted max-w-3xl leading-relaxed">
            Kumpulan potret otentik lanskap, perajin tenun gedogan, kehangatan masyarakat, dan
            perhelatan budaya dari arsip resmi Pemerintah Desa dan media nasional terpercaya.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                selectedCategory === cat.id
                  ? 'bg-sage-800 text-white shadow-sm ring-1 ring-sage-900/20'
                  : 'bg-white text-charcoal-muted border border-warm-300 hover:border-sage-400 hover:text-charcoal'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleryItems.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => setLightboxIndex(idx)}
              className="group cursor-pointer rounded-2xl overflow-hidden bg-white border border-warm-300 shadow-sm hover:shadow-xl hover:border-sage-500 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-warm-200">
                <img
                  src={item.image_url}
                  alt={item.alt_text}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <span className="text-white text-xs font-medium flex items-center gap-1.5">
                    <Maximize2 className="h-3.5 w-3.5" />
                    <span>Perbesar Foto</span>
                  </span>
                </div>
                <div className="absolute top-3 left-3">
                  <Badge className="bg-charcoal/80 text-white backdrop-blur-sm border-none text-[9px] uppercase font-serif">
                    {item.category}
                  </Badge>
                </div>
              </div>

              <div className="p-4 space-y-2">
                <h3 className="font-serif font-bold text-charcoal text-sm group-hover:text-sage-800 transition-colors line-clamp-1">
                  {item.title}
                </h3>
                <p className="text-xs text-charcoal-muted line-clamp-2 leading-relaxed">
                  {item.caption}
                </p>
                <div className="pt-2 border-t border-warm-100 flex items-center justify-between text-[10px] text-charcoal-muted">
                  <span className="flex items-center gap-1 truncate max-w-[150px]">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{item.location}</span>
                  </span>
                  <span>Tahun {item.year_taken}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Ethical Photography Notice */}
        <div className="p-4 rounded-xl bg-warm-50 border border-warm-200 text-xs text-charcoal-muted flex items-start gap-2.5">
          <Info className="h-4 w-4 text-sage-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-charcoal">Jaminan Keaslian Visual: </span>
            Seluruh foto yang ditampilkan merupakan dokumentasi asli Desa Pringgasela Selatan dari
            kegiatan lapangan, arsip resmi Kemendikbudristek RI, Kompas.id, Massmedia.id, dan Kick
            News. Tidak ada penggunaan foto stok generik atau hasil generasi AI.
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {activePhoto && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 text-white animate-in fade-in duration-200"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Top Bar */}
          <div
            className="flex items-center justify-between z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-sage-300">
                Foto {lightboxIndex + 1} dari {galleryItems.length}
              </span>
              <h4 className="text-sm font-serif font-bold text-white max-w-xl truncate">
                {activePhoto.title}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Center Image with Prev / Next Navigation */}
          <div
            className="relative flex-1 flex items-center justify-center my-2 max-h-[75vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() =>
                setLightboxIndex(
                  (lightboxIndex - 1 + galleryItems.length) % galleryItems.length
                )
              }
              className="absolute left-2 sm:left-4 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 border border-white/20 flex items-center justify-center text-white transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <img
              src={activePhoto.image_url}
              alt={activePhoto.alt_text}
              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
            />

            <button
              type="button"
              onClick={() =>
                setLightboxIndex((lightboxIndex + 1) % galleryItems.length)
              }
              className="absolute right-2 sm:right-4 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 border border-white/20 flex items-center justify-center text-white transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Bottom Bar: Metadata & Credits */}
          <div
            className="bg-black/60 backdrop-blur-md rounded-xl p-4 border border-white/10 max-w-3xl mx-auto w-full text-xs space-y-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-warm-100 font-sans leading-relaxed">
              {activePhoto.caption}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-[11px] text-warm-300">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-sage-400" />
                <span>{activePhoto.location}</span>
              </span>
              <span>Kredit Foto: {activePhoto.credit}</span>
              <span>Tahun {activePhoto.year_taken}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

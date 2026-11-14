import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPublicSponsors } from '@/services/sponsorsApi'
import { SponsorLogoThumbnail } from '@/components/sponsors/SponsorLogoThumbnail'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  SPONSOR_CATEGORY_LABELS,
  SPONSOR_CONTRIBUTION_LABELS,
  type SponsorCategory,
  type PublicSponsor,
} from '@/types/sponsor'
import {
  Handshake,
  ExternalLink,
  Globe,
  Share2,
  Sparkles,
  Award,
  Radio,
  Package,
  Layers,
} from 'lucide-react'

const CATEGORY_SECTION_META: Record<
  SponsorCategory,
  { label: string; description: string; icon: React.ComponentType<{ className?: string }> }
> = {
  sponsor_utama: {
    label: 'Sponsor Utama',
    description: 'Mitra strategis utama pendukung program unggulan KKN SPACE.',
    icon: Award,
  },
  sponsor_pendukung: {
    label: 'Sponsor Pendukung',
    description: 'Pihak yang memberikan kontribusi penting dalam operasional dan program kerja.',
    icon: Sparkles,
  },
  sponsor_produk: {
    label: 'Sponsor Produk',
    description: 'Dukungan barang, konsumsi, dan peralatan penunjang pengabdian masyarakat.',
    icon: Package,
  },
  media_partner: {
    label: 'Media Partner',
    description: 'Mitra publikasi dan diseminasi informasi program ke masyarakat luas.',
    icon: Radio,
  },
  mitra_kolaborasi: {
    label: 'Mitra Kolaborasi',
    description: 'Komunitas, UMKM, dan institusi pendukung keberlanjutan inovasi desa.',
    icon: Layers,
  },
}

const CATEGORY_ORDER: SponsorCategory[] = [
  'sponsor_utama',
  'sponsor_pendukung',
  'sponsor_produk',
  'media_partner',
  'mitra_kolaborasi',
]

export const SponsorsPage: React.FC = () => {
  const { data: sponsors = [], isLoading } = useQuery({
    queryKey: ['public-sponsors'],
    queryFn: fetchPublicSponsors,
    staleTime: 1000 * 60 * 5,
  })

  // Group sponsors by category
  const groupedSponsors = React.useMemo(() => {
    const map = new Map<SponsorCategory, PublicSponsor[]>()
    for (const cat of CATEGORY_ORDER) {
      map.set(cat, [])
    }
    for (const s of sponsors) {
      const list = map.get(s.category) || []
      list.push(s)
      map.set(s.category, list)
    }
    return map
  }, [sponsors])

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-charcoal pb-24">
      {/* ========================================================= */}
      {/* 1. HERO SECTION: Clean Editorial Depth                    */}
      {/* ========================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#1C3B29] to-[#142B1E] text-white py-16 sm:py-20 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#FAF8F5_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="relative mx-auto max-w-5xl text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2C5E3D]/90 border border-emerald-400/30 text-emerald-100 text-xs font-semibold tracking-wide uppercase shadow-xs">
            <Handshake className="h-3.5 w-3.5 text-emerald-300" />
            <span>Kemitraan & Apresiasi</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold text-white tracking-tight leading-[1.15]">
            Sponsors & Partners
          </h1>

          <p className="text-sm sm:text-lg text-emerald-100/90 max-w-2xl mx-auto font-light leading-relaxed">
            A collective effort for a meaningful community impact.
          </p>

          <p className="text-xs sm:text-sm text-emerald-200/70 max-w-xl mx-auto pt-1">
            Terima kasih atas kepercayaan dan dukungan seluruh pihak dalam menyukseskan program pengabdian masyarakat di Desa Pringgasela Selatan.
          </p>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. MAIN DIRECTORY SHOWCASE                                */}
      {/* ========================================================= */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-12 space-y-12">
        {isLoading ? (
          <div className="space-y-8">
            <Skeleton className="h-10 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        ) : sponsors.length === 0 ? (
          /* Empty State */
          <div className="rounded-3xl border border-warm-300 bg-white p-8 sm:p-16 text-center shadow-subtle space-y-4 max-w-2xl mx-auto">
            <div className="w-14 h-14 rounded-full bg-forest/10 text-forest flex items-center justify-center mx-auto mb-2">
              <Handshake className="h-7 w-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-charcoal">
              Perjalanan pengabdian ini terbuka untuk kolaborasi.
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-muted leading-relaxed">
              Terima kasih kepada seluruh pihak yang nantinya menjadi bagian dari kegiatan KKN kami. Kami menyambut kerja sama dengan instansi, perusahaan, media, dan komunitas untuk keberdayaan desa.
            </p>
          </div>
        ) : (
          /* Categorized Showcase */
          CATEGORY_ORDER.map((catKey) => {
            const list = groupedSponsors.get(catKey) || []
            if (list.length === 0) return null // Hide category if empty

            const meta = CATEGORY_SECTION_META[catKey]
            const CategoryIcon = meta.icon

            return (
              <section key={catKey} aria-labelledby={`cat-${catKey}`} className="space-y-6">
                {/* Category Header */}
                <div className="border-b border-warm-300 pb-3 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-forest">
                      <CategoryIcon className="h-5 w-5" />
                      <h2 id={`cat-${catKey}`} className="text-xl sm:text-2xl font-serif font-bold text-charcoal tracking-tight">
                        {meta.label}
                      </h2>
                    </div>
                    <p className="text-xs text-charcoal-muted">{meta.description}</p>
                  </div>
                  <span className="text-[11px] font-mono text-charcoal-muted shrink-0">
                    {list.length} Mitra Terdaftar
                  </span>
                </div>

                {/* Sponsor Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {list.map((sponsor) => (
                    <article
                      key={sponsor.id}
                      className="group rounded-2xl border border-warm-200 bg-white p-5 shadow-2xs hover:shadow-md hover:border-forest/30 transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        {/* Top: Logo & Name */}
                        <div className="flex items-start gap-4">
                          <SponsorLogoThumbnail
                            fileId={sponsor.logo_file_id}
                            sponsorId={sponsor.id}
                            alt={sponsor.name}
                            isPublic={true}
                            containerClassName="w-24 h-16 bg-white rounded-xl border border-warm-200 overflow-hidden flex items-center justify-center shrink-0 p-1.5 shadow-2xs group-hover:border-forest/30 transition-colors"
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <h3 className="text-sm font-serif font-bold text-charcoal group-hover:text-forest transition-colors truncate" title={sponsor.name}>
                              {sponsor.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge className="bg-forest/10 text-forest border-forest/20 text-[10px] font-medium py-0">
                                {SPONSOR_CATEGORY_LABELS[sponsor.category]}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] text-charcoal-muted border-warm-300 py-0">
                                {SPONSOR_CONTRIBUTION_LABELS[sponsor.contribution_type]}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        {sponsor.description && (
                          <p className="text-xs text-charcoal-muted leading-relaxed line-clamp-3">
                            {sponsor.description}
                          </p>
                        )}

                        {/* Contribution note */}
                        {sponsor.contribution_description && (
                          <div className="rounded-xl bg-warm-50 p-2.5 border border-warm-200/70 text-xs">
                            <span className="font-semibold text-charcoal">Bentuk Dukungan: </span>
                            <span className="text-charcoal-muted">{sponsor.contribution_description}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer Actions / Links */}
                      {(sponsor.website_url || sponsor.social_media_url) && (
                        <div className="border-t border-warm-200 pt-3 flex items-center gap-3 text-xs">
                          {sponsor.website_url && (
                            <a
                              href={sponsor.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 font-medium text-forest hover:text-forest/80 hover:underline"
                            >
                              <Globe className="h-3.5 w-3.5" />
                              <span>Website Resmi</span>
                              <ExternalLink className="h-3 w-3 opacity-60" />
                            </a>
                          )}

                          {sponsor.social_media_url && (
                            <a
                              href={sponsor.social_media_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 font-medium text-forest hover:text-forest/80 hover:underline"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                              <span>Media Sosial</span>
                              <ExternalLink className="h-3 w-3 opacity-60" />
                            </a>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )
          })
        )}
      </main>
    </div>
  )
}

import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchPublicSponsors } from '@/services/sponsorsApi'
import { SponsorLogoThumbnail } from '@/components/sponsors/SponsorLogoThumbnail'
import {
  SPONSOR_CATEGORY_LABELS,
  SPONSOR_CONTRIBUTION_LABELS,
  type PublicSponsor,
} from '@/types/sponsor'
import { ArrowRight, Globe, ExternalLink, Sparkles } from 'lucide-react'

export const HomeSponsorsSection: React.FC = () => {
  const { data: sponsors = [], isLoading } = useQuery({
    queryKey: ['public-sponsors'],
    queryFn: fetchPublicSponsors,
    staleTime: 1000 * 60 * 5,
  })

  // Determine featured sponsor (highest priority category, or first entry)
  const { featuredSponsor, companionSponsors } = React.useMemo(() => {
    if (sponsors.length === 0) {
      return { featuredSponsor: null, companionSponsors: [] }
    }
    // Prioritize sponsor_utama if available, otherwise first published sponsor
    const utama = sponsors.find((s) => s.category === 'sponsor_utama')
    const featured = utama || sponsors[0]
    const companions = sponsors.filter((s) => s.id !== featured.id)
    return { featuredSponsor: featured, companionSponsors: companions }
  }, [sponsors])

  return (
    <section aria-labelledby="sponsors-heading" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Editorial Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-warm-300 pb-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase font-semibold text-[#B19A6B]">
              OUR COLLABORATORS · 2026–2027
            </span>
          </div>
          <h2
            id="sponsors-heading"
            className="text-2xl sm:text-3xl lg:text-4xl font-serif text-charcoal font-medium tracking-tight"
          >
            Our Sponsors &amp; Partners
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-muted leading-relaxed font-sans">
            Supporting our journey of community service and meaningful impact.
          </p>
          <p className="text-xs text-charcoal-muted/80 italic font-sans pt-0.5">
            &ldquo;Terima kasih kepada pihak-pihak yang telah mendukung perjalanan pengabdian kami.&rdquo;
          </p>
        </div>

        {sponsors.length > 0 && (
          <div className="pt-2 md:pt-0 shrink-0">
            <Link
              to="/sponsors"
              className="group inline-flex items-center gap-2 text-xs font-semibold text-[#19382B] hover:text-[#B19A6B] transition-colors"
            >
              <span className="border-b border-[#19382B]/30 group-hover:border-[#B19A6B] pb-0.5 transition-colors">
                Lihat Semua Mitra &amp; Sponsor
              </span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-warm-300 bg-white p-8 sm:p-12 animate-pulse space-y-4">
          <div className="h-44 sm:h-52 rounded-2xl bg-warm-200/60 w-full" />
        </div>
      ) : sponsors.length === 0 ? (
        /* Empty State */
        <div className="rounded-3xl border border-warm-300 bg-white p-8 sm:p-14 text-center shadow-2xs space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-warm-100 text-[#19382B] mb-1">
            <Sparkles className="h-5 w-5 text-[#B19A6B]" />
          </div>
          <h3 className="text-lg sm:text-xl font-serif font-medium text-charcoal">
            Perjalanan pengabdian ini terbuka untuk kolaborasi.
          </h3>
          <p className="text-xs sm:text-sm text-charcoal-muted max-w-lg mx-auto leading-relaxed">
            Terima kasih kepada seluruh pihak yang nantinya menjadi bagian dari kegiatan KKN kami. Mari bersama memberdayakan masyarakat Desa Pringgasela Selatan.
          </p>
          <div className="pt-2">
            <Link
              to="/sponsors"
              className="inline-flex items-center gap-2 rounded-xl bg-[#19382B] hover:bg-[#12281F] text-white text-xs font-semibold px-5 py-2.5 shadow-xs transition-all"
            >
              <span>Pelajari Kemitraan &amp; Sponsor</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        /* Curated Editorial Presentation */
        <div className="space-y-6">
          {/* Featured Sponsor Hero Showcase */}
          {featuredSponsor && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#19382B] via-[#163126] to-[#10221A] text-white border border-[#28493A] shadow-md p-6 sm:p-8 lg:p-10">
              {/* Subtle top brass accent hairline */}
              <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-[#B19A6B]/50 to-transparent pointer-events-none" />

              <div className="flex flex-col md:flex-row items-center md:items-stretch gap-6 lg:gap-10">
                {/* Generous White Logo Pedestal */}
                <div className="w-full md:w-72 lg:w-80 shrink-0 flex items-center justify-center bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-white/20 min-h-[160px] md:min-h-[200px]">
                  <SponsorLogoThumbnail
                    fileId={featuredSponsor.logo_file_id}
                    sponsorId={featuredSponsor.id}
                    alt={featuredSponsor.name}
                    isPublic={true}
                    containerClassName="w-full h-28 sm:h-32 flex items-center justify-center overflow-hidden"
                    className="w-full h-full object-contain filter hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Editorial Content Side */}
                <div className="flex-1 flex flex-col justify-between space-y-4 text-center md:text-left py-1">
                  <div className="space-y-2.5">
                    {/* Category Eyebrow in Muted Brass */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/15 text-[11px] font-mono tracking-widest text-[#B19A6B] uppercase font-semibold">
                      <span>{SPONSOR_CATEGORY_LABELS[featuredSponsor.category] || 'Mitra Resmi'}</span>
                      <span className="text-white/40">·</span>
                      <span className="text-emerald-100/90 font-normal">
                        {SPONSOR_CONTRIBUTION_LABELS[featuredSponsor.contribution_type] || 'Dukungan Resmi'}
                      </span>
                    </div>

                    {/* Prominent Serif Name */}
                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-medium text-white tracking-tight">
                      {featuredSponsor.name}
                    </h3>

                    {/* Description Excerpt */}
                    {featuredSponsor.description && (
                      <p className="text-xs sm:text-sm text-emerald-100/80 font-light leading-relaxed max-w-2xl">
                        {featuredSponsor.description}
                      </p>
                    )}

                    {/* Contribution Note if present */}
                    {featuredSponsor.contribution_description && (
                      <div className="inline-flex items-center gap-2 text-xs text-emerald-200/90 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                        <span className="text-[#B19A6B] font-semibold">Bentuk Dukungan:</span>
                        <span>{featuredSponsor.contribution_description}</span>
                      </div>
                    )}
                  </div>

                  {/* Links / Action row */}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                    {featuredSponsor.website_url && (
                      <a
                        href={featuredSponsor.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-white/15 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-xl transition-all"
                        title={`Kunjungi website resmi ${featuredSponsor.name}`}
                      >
                        <Globe className="h-3.5 w-3.5 text-[#B19A6B]" />
                        <span>Kunjungi Portal Resmi</span>
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </a>
                    )}
                    <Link
                      to="/sponsors"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-200/90 hover:text-white px-3 py-2 transition-colors"
                    >
                      <span>Lihat Profil Direktori Kemitraan</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Companions (if there are additional sponsors) */}
          {companionSponsors.length > 0 && (
            <div className="space-y-3 pt-2">
              <span className="text-[11px] font-mono tracking-widest uppercase text-charcoal-muted block">
                Mitra &amp; Kolaborator Lainnya
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {companionSponsors.map((sp: PublicSponsor) => {
                  const cardEl = (
                    <div className="group rounded-2xl border border-warm-200 bg-white p-4 shadow-2xs hover:shadow-xs hover:border-[#19382B]/40 transition-all flex flex-col items-center justify-center text-center gap-2.5 h-36">
                      <SponsorLogoThumbnail
                        fileId={sp.logo_file_id}
                        sponsorId={sp.id}
                        alt={sp.name}
                        isPublic={true}
                        containerClassName="w-20 h-14 flex items-center justify-center shrink-0"
                        className="w-full h-full object-contain filter group-hover:scale-105 transition-transform"
                      />
                      <div className="space-y-0.5 w-full">
                        <span className="text-xs font-serif font-bold text-charcoal block truncate group-hover:text-[#19382B] transition-colors">
                          {sp.name}
                        </span>
                        <span className="text-[10px] text-charcoal-muted block truncate">
                          {SPONSOR_CATEGORY_LABELS[sp.category] || sp.category}
                        </span>
                      </div>
                    </div>
                  )

                  if (sp.website_url) {
                    return (
                      <a
                        key={sp.id}
                        href={sp.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block focus:outline-hidden"
                      >
                        {cardEl}
                      </a>
                    )
                  }
                  return (
                    <Link key={sp.id} to="/sponsors" className="block">
                      {cardEl}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

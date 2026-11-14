import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchPublicSponsors } from '@/services/sponsorsApi'
import { SponsorLogoThumbnail } from '@/components/sponsors/SponsorLogoThumbnail'
import { SPONSOR_CATEGORY_LABELS } from '@/types/sponsor'
import { ArrowRight, Handshake } from 'lucide-react'

export const HomeSponsorsSection: React.FC = () => {
  const { data: sponsors = [], isLoading } = useQuery({
    queryKey: ['public-sponsors'],
    queryFn: fetchPublicSponsors,
    staleTime: 1000 * 60 * 5,
  })

  return (
    <section aria-labelledby="sponsors-heading" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-warm-300 pb-4">
        <div>
          <div className="flex items-center gap-2 text-forest text-xs font-semibold uppercase tracking-wider mb-1">
            <Handshake className="h-4 w-4" />
            <span>Kolaborasi & Dukungan</span>
          </div>
          <h2 id="sponsors-heading" className="text-2xl sm:text-3xl font-serif font-bold text-charcoal tracking-tight">
            Our Sponsors & Partners
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-1">
            Terima kasih kepada pihak-pihak yang telah mendukung perjalanan pengabdian kami.
          </p>
        </div>

        {sponsors.length > 0 && (
          <Link
            to="/sponsors"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest hover:text-forest/80 hover:underline transition-colors shrink-0"
          >
            <span>Lihat Semua Mitra & Sponsor</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-warm-200 animate-pulse" />
          ))}
        </div>
      ) : sponsors.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-warm-300 bg-white p-8 sm:p-12 text-center shadow-subtle space-y-3">
          <div className="w-12 h-12 rounded-full bg-forest/10 text-forest flex items-center justify-center mx-auto mb-2">
            <Handshake className="h-6 w-6" />
          </div>
          <h3 className="text-base sm:text-lg font-serif font-bold text-charcoal">
            Perjalanan pengabdian ini terbuka untuk kolaborasi.
          </h3>
          <p className="text-xs sm:text-sm text-charcoal-muted max-w-lg mx-auto leading-relaxed">
            Terima kasih kepada seluruh pihak yang nantinya menjadi bagian dari kegiatan KKN kami. Mari bersama memberdayakan masyarakat Desa Pringgasela Selatan.
          </p>
          <div className="pt-2">
            <Link
              to="/sponsors"
              className="inline-flex items-center gap-2 rounded-xl bg-forest hover:bg-forest/90 text-white text-xs font-semibold px-4 py-2.5 shadow-subtle transition-all"
            >
              <span>Pelajari Kemitraan & Sponsor</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        /* Sponsors Grid (Limit top 6 for homepage clean layout) */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {sponsors.slice(0, 6).map((sponsor) => {
            const hasWebsite = Boolean(sponsor.website_url)

            const CardContent = (
              <div className="group rounded-2xl border border-warm-200 bg-white p-4 shadow-2xs hover:shadow-md hover:border-forest/40 transition-all flex flex-col items-center justify-center text-center gap-2.5 h-32">
                <SponsorLogoThumbnail
                  fileId={sponsor.logo_file_id}
                  sponsorId={sponsor.id}
                  alt={sponsor.name}
                  isPublic={true}
                  containerClassName="w-20 h-12 flex items-center justify-center shrink-0"
                  className="w-full h-full object-contain filter group-hover:brightness-105 transition-all"
                />
                <div className="space-y-0.5 w-full">
                  <span className="text-xs font-semibold text-charcoal block truncate max-w-[130px] mx-auto group-hover:text-forest transition-colors">
                    {sponsor.name}
                  </span>
                  <span className="text-[10px] text-charcoal-muted block truncate max-w-[130px] mx-auto">
                    {SPONSOR_CATEGORY_LABELS[sponsor.category] || sponsor.category}
                  </span>
                </div>
              </div>
            )

            if (hasWebsite) {
              return (
                <a
                  key={sponsor.id}
                  href={sponsor.website_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block focus:outline-hidden focus:ring-2 focus:ring-forest/40 rounded-2xl"
                  title={`Kunjungi website resmi ${sponsor.name}`}
                >
                  {CardContent}
                </a>
              )
            }

            return (
              <div key={sponsor.id} className="block">
                {CardContent}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

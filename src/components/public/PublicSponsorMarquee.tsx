import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchPublicSponsors } from '@/services/sponsorsApi'
import { SponsorLogoThumbnail } from '@/components/sponsors/SponsorLogoThumbnail'
import type { PublicSponsor } from '@/types/sponsor'
import { SPONSOR_CATEGORY_LABELS } from '@/types/sponsor'

export const PublicSponsorMarquee: React.FC = () => {
  const { data: sponsors = [], isLoading } = useQuery({
    queryKey: ['public-sponsors'],
    queryFn: fetchPublicSponsors,
    staleTime: 1000 * 60 * 5,
  })

  // 1. Empty state: completely hide marquee (no placeholders, no dummy logos)
  if (isLoading || sponsors.length === 0) {
    return null
  }

  // Helper to render an individual sponsor item
  const renderSponsorItem = (sp: PublicSponsor, keyPrefix: string = '') => {
    const isDiamond = sp.tier_key === 'diamond'
    const isPlatinum = sp.tier_key === 'platinum'

    const itemContent = (
      <div className="flex items-center gap-2.5 px-3 py-1 rounded-full transition-colors group/item hover:bg-black/5 shrink-0">
        <SponsorLogoThumbnail
          fileId={sp.logo_file_id}
          sponsorId={sp.id}
          alt={sp.name}
          isPublic={true}
          containerClassName="w-7 h-5 sm:w-8 sm:h-5.5 flex items-center justify-center shrink-0 overflow-hidden"
          className="w-full h-full object-contain filter group-hover/item:scale-105 transition-transform"
        />
        <div className="flex items-center gap-1.5 text-xs font-serif font-medium text-charcoal group-hover/item:text-[#19382B] whitespace-nowrap">
          <span>{sp.name}</span>
          {isDiamond ? (
            <span className="text-[9px] font-mono tracking-wider font-semibold px-1.5 py-0.2 rounded-full bg-[#B19A6B]/15 text-[#8E794D] border border-[#B19A6B]/30 uppercase">
              Diamond
            </span>
          ) : isPlatinum ? (
            <span className="text-[9px] font-mono tracking-wider font-semibold px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700 border border-slate-300 uppercase">
              Platinum
            </span>
          ) : sp.tier_key === 'custom' ? (
            <span className="text-[9px] font-mono tracking-wider px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {SPONSOR_CATEGORY_LABELS[sp.category] || 'Mitra'}
            </span>
          ) : null}
        </div>
      </div>
    )

    if (sp.website_url) {
      return (
        <a
          key={`${keyPrefix}-${sp.id}`}
          href={sp.website_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center outline-none focus-visible:ring-1 focus-visible:ring-forest rounded-full"
          title={`Kunjungi situs resmi ${sp.name}`}
        >
          {itemContent}
        </a>
      )
    }

    return (
      <Link
        key={`${keyPrefix}-${sp.id}`}
        to="/sponsors"
        className="inline-flex items-center outline-none focus-visible:ring-1 focus-visible:ring-forest rounded-full"
        title={`Lihat kemitraan ${sp.name}`}
      >
        {itemContent}
      </Link>
    )
  }

  // 2. Single Sponsor state: render clean, balanced, non-duplicated static bar
  if (sponsors.length === 1) {
    const single = sponsors[0]
    return (
      <aside
        aria-label="Official Partner Recognition"
        className="w-full border-b border-warm-200/90 bg-[#FAF9F6] text-charcoal py-1 px-4 sm:px-6 relative z-30"
      >
        <div className="mx-auto max-w-7xl flex items-center justify-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-charcoal-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B19A6B]" />
            <span>Official Partner:</span>
          </div>
          {renderSponsorItem(single, 'single')}
        </div>
      </aside>
    )
  }

  // 3. Multiple Sponsors state: seamless continuous horizontal loop
  return (
    <aside
      aria-label="Official Partners & Sponsors Marquee"
      className="w-full border-b border-warm-200/90 bg-[#FAF9F6] text-charcoal py-1 sm:py-1.5 relative overflow-hidden z-30 group"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center">
        {/* Left Anchor Label */}
        <div className="hidden sm:flex items-center gap-2 pr-4 border-r border-warm-300/80 shrink-0 select-none z-10 bg-[#FAF9F6]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#B19A6B]" />
          <span className="text-[10px] sm:text-[11px] font-mono font-semibold uppercase tracking-widest text-charcoal-muted whitespace-nowrap">
            Partners &amp; Sponsors
          </span>
        </div>

        {/* Scrolling Viewport with edge fades */}
        <div className="relative flex-1 overflow-hidden">
          {/* Subtle gradient edge masks */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 sm:w-10 bg-gradient-to-r from-[#FAF9F6] to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 sm:w-10 bg-gradient-to-l from-[#FAF9F6] to-transparent z-10" />

          {/* Marquee Track (Double array for seamless -50% translateX loop) */}
          <div className="marquee-track flex items-center gap-6 sm:gap-10 animate-marquee hover:[animation-play-state:paused] w-max select-none">
            {sponsors.map((sp) => renderSponsorItem(sp, 'loop1'))}
            {sponsors.map((sp) => renderSponsorItem(sp, 'loop2'))}
          </div>
        </div>

        {/* Right Directory Link */}
        <div className="hidden md:flex items-center pl-4 border-l border-warm-300/80 shrink-0 z-10 bg-[#FAF9F6]">
          <Link
            to="/sponsors"
            className="text-[10px] font-mono tracking-wider text-charcoal-muted hover:text-[#19382B] transition-colors"
          >
            Lihat Semua →
          </Link>
        </div>
      </div>
    </aside>
  )
}

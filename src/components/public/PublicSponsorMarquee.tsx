import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchPublicSponsors } from '@/services/sponsorsApi'
import { SponsorLogoThumbnail } from '@/components/sponsors/SponsorLogoThumbnail'
import type { PublicSponsor, SponsorCategory } from '@/types/sponsor'

/**
 * Editorial relationship category labels for the institutional top partner strip.
 * Uses restrained uppercase typography instead of colored badges or pills.
 */
const EDITORIAL_CATEGORY_LABELS: Record<string, string> = {
  sponsor_utama: 'SPONSOR UTAMA',
  sponsor_pendukung: 'SPONSOR PENDUKUNG',
  sponsor_produk: 'SPONSOR PRODUK',
  media_partner: 'MEDIA PARTNER',
  mitra_kolaborasi: 'MITRA KOLABORASI',
  mitra_institusi: 'MITRA INSTITUSI',
}

const EDITORIAL_CATEGORY_ORDER: SponsorCategory[] = [
  'sponsor_utama',
  'sponsor_pendukung',
  'sponsor_produk',
  'media_partner',
  'mitra_kolaborasi',
]

export const PublicSponsorMarquee: React.FC = () => {
  const { data: sponsors = [], isLoading } = useQuery({
    queryKey: ['public-sponsors'],
    queryFn: fetchPublicSponsors,
    staleTime: 1000 * 60 * 5,
  })

  // 1. Group partners based on their actual relationship type (called unconditionally)
  // Preserves admin-controlled display_order within each category
  const partnerGroups = useMemo(() => {
    if (!sponsors || sponsors.length === 0) return []

    const map = new Map<string, PublicSponsor[]>()
    for (const sp of sponsors) {
      const cat = sp.category || 'mitra_kolaborasi'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(sp)
    }

    // Sort sponsors within each category by display_order ascending, then name
    for (const list of map.values()) {
      list.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || a.name.localeCompare(b.name))
    }

    const groups: { category: string; label: string; sponsors: PublicSponsor[] }[] = []
    for (const catKey of EDITORIAL_CATEGORY_ORDER) {
      const list = map.get(catKey)
      if (list && list.length > 0) {
        groups.push({
          category: catKey,
          label: EDITORIAL_CATEGORY_LABELS[catKey] || catKey.replace('_', ' ').toUpperCase(),
          sponsors: list,
        })
        map.delete(catKey)
      }
    }

    // Append any extra category that was not in the predefined list
    for (const [catKey, list] of map.entries()) {
      if (list.length > 0) {
        groups.push({
          category: catKey,
          label: EDITORIAL_CATEGORY_LABELS[catKey] || catKey.replace('_', ' ').toUpperCase(),
          sponsors: list,
        })
      }
    }

    return groups
  }, [sponsors])

  // 2. Hide if loading, no approved published sponsors, or no groups
  if (isLoading || sponsors.length === 0 || partnerGroups.length === 0) {
    return null
  }

  // Helper to render an individual sponsor logo + name
  const renderSponsor = (sp: PublicSponsor, keyPrefix: string = '') => {
    const content = (
      <div className="flex items-center gap-2 sm:gap-2.5 group/item transition-opacity hover:opacity-90 shrink-0">
        {sp.logo_file_id ? (
          <SponsorLogoThumbnail
            fileId={sp.logo_file_id}
            sponsorId={sp.id}
            alt={sp.name}
            isPublic={true}
            containerClassName="h-7 sm:h-8 w-auto max-w-[130px] flex items-center justify-center shrink-0 bg-transparent overflow-hidden"
            className="max-h-7 sm:max-h-8 w-auto max-w-full object-contain filter group-hover/item:scale-[1.03] transition-transform duration-200"
          />
        ) : null}
        <span className="text-xs sm:text-[13px] font-serif font-medium text-charcoal tracking-tight group-hover/item:text-sage-800 transition-colors whitespace-nowrap">
          {sp.name}
        </span>
      </div>
    )

    if (sp.website_url) {
      return (
        <a
          key={`${keyPrefix}-${sp.id}`}
          href={sp.website_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center outline-none focus-visible:ring-1 focus-visible:ring-sage-700 rounded-sm"
          title={`Kunjungi situs resmi ${sp.name}`}
        >
          {content}
        </a>
      )
    }

    return (
      <Link
        key={`${keyPrefix}-${sp.id}`}
        to="/sponsors"
        className="inline-flex items-center outline-none focus-visible:ring-1 focus-visible:ring-sage-700 rounded-sm"
        title={`Lihat profil kemitraan ${sp.name}`}
      >
        {content}
      </Link>
    )
  }

  // Helper to render all partner groups with typography labels and subtle dividers
  const renderGroups = (keyPrefix: string = '') => (
    <div className="flex items-center gap-6 sm:gap-7 shrink-0">
      {partnerGroups.map((group, groupIdx) => (
        <React.Fragment key={`${keyPrefix}-${group.category}`}>
          {groupIdx > 0 && (
            <div className="h-3.5 w-[1px] bg-warm-300/80 shrink-0 self-center" aria-hidden="true" />
          )}
          <div className="flex items-center gap-3 sm:gap-3.5 shrink-0">
            {/* Category label: Muted, restrained typography without any badge or pill */}
            <span className="text-[10px] sm:text-[11px] font-mono font-medium tracking-wider text-charcoal-muted uppercase whitespace-nowrap select-none shrink-0">
              {group.label}
            </span>

            {/* Sponsor logos in this group */}
            <div className="flex items-center gap-5 sm:gap-6 shrink-0">
              {group.sponsors.map((sp) => renderSponsor(sp, keyPrefix))}
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  )

  // 3. Static presentation when partners <= 2
  // Prevents repetitive animation or empty gaps when sponsor count is small
  const isStatic = sponsors.length <= 2

  if (isStatic) {
    return (
      <aside
        aria-label="Official Partners & Sponsors"
        className="w-full border-b border-warm-200/90 bg-[#FAF9F6] text-charcoal py-1.5 sm:py-2 relative z-30 overflow-hidden"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          {/* Left Anchor Label + Compact Partner Groups */}
          <div className="flex items-center gap-3.5 sm:gap-4 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-widest text-charcoal/85 uppercase whitespace-nowrap shrink-0 select-none">
              OFFICIAL PARTNER
            </span>
            <div className="h-3.5 w-[1px] bg-warm-300/80 shrink-0 self-center" aria-hidden="true" />
            {renderGroups('static')}
          </div>

          {/* Directory Access */}
          <Link
            to="/sponsors"
            className="hidden md:inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-mono tracking-wider text-charcoal-muted hover:text-sage-800 transition-colors whitespace-nowrap shrink-0 pl-3 border-l border-warm-300/70"
          >
            <span>Direktori Kemitraan</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </aside>
    )
  }

  // 4. Subtle Marquee presentation for 3+ partners
  return (
    <aside
      aria-label="Official Partners & Sponsors Marquee"
      className="w-full border-b border-warm-200/90 bg-[#FAF9F6] text-charcoal py-1.5 sm:py-2 relative overflow-hidden z-30 group"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center">
        {/* Left Anchor Label */}
        <div className="flex items-center gap-3.5 sm:gap-4 pr-3.5 sm:pr-4 border-r border-warm-300/80 shrink-0 select-none z-10 bg-[#FAF9F6]">
          <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-widest text-charcoal/85 uppercase whitespace-nowrap">
            OFFICIAL PARTNER
          </span>
        </div>

        {/* Scrolling Viewport with edge gradient masks */}
        <div className="relative flex-1 overflow-hidden pl-3.5 sm:pl-4">
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 sm:w-8 bg-gradient-to-r from-[#FAF9F6] to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 sm:w-8 bg-gradient-to-l from-[#FAF9F6] to-transparent z-10" />

          {/* Continuous Loop Track with Hover & Focus Pause */}
          <div className="marquee-track flex items-center gap-8 sm:gap-10 animate-marquee hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] motion-reduce:animate-none w-max select-none py-0.5">
            {renderGroups('track-a')}
            <div aria-hidden="true" className="flex items-center gap-8 sm:gap-10">
              {renderGroups('track-b')}
            </div>
          </div>
        </div>

        {/* Right Directory Link */}
        <div className="hidden lg:flex items-center pl-4 border-l border-warm-300/80 shrink-0 z-10 bg-[#FAF9F6]">
          <Link
            to="/sponsors"
            className="text-[10px] sm:text-[11px] font-mono tracking-wider text-charcoal-muted hover:text-sage-800 transition-colors whitespace-nowrap"
          >
            <span>Direktori Kemitraan &rarr;</span>
          </Link>
        </div>
      </div>
    </aside>
  )
}

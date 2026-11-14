import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPublicSponsors, fetchPublicSponsorshipPackages } from '@/services/sponsorsApi'
import { SponsorLogoThumbnail } from '@/components/sponsors/SponsorLogoThumbnail'
import { Skeleton } from '@/components/ui/skeleton'
import {
  SPONSOR_CATEGORY_LABELS,
  SPONSOR_CONTRIBUTION_LABELS,
  SPONSORSHIP_TIER_LABELS,
  type SponsorCategory,
  type PublicSponsor,
} from '@/types/sponsor'
import {
  ExternalLink,
  Globe,
  Share2,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Mail,
  ArrowRight,
  Handshake,
} from 'lucide-react'

interface CategoryConfig {
  label: string
  subtitle: string
}

const CATEGORY_SECTION_CONFIG: Record<SponsorCategory, CategoryConfig> = {
  sponsor_utama: {
    label: 'Main Sponsors',
    subtitle: 'Mitra strategis utama pendukung program unggulan KKN SPACE.',
  },
  sponsor_pendukung: {
    label: 'Supporting Sponsors',
    subtitle: 'Pihak yang memberikan kontribusi penting dalam operasional dan program kerja.',
  },
  sponsor_produk: {
    label: 'Product & Logistics Partners',
    subtitle: 'Dukungan barang, konsumsi, dan peralatan penunjang pengabdian masyarakat.',
  },
  media_partner: {
    label: 'Media Partners',
    subtitle: 'Mitra publikasi dan diseminasi informasi program ke masyarakat luas.',
  },
  mitra_kolaborasi: {
    label: 'Collaboration Partners',
    subtitle: 'Komunitas, UMKM, dan institusi pendukung keberlanjutan inovasi desa.',
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

  const { data: packages = [] } = useQuery({
    queryKey: ['public-sponsorship-packages'],
    queryFn: fetchPublicSponsorshipPackages,
    staleTime: 1000 * 60 * 10,
  })

  // Group sponsors strictly by category, preserving saved order
  const activeCategories = React.useMemo(() => {
    const map = new Map<SponsorCategory, PublicSponsor[]>()
    for (const cat of CATEGORY_ORDER) {
      map.set(cat, [])
    }
    for (const s of sponsors) {
      const list = map.get(s.category) || []
      list.push(s)
      map.set(s.category, list)
    }

    // Only return categories that have published entries
    const list: { category: SponsorCategory; config: CategoryConfig; items: PublicSponsor[] }[] = []
    for (const cat of CATEGORY_ORDER) {
      const items = map.get(cat) || []
      if (items.length > 0) {
        list.push({
          category: cat,
          config: CATEGORY_SECTION_CONFIG[cat],
          items,
        })
      }
    }
    return list
  }, [sponsors])

  return (
    <div className="min-h-screen bg-[#F5F2EA] text-[#252A26] pb-28">
      {/* ========================================================= */}
      {/* 01. EDITORIAL HERO: Quiet Luxury × Institutional Depth     */}
      {/* ========================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#19382B] via-[#163126] to-[#12261E] text-white pt-20 pb-20 sm:pt-28 sm:pb-24 px-4 sm:px-6 lg:px-8 border-b border-[#234838] shadow-sm">
        {/* Subtle brass hairline at top */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#B19A6B]/50 to-transparent pointer-events-none" />

        {/* Minimalist ambient dot texture */}
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(#F5F2EA_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        <div className="relative mx-auto max-w-4xl text-center space-y-4">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2">
            <span className="text-[11px] font-mono tracking-[0.25em] text-[#B19A6B] uppercase font-semibold">
              OUR COLLABORATORS · 2026–2027
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-medium text-white tracking-tight leading-[1.12]">
            Together, We Create Impact.
          </h1>

          {/* Supporting Description */}
          <p className="text-sm sm:text-base text-emerald-100/90 max-w-2xl mx-auto font-light leading-relaxed pt-1">
            &ldquo;Setiap dukungan memiliki arti dalam perjalanan pengabdian kami. Bersama mitra dan sponsor, kami berupaya menghadirkan kontribusi nyata bagi masyarakat Desa Pringgasela Selatan.&rdquo;
          </p>

          {/* Institutional Information Line */}
          <div className="pt-4 flex items-center justify-center">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-xs border border-white/15 text-xs text-emerald-100 font-mono tracking-wider">
              <span className="text-[#B19A6B] font-semibold uppercase">Official Partners</span>
              <span className="text-white/40">·</span>
              <span>{sponsors.length} Mitra Resmi Terpublikasi</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 02. DIRECTORY SHOWCASE & CURATED PRESENTATION             */}
      {/* ========================================================= */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-14 sm:pt-18 space-y-16">
        {isLoading ? (
          <div className="space-y-10">
            <Skeleton className="h-8 w-60 rounded-xl bg-warm-200/80" />
            <Skeleton className="h-64 w-full rounded-3xl bg-warm-200/60" />
          </div>
        ) : sponsors.length === 0 ? (
          /* Empty State */
          <div className="rounded-3xl border border-warm-300 bg-white p-10 sm:p-16 text-center shadow-2xs space-y-4 max-w-2xl mx-auto">
            <div className="w-12 h-12 rounded-full bg-warm-100 text-[#19382B] flex items-center justify-center mx-auto mb-2">
              <Sparkles className="h-5 w-5 text-[#B19A6B]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-medium text-[#252A26]">
              Perjalanan pengabdian ini terbuka untuk kolaborasi.
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-muted leading-relaxed">
              Terima kasih kepada seluruh pihak yang nantinya menjadi bagian dari kegiatan KKN kami. Kami menyambut kerja sama dengan instansi, perusahaan, media, dan komunitas untuk keberdayaan desa.
            </p>
          </div>
        ) : (
          /* Active Category Sections */
          activeCategories.map(({ category, config, items }, index) => {
            const sectionNumber = String(index + 1).padStart(2, '0')
            const isSingleItem = items.length === 1

            return (
              <section
                key={category}
                aria-labelledby={`cat-${category}`}
                className="space-y-8"
              >
                {/* Category Header with Editorial Numbering */}
                <div className="border-b border-warm-300/80 pb-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold tracking-widest text-[#B19A6B]">
                        {sectionNumber} —
                      </span>
                      <h2
                        id={`cat-${category}`}
                        className="text-xl sm:text-2xl font-serif font-medium text-[#252A26] tracking-tight"
                      >
                        {SPONSOR_CATEGORY_LABELS[category] || config.label}
                      </h2>
                    </div>
                    <p className="text-xs sm:text-sm text-charcoal-muted font-sans pl-8 sm:pl-0">
                      {config.subtitle}
                    </p>
                  </div>

                  <span className="text-[11px] font-mono tracking-wider uppercase text-charcoal-muted shrink-0 pl-8 sm:pl-0">
                    {items.length} Mitra Terdaftar
                  </span>
                </div>

                {/* Single Sponsor Featured Presentation vs Grid */}
                {isSingleItem ? (
                  /* ========================================================= */
                  /* Featured Single Partner Presentation                      */
                  /* Avoids sparse empty columns; delivers executive prestige   */
                  /* ========================================================= */
                  (() => {
                    const sponsor = items[0]
                    return (
                      <article className="relative overflow-hidden rounded-3xl bg-white border border-warm-200/90 shadow-2xs hover:shadow-subtle transition-all duration-300 p-6 sm:p-10">
                        {/* Subtle top hairline in muted brass */}
                        <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-[#B19A6B]/40 to-transparent pointer-events-none" />

                        <div className="flex flex-col md:flex-row items-center md:items-stretch gap-6 lg:gap-10">
                          {/* Generous White Logo Pedestal */}
                          <div className="w-full md:w-72 lg:w-80 shrink-0 flex items-center justify-center bg-[#FAF9F6] rounded-2xl p-6 sm:p-8 border border-warm-200/80 min-h-[160px] md:min-h-[210px] group">
                            <SponsorLogoThumbnail
                              fileId={sponsor.logo_file_id}
                              sponsorId={sponsor.id}
                              alt={sponsor.name}
                              isPublic={true}
                              containerClassName="w-full h-28 sm:h-36 flex items-center justify-center overflow-hidden"
                              className="w-full h-full object-contain filter group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>

                          {/* Editorial Information Column */}
                          <div className="flex-1 flex flex-col justify-between space-y-4 text-center md:text-left py-1">
                            <div className="space-y-3">
                              {/* Category Eyebrow in Muted Brass */}
                              <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1 rounded-full bg-warm-100 border border-warm-200/80 text-[11px] font-mono tracking-widest text-[#B19A6B] uppercase font-semibold">
                                <span>{SPONSOR_CATEGORY_LABELS[sponsor.category]}</span>
                                <span className="text-warm-400">·</span>
                                <span className="text-charcoal font-medium">
                                  {SPONSOR_CONTRIBUTION_LABELS[sponsor.contribution_type]}
                                </span>
                                {sponsor.tier_key && sponsor.tier_key !== 'none' && (
                                  <>
                                    <span className="text-warm-400">·</span>
                                    <span className="text-[#19382B] font-bold">
                                      {SPONSORSHIP_TIER_LABELS[sponsor.tier_key]}
                                    </span>
                                  </>
                                )}
                              </div>

                              {/* Prominent Serif Sponsor Name */}
                              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-medium text-[#252A26] tracking-tight">
                                {sponsor.name}
                              </h3>

                              {/* Description */}
                              {sponsor.description && (
                                <p className="text-xs sm:text-sm text-charcoal-muted font-light leading-relaxed max-w-2xl">
                                  {sponsor.description}
                                </p>
                              )}

                              {/* Contribution Note if approved */}
                              {sponsor.contribution_description && (
                                <div className="inline-flex items-center gap-2 text-xs text-charcoal bg-[#FAF9F6] border border-warm-200 px-3.5 py-1.5 rounded-xl">
                                  <span className="text-[#B19A6B] font-semibold">Bentuk Dukungan:</span>
                                  <span>{sponsor.contribution_description}</span>
                                </div>
                              )}
                            </div>

                            {/* External Links */}
                            {(sponsor.website_url || sponsor.social_media_url) && (
                              <div className="border-t border-warm-200/70 pt-4 flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs">
                                {sponsor.website_url && (
                                  <a
                                    href={sponsor.website_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 font-medium text-[#19382B] hover:text-[#B19A6B] transition-colors"
                                  >
                                    <Globe className="h-3.5 w-3.5 text-[#B19A6B]" />
                                    <span className="underline underline-offset-4">Website Resmi</span>
                                    <ExternalLink className="h-3 w-3 opacity-60" />
                                  </a>
                                )}

                                {sponsor.social_media_url && (
                                  <a
                                    href={sponsor.social_media_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 font-medium text-[#19382B] hover:text-[#B19A6B] transition-colors"
                                  >
                                    <Share2 className="h-3.5 w-3.5 text-[#B19A6B]" />
                                    <span className="underline underline-offset-4">Media Sosial</span>
                                    <ExternalLink className="h-3 w-3 opacity-60" />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    )
                  })()
                ) : (
                  /* ========================================================= */
                  /* Restrained Editorial Grid for Multiple Partners          */
                  /* 2-Column layout maintains generous logo presence         */
                  /* ========================================================= */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {items.map((sponsor) => (
                      <article
                        key={sponsor.id}
                        className="group rounded-3xl border border-warm-200/90 bg-white p-6 shadow-2xs hover:shadow-subtle hover:border-[#19382B]/30 transition-all duration-300 flex flex-col justify-between space-y-5"
                      >
                        <div className="space-y-4">
                          {/* Logo Pedestal & Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="w-full sm:w-28 h-24 bg-[#FAF9F6] rounded-2xl border border-warm-200/80 p-3 flex items-center justify-center shrink-0">
                              <SponsorLogoThumbnail
                                fileId={sponsor.logo_file_id}
                                sponsorId={sponsor.id}
                                alt={sponsor.name}
                                isPublic={true}
                                containerClassName="w-full h-full flex items-center justify-center overflow-hidden"
                                className="w-full h-full object-contain filter group-hover:scale-105 transition-transform"
                              />
                            </div>

                            <div className="min-w-0 flex-1 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono tracking-widest text-[#B19A6B] uppercase font-semibold block">
                                  {SPONSOR_CATEGORY_LABELS[sponsor.category]}
                                </span>
                                {sponsor.tier_key && sponsor.tier_key !== 'none' && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase bg-emerald-100/80 text-[#19382B]">
                                    {SPONSORSHIP_TIER_LABELS[sponsor.tier_key]}
                                  </span>
                                )}
                              </div>
                              <h3
                                className="text-xl font-serif font-medium text-[#252A26] group-hover:text-[#19382B] transition-colors truncate"
                                title={sponsor.name}
                              >
                                {sponsor.name}
                              </h3>
                              <span className="inline-block text-[11px] text-charcoal-muted">
                                {SPONSOR_CONTRIBUTION_LABELS[sponsor.contribution_type]}
                              </span>
                            </div>
                          </div>

                          {/* Description */}
                          {sponsor.description && (
                            <p className="text-xs text-charcoal-muted font-light leading-relaxed line-clamp-3">
                              {sponsor.description}
                            </p>
                          )}

                          {/* Contribution Note if present */}
                          {sponsor.contribution_description && (
                            <div className="rounded-xl bg-[#FAF9F6] p-2.5 border border-warm-200/70 text-xs">
                              <span className="font-semibold text-charcoal">Bentuk Dukungan: </span>
                              <span className="text-charcoal-muted">{sponsor.contribution_description}</span>
                            </div>
                          )}
                        </div>

                        {/* Footer Links */}
                        {(sponsor.website_url || sponsor.social_media_url) && (
                          <div className="border-t border-warm-200/70 pt-3 flex items-center gap-4 text-xs">
                            {sponsor.website_url && (
                              <a
                                href={sponsor.website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 font-medium text-[#19382B] hover:text-[#B19A6B] transition-colors"
                              >
                                <Globe className="h-3.5 w-3.5 text-[#B19A6B]" />
                                <span className="underline underline-offset-4">Website Resmi</span>
                                <ExternalLink className="h-3 w-3 opacity-60" />
                              </a>
                            )}

                            {sponsor.social_media_url && (
                              <a
                                href={sponsor.social_media_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 font-medium text-[#19382B] hover:text-[#B19A6B] transition-colors"
                              >
                                <Share2 className="h-3.5 w-3.5 text-[#B19A6B]" />
                                <span className="underline underline-offset-4">Media Sosial</span>
                                <ExternalLink className="h-3 w-3 opacity-60" />
                              </a>
                            )}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )
          })
        )}

        {/* ========================================================= */}
        {/* 03. PARTNERSHIP OPPORTUNITIES & SPONSORSHIP TIERS         */}
        {/* ========================================================= */}
        <section className="pt-10 border-t border-warm-300/80 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warm-100 border border-warm-200 text-[11px] font-mono tracking-widest text-[#B19A6B] uppercase font-semibold">
              <Handshake className="h-3.5 w-3.5" />
              <span>OPPORTUNITIES · SPONSORSHIP TIERS</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif font-medium text-[#252A26] tracking-tight">
              Peluang Kemitraan & Paket Sponsorship
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-muted leading-relaxed font-light">
              Kami membuka kesempatan kolaborasi strategis dengan model kontribusi fleksibel tanpa batasan nominal kaku.
              Dukungan dapat berbentuk pendanaan program, penyediaan sarana/logistik, maupun sinergi program pengabdian.
            </p>
          </div>

          {/* Tiers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => {
              const isDiamond = pkg.tier_key === 'diamond'
              const isPlatinum = pkg.tier_key === 'platinum'
              const isCustom = pkg.tier_key === 'custom'

              return (
                <div
                  key={pkg.id}
                  className={`rounded-3xl border transition-all duration-300 flex flex-col justify-between p-6 sm:p-7 ${
                    isDiamond
                      ? 'bg-gradient-to-b from-[#19382B] to-[#12261E] text-white border-[#2A5240] shadow-md'
                      : isPlatinum
                      ? 'bg-white border-[#B19A6B]/50 shadow-xs ring-1 ring-[#B19A6B]/20'
                      : 'bg-white border-warm-200/90 shadow-2xs hover:shadow-subtle'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase ${
                          isDiamond
                            ? 'bg-[#B19A6B]/30 text-[#D8C7A5] border border-[#B19A6B]/40'
                            : isPlatinum
                            ? 'bg-emerald-50 text-forest border border-forest/20'
                            : isCustom
                            ? 'bg-warm-100 text-charcoal border border-warm-200'
                            : 'bg-warm-100 text-charcoal-muted border border-warm-200'
                        }`}
                      >
                        {pkg.badge_label}
                      </span>
                      {isDiamond && (
                        <span className="text-[10px] font-mono tracking-wider text-[#B19A6B] flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Utama
                        </span>
                      )}
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3
                        className={`text-xl font-serif font-medium tracking-tight ${
                          isDiamond ? 'text-white' : 'text-[#252A26]'
                        }`}
                      >
                        {pkg.display_name}
                      </h3>
                      <p
                        className={`text-xs mt-2 leading-relaxed ${
                          isDiamond ? 'text-emerald-100/80 font-light' : 'text-charcoal-muted'
                        }`}
                      >
                        {pkg.description}
                      </p>
                    </div>

                    {/* Flexible Value Note */}
                    <div
                      className={`rounded-xl p-3 text-[11px] leading-relaxed border ${
                        isDiamond
                          ? 'bg-white/10 border-white/15 text-emerald-100'
                          : 'bg-[#FAF9F6] border-warm-200 text-charcoal-muted'
                      }`}
                    >
                      <span
                        className={`font-semibold block mb-0.5 ${
                          isDiamond ? 'text-[#D8C7A5]' : 'text-forest'
                        }`}
                      >
                        Skema Kontribusi Fleksibel
                      </span>
                      {isCustom
                        ? 'Disesuaikan dengan format kemitraan (CSR, natura, riset, atau pendampingan warga).'
                        : 'Nilai kontribusi finansial atau setara barang disepakati bersama berdasarkan kebutuhan program.'}
                    </div>

                    {/* Benefits List */}
                    <div className="space-y-2 pt-2">
                      <span
                        className={`text-[11px] font-mono uppercase tracking-wider block font-semibold ${
                          isDiamond ? 'text-[#D8C7A5]' : 'text-charcoal'
                        }`}
                      >
                        Hak & Manfaat Mitra:
                      </span>
                      <ul className="space-y-2">
                        {pkg.default_benefits.map((benefit, bIdx) => (
                          <li key={bIdx} className="flex items-start gap-2.5 text-xs">
                            <CheckCircle2
                              className={`h-4 w-4 shrink-0 mt-0.5 ${
                                isDiamond ? 'text-[#B19A6B]' : 'text-forest'
                              }`}
                            />
                            <span
                              className={`leading-snug ${
                                isDiamond ? 'text-emerald-50/90' : 'text-charcoal'
                              }`}
                            >
                              {benefit}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Consultation Button */}
                  <div className="pt-6 mt-6 border-t border-warm-200/40">
                    <a
                      href={`mailto:kknunrampringgaselaselatan@gmail.com?subject=Konsultasi Kemitraan KKN SPACE - Paket ${encodeURIComponent(
                        pkg.display_name
                      )}`}
                      className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        isDiamond
                          ? 'bg-[#B19A6B] text-white hover:bg-[#9E8759] shadow-xs'
                          : 'bg-warm-100 hover:bg-warm-200/80 text-charcoal border border-warm-300/80'
                      }`}
                    >
                      <span>Konsultasi Paket Ini</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Institutional Contact Callout Banner */}
          <div className="rounded-3xl border border-warm-300/90 bg-white p-8 sm:p-10 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 text-forest text-xs font-semibold">
                <ShieldCheck className="h-4 w-4 text-[#B19A6B]" />
                <span>Sekretariat & Hubungan Kemitraan KKN SPACE</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-medium text-[#252A26]">
                Siap Berkolaborasi Bersama Kami?
              </h3>
              <p className="text-xs sm:text-sm text-charcoal-muted max-w-xl font-light">
                Tim kemitraan kami siap memaparkan proposal resmi, menyusun rencana penyerapan manfaat, dan mendiskusikan
                perjanjian kerja sama secara profesional.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
              <a
                href="mailto:kknunrampringgaselaselatan@gmail.com?subject=Permohonan Proposal dan Kemitraan KKN SPACE"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#19382B] text-white text-xs font-medium hover:bg-[#132B21] transition-colors shadow-xs"
              >
                <Mail className="h-4 w-4 text-[#B19A6B]" />
                <span>Hubungi Sekretariat Posko</span>
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

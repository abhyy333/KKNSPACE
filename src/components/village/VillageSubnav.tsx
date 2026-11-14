import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  BookOpen,
  History,
  TrendingUp,
  MapPin,
  Compass,
  ChevronRight,
  ChevronUp,
  X,
} from 'lucide-react'

export interface VillageNavSection {
  id: string
  to: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  exact?: boolean
  matchPrefixes?: string[]
}

export const VILLAGE_NAV_SECTIONS: VillageNavSection[] = [
  {
    id: 'ringkasan',
    to: '/profil-desa',
    title: 'Ringkasan & Identitas',
    description: 'Kenali identitas, gambaran umum, dan informasi Desa Pringgasela Selatan.',
    icon: BookOpen,
    exact: true,
  },
  {
    id: 'sejarah',
    to: '/profil-desa/sejarah',
    title: 'Sejarah & 3 Trah',
    description: 'Pelajari sejarah desa, asal-usul, adat, dan warisan budaya masyarakat.',
    icon: History,
  },
  {
    id: 'potensi',
    to: '/profil-desa/potensi-desa',
    title: 'Potensi Desa',
    description: 'Jelajahi wisata alam, pertanian, UMKM, kerajinan, dan potensi lokal.',
    icon: TrendingUp,
    matchPrefixes: [
      '/profil-desa/potensi',
      '/profil-desa/pariwisata',
      '/profil-desa/budaya',
      '/profil-desa/galeri',
    ],
  },
  {
    id: 'wilayah',
    to: '/profil-desa/wilayah',
    title: 'Peta Wilayah',
    description: 'Jelajahi tujuh dusun, lokasi penting, dan informasi geografis desa.',
    icon: MapPin,
  },
]

interface VillageSubnavProps {
  className?: string
}

export const VillageSubnav: React.FC<VillageSubnavProps> = ({ className = '' }) => {
  const location = useLocation()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)

  const isSectionActive = (section: VillageNavSection, pathname: string) => {
    if (section.exact) {
      return pathname === section.to
    }
    if (pathname.startsWith(section.to)) {
      return true
    }
    if (section.matchPrefixes?.some((prefix) => pathname.startsWith(prefix))) {
      return true
    }
    return false
  }

  // Active section for quick reference
  const currentActiveSection =
    VILLAGE_NAV_SECTIONS.find((s) => isSectionActive(s, location.pathname)) ||
    VILLAGE_NAV_SECTIONS[0]

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky bar / floating button after user scrolls past top section (approx 260px)
      if (window.scrollY > 260) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile drawer on route change or ESC key
  useEffect(() => {
    setIsMobileDrawerOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileDrawerOpen) {
        setIsMobileDrawerOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMobileDrawerOpen])

  return (
    <>
      {/* 1. TOP PRIMARY NAVIGATION SECTION — Prominently visible before main page content */}
      <nav
        aria-label="Navigasi Profil Desa"
        className={`border-b border-warm-300 bg-white/95 backdrop-blur-sm pt-6 pb-7 shadow-2xs transition-all ${className}`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4">
          {/* Section Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-800">
              <Compass className="h-4 w-4 text-sage-700" />
              <span>Jelajahi Profil Desa</span>
            </div>
            <p className="text-xs sm:text-sm text-charcoal-muted leading-relaxed">
              Kenali lebih dekat Desa Pringgasela Selatan melalui empat bagian informasi berikut.
            </p>
          </div>

          {/* 4 Explicit Navigation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {VILLAGE_NAV_SECTIONS.map((section) => {
              const Icon = section.icon
              const active = isSectionActive(section, location.pathname)
              return (
                <Link
                  key={section.id}
                  to={section.to}
                  className={`group relative p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between min-h-[88px] sm:min-h-[124px] ${
                    active
                      ? 'bg-sage-50/90 border-sage-600 ring-2 ring-sage-600/20 shadow-xs'
                      : 'bg-white border-warm-300 hover:border-sage-400 hover:bg-warm-50/80 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        active
                          ? 'bg-sage-800 text-white shadow-2xs'
                          : 'bg-warm-100 text-sage-800 group-hover:bg-sage-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <h3
                          className={`font-serif font-bold text-sm tracking-tight truncate ${
                            active ? 'text-sage-900' : 'text-charcoal group-hover:text-sage-900'
                          }`}
                        >
                          {section.title}
                        </h3>
                        {active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sage-800 text-white shrink-0">
                            Aktif
                          </span>
                        ) : (
                          <ChevronRight className="h-4 w-4 text-charcoal-muted shrink-0 group-hover:text-sage-700 group-hover:translate-x-0.5 transition-all" />
                        )}
                      </div>
                      <p className="text-xs text-charcoal-muted mt-1 line-clamp-2 leading-relaxed">
                        {section.description}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* 2. DESKTOP COMPACT STICKY BAR — Docks under PublicNavbar (top-20) when scrolled */}
      {isScrolled && (
        <div className="hidden md:block sticky top-20 z-30 bg-warm-50/95 backdrop-blur-md border-b border-warm-300 py-2 shadow-2xs transition-all animate-in fade-in slide-in-from-top-2">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-charcoal shrink-0">
              <Compass className="h-3.5 w-3.5 text-sage-700" />
              <span className="font-serif">Jelajahi Profil:</span>
            </div>
            <nav className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
              {VILLAGE_NAV_SECTIONS.map((section) => {
                const Icon = section.icon
                const active = isSectionActive(section, location.pathname)
                return (
                  <Link
                    key={section.id}
                    to={section.to}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 shrink-0 ${
                      active
                        ? 'bg-sage-800 text-white shadow-2xs'
                        : 'text-charcoal-muted hover:text-charcoal hover:bg-warm-200/60'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{section.title}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}

      {/* 3. MOBILE FLOATING ACTION PILL — Non-intrusive floating button when scrolled */}
      {isScrolled && (
        <div className="md:hidden fixed bottom-5 right-4 z-40 pb-[env(safe-area-inset-bottom)] transition-all animate-in fade-in slide-in-from-bottom-3">
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            aria-label="Buka navigasi Jelajahi Profil Desa"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-sage-900/95 text-white shadow-xl border border-sage-700/80 hover:bg-sage-800 transition-all text-xs font-medium backdrop-blur-md hover:scale-105 active:scale-95"
          >
            <Compass className="h-4 w-4 text-emerald-400" />
            <span className="font-medium">
              Bagian: <strong className="font-semibold text-emerald-200">{currentActiveSection.title}</strong>
            </span>
            <ChevronUp className="h-3.5 w-3.5 text-sage-300" />
          </button>
        </div>
      )}

      {/* 4. MOBILE BOTTOM SHEET DRAWER — Opens when user taps mobile floating action pill */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Sheet */}
          <div className="relative bg-white rounded-t-3xl border-t border-warm-300 shadow-2xl p-5 pb-8 space-y-4 max-h-[82vh] overflow-y-auto z-10 animate-in slide-in-from-bottom duration-200">
            {/* Sheet Handle & Close */}
            <div className="flex items-center justify-between border-b border-warm-200 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sage-800">
                  <Compass className="h-4 w-4 text-sage-700" />
                  <span>Jelajahi Profil Desa</span>
                </div>
                <p className="text-[11px] text-charcoal-muted">
                  Pilih salah satu bagian informasi untuk berpindah halaman.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-warm-100 flex items-center justify-center text-charcoal-muted hover:text-charcoal hover:bg-warm-200 transition-colors"
                aria-label="Tutup navigasi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 4 Navigation Cards in Drawer */}
            <div className="space-y-2.5">
              {VILLAGE_NAV_SECTIONS.map((section) => {
                const Icon = section.icon
                const active = isSectionActive(section, location.pathname)
                return (
                  <Link
                    key={section.id}
                    to={section.to}
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className={`block p-3.5 rounded-2xl border transition-all ${
                      active
                        ? 'bg-sage-50/90 border-sage-600 ring-2 ring-sage-600/20 shadow-xs'
                        : 'bg-white border-warm-300 active:bg-warm-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          active ? 'bg-sage-800 text-white shadow-2xs' : 'bg-warm-100 text-sage-800'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4
                            className={`font-serif font-bold text-sm truncate ${
                              active ? 'text-sage-900' : 'text-charcoal'
                            }`}
                          >
                            {section.title}
                          </h4>
                          {active ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sage-800 text-white shrink-0">
                              Aktif
                            </span>
                          ) : (
                            <ChevronRight className="h-4 w-4 text-charcoal-muted shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-charcoal-muted mt-1 leading-relaxed">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

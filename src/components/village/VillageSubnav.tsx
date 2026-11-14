import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  BookOpen,
  History,
  Map,
  Compass,
  Sparkles,
  TrendingUp,
  Image as ImageIcon,
} from 'lucide-react'

const navItems = [
  { to: '/profil-desa', label: 'Ringkasan & Identitas', icon: BookOpen, end: true },
  { to: '/profil-desa/sejarah', label: 'Sejarah & 3 Trah', icon: History },
  { to: '/profil-desa/wilayah', label: 'Peta & 7 Dusun', icon: Map },
  { to: '/profil-desa/pariwisata', label: 'Jelajah Wisata', icon: Compass },
  { to: '/profil-desa/budaya', label: 'Adat & Warisan', icon: Sparkles },
  { to: '/profil-desa/potensi-desa', label: 'Potensi Ekonomi', icon: TrendingUp },
  { to: '/profil-desa/galeri', label: 'Galeri Visual', icon: ImageIcon },
]

interface VillageSubnavProps {
  className?: string
}

export const VillageSubnav: React.FC<VillageSubnavProps> = ({ className = '' }) => {
  return (
    <div className={`sticky top-0 z-30 bg-warm-50/95 backdrop-blur-md border-b border-warm-300 py-2.5 transition-all ${className}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? 'bg-sage-800 text-white shadow-sm ring-1 ring-sage-900/20'
                      : 'text-charcoal-muted hover:text-charcoal hover:bg-warm-200/60'
                  }`
                }
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

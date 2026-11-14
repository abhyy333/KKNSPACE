import React, { useState, useEffect } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { PUBLIC_NAV } from '@/config/navigation'
import { Button } from '@/components/ui/button'
import { ArrowRight, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandLogo } from '@/components/brand/BrandLogo'

export const PublicNavbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile navigation drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <header className="sticky top-0 z-40 w-full border-b border-warm-300 bg-warm-100/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        {/* Brand with Location */}
        <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group min-w-0">
          <BrandLogo size="md" className="h-11 w-11 shrink-0 drop-shadow-xs group-hover:scale-105 transition-transform" />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 font-medium text-xs sm:text-sm text-charcoal truncate">
              <span className="font-semibold tracking-tight shrink-0">KKN SPACE</span>
              <span className="text-charcoal-muted shrink-0">·</span>
              <span className="text-charcoal truncate">Desa Pringgasela Selatan</span>
            </div>
            <span className="text-[11px] sm:text-xs text-charcoal-muted truncate">
              Universitas Mataram · KKN 2026
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5">
          {PUBLIC_NAV.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "px-2.5 xl:px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap",
                  isActive
                    ? "bg-[#1C3B29] text-white shadow-xs font-semibold"
                    : "text-[#243324] hover:text-[#1C3B29] hover:bg-[#EAE4D9]/60"
                )
              }
            >
              {item.title}
            </NavLink>
          ))}
        </nav>

        {/* Workspace Login CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <Link to="/workspace">
            <Button
              size="sm"
              className="bg-sage-700 hover:bg-sage-800 text-white gap-2 text-xs font-medium px-4 py-2 rounded-lg shadow-subtle shrink-0"
            >
              <span>Masuk Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-charcoal hover:bg-warm-200/60 rounded-md"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-warm-300 bg-warm-50 px-4 py-4 space-y-2">
          {PUBLIC_NAV.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  "block px-3 py-2 rounded-md text-sm font-medium",
                  isActive
                    ? "bg-sage-700 text-white"
                    : "text-charcoal hover:bg-warm-200/60"
                )
              }
            >
              {item.title}
            </NavLink>
          ))}
          <div className="pt-2 border-t border-warm-300">
            <Link
              to="/workspace"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 bg-sage-700 text-white py-2.5 px-4 rounded-md text-sm font-medium"
            >
              <span>Masuk Workspace</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { ADMIN_NAV } from '@/config/navigation'
import { cn } from '@/lib/utils'
import { Shield, Menu, X, LogOut, Home, Briefcase, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { BrandLogo } from '@/components/brand/BrandLogo'

const SIDEBAR_STORAGE_KEY = 'kkn_admin_sidebar_collapsed'

export const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  const { user, profile, membership, isSuperAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Close mobile drawer whenever location changes
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
      } catch {}
      return next
    })
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/auth/login')
  }

  const userEmail = user?.email || 'superadmin@kkn.ac.id'
  const displayName = profile?.full_name || 'Super Administrator'
  const hasWorkspaceAccess = isSuperAdmin || Boolean(membership && membership.status === 'active')
  const dualRoleSummary = membership
    ? `${membership.role.toUpperCase()}${membership.division ? ` · Div. ${membership.division}` : ''}`
    : 'Akses Sistem Penuh'

  return (
    <div className="flex min-h-screen bg-warm-100 text-charcoal">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-charcoal/30 backdrop-blur-xs lg:hidden transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Admin Sidebar — Sticky on desktop, drawer on mobile */}
      <aside
        className={cn(
          "bg-white border-r border-warm-300 flex flex-col z-50 transition-all duration-200 ease-in-out shrink-0",
          // Mobile Drawer
          "fixed inset-y-0 left-0 w-64 lg:static lg:translate-x-0 lg:z-30",
          sidebarOpen ? "translate-x-0 shadow-lg lg:shadow-none" : "-translate-x-full",
          // Desktop Fixed / Sticky
          "lg:sticky lg:top-0 lg:h-screen lg:max-h-[100dvh]",
          // Desktop Width: Collapsed vs Expanded
          collapsed ? "lg:w-[72px]" : "lg:w-64"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex h-16 items-center border-b border-warm-300 px-4",
            collapsed ? "lg:px-2.5 lg:justify-center" : "justify-between"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0" title="KKN SPACE — Admin Console">
              <BrandLogo size="md" className="h-9 w-9 drop-shadow-xs" />
              <div
                className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-charcoal text-warm-300 ring-1 ring-white"
                title="Super Admin Mode"
              >
                <Shield className="h-2.5 w-2.5" />
              </div>
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-charcoal tracking-wide uppercase truncate">
                  Admin Console
                </span>
                <span className="text-[11px] text-charcoal-muted truncate">
                  Platform Super Admin
                </span>
              </div>
            )}
          </div>

          {/* Desktop collapse toggle inside sidebar header */}
          {!collapsed && (
            <button
              onClick={toggleCollapsed}
              className="hidden lg:flex items-center justify-center p-1 rounded-md text-charcoal-muted hover:text-charcoal hover:bg-warm-100 transition-colors"
              title="Tutup Sidebar"
              aria-label="Tutup Sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}

          {/* Mobile close button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-md text-charcoal-muted hover:bg-warm-100 lg:hidden"
            aria-label="Tutup menu navigasi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Super admin user tag */}
        <div
          className={cn(
            "border-b border-warm-300 bg-warm-100/70 transition-all duration-200",
            collapsed ? "p-2 text-center" : "px-4 py-2.5 space-y-1"
          )}
        >
          {collapsed ? (
            <div
              className="flex items-center justify-center py-1 cursor-default"
              title={`${displayName}\n${userEmail}\nSuper Admin (${dualRoleSummary})`}
            >
              <div className="h-8 w-8 rounded-full bg-charcoal text-white text-[11px] font-semibold flex items-center justify-center shadow-subtle uppercase">
                {displayName.slice(0, 2)}
              </div>
            </div>
          ) : (
            <>
              <div className="text-[11px] text-charcoal-muted">Terautentikasi sebagai:</div>
              <div className="text-xs font-medium text-charcoal truncate" title={userEmail}>
                {displayName}
              </div>
              <div className="text-[10px] font-mono text-charcoal-muted truncate">
                {userEmail}
              </div>
              <div className="flex flex-wrap gap-1 pt-0.5">
                <span className="inline-flex items-center rounded bg-charcoal px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Super Admin
                </span>
                <span className="inline-flex items-center rounded bg-sage-100 px-1.5 py-0.5 text-[10px] font-medium text-sage-800">
                  {dualRoleSummary}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Nav List with Independent Scroll */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 overscroll-contain">
          {ADMIN_NAV.map((section) => (
            <div key={section.title} className="space-y-1">
              {!collapsed ? (
                <div className="px-2 pb-1 text-[11px] font-semibold tracking-wider text-charcoal-muted uppercase truncate">
                  {section.title}
                </div>
              ) : (
                <div className="my-2 border-t border-warm-200" title={section.title} />
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      end={item.href === "/admin"}
                      onClick={() => setSidebarOpen(false)}
                      title={collapsed ? item.title : undefined}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center rounded-md text-xs font-medium transition-colors",
                          collapsed
                            ? "justify-center p-2.5 h-10 w-full"
                            : "gap-2.5 px-2.5 py-1.5",
                          isActive
                            ? "bg-charcoal text-white shadow-subtle"
                            : "text-charcoal hover:bg-warm-100"
                        )
                      }
                    >
                      <Icon className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer shortcuts */}
        <div className="border-t border-warm-300 p-3 bg-warm-50 space-y-1.5">
          {hasWorkspaceAccess ? (
            <Link
              to="/workspace"
              title={collapsed ? "Buka Workspace KKN" : undefined}
              className={cn(
                "flex items-center rounded-md text-xs text-sage-800 bg-sage-100/60 hover:bg-sage-100 transition-colors font-medium",
                collapsed ? "justify-center p-2 h-9 w-full" : "gap-2 px-2 py-1.5"
              )}
            >
              <Briefcase className="h-4 w-4 shrink-0 text-sage-700" />
              {!collapsed && <span className="truncate">Buka Workspace KKN</span>}
            </Link>
          ) : (
            !collapsed && (
              <div className="px-2 py-1 text-[11px] text-charcoal-muted bg-warm-100 rounded border border-warm-200">
                <span className="font-medium text-charcoal block">Peran: Super Admin</span>
                <span>(Tanpa keanggotaan KKN)</span>
              </div>
            )
          )}

          <Link
            to="/"
            title={collapsed ? "Lihat Website Publik" : undefined}
            className={cn(
              "flex items-center rounded-md text-xs text-charcoal-muted hover:bg-warm-100 transition-colors",
              collapsed ? "justify-center p-2 h-9 w-full" : "gap-2 px-2 py-1.5"
            )}
          >
            <Home className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">Lihat Website Publik</span>}
          </Link>
        </div>
      </aside>

      {/* Main Admin Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-warm-300 bg-white/95 px-4 backdrop-blur-xs sm:px-6">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-1.5 text-charcoal hover:bg-warm-200/80 lg:hidden"
              aria-label="Buka menu sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Desktop collapse toggle button */}
            <button
              onClick={toggleCollapsed}
              className="hidden lg:flex items-center justify-center p-1.5 rounded-md text-charcoal-muted hover:text-charcoal hover:bg-warm-100 transition-colors"
              title={collapsed ? "Buka Sidebar (Expand)" : "Tutup Sidebar (Collapse)"}
              aria-label={collapsed ? "Buka Sidebar" : "Tutup Sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4 text-charcoal" />
              ) : (
                <PanelLeftClose className="h-4 w-4 text-charcoal" />
              )}
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-charcoal">Sistem Pusat KKN SPACE</span>
              <span className="text-warm-400">/</span>
              <span className="text-xs text-charcoal-muted truncate">Kelola Akses &amp; Audit</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-1.5 text-xs text-charcoal-muted hover:text-red-600"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          </div>
        </header>

        {/* Main page content area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          <div className="mx-auto max-w-7xl min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

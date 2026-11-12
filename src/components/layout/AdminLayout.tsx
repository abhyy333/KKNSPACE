import React, { useState } from 'react'
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { ADMIN_NAV } from '@/config/navigation'
import { cn } from '@/lib/utils'
import { Shield, Menu, X, LogOut, Home, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

export const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, profile, membership, isSuperAdmin, signOut } = useAuth()
  const navigate = useNavigate()

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
          className="fixed inset-0 z-40 bg-charcoal/20 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Admin Sidebar */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-warm-300 bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-warm-300 px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-charcoal text-white font-semibold text-xs shadow-subtle">
              <Shield className="h-4 w-4 text-warm-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-charcoal tracking-wide uppercase">
                Admin Console
              </span>
              <span className="text-[11px] text-charcoal-muted">
                Platform Super Admin
              </span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-md text-charcoal-muted hover:bg-warm-100 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Super admin user tag */}
        <div className="px-4 py-2.5 bg-warm-100/70 border-b border-warm-300 space-y-1">
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
        </div>

        {/* Nav List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {ADMIN_NAV.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-2 pb-1 text-[11px] font-semibold tracking-wider text-charcoal-muted uppercase">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      end={item.href === "/admin"}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                          isActive
                            ? "bg-charcoal text-white shadow-subtle"
                            : "text-charcoal hover:bg-warm-100"
                        )
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
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
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sage-800 bg-sage-100/60 hover:bg-sage-100 transition-colors font-medium"
            >
              <Briefcase className="h-3.5 w-3.5 text-sage-700" />
              <span>Buka Workspace KKN</span>
            </Link>
          ) : (
            <div className="px-2 py-1 text-[11px] text-charcoal-muted bg-warm-100 rounded border border-warm-200">
              <span className="font-medium text-charcoal block">Peran: Super Admin</span>
              <span>(Tanpa keanggotaan KKN)</span>
            </div>
          )}

          <Link
            to="/"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-charcoal-muted hover:bg-warm-100 transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Lihat Website Publik</span>
          </Link>
        </div>
      </aside>

      {/* Main Admin Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-warm-300 bg-white/95 px-4 backdrop-blur-xs sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-1.5 text-charcoal hover:bg-warm-200/80 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-charcoal">Sistem Pusat KKN SPACE</span>
              <span className="text-warm-400">/</span>
              <span className="text-xs text-charcoal-muted">Kelola Akses & Audit</span>
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
              <span>Keluar</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

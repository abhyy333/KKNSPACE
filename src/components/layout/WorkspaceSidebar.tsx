import React from 'react'
import { NavLink } from 'react-router-dom'
import { WORKSPACE_NAV } from '@/config/navigation'
import { cn } from '@/lib/utils'
import { ArrowLeft, Shield, Sparkles } from 'lucide-react'

interface WorkspaceSidebarProps {
  isOpen: boolean
  onClose?: () => void
  userRole?: string
  isSuperAdmin?: boolean
  groupName?: string
  villageName?: string
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  isOpen,
  onClose,
  userRole = "Anggota",
  isSuperAdmin = false,
  groupName = "KKN SPACE",
  villageName = "Desa belum diatur",
}) => {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-charcoal/20 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-warm-300 bg-warm-50 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Workspace Brand / Group Info */}
        <div className="flex h-16 items-center justify-between border-b border-warm-300 px-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sage-700 text-white font-semibold text-sm shadow-subtle">
              {groupName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-xs font-semibold text-charcoal">
                {groupName}
              </span>
              <span className="truncate text-[11px] text-charcoal-muted">
                {villageName}
              </span>
            </div>
          </div>
        </div>

        {/* User Role Tag */}
        <div className="px-4 py-3 bg-warm-100/60 border-b border-warm-300 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-charcoal-muted min-w-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0" />
            <span className="shrink-0">Peran:</span>
            <span
              className="font-medium text-sage-800 bg-sage-100 px-2 py-0.5 rounded text-[11px] truncate"
              title={userRole}
            >
              {userRole}
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {WORKSPACE_NAV.map((section) => (
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
                      end={item.href === "/workspace"}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                          isActive
                            ? "bg-sage-600 text-white shadow-subtle"
                            : "text-charcoal hover:bg-warm-200/70"
                        )
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0 transition-opacity" />
                      <span className="truncate">{item.title}</span>
                      {item.badge && (
                        <span className="ml-auto rounded-full bg-sage-200 px-1.5 py-0.2 text-[10px] text-sage-800 font-mono">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info & Public site link */}
        <div className="border-t border-warm-300 p-3 bg-warm-50 space-y-2">
          {isSuperAdmin && (
            <NavLink
              to="/admin"
              onClick={onClose}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-sage-800 bg-sage-100/70 hover:bg-sage-100 transition-colors"
            >
              <Shield className="h-3.5 w-3.5 text-sage-700" />
              <span>Admin Console</span>
            </NavLink>
          )}
          <NavLink
            to="/"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-charcoal-muted hover:text-charcoal hover:bg-warm-200/60 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Halaman Publik Desa</span>
          </NavLink>
          <div className="flex items-center gap-2 px-2 text-[10px] text-charcoal-light">
            <Sparkles className="h-3 w-3 text-sage-500" />
            <span>KKN Kolaborasi 2026</span>
          </div>
        </div>
      </aside>
    </>
  )
}

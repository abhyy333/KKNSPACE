import React, { useEffect, useRef, useState } from 'react'
import { Menu, Bell, Shield, LogOut, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { Announcement } from '@/types/database'

interface WorkspaceTopbarProps {
  onToggleSidebar: () => void
  userEmail: string
  userName: string
  userRole: string
  isSuperAdmin: boolean
  villageName?: string
  notifications?: Announcement[]
  isLoadingNotifications?: boolean
}

export const WorkspaceTopbar: React.FC<WorkspaceTopbarProps> = ({
  onToggleSidebar,
  userEmail,
  userName,
  userRole,
  isSuperAdmin,
  villageName = 'Desa belum diatur',
  notifications = [],
  isLoadingNotifications = false,
}) => {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [notifOpen, setNotifOpen] = useState(false)
  const notifContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!notifOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notifContainerRef.current &&
        !notifContainerRef.current.contains(event.target as Node)
      ) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [notifOpen])

  const handleLogout = async () => {
    await signOut()
    navigate('/auth/login')
  }

  const poskoLabel =
    villageName && villageName !== 'Desa belum diatur'
      ? `Posko ${villageName}`
      : 'Posko Desa (Belum Diatur)'

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-warm-300 bg-white/95 px-4 backdrop-blur-xs sm:px-6">
      {/* Left side: Hamburger button + Context Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-md p-1.5 text-charcoal hover:bg-warm-200/80 lg:hidden focus:outline-none"
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-charcoal tracking-wide uppercase shrink-0">
            Ruang Kerja
          </span>
          <span className="text-warm-400 shrink-0">/</span>
          <span className="text-xs text-charcoal-muted truncate">{poskoLabel}</span>
        </div>
      </div>

      {/* Right side: Super admin shortcut, notifications, and profile */}
      <div className="flex items-center gap-3">
        {isSuperAdmin && (
          <Link to="/admin">
            <Button variant="outline" size="sm" className="hidden sm:flex gap-1.5 text-xs text-sage-800 border-sage-300 bg-sage-50 hover:bg-sage-100">
              <Shield className="h-3.5 w-3.5 text-sage-600" />
              <span>Admin Console</span>
            </Button>
          </Link>
        )}

        <div className="relative" ref={notifContainerRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((prev) => !prev)}
            className="rounded-full p-2 text-charcoal-muted hover:bg-warm-200/60 hover:text-charcoal transition-colors relative"
            aria-label="Notifikasi pengumuman"
            aria-expanded={notifOpen}
          >
            <Bell className="h-4 w-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-sage-600 ring-2 ring-white" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg border border-warm-300 bg-white shadow-lg z-50 overflow-hidden">
              <div className="flex items-center justify-between border-b border-warm-200 px-3.5 py-2.5 bg-warm-50">
                <span className="text-xs font-semibold text-charcoal">
                  Pengumuman Terbaru
                </span>
                <span className="text-[11px] text-charcoal-muted">
                  {notifications.length} aktif
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-warm-200">
                {isLoadingNotifications ? (
                  <div className="p-4 text-xs text-charcoal-muted text-center">
                    Memuat pengumuman...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-5 text-center space-y-1.5">
                    <Megaphone className="h-5 w-5 text-warm-400 mx-auto" />
                    <p className="text-xs font-medium text-charcoal">
                      Belum ada pengumuman
                    </p>
                    <p className="text-[11px] text-charcoal-muted">
                      Pengumuman terpublikasi dari Ketua, Sekretaris, atau DPL akan muncul di sini.
                    </p>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div key={item.id} className="p-3.5 hover:bg-warm-50/70 transition-colors">
                      <p className="text-xs font-semibold text-charcoal line-clamp-1">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-charcoal-muted mt-1 line-clamp-2">
                        {item.content}
                      </p>
                      {item.published_at && (
                        <p className="text-[10px] text-sage-700 mt-1.5">
                          {new Date(item.published_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-warm-200 bg-warm-50/60 px-3.5 py-2 text-right">
                <Link
                  to="/workspace"
                  onClick={() => setNotifOpen(false)}
                  className="text-[11px] font-medium text-sage-700 hover:text-sage-800"
                >
                  Lihat di Ringkasan Workspace &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-[1px] bg-warm-300 mx-1" />

        {/* User profile shortcut & sign out */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/workspace/profile"
            className="flex items-center gap-2.5 rounded-md px-1.5 py-1 hover:bg-warm-100 transition-colors"
            title="Buka Profil Saya"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sage-100 text-sage-800 font-semibold text-xs border border-sage-200">
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-medium text-charcoal truncate max-w-[160px]">
                {userName}
              </span>
              <span className="text-[10px] text-charcoal-muted truncate max-w-[200px]" title={userRole}>
                {userRole}
              </span>
            </div>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title={`Keluar (${userEmail})`}
            className="text-charcoal-muted hover:text-red-600 h-8 w-8"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}

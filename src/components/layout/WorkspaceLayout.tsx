import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { WorkspaceSidebar } from './WorkspaceSidebar'
import { WorkspaceTopbar } from './WorkspaceTopbar'
import { useAuth } from '@/hooks/useAuth'
import {
  fetchGroupSettings,
  fetchPublishedAnnouncementsPreview,
} from '@/services/dashboardApi'

const ROLE_LABELS: Record<string, string> = {
  ketua: 'Ketua KKN',
  sekretaris: 'Sekretaris KKN',
  bendahara: 'Bendahara KKN',
  anggota: 'Anggota KKN',
  dpl: 'DPL (Dosen Pembimbing)',
}

export const WorkspaceLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, profile, membership, isSuperAdmin } = useAuth()

  const { data: groupSettings } = useQuery({
    queryKey: ['workspace', 'group-settings'],
    queryFn: fetchGroupSettings,
    staleTime: 60_000,
  })

  const { data: publishedAnnouncements = [], isLoading: isLoadingNotifications } = useQuery({
    queryKey: ['workspace', 'announcements-preview'],
    queryFn: fetchPublishedAnnouncementsPreview,
    staleTime: 30_000,
  })

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Anggota Posko'
  const baseRole = membership?.role
    ? ROLE_LABELS[membership.role] || membership.role
    : isSuperAdmin
      ? 'Super Admin'
      : 'Anggota KKN'
  const roleWithDivision = membership?.division ? `${baseRole} · Div. ${membership.division}` : baseRole
  const displayRole =
    isSuperAdmin && membership?.role ? `Super Admin · ${roleWithDivision}` : roleWithDivision
  const displayEmail = user?.email || ''
  const groupName = groupSettings?.group_name?.trim() || 'KKN SPACE'
  const villageName = groupSettings?.village_name?.trim() || 'Desa belum diatur'

  return (
    <div className="flex h-screen h-[100dvh] w-full overflow-hidden bg-warm-100 text-charcoal">
      {/* Sidebar Navigation */}
      <WorkspaceSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={displayRole}
        isSuperAdmin={isSuperAdmin}
        groupName={groupName}
        villageName={villageName}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col h-full min-w-0 overflow-hidden">
        <WorkspaceTopbar
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          userName={displayName}
          userRole={displayRole}
          userEmail={displayEmail}
          isSuperAdmin={isSuperAdmin}
          villageName={villageName}
          notifications={publishedAnnouncements}
          isLoadingNotifications={isLoadingNotifications}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 min-w-0 overscroll-y-contain">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

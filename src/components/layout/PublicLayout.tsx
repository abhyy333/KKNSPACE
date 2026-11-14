import React from 'react'
import { Outlet } from 'react-router-dom'
import { PublicSponsorMarquee } from '@/components/public/PublicSponsorMarquee'
import { PublicNavbar } from './PublicNavbar'
import { PublicFooter } from './PublicFooter'
import { useMaintenanceConfig } from '@/hooks/useMaintenance'
import { useAuth } from '@/hooks/useAuth'
import { MaintenancePage } from '@/components/ui/MaintenancePage'

export const PublicLayout: React.FC = () => {
  const { data: maintenanceConfig, refetch } = useMaintenanceConfig()
  const { isSuperAdmin } = useAuth()

  // Intercept if maintenance is active for public portal or whole platform
  if (
    maintenanceConfig?.is_enabled &&
    (maintenanceConfig.scope === 'all' || maintenanceConfig.scope === 'public')
  ) {
    return (
      <MaintenancePage
        config={maintenanceConfig}
        onRetry={refetch}
        isSuperAdminBypass={isSuperAdmin}
      />
    )
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-warm-100 text-charcoal">
      <PublicSponsorMarquee />
      <PublicNavbar />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}

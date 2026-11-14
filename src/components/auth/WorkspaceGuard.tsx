import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useMaintenanceConfig } from '@/hooks/useMaintenance'
import { MaintenancePage } from '@/components/ui/MaintenancePage'
import { Loader2 } from 'lucide-react'

export const WorkspaceGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, membership, profile, isSuperAdmin, isLoading } = useAuth()
  const { data: maintenanceConfig, refetch } = useMaintenanceConfig()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-warm-100 flex flex-col justify-center items-center">
        <Loader2 className="h-8 w-8 text-sage-600 animate-spin" />
        <span className="mt-3 text-xs text-charcoal-muted">Memverifikasi keanggotaan kelompok KKN...</span>
      </div>
    )
  }

  // Intercept if maintenance mode is active for workspace
  if (
    maintenanceConfig?.is_enabled &&
    (maintenanceConfig.scope === 'all' || maintenanceConfig.scope === 'workspace')
  ) {
    // If not super admin, block access with branded maintenance page
    if (!isSuperAdmin) {
      return (
        <MaintenancePage
          config={maintenanceConfig}
          onRetry={refetch}
          isSuperAdminBypass={false}
        />
      )
    }
  }

  if (!isAuthenticated) {
    return <Navigate to={`/auth/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }

  if (profile && !profile.is_active) {
    return <Navigate to="/unauthorized?reason=inactive" replace />
  }

  // Super Admin has full operational access to workspace even without KKN membership
  if (!isSuperAdmin && (!membership || membership.status !== 'active')) {
    return <Navigate to="/unauthorized?reason=no_membership" replace />
  }

  return <>{children}</>
}

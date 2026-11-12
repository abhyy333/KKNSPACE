import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

export const WorkspaceGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, membership, profile, isSuperAdmin, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-warm-100 flex flex-col justify-center items-center">
        <Loader2 className="h-8 w-8 text-sage-600 animate-spin" />
        <span className="mt-3 text-xs text-charcoal-muted">Memverifikasi keanggotaan kelompok KKN...</span>
      </div>
    )
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

import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

export const SuperAdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isSuperAdmin, profile, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-warm-100 flex flex-col justify-center items-center">
        <Loader2 className="h-8 w-8 text-sage-600 animate-spin" />
        <span className="mt-3 text-xs text-charcoal-muted">Memverifikasi hak akses Super Admin...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={`/auth/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }

  if (profile && !profile.is_active) {
    return <Navigate to="/unauthorized?reason=inactive" replace />
  }

  if (!isSuperAdmin) {
    return <Navigate to="/unauthorized?reason=admin_only" replace />
  }

  return <>{children}</>
}

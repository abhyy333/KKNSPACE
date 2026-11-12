import React from 'react'
import { Outlet } from 'react-router-dom'
import { PublicNavbar } from './PublicNavbar'
import { PublicFooter } from './PublicFooter'

export const PublicLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-warm-100 text-charcoal">
      <PublicNavbar />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}

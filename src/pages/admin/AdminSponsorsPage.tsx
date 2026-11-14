import React from 'react'
import { SponsorsManagementView } from '@/components/sponsors/SponsorsManagementView'

export const AdminSponsorsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <SponsorsManagementView baseContext="admin" />
    </div>
  )
}

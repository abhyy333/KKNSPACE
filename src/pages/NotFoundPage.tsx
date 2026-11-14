import React from 'react'
import { BrandedRouteError } from '@/components/ui/BrandedRouteError'

export const NotFoundPage: React.FC = () => {
  return <BrandedRouteError error={{ status: 404, statusText: 'Not Found' }} />
}

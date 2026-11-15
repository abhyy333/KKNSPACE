import React from 'react'
import { useLocation, Navigate } from 'react-router-dom'

export const LocalizedRouteSync: React.FC = () => {
  const location = useLocation()
  // Cleanly redirect legacy locale prefixes to the canonical Indonesian URL
  const stripped = location.pathname.replace(/^\/(en-us|en-gb|zh-cn|ru-ru)(\/|$)/i, '/')
  const canonicalPath = stripped.startsWith('/') ? stripped : `/${stripped}`
  return <Navigate to={`${canonicalPath}${location.search}${location.hash}`} replace />
}

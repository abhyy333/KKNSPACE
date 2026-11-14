import React, { Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { WorkspaceGuard } from '@/components/auth/WorkspaceGuard'
import { SuperAdminGuard } from '@/components/auth/SuperAdminGuard'
import { BrandedRouteError } from '@/components/ui/BrandedRouteError'
import { lazyWithRetry } from '@/lib/lazyWithRetry'

const RouteFallback: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center bg-warm-100 text-charcoal px-4">
    <Loader2 className="h-7 w-7 text-sage-600 animate-spin" />
    <span className="mt-3 text-xs text-charcoal-muted">Memuat halaman KKN SPACE...</span>
  </div>
)

function withSuspense(node: React.ReactNode): React.ReactElement {
  return <Suspense fallback={<RouteFallback />}>{node}</Suspense>
}

// Lazy Layouts (with dynamic retry protection)
const WorkspaceLayout = lazyWithRetry(() =>
  import('@/components/layout/WorkspaceLayout').then((m) => ({ default: m.WorkspaceLayout })),
  'WorkspaceLayout'
)
const AdminLayout = lazyWithRetry(() =>
  import('@/components/layout/AdminLayout').then((m) => ({ default: m.AdminLayout })),
  'AdminLayout'
)

// Public Pages (lazy route chunks protected with single auto-reload on version updates)
const HomePage = lazyWithRetry(() =>
  import('@/pages/public/HomePage').then((m) => ({ default: m.HomePage })),
  'HomePage'
)
const TeamPage = lazyWithRetry(() =>
  import('@/pages/public/TeamPage').then((m) => ({ default: m.TeamPage })),
  'TeamPage'
)
const ProgramsPage = lazyWithRetry(() =>
  import('@/pages/public/ProgramsPage').then((m) => ({ default: m.ProgramsPage })),
  'ProgramsPage'
)
const DocumentationPage = lazyWithRetry(() =>
  import('@/pages/public/DocumentationPage').then((m) => ({ default: m.DocumentationPage })),
  'DocumentationPage'
)
const DocumentationDetailPage = lazyWithRetry(() =>
  import('@/pages/public/DocumentationDetailPage').then((m) => ({ default: m.DocumentationDetailPage })),
  'DocumentationDetailPage'
)
const VillageProfilePage = lazyWithRetry(() =>
  import('@/pages/public/VillageProfilePage').then((m) => ({ default: m.VillageProfilePage })),
  'VillageProfilePage'
)
const VillageHistoryPage = lazyWithRetry(() =>
  import('@/pages/public/VillageHistoryPage').then((m) => ({ default: m.VillageHistoryPage })),
  'VillageHistoryPage'
)
const VillageTerritoryPage = lazyWithRetry(() =>
  import('@/pages/public/VillageTerritoryPage').then((m) => ({ default: m.VillageTerritoryPage })),
  'VillageTerritoryPage'
)
const VillageTourismPage = lazyWithRetry(() =>
  import('@/pages/public/VillageTourismPage').then((m) => ({ default: m.VillageTourismPage })),
  'VillageTourismPage'
)
const VillageCulturePage = lazyWithRetry(() =>
  import('@/pages/public/VillageCulturePage').then((m) => ({ default: m.VillageCulturePage })),
  'VillageCulturePage'
)
const VillageEconomyPage = lazyWithRetry(() =>
  import('@/pages/public/VillageEconomyPage').then((m) => ({ default: m.VillageEconomyPage })),
  'VillageEconomyPage'
)
const VillageGalleryPage = lazyWithRetry(() =>
  import('@/pages/public/VillageGalleryPage').then((m) => ({ default: m.VillageGalleryPage })),
  'VillageGalleryPage'
)
const TimelineKknPage = lazyWithRetry(() =>
  import('@/pages/public/TimelineKknPage').then((m) => ({ default: m.TimelineKknPage })),
  'TimelineKknPage'
)

// Workspace Pages
const OverviewPage = lazyWithRetry(() =>
  import('@/pages/workspace/OverviewPage').then((m) => ({ default: m.OverviewPage })),
  'OverviewPage'
)
const AgendaPage = lazyWithRetry(() =>
  import('@/pages/workspace/AgendaPage').then((m) => ({ default: m.AgendaPage })),
  'AgendaPage'
)
const DutyPage = lazyWithRetry(() =>
  import('@/pages/workspace/DutyPage').then((m) => ({ default: m.DutyPage })),
  'DutyPage'
)
const ProgramsWorkspacePage = lazyWithRetry(() =>
  import('@/pages/workspace/ProgramsWorkspacePage').then((m) => ({
    default: m.ProgramsWorkspacePage,
  })),
  'ProgramsWorkspacePage'
)
const TasksPage = lazyWithRetry(() =>
  import('@/pages/workspace/TasksPage').then((m) => ({ default: m.TasksPage })),
  'TasksPage'
)
const DocumentationWorkspacePage = lazyWithRetry(() =>
  import('@/pages/workspace/DocumentationWorkspacePage').then((m) => ({
    default: m.DocumentationWorkspacePage,
  })),
  'DocumentationWorkspacePage'
)
const DocumentsPage = lazyWithRetry(() =>
  import('@/pages/workspace/DocumentsPage').then((m) => ({ default: m.DocumentsPage })),
  'DocumentsPage'
)
const MembersPage = lazyWithRetry(() =>
  import('@/pages/workspace/MembersPage').then((m) => ({ default: m.MembersPage })),
  'MembersPage'
)
const ProfilePage = lazyWithRetry(() =>
  import('@/pages/workspace/ProfilePage').then((m) => ({ default: m.ProfilePage })),
  'ProfilePage'
)
const SettingsPage = lazyWithRetry(() =>
  import('@/pages/workspace/SettingsPage').then((m) => ({ default: m.SettingsPage })),
  'SettingsPage'
)
const MeetingsPage = lazyWithRetry(() =>
  import('@/pages/workspace/MeetingsPage').then((m) => ({ default: m.MeetingsPage })),
  'MeetingsPage'
)
const FinancePage = lazyWithRetry(() =>
  import('@/pages/workspace/FinancePage').then((m) => ({ default: m.FinancePage })),
  'FinancePage'
)
const InventoryPage = lazyWithRetry(() =>
  import('@/pages/workspace/InventoryPage').then((m) => ({ default: m.InventoryPage })),
  'InventoryPage'
)
const SurveysPage = lazyWithRetry(() =>
  import('@/pages/workspace/SurveysPage').then((m) => ({ default: m.SurveysPage })),
  'SurveysPage'
)
const FinalReportPage = lazyWithRetry(() =>
  import('@/pages/workspace/FinalReportPage').then((m) => ({ default: m.FinalReportPage })),
  'FinalReportPage'
)
const RiskRegisterPage = lazyWithRetry(() =>
  import('@/pages/workspace/RiskRegisterPage').then((m) => ({ default: m.RiskRegisterPage })),
  'RiskRegisterPage'
)

// Admin Pages
const AdminOverviewPage = lazyWithRetry(() =>
  import('@/pages/admin/AdminOverviewPage').then((m) => ({ default: m.AdminOverviewPage })),
  'AdminOverviewPage'
)
const AdminUsersPage = lazyWithRetry(() =>
  import('@/pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })),
  'AdminUsersPage'
)
const AdminInvitationsPage = lazyWithRetry(() =>
  import('@/pages/admin/AdminInvitationsPage').then((m) => ({ default: m.AdminInvitationsPage })),
  'AdminInvitationsPage'
)
const AdminKknConfigPage = lazyWithRetry(() =>
  import('@/pages/admin/AdminKknConfigPage').then((m) => ({ default: m.AdminKknConfigPage })),
  'AdminKknConfigPage'
)
const AdminVillagePage = lazyWithRetry(() =>
  import('@/pages/admin/AdminVillagePage').then((m) => ({ default: m.AdminVillagePage })),
  'AdminVillagePage'
)
const AdminAuditPage = lazyWithRetry(() =>
  import('@/pages/admin/AdminAuditPage').then((m) => ({ default: m.AdminAuditPage })),
  'AdminAuditPage'
)
const AdminSettingsPage = lazyWithRetry(() =>
  import('@/pages/admin/AdminPages').then((m) => ({ default: m.AdminSettingsPage })),
  'AdminSettingsPage'
)
const AdminMaintenancePage = lazyWithRetry(() =>
  import('@/pages/admin/AdminMaintenancePage').then((m) => ({ default: m.AdminMaintenancePage })),
  'AdminMaintenancePage'
)
const AdminTimelinePage = lazyWithRetry(() =>
  import('@/pages/admin/AdminTimelinePage').then((m) => ({ default: m.AdminTimelinePage })),
  'AdminTimelinePage'
)

// Auth & Fallback Pages
const LoginPage = lazyWithRetry(() =>
  import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
  'LoginPage'
)
const ForgotPasswordPage = lazyWithRetry(() =>
  import('@/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
  'ForgotPasswordPage'
)
const ResetPasswordPage = lazyWithRetry(() =>
  import('@/pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
  'ResetPasswordPage'
)
const AcceptInvitePage = lazyWithRetry(() =>
  import('@/pages/auth/AcceptInvitePage').then((m) => ({ default: m.AcceptInvitePage })),
  'AcceptInvitePage'
)
const UnauthorizedPage = lazyWithRetry(() =>
  import('@/pages/auth/UnauthorizedPage').then((m) => ({ default: m.UnauthorizedPage })),
  'UnauthorizedPage'
)
const NotFoundPage = lazyWithRetry(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
  'NotFoundPage'
)

export const router = createBrowserRouter([
  // Public Portal
  {
    path: '/',
    element: <PublicLayout />,
    errorElement: <BrandedRouteError />,
    children: [
      { index: true, element: withSuspense(<HomePage />) },
      { path: 'tim', element: withSuspense(<TeamPage />) },
      { path: 'program-kerja', element: withSuspense(<ProgramsPage />) },
      { path: 'dokumentasi', element: withSuspense(<DocumentationPage />) },
      { path: 'dokumentasi/:slug', element: withSuspense(<DocumentationDetailPage />) },
      { path: 'profil-desa', element: withSuspense(<VillageProfilePage />) },
      { path: 'profil-desa/sejarah', element: withSuspense(<VillageHistoryPage />) },
      { path: 'profil-desa/wilayah', element: withSuspense(<VillageTerritoryPage />) },
      { path: 'profil-desa/pariwisata', element: withSuspense(<VillageTourismPage />) },
      { path: 'profil-desa/budaya', element: withSuspense(<VillageCulturePage />) },
      { path: 'profil-desa/potensi-desa', element: withSuspense(<VillageEconomyPage />) },
      { path: 'profil-desa/potensi', element: <Navigate to="/profil-desa/potensi-desa" replace /> },
      { path: 'profil-desa/galeri', element: withSuspense(<VillageGalleryPage />) },
      { path: 'timeline-kkn', element: withSuspense(<TimelineKknPage />) },
      { path: 'timeline', element: <Navigate to="/timeline-kkn" replace /> },
      { path: 'roadmap', element: <Navigate to="/timeline-kkn" replace /> },
    ],
  },

  // Private Workspace (Requires Active KKN Membership & Active Profile)
  {
    path: '/workspace',
    element: (
      <WorkspaceGuard>
        {withSuspense(<WorkspaceLayout />)}
      </WorkspaceGuard>
    ),
    errorElement: <BrandedRouteError />,
    children: [
      { index: true, element: withSuspense(<OverviewPage />) },
      { path: 'agenda', element: withSuspense(<AgendaPage />) },
      { path: 'programs', element: withSuspense(<ProgramsWorkspacePage />) },
      { path: 'tasks', element: withSuspense(<TasksPage />) },
      { path: 'meetings', element: withSuspense(<MeetingsPage />) },
      { path: 'finance', element: withSuspense(<FinancePage />) },
      { path: 'inventory', element: withSuspense(<InventoryPage />) },
      { path: 'surveys', element: withSuspense(<SurveysPage />) },
      { path: 'risks', element: withSuspense(<RiskRegisterPage />) },
      { path: 'logbook', element: <Navigate to="/workspace" replace /> },
      { path: 'duty', element: withSuspense(<DutyPage />) },
      { path: 'documentation', element: withSuspense(<DocumentationWorkspacePage />) },
      { path: 'documents', element: withSuspense(<DocumentsPage />) },
      { path: 'final-report', element: withSuspense(<FinalReportPage />) },
      { path: 'report', element: <Navigate to="/workspace/final-report" replace /> },
      { path: 'members', element: withSuspense(<MembersPage />) },
      { path: 'profile', element: withSuspense(<ProfilePage />) },
      { path: 'settings', element: withSuspense(<SettingsPage />) },
    ],
  },

  // Admin Console (Strictly Super Admin Only)
  {
    path: '/admin',
    element: (
      <SuperAdminGuard>
        {withSuspense(<AdminLayout />)}
      </SuperAdminGuard>
    ),
    errorElement: <BrandedRouteError />,
    children: [
      { index: true, element: withSuspense(<AdminOverviewPage />) },
      { path: 'users', element: withSuspense(<AdminUsersPage />) },
      { path: 'invitations', element: withSuspense(<AdminInvitationsPage />) },
      { path: 'kkn-config', element: withSuspense(<AdminKknConfigPage />) },
      { path: 'timeline', element: withSuspense(<AdminTimelinePage />) },
      { path: 'village', element: withSuspense(<AdminVillagePage />) },
      { path: 'audit', element: withSuspense(<AdminAuditPage />) },
      { path: 'maintenance', element: withSuspense(<AdminMaintenancePage />) },
      { path: 'settings', element: withSuspense(<AdminSettingsPage />) },
    ],
  },

  // Auth Routes
  {
    path: '/auth',
    errorElement: <BrandedRouteError />,
    children: [
      { path: 'login', element: withSuspense(<LoginPage />) },
      { path: 'forgot-password', element: withSuspense(<ForgotPasswordPage />) },
      { path: 'reset-password', element: withSuspense(<ResetPasswordPage />) },
      { path: 'accept-invite', element: withSuspense(<AcceptInvitePage />) },
    ],
  },

  // Auth Route Aliases
  { path: '/login', element: <Navigate to="/auth/login" replace /> },
  { path: '/forgot-password', element: <Navigate to="/auth/forgot-password" replace /> },
  { path: '/reset-password', element: <Navigate to="/auth/reset-password" replace /> },

  // Access Control / Unauthorized
  {
    path: '/unauthorized',
    element: withSuspense(<UnauthorizedPage />),
    errorElement: <BrandedRouteError />,
  },

  // 404
  {
    path: '*',
    element: withSuspense(<NotFoundPage />),
    errorElement: <BrandedRouteError />,
  },
])

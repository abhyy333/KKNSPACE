import React, { Suspense, lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { WorkspaceGuard } from '@/components/auth/WorkspaceGuard'
import { SuperAdminGuard } from '@/components/auth/SuperAdminGuard'

const RouteFallback: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center bg-warm-100 text-charcoal px-4">
    <Loader2 className="h-7 w-7 text-sage-600 animate-spin" />
    <span className="mt-3 text-xs text-charcoal-muted">Memuat halaman KKN SPACE...</span>
  </div>
)

function withSuspense(node: React.ReactNode): React.ReactElement {
  return <Suspense fallback={<RouteFallback />}>{node}</Suspense>
}

// Lazy Layouts (prevents Workspace/Admin code from loading on Public Portal)
const WorkspaceLayout = lazy(() =>
  import('@/components/layout/WorkspaceLayout').then((m) => ({ default: m.WorkspaceLayout }))
)
const AdminLayout = lazy(() =>
  import('@/components/layout/AdminLayout').then((m) => ({ default: m.AdminLayout }))
)

// Public Pages (lazy route chunks)
const HomePage = lazy(() =>
  import('@/pages/public/HomePage').then((m) => ({ default: m.HomePage }))
)
const TeamPage = lazy(() =>
  import('@/pages/public/TeamPage').then((m) => ({ default: m.TeamPage }))
)
const ProgramsPage = lazy(() =>
  import('@/pages/public/ProgramsPage').then((m) => ({ default: m.ProgramsPage }))
)
const DocumentationPage = lazy(() =>
  import('@/pages/public/DocumentationPage').then((m) => ({ default: m.DocumentationPage }))
)
const DocumentationDetailPage = lazy(() =>
  import('@/pages/public/DocumentationDetailPage').then((m) => ({ default: m.DocumentationDetailPage }))
)
const VillageProfilePage = lazy(() =>
  import('@/pages/public/VillageProfilePage').then((m) => ({ default: m.VillageProfilePage }))
)

// Workspace Pages (strictly isolated from public bundle)
const OverviewPage = lazy(() =>
  import('@/pages/workspace/OverviewPage').then((m) => ({ default: m.OverviewPage }))
)
const AgendaPage = lazy(() =>
  import('@/pages/workspace/AgendaPage').then((m) => ({ default: m.AgendaPage }))
)
const DutyPage = lazy(() =>
  import('@/pages/workspace/DutyPage').then((m) => ({ default: m.DutyPage }))
)
const ProgramsWorkspacePage = lazy(() =>
  import('@/pages/workspace/ProgramsWorkspacePage').then((m) => ({
    default: m.ProgramsWorkspacePage,
  }))
)
const TasksPage = lazy(() =>
  import('@/pages/workspace/TasksPage').then((m) => ({ default: m.TasksPage }))
)
const DocumentationWorkspacePage = lazy(() =>
  import('@/pages/workspace/DocumentationWorkspacePage').then((m) => ({
    default: m.DocumentationWorkspacePage,
  }))
)
const DocumentsPage = lazy(() =>
  import('@/pages/workspace/DocumentsPage').then((m) => ({ default: m.DocumentsPage }))
)
const MembersPage = lazy(() =>
  import('@/pages/workspace/MembersPage').then((m) => ({ default: m.MembersPage }))
)
const ProfilePage = lazy(() =>
  import('@/pages/workspace/ProfilePage').then((m) => ({ default: m.ProfilePage }))
)
const SettingsPage = lazy(() =>
  import('@/pages/workspace/SettingsPage').then((m) => ({ default: m.SettingsPage }))
)
const MeetingsPage = lazy(() =>
  import('@/pages/workspace/MeetingsPage').then((m) => ({ default: m.MeetingsPage }))
)
const FinancePage = lazy(() =>
  import('@/pages/workspace/FinancePage').then((m) => ({ default: m.FinancePage }))
)
const InventoryPage = lazy(() =>
  import('@/pages/workspace/InventoryPage').then((m) => ({ default: m.InventoryPage }))
)
const SurveysPage = lazy(() =>
  import('@/pages/workspace/SurveysPage').then((m) => ({ default: m.SurveysPage }))
)

// Admin Pages (strictly isolated from public bundle)
const AdminOverviewPage = lazy(() =>
  import('@/pages/admin/AdminOverviewPage').then((m) => ({ default: m.AdminOverviewPage }))
)
const AdminUsersPage = lazy(() =>
  import('@/pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage }))
)
const AdminInvitationsPage = lazy(() =>
  import('@/pages/admin/AdminInvitationsPage').then((m) => ({ default: m.AdminInvitationsPage }))
)
const AdminKknConfigPage = lazy(() =>
  import('@/pages/admin/AdminKknConfigPage').then((m) => ({ default: m.AdminKknConfigPage }))
)
const AdminAuditPage = lazy(() =>
  import('@/pages/admin/AdminAuditPage').then((m) => ({ default: m.AdminAuditPage }))
)
const AdminSettingsPage = lazy(() =>
  import('@/pages/admin/AdminPages').then((m) => ({ default: m.AdminSettingsPage }))
)

// Auth & Fallback Pages (lazy loaded so form libs stay out of public portal initial bundle)
const LoginPage = lazy(() =>
  import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage }))
)
const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage }))
)
const ResetPasswordPage = lazy(() =>
  import('@/pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage }))
)
const AcceptInvitePage = lazy(() =>
  import('@/pages/auth/AcceptInvitePage').then((m) => ({ default: m.AcceptInvitePage }))
)
const UnauthorizedPage = lazy(() =>
  import('@/pages/auth/UnauthorizedPage').then((m) => ({ default: m.UnauthorizedPage }))
)
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
)

export const router = createBrowserRouter([
  // Public Portal
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: withSuspense(<HomePage />) },
      { path: 'tim', element: withSuspense(<TeamPage />) },
      { path: 'program-kerja', element: withSuspense(<ProgramsPage />) },
      { path: 'dokumentasi', element: withSuspense(<DocumentationPage />) },
      { path: 'dokumentasi/:slug', element: withSuspense(<DocumentationDetailPage />) },
      { path: 'profil-desa', element: withSuspense(<VillageProfilePage />) },
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
    children: [
      { index: true, element: withSuspense(<OverviewPage />) },
      { path: 'agenda', element: withSuspense(<AgendaPage />) },
      { path: 'programs', element: withSuspense(<ProgramsWorkspacePage />) },
      { path: 'tasks', element: withSuspense(<TasksPage />) },
      { path: 'meetings', element: withSuspense(<MeetingsPage />) },
      { path: 'finance', element: withSuspense(<FinancePage />) },
      { path: 'inventory', element: withSuspense(<InventoryPage />) },
      { path: 'surveys', element: withSuspense(<SurveysPage />) },
      { path: 'logbook', element: <Navigate to="/workspace" replace /> },
      { path: 'duty', element: withSuspense(<DutyPage />) },
      { path: 'documentation', element: withSuspense(<DocumentationWorkspacePage />) },
      { path: 'documents', element: withSuspense(<DocumentsPage />) },
      { path: 'final-report', element: <Navigate to="/workspace" replace /> },
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
    children: [
      { index: true, element: withSuspense(<AdminOverviewPage />) },
      { path: 'users', element: withSuspense(<AdminUsersPage />) },
      { path: 'invitations', element: withSuspense(<AdminInvitationsPage />) },
      { path: 'kkn-config', element: withSuspense(<AdminKknConfigPage />) },
      { path: 'audit', element: withSuspense(<AdminAuditPage />) },
      { path: 'settings', element: withSuspense(<AdminSettingsPage />) },
    ],
  },

  // Auth Routes
  {
    path: '/auth',
    children: [
      { path: 'login', element: withSuspense(<LoginPage />) },
      { path: 'forgot-password', element: withSuspense(<ForgotPasswordPage />) },
      { path: 'reset-password', element: withSuspense(<ResetPasswordPage />) },
      { path: 'accept-invite', element: withSuspense(<AcceptInvitePage />) },
    ],
  },

  // Access Control / Unauthorized
  {
    path: '/unauthorized',
    element: withSuspense(<UnauthorizedPage />),
  },

  // 404
  {
    path: '*',
    element: withSuspense(<NotFoundPage />),
  },
])

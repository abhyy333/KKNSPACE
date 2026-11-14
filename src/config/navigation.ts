import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Users,
  DollarSign,
  Package,
  ClipboardList,
  Clock,
  Award,
  Image,
  FolderOpen,
  Settings,
  ShieldAlert,
  UserCheck,
  UserCog,
  History,
  Map,
  Wrench,
  Milestone,
} from 'lucide-react'

export interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const WORKSPACE_NAV: NavSection[] = [
  {
    title: "Ruang Kerja",
    items: [
      { title: "Ikhtisar", href: "/workspace", icon: LayoutDashboard },
      { title: "Agenda Kalender", href: "/workspace/agenda", icon: Calendar },
      { title: "Program Kerja", href: "/workspace/programs", icon: Award },
      { title: "Tugas Tim", href: "/workspace/tasks", icon: CheckSquare },
      { title: "Rapat & Notulensi", href: "/workspace/meetings", icon: Users },
    ],
  },
  {
    title: "Operasional Lapangan",
    items: [
      { title: "Keuangan KKN", href: "/workspace/finance", icon: DollarSign },
      { title: "Inventaris Barang", href: "/workspace/inventory", icon: Package },
      { title: "Survei Desa", href: "/workspace/surveys", icon: ClipboardList },
      { title: "Jadwal Piket Posko", href: "/workspace/duty", icon: Clock },
    ],
  },
  {
    title: "Arsip & Administrasi",
    items: [
      { title: "Galeri Dokumentasi", href: "/workspace/documentation", icon: Image },
      { title: "Arsip Dokumen", href: "/workspace/documents", icon: FolderOpen },
      { title: "Daftar Anggota", href: "/workspace/members", icon: Users },
      { title: "Profil Saya", href: "/workspace/profile", icon: UserCog },
      { title: "Pengaturan Posko", href: "/workspace/settings", icon: Settings },
    ],
  },
]

export const ADMIN_NAV: NavSection[] = [
  {
    title: "Administrasi Sistem",
    items: [
      { title: "Ringkasan Admin", href: "/admin", icon: LayoutDashboard },
      { title: "Manajemen Akun", href: "/admin/users", icon: UserCheck },
      { title: "Undangan Anggota", href: "/admin/invitations", icon: Users },
      { title: "Konfigurasi KKN", href: "/admin/kkn-config", icon: Settings },
      { title: "Timeline & Roadmap KKN", href: "/admin/timeline", icon: Milestone },
      { title: "Profil & Geoportal Desa", href: "/admin/village", icon: Map },
      { title: "Log Aktivitas", href: "/admin/audit", icon: History },
      { title: "Status Layanan & Maintenance", href: "/admin/maintenance", icon: Wrench },
      { title: "Pengaturan Platform", href: "/admin/settings", icon: ShieldAlert },
    ],
  },
]

export const PUBLIC_NAV = [
  { title: "Beranda", href: "/" },
  { title: "Tim KKN", href: "/tim" },
  { title: "Profil Desa", href: "/profil-desa" },
  { title: "Program Kerja", href: "/program-kerja" },
  { title: "Dokumentasi", href: "/dokumentasi" },
  { title: "Timeline KKN", href: "/timeline-kkn" },
]

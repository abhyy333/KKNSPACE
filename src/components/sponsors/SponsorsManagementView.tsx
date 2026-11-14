import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchSponsors,
  fetchSponsorOverviewStats,
  submitSponsorForPublication,
  updateSponsor,
  updateSponsorsOrder,
  deleteSponsor,
  type SponsorFilterParams,
} from '@/services/sponsorsApi'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SponsorLogoThumbnail } from './SponsorLogoThumbnail'
import { SponsorFormModal } from './SponsorFormModal'
import { SponsorCommunicationModal } from './SponsorCommunicationModal'
import { SponsorPreviewModal } from './SponsorPreviewModal'
import { PublicationReviewModal } from './PublicationReviewModal'
import type {
  Sponsor,
  SponsorPartnershipStatus,
  SponsorPublicationStatus,
  SponsorCategory,
} from '@/types/sponsor'
import {
  SPONSOR_CATEGORY_LABELS,
  SPONSOR_CONTRIBUTION_LABELS,
  SPONSOR_PARTNERSHIP_STATUS_LABELS,
  SPONSOR_PUBLICATION_STATUS_LABELS,
} from '@/types/sponsor'
import {
  Building2,
  Handshake,
  Clock,
  Send,
  Eye,
  Plus,
  Search,
  MessageSquare,
  Edit2,
  CheckCircle2,
  XCircle,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Trash2,
  ArrowUpDown,
  Check,
  ChevronRight,
  ShieldCheck,
  Phone,
  User,
  Settings,
} from 'lucide-react'

import { PackageManagementView } from './PackageManagementView'
import { AgreementsManagementView } from './AgreementsManagementView'
import { ProposalsManagementView } from './ProposalsManagementView'
import { PartnershipContactSettingsView } from './PartnershipContactSettingsView'

interface SponsorsManagementViewProps {
  baseContext: 'admin' | 'workspace'
}

type TabType =
  | 'overview'
  | 'pipeline'
  | 'directory'
  | 'agreements'
  | 'proposals'
  | 'packages'
  | 'publication_requests'
  | 'contact_settings'

export const SponsorsManagementView: React.FC<SponsorsManagementViewProps> = ({ baseContext }) => {
  const { isSuperAdmin, membership } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const isKetuaOrSekretaris =
    membership?.role === 'ketua' || membership?.role === 'sekretaris' || isSuperAdmin
  const canApprovePublication = isSuperAdmin

  const [activeTab, setActiveTab] = useState<TabType>('overview')

  // Search & Filter states
  const [search, setSearch] = useState('')
  const [pipelineFilter, setPipelineFilter] = useState<SponsorPartnershipStatus | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<SponsorCategory | 'all'>('all')
  const [publicationFilter, setPublicationFilter] = useState<SponsorPublicationStatus | 'all'>('all')

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null)
  const [formInitialStatus, setFormInitialStatus] = useState<SponsorPartnershipStatus>('prospek')

  const [commModalOpen, setCommModalOpen] = useState(false)
  const [activeCommSponsor, setActiveCommSponsor] = useState<Sponsor | null>(null)

  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewSponsor, setPreviewSponsor] = useState<Sponsor | null>(null)

  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewSponsor, setReviewSponsor] = useState<Sponsor | null>(null)
  const [reviewMode, setReviewMode] = useState<'approve' | 'reject' | 'withdraw'>('approve')

  // Reorder state
  const [isReordering, setIsReordering] = useState(false)
  const [reorderedList, setReorderedList] = useState<Sponsor[]>([])

  // Queries
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['sponsor-stats'],
    queryFn: fetchSponsorOverviewStats,
    staleTime: 1000 * 60,
  })

  const filterParams: SponsorFilterParams = {
    search: search.trim() || undefined,
    category: categoryFilter,
    is_archived: false,
  }

  if (activeTab === 'pipeline') {
    filterParams.partnership_status = pipelineFilter
  } else if (activeTab === 'directory') {
    filterParams.publication_status = publicationFilter
  } else if (activeTab === 'publication_requests') {
    filterParams.publication_status = 'pending_approval'
  }

  const { data: sponsorsList = [], isLoading: listLoading, refetch: refetchList } = useQuery({
    queryKey: ['sponsors-list', filterParams],
    queryFn: () => fetchSponsors(filterParams),
  })

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['sponsors-list'] })
    void queryClient.invalidateQueries({ queryKey: ['sponsor-stats'] })
    void queryClient.invalidateQueries({ queryKey: ['public-sponsors'] })
    void refetchList()
    void refetchStats()
  }

  // Quick Action handlers
  const handleOpenAdd = (status: SponsorPartnershipStatus = 'prospek') => {
    setEditingSponsor(null)
    setFormInitialStatus(status)
    setFormModalOpen(true)
  }

  const handleEdit = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor)
    setFormModalOpen(true)
  }

  const handleOpenComm = (sponsor: Sponsor) => {
    setActiveCommSponsor(sponsor)
    setCommModalOpen(true)
  }

  const handleOpenPreview = (sponsor: Sponsor) => {
    setPreviewSponsor(sponsor)
    setPreviewModalOpen(true)
  }

  const handleSubmitPublication = async (sponsor: Sponsor) => {
    try {
      await submitSponsorForPublication(sponsor.id)
      toast({
        title: 'Pengajuan Terkirim',
        description: `Pengajuan publikasi untuk "${sponsor.name}" berhasil dikirimkan ke Admin.`,
        variant: 'success',
      })
      refreshAll()
    } catch (err: unknown) {
      toast({
        title: 'Gagal Mengajukan Publikasi',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        variant: 'error',
      })
    }
  }

  const handleOpenReview = (sponsor: Sponsor, mode: 'approve' | 'reject' | 'withdraw') => {
    setReviewSponsor(sponsor)
    setReviewMode(mode)
    setReviewModalOpen(true)
  }

  const handleQuickStatusChange = async (sponsor: Sponsor, newStatus: SponsorPartnershipStatus) => {
    try {
      await updateSponsor(sponsor.id, { partnership_status: newStatus })
      toast({
        title: 'Status Diperbarui',
        description: `Status kerja sama "${sponsor.name}" diubah menjadi ${SPONSOR_PARTNERSHIP_STATUS_LABELS[newStatus]}.`,
        variant: 'success',
      })
      refreshAll()
    } catch (err: unknown) {
      toast({
        title: 'Gagal Mengubah Status',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        variant: 'error',
      })
    }
  }

  const handleDelete = async (sponsor: Sponsor) => {
    if (!window.confirm(`Hapus permanen data sponsor "${sponsor.name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return
    }
    try {
      await deleteSponsor(sponsor.id)
      toast({
        title: 'Sponsor Dihapus',
        description: `Data sponsor "${sponsor.name}" berhasil dihapus.`,
        variant: 'info',
      })
      refreshAll()
    } catch (err: unknown) {
      toast({
        title: 'Gagal Menghapus',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        variant: 'error',
      })
    }
  }

  // Handle Order Save
  const handleSaveOrder = async () => {
    try {
      const payload = reorderedList.map((item, idx) => ({
        id: item.id,
        display_order: idx + 1,
      }))
      await updateSponsorsOrder(payload)
      toast({
        title: 'Urutan Disimpan',
        description: 'Urutan publikasi sponsor berhasil diperbarui.',
        variant: 'success',
      })
      setIsReordering(false)
      refreshAll()
    } catch (err: unknown) {
      toast({
        title: 'Gagal Menyimpan Urutan',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        variant: 'error',
      })
    }
  }

  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date())

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-forest uppercase tracking-wider">
              {baseContext === 'admin' ? 'Admin Console' : 'Workspace Posko'}
            </span>
            <span className="text-warm-300">•</span>
            <span className="inline-flex items-center gap-1 rounded bg-forest/10 px-2 py-0.5 text-[10px] font-semibold text-forest">
              <ShieldCheck className="h-3 w-3" />
              Sponsor & Partners Management
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal tracking-tight mt-1">
            Pengelolaan Sponsor & Mitra
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-1 max-w-2xl leading-relaxed">
            Pusat manajemen siklus kerja sama KKN: pencarian calon sponsor, pencatatan tindak lanjut, direktori mitra terkonfirmasi, dan publikasi resmi ke website publik.
          </p>
        </div>

        {/* Global Primary Actions */}
        {isKetuaOrSekretaris && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenAdd('prospek')}
              className="text-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5 text-forest" />
              <span>Calon Sponsor</span>
            </Button>
            <Button
              size="sm"
              onClick={() => handleOpenAdd('dikonfirmasi')}
              className="bg-forest hover:bg-forest/90 text-white text-xs gap-1.5 shadow-subtle"
            >
              <Handshake className="h-3.5 w-3.5" />
              <span>Sponsor Resmi</span>
            </Button>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-warm-300 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold border-b-2 transition-all shrink-0 ${
            activeTab === 'overview'
              ? 'border-forest text-forest bg-warm-100/50 rounded-t-lg'
              : 'border-transparent text-charcoal-muted hover:text-charcoal'
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pipeline')}
          className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold border-b-2 transition-all shrink-0 ${
            activeTab === 'pipeline'
              ? 'border-forest text-forest bg-warm-100/50 rounded-t-lg'
              : 'border-transparent text-charcoal-muted hover:text-charcoal'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Sponsor Pipeline</span>
          {stats?.totalPipelineProspects ? (
            <span className="rounded-full bg-forest/10 text-forest text-[10px] font-mono px-1.5 py-0.2">
              {stats.totalPipelineProspects}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('directory')}
          className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold border-b-2 transition-all shrink-0 ${
            activeTab === 'directory'
              ? 'border-forest text-forest bg-warm-100/50 rounded-t-lg'
              : 'border-transparent text-charcoal-muted hover:text-charcoal'
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>Sponsor Directory</span>
          {stats?.totalActiveSponsors ? (
            <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono px-1.5 py-0.2">
              {stats.totalActiveSponsors}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('agreements')}
          className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold border-b-2 transition-all shrink-0 ${
            activeTab === 'agreements'
              ? 'border-forest text-forest bg-warm-100/50 rounded-t-lg'
              : 'border-transparent text-charcoal-muted hover:text-charcoal'
          }`}
        >
          <Handshake className="h-3.5 w-3.5" />
          <span>Kesepakatan &amp; Benefit</span>
          {stats?.totalAgreementsCount ? (
            <span className="rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-mono px-1.5 py-0.2">
              {stats.totalAgreementsCount}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('proposals')}
          className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold border-b-2 transition-all shrink-0 ${
            activeTab === 'proposals'
              ? 'border-forest text-forest bg-warm-100/50 rounded-t-lg'
              : 'border-transparent text-charcoal-muted hover:text-charcoal'
          }`}
        >
          <Edit2 className="h-3.5 w-3.5" />
          <span>Proposal Generator</span>
          {stats?.totalProposalsCount ? (
            <span className="rounded-full bg-warm-200 text-charcoal text-[10px] font-mono px-1.5 py-0.2">
              {stats.totalProposalsCount}
            </span>
          ) : null}
        </button>

        {canApprovePublication && (
          <button
            type="button"
            onClick={() => setActiveTab('packages')}
            className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === 'packages'
                ? 'border-forest text-forest bg-warm-100/50 rounded-t-lg'
                : 'border-transparent text-charcoal-muted hover:text-charcoal'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Paket Kemitraan (Tiers)</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('publication_requests')}
          className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold border-b-2 transition-all shrink-0 ${
            activeTab === 'publication_requests'
              ? 'border-forest text-forest bg-warm-100/50 rounded-t-lg'
              : 'border-transparent text-charcoal-muted hover:text-charcoal'
          }`}
        >
          <Send className="h-3.5 w-3.5" />
          <span>Publication Requests</span>
          {stats?.pendingPublicationRequests ? (
            <span className="rounded-full bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 animate-pulse">
              {stats.pendingPublicationRequests}
            </span>
          ) : null}
        </button>

        {(canApprovePublication || isKetuaOrSekretaris) && (
          <button
            type="button"
            onClick={() => setActiveTab('contact_settings')}
            className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === 'contact_settings'
                ? 'border-forest text-forest bg-warm-100/50 rounded-t-lg'
                : 'border-transparent text-charcoal-muted hover:text-charcoal'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Partnership Settings</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. OVERVIEW TAB                                                          */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 6 Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="rounded-xl border border-warm-200 bg-white p-4 shadow-2xs space-y-1">
              <span className="text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider block">
                Sponsor Aktif
              </span>
              {statsLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <div className="text-2xl font-bold text-forest">{stats?.totalActiveSponsors ?? 0}</div>
              )}
              <span className="text-[10px] text-charcoal-muted block">Dikonfirmasi / Selesai</span>
            </div>

            <div className="rounded-xl border border-warm-200 bg-white p-4 shadow-2xs space-y-1">
              <span className="text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider block">
                Calon Sponsor
              </span>
              {statsLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <div className="text-2xl font-bold text-charcoal">{stats?.totalPipelineProspects ?? 0}</div>
              )}
              <span className="text-[10px] text-charcoal-muted block">Dalam Pipeline Pendekatan</span>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-2xs space-y-1">
              <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
                Menunggu Review
              </span>
              {statsLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <div className="text-2xl font-bold text-amber-900">{stats?.pendingPublicationRequests ?? 0}</div>
              )}
              <span className="text-[10px] text-amber-700 block">Pengajuan Publikasi Logo</span>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-2xs space-y-1">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                Published Website
              </span>
              {statsLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <div className="text-2xl font-bold text-emerald-900">{stats?.publishedCount ?? 0}</div>
              )}
              <span className="text-[10px] text-emerald-700 block">Tampil di Publik</span>
            </div>

            <div className="rounded-xl border border-warm-200 bg-white p-4 shadow-2xs space-y-1">
              <span className="text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider block">
                Follow-up Terjadwal
              </span>
              {statsLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <div className="text-2xl font-bold text-charcoal">{stats?.upcomingFollowUps ?? 0}</div>
              )}
              <span className="text-[10px] text-charcoal-muted block">Agenda Komunikasi</span>
            </div>

            <div className="rounded-xl border border-warm-200 bg-white p-4 shadow-2xs space-y-1">
              <span className="text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider block">
                Berakhir Segera
              </span>
              {statsLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <div className="text-2xl font-bold text-charcoal">{stats?.endingSoonCount ?? 0}</div>
              )}
              <span className="text-[10px] text-charcoal-muted block">Dalam 14 Hari</span>
            </div>
          </div>

          {/* Quick Shortcuts & Follow-up Agenda */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Agenda Follow-up Terdekat */}
            <div className="lg:col-span-2 rounded-2xl border border-warm-200 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-warm-200 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-forest" />
                  <h3 className="text-sm font-semibold text-charcoal">Jadwal Tindak Lanjut & Follow-up Terdekat</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('pipeline')}
                  className="text-xs font-semibold text-forest hover:underline flex items-center gap-1"
                >
                  <span>Buka Pipeline</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {listLoading ? (
                <div className="space-y-2 py-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : sponsorsList.filter((s) => s.next_follow_up_date).length === 0 ? (
                <div className="py-8 text-center text-charcoal-muted">
                  <Clock className="h-7 w-7 text-warm-400 mx-auto mb-1.5 opacity-60" />
                  <p className="text-xs font-semibold text-charcoal">Tidak ada jadwal follow-up tertunda</p>
                  <p className="text-[11px] text-charcoal-muted mt-0.5">
                    Semua calon sponsor telah ditindaklanjuti atau belum dijadwalkan follow-up.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
                  {sponsorsList
                    .filter((s) => s.next_follow_up_date)
                    .sort((a, b) => (a.next_follow_up_date || '').localeCompare(b.next_follow_up_date || ''))
                    .slice(0, 6)
                    .map((item) => {
                      const isOverdue = item.next_follow_up_date! < todayStr
                      const isToday = item.next_follow_up_date === todayStr

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-warm-200 bg-warm-50/50 hover:bg-warm-100/50 transition-colors"
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-charcoal truncate">{item.name}</span>
                              <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                                {SPONSOR_PARTNERSHIP_STATUS_LABELS[item.partnership_status]}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-charcoal-muted truncate">
                              PIC: {item.pic_profile?.full_name || 'Belum diatur'} • {item.notes || 'Belum ada catatan'}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span
                              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border ${
                                isOverdue
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : isToday
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {isOverdue ? 'Terlambat: ' : isToday ? 'Hari ini: ' : 'Jadwal: '}
                              {item.next_follow_up_date}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenComm(item)}
                              className="text-xs h-8 px-2.5"
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Catat
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>

            {/* Right 1 Col: Quick Workflow Guides & Rules */}
            <div className="rounded-2xl border border-warm-200 bg-white p-5 shadow-2xs space-y-4">
              <h3 className="text-sm font-semibold text-charcoal border-b border-warm-200 pb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-forest" />
                <span>Alur Kerja & Hak Akses</span>
              </h3>

              <div className="space-y-3 text-xs text-charcoal-muted leading-relaxed">
                <div className="space-y-1">
                  <span className="font-semibold text-charcoal block">1. Calon Sponsor (Pipeline)</span>
                  <p className="text-[11px]">
                    Dikelola oleh Ketua & Sekretaris dari tahap Prospek hingga Dikonfirmasi. Catatan negosiasi dan kontak pribadi bersifat internal.
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="font-semibold text-charcoal block">2. Sponsor Terkonfirmasi (Directory)</span>
                  <p className="text-[11px]">
                    Setelah disepakati, profil resmi dilengkapi dengan logo resmi dan rincian kontribusi. Logo diunggah ke private storage KKN SPACE.
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="font-semibold text-charcoal block">3. Verifikasi Publikasi (Admin)</span>
                  <p className="text-[11px]">
                    Ketua / Sekretaris menekan &quot;Ajukan Publikasi&quot;. Super Admin memverifikasi logo dan kelayakan profil sebelum dipublikasikan ke publik.
                  </p>
                </div>
              </div>

              {canApprovePublication && (
                <div className="rounded-xl bg-forest/5 border border-forest/20 p-3 text-[11px] text-forest space-y-1.5">
                  <span className="font-semibold block flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Wewenang Super Admin Aktif
                  </span>
                  <p className="text-forest/80 leading-normal">
                    Anda memiliki hak penuh untuk menyetujui, meminta revisi, mengatur urutan logo, atau menarik publikasi kapan saja.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SPONSOR PIPELINE TAB                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          {/* Filters & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-warm-200 shadow-2xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-muted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari calon sponsor, nama kontak, atau deskripsi..."
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={pipelineFilter}
                onChange={(e) => setPipelineFilter(e.target.value as SponsorPartnershipStatus | 'all')}
                className="text-xs rounded-lg border border-warm-300 bg-white px-3 py-2 text-charcoal focus:outline-hidden"
              >
                <option value="all">Semua Status Pipeline</option>
                {Object.entries(SPONSOR_PARTNERSHIP_STATUS_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as SponsorCategory | 'all')}
                className="text-xs rounded-lg border border-warm-300 bg-white px-3 py-2 text-charcoal focus:outline-hidden"
              >
                <option value="all">Semua Kategori</option>
                {Object.entries(SPONSOR_CATEGORY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>

              <Button size="sm" variant="outline" onClick={refreshAll} className="h-9 px-2.5">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Table View */}
          <div className="rounded-2xl border border-warm-200 bg-white shadow-2xs overflow-hidden">
            {listLoading ? (
              <div className="p-8 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : sponsorsList.length === 0 ? (
              <div className="py-12 text-center text-charcoal-muted p-6">
                <Building2 className="h-8 w-8 text-warm-400 mx-auto mb-2 opacity-60" />
                <h4 className="text-sm font-semibold text-charcoal">Tidak ada calon sponsor ditemukan</h4>
                <p className="text-xs text-charcoal-muted mt-1 max-w-sm mx-auto">
                  Belum ada calon sponsor di tahapan ini, atau kata kunci pencarian Anda tidak sesuai.
                </p>
                {isKetuaOrSekretaris && (
                  <Button
                    size="sm"
                    onClick={() => handleOpenAdd('prospek')}
                    className="mt-4 bg-forest hover:bg-forest/90 text-white text-xs gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah Calon Sponsor</span>
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-charcoal">
                  <thead className="bg-warm-100/70 border-b border-warm-200 text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Calon Sponsor & Organisasi</th>
                      <th className="py-3 px-4">Kategori & Bentuk Dukungan</th>
                      <th className="py-3 px-4">Status Pipeline</th>
                      <th className="py-3 px-4">PIC & Kontak Person</th>
                      <th className="py-3 px-4">Jadwal Follow-up</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-200">
                    {sponsorsList.map((sponsor) => {
                      const isOverdue = sponsor.next_follow_up_date && sponsor.next_follow_up_date < todayStr
                      const isToday = sponsor.next_follow_up_date === todayStr

                      return (
                        <tr key={sponsor.id} className="hover:bg-warm-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-charcoal">{sponsor.name}</div>
                            {sponsor.notes && (
                              <p className="text-[11px] text-charcoal-muted truncate max-w-[220px] mt-0.5">
                                {sponsor.notes}
                              </p>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-medium block text-charcoal">
                              {SPONSOR_CATEGORY_LABELS[sponsor.category]}
                            </span>
                            <span className="text-[10px] text-charcoal-muted block">
                              {SPONSOR_CONTRIBUTION_LABELS[sponsor.contribution_type]}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            {isKetuaOrSekretaris ? (
                              <select
                                value={sponsor.partnership_status}
                                onChange={(e) =>
                                  handleQuickStatusChange(sponsor, e.target.value as SponsorPartnershipStatus)
                                }
                                className="text-[11px] font-semibold rounded-md border border-warm-300 bg-white px-2 py-1 text-charcoal focus:outline-hidden"
                              >
                                {Object.entries(SPONSOR_PARTNERSHIP_STATUS_LABELS).map(([k, label]) => (
                                  <option key={k} value={k}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">
                                {SPONSOR_PARTNERSHIP_STATUS_LABELS[sponsor.partnership_status]}
                              </Badge>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-charcoal">
                              <User className="h-3 w-3 text-forest" />
                              <span>{sponsor.pic_profile?.full_name || 'Belum ada PIC'}</span>
                            </div>
                            <div className="text-[10px] text-charcoal-muted mt-0.5 space-x-2">
                              {sponsor.contact_name && <span>{sponsor.contact_name}</span>}
                              {sponsor.contact_phone && (
                                <span className="inline-flex items-center gap-0.5 font-mono">
                                  <Phone className="h-2.5 w-2.5" />
                                  {sponsor.contact_phone}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {sponsor.next_follow_up_date ? (
                              <span
                                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono font-medium border ${
                                  isOverdue
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : isToday
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}
                              >
                                <Calendar className="h-2.5 w-2.5" />
                                {sponsor.next_follow_up_date}
                              </span>
                            ) : (
                              <span className="text-[11px] text-charcoal-muted italic">Belum dijadwalkan</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenComm(sponsor)}
                                title="Catat & Lihat Komunikasi"
                                className="h-8 px-2 text-xs"
                              >
                                <MessageSquare className="h-3.5 w-3.5 text-forest" />
                              </Button>

                              {isKetuaOrSekretaris && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(sponsor)}
                                  title="Edit Calon Sponsor"
                                  className="h-8 px-2 text-xs"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                              )}

                              {isSuperAdmin && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(sponsor)}
                                  title="Hapus"
                                  className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SPONSOR DIRECTORY TAB                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Directory Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-warm-200 shadow-2xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-muted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari sponsor resmi, bentuk dukungan..."
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as SponsorCategory | 'all')}
                className="text-xs rounded-lg border border-warm-300 bg-white px-3 py-2 text-charcoal focus:outline-hidden"
              >
                <option value="all">Semua Kategori</option>
                {Object.entries(SPONSOR_CATEGORY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                value={publicationFilter}
                onChange={(e) => setPublicationFilter(e.target.value as SponsorPublicationStatus | 'all')}
                className="text-xs rounded-lg border border-warm-300 bg-white px-3 py-2 text-charcoal focus:outline-hidden"
              >
                <option value="all">Semua Status Publikasi</option>
                {Object.entries(SPONSOR_PUBLICATION_STATUS_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>

              {canApprovePublication && (
                <Button
                  size="sm"
                  variant={isReordering ? 'default' : 'outline'}
                  onClick={() => {
                    if (isReordering) {
                      handleSaveOrder()
                    } else {
                      setReorderedList([...sponsorsList])
                      setIsReordering(true)
                    }
                  }}
                  className={`text-xs gap-1.5 ${isReordering ? 'bg-forest hover:bg-forest/90 text-white' : ''}`}
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  <span>{isReordering ? 'Simpan Urutan' : 'Atur Urutan'}</span>
                </Button>
              )}

              <Button size="sm" variant="outline" onClick={refreshAll} className="h-9 px-2.5">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Directory Cards Grid */}
          {listLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          ) : sponsorsList.length === 0 ? (
            <div className="py-12 text-center text-charcoal-muted bg-white border border-warm-200 rounded-2xl p-6">
              <Handshake className="h-8 w-8 text-warm-400 mx-auto mb-2 opacity-60" />
              <h4 className="text-sm font-semibold text-charcoal">Belum ada sponsor di direktori</h4>
              <p className="text-xs text-charcoal-muted mt-1 max-w-sm mx-auto">
                Tambahkan sponsor yang telah mengonfirmasi kerja sama, atau pindahkan calon sponsor dari pipeline.
              </p>
              {isKetuaOrSekretaris && (
                <Button
                  size="sm"
                  onClick={() => handleOpenAdd('dikonfirmasi')}
                  className="mt-4 bg-forest hover:bg-forest/90 text-white text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah Sponsor Resmi</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sponsorsList.map((sponsor) => {
                const isPublished = sponsor.publication_status === 'published'
                const isPending = sponsor.publication_status === 'pending_approval'
                const isRejected = sponsor.publication_status === 'rejected'

                return (
                  <div
                    key={sponsor.id}
                    className="rounded-2xl border border-warm-200 bg-white p-4 shadow-2xs flex flex-col justify-between hover:border-warm-300 transition-shadow space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Card Top: Logo & Name */}
                      <div className="flex items-start gap-3">
                        <SponsorLogoThumbnail
                          fileId={sponsor.logo_file_id}
                          sponsorId={sponsor.id}
                          alt={sponsor.name}
                          containerClassName="w-20 h-14 bg-white rounded-xl border border-warm-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs"
                        />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <h4 className="text-xs font-semibold text-charcoal truncate" title={sponsor.name}>
                            {sponsor.name}
                          </h4>
                          <span className="text-[11px] font-medium text-forest block truncate">
                            {SPONSOR_CATEGORY_LABELS[sponsor.category]}
                          </span>
                          <span className="text-[10px] text-charcoal-muted block">
                            Dukungan: {SPONSOR_CONTRIBUTION_LABELS[sponsor.contribution_type]}
                          </span>
                        </div>
                      </div>

                      {/* Description & Contribution */}
                      {sponsor.description && (
                        <p className="text-[11px] text-charcoal-muted line-clamp-2 leading-relaxed">
                          {sponsor.description}
                        </p>
                      )}

                      {/* Publication Status & Rejection Notice */}
                      <div className="space-y-1.5 pt-2 border-t border-warm-100">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-charcoal-muted">Status Publikasi:</span>
                          <Badge
                            className={
                              isPublished
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : isPending
                                ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                                : isRejected
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-warm-100 text-charcoal-muted border-warm-200'
                            }
                          >
                            {SPONSOR_PUBLICATION_STATUS_LABELS[sponsor.publication_status]}
                          </Badge>
                        </div>

                        {sponsor.publication_rejection_reason && (
                          <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-[10px] text-rose-800 leading-normal">
                            <span className="font-semibold">Catatan Revisi: </span>
                            {sponsor.publication_rejection_reason}
                          </div>
                        )}

                        {sponsor.start_date && (
                          <div className="flex items-center gap-1 text-[10px] text-charcoal-muted font-mono">
                            <Calendar className="h-2.5 w-2.5 text-forest" />
                            <span>
                              {sponsor.start_date} {sponsor.end_date ? `s.d. ${sponsor.end_date}` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="border-t border-warm-100 pt-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenPreview(sponsor)}
                          title="Pratinjau Publik"
                          className="h-8 px-2 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5 text-forest" />
                        </Button>

                        {isKetuaOrSekretaris && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(sponsor)}
                            title="Edit Profil & Logo"
                            className="h-8 px-2 text-xs"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Publication actions */}
                      <div className="flex items-center gap-1">
                        {canApprovePublication ? (
                          isPublished ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenReview(sponsor, 'withdraw')}
                              className="text-xs h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                            >
                              Tarik Publikasi
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleOpenReview(sponsor, 'approve')}
                              className="bg-forest hover:bg-forest/90 text-white text-xs h-8 gap-1 shadow-2xs"
                            >
                              <Check className="h-3 w-3" />
                              <span>Setujui</span>
                            </Button>
                          )
                        ) : (
                          // Ketua / Sekretaris action
                          !isPublished && !isPending && (
                            <Button
                              size="sm"
                              onClick={() => handleSubmitPublication(sponsor)}
                              className="bg-forest hover:bg-forest/90 text-white text-xs h-8 gap-1 shadow-2xs"
                            >
                              <Send className="h-3 w-3" />
                              <span>Ajukan</span>
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. AGREEMENTS & BENEFIT TRACKER TAB                                       */}
      {/* ========================================================================= */}
      {activeTab === 'agreements' && <AgreementsManagementView />}

      {/* ========================================================================= */}
      {/* 5. MANUAL PROPOSAL GENERATOR TAB (NO AI)                                  */}
      {/* ========================================================================= */}
      {activeTab === 'proposals' && <ProposalsManagementView />}

      {/* ========================================================================= */}
      {/* 6. SPONSORSHIP PACKAGES (TIERS) TAB                                       */}
      {/* ========================================================================= */}
      {activeTab === 'packages' && canApprovePublication && <PackageManagementView />}

      {/* ========================================================================= */}
      {/* 7. PUBLICATION REQUESTS TAB (ADMIN / SUPER ADMIN REVIEW)                 */}
      {/* ========================================================================= */}
      {activeTab === 'publication_requests' && (
        <div className="space-y-4">
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block">Pusat Persetujuan Publikasi Logo Sponsor</span>
              <p className="leading-relaxed text-amber-800">
                Setiap sponsor yang diajukan oleh Ketua atau Sekretaris wajib melalui pemeriksaan Admin sebelum logo dan identitasnya resmi tampil di halaman publik KKN SPACE.
              </p>
            </div>
          </div>

          {listLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : sponsorsList.length === 0 ? (
            <div className="py-12 text-center text-charcoal-muted bg-white border border-warm-200 rounded-2xl p-6">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <h4 className="text-sm font-semibold text-charcoal">Semua Pengajuan Telah Ditinjau</h4>
              <p className="text-xs text-charcoal-muted mt-1 max-w-sm mx-auto">
                Tidak ada pengajuan publikasi logo sponsor yang menunggu persetujuan saat ini.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sponsorsList.map((sponsor) => (
                <div
                  key={sponsor.id}
                  className="rounded-2xl border border-warm-200 bg-white p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-warm-300 transition-colors"
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <SponsorLogoThumbnail
                      fileId={sponsor.logo_file_id}
                      sponsorId={sponsor.id}
                      alt={sponsor.name}
                      containerClassName="w-20 h-14 bg-white rounded-xl border border-warm-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs"
                    />

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-charcoal truncate">{sponsor.name}</h4>
                        <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">
                          Menunggu Persetujuan
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-charcoal-muted">
                        <span className="font-medium text-forest">{SPONSOR_CATEGORY_LABELS[sponsor.category]}</span>
                        <span>•</span>
                        <span>{SPONSOR_CONTRIBUTION_LABELS[sponsor.contribution_type]}</span>
                        {sponsor.start_date && (
                          <>
                            <span>•</span>
                            <span className="font-mono">
                              Periode: {sponsor.start_date} {sponsor.end_date ? `s.d. ${sponsor.end_date}` : ''}
                            </span>
                          </>
                        )}
                      </div>

                      {sponsor.description && (
                        <p className="text-[11px] text-charcoal-muted line-clamp-1 max-w-xl">
                          {sponsor.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions for Admin */}
                  <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-warm-200">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenPreview(sponsor)}
                      className="text-xs h-8 gap-1"
                    >
                      <Eye className="h-3.5 w-3.5 text-forest" />
                      <span>Pratinjau</span>
                    </Button>

                    {canApprovePublication && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenReview(sponsor, 'reject')}
                          className="text-xs h-8 text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200 gap-1"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Minta Revisi</span>
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleOpenReview(sponsor, 'approve')}
                          className="bg-forest hover:bg-forest/90 text-white text-xs h-8 gap-1 shadow-2xs"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Setujui Publikasi</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. PARTNERSHIP SETTINGS TAB                                              */}
      {/* ========================================================================= */}
      {activeTab === 'contact_settings' && (
        <PartnershipContactSettingsView />
      )}

      {/* Modals */}
      <SponsorFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSuccess={refreshAll}
        sponsor={editingSponsor}
        initialPartnershipStatus={formInitialStatus}
      />

      <SponsorCommunicationModal
        open={commModalOpen}
        onClose={() => setCommModalOpen(false)}
        sponsor={activeCommSponsor}
        onCommunicationAdded={refreshAll}
      />

      <SponsorPreviewModal
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        sponsor={previewSponsor}
      />

      <PublicationReviewModal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onSuccess={refreshAll}
        sponsor={reviewSponsor}
        mode={reviewMode}
      />
    </div>
  )
}

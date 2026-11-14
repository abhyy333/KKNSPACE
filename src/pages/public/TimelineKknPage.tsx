import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  fetchPublicTimelineBundle,
  formatStageDateRange,
  type PublicTimelineBundle,
} from '@/services/timelineApi'
import {
  StageIllustration,
  RoadmapVillageScenery,
} from '@/components/timeline/TimelineIllustrations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { KknTimelineStage } from '@/types/database'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  List,
  Target,
  FileText,
} from 'lucide-react'

export const TimelineKknPage: React.FC = () => {
  // View mode switcher: 'timeline' vs 'detail'
  const [viewMode, setViewMode] = useState<'timeline' | 'detail'>('timeline')
  const [selectedStage, setSelectedStage] = useState<KknTimelineStage | null>(null)

  // Local live timer for reactive countdown and time
  const [, setTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(timer)
  }, [])

  // Fetch published timeline bundle
  const { data, isLoading, isError } = useQuery<PublicTimelineBundle>({
    queryKey: ['public-timeline-bundle'],
    queryFn: fetchPublicTimelineBundle,
    staleTime: 30_000,
  })

  const settings = data?.settings
  const stages = data?.stages || []
  const progress = data?.progress || {
    percentage: 0,
    currentDay: 0,
    totalDays: 0,
    isStarted: false,
    isEnded: false,
    remainingDays: 0,
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-charcoal pb-16">
      {/* ========================================================= */}
      {/* 1. HERO SECTION: Full-width Landscape + Editorial Depth  */}
      {/* ========================================================= */}
      <section className="relative w-full overflow-hidden bg-[#182B21] text-white py-16 sm:py-20 lg:py-24 border-b border-warm-300">
        {/* Background Landscape Photograph with Natural Dark Gradient */}
        <div className="absolute inset-0 z-0">
          <img
            src={settings?.hero_image_url || '/assets/village/goa_kopong_wisata_air.jpg'}
            alt="Lanskap Alam Desa Pringgasela Selatan"
            className="w-full h-full object-cover object-center filter brightness-[0.72] contrast-[1.08] transform scale-105 transition-transform duration-1000 ease-out"
          />
          {/* Editorial Overlays: Forest Green & Charcoal Depth to match reference */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#112419]/90 via-[#183424]/75 to-[#112419]/65" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#112419] via-transparent to-black/30" />
        </div>

        {/* Hero Content Container */}
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Headings & Metadata */}
            <div className="lg:col-span-7 space-y-5">
              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold text-white tracking-tight leading-[1.12]">
                {settings?.title || 'Timeline & Roadmap KKN'}
              </h1>

              {/* Subtitle / Description */}
              <p className="text-sm sm:text-base lg:text-lg text-emerald-50/90 font-sans max-w-2xl leading-relaxed font-light">
                {settings?.description ||
                  'Perjalanan pengabdian mahasiswa Universitas Mataram di Desa Pringgasela Selatan.'}
              </p>

              {/* 3 Horizontal Metadata Badges matching reference */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {/* 1. Periode KKN */}
                <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white">
                  <Calendar className="h-4 w-4 text-emerald-300 shrink-0" />
                  <div>
                    <span className="text-[10px] text-emerald-200/80 block uppercase font-medium">Periode KKN</span>
                    <strong className="font-semibold">
                      {settings?.start_date && settings?.end_date
                        ? formatStageDateRange(settings.start_date, settings.end_date)
                        : 'Januari – Februari 2026'}
                    </strong>
                  </div>
                </div>

                {/* 2. Mahasiswa + DPL */}
                <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white">
                  <Users className="h-4 w-4 text-emerald-300 shrink-0" />
                  <div>
                    <span className="text-[10px] text-emerald-200/80 block uppercase font-medium">Tim Pengabdian</span>
                    <strong className="font-semibold">
                      {settings?.student_count ?? 10} Mahasiswa + {settings?.dpl_count ?? 1} DPL
                    </strong>
                  </div>
                </div>

                {/* 3. Lokasi Desa */}
                <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white">
                  <MapPin className="h-4 w-4 text-emerald-300 shrink-0" />
                  <div>
                    <span className="text-[10px] text-emerald-200/80 block uppercase font-medium">Lokasi KKN</span>
                    <strong className="font-semibold truncate max-w-[220px] block">
                      {settings?.location || 'Desa Pringgasela Selatan, Lombok Timur'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Floating Progress Card matching reference */}
            <div className="lg:col-span-5 flex justify-start lg:justify-end">
              <div className="w-full max-w-sm rounded-2xl bg-white/95 backdrop-blur-md border border-white/60 p-6 shadow-xl text-charcoal space-y-3.5 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-charcoal-muted uppercase tracking-wider">
                    Progres KKN
                  </span>
                  <Badge variant="outline" className="border-sage-300 text-sage-800 bg-sage-50 text-[11px] font-semibold">
                    {progress.isEnded
                      ? 'Periode Usai'
                      : progress.isStarted
                      ? 'Sedang Berjalan'
                      : 'Belum Mulai'}
                  </Badge>
                </div>

                {/* Big Percentage Number */}
                <div className="text-4xl sm:text-5xl font-sans font-bold text-charcoal tracking-tight">
                  {progress.percentage}%
                </div>

                {/* Horizontal Progress Bar matching reference */}
                <div className="h-3 w-full bg-warm-200/90 rounded-full overflow-hidden p-0.5">
                  <div
                    style={{ width: `${progress.percentage}%` }}
                    className="h-full rounded-full bg-[#2A6540] transition-all duration-700 ease-out"
                    title={`Progres KKN: ${progress.percentage}%`}
                  />
                </div>

                {/* Days Tracker Info */}
                <div className="flex items-center gap-2 text-xs text-charcoal-muted pt-1">
                  <Clock className="h-4 w-4 text-[#2A6540] shrink-0" />
                  <span>
                    Hari ke-<strong>{progress.currentDay}</strong> dari {progress.totalDays} hari{' '}
                    <span className="text-charcoal-muted/80">
                      ({settings?.start_date && settings?.end_date ? formatStageDateRange(settings.start_date, settings.end_date) : '-'})
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. ROADMAP SECTION: Illustrated Path & Milestone Cards   */}
      {/* ========================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16">
        {/* Section Header & View Mode Switcher matching reference */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-charcoal">
              Roadmap Perjalanan KKN
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-muted mt-1.5 max-w-2xl leading-relaxed">
              Tahapan kegiatan KKN dari persiapan hingga penarikan. Diperbarui secara real-time sesuai waktu pelaksanaan.
            </p>
          </div>

          {/* View Mode Toggle Pill matching reference */}
          <div className="inline-flex items-center p-1 rounded-full bg-warm-200/80 border border-warm-300 self-start sm:self-auto shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-[#1C3B29] text-white shadow-xs'
                  : 'text-charcoal-muted hover:text-charcoal'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('detail')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'detail'
                  ? 'bg-[#1C3B29] text-white shadow-xs'
                  : 'text-charcoal-muted hover:text-charcoal'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Detail Tahapan</span>
            </button>
          </div>
        </div>

        {/* Loading / Error States */}
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
        ) : isError || stages.length === 0 ? (
          <Card className="border-dashed border-warm-300 bg-white p-12 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-charcoal-muted mx-auto" />
            <h3 className="text-sm font-semibold text-charcoal">Tahapan Roadmap Sedang Disusun</h3>
            <p className="text-xs text-charcoal-muted max-w-md mx-auto">
              Administrator posko sedang mempersiapkan jadwal dan target tahapan resmi KKN Desa Pringgasela Selatan.
            </p>
          </Card>
        ) : viewMode === 'timeline' ? (
          /* ========================================================= */
          /* 2A. TIMELINE VIEW: Illustrated Landscape & Curved Path   */
          /* ========================================================= */
          <div className="relative rounded-3xl border border-warm-300/80 bg-[#FAF7F2] p-4 sm:p-8 lg:p-10 shadow-sm overflow-hidden">
            {/* ---------------- Desktop Illustrated Roadmap (md and above) ---------------- */}
            <div className="hidden lg:block relative min-h-[460px]">
              {/* Curved SVG Road / Connecting Path across milestones */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                viewBox="0 0 1000 460"
                fill="none"
                preserveAspectRatio="none"
              >
                {/* Soft ground shadow of path */}
                <path
                  d="M 100 220 Q 300 245 500 215 T 900 225"
                  stroke="#E4DBCB"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Sage green connecting path */}
                <path
                  d="M 100 220 Q 300 245 500 215 T 900 225"
                  stroke="#628A6D"
                  strokeWidth="4"
                  strokeDasharray="6 6"
                  strokeLinecap="round"
                />
              </svg>

              {/* 5 Milestone Columns Layout */}
              <div className="relative z-20 grid grid-cols-5 gap-3 items-start">
                {stages.map((st) => {
                  const isCurrent = st.computedStatus === 'in_progress'
                  const isPast = st.computedStatus === 'completed'
                  const isAwaiting = st.computedStatus === 'awaiting_confirmation'

                  return (
                    <div
                      key={st.id}
                      onClick={() => setSelectedStage(st)}
                      className="group cursor-pointer flex flex-col items-center text-center space-y-3 transition-transform hover:-translate-y-1"
                    >
                      {/* Top: Milestone Illustration & Current Badge */}
                      <div className="h-32 flex flex-col items-center justify-end relative">
                        {/* "Tahap Saat ini" badge pill above current stage */}
                        {isCurrent && (
                          <div className="mb-1.5 animate-bounce inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#1C3B29] text-white text-[11px] font-semibold shadow-md">
                            <MapPin className="h-3 w-3 text-emerald-300" />
                            <span>Tahap Saat ini</span>
                          </div>
                        )}

                        {/* Custom SVG Illustration */}
                        <div className="transition-transform group-hover:scale-105 duration-300">
                          <StageIllustration type={st.icon_type} className="w-28 h-28 object-contain" />
                        </div>
                      </div>

                      {/* Middle: Node Marker on the curved road */}
                      <div className="relative my-1 flex items-center justify-center">
                        {isPast ? (
                          <div className="w-6 h-6 rounded-full bg-[#2A6540] text-white flex items-center justify-center shadow-xs border-2 border-[#FAF7F2]">
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                        ) : isCurrent ? (
                          <div className="w-7 h-7 rounded-full bg-[#1C3B29] text-white flex items-center justify-center ring-4 ring-emerald-500/20 shadow-md border-2 border-white">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                          </div>
                        ) : isAwaiting ? (
                          <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs border-2 border-white">
                            <Clock className="h-3.5 w-3.5" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-white border-2 border-warm-300 flex items-center justify-center shadow-2xs group-hover:border-sage-500">
                            <span className="w-2 h-2 rounded-full bg-warm-300 group-hover:bg-sage-600" />
                          </div>
                        )}
                      </div>

                      {/* Bottom: Milestone Card matching reference */}
                      <div
                        className={`w-full rounded-2xl p-4 text-left transition-all duration-300 space-y-2 ${
                          isCurrent
                            ? 'bg-white border-2 border-[#2A6540] shadow-md ring-4 ring-[#2A6540]/10'
                            : 'bg-white/90 border border-warm-200/90 hover:border-sage-400 hover:shadow-xs'
                        }`}
                      >
                        {/* Title & Status */}
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-semibold text-sm text-charcoal group-hover:text-sage-800 transition-colors">
                            {st.title}
                          </h4>
                          {isPast && (
                            <span className="text-[10px] text-emerald-700 font-bold shrink-0">
                              ✓
                            </span>
                          )}
                        </div>

                        {/* Date Range Badge */}
                        <p className="text-[11px] font-semibold text-[#2A6540]">
                          {formatStageDateRange(st.start_date, st.end_date)}
                        </p>

                        {/* Short Description */}
                        <p className="text-[11px] text-charcoal-muted leading-relaxed line-clamp-3">
                          {st.short_description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Bottom Panoramic Rural Scenery Illustration matching reference */}
              <div className="pt-8 -mx-10 -mb-10">
                <RoadmapVillageScenery className="w-full h-32 opacity-95" />
              </div>
            </div>

            {/* ---------------- Mobile & Tablet Vertical Timeline (below lg) ---------------- */}
            <div className="block lg:hidden space-y-6 relative">
              {/* Vertical connecting line */}
              <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-sage-300 border-dashed" />

              {stages.map((st) => {
                const isCurrent = st.computedStatus === 'in_progress'
                const isPast = st.computedStatus === 'completed'

                return (
                  <div
                    key={st.id}
                    onClick={() => setSelectedStage(st)}
                    className="relative pl-14 cursor-pointer group"
                  >
                    {/* Node circle on left line */}
                    <div className="absolute left-3 top-4 -translate-x-1/2 z-10">
                      {isPast ? (
                        <div className="w-6 h-6 rounded-full bg-[#2A6540] text-white flex items-center justify-center shadow-xs">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      ) : isCurrent ? (
                        <div className="w-7 h-7 rounded-full bg-[#1C3B29] text-white flex items-center justify-center ring-4 ring-emerald-500/20 shadow-md">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white border-2 border-warm-300 flex items-center justify-center shadow-2xs" />
                      )}
                    </div>

                    {/* Card container */}
                    <div
                      className={`rounded-2xl p-4 sm:p-5 transition-all space-y-2.5 ${
                        isCurrent
                          ? 'bg-white border-2 border-[#2A6540] shadow-md ring-4 ring-[#2A6540]/10'
                          : 'bg-white border border-warm-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-charcoal-muted">
                            Tahap {st.stage_number}
                          </span>
                          {isCurrent && (
                            <Badge className="bg-[#1C3B29] text-white text-[10px]">
                              Tahap Saat Ini
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-[#2A6540]">
                          {formatStageDateRange(st.start_date, st.end_date)}
                        </span>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="shrink-0">
                          <StageIllustration type={st.icon_type} className="w-16 h-16 object-contain" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-semibold text-sm sm:text-base text-charcoal">
                            {st.title}
                          </h4>
                          <p className="text-xs text-charcoal-muted leading-relaxed">
                            {st.short_description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Bottom Scenery for Mobile */}
              <div className="pt-4 -mx-4 -mb-4">
                <RoadmapVillageScenery className="w-full h-24 opacity-90" />
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* 2B. DETAIL VIEW: Comprehensive Stage Breakdowns           */
          /* ========================================================= */
          <div className="space-y-4">
            {stages.map((st) => {
              const isCurrent = st.computedStatus === 'in_progress'
              const isPast = st.computedStatus === 'completed'

              return (
                <div
                  key={st.id}
                  className={`rounded-2xl bg-white border p-5 sm:p-6 transition-all space-y-4 ${
                    isCurrent
                      ? 'border-[#2A6540] shadow-md ring-2 ring-[#2A6540]/10'
                      : 'border-warm-200 hover:border-warm-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-warm-100 pb-3">
                    <div className="flex items-center gap-3">
                      <StageIllustration type={st.icon_type} className="w-12 h-12 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-charcoal-muted uppercase tracking-wider">
                            Tahap {st.stage_number}
                          </span>
                          {isCurrent && (
                            <Badge className="bg-[#1C3B29] text-white text-[10px]">
                              Sedang Berjalan
                            </Badge>
                          )}
                          {isPast && (
                            <Badge variant="outline" className="border-emerald-500 text-emerald-800 bg-emerald-50 text-[10px]">
                              Selesai Dilaksanakan
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-lg font-serif font-bold text-charcoal mt-0.5">
                          {st.title}
                        </h3>
                      </div>
                    </div>

                    <div className="text-xs font-semibold text-[#2A6540] self-start sm:self-auto bg-warm-100/70 px-3 py-1.5 rounded-lg">
                      {formatStageDateRange(st.start_date, st.end_date)}
                    </div>
                  </div>

                  {/* Detailed Description */}
                  <p className="text-xs sm:text-sm text-charcoal-muted leading-relaxed whitespace-pre-wrap">
                    {st.detailed_description || st.short_description}
                  </p>

                  {/* Objectives / Targets */}
                  {st.objectives && st.objectives.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <h4 className="text-xs font-semibold text-charcoal flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5 text-sage-700" />
                        <span>Fokus Capaian &amp; Target Utama:</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {st.objectives.map((obj, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-warm-50 border border-warm-200/60">
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#2A6540] shrink-0 mt-0.5" />
                            <span className="text-charcoal leading-snug">{obj}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* 3. STAGE DETAIL MODAL / DRAWER                            */}
      {/* ========================================================= */}
      {selectedStage && (
        <Modal
          open={Boolean(selectedStage)}
          onClose={() => setSelectedStage(null)}
          title={`Detail Tahap ${selectedStage.stage_number}: ${selectedStage.title}`}
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-warm-200 pb-3">
              <div className="flex items-center gap-2.5">
                <StageIllustration type={selectedStage.icon_type} className="w-12 h-12" />
                <div>
                  <h3 className="text-sm font-semibold text-charcoal">{selectedStage.title}</h3>
                  <span className="text-xs font-medium text-[#2A6540]">
                    {formatStageDateRange(selectedStage.start_date, selectedStage.end_date)}
                  </span>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] bg-warm-100 border-warm-300">
                Tahap {selectedStage.stage_number}
              </Badge>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-semibold text-charcoal">Deskripsi Pelaksanaan</h4>
              <p className="text-charcoal-muted leading-relaxed whitespace-pre-wrap">
                {selectedStage.detailed_description || selectedStage.short_description}
              </p>
            </div>

            {selectedStage.objectives && selectedStage.objectives.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-charcoal flex items-center gap-1">
                  <Target className="h-3.5 w-3.5 text-sage-700" />
                  <span>Target &amp; Luaran Tahapan:</span>
                </h4>
                <ul className="space-y-1.5 pl-1">
                  {selectedStage.objectives.map((obj, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-charcoal-muted">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#2A6540] shrink-0 mt-0.5" />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-3 border-t border-warm-200 flex items-center justify-between">
              <Link
                to="/program-kerja"
                className="text-xs font-medium text-sage-800 hover:underline flex items-center gap-1"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Lihat Program Kerja Terkait</span>
              </Link>
              <Button size="sm" variant="outline" onClick={() => setSelectedStage(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Wrench,
  Clock,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Home,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Button } from './button'
import type { MaintenanceConfig } from '@/types/maintenance'

interface MaintenancePageProps {
  config?: MaintenanceConfig | null
  onRetry?: () => Promise<any> | void
  isSuperAdminBypass?: boolean
}

export const MaintenancePage: React.FC<MaintenancePageProps> = ({
  config,
  onRetry,
  isSuperAdminBypass = false,
}) => {
  const [isChecking, setIsChecking] = useState(false)
  const [checkFeedback, setCheckFeedback] = useState<string | null>(null)

  const title = config?.title || 'Kami Sedang Mempersiapkan Pengalaman yang Lebih Baik'
  const message =
    config?.message ||
    'KKN SPACE sedang menjalani pemeliharaan dan pembaruan sistem. Kami akan kembali setelah proses selesai. Terima kasih atas pengertian Anda.'
  const workDescription = config?.work_description || 'Pembaruan infrastruktur dan optimalisasi performa platform.'
  const startTime = config?.start_time ? new Date(config.start_time) : null
  const estimatedEndTime = config?.estimated_end_time ? new Date(config.estimated_end_time) : null

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(date)
  }

  const handleCheckStatus = async () => {
    setIsChecking(true)
    setCheckFeedback(null)
    try {
      if (onRetry) {
        await onRetry()
      }
      // Give feedback if still in maintenance
      setTimeout(() => {
        setCheckFeedback('Sistem masih dalam jadwal pemeliharaan. Terima kasih telah menunggu.')
        setIsChecking(false)
      }, 700)
    } catch {
      setCheckFeedback('Kendala saat memeriksa status terkini. Silakan coba kembali.')
      setIsChecking(false)
    }
  }

  return (
    <div className="min-h-screen bg-warm-100 flex flex-col items-center justify-center p-4 sm:p-6 text-charcoal selection:bg-sage-500/20 relative overflow-hidden">
      
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-sage-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-warm-300/50 rounded-full blur-3xl pointer-events-none" />

      {/* Super Admin Bypass Banner */}
      {isSuperAdminBypass && (
        <aside
          aria-label="Notifikasi Akses Super Admin"
          className="fixed top-4 inset-x-4 sm:inset-x-auto sm:right-6 z-50 bg-charcoal text-white text-xs px-4 py-2.5 rounded-xl shadow-lg border border-charcoal/80 flex items-center gap-3 backdrop-blur-md animate-fade-in"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Mode Pemeliharaan Aktif · <strong>Akses Super Admin Terbuka</strong>
          </span>
          <Link
            to="/admin/maintenance"
            className="text-warm-300 hover:text-white underline font-medium ml-2"
          >
            Kelola Status
          </Link>
        </aside>
      )}

      {/* Main Container Card */}
      <main className="max-w-xl w-full bg-white/95 backdrop-blur-xs border border-warm-300 rounded-3xl p-6 sm:p-10 shadow-card text-center space-y-7 relative z-10 transition-all duration-300">
        
        {/* Brand & Badge Header */}
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center gap-3.5">
            <img
              src="/brand/kkn-pringgasela-selatan-2026-2027.png"
              alt="Logo KKN Pringgasela Selatan 2026-2027"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-full shadow-subtle border-2 border-sage-600/20 p-0.5 bg-white transition-transform hover:scale-105 duration-200"
              onError={(e) => {
                ;(e.currentTarget as HTMLElement).style.display = 'none'
              }}
            />
            <div className="text-left">
              <span className="font-serif font-bold text-lg sm:text-xl text-charcoal tracking-wide block">
                KKN SPACE
              </span>
              <span className="text-xs font-sans text-charcoal-muted tracking-tight block">
                Desa Pringgasela Selatan · Lombok Timur
              </span>
            </div>
          </div>

          {/* Maintenance Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span>SEDANG PEMELIHARAAN</span>
          </div>
        </div>

        {/* Elegant Animated Mechanical / System Icon */}
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 bg-sage-100 rounded-2xl rotate-6 transition-transform group-hover:rotate-12 duration-300" />
          <div className="relative w-full h-full bg-white border border-warm-300 rounded-2xl flex items-center justify-center shadow-subtle">
            <Wrench className="w-9 h-9 text-sage-600 animate-pulse" />
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-charcoal leading-snug">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-muted leading-relaxed max-w-md mx-auto">
            {message}
          </p>
        </div>

        {/* Operation Info Grid */}
        <div className="bg-warm-50/80 border border-warm-200/80 rounded-2xl p-4 sm:p-5 text-left space-y-3 text-xs sm:text-sm">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-sage-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-charcoal block">Aktivitas Pemeliharaan:</span>
              <span className="text-charcoal-muted leading-normal block mt-0.5">
                {workDescription}
              </span>
            </div>
          </div>

          {startTime && (
            <div className="flex items-center gap-2.5 pt-2 border-t border-warm-200/60">
              <Calendar className="w-4 h-4 text-charcoal-muted shrink-0" />
              <div className="flex flex-wrap items-center justify-between gap-1 w-full text-xs">
                <span className="text-charcoal-muted">Dimulai Sejak:</span>
                <span className="font-medium text-charcoal font-mono">
                  {formatDateTime(startTime)}
                </span>
              </div>
            </div>
          )}

          {/* Render ONLY if estimated end time is specified by Super Admin */}
          {estimatedEndTime && (
            <div className="flex items-center gap-2.5 pt-2 border-t border-warm-200/60">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="flex flex-wrap items-center justify-between gap-1 w-full text-xs">
                <span className="text-charcoal-muted">Estimasi Selesai:</span>
                <span className="font-semibold text-amber-800 font-mono bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {formatDateTime(estimatedEndTime)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Live Feedback Toast if user clicks check status */}
        {checkFeedback && (
          <div className="p-3 bg-warm-200/70 border border-warm-300 rounded-xl text-xs text-charcoal flex items-center justify-center gap-2 animate-fade-in font-medium">
            <CheckCircle2 className="w-4 h-4 text-sage-600" />
            <span>{checkFeedback}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
          <Button
            onClick={handleCheckStatus}
            disabled={isChecking}
            className="w-full sm:w-auto bg-sage-600 hover:bg-sage-700 text-white gap-2 font-medium shadow-subtle px-6 py-2.5"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Memeriksa Status...' : 'Periksa Status & Coba Lagi'}
          </Button>

          {/* Show back to home if on sub-route and public is not the one maintained */}
          {config?.scope === 'workspace' && (
            <Button
              asChild
              variant="outline"
              className="w-full sm:w-auto border-warm-300 hover:bg-warm-50 text-charcoal gap-2 font-medium px-5"
            >
              <Link to="/">
                <Home className="w-4 h-4 text-charcoal-muted" />
                Kembali ke Beranda
              </Link>
            </Button>
          )}
        </div>

        {/* Footer Note */}
        <div className="pt-2 text-[11px] text-charcoal-muted/80">
          Tim Pengembang KKN SPACE · Lembaga Penelitian dan Pengabdian Kepada Masyarakat (LPPM) UNRAM
        </div>

      </main>
    </div>
  )
}

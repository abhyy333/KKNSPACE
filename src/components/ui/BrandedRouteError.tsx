import React, { useState, useEffect } from 'react'
import { useRouteError, isRouteErrorResponse } from 'react-router-dom'
import { RefreshCw, Home, WifiOff, AlertTriangle, FileQuestion, ChevronDown } from 'lucide-react'
import { Button } from './button'
import { isChunkLoadError, clearChunkRetryFlag } from '@/lib/lazyWithRetry'

interface BrandedRouteErrorProps {
  error?: unknown
  resetErrorBoundary?: () => void
}

const BrandedErrorView: React.FC<BrandedRouteErrorProps & { resolvedError: unknown }> = ({
  resolvedError: error,
  resetErrorBoundary,
}) => {
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

  const is404 =
    (isRouteErrorResponse(error) && error.status === 404) ||
    (typeof error === 'object' && error !== null && 'status' in error && (error as any).status === 404)
  const isChunkError = isChunkLoadError(error)
  const isNetworkIssue = !isOnline || (error instanceof TypeError && /fetch|network|failed/i.test(error.message))

  const handleReload = () => {
    clearChunkRetryFlag()
    if (resetErrorBoundary) {
      resetErrorBoundary()
    }
    window.location.reload()
  }

  // Determine error category & text
  let badgeText = 'GANGGUAN TEKNIS'
  let badgeColor = 'bg-amber-100 text-amber-800 border-amber-200'
  let title = 'Sepertinya halaman belum dapat dimuat'
  let description =
    'Kami mengalami kendala saat memuat halaman ini. Coba muat ulang untuk mendapatkan versi aplikasi terbaru.'
  let icon = <AlertTriangle className="w-7 h-7 text-amber-600" />

  if (is404) {
    badgeText = 'TIDAK DITEMUKAN'
    badgeColor = 'bg-warm-200 text-charcoal border-warm-300'
    title = 'Halaman Tidak Ditemukan'
    description = 'Halaman yang Anda tuju tidak tersedia atau telah dipindahkan ke tautan lain.'
    icon = <FileQuestion className="w-7 h-7 text-charcoal-muted" />
  } else if (isNetworkIssue) {
    badgeText = 'KONEKSI TERPUTUS'
    badgeColor = 'bg-amber-100 text-amber-800 border-amber-200'
    title = 'Koneksi Internet Terputus'
    description =
      'Perangkat Anda sepertinya sedang offline. Periksa koneksi internet Anda dan coba kembali.'
    icon = <WifiOff className="w-7 h-7 text-amber-600" />
  } else if (isChunkError) {
    badgeText = 'VERSI DIPERBARUI'
    badgeColor = 'bg-sage-100 text-sage-800 border-sage-200'
    title = 'Versi Aplikasi Telah Diperbarui'
    description =
      'Versi aplikasi KKN SPACE telah diperbarui di server. Silakan muat ulang halaman untuk mengunduh komponen aplikasi versi terbaru.'
    icon = <RefreshCw className="w-7 h-7 text-sage-600 animate-spin-slow" />
  }

  const errorMessage =
    error instanceof Error
      ? error.message
      : isRouteErrorResponse(error)
      ? `${error.status} ${error.statusText}`
      : 'Kendala tidak terduga'

  useEffect(() => {
    document.title = `${title} | KKN SPACE`
    let robotsMeta = document.querySelector('meta[name="robots"]')
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta')
      robotsMeta.setAttribute('name', 'robots')
      document.head.appendChild(robotsMeta)
    }
    robotsMeta.setAttribute('content', 'noindex, nofollow, noarchive')
  }, [title])

  return (
    <div className="min-h-screen bg-warm-100 flex items-center justify-center p-4 sm:p-6 text-charcoal selection:bg-sage-500/20">
      <div className="max-w-lg w-full bg-white border border-warm-300 rounded-2xl p-6 sm:p-8 shadow-card text-center space-y-6">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center">
          <a href="/" className="inline-flex items-center gap-3 group mb-4">
            <img
              src="/brand/kkn-pringgasela-selatan-2026-2027.png"
              alt="Logo KKN Pringgasela Selatan"
              className="w-14 h-14 object-contain rounded-full shadow-subtle border border-warm-300 transition-transform group-hover:scale-105"
              onError={(e) => {
                ;(e.currentTarget as HTMLElement).style.display = 'none'
              }}
            />
            <div className="text-left">
              <span className="font-serif font-bold text-base text-charcoal tracking-wide block">
                KKN SPACE
              </span>
              <span className="text-[11px] font-sans text-charcoal-muted tracking-tight block">
                Pringgasela Selatan 2026–2027
              </span>
            </div>
          </a>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase border shadow-2xs">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>
              {badgeText}
            </span>
          </div>
        </div>

        {/* Visual Icon */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-warm-100 border border-warm-300 flex items-center justify-center shadow-subtle">
          {icon}
        </div>

        {/* Content Heading */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-charcoal">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-muted max-w-sm mx-auto leading-relaxed">
            {description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            onClick={handleReload}
            variant="default"
            size="sm"
            className="w-full sm:w-auto bg-sage-700 hover:bg-sage-800 text-white gap-2 text-xs py-2 px-5 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Muat Ulang Halaman
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full sm:w-auto border-warm-300 hover:bg-warm-100 text-charcoal text-xs py-2 px-5"
          >
            <a href="/" className="inline-flex items-center gap-1.5">
              <Home className="w-4 h-4 text-charcoal-muted" />
              Kembali ke Beranda
            </a>
          </Button>
        </div>

        {/* Diagnostics Drawer */}
        <div className="pt-4 border-t border-warm-200 text-left">
          <button
            type="button"
            onClick={() => setShowDiagnostics((prev) => !prev)}
            className="w-full flex items-center justify-between text-[11px] text-charcoal-muted hover:text-charcoal font-medium py-1 transition-colors"
          >
            <span>Informasi Teknis & Diagnostik</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                showDiagnostics ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showDiagnostics && (
            <div className="mt-2.5 p-3 rounded-lg bg-warm-100 border border-warm-200 text-[11px] text-charcoal-muted space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span>Waktu Kejadian:</span>
                <span className="text-charcoal">{new Date().toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Lokasi Halaman:</span>
                <span className="text-charcoal truncate max-w-[200px]" title={window.location.pathname}>
                  {window.location.pathname}
                </span>
              </div>
              <div className="pt-1 border-t border-warm-200 text-[10px] break-all text-charcoal-muted/90">
                <span className="text-amber-800 font-semibold block mb-0.5">
                  Rincian Kesalahan:
                </span>
                {errorMessage}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

function InnerRouteError(props: BrandedRouteErrorProps) {
  const routeError = useRouteError()
  return <BrandedErrorView {...props} resolvedError={props.error || routeError} />
}

export const BrandedRouteError: React.FC<BrandedRouteErrorProps> = (props) => {
  if (props.error) {
    return <BrandedErrorView {...props} resolvedError={props.error} />
  }
  return <InnerRouteError {...props} />
}

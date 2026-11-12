import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft } from 'lucide-react'

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-warm-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white border border-warm-300 rounded-xl p-8 shadow-card space-y-5">
        <div className="text-4xl font-serif font-bold text-sage-800">404</div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold text-charcoal">
            Halaman Tidak Ditemukan
          </h1>
          <p className="text-xs text-charcoal-muted leading-relaxed">
            Halaman yang Anda tuju mungkin telah dipindahkan, dihapus, atau memerlukan izin otorisasi khusus.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Link to="/">
            <Button variant="default" size="sm" className="w-full sm:w-auto text-xs gap-1.5">
              <Home className="h-3.5 w-3.5" />
              <span>Beranda Publik</span>
            </Button>
          </Link>
          <Link to="/workspace">
            <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Workspace KKN</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

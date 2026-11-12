import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShieldAlert } from 'lucide-react'

export const AdminSettingsPage = () => (
  <div className="space-y-6">
    <div className="border-b border-warm-300 pb-5">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="border-charcoal text-charcoal">Admin Module</Badge>
        <span className="text-xs text-charcoal-muted">Fase 8 Implementasi</span>
      </div>
      <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal mt-2">
        Pengaturan Platform Sistem
      </h1>
      <p className="text-xs text-charcoal-muted mt-1">
        Konfigurasi integrasi Supabase Storage kkn-private, batas sesi, dan parameter sistem.
      </p>
    </div>

    <Card className="border-dashed border-warm-300 bg-white">
      <CardContent className="p-12 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warm-200 text-charcoal">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-charcoal">
            Pengaturan Platform Sistem
          </h3>
          <p className="text-xs text-charcoal-muted max-w-md mx-auto leading-relaxed">
            Hanya dapat diakses oleh Super Admin. Modul konfigurasi parameter tingkat platform dijadwalkan pada Fase 8.
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
)

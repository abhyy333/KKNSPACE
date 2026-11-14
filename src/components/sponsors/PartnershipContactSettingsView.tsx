import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchPartnershipContactSettings,
  updatePartnershipContactSettings,
} from '@/services/sponsorsApi'
import {
  normalizeWhatsAppNumber,
  isValidEmail,
  buildWhatsAppUrl,
  buildMailtoUrl,
} from '@/lib/sponsorContact'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Phone,
  Mail,
  AlertCircle,
  ExternalLink,
  Save,
  ShieldCheck,
  Eye,
  Info,
  Check,
  RotateCcw,
} from 'lucide-react'

export const PartnershipContactSettingsView: React.FC = () => {
  const { isSuperAdmin } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const canEdit = isSuperAdmin

  const { data: settings, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['partnership-contact-settings'],
    queryFn: fetchPartnershipContactSettings,
  })

  // Local form state preserving BOTH channels
  const [activeDestination, setActiveDestination] = useState<'whatsapp' | 'email'>('whatsapp')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [whatsappCountryCode, setWhatsappCountryCode] = useState('62')
  const [whatsappDefaultMessage, setWhatsappDefaultMessage] = useState('')

  const [emailAddress, setEmailAddress] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')

  // Sync state on load
  useEffect(() => {
    if (settings) {
      setActiveDestination(settings.active_destination || 'whatsapp')
      setWhatsappNumber(settings.whatsapp_number || '')
      setWhatsappCountryCode(settings.whatsapp_country_code || '62')
      setWhatsappDefaultMessage(settings.whatsapp_default_message || '')
      setEmailAddress(settings.email_address || '')
      setEmailSubject(settings.email_subject || '')
      setEmailBody(settings.email_body || '')
    }
  }, [settings])

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: () =>
      updatePartnershipContactSettings({
        active_destination: activeDestination,
        whatsapp_number: whatsappNumber,
        whatsapp_country_code: whatsappCountryCode,
        whatsapp_default_message: whatsappDefaultMessage,
        email_address: emailAddress,
        email_subject: emailSubject,
        email_body: emailBody,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['partnership-contact-settings'], updated)
      queryClient.invalidateQueries({ queryKey: ['public-partnership-contact'] })
      queryClient.invalidateQueries({ queryKey: ['admin-audit-events'] })
      toast({
        title: 'Pengaturan Kontak Disimpan',
        description: `Destinasi aktif saat ini diarahkan ke ${
          updated.active_destination === 'whatsapp' ? 'WhatsApp' : 'Email'
        }.`,
        variant: 'success',
      })
    },
    onError: (err: any) => {
      toast({
        title: 'Gagal Menyimpan',
        description: err.message || 'Terjadi kesalahan saat menyimpan pengaturan.',
        variant: 'error',
      })
    },
  })

  // Validations & Live URL Previews
  const cleanPhone = normalizeWhatsAppNumber(whatsappNumber, whatsappCountryCode)
  const isPhoneValid = cleanPhone.length >= 8
  const isEmailValid = isValidEmail(emailAddress)

  const liveWhatsAppUrl = buildWhatsAppUrl(whatsappNumber, whatsappDefaultMessage, whatsappCountryCode)
  const liveMailtoUrl = buildMailtoUrl(emailAddress, emailSubject, emailBody)

  const isFormValid =
    activeDestination === 'whatsapp' ? isPhoneValid : isEmailValid

  const handleResetToCurrent = () => {
    if (settings) {
      setActiveDestination(settings.active_destination)
      setWhatsappNumber(settings.whatsapp_number)
      setWhatsappCountryCode(settings.whatsapp_country_code)
      setWhatsappDefaultMessage(settings.whatsapp_default_message)
      setEmailAddress(settings.email_address)
      setEmailSubject(settings.email_subject)
      setEmailBody(settings.email_body)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl bg-warm-200/60" />
        <Skeleton className="h-80 w-full rounded-2xl bg-warm-200/60" />
      </div>
    )
  }

  if (isError) {
    return (
      <Card className="border-rose-300 bg-rose-50/50">
        <CardContent className="p-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-rose-900">Gagal Memuat Pengaturan</h4>
            <p className="text-xs text-rose-700 leading-relaxed">
              {(error as any)?.message || 'Tidak dapat membaca data konfigurasi kontak partnership.'}
            </p>
            <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs">
              Coba Lagi
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Permission Callout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-forest" />
            <h2 className="text-lg font-serif font-bold text-charcoal">
              Partnership Contact Settings
            </h2>
          </div>
          <p className="text-xs text-charcoal-muted mt-1 leading-relaxed max-w-2xl">
            Kelola saluran tujuan tombol publik <strong>&ldquo;Konsultasikan Paket&rdquo;</strong> di portal sponsor.
            Anda dapat beralih antara WhatsApp dan Email kapan saja tanpa kehilangan konfigurasi yang telah disimpan.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {!canEdit && (
            <Badge variant="secondary" className="text-[11px] bg-amber-50 text-amber-800 border-amber-200 gap-1.5 py-1">
              <Eye className="h-3.5 w-3.5" />
              <span>Mode Pratinjau (Hanya Baca)</span>
            </Badge>
          )}
          {canEdit && (
            <Badge variant="secondary" className="text-[11px] bg-emerald-50 text-emerald-800 border-emerald-200 gap-1.5 py-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Akses Penuh Super Admin</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Info Callout */}
      <div className="rounded-2xl border border-warm-300/80 bg-warm-100/60 p-4 text-xs text-charcoal-muted flex items-start gap-3">
        <Info className="h-4 w-4 text-forest shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Prinsip Pengaturan:</strong> Hanya satu saluran yang aktif sebagai destinasi utama tombol publik dalam satu waktu.
          Data nomor WhatsApp maupun alamat Email tetap tersimpan di database saat Anda mengganti pilihan, sehingga siap digunakan kembali sewaktu-waktu.
        </p>
      </div>

      {/* Destination Selector Card */}
      <Card className="border-warm-300/80 shadow-2xs overflow-hidden">
        <CardHeader className="bg-warm-100/40 pb-4 border-b border-warm-200">
          <CardTitle className="text-sm font-semibold text-charcoal flex items-center justify-between">
            <span>Pilih Saluran Destinasi Aktif</span>
            <span className="text-xs font-mono font-normal text-charcoal-muted">
              Saat ini: <strong className="text-forest uppercase">{activeDestination}</strong>
            </span>
          </CardTitle>
          <CardDescription className="text-xs text-charcoal-muted">
            Tentukan ke mana pengunjung akan diarahkan ketika mengeklik tombol konsultasi kemitraan di portal publik.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* WhatsApp Option Card */}
            <div
              onClick={() => canEdit && setActiveDestination('whatsapp')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                activeDestination === 'whatsapp'
                  ? 'border-forest bg-forest/5 shadow-2xs'
                  : 'border-warm-200 hover:border-warm-300 bg-white'
              } ${!canEdit ? 'cursor-default' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      activeDestination === 'whatsapp'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-warm-100 text-charcoal-muted'
                    }`}
                  >
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-charcoal">WhatsApp Hotline</h3>
                    <p className="text-[11px] text-charcoal-muted">Redirect langsung ke WhatsApp Web / App</p>
                  </div>
                </div>
                {activeDestination === 'whatsapp' && (
                  <span className="h-5 w-5 rounded-full bg-forest text-white flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-warm-200/60 flex items-center justify-between text-[11px]">
                <span className="text-charcoal-muted">Nomor Terkonfigurasi:</span>
                <span className="font-mono font-medium text-charcoal truncate max-w-[150px]">
                  {cleanPhone ? `+${cleanPhone}` : '(Belum diatur)'}
                </span>
              </div>
            </div>

            {/* Email Option Card */}
            <div
              onClick={() => canEdit && setActiveDestination('email')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                activeDestination === 'email'
                  ? 'border-forest bg-forest/5 shadow-2xs'
                  : 'border-warm-200 hover:border-warm-300 bg-white'
              } ${!canEdit ? 'cursor-default' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      activeDestination === 'email'
                        ? 'bg-blue-600 text-white'
                        : 'bg-warm-100 text-charcoal-muted'
                    }`}
                  >
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-charcoal">Official Email (Mailto)</h3>
                    <p className="text-[11px] text-charcoal-muted">Membuka aplikasi surel dengan subjek otomatis</p>
                  </div>
                </div>
                {activeDestination === 'email' && (
                  <span className="h-5 w-5 rounded-full bg-forest text-white flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-warm-200/60 flex items-center justify-between text-[11px]">
                <span className="text-charcoal-muted">Email Terkonfigurasi:</span>
                <span className="font-mono font-medium text-charcoal truncate max-w-[180px]">
                  {emailAddress || '(Belum diatur)'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Configuration Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WhatsApp Configuration Panel */}
        <Card className={`border-warm-300/80 shadow-2xs ${activeDestination === 'whatsapp' ? 'ring-2 ring-forest/20' : 'opacity-90'}`}>
          <CardHeader className="bg-warm-100/30 pb-3 border-b border-warm-200 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-charcoal flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                <span>Konfigurasi WhatsApp</span>
              </CardTitle>
              <CardDescription className="text-[11px] text-charcoal-muted mt-0.5">
                Pengaturan nomor telepon dan pesan default
              </CardDescription>
            </div>
            {activeDestination === 'whatsapp' ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">Aktif</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-charcoal-muted">Tersimpan</Badge>
            )}
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1 space-y-1">
                <label className="text-[11px] font-semibold text-charcoal block">Kode Negara</label>
                <Input
                  disabled={!canEdit}
                  value={whatsappCountryCode}
                  onChange={(e) => setWhatsappCountryCode(e.target.value)}
                  placeholder="62"
                  className="font-mono text-xs"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-charcoal block">
                  Nomor WhatsApp <span className="text-rose-500">*</span>
                </label>
                <Input
                  disabled={!canEdit}
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="Contoh: 081907604500"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            {whatsappNumber && (
              <div className="text-[11px] flex items-center justify-between text-charcoal-muted bg-warm-100/80 px-2.5 py-1.5 rounded-lg font-mono">
                <span>Hasil Normalisasi:</span>
                <span className={isPhoneValid ? 'text-forest font-semibold' : 'text-rose-600 font-semibold'}>
                  {cleanPhone ? `+${cleanPhone}` : 'Format tidak valid'}
                </span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-charcoal block">Pesan Otomatis (Predefined Message)</label>
              <textarea
                disabled={!canEdit}
                rows={3}
                value={whatsappDefaultMessage}
                onChange={(e) => setWhatsappDefaultMessage(e.target.value)}
                placeholder="Pesan yang otomatis terisi ketika sponsor membuka chat..."
                className="w-full text-xs rounded-lg border border-warm-300 p-2.5 focus:border-forest focus:ring-1 focus:ring-forest bg-white disabled:bg-warm-100/70"
              />
            </div>

            {/* Live WhatsApp Preview */}
            <div className="space-y-1.5 pt-2 border-t border-warm-200">
              <label className="text-[10px] font-mono uppercase tracking-wider text-charcoal-muted block">
                Live URL Preview
              </label>
              <div className="p-2.5 rounded-lg bg-warm-100/80 border border-warm-200 font-mono text-[10px] text-charcoal break-all select-all">
                {liveWhatsAppUrl || <span className="text-rose-500 italic">Nomor belum valid untuk URL WhatsApp</span>}
              </div>
              {liveWhatsAppUrl && (
                <div className="pt-1">
                  <a
                    href={liveWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-forest hover:text-forest/80 font-medium underline underline-offset-2"
                  >
                    <span>Uji Buka WhatsApp</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Email Configuration Panel */}
        <Card className={`border-warm-300/80 shadow-2xs ${activeDestination === 'email' ? 'ring-2 ring-forest/20' : 'opacity-90'}`}>
          <CardHeader className="bg-warm-100/30 pb-3 border-b border-warm-200 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-charcoal flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-blue-600" />
                <span>Konfigurasi Email</span>
              </CardTitle>
              <CardDescription className="text-[11px] text-charcoal-muted mt-0.5">
                Pengaturan alamat email, subjek, dan draft tubuh surel
              </CardDescription>
            </div>
            {activeDestination === 'email' ? (
              <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px]">Aktif</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-charcoal-muted">Tersimpan</Badge>
            )}
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-charcoal block">
                Alamat Email Resmi <span className="text-rose-500">*</span>
              </label>
              <Input
                disabled={!canEdit}
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="Contoh: partnership@kknspace.org"
                className="font-mono text-xs"
              />
              {emailAddress && !isEmailValid && (
                <span className="text-[10px] text-rose-500 block">Format email tidak valid.</span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-charcoal block">Subjek Email Default</label>
              <Input
                disabled={!canEdit}
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Contoh: Partnership Inquiry — KKN SPACE"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-charcoal block">Isi Pesan Email Default</label>
              <textarea
                disabled={!canEdit}
                rows={3}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Halo, saya tertarik untuk mendiskusikan peluang kerja sama..."
                className="w-full text-xs rounded-lg border border-warm-300 p-2.5 focus:border-forest focus:ring-1 focus:ring-forest bg-white disabled:bg-warm-100/70"
              />
            </div>

            {/* Live Mailto Preview */}
            <div className="space-y-1.5 pt-2 border-t border-warm-200">
              <label className="text-[10px] font-mono uppercase tracking-wider text-charcoal-muted block">
                Live Mailto Preview
              </label>
              <div className="p-2.5 rounded-lg bg-warm-100/80 border border-warm-200 font-mono text-[10px] text-charcoal break-all select-all">
                {liveMailtoUrl || <span className="text-rose-500 italic">Email belum valid untuk link Mailto</span>}
              </div>
              {liveMailtoUrl && (
                <div className="pt-1">
                  <a
                    href={liveMailtoUrl}
                    className="inline-flex items-center gap-1.5 text-xs text-forest hover:text-forest/80 font-medium underline underline-offset-2"
                  >
                    <span>Uji Buka Aplikasi Email</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Public Simulator & Save Footer */}
      <Card className="border-warm-300/80 bg-warm-50/50">
        <CardContent className="p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <span className="w-1.5 h-1.5 rounded-full bg-forest" />
              <span className="text-xs font-semibold text-charcoal">Status Siar Publik:</span>
              <Badge className="bg-forest text-white text-[10px]">
                {activeDestination === 'whatsapp' ? 'WhatsApp Terhubung' : 'Email Terhubung'}
              </Badge>
            </div>
            <p className="text-[11px] text-charcoal-muted">
              {settings?.updated_at ? (
                <>
                  Terakhir diperbarui pada{' '}
                  <span className="font-mono font-medium text-charcoal">
                    {new Date(settings.updated_at).toLocaleString('id-ID', {
                      timeZone: 'Asia/Makassar',
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}{' '}
                    WITA
                  </span>
                  {settings.updated_by_name ? ` oleh ${settings.updated_by_name}` : ''}
                </>
              ) : (
                'Belum ada riwayat pembaruan tersimpan.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {canEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetToCurrent}
                disabled={saveMutation.isPending}
                className="text-xs gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </Button>
            )}

            {canEdit && (
              <Button
                type="button"
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={!isFormValid || saveMutation.isPending}
                className="bg-forest hover:bg-forest/90 text-white text-xs gap-1.5 px-5 shadow-xs"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{saveMutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

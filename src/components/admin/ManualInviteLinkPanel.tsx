import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { Check, Copy, ExternalLink, Info, ShieldCheck, MailWarning, UserCheck } from 'lucide-react'

interface ManualInviteLinkPanelProps {
  fullName?: string
  email: string
  positionLabel?: string | null
  inviteLink: string
  message: string
  onDone: () => void
}

/**
 * Panel modal tautan aktivasi akun anggota KKN SPACE.
 * Super Admin menyalin tautan aman ini dan membagikannya secara manual via WhatsApp pribadi.
 */
export const ManualInviteLinkPanel: React.FC<ManualInviteLinkPanelProps> = ({
  fullName,
  email,
  positionLabel,
  inviteLink,
  message,
  onDone,
}) => {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      toast({
        variant: 'success',
        title: 'Tautan Disalin ke Clipboard',
        description: `Tautan aktivasi untuk ${fullName || email} berhasil disalin.`,
      })
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast({
        variant: 'error',
        title: 'Gagal Menyalin Otomatis',
        description: 'Silakan pilih teks tautan di kolom lalu tekan Ctrl+C secara manual.',
      })
    }
  }

  // Allow preview locally or on production domain
  const previewUrl = inviteLink.includes('kknspace.vercel.app') && window.location.origin.includes('127.0.0.1')
    ? inviteLink.replace('https://kknspace.vercel.app', window.location.origin)
    : inviteLink

  return (
    <div className="space-y-4 text-xs">
      {/* Status Pengiriman Email */}
      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-1.5">
        <div className="flex items-center gap-2 font-semibold text-amber-800">
          <MailWarning className="h-4 w-4 shrink-0 text-amber-600" />
          <span>Status: Email Otomatis Tidak Terkirim (SMTP Sandbox)</span>
        </div>
        <p className="text-[11px] text-amber-800/90 leading-relaxed">
          {message || 'Email otomatis tidak terkirim karena pembatasan SMTP. Gunakan tautan aktivasi manual resmi di bawah ini untuk dibagikan secara mandiri.'}
        </p>
      </div>

      {/* Informasi Anggota */}
      <div className="p-3 bg-warm-50 border border-warm-200 rounded-lg space-y-2">
        <div className="flex items-center gap-1.5 font-medium text-charcoal text-[11px]">
          <UserCheck className="h-3.5 w-3.5 text-sage-600" />
          <span>Identitas Anggota Tim KKN</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-charcoal-muted block text-[10px]">Nama Anggota</span>
            <span className="font-medium text-charcoal truncate block">{fullName || 'Calon Anggota'}</span>
          </div>
          <div>
            <span className="text-charcoal-muted block text-[10px]">Jabatan Resmi</span>
            <span className="font-medium text-charcoal block">{positionLabel || 'Anggota'}</span>
          </div>
          <div className="col-span-2">
            <span className="text-charcoal-muted block text-[10px]">Email Tujuan</span>
            <span className="font-mono text-charcoal truncate block">{email}</span>
          </div>
        </div>
      </div>

      {/* Field Tautan Aktivasi Resmi */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-charcoal flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-sage-600" />
            <span>Tautan Aktivasi Aman (Safe Activation Link)</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="text"
            readOnly
            value={inviteLink}
            onFocus={(e) => e.currentTarget.select()}
            className="font-mono text-[11px] bg-warm-50/80 border-warm-300"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleCopy}
            className={`shrink-0 text-xs gap-1.5 font-medium transition-all ${
              copied
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-sage-700 hover:bg-sage-800 text-white'
            }`}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Salin Tautan</span>
              </>
            )}
          </Button>
        </div>

        {/* Petunjuk Operasional Manual */}
        <div className="p-2.5 bg-warm-100/60 rounded border border-warm-200/80 text-[11px] text-charcoal space-y-1.5">
          <div className="flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 text-sage-600 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed text-charcoal-muted">
              <p>
                <strong className="text-charcoal">Petunjuk Distribusi:</strong> Salin tautan ini, kemudian kirimkan secara manual kepada anggota melalui WhatsApp atau media komunikasi pilihan Anda.
              </p>
              <p>
                <strong className="text-charcoal">Keamanan Token:</strong> Ketika anggota membuka tautan, halaman aktivasi akan tampil tanpa mengonsumsi token. Token baru diproses dan diverifikasi setelah anggota menekan tombol <strong>Aktifkan Akun</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Modal */}
      <div className="flex items-center justify-between pt-3 border-t border-warm-200">
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] text-sage-700 hover:text-sage-800 hover:underline font-medium"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Buka Preview</span>
        </a>
        <Button
          type="button"
          size="sm"
          onClick={onDone}
          className="bg-charcoal hover:bg-black text-white text-xs px-4"
        >
          Selesai
        </Button>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { Check, Copy, ExternalLink, Info } from 'lucide-react'

interface ManualInviteLinkPanelProps {
  email: string
  inviteLink: string
  message: string
  onDone: () => void
}

/**
 * Displays a generated Supabase Auth invite link when SMTP email delivery falls back to manual distribution.
 */
export const ManualInviteLinkPanel: React.FC<ManualInviteLinkPanelProps> = ({
  email,
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
        title: 'Tautan Disalin',
        description: `Tautan aktivasi untuk ${email} berhasil disalin ke clipboard.`,
      })
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast({
        variant: 'error',
        title: 'Gagal Menyalin Otomatis',
        description: 'Silakan blok teks tautan di kolom lalu tekan Ctrl+C secara manual.',
      })
    }
  }

  return (
    <div className="space-y-4 text-xs">
      <div className="p-3 rounded-md bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-amber-900">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-700" />
        <div className="space-y-1 leading-relaxed">
          <p className="font-semibold">Tautan Undangan Manual Siap Dibagikan</p>
          <p>{message}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-charcoal">
          Tautan Aktivasi Resmi ({email})
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            readOnly
            value={inviteLink}
            onFocus={(e) => e.currentTarget.select()}
            className="font-mono text-[11px] bg-warm-50"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="shrink-0 text-xs gap-1.5"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Salin</span>
              </>
            )}
          </Button>
        </div>
        <p className="text-[11px] text-charcoal-muted leading-relaxed">
          Kirimkan tautan ini langsung ke <span className="font-mono text-charcoal">{email}</span>. Jika Anda menguji sendiri di perangkat ini, buka di jendela <strong>Incognito / InPrivate</strong> agar sesi Super Admin Anda tidak tertimpa.
        </p>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-warm-200">
        <a
          href={inviteLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-sage-700 hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          <span>Buka di Tab Baru</span>
        </a>
        <Button
          type="button"
          size="sm"
          onClick={onDone}
          className="bg-charcoal hover:bg-black text-white text-xs"
        >
          Selesai
        </Button>
      </div>
    </div>
  )
}

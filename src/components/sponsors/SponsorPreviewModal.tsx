import React, { useState } from 'react'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SponsorLogoThumbnail } from './SponsorLogoThumbnail'
import type { Sponsor } from '@/types/sponsor'
import {
  SPONSOR_CATEGORY_LABELS,
  SPONSOR_CONTRIBUTION_LABELS,
} from '@/types/sponsor'
import {
  CheckCircle2,
  Layout,
  Home,
  PanelBottom,
} from 'lucide-react'

interface SponsorPreviewModalProps {
  open: boolean
  onClose: () => void
  sponsor: Sponsor | null
}

export const SponsorPreviewModal: React.FC<SponsorPreviewModalProps> = ({
  open,
  onClose,
  sponsor,
}) => {
  const [activeTab, setActiveTab] = useState<'directory' | 'home' | 'footer'>('directory')

  if (!sponsor) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Pratinjau Publik — ${sponsor.name}`}
      description="Visualisasi tampilan sponsor di website publik setelah disetujui Admin."
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-5">
        {/* View switcher tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-warm-200/60 rounded-xl border border-warm-300">
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'directory'
                ? 'bg-white text-forest shadow-xs'
                : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            <Layout className="h-3.5 w-3.5" />
            <span>Halaman /sponsors</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'home'
                ? 'bg-white text-forest shadow-xs'
                : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            <Home className="h-3.5 w-3.5" />
            <span>Section Homepage</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('footer')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'footer'
                ? 'bg-white text-forest shadow-xs'
                : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            <PanelBottom className="h-3.5 w-3.5" />
            <span>Bilah Footer</span>
          </button>
        </div>

        {/* 1. Directory View Preview */}
        {activeTab === 'directory' && (
          <div className="space-y-2">
            <span className="text-[11px] font-mono tracking-wider text-charcoal-muted uppercase block">
              Pratinjau Editorial di Direktori /sponsors
            </span>
            <div className="rounded-3xl border border-warm-200/90 bg-white p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-5">
                <div className="w-full sm:w-44 h-32 bg-[#FAF9F6] rounded-2xl border border-warm-200/80 p-4 flex items-center justify-center shrink-0">
                  <SponsorLogoThumbnail
                    fileId={sponsor.logo_file_id}
                    sponsorId={sponsor.id}
                    alt={sponsor.name}
                    containerClassName="w-full h-full flex items-center justify-center overflow-hidden"
                  />
                </div>
                <div className="flex-1 space-y-2 text-center sm:text-left py-1">
                  <span className="text-[10px] font-mono tracking-widest text-[#B19A6B] uppercase font-semibold block">
                    {SPONSOR_CATEGORY_LABELS[sponsor.category] || sponsor.category}
                  </span>
                  <h3 className="text-xl font-serif font-medium text-charcoal">{sponsor.name}</h3>
                  <span className="text-xs text-charcoal-muted block">
                    {SPONSOR_CONTRIBUTION_LABELS[sponsor.contribution_type] || sponsor.contribution_type}
                  </span>
                  {sponsor.contribution_description && (
                    <div className="inline-flex items-center gap-1.5 text-xs text-charcoal bg-[#FAF9F6] border border-warm-200 px-3 py-1 rounded-xl">
                      <span className="text-[#B19A6B] font-semibold">Bentuk Dukungan:</span>
                      <span>{sponsor.contribution_description}</span>
                    </div>
                  )}
                </div>
              </div>

              {sponsor.description && (
                <p className="text-xs text-charcoal-muted font-light leading-relaxed border-t border-warm-200/70 pt-3">
                  {sponsor.description}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 2. Homepage Section Preview */}
        {activeTab === 'home' && (
          <div className="space-y-2">
            <span className="text-[11px] font-mono tracking-wider text-charcoal-muted uppercase block">
              Pratinjau Featured Showcase di Homepage
            </span>
            <div className="rounded-3xl border border-[#28493A] bg-gradient-to-br from-[#19382B] via-[#163126] to-[#10221A] p-6 text-white shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="w-full sm:w-44 h-32 bg-white rounded-2xl p-4 flex items-center justify-center shrink-0 shadow-2xs">
                  <SponsorLogoThumbnail
                    fileId={sponsor.logo_file_id}
                    sponsorId={sponsor.id}
                    alt={sponsor.name}
                    containerClassName="w-full h-full flex items-center justify-center overflow-hidden"
                  />
                </div>
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <span className="text-[10px] font-mono tracking-widest text-[#B19A6B] uppercase font-semibold block">
                    {SPONSOR_CATEGORY_LABELS[sponsor.category] || 'Mitra Resmi'}
                  </span>
                  <h3 className="text-xl font-serif font-medium text-white">{sponsor.name}</h3>
                  <p className="text-xs text-emerald-100/80 font-light line-clamp-2">
                    {sponsor.description || 'Mitra resmi pendukung program KKN SPACE.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Footer Strip Preview */}
        {activeTab === 'footer' && (
          <div className="space-y-2">
            <span className="text-[11px] font-mono tracking-wider text-charcoal-muted uppercase block">
              Pratinjau Logo Strip di Footer Halaman Publik
            </span>
            <div className="rounded-2xl border border-warm-200/90 bg-white p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B19A6B]" />
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-charcoal">
                  Official Partners &amp; Sponsors
                </span>
              </div>
              <div className="flex items-center gap-3 border-t border-warm-200/80 pt-3">
                <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl border border-warm-200/90 bg-[#FAF9F6]">
                  <SponsorLogoThumbnail
                    fileId={sponsor.logo_file_id}
                    sponsorId={sponsor.id}
                    alt={sponsor.name}
                    containerClassName="w-8 h-6 flex items-center justify-center shrink-0 overflow-hidden"
                  />
                  <span className="text-xs font-serif font-medium text-charcoal">{sponsor.name}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2 text-emerald-800 text-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>Informasi kontak pribadi, email, no. telepon, dan catatan negosiasi internal terjamin aman dan <strong>TIDAK PERNAH</strong> ditampilkan pada tampilan publik.</span>
        </div>

        <div className="flex justify-end pt-2 border-t border-warm-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
            Tutup Pratinjau
          </Button>
        </div>
      </div>
    </Modal>
  )
}

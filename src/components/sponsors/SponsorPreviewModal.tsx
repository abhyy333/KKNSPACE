import React, { useState } from 'react'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SponsorLogoThumbnail } from './SponsorLogoThumbnail'
import type { Sponsor } from '@/types/sponsor'
import {
  SPONSOR_CATEGORY_LABELS,
  SPONSOR_CONTRIBUTION_LABELS,
} from '@/types/sponsor'
import {
  ExternalLink,
  Globe,
  Share2,
  CheckCircle2,
  Calendar,
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
            <span className="text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider block">
              Pratinjau Card di Direktori Publik
            </span>
            <div className="rounded-2xl border border-warm-300 bg-white p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <SponsorLogoThumbnail
                    fileId={sponsor.logo_file_id}
                    sponsorId={sponsor.id}
                    alt={sponsor.name}
                    containerClassName="w-24 h-16 bg-white rounded-xl border border-warm-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs"
                  />
                  <div className="space-y-1">
                    <h3 className="text-base font-serif font-bold text-charcoal">{sponsor.name}</h3>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge className="bg-forest/10 text-forest border-forest/20 text-[10px] font-medium">
                        {SPONSOR_CATEGORY_LABELS[sponsor.category] || sponsor.category}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] text-charcoal-muted border-warm-300">
                        {SPONSOR_CONTRIBUTION_LABELS[sponsor.contribution_type] || sponsor.contribution_type}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* External links */}
                <div className="flex items-center gap-2">
                  {sponsor.website_url && (
                    <a
                      href={sponsor.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-forest hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <span>Website</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {sponsor.social_media_url && (
                    <a
                      href={sponsor.social_media_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-forest hover:underline"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span>Medsos</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              {sponsor.description && (
                <p className="text-xs text-charcoal-muted leading-relaxed border-t border-warm-200 pt-3">
                  {sponsor.description}
                </p>
              )}

              {sponsor.contribution_description && (
                <div className="rounded-lg bg-warm-50 p-2.5 border border-warm-200/70 text-xs">
                  <span className="font-semibold text-charcoal">Bentuk Dukungan: </span>
                  <span className="text-charcoal-muted">{sponsor.contribution_description}</span>
                </div>
              )}

              {sponsor.start_date && (
                <div className="flex items-center gap-1 text-[11px] text-charcoal-muted pt-1">
                  <Calendar className="h-3 w-3 text-forest" />
                  <span>
                    Periode: {sponsor.start_date}
                    {sponsor.end_date ? ` s.d. ${sponsor.end_date}` : ' (Berkelanjutan)'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. Homepage Section Preview */}
        {activeTab === 'home' && (
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider block">
              Pratinjau Grid di Homepage (Section Our Sponsors & Partners)
            </span>
            <div className="rounded-2xl border border-warm-300 bg-[#FAF8F5] p-6 space-y-4">
              <div className="text-center space-y-1 mb-4">
                <span className="text-[10px] font-bold text-forest uppercase tracking-widest block">Dukungan & Kolaborasi</span>
                <h4 className="text-sm font-serif font-bold text-charcoal">Our Sponsors & Partners</h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto">
                <div className="rounded-xl border border-warm-200 bg-white p-3 text-center shadow-2xs flex flex-col items-center justify-center gap-2 hover:border-forest/40 transition-colors">
                  <SponsorLogoThumbnail
                    fileId={sponsor.logo_file_id}
                    sponsorId={sponsor.id}
                    alt={sponsor.name}
                    containerClassName="w-20 h-12 flex items-center justify-center shrink-0"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-charcoal block truncate max-w-[130px]">{sponsor.name}</span>
                    <span className="text-[10px] text-charcoal-muted block truncate max-w-[130px]">
                      {SPONSOR_CATEGORY_LABELS[sponsor.category] || sponsor.category}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Footer Strip Preview */}
        {activeTab === 'footer' && (
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider block">
              Pratinjau Logo Strip di Footer Halaman Publik
            </span>
            <div className="rounded-2xl border border-warm-300 bg-white p-5 space-y-3">
              <span className="text-[10px] font-semibold text-charcoal-muted uppercase tracking-wider block">
                Mitra Resmi & Sponsor Kegiatan:
              </span>
              <div className="flex items-center gap-3 border-t border-warm-200 pt-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-warm-200 bg-warm-50/50 hover:bg-warm-100/50 transition-colors">
                  <SponsorLogoThumbnail
                    fileId={sponsor.logo_file_id}
                    sponsorId={sponsor.id}
                    alt={sponsor.name}
                    containerClassName="w-8 h-6 flex items-center justify-center shrink-0"
                  />
                  <span className="text-xs font-medium text-charcoal truncate max-w-[150px]">{sponsor.name}</span>
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

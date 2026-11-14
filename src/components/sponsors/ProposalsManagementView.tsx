import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchSponsorProposals } from '@/services/sponsorsApi'
import { SponsorProposalModal } from './SponsorProposalModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { SponsorProposal, SponsorProposalStatus } from '@/types/sponsor'
import {
  SPONSOR_PROPOSAL_STATUS_LABELS,
  SPONSORSHIP_TIER_LABELS,
  SPONSORSHIP_TIER_COLORS,
} from '@/types/sponsor'
import {
  FileText,
  Plus,
  Eye,
  Send,
  Building2,
} from 'lucide-react'

export const ProposalsManagementView: React.FC = () => {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<SponsorProposalStatus | 'all'>('all')

  const [proposalModalOpen, setProposalModalOpen] = useState(false)
  const [activeProposal, setActiveProposal] = useState<SponsorProposal | null>(null)

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['sponsor-proposals-all'],
    queryFn: fetchSponsorProposals,
    staleTime: 1000 * 60,
  })

  const filteredProposals = proposals.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    return true
  })

  const handleOpenAdd = () => {
    setActiveProposal(null)
    setProposalModalOpen(true)
  }

  const handleOpenEdit = (p: SponsorProposal) => {
    setActiveProposal(p)
    setProposalModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-2xl border border-warm-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-[#B19A6B]">
              <FileText className="h-4 w-4" />
              <span>Manual Proposal Generator · No AI</span>
            </div>
            <h3 className="text-lg font-serif font-bold text-charcoal">
              Generator Dokumen Proposal Sponsorship
            </h3>
            <p className="text-xs text-charcoal-muted leading-relaxed max-w-2xl">
              Susun dan cetak proposal penawaran kemitraan A4 formal berbasis data terverifikasi KKN SPACE tanpa AI generik. Seluruh konten berasal dari template terverifikasi dan komitmen paket resmi.
            </p>
          </div>

          <Button
            size="sm"
            onClick={handleOpenAdd}
            className="bg-forest hover:bg-forest/90 text-white text-xs gap-1.5 shrink-0 shadow-subtle"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Susun Proposal Baru</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-charcoal-muted">Filter Status:</span>
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            statusFilter === 'all'
              ? 'bg-[#19382B] text-white'
              : 'bg-warm-100 text-charcoal hover:bg-warm-200'
          }`}
        >
          Semua ({proposals.length})
        </button>
        {Object.entries(SPONSOR_PROPOSAL_STATUS_LABELS).map(([k, label]) => {
          const count = proposals.filter((p) => p.status === k).length
          return (
            <button
              key={k}
              type="button"
              onClick={() => setStatusFilter(k as SponsorProposalStatus)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                statusFilter === k
                  ? 'bg-[#19382B] text-white'
                  : 'bg-warm-100 text-charcoal hover:bg-warm-200'
              }`}
            >
              {label} ({count})
            </button>
          )
        })}
      </div>

      {/* Proposals Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : filteredProposals.length === 0 ? (
        <Card className="rounded-2xl border-dashed border-warm-300 p-12 text-center text-charcoal-muted space-y-3 bg-white">
          <FileText className="h-8 w-8 text-warm-400 mx-auto" />
          <h4 className="text-sm font-semibold text-charcoal">Belum Ada Dokumen Proposal</h4>
          <p className="text-xs max-w-md mx-auto">
            Gunakan tombol Susun Proposal Baru untuk membuat penawaran kemitraan formal siap cetak PDF.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProposals.map((p) => {
            const tierStyle = SPONSORSHIP_TIER_COLORS[p.tier_key] || SPONSORSHIP_TIER_COLORS.none

            return (
              <Card
                key={p.id}
                className="rounded-2xl border border-warm-200/90 bg-white p-5 shadow-2xs hover:shadow-subtle transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-semibold text-charcoal-muted">
                      {p.proposal_number}
                    </span>
                    <Badge
                      className={`text-[10px] ${
                        p.status === 'sent'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : p.status === 'accepted'
                          ? 'bg-cyan-100 text-cyan-800 border-cyan-300'
                          : 'bg-warm-100 text-charcoal-muted border-warm-300'
                      }`}
                    >
                      {SPONSOR_PROPOSAL_STATUS_LABELS[p.status]}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="text-base font-serif font-bold text-charcoal">
                      {p.proposal_title}
                    </h4>
                    <p className="text-xs text-charcoal-muted mt-0.5 flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-forest" />
                      <span>Sasaran: <strong className="text-charcoal">{p.recipient_organization}</strong></span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono tracking-wider font-semibold uppercase px-2.5 py-0.5 rounded-full border ${tierStyle.bg} ${tierStyle.text} ${tierStyle.border}`}
                    >
                      {SPONSORSHIP_TIER_LABELS[p.tier_key]}
                    </span>
                  </div>

                  {p.requested_contribution_summary && (
                    <div className="rounded-xl bg-warm-50 p-2.5 text-xs border border-warm-200/80">
                      <span className="font-semibold text-charcoal block text-[11px]">Dukungan Ditawarkan:</span>
                      <p className="text-charcoal-muted line-clamp-2">{p.requested_contribution_summary}</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-warm-200 pt-3 flex items-center justify-between">
                  <div className="text-[10px] text-charcoal-muted">
                    {p.sent_at ? (
                      <span className="flex items-center gap-1 text-emerald-700">
                        <Send className="h-3 w-3" />
                        <span>Terkirim: {p.sent_at}</span>
                      </span>
                    ) : (
                      <span>Dibuat: {new Date(p.created_at).toLocaleDateString('id-ID')}</span>
                    )}
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEdit(p)}
                    className="text-xs gap-1.5 hover:border-[#19382B]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Lihat &amp; Cetak A4</span>
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Proposal Modal */}
      {proposalModalOpen && (
        <SponsorProposalModal
          open={proposalModalOpen}
          onClose={() => setProposalModalOpen(false)}
          proposal={activeProposal}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['sponsor-proposals-all'] })
            queryClient.invalidateQueries({ queryKey: ['sponsor-stats'] })
          }}
        />
      )}
    </div>
  )
}

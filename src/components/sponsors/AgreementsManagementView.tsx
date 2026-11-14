import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchSponsorAgreements } from '@/services/sponsorsApi'
import { AgreementFormModal } from './AgreementFormModal'
import { BenefitFulfillmentModal } from './BenefitFulfillmentModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { SponsorAgreement, SponsorAgreementStatus } from '@/types/sponsor'
import {
  SPONSOR_AGREEMENT_STATUS_LABELS,
  SPONSOR_CATEGORY_LABELS,
  SPONSORSHIP_TIER_LABELS,
  SPONSORSHIP_TIER_COLORS,
} from '@/types/sponsor'
import {
  FileText,
  Plus,
  CheckCircle2,
  Calendar,
  DollarSign,
  Package,
  Edit2,
  ListChecks,
  User,
  Handshake,
} from 'lucide-react'

export const AgreementsManagementView: React.FC = () => {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<SponsorAgreementStatus | 'all'>('all')

  // Modals
  const [agreementModalOpen, setAgreementModalOpen] = useState(false)
  const [editingAgreement, setEditingAgreement] = useState<SponsorAgreement | null>(null)

  const [benefitModalOpen, setBenefitModalOpen] = useState(false)
  const [activeBenefitAgreement, setActiveBenefitAgreement] = useState<SponsorAgreement | null>(null)

  const { data: agreements = [], isLoading } = useQuery({
    queryKey: ['sponsor-agreements-all'],
    queryFn: () => fetchSponsorAgreements(),
    staleTime: 1000 * 60,
  })

  const filteredAgreements = agreements.filter((a) => {
    if (statusFilter !== 'all' && a.agreement_status !== statusFilter) return false
    return true
  })

  const handleOpenAdd = () => {
    setEditingAgreement(null)
    setAgreementModalOpen(true)
  }

  const handleEdit = (a: SponsorAgreement) => {
    setEditingAgreement(a)
    setAgreementModalOpen(true)
  }

  const handleOpenBenefits = (a: SponsorAgreement) => {
    setActiveBenefitAgreement(a)
    setBenefitModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-warm-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-[#B19A6B]">
              <Handshake className="h-4 w-4" />
              <span>Sponsorship Agreements &amp; Snapshots</span>
            </div>
            <h3 className="text-lg font-serif font-bold text-charcoal">
              Perjanjian Kerja Sama &amp; Pelacak Benefit
            </h3>
            <p className="text-xs text-charcoal-muted leading-relaxed max-w-2xl">
              Setiap kesepakatan kemitraan mengunci snapshot hak apresiasi secara permanen agar perubahan template paket di masa depan tidak mengubah komitmen historis.
            </p>
          </div>

          <Button
            size="sm"
            onClick={handleOpenAdd}
            className="bg-forest hover:bg-forest/90 text-white text-xs gap-1.5 shrink-0 shadow-subtle"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Buat Kesepakatan / MoU</span>
          </Button>
        </div>
      </div>

      {/* Filter bar */}
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
          Semua ({agreements.length})
        </button>
        {Object.entries(SPONSOR_AGREEMENT_STATUS_LABELS).map(([k, label]) => {
          const count = agreements.filter((a) => a.agreement_status === k).length
          return (
            <button
              key={k}
              type="button"
              onClick={() => setStatusFilter(k as SponsorAgreementStatus)}
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

      {/* Agreements Cards Grid */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : filteredAgreements.length === 0 ? (
        <Card className="rounded-2xl border-dashed border-warm-300 p-12 text-center text-charcoal-muted space-y-3 bg-white">
          <FileText className="h-8 w-8 text-warm-400 mx-auto" />
          <h4 className="text-sm font-semibold text-charcoal">Belum Ada Perjanjian Kemitraan</h4>
          <p className="text-xs max-w-md mx-auto">
            Gunakan tombol Buat Kesepakatan untuk mencatat MoU atau SPK kemitraan dengan calon/mitra sponsor.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAgreements.map((a) => {
            const tierStyle = SPONSORSHIP_TIER_COLORS[a.tier_key] || SPONSORSHIP_TIER_COLORS.none
            const finVal = Number(a.agreed_financial_contribution) || 0
            const nonFinVal = Number(a.estimated_non_financial_value) || 0
            const snapshotBenefits = a.package_snapshot?.benefits || []

            return (
              <Card
                key={a.id}
                className="rounded-2xl border border-warm-200/90 bg-white p-5 sm:p-6 shadow-2xs hover:shadow-subtle transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-mono tracking-wider font-semibold uppercase px-2.5 py-0.5 rounded-full border ${tierStyle.bg} ${tierStyle.text} ${tierStyle.border}`}
                      >
                        {SPONSORSHIP_TIER_LABELS[a.tier_key]}
                      </span>
                      <Badge variant="outline" className="text-[10px] border-warm-300">
                        {SPONSOR_CATEGORY_LABELS[a.relationship_type]}
                      </Badge>
                      <Badge className="bg-[#19382B] text-white text-[10px]">
                        {SPONSOR_AGREEMENT_STATUS_LABELS[a.agreement_status]}
                      </Badge>
                    </div>

                    <h4 className="text-base sm:text-lg font-serif font-bold text-charcoal">
                      {a.title}
                    </h4>

                    {a.sponsor && (
                      <p className="text-xs text-charcoal-muted">
                        Mitra: <strong className="text-charcoal">{a.sponsor.name}</strong>
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleOpenBenefits(a)}
                      className="bg-[#19382B] hover:bg-[#12281F] text-white text-xs gap-1.5 shadow-2xs"
                    >
                      <ListChecks className="h-3.5 w-3.5" />
                      <span>Lacak Realisasi Benefit ({snapshotBenefits.length})</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(a)}
                      className="text-xs gap-1"
                      title="Edit Perjanjian"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit</span>
                    </Button>
                  </div>
                </div>

                {/* Details Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl bg-warm-50/70 p-3 text-xs border border-warm-200/80">
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-charcoal-muted flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Komitmen Finansial:</span>
                    </span>
                    <strong className="text-charcoal font-semibold block">
                      {finVal > 0 ? `Rp ${finVal.toLocaleString('id-ID')}` : 'Tidak Ada (Non-Finansial)'}
                    </strong>
                    {a.payment_schedule && (
                      <span className="text-[10px] text-charcoal-muted block truncate" title={a.payment_schedule}>
                        Jadwal: {a.payment_schedule}
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[11px] text-charcoal-muted flex items-center gap-1">
                      <Package className="h-3.5 w-3.5 text-amber-600" />
                      <span>Dukungan Non-Finansial:</span>
                    </span>
                    <strong className="text-charcoal font-semibold block truncate" title={a.contribution_format_summary || '-'}>
                      {a.contribution_format_summary || 'Tidak Ada'}
                    </strong>
                    {nonFinVal > 0 && (
                      <span className="text-[10px] text-charcoal-muted block">
                        Estimasi Nilai: Rp {nonFinVal.toLocaleString('id-ID')}
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[11px] text-charcoal-muted flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-sage-600" />
                      <span>Masa Kemitraan:</span>
                    </span>
                    <strong className="text-charcoal font-semibold block">
                      {a.start_date || '-'} s.d. {a.end_date || 'Berkelanjutan'}
                    </strong>
                    {a.pic_profile && (
                      <span className="text-[10px] text-charcoal-muted flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>PIC: {a.pic_profile.full_name}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Benefits snapshot pills */}
                {snapshotBenefits.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-charcoal flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#19382B]" />
                      <span>Hak Apresiasi Terkunci ({snapshotBenefits.length} Item):</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {snapshotBenefits.slice(0, 5).map((b, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-lg bg-warm-100 text-charcoal text-[11px] border border-warm-200"
                        >
                          {b}
                        </span>
                      ))}
                      {snapshotBenefits.length > 5 && (
                        <span className="px-2 py-0.5 text-charcoal-muted text-[11px] italic">
                          +{snapshotBenefits.length - 5} lainnya...
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Agreement Form Modal */}
      {agreementModalOpen && (
        <AgreementFormModal
          open={agreementModalOpen}
          onClose={() => setAgreementModalOpen(false)}
          agreement={editingAgreement}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['sponsor-agreements-all'] })
            queryClient.invalidateQueries({ queryKey: ['sponsor-stats'] })
          }}
        />
      )}

      {/* Benefit Tracker Modal */}
      {benefitModalOpen && activeBenefitAgreement && (
        <BenefitFulfillmentModal
          open={benefitModalOpen}
          onClose={() => {
            setBenefitModalOpen(false)
            setActiveBenefitAgreement(null)
          }}
          agreement={activeBenefitAgreement}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['sponsor-agreements-all'] })
          }}
        />
      )}
    </div>
  )
}

import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchSponsorshipPackages } from '@/services/sponsorsApi'
import { PackageEditModal } from './PackageEditModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  SPONSORSHIP_TIER_COLORS,
  type SponsorshipPackage,
} from '@/types/sponsor'
import { Edit3, CheckCircle2, Eye, EyeOff, Layers } from 'lucide-react'

export const PackageManagementView: React.FC = () => {
  const queryClient = useQueryClient()
  const [editingPkg, setEditingPkg] = useState<SponsorshipPackage | null>(null)

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['sponsorship-packages-admin'],
    queryFn: fetchSponsorshipPackages,
    staleTime: 1000 * 60 * 2,
  })

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="rounded-2xl border border-warm-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-[#B19A6B]">
          <Layers className="h-4 w-4" />
          <span>Sponsorship Packages &amp; Tiers</span>
        </div>
        <h3 className="text-lg font-serif font-bold text-charcoal">
          Manajemen Paket Kemitraan &amp; Hak Apresiasi
        </h3>
        <p className="text-xs text-charcoal-muted leading-relaxed max-w-3xl">
          Paket sponsorship mendefinisikan tingkatan pengakuan (*recognition tier*) dan portofolio benefit, bukan harga tetap. Nilai kontribusi dinegosiasikan secara fleksibel. Mengubah template ini tidak akan mengubah perjanjian kemitraan yang sudah dikonfirmasi sebelumnya (*historical snapshot preserved*).
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {packages.map((pkg) => {
            const tierStyle = SPONSORSHIP_TIER_COLORS[pkg.tier_key] || SPONSORSHIP_TIER_COLORS.none

            return (
              <Card
                key={pkg.id}
                className="rounded-3xl border border-warm-200/90 bg-white p-6 shadow-2xs hover:shadow-subtle transition-all flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  {/* Top: Tier badge & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-mono tracking-wider font-semibold uppercase px-3 py-1 rounded-full border ${tierStyle.bg} ${tierStyle.text} ${tierStyle.border}`}
                    >
                      {pkg.badge_label || pkg.display_name}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {pkg.public_visibility ? (
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300 gap-1">
                          <Eye className="h-3 w-3" />
                          <span>Publik</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-warm-100 text-charcoal-muted border-warm-300 gap-1">
                          <EyeOff className="h-3 w-3" />
                          <span>Internal</span>
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h4 className="text-lg font-serif font-bold text-charcoal">
                      {pkg.display_name}
                    </h4>
                    <p className="text-xs text-charcoal-muted leading-relaxed mt-1 line-clamp-3">
                      {pkg.description}
                    </p>
                  </div>

                  {/* Benefit list preview */}
                  <div className="space-y-2 border-t border-warm-200/70 pt-3">
                    <span className="text-[11px] font-semibold text-charcoal block">
                      Benefit Standar ({pkg.default_benefits?.length || 0} Poin):
                    </span>
                    <ul className="space-y-1.5 text-xs text-charcoal-muted">
                      {(pkg.default_benefits || []).slice(0, 4).map((b, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#19382B] shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{b}</span>
                        </li>
                      ))}
                      {(pkg.default_benefits?.length || 0) > 4 && (
                        <li className="text-[11px] text-charcoal-muted/70 italic pl-5">
                          +{(pkg.default_benefits?.length || 0) - 4} benefit lainnya...
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Footer action */}
                <div className="border-t border-warm-200/70 pt-3 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-charcoal-muted">
                    Urutan #{pkg.display_order}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingPkg(pkg)}
                    className="text-xs gap-1.5 hover:border-[#19382B]"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit Template</span>
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingPkg && (
        <PackageEditModal
          open={Boolean(editingPkg)}
          onClose={() => setEditingPkg(null)}
          pkg={editingPkg}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['sponsorship-packages-admin'] })
            queryClient.invalidateQueries({ queryKey: ['public-sponsorship-packages'] })
          }}
        />
      )}
    </div>
  )
}

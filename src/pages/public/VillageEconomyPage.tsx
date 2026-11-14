import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp,
  CheckCircle2,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VillageSubnav } from '@/components/village/VillageSubnav'
import { fetchVillageEconomicPotentials, fetchVillageDusuns } from '@/services/villageApi'

export const VillageEconomyPage: React.FC = () => {
  const { data: potentials = [] } = useQuery({
    queryKey: ['village-economic-potentials'],
    queryFn: fetchVillageEconomicPotentials,
  })

  const { data: dusuns = [] } = useQuery({
    queryKey: ['village-dusuns'],
    queryFn: fetchVillageDusuns,
  })

  return (
    <div className="min-h-screen bg-warm-100/60 pb-20">
      <VillageSubnav />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-12">
        {/* Header Section */}
        <div className="border-b border-warm-300 pb-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
            <TrendingUp className="h-4 w-4" />
            <span>Perekonomian & Kehidupan Masyarakat</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-charcoal">
            Potensi Ekonomi Desa Pringgasela Selatan
          </h1>
          <p className="text-sm text-charcoal-muted max-w-3xl leading-relaxed">
            Menyelami integrasi sektor pertanian irigasi pegunungan, industri kreatif kriya tenun
            dan batik berorientasi pasar, pertukangan mebel kayu, serta ekowisata berbasis komunitas.
          </p>
        </div>

        {/* Economic Sectors Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {potentials.map((item) => (
            <Card
              key={item.id}
              className="border-warm-300 bg-white shadow-sm hover:shadow-md hover:border-sage-400 transition-all overflow-hidden flex flex-col justify-between"
            >
              <div>
                {item.cover_image_url && (
                  <div className="h-48 w-full overflow-hidden bg-warm-200">
                    <img
                      src={item.cover_image_url}
                      alt={item.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}

                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-sage-100 text-sage-800 border-sage-300 text-[10px] uppercase">
                      {item.sector.replace('_', ' ')}
                    </Badge>
                    <span className="text-[10px] text-charcoal-muted font-medium">
                      {item.dusun_name}
                    </span>
                  </div>

                  <h3 className="text-lg font-serif font-bold text-charcoal leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-xs text-charcoal leading-relaxed">
                    {item.description}
                  </p>

                  <div className="pt-2 space-y-1.5 border-t border-warm-100">
                    <span className="text-[10px] uppercase font-bold text-charcoal-muted block">
                      Sorotan Keunggulan:
                    </span>
                    <ul className="text-xs text-charcoal space-y-1">
                      {item.highlights.map((high, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-sage-600 shrink-0" />
                          <span>{high}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0 border-t border-warm-100 text-[10px] text-charcoal-muted">
                Status: Usaha Aktif Berbasis Masyarakat
              </div>
            </Card>
          ))}
        </div>

        {/* Matrix Potensi per Dusun */}
        <section className="space-y-6">
          <div className="border-b border-warm-300 pb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sage-700">
              Distribusi Spasial Potensi
            </span>
            <h2 className="text-2xl font-serif font-bold text-charcoal">
              Pemetaan Potensi Ekonomi Tujuh Dusun
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {dusuns.map((dusun) => (
              <div
                key={dusun.id}
                className="p-5 rounded-2xl bg-white border border-warm-300 shadow-sm space-y-3 hover:border-sage-400 transition-colors"
              >
                <div className="flex items-center justify-between border-b border-warm-100 pb-2">
                  <h3 className="font-serif font-bold text-charcoal text-sm">
                    {dusun.name}
                  </h3>
                  <span className="text-[10px] font-mono text-sage-700">#{dusun.order_index}</span>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-charcoal-muted uppercase block">
                    Komoditas / Potensi:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {dusun.key_potentials.map((pot, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-warm-50 text-[10px] font-medium text-charcoal border border-warm-200"
                      >
                        {pot}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

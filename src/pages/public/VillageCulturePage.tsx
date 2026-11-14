import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  Award,
  ChevronRight,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VillageSubnav } from '@/components/village/VillageSubnav'
import { fetchVillageCulturalHeritages } from '@/services/villageApi'

export const VillageCulturePage: React.FC = () => {
  const { data: heritages = [] } = useQuery({
    queryKey: ['village-cultural-heritages'],
    queryFn: fetchVillageCulturalHeritages,
  })

  return (
    <div className="min-h-screen bg-warm-100/60 pb-20">
      <VillageSubnav />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-8 space-y-12">
        {/* Header Section */}
        <div className="border-b border-warm-300 pb-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
            <Sparkles className="h-4 w-4" />
            <span>Adat, Kriya & Tradisi Takbenda</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-charcoal">
            Warisan yang Terus Hidup: Kebudayaan Pringgasela Selatan
          </h1>
          <p className="text-sm text-charcoal-muted max-w-3xl leading-relaxed">
            Menyelami kekayaan tenun gedogan bukan mesin, kemeriahan parade tradisi Festival
            Dongdala, keunikan musik Klenang Nunggal, kekhusyukan Zikir Zaman, dan seni batik
            Sasambo.
          </p>
        </div>

        {/* Banner Prestasi Nasional: 10 Besar Desa Budaya Unggulan */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 text-white shadow-lg space-y-3">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
              Prestasi Nasional 2022
            </span>
          </div>
          <h2 className="text-2xl font-serif font-bold">
            10 Besar Nominasi Desa Budaya Unggulan Tingkat Nasional
          </h2>
          <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed max-w-4xl">
            Dari total 385 desa kebudayaan di seluruh Indonesia, Desa Pringgasela Selatan terpilih
            oleh Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi (Kemendikbudristek RI)
            sebagai salah satu dari 10 desa terbaik nasional. Pencapaian ini diraih atas konsistensi
            masyarakat dalam merawat tradisi tenun gedogan, regenerasi perajin muda, serta integrasi
            adat dengan kesejahteraan warga.
          </p>
          <div className="pt-2 text-[11px] text-amber-200">
            Sumber: Tim Penilai Kemendikbudristek RI & Publikasi Media Nasional (Massmedia.id, 2022)
          </div>
        </div>

        {/* Detailed Heritage Sections */}
        <div className="space-y-10">
          {heritages.map((item, idx) => (
            <Card
              key={item.id}
              className="border-warm-300 bg-white shadow-sm overflow-hidden hover:border-amber-400 transition-all"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
                {/* Photo Column */}
                <div className={`lg:col-span-5 bg-warm-200 relative min-h-[260px] ${idx % 2 === 1 ? 'lg:order-2' : ''}`}>
                  {item.cover_image_url ? (
                    <img
                      src={item.cover_image_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-charcoal-muted">
                      Foto Budaya Terverifikasi
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-charcoal/80 text-white backdrop-blur-sm border-none text-[10px] uppercase font-serif">
                      {item.category.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-white/90 text-charcoal text-[10px] font-semibold px-2 py-0.5 rounded shadow">
                    {item.dusun_origin}
                  </div>
                </div>

                {/* Content Column */}
                <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      Warisan Budaya #{item.order_index}
                    </span>
                    <h3 className="text-2xl font-serif font-bold text-charcoal leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs font-medium text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200 leading-relaxed">
                      {item.summary}
                    </p>
                    <p className="text-xs sm:text-sm text-charcoal leading-relaxed">
                      {item.description}
                    </p>

                    {item.preservation_efforts && (
                      <div className="pt-2 space-y-1 border-t border-warm-100">
                        <span className="text-[10px] uppercase font-bold text-charcoal-muted block">
                          Upaya Pelestarian & Regenerasi:
                        </span>
                        <p className="text-xs text-charcoal-muted leading-relaxed">
                          {item.preservation_efforts}
                        </p>
                      </div>
                    )}
                  </div>

                  {item.references_text && (
                    <div className="pt-3 border-t border-warm-100 text-[10px] text-charcoal-muted">
                      <span className="font-semibold text-charcoal">Rujukan Fakta: </span>
                      <span>{item.references_text}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Call to Gallery */}
        <div className="p-8 rounded-3xl bg-warm-50 border border-warm-300 text-center space-y-4">
          <h3 className="text-xl font-serif font-bold text-charcoal">
            Lihat Dokumentasi Visual Kebudayaan Asli
          </h3>
          <p className="text-xs sm:text-sm text-charcoal-muted max-w-xl mx-auto leading-relaxed">
            Seluruh foto kegiatan menenun gedogan, perayaan Festival Dongdala, dan pameran kriya
            dapat Anda saksikan dalam galeri visual desa beresolusi tinggi dengan metadata lengkap.
          </p>
          <div className="pt-2">
            <Link
              to="/profil-desa/galeri"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sage-800 hover:bg-sage-700 text-white font-medium text-xs shadow-md transition-colors"
            >
              <span>Buka Galeri Foto Desa</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

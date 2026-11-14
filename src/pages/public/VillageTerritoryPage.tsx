import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  Map,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VillageSubnav } from '@/components/village/VillageSubnav'
import { VillageInteractiveMap } from '@/components/village/VillageInteractiveMap'
import {
  fetchVillageProfile,
  fetchVillageDusuns,
  fetchVillageDestinations,
} from '@/services/villageApi'

export const VillageTerritoryPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const initialDusun = searchParams.get('dusun')
  const [selectedDusunSlug, setSelectedDusunSlug] = useState<string | null>(initialDusun)

  const { data: profile } = useQuery({
    queryKey: ['village-profile'],
    queryFn: fetchVillageProfile,
  })

  const { data: dusuns = [] } = useQuery({
    queryKey: ['village-dusuns'],
    queryFn: fetchVillageDusuns,
  })

  const { data: destinations = [] } = useQuery({
    queryKey: ['village-destinations'],
    queryFn: () => fetchVillageDestinations(),
  })

  useEffect(() => {
    if (initialDusun) {
      setSelectedDusunSlug(initialDusun)
    }
  }, [initialDusun])

  return (
    <div className="min-h-screen bg-warm-100/60 pb-20">
      <VillageSubnav />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-10">
        {/* Title Header */}
        <div className="border-b border-warm-300 pb-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
            <Map className="h-4 w-4" />
            <span>Interactive Geographic Explorer</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-charcoal">
            Peta Wilayah & Tujuh Dusun Pringgasela Selatan
          </h1>
          <p className="text-sm text-charcoal-muted max-w-3xl leading-relaxed">
            Eksplorasi kartografi interaktif Desa Pringgasela Selatan. Telusuri titik sentroid 7
            kewilayahan dusun, sentra kebudayaan, fasilitas publik, dan daya tarik alam berbasis data
            geospasial nyata.
          </p>
        </div>

        {/* Interactive Map Component */}
        <div className="space-y-3">
          <VillageInteractiveMap
            dusuns={dusuns}
            destinations={destinations}
            geojsonData={profile?.geojson_data}
            selectedDusunSlug={selectedDusunSlug}
            onSelectDusun={(slug) => setSelectedDusunSlug(slug)}
          />
        </div>

        {/* Geographic Information & Boundaries Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white border border-warm-300 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-sage-700 block tracking-wider">
              Batas Utara
            </span>
            <p className="text-xs font-semibold text-charcoal">
              Desa Pringgasela (Desa Induk)
            </p>
            <span className="text-[10px] text-charcoal-muted">
              Kecamatan Pringgasela
            </span>
          </div>
          <div className="p-4 rounded-xl bg-white border border-warm-300 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-sage-700 block tracking-wider">
              Batas Selatan
            </span>
            <p className="text-xs font-semibold text-charcoal">
              Desa Rempung
            </p>
            <span className="text-[10px] text-charcoal-muted">
              Kecamatan Pringgasela
            </span>
          </div>
          <div className="p-4 rounded-xl bg-white border border-warm-300 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-sage-700 block tracking-wider">
              Batas Barat
            </span>
            <p className="text-xs font-semibold text-charcoal">
              Desa Masbagik Baru
            </p>
            <span className="text-[10px] text-charcoal-muted">
              Kecamatan Masbagik
            </span>
          </div>
          <div className="p-4 rounded-xl bg-white border border-warm-300 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-sage-700 block tracking-wider">
              Batas Timur
            </span>
            <p className="text-xs font-semibold text-charcoal">
              Desa Pringgasela Timur
            </p>
            <span className="text-[10px] text-charcoal-muted">
              Kecamatan Pringgasela
            </span>
          </div>
        </div>

        {/* Seven Dusun Cards Grid */}
        <section className="space-y-6">
          <div className="border-b border-warm-300 pb-3 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-sage-700">
                Kewilayahan Dusun
              </span>
              <h2 className="text-2xl font-serif font-bold text-charcoal">
                Karakteristik & Potensi 7 Dusun
              </h2>
            </div>
            <span className="text-xs text-charcoal-muted">
              Klik kartu dusun untuk memfokuskan lokasi pada peta di atas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dusuns.map((dusun) => {
              const isSelected = selectedDusunSlug === dusun.slug
              return (
                <Card
                  key={dusun.id}
                  onClick={() => {
                    setSelectedDusunSlug(dusun.slug)
                    window.scrollTo({ top: 120, behavior: 'smooth' })
                  }}
                  className={`border cursor-pointer transition-all duration-300 overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'border-sage-600 ring-2 ring-sage-500/30 shadow-lg bg-sage-50/30'
                      : 'border-warm-300 bg-white hover:border-sage-400 hover:shadow-md'
                  }`}
                >
                  <div>
                    {dusun.cover_image_url && (
                      <div className="h-44 w-full overflow-hidden bg-warm-200 relative">
                        <img
                          src={dusun.cover_image_url}
                          alt={dusun.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2.5 left-2.5">
                          <Badge className="bg-charcoal/80 text-white backdrop-blur-sm border-none text-[10px] font-serif">
                            Dusun #{dusun.order_index}
                          </Badge>
                        </div>
                      </div>
                    )}
                    <div className="p-5 space-y-3">
                      <h3 className="text-lg font-serif font-bold text-charcoal">
                        {dusun.name}
                      </h3>
                      <p className="text-xs text-charcoal leading-relaxed">
                        {dusun.description}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0 space-y-3 border-t border-warm-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-charcoal-muted block">
                        Potensi Utama:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {dusun.key_potentials.map((pot, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-warm-100 text-charcoal text-[10px] font-medium"
                          >
                            {pot}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-charcoal-muted block">
                        Lokasi & Landmark:
                      </span>
                      <ul className="text-[11px] text-charcoal list-disc pl-4 space-y-0.5 mt-1">
                        {dusun.notable_places.map((place, idx) => (
                          <li key={idx}>{place}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="pt-2 flex items-center justify-between text-[10px] text-charcoal-muted border-t border-warm-100">
                      <span>
                        Lat: {dusun.center_coordinates.lat}, Lng: {dusun.center_coordinates.lng}
                      </span>
                      <span className="text-sage-700 font-semibold">Sorot di Peta →</span>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </section>

        {/* Verified Coordinates Table */}
        <section className="space-y-4">
          <div className="border-b border-warm-300 pb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sage-700">
              Registri Geospasial
            </span>
            <h2 className="text-xl font-serif font-bold text-charcoal">
              Daftar Titik Koordinat Objek Terverifikasi
            </h2>
          </div>

          <div className="bg-white rounded-xl border border-warm-300 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-warm-100/70 border-b border-warm-200 text-charcoal-muted uppercase text-[10px] font-semibold">
                <tr>
                  <th className="py-3 px-4">Nama Lokasi / Fasilitas</th>
                  <th className="py-3 px-4">Dusun / Wilayah</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Latitude</th>
                  <th className="py-3 px-4">Longitude</th>
                  <th className="py-3 px-4">Sumber Koordinat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100 text-charcoal">
                {[
                  { name: 'Kantor Desa Pringgasela Selatan', dusun: 'Gubuk Lauk', cat: 'Pemerintahan', lat: -8.5492, lng: 116.4485, src: 'Pemdes Pringgasela Selatan' },
                  { name: 'Sentra Tenun Gedogan', dusun: 'Gubuk Lauk', cat: 'Kebudayaan', lat: -8.5480, lng: 116.4490, src: 'Jadesta Kemenpar' },
                  { name: 'Air Terjun & Goa Kopong', dusun: 'Pancor Kopong', cat: 'Wisata Alam', lat: -8.5395, lng: 116.4420, src: 'Jadesta Kemenpar & Riset Unram' },
                  { name: 'Kolam Renang Madu Timba Gerah', dusun: 'Timba Gerah', cat: 'Wisata Buatan', lat: -8.5535, lng: 116.4520, src: 'Jadesta Kemenpar' },
                  { name: 'Sanggar Seagana Batik Sasambo', dusun: 'Kedondong', cat: 'Kerajinan', lat: -8.5510, lng: 116.4440, src: 'Massmedia & Arsip Desa' },
                  { name: 'Makam TGH. Muhammad Toyyib', dusun: 'Gubuk Rempung', cat: 'Religi', lat: -8.5590, lng: 116.4460, src: 'Jadesta Kemenpar' },
                  { name: 'Persawahan Batu Tambun', dusun: 'Sinar Sari', cat: 'Agrowisata', lat: -8.5430, lng: 116.4530, src: 'P3A Batu Tambun' },
                ].map((item, idx) => (
                  <tr key={idx} className="hover:bg-warm-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-semibold">{item.name}</td>
                    <td className="py-2.5 px-4 text-charcoal-muted">{item.dusun}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-1.5 py-0.5 rounded bg-warm-100 text-[10px] font-medium">
                        {item.cat}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-charcoal-muted">{item.lat}</td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-charcoal-muted">{item.lng}</td>
                    <td className="py-2.5 px-4 text-charcoal-muted text-[11px]">{item.src}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

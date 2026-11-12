import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Sparkles, Building, Landmark } from 'lucide-react'

export const VillageProfilePage: React.FC = () => {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="border-b border-warm-300 pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
          <MapPin className="h-3.5 w-3.5" />
          <span>Wilayah Lokasi Pengabdian</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-charcoal mt-1">
          Profil Desa Pringgasela Selatan
        </h1>
        <p className="text-xs text-charcoal-muted mt-2 max-w-2xl">
          Kecamatan Pringgasela, Kabupaten Lombok Timur, Provinsi Nusa Tenggara Barat.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-warm-300 bg-white">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-serif font-semibold text-charcoal">
                Sekilas Tentang Desa
              </h2>
              <p className="text-xs text-charcoal leading-relaxed">
                Desa Pringgasela Selatan merupakan salah satu desa di lereng tenggara Gunung Rinjani yang terkenal dengan kearifan lokal kerajinan Tenun Tradisional Sasak. Masyarakat desa hidup berdampingan secara agraris dengan lanskap persawahan subur, saluran irigasi mata air alami Rinjani, dan tradisi gotong royong yang kuat.
              </p>
              <p className="text-xs text-charcoal leading-relaxed">
                Program pengabdian masyarakat mahasiswa berfokus pada digitalisasi promosi kerajinan tenun tradisional perajin lokal, penguatan gizi anak balita dan pencegahan stunting, pendampingan pendidikan literasi, serta penguatan ketahanan sosial masyarakat desa.
              </p>
            </CardContent>
          </Card>

          <Card className="border-warm-300 bg-white">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-serif font-semibold text-charcoal">
                Daftar Dusun Wilayah Binaan
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {[
                  "1. Dusun Pringgasela Lauk",
                  "2. Dusun Pringgasela Daye",
                  "3. Dusun Timuk Rurung",
                  "4. Dusun Dasan Baru",
                  "5. Dusun Gubuk Daya",
                  "6. Dusun Montong Meje",
                  "7. Dusun Karang Anyar",
                ].map((dusun, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-warm-200 bg-warm-50 flex items-center gap-2">
                    <Building className="h-3.5 w-3.5 text-sage-600 shrink-0" />
                    <span className="font-medium text-charcoal">{dusun}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-warm-300 bg-white">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-charcoal flex items-center gap-2">
                <Landmark className="h-4 w-4 text-sage-600" />
                <span>Data Ringkas Desa</span>
              </h3>
              <div className="space-y-3 text-xs">
                <div className="border-b border-warm-200 pb-2">
                  <span className="text-charcoal-muted block text-[11px]">Kecamatan</span>
                  <span className="font-medium text-charcoal">Pringgasela</span>
                </div>
                <div className="border-b border-warm-200 pb-2">
                  <span className="text-charcoal-muted block text-[11px]">Kabupaten</span>
                  <span className="font-medium text-charcoal">Lombok Timur</span>
                </div>
                <div className="border-b border-warm-200 pb-2">
                  <span className="text-charcoal-muted block text-[11px]">Provinsi</span>
                  <span className="font-medium text-charcoal">Nusa Tenggara Barat</span>
                </div>
                <div className="border-b border-warm-200 pb-2">
                  <span className="text-charcoal-muted block text-[11px]">Potensi Utama</span>
                  <span className="font-medium text-charcoal">Tenun Sasak & Pertanian Padi</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-warm-300 bg-sage-50/70">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center gap-2 text-sage-800 text-xs font-semibold">
                <Sparkles className="h-4 w-4 text-sage-600" />
                <span>Posko Pengabdian KKN</span>
              </div>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                Posko KKN berlokasi di Dusun Pringgasela Lauk (dekat Lapangan Desa). Terbuka untuk konsultasi, koordinasi warga, dan bimbingan belajar anak setiap hari kerja.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

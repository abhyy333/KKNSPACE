import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Compass,
  MapPin,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VillageSubnav } from '@/components/village/VillageSubnav'
import { fetchVillageDestinations } from '@/services/villageApi'

export const VillageTourismPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const { data: destinations = [] } = useQuery({
    queryKey: ['village-destinations', selectedCategory],
    queryFn: () => fetchVillageDestinations(selectedCategory),
  })

  const categories = [
    { id: 'all', label: 'Semua Destinasi' },
    { id: 'alam', label: 'Wisata Alam & Air' },
    { id: 'agrowisata', label: 'Agrowisata' },
    { id: 'budaya', label: 'Sentra Budaya & Kriya' },
    { id: 'religi', label: 'Wisata Religi' },
    { id: 'buatan', label: 'Pemandian Rekreasi' },
  ]

  const getStatusBadge = (statusType: string) => {
    switch (statusType) {
      case 'destinasi_dikelola':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
            Destinasi Dikelola
          </Badge>
        )
      case 'potensi_wisata':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px]">
            Potensi Wisata
          </Badge>
        )
      case 'sentra_kerajinan':
        return (
          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">
            Sentra Kerajinan & Kriya
          </Badge>
        )
      case 'lokasi_budaya':
        return (
          <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[10px]">
            Lokasi Budaya & Sejarah
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-warm-100/60 pb-20">
      <VillageSubnav />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-10">
        {/* Header Section */}
        <div className="border-b border-warm-300 pb-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
            <Compass className="h-4 w-4" />
            <span>Jejaring Desa Wisata #63548</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-charcoal">
            Jelajah Wisata Desa Pringgasela Selatan
          </h1>
          <p className="text-sm text-charcoal-muted max-w-3xl leading-relaxed">
            Menikmati pesona air terjun celah goa alami, pemandian mata air murni pegunungan,
            persawahan berlatar lanskap Gunung Rinjani, serta sentra kriya tenun dan batik yang
            otentik.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                selectedCategory === cat.id
                  ? 'bg-sage-800 text-white shadow-sm ring-1 ring-sage-900/20'
                  : 'bg-white text-charcoal-muted border border-warm-300 hover:border-sage-400 hover:text-charcoal'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Destinations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {destinations.map((dest) => (
            <Card
              key={dest.id}
              className="border-warm-300 bg-white shadow-sm hover:shadow-md hover:border-sage-400 transition-all overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Photo Cover */}
                <div className="h-56 w-full overflow-hidden bg-warm-200 relative">
                  {dest.cover_image_url ? (
                    <img
                      src={dest.cover_image_url}
                      alt={dest.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-charcoal-muted">
                      Foto Lokasi Terverifikasi
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    {getStatusBadge(dest.status_type)}
                  </div>
                  <div className="absolute bottom-3 left-3 bg-charcoal/80 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-sage-400" />
                    <span>{dest.dusun_name}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sage-700">
                      Kategori {dest.category}
                    </span>
                    <h3 className="text-xl font-serif font-bold text-charcoal mt-0.5 leading-snug">
                      {dest.name}
                    </h3>
                  </div>

                  <p className="text-xs text-charcoal leading-relaxed">
                    {dest.description}
                  </p>

                  {/* Keunikan */}
                  <div className="p-3 rounded-lg bg-warm-50 border border-warm-200 text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-charcoal-muted block">
                      Keunikan Utama:
                    </span>
                    <p className="text-charcoal italic leading-relaxed text-[11px]">
                      "{dest.uniqueness}"
                    </p>
                  </div>

                  {/* Aktivitas */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-charcoal-muted block">
                      Aktivitas yang Dapat Dilakukan:
                    </span>
                    <ul className="text-xs text-charcoal space-y-1">
                      {dest.activities.map((act, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-sage-600 shrink-0" />
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Akses Info */}
                  {dest.access_info && (
                    <div className="pt-2 border-t border-warm-100 text-[11px] text-charcoal-muted">
                      <span className="font-semibold text-charcoal">Aksesibilitas: </span>
                      <span>{dest.access_info}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer: Sources & Coordinates */}
              <div className="p-6 pt-0 border-t border-warm-100 flex items-center justify-between text-[10px] text-charcoal-muted">
                <span className="truncate max-w-[180px]" title={dest.sources || ''}>
                  Sumber: {dest.sources || 'Verifikasi Desa'}
                </span>
                <Link
                  to={`/profil-desa/wilayah?dusun=${dest.dusun_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  className="text-sage-700 hover:text-sage-900 font-semibold inline-flex items-center gap-0.5"
                >
                  <span>Peta</span>
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </Card>
          ))}
        </div>

        {/* Ethical Tourism Notice */}
        <div className="p-6 rounded-2xl bg-white border border-warm-300 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-serif font-bold text-charcoal">
              Prinsip Pariwisata Berbasis Masyarakat (Community-Based Tourism)
            </h4>
            <p className="text-xs text-charcoal-muted max-w-3xl leading-relaxed">
              Pengembangan destinasi di Pringgasela Selatan mengedepankan kelestarian lingkungan,
              penghormatan terhadap adat kriya leluhur, serta manfaat ekonomi langsung bagi warga lokal.
              Wisatawan diimbau untuk berpakaian sopan dan menjaga kebersihan alam pegunungan.
            </p>
          </div>
          <Link
            to="/profil-desa/budaya"
            className="px-4 py-2 rounded-xl bg-warm-100 hover:bg-warm-200 text-charcoal font-semibold text-xs whitespace-nowrap transition-colors"
          >
            Pelajari Adat & Budaya Desa
          </Link>
        </div>
      </div>
    </div>
  )
}

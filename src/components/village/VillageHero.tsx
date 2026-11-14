import React from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Compass, Map, ChevronRight, Award } from 'lucide-react'

interface VillageHeroProps {
  title?: string
  subtitle?: string
  narrative?: string
  imageUrl?: string
}

export const VillageHero: React.FC<VillageHeroProps> = ({
  title = 'Pringgasela Selatan',
  subtitle = 'Merawat Warisan, Menumbuhkan Masa Depan',
  narrative = 'Desa agraris dan sentra kebudayaan Sasak di lereng tenggara Gunung Rinjani. Rumah bagi tradisi tenun gedogan bukan mesin, mata air alami pegunungan, serta keharmonisan tiga trah leluhur yang rukun.',
  imageUrl = '/assets/village/dongdala_hias_desa.jpg',
}) => {
  return (
    <div className="relative min-h-[500px] lg:min-h-[580px] w-full flex items-center justify-center overflow-hidden rounded-3xl border border-warm-300 shadow-xl bg-charcoal">
      {/* Background Photography with Natural Parallax & Gradient */}
      <div className="absolute inset-0 z-0">
        <img
          src={imageUrl}
          alt="Lanskap Desa Pringgasela Selatan"
          className="w-full h-full object-cover object-center transform scale-105 transition-transform duration-1000 ease-out"
          loading="eager"
        />
        {/* Editorial Overlays: Forest Green & Charcoal Depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/95 via-charcoal/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-sage-950/80 via-sage-900/40 to-transparent" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 mx-auto max-w-5xl px-6 py-16 text-center sm:text-left space-y-6">
        {/* Breadcrumb / Location Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-warm-100 text-xs font-medium">
          <MapPin className="h-3.5 w-3.5 text-sage-400" />
          <span>Kecamatan Pringgasela · Kabupaten Lombok Timur · NTB</span>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-warm-50 tracking-tight leading-tight">
            {title}
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl font-serif text-sage-200/90 font-light italic">
            "{subtitle}"
          </p>
        </div>

        {/* Short Narrative */}
        <p className="max-w-2xl text-sm sm:text-base text-warm-100/85 leading-relaxed font-sans">
          {narrative}
        </p>

        {/* Badges / Accolades */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2 text-xs text-warm-200">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/30 border border-white/10">
            <Award className="h-4 w-4 text-amber-400" />
            <span>Top 10 Desa Budaya Unggulan Nasional (2022)</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/30 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-sage-400 animate-pulse" />
            <span>Desa Wisata Rintisan Kemenpar (#63548)</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-4">
          <Link
            to="/profil-desa/pariwisata"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-sage-700 hover:bg-sage-600 text-white font-medium text-xs shadow-lg shadow-sage-900/40 transition-all duration-200 hover:-translate-y-0.5"
          >
            <Compass className="h-4 w-4" />
            <span>Jelajahi Wisata & Budaya</span>
            <ChevronRight className="h-3.5 w-3.5 opacity-80" />
          </Link>
          <Link
            to="/profil-desa/wilayah"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/15 hover:bg-white/25 text-warm-50 font-medium text-xs backdrop-blur-md border border-white/30 transition-all duration-200 hover:-translate-y-0.5"
          >
            <Map className="h-4 w-4" />
            <span>Buka Peta Interaktif 7 Dusun</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

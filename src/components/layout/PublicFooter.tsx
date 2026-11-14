import React from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Mail, Calendar, ShieldCheck } from 'lucide-react'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { useQuery } from '@tanstack/react-query'
import { fetchPublicSponsors } from '@/services/sponsorsApi'
import { SponsorLogoThumbnail } from '@/components/sponsors/SponsorLogoThumbnail'

export const PublicFooter: React.FC = () => {
  const { data: sponsors = [] } = useQuery({
    queryKey: ['public-sponsors'],
    queryFn: fetchPublicSponsors,
    staleTime: 1000 * 60 * 5,
  })
  return (
    <footer className="border-t border-warm-300 bg-white text-charcoal">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Group Identity */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-3">
              <BrandLogo size="md" className="h-10 w-10 shrink-0 drop-shadow-xs" />
              <div>
                <span className="font-semibold text-sm text-charcoal tracking-tight block">
                  KKN Pringgasela Selatan 2026–2027
                </span>
                <span className="text-xs text-charcoal-muted">
                  Universitas Mataram · KKN SPACE
                </span>
              </div>
            </div>
            <p className="text-xs text-charcoal-muted leading-relaxed max-w-md">
              Portal transparansi program pengabdian masyarakat mahasiswa KKN.
              Mendukung inovasi desa, sentra tenun Sasak tradisional, pemberdayaan ekonomi,
              dan gotong royong warga desa.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-charcoal-muted pt-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-sage-600 shrink-0" />
                <span>Lombok Timur, Nusa Tenggara Barat</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-sage-600 shrink-0" />
                <span>Periode 2026</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-charcoal uppercase tracking-wider">
              Tautan Publik
            </h4>
            <ul className="space-y-1.5 text-xs text-charcoal-muted">
              <li>
                <Link to="/" className="hover:text-sage-700 transition-colors">
                  Beranda
                </Link>
              </li>
              <li>
                <Link to="/tim" className="hover:text-sage-700 transition-colors">
                  Daftar Tim KKN
                </Link>
              </li>
              <li>
                <Link to="/program-kerja" className="hover:text-sage-700 transition-colors">
                  Program Kerja
                </Link>
              </li>
              <li>
                <Link to="/dokumentasi" className="hover:text-sage-700 transition-colors">
                  Galeri Kegiatan
                </Link>
              </li>
              <li>
                <Link to="/profil-desa" className="hover:text-sage-700 transition-colors">
                  Profil Desa
                </Link>
              </li>
              <li>
                <Link to="/sponsors" className="hover:text-sage-700 transition-colors">
                  Sponsor & Mitra
                </Link>
              </li>
            </ul>
          </div>

          {/* Posko & Workspace Login */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-charcoal uppercase tracking-wider">
              Internal Kelompok
            </h4>
            <p className="text-xs text-charcoal-muted">
              Ruang kerja khusus mahasiswa pengabdian, sekretaris, bendahara, dan dosen pembimbing lapangan.
            </p>
            <div className="pt-2">
              <Link
                to="/workspace"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-sage-700 hover:text-sage-800 underline underline-offset-4"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Masuk Workspace Pengurus</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Refined Institutional Sponsor Recognition Strip */}
        {sponsors.length > 0 && (
          <div className="mt-10 border-t border-warm-200/80 pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B19A6B]" />
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-charcoal">
                  Official Partners &amp; Sponsors
                </h4>
              </div>
              <Link
                to="/sponsors"
                className="text-[11px] font-mono tracking-wider text-charcoal-muted hover:text-[#19382B] transition-colors inline-flex items-center gap-1 group"
              >
                <span>Lihat Direktori Mitra</span>
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {sponsors.slice(0, 8).map((sp) => (
                <Link
                  key={sp.id}
                  to="/sponsors"
                  className="group flex items-center gap-3 rounded-xl border border-warm-200/90 bg-[#FAF9F6] hover:bg-white hover:border-[#19382B]/30 px-3.5 py-2 transition-all duration-200 shadow-2xs"
                  title={`Lihat profil resmi kemitraan ${sp.name}`}
                >
                  <SponsorLogoThumbnail
                    fileId={sp.logo_file_id}
                    sponsorId={sp.id}
                    alt={sp.name}
                    isPublic={true}
                    containerClassName="w-8 h-6 flex items-center justify-center shrink-0 overflow-hidden"
                    className="w-full h-full object-contain filter group-hover:scale-105 transition-transform"
                  />
                  <span className="text-xs font-serif font-medium text-charcoal group-hover:text-[#19382B] transition-colors truncate max-w-[160px]">
                    {sp.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 border-t border-warm-300 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-charcoal-muted gap-2">
          <p>© 2026–2027 KKN Pringgasela Selatan Universitas Mataram · Platform KKN SPACE.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" /> posko@pringgaselaselatan.desa.id
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

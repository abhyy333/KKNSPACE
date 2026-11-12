import React from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Mail, Calendar, ShieldCheck } from 'lucide-react'

export const PublicFooter: React.FC = () => {
  return (
    <footer className="border-t border-warm-300 bg-white text-charcoal">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Group Identity */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sage-700 text-white font-serif font-bold text-sm">
                K
              </div>
              <span className="font-semibold text-sm text-charcoal tracking-tight">
                KKN SPACE — Pringgasela Selatan
              </span>
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

        <div className="mt-8 border-t border-warm-300 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-charcoal-muted gap-2">
          <p>© 2026 Tim KKN Desa Pringgasela Selatan. Seluruh hak cipta dilindungi.</p>
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

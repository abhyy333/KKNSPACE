import React from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Mail, Calendar, ShieldCheck } from 'lucide-react'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { useTranslation } from '@/i18n'

export const PublicFooter: React.FC = () => {
  const { t } = useTranslation()

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
              {t('publicHome.heroSubtitle')}
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
              {t('common.filter')}
            </h4>
            <ul className="space-y-1.5 text-xs text-charcoal-muted">
              <li>
                <Link to="/" className="hover:text-sage-700 transition-colors">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link to="/tim" className="hover:text-sage-700 transition-colors">
                  {t('nav.team')}
                </Link>
              </li>
              <li>
                <Link to="/program-kerja" className="hover:text-sage-700 transition-colors">
                  {t('nav.programs')}
                </Link>
              </li>
              <li>
                <Link to="/dokumentasi" className="hover:text-sage-700 transition-colors">
                  {t('nav.documentation')}
                </Link>
              </li>
              <li>
                <Link to="/profil-desa" className="hover:text-sage-700 transition-colors">
                  {t('nav.village')}
                </Link>
              </li>
              <li>
                <Link to="/sponsors" className="hover:text-sage-700 transition-colors">
                  {t('nav.sponsors')}
                </Link>
              </li>
              <li>
                <Link to="/projects/kkn-space" className="hover:text-sage-700 transition-colors">
                  Tentang KKN SPACE
                </Link>
              </li>
              <li>
                <Link to="/developer/abdul-habir-al-majdi" className="hover:text-sage-700 transition-colors">
                  Developer
                </Link>
              </li>
            </ul>
          </div>

          {/* Posko & Workspace Login */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-charcoal uppercase tracking-wider">
              {t('workspace.nav.workSpace')}
            </h4>
            <p className="text-xs text-charcoal-muted">
              {t('auth.loginSubtitle')}
            </p>
            <div className="pt-2">
              <Link
                to="/workspace"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-sage-700 hover:text-sage-800 underline underline-offset-4"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{t('nav.workspace')}</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-warm-300 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-charcoal-muted gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-center sm:text-left">
            <p>© 2026–2027 KKN Pringgasela Selatan Universitas Mataram · Platform KKN SPACE.</p>
            <span className="hidden sm:inline text-warm-300">·</span>
            <p>
              Developed by{' '}
              <Link
                to="/developer/abdul-habir-al-majdi"
                className="font-medium text-sage-700 hover:text-sage-900 underline underline-offset-2 transition-colors"
              >
                Abdul Habir Al Majdi
              </Link>
            </p>
          </div>
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

import React from 'react'
import { Link } from 'react-router-dom'
import {
  Code2,
  ExternalLink,
  GraduationCap,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Globe,
  Layers,
  Layout,
  Cpu,
  Radio,
  FolderGit2,
  ChevronRight,
  Compass,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { SeoHead } from '@/components/seo/SeoHead'
import {
  DEVELOPER_PROFILE,
  generateDeveloperPersonSchema,
  generateDeveloperProfilePageSchema,
} from '@/config/developer'
import { SEO_DICTIONARY, generateBreadcrumbSchema } from '@/config/seo'
import { useLocale } from '@/i18n'

const FOCUS_ICON_MAP: Record<string, React.ReactNode> = {
  Layout: <Layout className="h-5 w-5 text-sage-700" />,
  Layers: <Layers className="h-5 w-5 text-sage-700" />,
  Cpu: <Cpu className="h-5 w-5 text-sage-700" />,
  Radio: <Radio className="h-5 w-5 text-sage-700" />,
}

export const DeveloperProfilePage: React.FC = () => {
  const { locale } = useLocale()
  const seo = SEO_DICTIONARY[locale]?.developerProfile || SEO_DICTIONARY['id-ID'].developerProfile

  const breadcrumbs = [
    { name: 'Beranda', url: '/' },
    { name: 'Developer', url: '/developer/abdul-habir-al-majdi' },
    { name: DEVELOPER_PROFILE.fullName, url: '/developer/abdul-habir-al-majdi' },
  ]

  const structuredSchemas = [
    generateBreadcrumbSchema(breadcrumbs),
    generateDeveloperProfilePageSchema(),
    generateDeveloperPersonSchema(),
  ]

  // Group technical stack by category
  const categories = [
    'Frontend',
    'Backend & Database',
    'Mapping & GIS',
    'Tools & Deployment',
    'Hardware & IoT',
  ] as const

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
      <SeoHead
        title={seo.title}
        description={seo.description}
        canonicalPath="/developer/abdul-habir-al-majdi"
        keywords={seo.keywords}
        ogType="profile"
        structuredData={structuredSchemas}
      />

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-charcoal-muted">
        <Link to="/" className="hover:text-sage-700 transition-colors">
          Beranda
        </Link>
        <ChevronRight className="h-3 w-3 text-warm-400" />
        <span className="text-sage-700 font-medium">Developer</span>
        <ChevronRight className="h-3 w-3 text-warm-400" />
        <span className="text-charcoal font-semibold">{DEVELOPER_PROFILE.fullName}</span>
      </nav>

      {/* Hero Header: Developer Identity */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#23382B] via-[#1E3025] to-[#16241C] p-6 sm:p-10 md:p-12 text-white shadow-xl">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Monogram / Avatar with iOS-like aesthetic */}
            <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-sage-600 to-sage-800 text-white font-serif font-bold text-3xl sm:text-4xl shadow-inner border-2 border-white/20">
              <span className="tracking-tight">AH</span>
              <div className="absolute -bottom-1 -right-1 rounded-full bg-emerald-500 p-1.5 ring-4 ring-[#1E3025]">
                <Code2 className="h-4 w-4 text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sage-200 border border-sage-400/30">
                  <Sparkles className="h-3.5 w-3.5 text-sage-300" />
                  Verified Developer
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-warm-100 border border-white/15">
                  <GraduationCap className="h-3.5 w-3.5 text-sage-300" />
                  Universitas Mataram
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-semibold tracking-tight text-white">
                {DEVELOPER_PROFILE.fullName}
              </h1>

              <p className="text-base sm:text-lg text-sage-200 font-medium">
                {DEVELOPER_PROFILE.professionalTitle}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-warm-200/80 pt-1">
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-sage-300" />
                  {DEVELOPER_PROFILE.academicAffiliation.program} · {DEVELOPER_PROFILE.academicAffiliation.faculty}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-sage-300" />
                  {DEVELOPER_PROFILE.location.city}, {DEVELOPER_PROFILE.location.province}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap sm:flex-col gap-3 shrink-0">
            <a
              href="https://github.com/abhyy333"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 text-xs font-semibold backdrop-blur-xs transition-all shadow-xs"
            >
              <FolderGit2 className="h-4 w-4" />
              <span>GitHub @abhyy333</span>
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>

            <Link
              to="/projects/kkn-space"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sage-500 hover:bg-sage-600 text-white px-4 py-2.5 text-xs font-semibold transition-all shadow-md"
            >
              <BrandLogo size="xs" variant="dark" className="h-4 w-4 shrink-0" />
              <span>Project KKN SPACE</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Section 1: About Me */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
          <Compass className="h-4 w-4" />
          <span>About Me &amp; Background</span>
        </div>
        <Card className="border-warm-200/80 bg-white/90 shadow-xs backdrop-blur-xs">
          <CardContent className="p-6 sm:p-8 space-y-4 text-charcoal leading-relaxed text-sm sm:text-base">
            <p className="font-medium text-charcoal text-base sm:text-lg border-l-4 border-sage-600 pl-4 py-0.5 text-sage-950">
              {DEVELOPER_PROFILE.bio.lead}
            </p>
            {DEVELOPER_PROFILE.bio.fullParagraphs.map((para, index) => (
              <p key={index} className="text-charcoal-muted leading-relaxed">
                {para}
              </p>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Section 2: Developer Focus */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
          <Layers className="h-4 w-4" />
          <span>Developer Focus</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DEVELOPER_PROFILE.developerFocus.map((focus, index) => (
            <Card
              key={index}
              className="border-warm-200/80 bg-white/80 hover:bg-white hover:shadow-card transition-all"
            >
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-100/80 border border-sage-200">
                    {FOCUS_ICON_MAP[focus.iconName] || <Code2 className="h-5 w-5 text-sage-700" />}
                  </div>
                  <h3 className="font-semibold text-charcoal text-base">{focus.title}</h3>
                </div>
                <p className="text-xs sm:text-sm text-charcoal-muted leading-relaxed">
                  {focus.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Section 3: Technical Stack */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
          <Code2 className="h-4 w-4" />
          <span>Technical Stack</span>
        </div>
        <div className="space-y-4">
          {categories.map((category) => {
            const items = DEVELOPER_PROFILE.technicalStack.filter((t) => t.category === category)
            if (items.length === 0) return null

            return (
              <div key={category} className="rounded-2xl border border-warm-200/80 bg-white/70 p-5 backdrop-blur-xs">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-muted mb-3 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-sage-600" />
                  {category}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {items.map((tech) => (
                    <div
                      key={tech.name}
                      className="group flex flex-col justify-between rounded-xl border border-warm-200/60 bg-warm-50/60 p-3 hover:border-sage-300 hover:bg-white transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-charcoal">{tech.name}</span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-sage-600" />
                      </div>
                      {tech.description && (
                        <span className="text-[11px] text-charcoal-muted mt-1 leading-snug">
                          {tech.description}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Section 4: Featured Project — KKN SPACE */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
          <Globe className="h-4 w-4" />
          <span>Featured Project</span>
        </div>

        {DEVELOPER_PROFILE.featuredProjects.map((project) => (
          <Card
            key={project.id}
            className="overflow-hidden border-sage-200/80 bg-gradient-to-br from-white to-sage-50/40 shadow-card"
          >
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-warm-200/80 pb-5">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="default" className="bg-sage-700 text-white">
                      {project.category}
                    </Badge>
                    <Badge variant="secondary" className="border-sage-200 text-sage-800">
                      {project.status}
                    </Badge>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal pt-1">
                    {project.title}
                  </h3>
                  <p className="text-xs text-charcoal-muted">
                    Institusi: Universitas Mataram · Lokasi: Desa Pringgasela Selatan, Lombok Timur
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/projects/kkn-space"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-sage-700 hover:bg-sage-800 text-white px-4 py-2 text-xs font-medium transition-colors"
                  >
                    <span>Detail Project</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <a
                    href="https://github.com/abhyy333/KKNSPACE"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-warm-300 bg-white hover:bg-warm-50 text-charcoal px-3.5 py-2 text-xs font-medium transition-colors"
                  >
                    <FolderGit2 className="h-3.5 w-3.5" />
                    <span>Repository</span>
                    <ExternalLink className="h-3 w-3 text-charcoal-muted" />
                  </a>
                </div>
              </div>

              <p className="text-sm text-charcoal leading-relaxed">{project.description}</p>

              {/* Metrics */}
              {project.metrics && (
                <div className="grid grid-cols-3 gap-3">
                  {project.metrics.map((metric, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-warm-200 bg-white/90 p-3 text-center shadow-xs"
                    >
                      <div className="text-lg sm:text-xl font-bold text-sage-800 font-serif">
                        {metric.value}
                      </div>
                      <div className="text-[11px] text-charcoal-muted mt-0.5">{metric.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Stack Badges */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-medium text-charcoal-muted">Teknologi yang Digunakan:</span>
                <div className="flex flex-wrap gap-1.5">
                  {project.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center rounded-lg bg-warm-100 border border-warm-200 px-2.5 py-1 text-xs font-medium text-charcoal"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Section 5: Contributions */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
          <ShieldCheck className="h-4 w-4" />
          <span>Contributions in KKN SPACE</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEVELOPER_PROFILE.contributions.map((contrib, idx) => (
            <Card key={idx} className="border-warm-200/80 bg-white/90">
              <CardContent className="p-6 space-y-3">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-sage-700">
                    {contrib.area}
                  </span>
                  <h4 className="font-semibold text-charcoal text-base mt-0.5">{contrib.title}</h4>
                </div>
                <ul className="space-y-2 text-xs text-charcoal-muted leading-relaxed">
                  {contrib.details.map((detail, dIdx) => (
                    <li key={dIdx} className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-sage-600 mt-1.5 shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Section 6: Verified Public Profiles */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
          <Globe className="h-4 w-4" />
          <span>Public Profiles &amp; Verification</span>
        </div>
        <Card className="border-warm-200/80 bg-white">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {DEVELOPER_PROFILE.publicProfiles.map((profile, idx) => (
                <a
                  key={idx}
                  href={profile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between rounded-xl border border-warm-200 bg-warm-50/50 p-4 hover:border-sage-400 hover:bg-white transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-warm-200 group-hover:border-sage-300">
                      <FolderGit2 className="h-5 w-5 text-charcoal group-hover:text-sage-700 transition-colors" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-charcoal">{profile.platform}</span>
                        {profile.verified && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-sage-600" />
                        )}
                      </div>
                      <span className="text-xs text-charcoal-muted">{profile.label}</span>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-warm-400 group-hover:text-sage-700 transition-colors" />
                </a>
              ))}
            </div>
            <p className="text-[11px] text-charcoal-muted mt-4 text-center">
              Informasi profil publik ini diverifikasi resmi sebagai pengembang platform KKN SPACE Universitas Mataram.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Back to KKN SPACE Home CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-warm-200 bg-warm-50/80 p-6">
        <div className="flex items-center gap-3">
          <BrandLogo size="md" className="h-10 w-10 shrink-0 drop-shadow-xs" />
          <div>
            <h4 className="text-sm font-semibold text-charcoal">Platform KKN SPACE</h4>
            <p className="text-xs text-charcoal-muted">
              KKN Universitas Mataram di Desa Pringgasela Selatan, Lombok Timur.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/projects/kkn-space"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sage-700 hover:text-sage-800 underline underline-offset-4"
          >
            Showcase Project
          </Link>
          <span className="text-warm-300">·</span>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sage-700 hover:text-sage-800 underline underline-offset-4"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  )
}

import fs from 'node:fs'
import path from 'node:path'
import {
  SITE_URL,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SEO_DICTIONARY,
  getCanonicalPath,
  buildHreflangTags,
  generateGlobalWebsiteSchema,
  generateVillagePlaceSchema,
  generateBreadcrumbSchema,
  type SeoRouteKey,
} from '../src/config/seo.ts'
import type { Locale } from '../src/i18n/types.ts'

interface RouteTarget {
  routeKey: SeoRouteKey
  canonicalPath: string
  breadcrumbs?: { name: string; url: string }[]
  includeVillagePlace?: boolean
}

const PUBLIC_ROUTE_TARGETS: RouteTarget[] = [
  { routeKey: 'home', canonicalPath: '/' },
  {
    routeKey: 'team',
    canonicalPath: '/tim',
    breadcrumbs: [
      { name: 'Beranda', url: '/' },
      { name: 'Tim KKN', url: '/tim' },
    ],
  },
  {
    routeKey: 'programs',
    canonicalPath: '/program-kerja',
    breadcrumbs: [
      { name: 'Beranda', url: '/' },
      { name: 'Program Kerja', url: '/program-kerja' },
    ],
  },
  {
    routeKey: 'documentation',
    canonicalPath: '/dokumentasi',
    breadcrumbs: [
      { name: 'Beranda', url: '/' },
      { name: 'Dokumentasi Kegiatan', url: '/dokumentasi' },
    ],
  },
  {
    routeKey: 'timeline',
    canonicalPath: '/timeline-kkn',
    breadcrumbs: [
      { name: 'Beranda', url: '/' },
      { name: 'Timeline KKN', url: '/timeline-kkn' },
    ],
  },
  {
    routeKey: 'sponsors',
    canonicalPath: '/sponsors',
    breadcrumbs: [
      { name: 'Beranda', url: '/' },
      { name: 'Sponsor & Mitra', url: '/sponsors' },
    ],
  },
  {
    routeKey: 'villageProfile',
    canonicalPath: '/profil-desa',
    includeVillagePlace: true,
    breadcrumbs: [
      { name: 'Beranda', url: '/' },
      { name: 'Profil Desa', url: '/profil-desa' },
    ],
  },
  {
    routeKey: 'villageHistory',
    canonicalPath: '/profil-desa/sejarah',
    includeVillagePlace: true,
    breadcrumbs: [
      { name: 'Beranda', url: '/' },
      { name: 'Profil Desa', url: '/profil-desa' },
      { name: 'Sejarah Pemekaran', url: '/profil-desa/sejarah' },
    ],
  },
  {
    routeKey: 'villageTerritory',
    canonicalPath: '/profil-desa/wilayah',
    includeVillagePlace: true,
    breadcrumbs: [
      { name: 'Beranda', url: '/' },
      { name: 'Profil Desa', url: '/profil-desa' },
      { name: 'Peta & 7 Dusun', url: '/profil-desa/wilayah' },
    ],
  },
  {
    routeKey: 'villageTourism',
    canonicalPath: '/profil-desa/pariwisata',
    includeVillagePlace: true,
    breadcrumbs: [
      { name: 'Beranda', url: '/' },
      { name: 'Profil Desa', url: '/profil-desa' },
      { name: 'Pariwisata Alam', url: '/profil-desa/pariwisata' },
    ],
  },
  {
    routeKey: 'villageCulture',
    canonicalPath: '/profil-desa/budaya',
    includeVillagePlace: true,
    breadcrumbs: [
      { name: 'Beranda', url: '/' },
      { name: 'Profil Desa', url: '/profil-desa' },
      { name: 'Budaya & Tenun Sasak', url: '/profil-desa/budaya' },
    ],
  },
  {
    routeKey: 'villageEconomy',
    canonicalPath: '/profil-desa/potensi-desa',
    includeVillagePlace: true,
    breadcrumbs: [
      { name: 'Beranda', url: '/' },
      { name: 'Profil Desa', url: '/profil-desa' },
      { name: 'Potensi UMKM & Ekonomi', url: '/profil-desa/potensi-desa' },
    ],
  },
  {
    routeKey: 'villageGallery',
    canonicalPath: '/profil-desa/galeri',
    includeVillagePlace: true,
    breadcrumbs: [
      { name: 'Beranda', url: '/' },
      { name: 'Profil Desa', url: '/profil-desa' },
      { name: 'Galeri Foto Desa', url: '/profil-desa/galeri' },
    ],
  },
]

const ALL_LOCALES: Locale[] = ['id-ID', 'en-US', 'en-GB', 'zh-CN', 'ru-RU']

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function runPrerender() {
  const distDir = path.resolve(process.cwd(), 'dist')
  const baseHtmlPath = path.join(distDir, 'index.html')

  if (!fs.existsSync(baseHtmlPath)) {
    console.error('dist/index.html not found! Run vite build first.')
    process.exit(1)
  }

  const baseHtml = fs.readFileSync(baseHtmlPath, 'utf-8')
  let generatedCount = 0

  for (const target of PUBLIC_ROUTE_TARGETS) {
    for (const locale of ALL_LOCALES) {
      const isDefault = locale === 'id-ID'
      const prefix = locale.toLowerCase()
      const requestPath = isDefault
        ? target.canonicalPath
        : target.canonicalPath === '/'
        ? `/${prefix}`
        : `/${prefix}${target.canonicalPath}`

      const seoConfig = SEO_DICTIONARY[locale][target.routeKey]
      const activeTitle = seoConfig.title.includes(SITE_NAME)
        ? seoConfig.title
        : `${seoConfig.title} | ${SITE_NAME}`
      const activeDesc = seoConfig.description
      const canonicalUrl = `${SITE_URL}${getCanonicalPath(target.canonicalPath)}`

      // Build hreflang link tags
      const hreflangs = buildHreflangTags(target.canonicalPath)
      const hreflangTags = hreflangs
        .map((h) => `<link rel="alternate" hreflang="${h.lang}" href="${h.href}" />`)
        .join('\n    ')

      // Build JSON-LD Structured Data
      const schemas: unknown[] = [generateGlobalWebsiteSchema()]
      if (target.includeVillagePlace) {
        schemas.push(generateVillagePlaceSchema())
      }
      if (target.breadcrumbs && target.breadcrumbs.length > 0) {
        schemas.push(generateBreadcrumbSchema(target.breadcrumbs))
      }
      const jsonLdScript = `<script type="application/ld+json" id="kkn-structured-data">\n    ${JSON.stringify(schemas, null, 2)}\n    </script>`

      // Modify HTML tags
      let html = baseHtml
      html = html.replace(/<html lang="[^"]*"/, `<html lang="${locale.split('-')[0]}"`)
      html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(activeTitle)}</title>`)
      html = html.replace(
        /<meta name="description" content="[^"]*" \/>/,
        `<meta name="description" content="${escapeHtml(activeDesc)}" />`
      )
      html = html.replace(
        /<link rel="canonical" href="[^"]*" \/>/,
        `<link rel="canonical" href="${canonicalUrl}" />\n    ${hreflangTags}`
      )
      html = html.replace(
        /<meta property="og:title" content="[^"]*" \/>/,
        `<meta property="og:title" content="${escapeHtml(activeTitle)}" />`
      )
      html = html.replace(
        /<meta property="og:description" content="[^"]*" \/>/,
        `<meta property="og:description" content="${escapeHtml(activeDesc)}" />`
      )
      html = html.replace(
        /<meta property="og:url" content="[^"]*" \/>/,
        `<meta property="og:url" content="${canonicalUrl}" />`
      )
      html = html.replace(
        /<meta property="og:locale" content="[^"]*" \/>/,
        `<meta property="og:locale" content="${locale.replace('-', '_')}" />`
      )
      html = html.replace(
        /<meta name="twitter:title" content="[^"]*" \/>/,
        `<meta name="twitter:title" content="${escapeHtml(activeTitle)}" />`
      )
      html = html.replace(
        /<meta name="twitter:description" content="[^"]*" \/>/,
        `<meta name="twitter:description" content="${escapeHtml(activeDesc)}" />`
      )

      // Replace or insert JSON-LD
      if (html.includes('<script type="application/ld+json">')) {
        html = html.replace(
          /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
          jsonLdScript
        )
      } else {
        html = html.replace('</head>', `    ${jsonLdScript}\n  </head>`)
      }

      // Update noscript block with contextual title & summary
      const noscriptBlock = `
    <noscript>
      <div style="padding: 2rem; font-family: sans-serif; max-width: 800px; margin: 0 auto; line-height: 1.6;">
        <h1>${escapeHtml(activeTitle)}</h1>
        <p>${escapeHtml(activeDesc)}</p>
        <p>Portal resmi informasi Kuliah Kerja Nyata (KKN) mahasiswa Universitas Mataram di Desa Pringgasela Selatan, Lombok Timur.</p>
        <nav aria-label="Navigasi Utama">
          <ul>
            <li><a href="/">Beranda</a></li>
            <li><a href="/tim">Tim KKN &amp; DPL</a></li>
            <li><a href="/profil-desa">Profil Desa Pringgasela Selatan</a></li>
            <li><a href="/program-kerja">Program Kerja KKN</a></li>
            <li><a href="/dokumentasi">Dokumentasi Kegiatan</a></li>
            <li><a href="/timeline-kkn">Timeline Pelaksanaan KKN</a></li>
            <li><a href="/sponsors">Sponsor &amp; Mitra Kolaborasi</a></li>
          </ul>
        </nav>
      </div>
    </noscript>`
      html = html.replace(/<noscript>[\s\S]*?<\/noscript>/, noscriptBlock)

      // Determine output file path
      const outRelPath = requestPath === '/' ? 'index.html' : path.join(requestPath.replace(/^\//, ''), 'index.html')
      const outFilePath = path.join(distDir, outRelPath)

      fs.mkdirSync(path.dirname(outFilePath), { recursive: true })
      fs.writeFileSync(outFilePath, html, 'utf-8')
      generatedCount++
    }
  }

  console.log(`Successfully prerendered ${generatedCount} static HTML SEO routes into dist/!`)
  generateSitemap(distDir)
}

export function generateSitemap(distDir: string) {
  const publicDir = path.resolve(process.cwd(), 'public')
  const now = new Date().toISOString()

  const routeMeta: Record<SeoRouteKey, { changefreq: string; priority: string; comment: string }> = {
    home: { changefreq: 'daily', priority: '1.0', comment: 'Homepage' },
    villageProfile: { changefreq: 'weekly', priority: '0.9', comment: 'Profil Desa (Village Profile Overview)' },
    villageHistory: { changefreq: 'monthly', priority: '0.8', comment: 'Profil Desa — Sejarah' },
    villageTerritory: { changefreq: 'monthly', priority: '0.8', comment: 'Profil Desa — Peta & 7 Dusun' },
    villageTourism: { changefreq: 'monthly', priority: '0.8', comment: 'Profil Desa — Pariwisata' },
    villageCulture: { changefreq: 'monthly', priority: '0.8', comment: 'Profil Desa — Budaya & Sentra Tenun Sasak' },
    villageEconomy: { changefreq: 'monthly', priority: '0.8', comment: 'Profil Desa — Potensi Ekonomi & UMKM' },
    villageGallery: { changefreq: 'weekly', priority: '0.7', comment: 'Profil Desa — Galeri Foto' },
    team: { changefreq: 'weekly', priority: '0.9', comment: 'Tim KKN Universitas Mataram' },
    programs: { changefreq: 'weekly', priority: '0.9', comment: 'Program Kerja KKN' },
    documentation: { changefreq: 'weekly', priority: '0.8', comment: 'Galeri Dokumentasi Kegiatan' },
    timeline: { changefreq: 'monthly', priority: '0.8', comment: 'Timeline & Tahapan KKN' },
    sponsors: { changefreq: 'weekly', priority: '0.8', comment: 'Sponsor & Mitra Kolaborasi' },
  }

  const urlBlocks: string[] = []

  for (const target of PUBLIC_ROUTE_TARGETS) {
    const meta = routeMeta[target.routeKey] || { changefreq: 'weekly', priority: '0.8', comment: target.canonicalPath }
    const canonicalUrl = `${SITE_URL}${target.canonicalPath === '/' ? '/' : target.canonicalPath}`
    const hreflangs = buildHreflangTags(target.canonicalPath)
    const hreflangLinks = hreflangs
      .map((h) => `    <xhtml:link rel="alternate" hreflang="${h.lang}" href="${h.href}" />`)
      .join('\n')

    urlBlocks.push(`  <!-- ${meta.comment} -->
  <url>
    <loc>${canonicalUrl}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${meta.changefreq}</changefreq>
    <priority>${meta.priority}</priority>
${hreflangLinks}
  </url>`)
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlBlocks.join('\n\n')}
</urlset>
`

  // Write to both public and dist directories
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml, 'utf-8')
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml, 'utf-8')
  }

  // Ensure robots.txt is in dist as well
  const publicRobots = path.join(publicDir, 'robots.txt')
  if (fs.existsSync(publicRobots) && fs.existsSync(distDir)) {
    fs.copyFileSync(publicRobots, path.join(distDir, 'robots.txt'))
  }

  console.log(`Successfully generated and synchronized sitemap.xml with ${PUBLIC_ROUTE_TARGETS.length} public canonical routes!`)
}

runPrerender()

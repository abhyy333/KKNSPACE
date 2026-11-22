import fs from 'node:fs'
import path from 'node:path'
import {
  SITE_URL,
  SITE_NAME,
  SEO_DICTIONARY,
  getCanonicalPath,
  buildHreflangTags,
  generateGlobalWebsiteSchema,
  generateVillagePlaceSchema,
  generateBreadcrumbSchema,
  generateDeveloperPersonSchema,
  generateDeveloperProfilePageSchema,
  generateProjectWebApplicationSchema,
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
  {
    routeKey: 'developerProfile',
    canonicalPath: '/developer/abdul-habir-al-majdi',
    breadcrumbs: [
      { name: 'Beranda', url: '/' },
      { name: 'Developer', url: '/developer/abdul-habir-al-majdi' },
      { name: 'Abdul Habir Al Majdi', url: '/developer/abdul-habir-al-majdi' },
    ],
  },
  {
    routeKey: 'projectShowcase',
    canonicalPath: '/projects/kkn-space',
    breadcrumbs: [
      { name: 'Beranda', url: '/' },
      { name: 'Projects', url: '/projects/kkn-space' },
      { name: 'KKN SPACE', url: '/projects/kkn-space' },
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
      if (target.routeKey === 'developerProfile') {
        schemas.push(generateDeveloperProfilePageSchema(), generateDeveloperPersonSchema())
      } else if (target.routeKey === 'projectShowcase') {
        schemas.push(generateProjectWebApplicationSchema())
      }
      const jsonLdScript = `<script type="application/ld+json" id="kkn-structured-data">\n    ${JSON.stringify(schemas, null, 2)}\n    </script>`

      // Modify HTML tags
      let html = baseHtml
      html = html.replace(/<html lang="[^"]*"/, `<html lang="id-ID"`)
      html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(activeTitle)}</title>`)
      html = html.replace(
        /<meta name="description" content="[^"]*" \/>/,
        `<meta name="description" content="${escapeHtml(activeDesc)}" />`
      )
      const canonicalTag = `<link rel="canonical" href="${canonicalUrl}" />`
      const canonicalBlock = hreflangTags ? `${canonicalTag}\n    ${hreflangTags}` : canonicalTag
      html = html.replace(
        /<link rel="canonical" href="[^"]*" \/>/,
        canonicalBlock
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

      // Update noscript block with contextual title, rich semantic content & navigation
      let noscriptContent = `
        <h1>${escapeHtml(activeTitle)}</h1>
        <p>${escapeHtml(activeDesc)}</p>
        <p>Portal resmi informasi Kuliah Kerja Nyata (KKN) mahasiswa Universitas Mataram di Desa Pringgasela Selatan, Lombok Timur.</p>`

      if (target.routeKey === 'developerProfile') {
        noscriptContent = `
        <h1>Abdul Habir Al Majdi — Web Developer &amp; Digital Technology Enthusiast</h1>
        <p><strong>Identitas:</strong> Mahasiswa Teknik Elektro Universitas Mataram (UNRAM), Lombok, Nusa Tenggara Barat.</p>
        <p><strong>Deskripsi:</strong> Mahasiswa Teknik Elektro Universitas Mataram yang memiliki ketertarikan pada pengembangan aplikasi web, sistem informasi, teknologi digital, dan Internet of Things.</p>
        <h2>Developer Focus</h2>
        <ul>
          <li><strong>Web Development:</strong> Arsitektur antarmuka web modern, responsif, dan aksesibel menggunakan React 19, TypeScript, dan Tailwind CSS.</li>
          <li><strong>Full-Stack Development:</strong> Integrasi frontend dengan backend Supabase, database relasional PostgreSQL, dan Row-Level Security (RLS).</li>
          <li><strong>System Development:</strong> Perancangan sistem manajemen digital (program kerja, logbook digital, keuangan transparan, inventaris posko).</li>
          <li><strong>IoT Development:</strong> Integrasi telemetri perangkat keras dan mikrokontroler berbasis keilmuan Teknik Elektro.</li>
        </ul>
        <h2>Technical Stack</h2>
        <p>React 19, TypeScript, JavaScript (ESNext), HTML5, CSS3, Tailwind CSS, Vite, Supabase, PostgreSQL, Leaflet, MapLibre GL, Git, GitHub, Node.js, Vercel.</p>
        <h2>Featured Project</h2>
        <p><strong><a href="/projects/kkn-space">KKN SPACE</a></strong> — Platform digital kolaborasi dan geoportal untuk kegiatan KKN mahasiswa Universitas Mataram di Desa Pringgasela Selatan, Lombok Timur.</p>
        <h2>Kontribusi Utama dalam KKN SPACE</h2>
        <p>Merancang arsitektur perangkat lunak end-to-end, pemodelan database PostgreSQL, implementasi keamanan RLS, 10 modul sistem digital, geoportal 7 dusun, serta pipeline technical SEO dan static prerendering.</p>
        <h2>Profil Publik Terverifikasi</h2>
        <ul>
          <li>GitHub: <a href="https://github.com/abhyy333">https://github.com/abhyy333</a></li>
          <li>Repository KKN SPACE: <a href="https://github.com/abhyy333/KKNSPACE">https://github.com/abhyy333/KKNSPACE</a></li>
        </ul>`
      } else if (target.routeKey === 'projectShowcase') {
        noscriptContent = `
        <h1>KKN SPACE — Web Application untuk KKN Desa Pringgasela Selatan</h1>
        <p><strong>Deskripsi Project:</strong> KKN SPACE merupakan platform digital untuk mendukung pengelolaan dan koordinasi kegiatan Kuliah Kerja Nyata di Desa Pringgasela Selatan, Universitas Mataram.</p>
        <p><strong>Developer:</strong> <a href="/developer/abdul-habir-al-majdi">Abdul Habir Al Majdi</a> (Mahasiswa Teknik Elektro Universitas Mataram).</p>
        <p><strong>Institusi:</strong> Universitas Mataram · <strong>Lokasi:</strong> Desa Pringgasela Selatan, Lombok Timur, NTB · <strong>Status:</strong> Production (Aktif digunakan 2026–2027).</p>
        <h2>10 Fitur Utama Platform</h2>
        <ul>
          <li>Dashboard dan koordinasi kelompok terpadu.</li>
          <li>Manajemen program kerja dan indikator capaian mingguan.</li>
          <li>Agenda posko dan kalender kegiatan masyarakat.</li>
          <li>Digital logbook dan presensi piket posko (Duty).</li>
          <li>Dokumentasi visual foto resolusi tinggi terhubung Supabase Storage.</li>
          <li>Pencatatan kas dan transparansi keuangan pengabdian.</li>
          <li>Manajemen inventaris dan peminjaman aset logistik posko.</li>
          <li>Direktori 10 mahasiswa KKN dengan sistem hak akses bertingkat.</li>
          <li>Workspace Dosen Pembimbing Lapangan (DPL) untuk supervisi dan evaluasi.</li>
          <li>Geoportal interaktif 7 dusun dan direktori sentra tenun Sasak Pringgasela Selatan.</li>
        </ul>
        <h2>Teknologi</h2>
        <p>React 19, TypeScript, Vite, Tailwind CSS, Supabase, PostgreSQL, Row-Level Security (RLS), Leaflet GIS, MapLibre GL, Vercel Edge Hosting.</p>
        <p><strong>Tautan Proyek:</strong> <a href="https://kknspace.vercel.app">Website Resmi KKN SPACE</a> | <a href="https://github.com/abhyy333/KKNSPACE">GitHub Repository</a> | <a href="/developer/abdul-habir-al-majdi">Profil Pengembang (Abdul Habir Al Majdi)</a></p>`
      }

      const noscriptBlock = `
    <noscript>
      <div style="padding: 2rem; font-family: sans-serif; max-width: 800px; margin: 0 auto; line-height: 1.6;">
        ${noscriptContent}
        <nav aria-label="Navigasi Utama">
          <ul>
            <li><a href="/">Beranda</a></li>
            <li><a href="/projects/kkn-space">Project KKN SPACE</a></li>
            <li><a href="/developer/abdul-habir-al-majdi">Developer: Abdul Habir Al Majdi</a></li>
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
    developerProfile: { changefreq: 'monthly', priority: '0.8', comment: 'Developer Profile — Abdul Habir Al Majdi' },
    projectShowcase: { changefreq: 'monthly', priority: '0.8', comment: 'Project Showcase — KKN SPACE Web Application' },
  }

  const urlBlocks: string[] = []

  for (const target of PUBLIC_ROUTE_TARGETS) {
    const meta = routeMeta[target.routeKey] || { changefreq: 'weekly', priority: '0.8', comment: target.canonicalPath }
    const canonicalUrl = `${SITE_URL}${target.canonicalPath === '/' ? '/' : target.canonicalPath}`
    const hreflangs = buildHreflangTags(target.canonicalPath)
    const hreflangLines = hreflangs.length > 0
      ? '\n' + hreflangs.map((h) => `    <xhtml:link rel="alternate" hreflang="${h.lang}" href="${h.href}" />`).join('\n')
      : ''

    urlBlocks.push(`  <!-- ${meta.comment} -->
  <url>
    <loc>${canonicalUrl}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${meta.changefreq}</changefreq>
    <priority>${meta.priority}</priority>${hreflangLines}
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

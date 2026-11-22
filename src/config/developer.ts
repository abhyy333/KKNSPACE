import { SITE_URL } from './seo.ts'

export interface TechItem {
  name: string
  category: 'Frontend' | 'Backend & Database' | 'Mapping & GIS' | 'Tools & Deployment' | 'Hardware & IoT'
  description?: string
}

export interface DeveloperProject {
  id: string
  title: string
  category: string
  role: string
  summary: string
  description: string
  routePath?: string
  liveUrl?: string
  repoUrl?: string
  status: string
  techStack: string[]
  metrics?: { label: string; value: string }[]
}

export interface DeveloperContribution {
  area: string
  title: string
  details: string[]
}

export interface DeveloperProfileConfig {
  fullName: string
  professionalTitle: string
  academicAffiliation: {
    institution: string
    institutionUrl: string
    faculty: string
    program: string
    status: string
    focus: string
  }
  location: {
    city: string
    province: string
    country: string
  }
  bio: {
    lead: string
    fullParagraphs: string[]
  }
  developerFocus: {
    title: string
    description: string
    iconName: string
  }[]
  technicalStack: TechItem[]
  featuredProjects: DeveloperProject[]
  contributions: DeveloperContribution[]
  publicProfiles: {
    platform: string
    label: string
    url: string
    verified: boolean
    iconName: string
  }[]
}

export const DEVELOPER_PROFILE: DeveloperProfileConfig = {
  fullName: 'Abdul Habir Al Majdi',
  professionalTitle: 'Web Developer & Digital Technology Enthusiast',
  academicAffiliation: {
    institution: 'Universitas Mataram',
    institutionUrl: 'https://unram.ac.id',
    faculty: 'Fakultas Teknik',
    program: 'Teknik Elektro',
    status: 'Mahasiswa Aktif',
    focus: 'Teknologi Digital & Rekayasa Perangkat Lunak',
  },
  location: {
    city: 'Mataram',
    province: 'Nusa Tenggara Barat',
    country: 'Indonesia',
  },
  bio: {
    lead:
      'Mahasiswa Teknik Elektro Universitas Mataram yang memiliki ketertarikan pada pengembangan aplikasi web, sistem informasi, teknologi digital, dan Internet of Things.',
    fullParagraphs: [
      'Abdul Habir Al Majdi adalah seorang Web Developer dan mahasiswa Teknik Elektro di Universitas Mataram (UNRAM) yang berfokus pada perancangan arsitektur sistem perangkat lunak modern, aplikasi web interaktif, dan integrasi teknologi digital yang berorientasi pada kebutuhan pengguna.',
      'Melalui kombinasi keilmuan rekayasa sistem elektro dan rekayasa web modern, Abdul Habir aktif mengembangkan solusi berbasis teknologi informasi yang rapi, modular, dan terukur. Salah satu karya implementasi nyatanya adalah arsitektur platform KKN SPACE — sebuah sistem workspace dan geoportal desa komprehensif yang dirancang untuk mendukung operasional Kuliah Kerja Nyata mahasiswa Universitas Mataram di Desa Pringgasela Selatan, Kabupaten Lombok Timur.',
      'Dedikasinya berpusat pada penulisan kode berkualitas, keamanan data dengan arsitektur berbasis otorisasi ketat, serta performa web optimal melalui static prerendering dan implementasi standar Schema.org untuk visibilitas mesin pencari.',
    ],
  },
  developerFocus: [
    {
      title: 'Web Development',
      description:
        'Pengembangan antarmuka web modern, responsif, dan aksesibel menggunakan ekosistem React, TypeScript, dan Tailwind CSS dengan standar estetika minimalis serta interaksi mulus.',
      iconName: 'Layout',
    },
    {
      title: 'Full-Stack Development',
      description:
        'Integrasi menyeluruh antara antarmuka frontend dengan layanan backend modern, database relasional PostgreSQL, otentikasi aman, dan Row-Level Security (RLS) pada Supabase.',
      iconName: 'Layers',
    },
    {
      title: 'System Development',
      description:
        'Perancangan alur bisnis terstruktur, modul workspace terintegrasi (logbook, keuangan, inventaris, audit trail), serta otomatisasi build dan SEO prerender untuk performa tinggi.',
      iconName: 'Cpu',
    },
    {
      title: 'IoT Development',
      description:
        'Eksplorasi integrasi perangkat keras, mikrokontroler, telemetri sensor, dan komunikasi data digital sebagai bagian dari bidang keilmuan Teknik Elektro.',
      iconName: 'Radio',
    },
  ],
  technicalStack: [
    { name: 'React 19', category: 'Frontend', description: 'Library UI modern berbasis komponen reaktif' },
    { name: 'TypeScript', category: 'Frontend', description: 'Pengetikan statis untuk keandalan dan skalabilitas kode' },
    { name: 'Tailwind CSS', category: 'Frontend', description: 'Utility-first styling untuk desain modern & konsisten' },
    { name: 'Vite', category: 'Frontend', description: 'Build tool dan bundler berkecepatan tinggi' },
    { name: 'JavaScript (ESNext)', category: 'Frontend', description: 'Fondasi logika komputasi frontend dan scripting' },
    { name: 'HTML5 & Semantics', category: 'Frontend', description: 'Struktur web semantik berstandar W3C' },
    { name: 'CSS3 & Modern Layouts', category: 'Frontend', description: 'Desain responsif, CSS grid, flexbox, dan micro-interactions' },

    { name: 'Supabase', category: 'Backend & Database', description: 'Backend-as-a-Service dengan Auth, Storage, dan Realtime' },
    { name: 'PostgreSQL', category: 'Backend & Database', description: 'Database relasional dengan integritas relasi dan RLS' },
    { name: 'Row-Level Security (RLS)', category: 'Backend & Database', description: 'Kebijakan keamanan data setingkat baris database' },
    { name: 'REST APIs & RPC', category: 'Backend & Database', description: 'Komunikasi data berbasis API dan pemanggilan fungsi database' },

    { name: 'Leaflet', category: 'Mapping & GIS', description: 'Peta interaktif ringan untuk pemetaan wilayah desa' },
    { name: 'MapLibre GL', category: 'Mapping & GIS', description: 'Visualisasi geoportal vektor untuk 7 dusun' },

    { name: 'Git & Version Control', category: 'Tools & Deployment', description: 'Version control dan kolaborasi kode sumber terdistribusi' },
    { name: 'Vercel', category: 'Tools & Deployment', description: 'Platform hosting edge global dan Continuous Deployment' },
    { name: 'Node.js Scripting', category: 'Tools & Deployment', description: 'Automasi static SEO prerendering & sitemap generator' },

    { name: 'Embedded Systems & IoT', category: 'Hardware & IoT', description: 'Mikrokontroler dan telemetri data perangkat keras' },
  ],
  featuredProjects: [
    {
      id: 'kkn-space',
      title: 'KKN SPACE — Digital Workspace & Geoportal KKN Desa Pringgasela Selatan',
      category: 'Web Application / Digital Workspace',
      role: 'Lead Developer & Architect',
      summary:
        'Platform digital komprehensif untuk mendukung tata kelola, dokumentasi, keuangan, logistik, dan geoportal Kuliah Kerja Nyata mahasiswa Universitas Mataram.',
      description:
        'KKN SPACE merupakan sistem terintegrasi yang menghubungkan mahasiswa KKN, Dosen Pembimbing Lapangan (DPL), dan publik. Dilengkapi modul manajemen program kerja, digital logbook, keuangan transparan, inventaris posko, direktori anggota, hingga etalase potensi desa dan sentra tenun Sasak Pringgasela Selatan.',
      routePath: '/projects/kkn-space',
      liveUrl: 'https://kknspace.vercel.app',
      status: 'Production (Aktif Digunakan)',
      techStack: ['React 19', 'TypeScript', 'Vite', 'Tailwind CSS', 'Supabase', 'PostgreSQL', 'Leaflet', 'Vercel'],
      metrics: [
        { label: 'Modul Sistem', value: '10+ Modul' },
        { label: 'Dusun Binaan', value: '7 Dusun' },
        { label: 'Status Rilis', value: 'Production' },
      ],
    },
  ],
  contributions: [
    {
      area: 'Arsitektur & Rekayasa Frontend',
      title: 'Sistem UI Modern Berbasis React 19 & TypeScript',
      details: [
        'Merancang arsitektur komponen modular dengan prinsip single responsibility dan pemisahan concerns.',
        'Membangun sistem antarmuka responsif berestetika bersih, minimalis, dan terinspirasi dari filosofi desain modern.',
        'Mengimplementasikan error boundary, skeleton loading states, dan mekanisme code splitting berbasis lazy retry.',
      ],
    },
    {
      area: 'Backend, Database & Keamanan',
      title: 'Integrasi Supabase & Kebijakan Row-Level Security',
      details: [
        'Merancang skema relasional PostgreSQL untuk entitas program kerja, agenda, logbook, inventaris, dan transaksi kas.',
        'Menerapkan kebijakan Row-Level Security (RLS) ketat guna memastikan isolasi data privat anggota dan akses bertingkat (Ketua, Anggota, DPL, Super Admin).',
        'Mengatur pipeline media storage dengan optimasi gambar dan validasi tipe berkas.',
      ],
    },
    {
      area: 'Sistem Informasi Spasial Desa',
      title: 'Geoportal Interaktif 7 Dusun Pringgasela Selatan',
      details: [
        'Mengintegrasikan pustaka Leaflet dan MapLibre GL untuk visualisasi pemetaan wilayah administratif 7 dusun.',
        'Menyediakan titik koordinat posko KKN, fasilitas publik desa, dan sentra kerajinan tenun Sasak tradisional.',
      ],
    },
    {
      area: 'Advanced Technical SEO & Prerendering',
      title: 'Pipeline Static Prerender & Schema.org Structured Data',
      details: [
        'Mengembangkan script automasi Node.js (`generate-seo-prerender.ts`) yang menghasilkan file HTML statis lengkap dengan meta tags unik untuk setiap rute publik.',
        'Mengonfigurasi structured data JSON-LD (WebSite, ProfilePage, Person, WebApplication, AdministrativeArea) yang valid dan sesuai standar Google Search.',
        'Menyelaraskan sitemap XML otomatis dan robots.txt dengan proteksi ketat agar rute privat tidak terindeks.',
      ],
    },
  ],
  publicProfiles: [
    {
      platform: 'Platform Resmi',
      label: 'KKN SPACE Portal',
      url: 'https://kknspace.vercel.app',
      verified: true,
      iconName: 'Globe',
    },
    {
      platform: 'Showcase Project',
      label: 'Detail KKN SPACE',
      url: 'https://kknspace.vercel.app/projects/kkn-space',
      verified: true,
      iconName: 'Layout',
    },
  ],
}

/**
 * Generate Schema.org Person object for Abdul Habir Al Majdi
 */
export function generateDeveloperPersonSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${SITE_URL}/developer/abdul-habir-al-majdi#person`,
    name: DEVELOPER_PROFILE.fullName,
    jobTitle: DEVELOPER_PROFILE.professionalTitle,
    description: DEVELOPER_PROFILE.bio.lead,
    url: `${SITE_URL}/developer/abdul-habir-al-majdi`,
    image: `${SITE_URL}/brand/logo-512.png`,
    affiliation: {
      '@type': 'CollegeOrUniversity',
      name: DEVELOPER_PROFILE.academicAffiliation.institution,
      url: DEVELOPER_PROFILE.academicAffiliation.institutionUrl,
    },
    alumniOf: {
      '@type': 'CollegeOrUniversity',
      name: DEVELOPER_PROFILE.academicAffiliation.institution,
      url: DEVELOPER_PROFILE.academicAffiliation.institutionUrl,
    },
    knowsAbout: [
      'Web Development',
      'Full-Stack Development',
      'React',
      'TypeScript',
      'JavaScript',
      'Vite',
      'Tailwind CSS',
      'Supabase',
      'PostgreSQL',
      'Row-Level Security (RLS)',
      'Leaflet GIS',
      'MapLibre GL',
      'Technical SEO',
      'System Architecture',
      'Internet of Things (IoT)',
    ],
  }
}

/**
 * Generate Schema.org ProfilePage object
 */
export function generateDeveloperProfilePageSchema() {
  const person = generateDeveloperPersonSchema()
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${SITE_URL}/developer/abdul-habir-al-majdi#webpage`,
    url: `${SITE_URL}/developer/abdul-habir-al-majdi`,
    name: `${DEVELOPER_PROFILE.fullName} — ${DEVELOPER_PROFILE.professionalTitle}`,
    description: DEVELOPER_PROFILE.bio.lead,
    inLanguage: 'id-ID',
    mainEntity: person,
  }
}

/**
 * Generate Schema.org WebApplication object for KKN SPACE
 */
export function generateProjectWebApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${SITE_URL}/projects/kkn-space#software`,
    name: 'KKN SPACE',
    alternateName: 'KKN SPACE — Web Application untuk KKN Desa Pringgasela Selatan',
    url: `${SITE_URL}/projects/kkn-space`,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'All Modern Web Browsers',
    description:
      'KKN SPACE merupakan platform digital untuk mendukung pengelolaan dan koordinasi kegiatan Kuliah Kerja Nyata di Desa Pringgasela Selatan, Universitas Mataram.',
    inLanguage: 'id-ID',
    creator: {
      '@type': 'Person',
      '@id': `${SITE_URL}/developer/abdul-habir-al-majdi#person`,
      name: DEVELOPER_PROFILE.fullName,
      jobTitle: DEVELOPER_PROFILE.professionalTitle,
      url: `${SITE_URL}/developer/abdul-habir-al-majdi`,
    },
    publisher: {
      '@type': 'EducationalOrganization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Kelompok Mahasiswa KKN Universitas Mataram — Desa Pringgasela Selatan 2026',
      url: `${SITE_URL}/`,
      parentOrganization: {
        '@type': 'CollegeOrUniversity',
        name: 'Universitas Mataram',
        url: 'https://unram.ac.id',
      },
    },
    funder: {
      '@type': 'CollegeOrUniversity',
      name: 'Universitas Mataram',
      url: 'https://unram.ac.id',
    },
    spatialCoverage: {
      '@type': 'AdministrativeArea',
      name: 'Desa Pringgasela Selatan, Lombok Timur, Nusa Tenggara Barat',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'IDR',
    },
  }
}

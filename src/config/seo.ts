import type { Locale } from '../i18n/types.ts'

export const SITE_URL = 'https://kknspace.vercel.app'
export const DEFAULT_OG_IMAGE = `${SITE_URL}/brand/kkn-pringgasela-selatan-2026-2027-master.jpg`
export const SITE_NAME = 'KKN SPACE'

export interface RouteSeoConfig {
  title: string
  description: string
  keywords?: string[]
}

export type SeoRouteKey =
  | 'home'
  | 'team'
  | 'programs'
  | 'documentation'
  | 'timeline'
  | 'sponsors'
  | 'villageProfile'
  | 'villageHistory'
  | 'villageTerritory'
  | 'villageTourism'
  | 'villageCulture'
  | 'villageEconomy'
  | 'villageGallery'

export const SEO_DICTIONARY: Record<Locale, Record<SeoRouteKey, RouteSeoConfig>> = {
  'id-ID': {
    home: {
      title: 'KKN Universitas Mataram di Desa Pringgasela Selatan | KKN SPACE',
      description: 'Kenali kegiatan Kuliah Kerja Nyata mahasiswa Universitas Mataram di Desa Pringgasela Selatan, Lombok Timur. Informasi program kerja, profil desa, dokumentasi, dan perjalanan pengabdian masyarakat.',
      keywords: [
        'KKN Universitas Mataram',
        'KKN UNRAM',
        'KKN Desa Pringgasela Selatan',
        'KKN Lombok Timur',
        'Program KKN Universitas Mataram',
        'Pengabdian Masyarakat Universitas Mataram',
      ],
    },
    villageProfile: {
      title: 'Profil Desa Pringgasela Selatan, Lombok Timur | KKN SPACE',
      description: 'Informasi Desa Pringgasela Selatan, Lombok Timur, Nusa Tenggara Barat. Jelajahi profil wilayah, fasilitas, potensi desa, lingkungan, dan dokumentasi kegiatan KKN Universitas Mataram.',
      keywords: [
        'Desa Pringgasela Selatan',
        'Profil Desa Pringgasela Selatan',
        'Informasi Desa Pringgasela Selatan',
        'Potensi Desa Pringgasela Selatan',
        'Kecamatan Pringgasela',
      ],
    },
    villageHistory: {
      title: 'Sejarah Pemekaran Desa Pringgasela Selatan | KKN SPACE',
      description: 'Catatan sejarah pemekaran, asal-usul wilayah, dan perkembangan kelembagaan Desa Pringgasela Selatan, Lombok Timur, Nusa Tenggara Barat.',
    },
    villageTerritory: {
      title: 'Peta Wilayah & 7 Dusun Desa Pringgasela Selatan | KKN SPACE',
      description: 'Peta geografis dan informasi 7 dusun binaan di Desa Pringgasela Selatan: batas wilayah, titik koordinat posko, dan geoportal digital desa.',
    },
    villageTourism: {
      title: 'Wisata Alam & Daya Tarik Desa Pringgasela Selatan | KKN SPACE',
      description: 'Eksplorasi potensi pariwisata alam, agrowisata, dan panorama kaki Gunung Rinjani di Desa Pringgasela Selatan, Lombok Timur.',
    },
    villageCulture: {
      title: 'Sentra Tenun Sasak & Budaya Desa Pringgasela Selatan | KKN SPACE',
      description: 'Warisan kerajinan tenun Gedogan tradisional Sasak, adat istiadat, dan kearifan lokal masyarakat Desa Pringgasela Selatan.',
    },
    villageEconomy: {
      title: 'Potensi Ekonomi & UMKM Tenun Pringgasela Selatan | KKN SPACE',
      description: 'Pemberdayaan UMKM tenun Sasak tradisional, komoditas pertanian, dan dinamika perekonomian masyarakat Desa Pringgasela Selatan.',
    },
    villageGallery: {
      title: 'Galeri Foto & Pesona Desa Pringgasela Selatan | KKN SPACE',
      description: 'Dokumentasi visual lanskap alam, kegiatan warga, dan kehidupan sosial kemasyarakatan di Desa Pringgasela Selatan.',
    },
    team: {
      title: 'Tim KKN Universitas Mataram di Pringgasela Selatan | KKN SPACE',
      description: 'Profil kelompok mahasiswa Kuliah Kerja Nyata Universitas Mataram dan Dosen Pembimbing Lapangan (DPL) yang bertugas di Desa Pringgasela Selatan, Lombok Timur.',
      keywords: [
        'Tim KKN Universitas Mataram',
        'Mahasiswa KKN UNRAM',
        'DPL KKN UNRAM',
        'KKN Pringgasela Selatan 2026',
      ],
    },
    programs: {
      title: 'Program Kerja KKN Universitas Mataram di Pringgasela Selatan | KKN SPACE',
      description: 'Daftar dan kemajuan program kerja mahasiswa KKN Universitas Mataram: pemberdayaan UMKM tenun Sasak, geoportal desa, pendidikan, dan kesehatan masyarakat.',
      keywords: [
        'Program Kerja KKN Universitas Mataram',
        'Program KKN UNRAM',
        'Kegiatan KKN di Lombok Timur',
        'Pemberdayaan UMKM Tenun Sasak',
      ],
    },
    documentation: {
      title: 'Dokumentasi Kegiatan KKN di Desa Pringgasela Selatan | KKN SPACE',
      description: 'Galeri foto dan arsip dokumentasi kegiatan lapangan mahasiswa KKN Universitas Mataram bersama masyarakat Desa Pringgasela Selatan, Lombok Timur.',
      keywords: [
        'Dokumentasi KKN Universitas Mataram',
        'Foto Kegiatan KKN UNRAM',
        'Dokumentasi Desa Pringgasela Selatan',
      ],
    },
    timeline: {
      title: 'Timeline KKN Universitas Mataram di Pringgasela Selatan | KKN SPACE',
      description: 'Jadwal dan tahapan pelaksanaan Kuliah Kerja Nyata Universitas Mataram: survei awal, pembekalan, pelaksanaan di posko, hingga laporan akhir pengabdian.',
    },
    sponsors: {
      title: 'Sponsor & Mitra Kolaborasi KKN Pringgasela Selatan | KKN SPACE',
      description: 'Direktori kemitraan dan apresiasi sponsor pendukung program Kuliah Kerja Nyata mahasiswa Universitas Mataram di Desa Pringgasela Selatan.',
    },
  },

  'en-US': {
    home: {
      title: 'Universitas Mataram Community Fieldwork in South Pringgasela | KKN SPACE',
      description: 'Explore the community-service fieldwork of Universitas Mataram students in South Pringgasela, East Lombok. Authentic work programs, village profile, and community documentation.',
      keywords: ['Universitas Mataram Fieldwork', 'KKN UNRAM', 'South Pringgasela Fieldwork', 'Lombok Community Service'],
    },
    villageProfile: {
      title: 'South Pringgasela Village Profile, East Lombok | KKN SPACE',
      description: 'Comprehensive guide to South Pringgasela Village, East Lombok, West Nusa Tenggara. Explore village territory, public facilities, local potential, and community fieldwork insights.',
    },
    villageHistory: {
      title: 'History & Governance of South Pringgasela Village | KKN SPACE',
      description: 'Historical records, regional establishment, and community heritage of South Pringgasela Village, East Lombok, Indonesia.',
    },
    villageTerritory: {
      title: 'Territory Map & 7 Hamlets of South Pringgasela | KKN SPACE',
      description: 'Geographic mapping and demographic overview of the 7 hamlets in South Pringgasela Village, East Lombok.',
    },
    villageTourism: {
      title: 'Eco-Tourism & Natural Attractions in South Pringgasela | KKN SPACE',
      description: 'Discover eco-tourism, agro-forestry, and scenic landscapes at the foothills of Mount Rinjani in South Pringgasela Village.',
    },
    villageCulture: {
      title: 'Sasak Weaving Heritage & Traditional Culture | KKN SPACE',
      description: 'Traditional Sasak handwoven textile traditions, cultural wisdom, and artisan craft in South Pringgasela Village.',
    },
    villageEconomy: {
      title: 'Village Economy & Traditional Weaving Crafts | KKN SPACE',
      description: 'Economic empowerment, Sasak artisan weaving cooperatives, and agricultural potential in South Pringgasela Village.',
    },
    villageGallery: {
      title: 'Photography & Visual Landscapes of South Pringgasela | KKN SPACE',
      description: 'Visual photo archive capturing daily village life, traditional craftsmanship, and cultural activities.',
    },
    team: {
      title: 'Universitas Mataram Fieldwork Team in South Pringgasela | KKN SPACE',
      description: 'Meet the student fieldwork team and faculty advisor from Universitas Mataram dedicated to community stewardship in South Pringgasela, East Lombok.',
    },
    programs: {
      title: 'Work Programs of Universitas Mataram in South Pringgasela | KKN SPACE',
      description: 'Detailed roadmap and progress of student fieldwork initiatives: Sasak weaving MSME empowerment, civic geoportal, education, and community health.',
    },
    documentation: {
      title: 'Fieldwork Documentation & Media Gallery | KKN SPACE',
      description: 'Photo archive and field documentation of Universitas Mataram students actively engaging with the community of South Pringgasela Village.',
    },
    timeline: {
      title: 'Fieldwork Timeline & Operational Milestones | KKN SPACE',
      description: 'Schedule and operational phases of Universitas Mataram community fieldwork: initial survey, orientation, field deployment, and final evaluation.',
    },
    sponsors: {
      title: 'Sponsors & Collaborative Partners | KKN SPACE',
      description: 'Partnership directory and recognition for sponsors and collaborative institutions supporting our community fieldwork initiatives.',
    },
  },

  'en-GB': {
    home: {
      title: 'Universitas Mataram Community Fieldwork in South Pringgasela | KKN SPACE',
      description: 'Discover the community-service fieldwork of Universitas Mataram students in South Pringgasela, East Lombok. Detailed work programmes, village profile, and field documentation.',
      keywords: ['Universitas Mataram Fieldwork', 'KKN UNRAM', 'South Pringgasela Fieldwork', 'Lombok Community Service'],
    },
    villageProfile: {
      title: 'South Pringgasela Village Profile, East Lombok | KKN SPACE',
      description: 'Comprehensive guide to South Pringgasela Village, East Lombok, West Nusa Tenggara. Explore village territory, public facilities, local potential, and community fieldwork insights.',
    },
    villageHistory: {
      title: 'History & Organisation of South Pringgasela Village | KKN SPACE',
      description: 'Historical records, regional establishment, and community heritage of South Pringgasela Village, East Lombok, Indonesia.',
    },
    villageTerritory: {
      title: 'Territory Map & 7 Hamlets of South Pringgasela | KKN SPACE',
      description: 'Geographical mapping and demographic overview of the 7 hamlets in South Pringgasela Village, East Lombok.',
    },
    villageTourism: {
      title: 'Eco-Tourism & Natural Attractions in South Pringgasela | KKN SPACE',
      description: 'Discover eco-tourism, agro-forestry, and scenic landscapes at the foothills of Mount Rinjani in South Pringgasela Village.',
    },
    villageCulture: {
      title: 'Sasak Weaving Heritage & Traditional Culture | KKN SPACE',
      description: 'Traditional Sasak handwoven textile traditions, cultural wisdom, and artisan craft in South Pringgasela Village.',
    },
    villageEconomy: {
      title: 'Village Economy & Traditional Weaving Crafts | KKN SPACE',
      description: 'Economic empowerment, Sasak artisan weaving cooperatives, and agricultural potential in South Pringgasela Village.',
    },
    villageGallery: {
      title: 'Photography & Visual Landscapes of South Pringgasela | KKN SPACE',
      description: 'Visual photo archive capturing daily village life, traditional craftsmanship, and cultural activities.',
    },
    team: {
      title: 'Universitas Mataram Fieldwork Team in South Pringgasela | KKN SPACE',
      description: 'Meet the student fieldwork team and faculty supervisor from Universitas Mataram dedicated to community stewardship in South Pringgasela, East Lombok.',
    },
    programs: {
      title: 'Work Programmes of Universitas Mataram in South Pringgasela | KKN SPACE',
      description: 'Detailed roadmap and progress of student fieldwork initiatives: Sasak weaving MSME empowerment, civic geoportal, education, and community health.',
    },
    documentation: {
      title: 'Fieldwork Documentation & Media Gallery | KKN SPACE',
      description: 'Photo archive and field documentation of Universitas Mataram students actively engaging with the community of South Pringgasela Village.',
    },
    timeline: {
      title: 'Fieldwork Timetable & Operational Milestones | KKN SPACE',
      description: 'Timetable and operational phases of Universitas Mataram community fieldwork: initial survey, orientation, field deployment, and final evaluation.',
    },
    sponsors: {
      title: 'Sponsors & Collaborative Partners | KKN SPACE',
      description: 'Partnership directory and recognition for sponsors and collaborative institutions supporting our community fieldwork initiatives.',
    },
  },

  'zh-CN': {
    home: {
      title: '马塔兰大学南普灵加塞拉村社会实践平台 | KKN SPACE',
      description: '了解印度尼西亚马塔兰大学大学生在东龙目县南普灵加塞拉村开展的基层社会实践项目。涵盖重点实践规划、乡村概况与实地纪实。',
      keywords: ['马塔兰大学社会实践', '东龙目县乡村振兴', '南普灵加塞拉村', '印尼大学生支农实践'],
    },
    villageProfile: {
      title: '东龙目县南普灵加塞拉村概况与地理信息 | KKN SPACE',
      description: '印度尼西亚西努沙登加拉省东龙目县南普灵加塞拉村详实概况。探索七个自然村地理测绘、公共设施、传统手工业及大学生社会实践服务成果。',
    },
    villageHistory: {
      title: '南普灵加塞拉村建村沿革与历史纪实 | KKN SPACE',
      description: '东龙目县南普灵加塞拉村建置沿革、历史档案与乡土文明脉络详实记录。',
    },
    villageTerritory: {
      title: '南普灵加塞拉村辖区地图与七大自然村 | KKN SPACE',
      description: '南普灵加塞拉村七个自然村空间地理测绘、自然边界与实践营地地理信息数据。',
    },
    villageTourism: {
      title: '南普灵加塞拉村生态文旅与自然风光 | KKN SPACE',
      description: '林贾尼火山山麓生态农业、自然风光及乡村绿色旅游资源全景呈现。',
    },
    villageCulture: {
      title: '萨萨克传统手工织锦文化与民俗传承 | KKN SPACE',
      description: '非物质文化遗产萨萨克传统手工织锦技艺、民俗节日与乡风民情。',
    },
    villageEconomy: {
      title: '南普灵加塞拉村特色手工业经济与农业产业 | KKN SPACE',
      description: '萨萨克织锦手工业微型企业扶持、特色生态农业与乡村经济发展调研。',
    },
    villageGallery: {
      title: '南普灵加塞拉村实地风采影像画廊 | KKN SPACE',
      description: '高清纪实摄影全面记录乡村人居风貌、村民生活常态及实践服务现场。',
    },
    team: {
      title: '马塔兰大学南普灵加塞拉村实践团队成员 | KKN SPACE',
      description: '马塔兰大学派驻东龙目县南普灵加塞拉村社会实践团队学子及指导教师概况，展现扎根基层、服务乡村的青春担当。',
    },
    programs: {
      title: '马塔兰大学南普灵加塞拉村实践项目规划 | KKN SPACE',
      description: '马塔兰大学大学生实践项目全景：萨萨克传统织锦赋能、乡村地理空间数据测绘、基础教育支持与社区便民健康服务。',
    },
    documentation: {
      title: '南普灵加塞拉村社会实践影像纪实与活动画廊 | KKN SPACE',
      description: '马塔兰大学实践队员与南普灵加塞拉村群众携手共建的真实影像档案与实地活动纪实。',
    },
    timeline: {
      title: '社会实践时间线与阶段里程碑 | KKN SPACE',
      description: '马塔兰大学社会实践全阶段实施日程表：前期调研、团队动员、实地进驻开展至总结评估。',
    },
    sponsors: {
      title: '社会实践赞助商与战略合作伙伴 | KKN SPACE',
      description: '马塔兰大学南普灵加塞拉村社会实践项目合作伙伴名录与致谢专区。',
    },
  },

  'ru-RU': {
    home: {
      title: 'Общественно-полевая практика Университета Матарам в Южной Принггаселе | KKN SPACE',
      description: 'Ознакомьтесь с общественно-полевой практикой студентов Университета Матарам в деревне Южная Принггасела, Восточный Ломбок. Программы работы, профиль деревни и хроника событий.',
      keywords: ['Практика Университета Матарам', 'Южная Принггасела', 'Восточный Ломбок', 'Полевые исследования Индонезия'],
    },
    villageProfile: {
      title: 'Профиль деревни Южная Принггасела, Восточный Ломбок | KKN SPACE',
      description: 'Подробные сведения о деревне Южная Принггасела, Восточный Ломбок, Западная Нуса-Тенгара. Территория, общественные объекты, местный потенциал и материалы экспедиции.',
    },
    villageHistory: {
      title: 'История и административное развитие деревни Южная Принггасела | KKN SPACE',
      description: 'Исторические хроники, основание и культурное наследие общины Южная Принггасела в Восточном Ломбоке.',
    },
    villageTerritory: {
      title: 'Карта территории и 7 округов Южной Принггаселы | KKN SPACE',
      description: 'Географическая карта и сведения о семи округах деревни Южная Принггасела, координаты штаба и сельский геопортал.',
    },
    villageTourism: {
      title: 'Экотуризм и природные достопримечательности Южной Принггаселы | KKN SPACE',
      description: 'Природные ресурсы, агротуризм и ландшафты у подножия вулкана Ринджани в деревне Южная Принггасела.',
    },
    villageCulture: {
      title: 'Традиционное ткачество Сасак и культурное наследие | KKN SPACE',
      description: 'Старинные ткацкие ремесла Сасак, обрядовые традиции и уклад жителей деревни Южная Принггасела.',
    },
    villageEconomy: {
      title: 'Экономический потенциал и ремесленные мастерские | KKN SPACE',
      description: 'Развитие ремесленного ткачества, сельское хозяйство и инициативы поддержки местных жителей.',
    },
    villageGallery: {
      title: 'Фотоархив и пейзажи Южной Принггаселы | KKN SPACE',
      description: 'Визуальный архив: повседневная жизнь деревни, ремесленный труд и общественные мероприятия.',
    },
    team: {
      title: 'Команда практики Университета Матарам в Южной Принггаселе | KKN SPACE',
      description: 'Состав студенческой группы общественно-полевой практики Университета Матарам и научного руководителя в деревне Южная Принггасела.',
    },
    programs: {
      title: 'Программы работы практики Университета Матарам в Южной Принггаселе | KKN SPACE',
      description: 'План и результаты реализации программ студенческой практики: поддержка ремесла Сасак, сельский геопортал, образование и здравоохранение.',
    },
    documentation: {
      title: 'Хроника и фотоотчёты практики в Южной Принггаселе | KKN SPACE',
      description: 'Фотоархив и полевая хроника совместной деятельности студентов Университета Матарам и жителей деревни Южная Принггасела.',
    },
    timeline: {
      title: 'График и ключевые этапы практики | KKN SPACE',
      description: 'Расписание и этапы проведения практики Университета Матарам: от подготовительного этапа и выезда в штаб до итогового отчёта.',
    },
    sponsors: {
      title: 'Спонсоры и партнёры проекта | KKN SPACE',
      description: 'Каталог партнёрских организаций и благодарность спонсорам общественно-полевой практики в Южной Принггаселе.',
    },
  },
}

export function getCanonicalPath(pathname: string): string {
  // Strip any locale prefix from pathname to find canonical base
  const clean = pathname.replace(/^\/(en-us|en-gb|zh-cn|ru-ru)(\/|$)/, '/')
  const normalized = clean.startsWith('/') ? clean : `/${clean}`
  return normalized === '/' ? '/' : normalized.replace(/\/$/, '')
}

export function getLocalizedPath(pathname: string, locale: Locale): string {
  const canonical = getCanonicalPath(pathname)
  if (locale === 'id-ID') {
    return canonical
  }
  const prefix = locale.toLowerCase()
  return canonical === '/' ? `/${prefix}` : `/${prefix}${canonical}`
}

export function buildHreflangTags(pathname: string): { lang: string; href: string }[] {
  const canonical = getCanonicalPath(pathname)
  return [
    { lang: 'id-ID', href: `${SITE_URL}${canonical}` },
    { lang: 'en-US', href: `${SITE_URL}/en-us${canonical === '/' ? '' : canonical}` },
    { lang: 'en-GB', href: `${SITE_URL}/en-gb${canonical === '/' ? '' : canonical}` },
    { lang: 'zh-CN', href: `${SITE_URL}/zh-cn${canonical === '/' ? '' : canonical}` },
    { lang: 'ru-RU', href: `${SITE_URL}/ru-ru${canonical === '/' ? '' : canonical}` },
    { lang: 'x-default', href: `${SITE_URL}${canonical}` },
  ]
}

export function generateGlobalWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: 'KKN SPACE — Desa Pringgasela Selatan',
    description:
      'Platform informasi dan dokumentasi kegiatan Kuliah Kerja Nyata mahasiswa Universitas Mataram di Desa Pringgasela Selatan, Lombok Timur.',
    inLanguage: ['id-ID', 'en-US', 'en-GB', 'zh-CN', 'ru-RU'],
    publisher: {
      '@type': 'EducationalOrganization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Kelompok Mahasiswa KKN Universitas Mataram — Desa Pringgasela Selatan 2026',
      url: `${SITE_URL}/`,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/brand/logo-512.png`,
      },
      parentOrganization: {
        '@type': 'CollegeOrUniversity',
        name: 'Universitas Mataram',
        url: 'https://unram.ac.id',
      },
    },
  }
}

export function generateVillagePlaceSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'AdministrativeArea',
    '@id': `${SITE_URL}/profil-desa#place`,
    name: 'Desa Pringgasela Selatan',
    alternateName: ['South Pringgasela Village', 'Pringgasela Selatan'],
    description:
      'Desa Pringgasela Selatan berada di Kecamatan Pringgasela, Kabupaten Lombok Timur, Provinsi Nusa Tenggara Barat, Indonesia. Dikenal dengan sentra kerajinan tenun tradisional Sasak dan bentang alam kaki Gunung Rinjani.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Pringgasela',
      addressRegion: 'Lombok Timur',
      addressCountry: 'ID',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: -8.544,
      longitude: 116.442,
    },
    url: `${SITE_URL}/profil-desa`,
  }
}

export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  }
}

// Types for Premium Village Profile & Interactive Geographic Explorer
// Desa Pringgasela Selatan, Kec. Pringgasela, Kab. Lombok Timur

export interface VillageStat {
  label: string
  value: string
  year: string
  source: string
  note?: string
}

export interface VillageBoundaries {
  north: string
  south: string
  west: string
  east: string
}

export interface VillageTrah {
  name: string
  origin: string
  character: string
}

export interface VillageProfileData {
  id: string
  hero_title: string
  hero_subtitle: string
  hero_image_url: string
  overview: string
  history_narrative: string
  established_year: number
  decree_preparation: string
  decree_definitive: string
  kades_name: string
  area_hectares: number
  elevation_masl: string
  jadesta_id: string
  stats: VillageStat[]
  boundaries: VillageBoundaries
  trah_diversity: VillageTrah[]
  geojson_data?: any | null
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface VillageDusun {
  id: string
  name: string
  slug: string
  order_index: number
  description: string
  key_potentials: string[]
  notable_places: string[]
  center_coordinates: {
    lat: number
    lng: number
  }
  cover_image_url: string | null
  is_published: boolean
}

export type DestinationCategory = 'alam' | 'budaya' | 'buatan' | 'religi' | 'agrowisata'
export type DestinationStatusType = 'destinasi_dikelola' | 'potensi_wisata' | 'sentra_kerajinan' | 'lokasi_budaya'

export interface VillageDestination {
  id: string
  name: string
  slug: string
  category: DestinationCategory
  status_type: DestinationStatusType
  dusun_name: string
  description: string
  uniqueness: string
  activities: string[]
  access_info: string | null
  coordinates: {
    lat: number
    lng: number
  }
  cover_image_url: string | null
  sources: string | null
  order_index: number
  is_published: boolean
}

export type HeritageCategory = 'tenun' | 'festival' | 'kesenian_musik' | 'tradisi_religi' | 'batik' | 'keberagaman'

export interface VillageCulturalHeritage {
  id: string
  title: string
  category: HeritageCategory
  summary: string
  description: string
  dusun_origin: string
  preservation_efforts: string | null
  cover_image_url: string | null
  references_text: string | null
  order_index: number
  is_published: boolean
}

export type EconomicSector = 'pertanian' | 'umkm_tenun' | 'umkm_batik' | 'kerajinan_kayu' | 'pariwisata_desa'

export interface VillageEconomicPotential {
  id: string
  title: string
  sector: EconomicSector
  dusun_name: string
  description: string
  highlights: string[]
  cover_image_url: string | null
  order_index: number
  is_published: boolean
}

export type GalleryCategory = 'alam' | 'kerajinan' | 'budaya' | 'masyarakat' | 'pertanian' | 'pariwisata' | 'festival'

export interface VillageGalleryItem {
  id: string
  title: string
  category: GalleryCategory
  image_url: string
  caption: string
  location: string
  year_taken: string
  credit: string
  license_note: string
  alt_text: string
  order_index: number
  is_featured: boolean
  is_published: boolean
}

export type SourceType = 'pemerintah' | 'akademik' | 'media' | 'arsip_desa'

export interface VillageReference {
  id: string
  title: string
  author_publisher: string
  year: string
  url: string | null
  source_type: SourceType
  notes: string | null
  order_index: number
}

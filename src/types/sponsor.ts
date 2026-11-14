export type SponsorCategory =
  | 'sponsor_utama'
  | 'sponsor_pendukung'
  | 'sponsor_produk'
  | 'media_partner'
  | 'mitra_kolaborasi'

export type SponsorContributionType =
  | 'finansial'
  | 'produk_barang'
  | 'konsumsi'
  | 'peralatan'
  | 'jasa_layanan'
  | 'dukungan_publikasi'
  | 'lainnya'

export type SponsorPartnershipStatus =
  | 'prospek'
  | 'dihubungi'
  | 'negosiasi'
  | 'dikonfirmasi'
  | 'selesai'
  | 'tidak_dilanjutkan'

export type SponsorPublicationStatus =
  | 'draft'
  | 'pending_approval'
  | 'published'
  | 'withdrawn'
  | 'rejected'

export interface Sponsor {
  id: string
  name: string
  category: SponsorCategory
  contribution_type: SponsorContributionType
  contribution_description: string | null
  description: string | null
  logo_file_id: string | null
  website_url: string | null
  social_media_url: string | null
  start_date: string | null
  end_date: string | null
  partnership_status: SponsorPartnershipStatus
  publication_status: SponsorPublicationStatus
  publication_rejection_reason: string | null
  display_order: number
  pic_user_id: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  notes: string | null
  first_contact_date: string | null
  last_contact_date: string | null
  next_follow_up_date: string | null
  is_archived: boolean
  created_by: string
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
  // Embedded relations
  pic_profile?: { full_name: string; phone: string | null } | null
  creator_profile?: { full_name: string } | null
  approver_profile?: { full_name: string } | null
}

export interface SponsorCommunication {
  id: string
  sponsor_id: string
  user_id: string
  action_summary: string
  communication_result: string | null
  follow_up_date: string | null
  created_at: string
  author_profile?: { full_name: string } | null
}

export interface PublicSponsor {
  id: string
  name: string
  category: SponsorCategory
  contribution_type: SponsorContributionType
  contribution_description: string | null
  description: string | null
  logo_file_id: string | null
  website_url: string | null
  social_media_url: string | null
  start_date: string | null
  end_date: string | null
  display_order: number
}

export const SPONSOR_CATEGORY_LABELS: Record<SponsorCategory, string> = {
  sponsor_utama: 'Sponsor Utama',
  sponsor_pendukung: 'Sponsor Pendukung',
  sponsor_produk: 'Sponsor Produk',
  media_partner: 'Media Partner',
  mitra_kolaborasi: 'Mitra Kolaborasi',
}

export const SPONSOR_CATEGORY_ORDER: Record<SponsorCategory, number> = {
  sponsor_utama: 1,
  sponsor_pendukung: 2,
  sponsor_produk: 3,
  media_partner: 4,
  mitra_kolaborasi: 5,
}

export const SPONSOR_CONTRIBUTION_LABELS: Record<SponsorContributionType, string> = {
  finansial: 'Finansial',
  produk_barang: 'Produk atau Barang',
  konsumsi: 'Konsumsi',
  peralatan: 'Peralatan',
  jasa_layanan: 'Jasa atau Layanan',
  dukungan_publikasi: 'Dukungan Publikasi',
  lainnya: 'Lainnya',
}

export const SPONSOR_PARTNERSHIP_STATUS_LABELS: Record<SponsorPartnershipStatus, string> = {
  prospek: 'Prospek',
  dihubungi: 'Dihubungi',
  negosiasi: 'Negosiasi',
  dikonfirmasi: 'Dikonfirmasi',
  selesai: 'Selesai',
  tidak_dilanjutkan: 'Tidak Dilanjutkan',
}

export const SPONSOR_PUBLICATION_STATUS_LABELS: Record<SponsorPublicationStatus, string> = {
  draft: 'Belum Diajukan',
  pending_approval: 'Menunggu Persetujuan',
  published: 'Published',
  withdrawn: 'Publication Withdrawn',
  rejected: 'Perlu Revisi / Ditolak',
}

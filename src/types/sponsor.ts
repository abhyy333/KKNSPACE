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

export type SponsorshipTierKey =
  | 'diamond'
  | 'platinum'
  | 'gold'
  | 'silver'
  | 'custom'
  | 'none'

export interface SponsorshipPackage {
  id: string
  tier_key: SponsorshipTierKey
  display_name: string
  badge_label: string
  description: string
  default_benefits: string[]
  display_order: number
  is_active: boolean
  public_visibility: boolean
  created_at: string
  updated_at: string
}

export interface PublicSponsorshipPackage {
  id: string
  tier_key: SponsorshipTierKey
  display_name: string
  badge_label: string
  description: string
  default_benefits: string[]
  display_order: number
}

export type SponsorAgreementStatus =
  | 'draft'
  | 'negotiation'
  | 'confirmed'
  | 'active'
  | 'completed'
  | 'terminated'

export interface SponsorAgreement {
  id: string
  sponsor_id: string
  package_id: string | null
  tier_key: SponsorshipTierKey
  title: string
  relationship_type: SponsorCategory
  agreed_financial_contribution: number
  estimated_non_financial_value: number
  contribution_format_summary: string | null
  payment_schedule: string | null
  start_date: string | null
  end_date: string | null
  special_terms: string | null
  agreement_status: SponsorAgreementStatus
  package_snapshot: {
    package_name?: string
    tier_key?: string
    badge_label?: string
    benefits?: string[]
    description?: string
  }
  confirmation_date: string | null
  pic_user_id: string | null
  finance_transaction_id: string | null
  inventory_item_id: string | null
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  // Embedded
  sponsor?: { id: string; name: string; logo_file_id: string | null } | null
  pic_profile?: { full_name: string; phone: string | null } | null
  creator_profile?: { full_name: string } | null
}

export type SponsorBenefitFulfillmentStatus =
  | 'belum_dijadwalkan'
  | 'direncanakan'
  | 'dalam_proses'
  | 'terpenuhi'
  | 'tidak_dapat_dipenuhi'
  | 'dibatalkan'

export interface SponsorBenefitFulfillment {
  id: string
  agreement_id: string
  benefit_title: string
  benefit_description: string | null
  responsible_user_id: string | null
  target_date: string | null
  fulfillment_status: SponsorBenefitFulfillmentStatus
  fulfillment_notes: string | null
  proof_attachment_file_id: string | null
  proof_url: string | null
  completed_at: string | null
  completed_by: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
  // Embedded
  responsible_profile?: { full_name: string } | null
  completed_profile?: { full_name: string } | null
}

export type SponsorProposalStatus =
  | 'draft'
  | 'ready'
  | 'sent'
  | 'negotiation'
  | 'accepted'
  | 'rejected'
  | 'expired'

export interface ProposalContentSnapshot {
  proposal_title: string
  recipient_organization: string
  recipient_pic_name?: string
  introduction_text: string
  kkn_overview_text: string
  selected_tier_name: string
  tier_description: string
  benefits_list: string[]
  contribution_request_summary: string
  payment_terms: string
  closing_text: string
  committee_contact_name: string
  committee_contact_phone: string
  committee_contact_email: string
}

export interface SponsorProposal {
  id: string
  sponsor_id: string | null
  proposal_number: string
  recipient_organization: string
  recipient_pic_name: string | null
  tier_key: SponsorshipTierKey
  proposal_title: string
  package_id: string | null
  requested_contribution_summary: string | null
  proposal_content_snapshot: ProposalContentSnapshot
  status: SponsorProposalStatus
  sent_at: string | null
  sent_by: string | null
  created_by: string
  created_at: string
  updated_at: string
  // Embedded
  sponsor?: { id: string; name: string } | null
  author_profile?: { full_name: string } | null
  sender_profile?: { full_name: string } | null
}

export interface Sponsor {
  id: string
  name: string
  category: SponsorCategory
  tier_key?: SponsorshipTierKey
  package_id?: string | null
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
  package?: SponsorshipPackage | null
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
  tier_key: SponsorshipTierKey
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

export const SPONSORSHIP_TIER_LABELS: Record<SponsorshipTierKey, string> = {
  diamond: 'Diamond Partner',
  platinum: 'Platinum Partner',
  gold: 'Gold Partner',
  silver: 'Silver Partner',
  custom: 'Custom Partner',
  none: 'Tanpa Paket / Kemitraan Langsung',
}

export const SPONSORSHIP_TIER_COLORS: Record<SponsorshipTierKey, { bg: string; text: string; border: string }> = {
  diamond: { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-300' },
  platinum: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
  gold: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
  silver: { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-300' },
  custom: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' },
  none: { bg: 'bg-warm-100', text: 'text-charcoal-muted', border: 'border-warm-200' },
}

export const SPONSOR_AGREEMENT_STATUS_LABELS: Record<SponsorAgreementStatus, string> = {
  draft: 'Draft Perjanjian',
  negotiation: 'Proses Negosiasi',
  confirmed: 'Dikonfirmasi (MoU/SPK)',
  active: 'Sedang Berjalan',
  completed: 'Selesai Tuntas',
  terminated: 'Dibatalkan / Berakhir Dini',
}

export const SPONSOR_BENEFIT_STATUS_LABELS: Record<SponsorBenefitFulfillmentStatus, string> = {
  belum_dijadwalkan: 'Belum Dijadwalkan',
  direncanakan: 'Direncanakan',
  dalam_proses: 'Dalam Proses',
  terpenuhi: 'Terpenuhi (Selesai)',
  tidak_dapat_dipenuhi: 'Tidak Dapat Dipenuhi',
  dibatalkan: 'Dibatalkan',
}

export const SPONSOR_BENEFIT_STATUS_COLORS: Record<SponsorBenefitFulfillmentStatus, { bg: string; text: string; border: string }> = {
  belum_dijadwalkan: { bg: 'bg-warm-100', text: 'text-charcoal-muted', border: 'border-warm-200' },
  direncanakan: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  dalam_proses: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  terpenuhi: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
  tidak_dapat_dipenuhi: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  dibatalkan: { bg: 'bg-zinc-100', text: 'text-zinc-600', border: 'border-zinc-300' },
}

export const SPONSOR_PROPOSAL_STATUS_LABELS: Record<SponsorProposalStatus, string> = {
  draft: 'Draft Penyusunan',
  ready: 'Siap Dikirim (Final)',
  sent: 'Telah Dikirim ke Mitra',
  negotiation: 'Dalam Pembahasan',
  accepted: 'Diterima / Disetujui',
  rejected: 'Ditolak Mitra',
  expired: 'Kedaluwarsa',
}

export type PartnershipContactDestination = 'whatsapp' | 'email'

export interface PartnershipContactSettings {
  id: string
  active_destination: PartnershipContactDestination
  whatsapp_number: string
  whatsapp_country_code: string
  whatsapp_default_message: string
  email_address: string
  email_subject: string
  email_body: string
  updated_at: string
  updated_by: string | null
  updated_by_name: string | null
}

export interface PublicPartnershipContact {
  active_destination: PartnershipContactDestination | 'none'
  whatsapp_number: string | null
  whatsapp_country_code: string | null
  whatsapp_default_message: string | null
  email_address: string | null
  email_subject: string | null
  email_body: string | null
  is_available: boolean
}


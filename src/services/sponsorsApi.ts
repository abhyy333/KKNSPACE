import { supabase } from '@/lib/supabase'
import { env } from '@/lib/env'
import type {
  Sponsor,
  SponsorCommunication,
  PublicSponsor,
  SponsorCategory,
  SponsorContributionType,
  SponsorPartnershipStatus,
  SponsorPublicationStatus,
  SponsorshipPackage,
  PublicSponsorshipPackage,
  SponsorAgreement,
  SponsorAgreementStatus,
  SponsorBenefitFulfillment,
  SponsorProposal,
  SponsorshipTierKey,
} from '@/types/sponsor'

export interface SponsorFilterParams {
  partnership_status?: SponsorPartnershipStatus | 'all'
  publication_status?: SponsorPublicationStatus | 'all'
  category?: SponsorCategory | 'all'
  contribution_type?: SponsorContributionType | 'all'
  tier_key?: SponsorshipTierKey | 'all'
  search?: string
  pic_user_id?: string
  is_archived?: boolean
}

export interface SponsorOverviewStats {
  totalActiveSponsors: number
  totalPipelineProspects: number
  pendingPublicationRequests: number
  upcomingFollowUps: number
  endingSoonCount: number
  publishedCount: number
  totalAgreementsCount: number
  totalProposalsCount: number
}

const SPONSOR_SELECT_FIELDS = `
  id,
  name,
  category,
  tier_key,
  package_id,
  contribution_type,
  contribution_description,
  description,
  logo_file_id,
  website_url,
  social_media_url,
  start_date,
  end_date,
  partnership_status,
  publication_status,
  publication_rejection_reason,
  display_order,
  pic_user_id,
  contact_name,
  contact_email,
  contact_phone,
  notes,
  first_contact_date,
  last_contact_date,
  next_follow_up_date,
  is_archived,
  created_by,
  approved_by,
  approved_at,
  created_at,
  updated_at,
  pic_profile:profiles!sponsors_pic_user_id_fkey(full_name, phone),
  creator_profile:profiles!sponsors_created_by_profile_fkey(full_name),
  approver_profile:profiles!sponsors_approved_by_profile_fkey(full_name),
  package:sponsorship_packages(id, tier_key, display_name, badge_label, description, default_benefits)
`

export async function fetchSponsors(filters?: SponsorFilterParams): Promise<Sponsor[]> {
  let query = supabase.from('sponsors').select(SPONSOR_SELECT_FIELDS)

  if (filters?.is_archived !== undefined) {
    query = query.eq('is_archived', filters.is_archived)
  } else {
    query = query.eq('is_archived', false)
  }

  if (filters?.partnership_status && filters.partnership_status !== 'all') {
    query = query.eq('partnership_status', filters.partnership_status)
  }

  if (filters?.publication_status && filters.publication_status !== 'all') {
    query = query.eq('publication_status', filters.publication_status)
  }

  if (filters?.category && filters.category !== 'all') {
    query = query.eq('category', filters.category)
  }

  if (filters?.contribution_type && filters.contribution_type !== 'all') {
    query = query.eq('contribution_type', filters.contribution_type)
  }

  if (filters?.pic_user_id) {
    query = query.eq('pic_user_id', filters.pic_user_id)
  }

  if (filters?.search && filters.search.trim()) {
    const s = `%${filters.search.trim()}%`
    query = query.or(`name.ilike.${s},contact_name.ilike.${s},description.ilike.${s}`)
  }

  query = query
    .order('display_order', { ascending: true })
    .order('updated_at', { ascending: false })

  const { data, error } = await query

  if (error) {
    throw new Error(`Gagal memuat data sponsor: ${error.message}`)
  }

  return (data || []) as unknown as Sponsor[]
}

export async function fetchSponsorById(id: string): Promise<Sponsor | null> {
  const { data, error } = await supabase
    .from('sponsors')
    .select(SPONSOR_SELECT_FIELDS)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal memuat detail sponsor: ${error.message}`)
  }

  return (data as unknown as Sponsor) || null
}

export async function createSponsor(payload: {
  name: string
  category: SponsorCategory
  contribution_type: SponsorContributionType
  contribution_description?: string | null
  description?: string | null
  logo_file_id?: string | null
  website_url?: string | null
  social_media_url?: string | null
  start_date?: string | null
  end_date?: string | null
  partnership_status?: SponsorPartnershipStatus
  publication_status?: SponsorPublicationStatus
  pic_user_id?: string | null
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  notes?: string | null
  first_contact_date?: string | null
  last_contact_date?: string | null
  next_follow_up_date?: string | null
}): Promise<Sponsor> {
  const { data: authData, error: authErr } = await supabase.auth.getUser()
  if (authErr || !authData.user) {
    throw new Error('Sesi autentikasi tidak valid. Silakan login kembali.')
  }

  const { data, error } = await supabase
    .from('sponsors')
    .insert({
      ...payload,
      created_by: authData.user.id,
      partnership_status: payload.partnership_status || 'prospek',
      publication_status: payload.publication_status || 'draft',
      is_archived: false,
    })
    .select(SPONSOR_SELECT_FIELDS)
    .single()

  if (error) {
    throw new Error(`Gagal menambahkan sponsor: ${error.message}`)
  }

  return data as unknown as Sponsor
}

export async function updateSponsor(
  id: string,
  payload: Partial<Omit<Sponsor, 'id' | 'created_by' | 'created_at' | 'updated_at'>>
): Promise<Sponsor> {
  const { data, error } = await supabase
    .from('sponsors')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(SPONSOR_SELECT_FIELDS)
    .single()

  if (error) {
    throw new Error(`Gagal memperbarui sponsor: ${error.message}`)
  }

  return data as unknown as Sponsor
}

export async function submitSponsorForPublication(id: string): Promise<Sponsor> {
  // Validate sponsor has required logo and name before submission
  const existing = await fetchSponsorById(id)
  if (!existing) {
    throw new Error('Data sponsor tidak ditemukan.')
  }

  if (!existing.logo_file_id) {
    throw new Error('Logo resmi sponsor wajib diunggah sebelum mengajukan publikasi.')
  }

  if (existing.partnership_status !== 'dikonfirmasi' && existing.partnership_status !== 'selesai') {
    throw new Error('Hanya sponsor dengan status kerja sama Dikonfirmasi atau Selesai yang dapat diajukan publikasi.')
  }

  return updateSponsor(id, {
    publication_status: 'pending_approval',
    publication_rejection_reason: null,
  })
}

export async function reviewSponsorPublication(
  id: string,
  decision: 'approve' | 'reject' | 'withdraw',
  reason?: string
): Promise<Sponsor> {
  const { data: authData, error: authErr } = await supabase.auth.getUser()
  if (authErr || !authData.user) {
    throw new Error('Sesi autentikasi tidak valid.')
  }

  if (decision === 'approve') {
    return updateSponsor(id, {
      publication_status: 'published',
      approved_by: authData.user.id,
      approved_at: new Date().toISOString(),
      publication_rejection_reason: null,
    })
  }

  if (decision === 'reject') {
    if (!reason || !reason.trim()) {
      throw new Error('Alasan penolakan / revisi wajib dicantumkan.')
    }
    return updateSponsor(id, {
      publication_status: 'rejected',
      publication_rejection_reason: reason.trim(),
    })
  }

  // withdraw
  return updateSponsor(id, {
    publication_status: 'withdrawn',
  })
}

export async function updateSponsorsOrder(
  orderedItems: Array<{ id: string; display_order: number }>
): Promise<void> {
  await Promise.all(
    orderedItems.map((item) =>
      supabase
        .from('sponsors')
        .update({ display_order: item.display_order, updated_at: new Date().toISOString() })
        .eq('id', item.id)
    )
  )
}

export async function archiveSponsor(id: string, is_archived = true): Promise<void> {
  const { error } = await supabase
    .from('sponsors')
    .update({ is_archived, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw new Error(`Gagal mengubah status arsip: ${error.message}`)
  }
}

export async function deleteSponsor(id: string): Promise<void> {
  const { error } = await supabase.from('sponsors').delete().eq('id', id)
  if (error) {
    throw new Error(`Gagal menghapus sponsor: ${error.message}`)
  }
}

// ----------------- Communications / Follow-up History -----------------

export async function fetchSponsorCommunications(sponsorId: string): Promise<SponsorCommunication[]> {
  const { data, error } = await supabase
    .from('sponsor_communications')
    .select(`
      id,
      sponsor_id,
      user_id,
      action_summary,
      communication_result,
      follow_up_date,
      created_at,
      author_profile:profiles!sponsor_communications_user_id_profile_fkey(full_name)
    `)
    .eq('sponsor_id', sponsorId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Gagal memuat riwayat komunikasi: ${error.message}`)
  }

  return (data || []) as unknown as SponsorCommunication[]
}

export async function addSponsorCommunication(payload: {
  sponsor_id: string
  action_summary: string
  communication_result?: string | null
  follow_up_date?: string | null
}): Promise<SponsorCommunication> {
  const { data: authData, error: authErr } = await supabase.auth.getUser()
  if (authErr || !authData.user) {
    throw new Error('Sesi autentikasi tidak valid.')
  }

  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date())

  const { data, error } = await supabase
    .from('sponsor_communications')
    .insert({
      sponsor_id: payload.sponsor_id,
      user_id: authData.user.id,
      action_summary: payload.action_summary.trim(),
      communication_result: payload.communication_result?.trim() || null,
      follow_up_date: payload.follow_up_date || null,
    })
    .select(`
      id,
      sponsor_id,
      user_id,
      action_summary,
      communication_result,
      follow_up_date,
      created_at,
      author_profile:profiles!sponsor_communications_user_id_profile_fkey(full_name)
    `)
    .single()

  if (error) {
    throw new Error(`Gagal mencatat komunikasi: ${error.message}`)
  }

  // Update sponsor's last_contact_date and next_follow_up_date
  await supabase
    .from('sponsors')
    .update({
      last_contact_date: todayStr,
      ...(payload.follow_up_date ? { next_follow_up_date: payload.follow_up_date } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.sponsor_id)

  return data as unknown as SponsorCommunication
}

// ----------------- Public Showcase -----------------

export async function fetchPublicSponsors(): Promise<PublicSponsor[]> {
  // First try v2 RPC which includes tier_key
  const { data: v2Data, error: v2Err } = await supabase.rpc('get_public_sponsors_v2')
  if (!v2Err && v2Data) {
    return v2Data as PublicSponsor[]
  }

  // Fallback to v1
  const { data, error } = await supabase.rpc('get_public_sponsors')
  if (error) {
    console.error('Error fetching public sponsors:', error)
    return []
  }

  return (data || []).map((s: any) => ({
    ...s,
    tier_key: s.tier_key || 'none',
  })) as PublicSponsor[]
}

export async function fetchPublicSponsorshipPackages(): Promise<PublicSponsorshipPackage[]> {
  const { data, error } = await supabase.rpc('get_public_sponsorship_packages')
  if (error) {
    console.error('Error fetching public sponsorship packages:', error)
    return []
  }
  return (data || []) as PublicSponsorshipPackage[]
}

export async function getPublicSponsorLogoUrl(sponsorId: string, fileId?: string): Promise<string | null> {
  const params = new URLSearchParams()
  if (sponsorId) params.set('sponsorId', sponsorId)
  if (fileId) params.set('fileId', fileId)

  const url = `${env.VITE_SUPABASE_URL}/functions/v1/public-sponsor-logo?${params.toString()}`

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    })

    if (!res.ok) return null

    const payload = (await res.json().catch(() => null)) as { signedUrl?: string } | null
    return typeof payload?.signedUrl === 'string' ? payload.signedUrl : null
  } catch {
    return null
  }
}

// ----------------- Sponsorship Packages (Admin Management) -----------------

export async function fetchSponsorshipPackages(): Promise<SponsorshipPackage[]> {
  const { data, error } = await supabase
    .from('sponsorship_packages')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) {
    throw new Error(`Gagal memuat paket kemitraan: ${error.message}`)
  }
  return (data || []) as SponsorshipPackage[]
}

export async function updateSponsorshipPackage(
  id: string,
  payload: Partial<Pick<SponsorshipPackage, 'display_name' | 'badge_label' | 'description' | 'default_benefits' | 'display_order' | 'is_active' | 'public_visibility'>>
): Promise<SponsorshipPackage> {
  const { data, error } = await supabase
    .from('sponsorship_packages')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    throw new Error(`Gagal memperbarui paket kemitraan: ${error.message}`)
  }
  return data as SponsorshipPackage
}

// ----------------- Sponsor Agreements & Snapshots -----------------

export async function fetchSponsorAgreements(sponsorId?: string): Promise<SponsorAgreement[]> {
  let query = supabase
    .from('sponsor_agreements')
    .select(`
      *,
      sponsor:sponsors(id, name, logo_file_id),
      pic_profile:profiles!sponsor_agreements_pic_user_id_fkey(full_name, phone),
      creator_profile:profiles!sponsor_agreements_created_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false })

  if (sponsorId) {
    query = query.eq('sponsor_id', sponsorId)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(`Gagal memuat kesepakatan kemitraan: ${error.message}`)
  }
  return (data || []) as unknown as SponsorAgreement[]
}

export async function createSponsorAgreement(payload: {
  sponsor_id: string
  package_id?: string | null
  tier_key: SponsorshipTierKey
  title: string
  relationship_type: SponsorCategory
  agreed_financial_contribution?: number
  estimated_non_financial_value?: number
  contribution_format_summary?: string
  payment_schedule?: string
  start_date?: string | null
  end_date?: string | null
  special_terms?: string
  agreement_status?: SponsorAgreementStatus
  confirmation_date?: string | null
  pic_user_id?: string | null
  package_snapshot: {
    package_name?: string
    tier_key?: string
    badge_label?: string
    benefits?: string[]
    description?: string
  }
}): Promise<SponsorAgreement> {
  const { data: authData, error: authErr } = await supabase.auth.getUser()
  if (authErr || !authData.user) {
    throw new Error('Sesi autentikasi tidak valid.')
  }

  const { data, error } = await supabase
    .from('sponsor_agreements')
    .insert({
      ...payload,
      created_by: authData.user.id,
    })
    .select(`
      *,
      sponsor:sponsors(id, name, logo_file_id),
      pic_profile:profiles!sponsor_agreements_pic_user_id_fkey(full_name, phone),
      creator_profile:profiles!sponsor_agreements_created_by_fkey(full_name)
    `)
    .single()

  if (error) {
    throw new Error(`Gagal membuat kesepakatan kemitraan: ${error.message}`)
  }

  // Update sponsor's tier_key and package_id if confirmed/active
  if (payload.tier_key && payload.tier_key !== 'none') {
    await supabase
      .from('sponsors')
      .update({
        tier_key: payload.tier_key,
        package_id: payload.package_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.sponsor_id)
  }

  return data as unknown as SponsorAgreement
}

export async function updateSponsorAgreement(
  id: string,
  payload: Partial<SponsorAgreement>
): Promise<SponsorAgreement> {
  const { data: authData } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('sponsor_agreements')
    .update({
      ...payload,
      updated_by: authData?.user?.id || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      sponsor:sponsors(id, name, logo_file_id),
      pic_profile:profiles!sponsor_agreements_pic_user_id_fkey(full_name, phone),
      creator_profile:profiles!sponsor_agreements_created_by_fkey(full_name)
    `)
    .single()

  if (error) {
    throw new Error(`Gagal memperbarui kesepakatan kemitraan: ${error.message}`)
  }
  return data as unknown as SponsorAgreement
}

// ----------------- Benefit Fulfillment Tracker -----------------

export async function fetchBenefitFulfillments(agreementId: string): Promise<SponsorBenefitFulfillment[]> {
  const { data, error } = await supabase
    .from('sponsor_benefit_fulfillments')
    .select(`
      *,
      responsible_profile:profiles!sponsor_benefit_fulfillments_responsible_user_id_fkey(full_name),
      completed_profile:profiles!sponsor_benefit_fulfillments_completed_by_fkey(full_name)
    `)
    .eq('agreement_id', agreementId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Gagal memuat daftar realisasi benefit: ${error.message}`)
  }
  return (data || []) as unknown as SponsorBenefitFulfillment[]
}

export async function createBenefitFulfillment(payload: {
  agreement_id: string
  benefit_title: string
  benefit_description?: string
  responsible_user_id?: string | null
  target_date?: string | null
  fulfillment_status?: string
}): Promise<SponsorBenefitFulfillment> {
  const { data, error } = await supabase
    .from('sponsor_benefit_fulfillments')
    .insert(payload)
    .select(`
      *,
      responsible_profile:profiles!sponsor_benefit_fulfillments_responsible_user_id_fkey(full_name),
      completed_profile:profiles!sponsor_benefit_fulfillments_completed_by_fkey(full_name)
    `)
    .single()

  if (error) {
    throw new Error(`Gagal menambahkan komitmen benefit: ${error.message}`)
  }
  return data as unknown as SponsorBenefitFulfillment
}

export async function updateBenefitFulfillment(
  id: string,
  payload: Partial<SponsorBenefitFulfillment>
): Promise<SponsorBenefitFulfillment> {
  const { data: authData } = await supabase.auth.getUser()

  const updateFields: any = {
    ...payload,
    updated_at: new Date().toISOString(),
  }

  if (payload.fulfillment_status === 'terpenuhi') {
    updateFields.completed_at = new Date().toISOString()
    updateFields.completed_by = authData?.user?.id || null
  }

  const { data, error } = await supabase
    .from('sponsor_benefit_fulfillments')
    .update(updateFields)
    .eq('id', id)
    .select(`
      *,
      responsible_profile:profiles!sponsor_benefit_fulfillments_responsible_user_id_fkey(full_name),
      completed_profile:profiles!sponsor_benefit_fulfillments_completed_by_fkey(full_name)
    `)
    .single()

  if (error) {
    throw new Error(`Gagal memperbarui status benefit: ${error.message}`)
  }
  return data as unknown as SponsorBenefitFulfillment
}

// ----------------- Sponsor Proposal Generator (Template-based, NO AI) -----------------

export async function fetchSponsorProposals(): Promise<SponsorProposal[]> {
  const { data, error } = await supabase
    .from('sponsor_proposals')
    .select(`
      *,
      sponsor:sponsors(id, name),
      author_profile:profiles!sponsor_proposals_created_by_fkey(full_name),
      sender_profile:profiles!sponsor_proposals_sent_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Gagal memuat arsip proposal sponsor: ${error.message}`)
  }
  return (data || []) as unknown as SponsorProposal[]
}

export async function createSponsorProposal(payload: {
  sponsor_id?: string | null
  proposal_number: string
  recipient_organization: string
  recipient_pic_name?: string
  tier_key: SponsorshipTierKey
  proposal_title: string
  package_id?: string | null
  requested_contribution_summary?: string
  proposal_content_snapshot: any
  status?: string
}): Promise<SponsorProposal> {
  const { data: authData, error: authErr } = await supabase.auth.getUser()
  if (authErr || !authData.user) {
    throw new Error('Sesi autentikasi tidak valid.')
  }

  const { data, error } = await supabase
    .from('sponsor_proposals')
    .insert({
      ...payload,
      created_by: authData.user.id,
    })
    .select(`
      *,
      sponsor:sponsors(id, name),
      author_profile:profiles!sponsor_proposals_created_by_fkey(full_name)
    `)
    .single()

  if (error) {
    throw new Error(`Gagal membuat proposal sponsor: ${error.message}`)
  }
  return data as unknown as SponsorProposal
}

export async function updateSponsorProposal(
  id: string,
  payload: Partial<SponsorProposal>
): Promise<SponsorProposal> {
  const { data: authData } = await supabase.auth.getUser()

  const updateFields: any = {
    ...payload,
    updated_at: new Date().toISOString(),
  }

  if (payload.status === 'sent' && !payload.sent_at) {
    updateFields.sent_at = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date())
    updateFields.sent_by = authData?.user?.id || null
  }

  const { data, error } = await supabase
    .from('sponsor_proposals')
    .update(updateFields)
    .eq('id', id)
    .select(`
      *,
      sponsor:sponsors(id, name),
      author_profile:profiles!sponsor_proposals_created_by_fkey(full_name)
    `)
    .single()

  if (error) {
    throw new Error(`Gagal memperbarui status proposal: ${error.message}`)
  }
  return data as unknown as SponsorProposal
}

// ----------------- Overview Stats (Live DB Queries) -----------------

export async function fetchSponsorOverviewStats(): Promise<SponsorOverviewStats> {
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date())

  const [allRes, followUpRes, agreementsRes, proposalsRes] = await Promise.all([
    supabase
      .from('sponsors')
      .select('id, partnership_status, publication_status, next_follow_up_date, end_date, is_archived')
      .eq('is_archived', false),
    supabase
      .from('sponsors')
      .select('id')
      .eq('is_archived', false)
      .not('next_follow_up_date', 'is', null)
      .gte('next_follow_up_date', todayStr),
    supabase
      .from('sponsor_agreements')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('sponsor_proposals')
      .select('id', { count: 'exact', head: true }),
  ])

  if (allRes.error) {
    throw new Error(`Gagal memuat statistik sponsor: ${allRes.error.message}`)
  }

  const rows = allRes.data || []

  const totalActiveSponsors = rows.filter(
    (r) => r.partnership_status === 'dikonfirmasi' || r.partnership_status === 'selesai'
  ).length

  const totalPipelineProspects = rows.filter(
    (r) => r.partnership_status === 'prospek' || r.partnership_status === 'dihubungi' || r.partnership_status === 'negosiasi'
  ).length

  const pendingPublicationRequests = rows.filter(
    (r) => r.publication_status === 'pending_approval'
  ).length

  const publishedCount = rows.filter(
    (r) => r.publication_status === 'published'
  ).length

  // Partnerships ending within 14 days
  const future14Days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const endingSoonCount = rows.filter(
    (r) =>
      r.end_date &&
      r.end_date >= todayStr &&
      r.end_date <= future14Days &&
      r.partnership_status === 'dikonfirmasi'
  ).length

  const upcomingFollowUps = followUpRes.data?.length || 0
  const totalAgreementsCount = agreementsRes.count || 0
  const totalProposalsCount = proposalsRes.count || 0

  return {
    totalActiveSponsors,
    totalPipelineProspects,
    pendingPublicationRequests,
    upcomingFollowUps,
    endingSoonCount,
    publishedCount,
    totalAgreementsCount,
    totalProposalsCount,
  }
}

export async function fetchTeamProfilesForSelect(): Promise<Array<{ id: string; full_name: string }>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  if (error) {
    return []
  }
  return data || []
}

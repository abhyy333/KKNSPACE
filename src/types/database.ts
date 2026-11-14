export type KknRole = 'ketua' | 'sekretaris' | 'bendahara' | 'anggota' | 'dpl'
export type MembershipStatus = 'invited' | 'active' | 'suspended' | 'revoked'
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked'

export interface Profile {
  id: string
  full_name: string
  phone: string | null
  avatar_file_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SystemAdmin {
  user_id: string
  created_at: string
  created_by: string | null
}

export interface Membership {
  user_id: string
  role: KknRole
  division: string | null
  status: MembershipStatus
  joined_at: string | null
  created_at: string
  updated_at: string
}

export interface Invitation {
  id: string
  email: string
  role: KknRole
  division: string | null
  status: InvitationStatus
  invited_by: string
  auth_user_id: string | null
  directory_member_id?: string | null
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface GroupSettings {
  id: number
  group_name: string
  village_name: string | null
  period_start: string | null
  period_end: string | null
  logo_file_id: string | null
  updated_by: string | null
  updated_at: string
  platform_name?: string | null
  university?: string | null
  academic_year?: string | null
  kkn_batch?: string | null
  province?: string | null
  regency?: string | null
  district?: string | null
  village?: string | null
  posko_dusun?: string | null
  posko_address?: string | null
  latitude?: number | null
  longitude?: number | null
  maps_url?: string | null
  prep_date?: string | null
  withdrawal_date?: string | null
  dpl_name?: string | null
  dpl_nip?: string | null
  dpl_contact?: string | null
  posko_description?: string | null
  emergency_contact?: string | null
  important_notes?: string | null
  posko_photo_file_id?: string | null
}

export type WorkProgramStatus = 'planned' | 'ongoing' | 'completed' | 'cancelled'
export type PublicationStatus = 'draft' | 'published' | 'archived'
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type AnnouncementStatus = 'draft' | 'published' | 'archived'
export type FinanceTransactionType = 'income' | 'expense'

export interface WorkProgram {
  id: string
  title: string
  description: string | null
  status: WorkProgramStatus
  start_date: string | null
  end_date: string | null
  publication_status: PublicationStatus
  created_by: string
  created_at: string
  updated_at: string
}

export interface TaskItem {
  id: string
  program_id: string | null
  title: string
  description: string | null
  due_date: string | null
  status: TaskStatus
  created_by: string
  created_at: string
  updated_at: string
}

export interface TaskAssignee {
  task_id: string
  user_id: string
  assigned_by: string
  created_at: string
}

export type AgendaCategory =
  | 'Sosialisasi & Edukasi'
  | 'Kerja Bakti & Lingkungan'
  | 'Kesehatan & Posyandu'
  | 'Pendidikan & Bimbingan'
  | 'UMKM & Ekonomi Kreatif'
  | 'Rapat & Koordinasi'
  | 'Umum'

export type AgendaPublicationStatus = 'draft' | 'internal' | 'published' | 'archived'
export type AgendaExecutionStatus = 'not_started' | 'in_progress' | 'completed' | 'postponed'

export interface AgendaActivityStep {
  id: string
  agenda_id: string
  title: string
  description: string | null
  order_index: number
  completion_status: boolean
  completed_at: string | null
  completed_by: string | null
  actual_notes: string | null
  created_at: string
  updated_at: string
  completed_by_profile?: {
    id: string
    full_name: string
  } | null
}

export interface AgendaActivityLog {
  id: string
  agenda_id: string
  actor_user_id: string | null
  action_type: string
  field_changed: string | null
  old_value: string | null
  new_value: string | null
  created_at: string
  actor_profile?: {
    id: string
    full_name: string
  } | null
}

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  start_at: string
  end_at: string
  created_by: string
  location?: string
  category?: AgendaCategory | string
  pic_id?: string | null
  responsible_division?: string
  target_audience?: string | null
  target_output?: string | null
  equipment_needed?: string[]
  publication_status?: AgendaPublicationStatus
  execution_status?: AgendaExecutionStatus
  related_program_id?: string | null
  related_timeline_stage_id?: string | null
  created_at?: string
  updated_at?: string
  created_by_profile?: {
    id: string
    full_name: string
  } | null
  pic_profile?: {
    id: string
    full_name: string
  } | null
  steps?: AgendaActivityStep[]
  related_program?: {
    id: string
    title: string
  } | null
  related_timeline_stage?: {
    id: string
    title: string
    stage_number?: number
  } | null
}

export interface DutyShift {
  id: string
  shift_date: string
  start_time: string
  end_time: string
  assigned_user_id: string | null
  notes: string | null
  created_by: string
}

export interface FinanceCategory {
  id: string
  name: string
  type: FinanceTransactionType
  is_active: boolean
  created_at: string
}

export interface FinanceTransaction {
  id: string
  category_id: string | null
  type: FinanceTransactionType
  amount: number | string
  description: string
  transaction_date: string
  recorded_by: string
  reversal_of_transaction_id: string | null
  correction_reason: string | null
  created_at: string
}

export interface FinanceAttachment {
  id: string
  transaction_id: string
  file_id: string
  created_at: string
}

export interface Announcement {
  id: string
  title: string
  content: string
  status: AnnouncementStatus
  created_by: string
  published_by: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export type ProgramAssignmentType = 'pj' | 'member'

export interface ProgramAssignment {
  id: string
  program_id: string
  user_id: string
  assignment_type: ProgramAssignmentType
  assigned_by: string
  created_at: string
}

export interface FileObject {
  id: string
  bucket_id: string
  object_path: string
  original_name: string
  mime_type: string
  file_size: number
  uploaded_by: string
  created_at: string
}

export interface MediaAsset {
  id: string
  file_id: string
  title: string | null
  caption: string | null
  publication_status: PublicationStatus
  uploaded_by: string
  published_by: string | null
  published_at: string | null
  created_at: string
  assigned_to: string | null
}

export interface DocumentItem {
  id: string
  file_id: string
  title: string
  description: string | null
  publication_status: PublicationStatus
  uploaded_by: string
  published_by: string | null
  published_at: string | null
  created_at: string
  assigned_to: string | null
}

export interface WorkspaceMemberSummary {
  user_id: string
  full_name: string
  email: string
  phone: string | null
  avatar_file_id: string | null
  role: KknRole
  division: string | null
  status: MembershipStatus
  joined_at: string | null
  is_super_admin?: boolean
}

export type AcademicStatus = 'mahasiswa' | 'dosen'

export interface KknTeamDirectoryMember {
  id: string
  linked_user_id: string | null
  full_name: string
  identity_number: string
  university: string | null
  study_program: string
  academic_status: AcademicStatus
  phone: string | null
  position_label: string
  role: KknRole
  division: string | null
  account_email: string | null
  photo_file_id: string | null
  photo_path: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ==========================================
// Phase 5.2 Operational Modules
// ==========================================

// Module 1: Meetings & Minutes
export type MeetingStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'
export type MeetingAttendanceStatus = 'pending' | 'present' | 'absent' | 'excused'
export type MeetingDecisionStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type MeetingMinuteStatus = 'draft' | 'published'

export interface Meeting {
  id: string
  title: string
  description: string | null
  meeting_date: string
  end_time: string | null
  location: string | null
  meeting_link: string | null
  status: MeetingStatus
  created_by: string
  created_at: string
  updated_at: string
}

export interface MeetingAgendaItem {
  id: string
  meeting_id: string
  title: string
  sort_order: number
  notes: string | null
  duration_minutes: number | null
}

export interface MeetingMinute {
  id: string
  meeting_id: string
  content: string
  status: MeetingMinuteStatus
  key_points: string | null
  discussion_summary: string | null
  conclusions: string | null
  author_id: string
  created_at: string
  updated_at: string
}

export interface MeetingAttendee {
  meeting_id: string
  user_id: string
  attendance_status: MeetingAttendanceStatus
  notes: string | null
  confirmed_at: string | null
}

export interface MeetingDecision {
  id: string
  meeting_id: string
  title: string | null
  decision: string
  responsible_user_id: string | null
  due_date: string | null
  status: MeetingDecisionStatus
  progress_notes: string | null
  created_at: string
}

export interface MeetingAttachment {
  id: string
  meeting_id: string
  file_id: string
  created_at: string
}

// Module 2: Inventory & Logistics
export type InventoryItemType = 'asset' | 'consumable'
export type InventoryTrackingModel = 'tracked' | 'quantity'
export type InventoryOwnershipType = 'GROUP_OWNED' | 'PERSONAL_OWNED' | 'BORROWED_EXTERNAL' | 'DONATED'
export type InventoryCondition = 'good' | 'fair' | 'damaged' | 'lost'
export type InventoryMovementType = 'in' | 'out' | 'borrow' | 'return' | 'adjustment' | 'transfer' | 'reconciliation'
export type InventoryLoanStatus = 'pending' | 'approved' | 'rejected' | 'borrowed' | 'returned' | 'overdue' | 'cancelled'
export type InventoryHandoverStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'
export type InventoryReconciliationStatus = 'pending' | 'resolved' | 'problematic' | 'waiting_confirmation'

export type InventoryItemStatus =
  | 'stored'
  | 'in_use'
  | 'borrowed_member'
  | 'borrowed_external'
  | 'maintenance'
  | 'returned'
  | 'in_return_process'
  | 'lost'
  | 'damaged'
  | 'disposed'

export type PersonalFinalAction =
  | 'returned_to_owner'
  | 'taken_home'
  | 'entrusted_group'
  | 'not_found'
  | 'damaged_reported'

export type ExternalFinalAction =
  | 'returned_to_lender'
  | 'pending_return'
  | 'awaiting_lender_confirmation'
  | 'lost_damaged_resolution'

export type GroupFinalAction =
  | 'stored_next_period'
  | 'handed_over'
  | 'moved_storage'
  | 'sold_group_decision'
  | 'donated_approved'
  | 'disposed_approved'
  | 'lost_damaged_action'

export type InventoryFinalAction = PersonalFinalAction | ExternalFinalAction | GroupFinalAction

export type InventoryPhotoType =
  | 'primary'
  | 'front'
  | 'back_side'
  | 'spec_serial'
  | 'condition'
  | 'accessories'
  | 'general'

export type InventoryDocumentationCategory =
  | 'kondisi_awal'
  | 'pembelian'
  | 'perpindahan'
  | 'kerusakan'
  | 'pengembalian'
  | 'kondisi_akhir'
  | 'kelengkapan'

export type InventoryConditionSnapshot = 'new' | 'good' | 'fair' | 'damaged' | 'lost'

export interface InventoryPhoto {
  id: string
  item_id: string
  file_id: string
  storage_path: string
  photo_type: InventoryPhotoType
  documentation_category: InventoryDocumentationCategory
  condition_snapshot: InventoryConditionSnapshot | null
  caption: string | null
  documentation_date: string
  is_primary: boolean
  uploaded_by: string | null
  uploader_name: string | null
  created_at: string
  updated_at: string
}

export interface InventoryItem {
  id: string
  item_code: string | null
  name: string
  description: string | null
  category: string
  item_type: InventoryItemType
  tracking_model: InventoryTrackingModel
  ownership_type: InventoryOwnershipType
  owner_name: string | null
  owner_member_id: string | null
  is_owner_confirmed: boolean
  post_kkn_plan: string | null
  lender_name: string | null
  lender_contact: string | null
  borrow_start_date: string | null
  borrow_due_date: string | null
  lender_notes: string | null
  funding_source: string | null
  purchase_cost: number | null
  receipt_proof_url: string | null
  item_status: InventoryItemStatus
  current_location: string
  current_holder_name: string | null
  current_holder_id: string | null
  is_qr_printed: boolean
  quantity: number
  available_quantity: number
  unit: string
  condition: InventoryCondition
  location: string | null
  acquisition_date: string | null
  source: string | null
  price: number | null
  photo_file_id: string | null
  notes: string | null
  responsible_person: string | null
  reconciliation_status: InventoryReconciliationStatus
  reconciliation_final_action: InventoryFinalAction | null
  reconciliation_notes: string | null
  reconciliation_at: string | null
  reconciliation_by: string | null
  reconciliation_receiver_name: string | null
  reconciliation_proof_url: string | null
  reconciliation_confirmed: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface InventoryHandover {
  id: string
  item_id: string
  from_holder_id: string | null
  from_holder_name: string
  to_holder_id: string | null
  to_holder_name: string
  origin_location: string
  destination_location: string
  status: InventoryHandoverStatus
  purpose: string | null
  notes: string | null
  proof_url: string | null
  requested_at: string
  confirmed_at: string | null
  created_by: string
  created_at: string
  updated_at: string
  item?: InventoryItem
}

export interface InventoryLoan {
  id: string
  item_id: string
  borrower_id: string
  quantity: number
  purpose: string
  status: InventoryLoanStatus
  borrow_date: string | null
  expected_return_date: string
  actual_return_date: string | null
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  condition_before: InventoryCondition
  condition_after: InventoryCondition | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InventoryMovement {
  id: string
  item_id: string
  movement_type: InventoryMovementType
  quantity: number
  user_id: string
  notes: string | null
  from_location?: string | null
  to_location?: string | null
  from_holder?: string | null
  to_holder?: string | null
  handover_id?: string | null
  movement_date: string
}

// Module 3: Village Surveys
export type SurveyCategory =
  | 'wilayah_dusun'
  | 'ekonomi_umkm'
  | 'potensi_desa'
  | 'kebutuhan_warga'
  | 'posyandu_agregat'
  | 'lainnya'

export type SurveyFormStatus = 'draft' | 'active' | 'closed'
export type SurveyFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'single_choice'
  | 'multiple_choice'
  | 'boolean'
  | 'long_text'
export type SurveyResponseStatus = 'draft' | 'submitted' | 'verified' | 'archived'

export interface SurveyForm {
  id: string
  title: string
  description: string | null
  category: SurveyCategory
  target_dusun: string | null
  template_key: string | null
  status: SurveyFormStatus
  created_by: string
  created_at: string
}

export interface SurveyField {
  id: string
  form_id: string
  label: string
  field_type: SurveyFieldType
  required: boolean
  options: string[]
  sort_order: number
}

export interface SurveyResponse {
  id: string
  form_id: string
  status: SurveyResponseStatus
  respondent_name: string | null
  dusun: string | null
  location_details: string | null
  submitted_by: string
  submitted_at: string
  verified_by: string | null
  verified_at: string | null
  verification_notes: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SurveyAnswer {
  id: string
  response_id: string
  field_id: string
  answer_text: string | null
  answer_json: unknown | null
}

export type ActivityDocCategory =
  | 'program_kerja'
  | 'observasi_survei'
  | 'kegiatan_desa'
  | 'sosialisasi'
  | 'lainnya'

export interface ActivityDocumentationPhoto {
  id: string
  activity_id: string
  file_id: string | null
  storage_path: string
  caption: string | null
  photographer: string | null
  sort_order: number
  is_cover: boolean
  created_at: string
}

export interface ActivityDocumentation {
  id: string
  title: string
  slug: string
  category: ActivityDocCategory
  short_description: string
  description: string
  activity_date: string
  start_time: string | null
  end_time: string | null
  location_name: string
  dusun_name: string | null
  objectives: string | null
  execution_steps: string | null
  results: string | null
  photographer_name: string | null
  cover_photo_id: string | null
  cover_photo_path: string | null
  publication_status: PublicationStatus
  published_at: string | null
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
  photos?: ActivityDocumentationPhoto[]
  photo_count?: number
}

// -------------------------------------------------------------
// Risk Register Types
// -------------------------------------------------------------
export type RiskCategory =
  | 'operasional'
  | 'keuangan'
  | 'logistik'
  | 'program_kerja'
  | 'koordinasi'
  | 'keselamatan'
  | 'administrasi'

export type RiskLikelihood = 'low' | 'medium' | 'high'
export type RiskImpact = 'low' | 'medium' | 'high'
export type RiskPriority = 'low' | 'medium' | 'high' | 'critical'
export type RiskStatus = 'identified' | 'mitigating' | 'monitoring' | 'resolved'

export interface KknRisk {
  id: string
  title: string
  description: string | null
  category: RiskCategory
  likelihood: RiskLikelihood
  impact: RiskImpact
  priority: RiskPriority
  pic_user_id: string | null
  mitigation_strategy: string | null
  target_date: string | null
  status: RiskStatus
  created_by: string | null
  created_at: string
  updated_at: string
  pic_profile?: {
    full_name: string
  }
}

// -------------------------------------------------------------
// Timeline & Roadmap Types
// -------------------------------------------------------------
export interface KknTimelineSettings {
  id: string
  title: string
  eyebrow: string
  description: string | null
  location: string | null
  university_name: string | null
  academic_year: string | null
  student_count: number
  dpl_count: number
  start_date: string | null
  end_date: string | null
  timezone: string
  hero_image_url: string | null
  is_published: boolean
  created_at: string
  updated_at: string
  updated_by: string | null
}

export type TimelineStageIconType =
  | 'preparation'
  | 'deployment'
  | 'implementation'
  | 'evaluation'
  | 'withdrawal'
  | 'custom'

export type TimelineStageComputedStatus =
  | 'upcoming'
  | 'in_progress'
  | 'awaiting_confirmation'
  | 'completed'

export interface KknTimelineStage {
  id: string
  timeline_id: string | null
  stage_number: number
  title: string
  slug: string
  start_date: string
  end_date: string
  short_description: string
  detailed_description: string | null
  objectives: string[]
  icon_type: TimelineStageIconType
  illustration_url: string | null
  sort_order: number
  confirmed_completed: boolean
  is_published: boolean
  related_program_ids: string[]
  related_event_ids: string[]
  related_doc_ids: string[]
  created_at: string
  updated_at: string
  updated_by: string | null
}




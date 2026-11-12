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

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  start_at: string
  end_at: string
  created_by: string
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

export type ReportStatus = 'draft' | 'submitted' | 'revision_requested' | 'approved'
export type ReportReviewDecision = 'approved' | 'revision_requested'
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

export interface Report {
  id: string
  title: string
  status: ReportStatus
  created_by: string
  submitted_by: string | null
  current_version_id: string | null
  created_at: string
  updated_at: string
}

export interface ReportVersion {
  id: string
  report_id: string
  version_number: number
  file_id: string | null
  submitted_by: string | null
  submitted_at: string | null
  created_at: string
}

export interface ReportReview {
  id: string
  report_version_id: string
  reviewer_id: string
  reviewer_authority?: 'dpl' | 'super_admin'
  decision: ReportReviewDecision
  comments: string | null
  reviewed_at: string
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

export type DailyLogCategory =
  | 'program_kerja'
  | 'sosialisasi'
  | 'administrasi'
  | 'koordinasi'
  | 'observasi'
  | 'piket_posko'
  | 'lainnya'

export type DailyLogVerificationStatus =
  | 'draft'
  | 'submitted'
  | 'verified'
  | 'revision_requested'

export interface DailyLog {
  id: string
  author_id: string
  log_date: string
  title: string
  content: string
  activity_category: DailyLogCategory
  work_program_id: string | null
  location: string | null
  duration_minutes: number | null
  verification_status: DailyLogVerificationStatus
  submitted_at: string | null
  verified_by: string | null
  verified_at: string | null
  verification_note: string | null
  correction_of_log_id: string | null
  correction_reason: string | null
  created_at: string
  updated_at: string
}

export type DailyLogReviewDecision = 'verified' | 'revision_requested'

export interface DailyLogReview {
  id: string
  log_id: string
  reviewer_id: string
  reviewer_authority?: 'dpl' | 'super_admin'
  decision: DailyLogReviewDecision
  note: string | null
  reviewed_at: string
}

export interface DailyLogAttachment {
  id: string
  log_id: string
  file_id: string
  uploaded_by: string
  created_at: string
  file?: FileObject | null
}

export interface DailyLogParticipant {
  id: string
  log_id: string
  user_id: string
  created_at: string
}

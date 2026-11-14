export type MaintenanceScope = 'all' | 'public' | 'workspace'

export interface MaintenanceConfig {
  id: string
  is_enabled: boolean
  scope: MaintenanceScope
  title: string
  message: string
  work_description: string | null
  start_time: string | null
  estimated_end_time: string | null
  additional_notes: string | null
  updated_at: string
  updated_by: string | null
  updated_by_name: string | null
}

import { supabase } from '@/lib/supabase'
import type { MaintenanceConfig, MaintenanceScope } from '@/types/maintenance'

export async function fetchMaintenanceConfig(): Promise<MaintenanceConfig | null> {
  const { data, error } = await supabase
    .from('system_maintenance_config')
    .select('*')
    .eq('id', 'active_config')
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch maintenance config:', error)
    return null
  }

  return data as MaintenanceConfig | null
}

export interface UpdateMaintenancePayload {
  is_enabled: boolean
  scope: MaintenanceScope
  title: string
  message: string
  work_description?: string | null
  start_time?: string | null
  estimated_end_time?: string | null
  additional_notes?: string | null
}

export async function updateMaintenanceConfig(payload: UpdateMaintenancePayload): Promise<MaintenanceConfig> {
  const { data, error } = await supabase.rpc('update_maintenance_config', {
    p_is_enabled: payload.is_enabled,
    p_scope: payload.scope,
    p_title: payload.title,
    p_message: payload.message,
    p_work_description: payload.work_description || null,
    p_start_time: payload.start_time || null,
    p_estimated_end_time: payload.estimated_end_time || null,
    p_additional_notes: payload.additional_notes || null,
  })

  if (error) {
    console.error('Failed to update maintenance config:', error)
    throw new Error(error.message || 'Gagal memperbarui status pemeliharaan sistem.')
  }

  return data as MaintenanceConfig
}

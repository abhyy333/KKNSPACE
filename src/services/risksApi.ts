import { supabase } from '@/lib/supabase'
import type {
  KknRisk,
  RiskCategory,
  RiskLikelihood,
  RiskImpact,
  RiskPriority,
  RiskStatus,
} from '@/types/database'

export interface CreateRiskInput {
  title: string
  description?: string
  category: RiskCategory
  likelihood: RiskLikelihood
  impact: RiskImpact
  priority: RiskPriority
  pic_user_id?: string | null
  mitigation_strategy?: string
  target_date?: string | null
  status?: RiskStatus
}

export interface UpdateRiskInput {
  title?: string
  description?: string
  category?: RiskCategory
  likelihood?: RiskLikelihood
  impact?: RiskImpact
  priority?: RiskPriority
  pic_user_id?: string | null
  mitigation_strategy?: string
  target_date?: string | null
  status?: RiskStatus
}

export async function fetchKknRisks(): Promise<KknRisk[]> {
  const { data, error } = await supabase
    .from('kkn_risks')
    .select('*, pic_profile:profiles(full_name)')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Gagal memuat risk register: ${error.message}`)
  }

  return (data as KknRisk[]) || []
}

export async function createKknRisk(input: CreateRiskInput): Promise<KknRisk> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sesi pengguna tidak valid.')

  const { data, error } = await supabase
    .from('kkn_risks')
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category,
      likelihood: input.likelihood,
      impact: input.impact,
      priority: input.priority,
      pic_user_id: input.pic_user_id || null,
      mitigation_strategy: input.mitigation_strategy?.trim() || null,
      target_date: input.target_date || null,
      status: input.status || 'identified',
      created_by: user.id,
    })
    .select('*, pic_profile:profiles(full_name)')
    .single()

  if (error || !data) {
    throw new Error(`Gagal mencatat risiko: ${error?.message}`)
  }

  return data as KknRisk
}

export async function updateKknRisk(id: string, input: UpdateRiskInput): Promise<KknRisk> {
  const { data, error } = await supabase
    .from('kkn_risks')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*, pic_profile:profiles(full_name)')
    .single()

  if (error || !data) {
    throw new Error(`Gagal memperbarui risiko: ${error?.message}`)
  }

  return data as KknRisk
}

export async function deleteKknRisk(id: string): Promise<void> {
  const { error } = await supabase.from('kkn_risks').delete().eq('id', id)
  if (error) {
    throw new Error(`Gagal menghapus risiko: ${error.message}`)
  }
}

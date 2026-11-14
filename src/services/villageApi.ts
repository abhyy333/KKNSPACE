import { supabase } from '@/lib/supabase'
import type {
  VillageProfileData,
  VillageDusun,
  VillageDestination,
  VillageCulturalHeritage,
  VillageEconomicPotential,
  VillageGalleryItem,
  VillageReference,
} from '@/types/village'

export async function fetchVillageProfile(): Promise<VillageProfileData | null> {
  const { data, error } = await supabase
    .from('village_profiles')
    .select('*')
    .eq('id', 'default')
    .maybeSingle()

  if (error) {
    console.error('Error fetching village profile:', error)
    return null
  }
  return data as VillageProfileData
}

export async function fetchVillageDusuns(): Promise<VillageDusun[]> {
  const { data, error } = await supabase
    .from('village_dusuns')
    .select('*')
    .eq('is_published', true)
    .order('order_index', { ascending: true })

  if (error) {
    console.error('Error fetching village dusuns:', error)
    return []
  }
  return data as VillageDusun[]
}

export async function fetchVillageDestinations(category?: string): Promise<VillageDestination[]> {
  let query = supabase
    .from('village_destinations')
    .select('*')
    .eq('is_published', true)
    .order('order_index', { ascending: true })

  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching village destinations:', error)
    return []
  }
  return data as VillageDestination[]
}

export async function fetchVillageCulturalHeritages(): Promise<VillageCulturalHeritage[]> {
  const { data, error } = await supabase
    .from('village_cultural_heritages')
    .select('*')
    .eq('is_published', true)
    .order('order_index', { ascending: true })

  if (error) {
    console.error('Error fetching village cultural heritages:', error)
    return []
  }
  return data as VillageCulturalHeritage[]
}

export async function fetchVillageEconomicPotentials(): Promise<VillageEconomicPotential[]> {
  const { data, error } = await supabase
    .from('village_economic_potentials')
    .select('*')
    .eq('is_published', true)
    .order('order_index', { ascending: true })

  if (error) {
    console.error('Error fetching village economic potentials:', error)
    return []
  }
  return data as VillageEconomicPotential[]
}

export async function fetchVillageGalleryItems(category?: string): Promise<VillageGalleryItem[]> {
  let query = supabase
    .from('village_gallery_items')
    .select('*')
    .eq('is_published', true)
    .order('order_index', { ascending: true })

  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching village gallery items:', error)
    return []
  }
  return data as VillageGalleryItem[]
}

export async function fetchVillageReferences(): Promise<VillageReference[]> {
  const { data, error } = await supabase
    .from('village_references')
    .select('*')
    .order('order_index', { ascending: true })

  if (error) {
    console.error('Error fetching village references:', error)
    return []
  }
  return data as VillageReference[]
}

// -------------------------------------------------------------
// Admin APIs (Super Admin management)
// -------------------------------------------------------------

export async function updateVillageProfile(updates: Partial<VillageProfileData>): Promise<VillageProfileData> {
  const { data, error } = await supabase
    .from('village_profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'default')
    .select()
    .single()

  if (error) throw error
  return data as VillageProfileData
}

export async function saveVillageDusun(dusun: Partial<VillageDusun> & { id?: string }): Promise<VillageDusun> {
  if (dusun.id) {
    const { data, error } = await supabase
      .from('village_dusuns')
      .update({
        ...dusun,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dusun.id)
      .select()
      .single()
    if (error) throw error
    return data as VillageDusun
  } else {
    const { data, error } = await supabase
      .from('village_dusuns')
      .insert(dusun)
      .select()
      .single()
    if (error) throw error
    return data as VillageDusun
  }
}

export async function deleteVillageDusun(id: string): Promise<void> {
  const { error } = await supabase.from('village_dusuns').delete().eq('id', id)
  if (error) throw error
}

export async function saveVillageDestination(dest: Partial<VillageDestination> & { id?: string }): Promise<VillageDestination> {
  if (dest.id) {
    const { data, error } = await supabase
      .from('village_destinations')
      .update({
        ...dest,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dest.id)
      .select()
      .single()
    if (error) throw error
    return data as VillageDestination
  } else {
    const { data, error } = await supabase
      .from('village_destinations')
      .insert(dest)
      .select()
      .single()
    if (error) throw error
    return data as VillageDestination
  }
}

export async function deleteVillageDestination(id: string): Promise<void> {
  const { error } = await supabase.from('village_destinations').delete().eq('id', id)
  if (error) throw error
}

export async function saveVillageCulturalHeritage(item: Partial<VillageCulturalHeritage> & { id?: string }): Promise<VillageCulturalHeritage> {
  if (item.id) {
    const { data, error } = await supabase
      .from('village_cultural_heritages')
      .update({
        ...item,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)
      .select()
      .single()
    if (error) throw error
    return data as VillageCulturalHeritage
  } else {
    const { data, error } = await supabase
      .from('village_cultural_heritages')
      .insert(item)
      .select()
      .single()
    if (error) throw error
    return data as VillageCulturalHeritage
  }
}

export async function deleteVillageCulturalHeritage(id: string): Promise<void> {
  const { error } = await supabase.from('village_cultural_heritages').delete().eq('id', id)
  if (error) throw error
}

export async function saveVillageGalleryItem(item: Partial<VillageGalleryItem> & { id?: string }): Promise<VillageGalleryItem> {
  if (item.id) {
    const { data, error } = await supabase
      .from('village_gallery_items')
      .update({
        ...item,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)
      .select()
      .single()
    if (error) throw error
    return data as VillageGalleryItem
  } else {
    const { data, error } = await supabase
      .from('village_gallery_items')
      .insert(item)
      .select()
      .single()
    if (error) throw error
    return data as VillageGalleryItem
  }
}

export async function deleteVillageGalleryItem(id: string): Promise<void> {
  const { error } = await supabase.from('village_gallery_items').delete().eq('id', id)
  if (error) throw error
}

export async function saveVillageReference(item: Partial<VillageReference> & { id?: string }): Promise<VillageReference> {
  if (item.id) {
    const { data, error } = await supabase
      .from('village_references')
      .update(item)
      .eq('id', item.id)
      .select()
      .single()
    if (error) throw error
    return data as VillageReference
  } else {
    const { data, error } = await supabase
      .from('village_references')
      .insert(item)
      .select()
      .single()
    if (error) throw error
    return data as VillageReference
  }
}

export async function deleteVillageReference(id: string): Promise<void> {
  const { error } = await supabase.from('village_references').delete().eq('id', id)
  if (error) throw error
}

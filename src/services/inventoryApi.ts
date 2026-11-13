import { supabase } from '@/lib/supabase'
import { uploadPrivateFile, getPrivateFileSignedUrl } from '@/services/storageApi'
import { optimizeImageFile } from '@/lib/imageOptimization'
import type {
  InventoryItem,
  InventoryLoan,
  InventoryMovement,
  InventoryCondition,
  InventoryItemType,
  InventoryTrackingModel,
  InventoryOwnershipType,
  InventoryItemStatus,
  InventoryHandover,
  InventoryReconciliationStatus,
  InventoryFinalAction,
  InventoryPhoto,
  InventoryPhotoType,
  InventoryDocumentationCategory,
} from '@/types/database'

export interface InventoryItemDetail extends InventoryItem {
  active_loans?: (InventoryLoan & {
    borrower?: {
      full_name: string
      email?: string
    }
  })[]
  handovers?: InventoryHandover[]
  movements?: (InventoryMovement & {
    user?: { full_name: string }
  })[]
  photos?: InventoryPhoto[]
}

export interface CreateInventoryItemInput {
  item_code?: string
  name: string
  description?: string
  category: string
  item_type: InventoryItemType
  tracking_model: InventoryTrackingModel
  ownership_type: InventoryOwnershipType
  owner_name?: string
  owner_member_id?: string
  is_owner_confirmed?: boolean
  post_kkn_plan?: string
  lender_name?: string
  lender_contact?: string
  borrow_start_date?: string
  borrow_due_date?: string
  lender_notes?: string
  funding_source?: string
  purchase_cost?: number
  receipt_proof_url?: string
  item_status?: InventoryItemStatus
  current_location?: string
  current_holder_name?: string
  current_holder_id?: string
  quantity: number
  unit: string
  condition?: InventoryCondition
  location?: string
  acquisition_date?: string
  source?: string
  price?: number
  photo_file_id?: string
  notes?: string
  responsible_person?: string
}

export interface UpdateInventoryItemInput extends Partial<CreateInventoryItemInput> {
  reconciliation_status?: InventoryReconciliationStatus
  reconciliation_final_action?: InventoryFinalAction
  reconciliation_notes?: string
  is_qr_printed?: boolean
}

export interface RequestLoanInput {
  item_id: string
  quantity: number
  purpose: string
  expected_return_date: string
  condition_before?: InventoryCondition
  notes?: string
}

export interface CreateHandoverInput {
  item_id: string
  to_holder_id?: string
  to_holder_name: string
  origin_location: string
  destination_location: string
  purpose?: string
  notes?: string
  proof_url?: string
}

export interface ResolveReconciliationInput {
  item_id: string
  final_action: InventoryFinalAction
  final_condition: InventoryCondition
  receiver_name: string
  notes: string
  proof_url?: string
}

export interface InventorySummaryStats {
  totalItems: number
  groupOwnedCount: number
  personalOwnedCount: number
  borrowedExternalCount: number
  donatedCount: number
  storedCount: number
  inUseCount: number
  inReturnProcessCount: number
  damagedOrLostCount: number
  totalReconciled: number
  totalPendingReconciliation: number
}

// -------------------------------------------------------------
// 1. Fetch Items with Comprehensive Multi-Dimension Filters
// -------------------------------------------------------------
export async function fetchInventoryItems(options?: {
  category?: string
  item_type?: InventoryItemType | 'all'
  ownership_type?: InventoryOwnershipType | 'all'
  tracking_model?: InventoryTrackingModel | 'all'
  item_status?: InventoryItemStatus | 'all'
  current_location?: string | 'all'
  condition?: InventoryCondition | 'all'
  reconciliation_status?: InventoryReconciliationStatus | 'all'
  owner_member_id?: string
  search?: string
}): Promise<InventoryItem[]> {
  let query = supabase
    .from('inventory_items')
    .select('*')
    .order('created_at', { ascending: false })

  if (options?.category && options.category !== 'all') {
    query = query.eq('category', options.category)
  }

  if (options?.item_type && options.item_type !== 'all') {
    query = query.eq('item_type', options.item_type)
  }

  if (options?.ownership_type && options.ownership_type !== 'all') {
    query = query.eq('ownership_type', options.ownership_type)
  }

  if (options?.tracking_model && options.tracking_model !== 'all') {
    query = query.eq('tracking_model', options.tracking_model)
  }

  if (options?.item_status && options.item_status !== 'all') {
    query = query.eq('item_status', options.item_status)
  }

  if (options?.current_location && options.current_location !== 'all') {
    query = query.eq('current_location', options.current_location)
  }

  if (options?.condition && options.condition !== 'all') {
    query = query.eq('condition', options.condition)
  }

  if (options?.reconciliation_status && options.reconciliation_status !== 'all') {
    query = query.eq('reconciliation_status', options.reconciliation_status)
  }

  if (options?.owner_member_id) {
    query = query.eq('owner_member_id', options.owner_member_id)
  }

  if (options?.search && options.search.trim()) {
    const term = options.search.trim()
    query = query.or(
      `name.ilike.%${term}%,item_code.ilike.%${term}%,owner_name.ilike.%${term}%,current_holder_name.ilike.%${term}%,current_location.ilike.%${term}%`
    )
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Gagal memuat daftar inventaris: ${error.message}`)
  }

  return (data as InventoryItem[]) || []
}

// -------------------------------------------------------------
// 2. Fetch Single Item by ID or Code with Relational Context
// -------------------------------------------------------------
export async function fetchInventoryItemById(id: string): Promise<InventoryItemDetail> {
  const { data: item, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !item) {
    throw new Error(`Barang tidak ditemukan: ${error?.message || ''}`)
  }

  const [loansRes, handoversRes, movementsRes] = await Promise.all([
    supabase
      .from('inventory_loans')
      .select('*, borrower:profiles(full_name, email)')
      .eq('item_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('inventory_handovers')
      .select('*')
      .eq('item_id', id)
      .order('requested_at', { ascending: false }),
    supabase
      .from('inventory_movements')
      .select('*, user:profiles(full_name)')
      .eq('item_id', id)
      .order('movement_date', { ascending: false }),
  ])

  return {
    ...(item as InventoryItem),
    active_loans: loansRes.data || [],
    handovers: handoversRes.data || [],
    movements: movementsRes.data || [],
  }
}

export async function fetchInventoryItemByCode(code: string): Promise<InventoryItemDetail | null> {
  const { data: item, error } = await supabase
    .from('inventory_items')
    .select('*')
    .ilike('item_code', code.trim())
    .maybeSingle()

  if (error || !item) {
    return null
  }

  return fetchInventoryItemById(item.id)
}

// -------------------------------------------------------------
// 3. Create, Update, Delete Item
// -------------------------------------------------------------
export async function createInventoryItem(input: CreateInventoryItemInput): Promise<InventoryItem> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData?.session?.user?.id

  if (!userId) {
    throw new Error('Pengguna tidak terautentikasi.')
  }

  // Generate unique code if not provided
  let generatedCode = input.item_code?.trim()
  if (!generatedCode) {
    const randomHex = Math.floor(100000 + Math.random() * 900000)
    const prefix = input.ownership_type === 'PERSONAL_OWNED' ? 'INV-PRB' : input.ownership_type === 'BORROWED_EXTERNAL' ? 'INV-EXT' : 'INV-KKN'
    generatedCode = `${prefix}-${randomHex}`
  }

  const availableQuantity = input.quantity

  const payload: any = {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    category: input.category,
    item_type: input.item_type,
    tracking_model: input.tracking_model,
    ownership_type: input.ownership_type,
    owner_name: input.owner_name?.trim() || (input.ownership_type === 'GROUP_OWNED' ? 'Kelompok KKN' : null),
    owner_member_id: input.owner_member_id || (input.ownership_type === 'PERSONAL_OWNED' ? userId : null),
    is_owner_confirmed: input.is_owner_confirmed ?? (input.ownership_type === 'PERSONAL_OWNED'),
    post_kkn_plan: input.post_kkn_plan || 'take_home',
    lender_name: input.lender_name?.trim() || null,
    lender_contact: input.lender_contact?.trim() || null,
    borrow_start_date: input.borrow_start_date || null,
    borrow_due_date: input.borrow_due_date || null,
    lender_notes: input.lender_notes?.trim() || null,
    funding_source: input.funding_source?.trim() || (input.ownership_type === 'GROUP_OWNED' ? 'Kas Kelompok KKN' : null),
    purchase_cost: input.purchase_cost ?? (input.price ?? null),
    receipt_proof_url: input.receipt_proof_url || null,
    item_status: input.item_status || 'stored',
    current_location: input.current_location || input.location || 'Posko',
    current_holder_name: input.current_holder_name?.trim() || input.responsible_person?.trim() || input.owner_name?.trim() || 'Posko KKN',
    current_holder_id: input.current_holder_id || null,
    quantity: input.quantity,
    available_quantity: availableQuantity,
    unit: input.unit || 'unit',
    condition: input.condition || 'good',
    location: input.current_location || input.location || 'Posko',
    acquisition_date: input.acquisition_date || new Date().toISOString().split('T')[0],
    source: input.source || input.ownership_type,
    price: input.price ?? (input.purchase_cost ?? null),
    photo_file_id: input.photo_file_id || null,
    notes: input.notes?.trim() || null,
    responsible_person: input.responsible_person?.trim() || input.current_holder_name?.trim() || null,
    item_code: generatedCode,
    reconciliation_status: 'pending',
    created_by: userId,
  }

  const { data, error } = await supabase
    .from('inventory_items')
    .insert([payload])
    .select()
    .single()

  if (error) {
    throw new Error(`Gagal menambahkan inventaris: ${error.message}`)
  }

  // Record initial movement log
  await supabase.from('inventory_movements').insert([
    {
      item_id: data.id,
      movement_type: 'in',
      quantity: input.quantity,
      user_id: userId,
      from_location: 'Registrasi Awal',
      to_location: data.current_location,
      from_holder: input.owner_name || 'Registrasi',
      to_holder: data.current_holder_name,
      notes: `Pencatatan awal barang: ${input.ownership_type} (${input.tracking_model})`,
    },
  ])

  return data as InventoryItem
}

export async function updateInventoryItem(
  id: string,
  input: UpdateInventoryItemInput
): Promise<InventoryItem> {
  const payload: any = {
    ...input,
    updated_at: new Date().toISOString(),
  }

  if (input.current_location) {
    payload.location = input.current_location
  }
  if (input.current_holder_name) {
    payload.responsible_person = input.current_holder_name
  }

  const { data, error } = await supabase
    .from('inventory_items')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Gagal memperbarui inventaris: ${error.message}`)
  }

  return data as InventoryItem
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Gagal menghapus inventaris: ${error.message}`)
  }
}

// -------------------------------------------------------------
// 4. Handover System (Serah Terima Antaranggota)
// -------------------------------------------------------------
export async function fetchInventoryHandovers(itemId?: string): Promise<InventoryHandover[]> {
  let query = supabase
    .from('inventory_handovers')
    .select('*, item:inventory_items(*)')
    .order('requested_at', { ascending: false })

  if (itemId) {
    query = query.eq('item_id', itemId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Gagal memuat riwayat serah terima: ${error.message}`)
  }

  return (data as InventoryHandover[]) || []
}

export async function createInventoryHandover(input: CreateHandoverInput): Promise<InventoryHandover> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData?.session?.user?.id

  if (!userId) {
    throw new Error('Pengguna tidak terautentikasi.')
  }

  // Fetch item to get current holder
  const { data: item, error: itemError } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('id', input.item_id)
    .single()

  if (itemError || !item) {
    throw new Error('Barang tidak ditemukan.')
  }

  const payload = {
    item_id: input.item_id,
    from_holder_id: item.current_holder_id || userId,
    from_holder_name: item.current_holder_name || 'Pemegang Saat Ini',
    to_holder_id: input.to_holder_id || null,
    to_holder_name: input.to_holder_name.trim(),
    origin_location: input.origin_location || item.current_location || 'Posko',
    destination_location: input.destination_location || 'Posko',
    status: 'pending',
    purpose: input.purpose?.trim() || null,
    notes: input.notes?.trim() || null,
    proof_url: input.proof_url || null,
    created_by: userId,
  }

  const { data, error } = await supabase
    .from('inventory_handovers')
    .insert([payload])
    .select()
    .single()

  if (error) {
    throw new Error(`Gagal mengajukan serah terima: ${error.message}`)
  }

  return data as InventoryHandover
}

export async function acceptInventoryHandover(handoverId: string, notes?: string): Promise<void> {
  const { error } = await supabase.rpc('accept_inventory_handover', {
    p_handover_id: handoverId,
    p_notes: notes?.trim() || null,
  })

  if (error) {
    throw new Error(`Gagal mengonfirmasi serah terima: ${error.message}`)
  }
}

export async function rejectInventoryHandover(handoverId: string, reason?: string): Promise<void> {
  const { error } = await supabase
    .from('inventory_handovers')
    .update({
      status: 'rejected',
      notes: reason ? `Ditolak: ${reason.trim()}` : 'Ditolak oleh penerima.',
      updated_at: new Date().toISOString(),
    })
    .eq('id', handoverId)

  if (error) {
    throw new Error(`Gagal menolak serah terima: ${error.message}`)
  }
}

export async function cancelInventoryHandover(handoverId: string): Promise<void> {
  const { error } = await supabase
    .from('inventory_handovers')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', handoverId)

  if (error) {
    throw new Error(`Gagal membatalkan serah terima: ${error.message}`)
  }
}

// -------------------------------------------------------------
// 5. End-of-KKN Reconciliation (Rekonsiliasi & Penutupan)
// -------------------------------------------------------------
export async function resolveItemReconciliation(input: ResolveReconciliationInput): Promise<void> {
  const { error } = await supabase.rpc('resolve_item_reconciliation', {
    p_item_id: input.item_id,
    p_final_action: input.final_action,
    p_final_condition: input.final_condition,
    p_receiver_name: input.receiver_name.trim(),
    p_notes: input.notes.trim(),
    p_proof_url: input.proof_url || null,
  })

  if (error) {
    throw new Error(`Gagal merekonsiliasi barang: ${error.message}`)
  }
}

export async function confirmItemOwnership(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('inventory_items')
    .update({
      is_owner_confirmed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)

  if (error) {
    throw new Error(`Gagal mengonfirmasi kepemilikan: ${error.message}`)
  }
}

// -------------------------------------------------------------
// 6. Loans Lifecycle (Peminjaman Posko)
// -------------------------------------------------------------
export async function fetchInventoryLoans(itemId?: string): Promise<
  (InventoryLoan & {
    item?: InventoryItem
    borrower?: {
      full_name: string
      email?: string
    }
  })[]
> {
  let query = supabase
    .from('inventory_loans')
    .select('*, item:inventory_items(*), borrower:profiles(full_name, email)')
    .order('created_at', { ascending: false })

  if (itemId) {
    query = query.eq('item_id', itemId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Gagal memuat data peminjaman: ${error.message}`)
  }

  return (data as any) || []
}

export async function requestInventoryLoan(input: RequestLoanInput): Promise<InventoryLoan> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData?.session?.user?.id

  if (!userId) {
    throw new Error('Pengguna tidak terautentikasi.')
  }

  const payload = {
    item_id: input.item_id,
    borrower_id: userId,
    quantity: input.quantity,
    purpose: input.purpose.trim(),
    expected_return_date: input.expected_return_date,
    condition_before: input.condition_before || 'good',
    notes: input.notes?.trim() || null,
    status: 'pending',
  }

  const { data, error } = await supabase
    .from('inventory_loans')
    .insert([payload])
    .select()
    .single()

  if (error) {
    throw new Error(`Gagal mengajukan peminjaman barang: ${error.message}`)
  }

  return data as InventoryLoan
}

export async function approveAndHandoutLoan(loanId: string, notes?: string): Promise<void> {
  const { error } = await supabase.rpc('approve_and_handout_inventory_loan', {
    p_loan_id: loanId,
    p_notes: notes?.trim() || null,
  })

  if (error) {
    throw new Error(`Gagal menyetujui peminjaman: ${error.message}`)
  }
}

export async function returnInventoryLoan(
  loanId: string,
  conditionAfter: InventoryCondition,
  notes?: string
): Promise<void> {
  const { error } = await supabase.rpc('return_inventory_loan', {
    p_loan_id: loanId,
    p_condition_after: conditionAfter,
    p_notes: notes?.trim() || null,
  })

  if (error) {
    throw new Error(`Gagal memproses pengembalian barang: ${error.message}`)
  }
}

export async function rejectInventoryLoan(loanId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('inventory_loans')
    .update({
      status: 'rejected',
      rejection_reason: reason.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', loanId)

  if (error) {
    throw new Error(`Gagal menolak peminjaman: ${error.message}`)
  }
}

export async function cancelInventoryLoan(loanId: string): Promise<void> {
  const { error } = await supabase
    .from('inventory_loans')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', loanId)

  if (error) {
    throw new Error(`Gagal membatalkan peminjaman: ${error.message}`)
  }
}

export async function adjustInventoryStock(
  itemId: string,
  movementType: 'in' | 'out' | 'adjustment',
  quantity: number,
  notes: string
): Promise<void> {
  const { error } = await supabase.rpc('adjust_inventory_stock', {
    p_item_id: itemId,
    p_movement_type: movementType,
    p_quantity: quantity,
    p_notes: notes.trim(),
  })

  if (error) {
    throw new Error(`Gagal menyesuaikan stok barang: ${error.message}`)
  }
}

// -------------------------------------------------------------
// 7. Movements History
// -------------------------------------------------------------
export async function fetchInventoryMovements(itemId?: string): Promise<
  (InventoryMovement & {
    user?: { full_name: string }
    item?: { name: string; item_code: string | null }
  })[]
> {
  let query = supabase
    .from('inventory_movements')
    .select('*, user:profiles(full_name), item:inventory_items(name, item_code)')
    .order('movement_date', { ascending: false })
    .limit(100)

  if (itemId) {
    query = query.eq('item_id', itemId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Gagal memuat riwayat mutasi: ${error.message}`)
  }

  return (data as any) || []
}

// -------------------------------------------------------------
// 8. Item Photo Documentation
// -------------------------------------------------------------
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_ITEM_PHOTO_BYTES = 5 * 1024 * 1024 // 5 MB

export async function fetchInventoryItemPhotos(itemId: string): Promise<InventoryPhoto[]> {
  const { data, error } = await supabase
    .from('inventory_photos')
    .select('*')
    .eq('item_id', itemId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Gagal memuat galeri foto barang: ${error.message}`)
  }

  return (data as InventoryPhoto[]) || []
}

export async function uploadInventoryItemPhoto(params: {
  itemId: string
  file: File
  photoType?: InventoryPhotoType
  documentationCategory?: InventoryDocumentationCategory
  conditionSnapshot?: InventoryCondition
  caption?: string
  documentationDate?: string
  isPrimary?: boolean
}): Promise<InventoryPhoto> {
  const { file, itemId } = params

  if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
    throw new Error('Format foto harus JPG, PNG, atau WebP.')
  }

  if (file.size <= 0 || file.size > MAX_ITEM_PHOTO_BYTES) {
    throw new Error('Ukuran foto maksimal 5 MB.')
  }

  // 1. Client-side Canvas optimization
  const optimized = await optimizeImageFile(file, 1400, 0.85)

  // 2. Upload to private storage
  const uploaded = await uploadPrivateFile(optimized, 'inventory')

  // 3. Get current user profile for uploader_name
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id || null
  let uploaderName = 'Anggota Posko'
  if (userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle()
    if (profile?.full_name) {
      uploaderName = profile.full_name
    }
  }

  // 4. Check if item has any photos yet. If none, this should be primary.
  const isPrimary = Boolean(params.isPrimary)

  // 5. Insert photo record
  const { data: photoData, error: insertErr } = await supabase
    .from('inventory_photos')
    .insert({
      item_id: itemId,
      file_id: uploaded.id,
      storage_path: uploaded.object_path,
      photo_type: params.photoType || (isPrimary ? 'primary' : 'general'),
      documentation_category: params.documentationCategory || 'kondisi_awal',
      condition_snapshot: params.conditionSnapshot || null,
      caption: params.caption?.trim() || null,
      documentation_date: params.documentationDate || new Date().toISOString().split('T')[0],
      is_primary: isPrimary,
      uploaded_by: userId,
      uploader_name: uploaderName,
    })
    .select('*')
    .single()

  if (insertErr || !photoData) {
    throw new Error(`Gagal mencatat data foto: ${insertErr?.message || 'Unknown error'}`)
  }

  // 6. If primary, sync item's primary photo via RPC
  if (isPrimary) {
    await supabase.rpc('set_inventory_primary_photo', { p_photo_id: photoData.id })
  }

  return photoData as InventoryPhoto
}

export async function setInventoryPrimaryPhoto(photoId: string): Promise<InventoryPhoto> {
  const { data, error } = await supabase.rpc('set_inventory_primary_photo', {
    p_photo_id: photoId,
  })

  if (error || !data) {
    throw new Error(`Gagal menetapkan foto utama: ${error?.message || 'Unknown error'}`)
  }

  return data as InventoryPhoto
}

export async function deleteInventoryItemPhoto(photoId: string): Promise<void> {
  const { error } = await supabase
    .from('inventory_photos')
    .delete()
    .eq('id', photoId)

  if (error) {
    throw new Error(`Gagal menghapus foto barang: ${error.message}`)
  }
}

export async function getInventoryPhotoSignedUrl(fileId: string): Promise<string | null> {
  try {
    const res = await getPrivateFileSignedUrl(fileId)
    return res.signedUrl
  } catch {
    return null
  }
}

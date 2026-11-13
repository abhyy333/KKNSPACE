import { supabase } from '@/lib/supabase'
import type {
  InventoryItem,
  InventoryLoan,
  InventoryMovement,
  InventoryCondition,
  InventoryItemType,
  InventoryLoanStatus,
} from '@/types/database'

export interface InventoryItemDetail extends InventoryItem {
  active_loans?: (InventoryLoan & {
    borrower?: {
      full_name: string
      email?: string
    }
  })[]
}

export interface CreateInventoryItemInput {
  item_code?: string
  name: string
  description?: string
  category: string
  item_type: InventoryItemType
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

export interface UpdateInventoryItemInput {
  item_code?: string
  name?: string
  description?: string
  category?: string
  item_type?: InventoryItemType
  unit?: string
  condition?: InventoryCondition
  location?: string
  acquisition_date?: string
  source?: string
  price?: number
  photo_file_id?: string
  notes?: string
  responsible_person?: string
}

export interface RequestLoanInput {
  item_id: string
  quantity: number
  purpose: string
  expected_return_date: string
  condition_before?: InventoryCondition
  notes?: string
}

export async function fetchInventoryItems(options?: {
  category?: string
  item_type?: InventoryItemType | 'all'
  condition?: InventoryCondition | 'all'
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

  if (options?.condition && options.condition !== 'all') {
    query = query.eq('condition', options.condition)
  }

  if (options?.search && options.search.trim()) {
    query = query.or(
      `name.ilike.%${options.search.trim()}%,item_code.ilike.%${options.search.trim()}%,location.ilike.%${options.search.trim()}%`
    )
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Gagal memuat daftar inventaris: ${error.message}`)
  }

  return (data as InventoryItem[]) || []
}

export async function fetchInventoryItemById(id: string): Promise<InventoryItemDetail> {
  const { data: item, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !item) {
    throw new Error(`Barang tidak ditemukan: ${error?.message}`)
  }

  // Active or pending loans
  const { data: loans } = await supabase
    .from('inventory_loans')
    .select('*, borrower:profiles(full_name)')
    .eq('item_id', id)
    .in('status', ['pending', 'approved', 'borrowed'])
    .order('created_at', { ascending: false })

  return {
    ...(item as InventoryItem),
    active_loans: (loans as InventoryItemDetail['active_loans']) || [],
  }
}

export async function createInventoryItem(input: CreateInventoryItemInput): Promise<InventoryItem> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sesi pengguna tidak valid.')

  // Generate code if empty
  const itemCode =
    input.item_code?.trim() ||
    `INV-${Date.now().toString().slice(-6)}`

  const { data, error } = await supabase
    .from('inventory_items')
    .insert({
      item_code: itemCode,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      category: input.category || 'Lainnya',
      item_type: input.item_type || 'asset',
      quantity: input.quantity,
      available_quantity: input.quantity,
      unit: input.unit.trim() || 'unit',
      condition: input.condition || 'good',
      location: input.location?.trim() || null,
      acquisition_date: input.acquisition_date || null,
      source: input.source?.trim() || null,
      price: input.price ?? null,
      photo_file_id: input.photo_file_id || null,
      notes: input.notes?.trim() || null,
      responsible_person: input.responsible_person?.trim() || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Gagal menambahkan barang: ${error?.message}`)
  }

  // Record initial movement
  await supabase.from('inventory_movements').insert({
    item_id: data.id,
    movement_type: 'in',
    quantity: input.quantity,
    user_id: user.id,
    notes: 'Pencatatan awal barang ke dalam sistem inventaris',
  })

  return data as InventoryItem
}

export async function updateInventoryItem(
  id: string,
  input: UpdateInventoryItemInput
): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('inventory_items')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Gagal memperbarui barang: ${error?.message}`)
  }

  return data as InventoryItem
}

export async function deleteInventoryItem(id: string): Promise<void> {
  // Check if any active loan exists
  const { data: activeLoans } = await supabase
    .from('inventory_loans')
    .select('id')
    .eq('item_id', id)
    .eq('status', 'borrowed')
    .limit(1)

  if (activeLoans && activeLoans.length > 0) {
    throw new Error('Barang tidak dapat dihapus karena sedang dalam status dipinjam.')
  }

  // Delete movements & loans before deleting item
  await supabase.from('inventory_loans').delete().eq('item_id', id)
  await supabase.from('inventory_movements').delete().eq('item_id', id)

  const { error } = await supabase.from('inventory_items').delete().eq('id', id)
  if (error) {
    throw new Error(`Gagal menghapus barang: ${error.message}`)
  }
}

// ----------------------------------------------------
// Loans Management
// ----------------------------------------------------

export async function fetchInventoryLoans(options?: {
  status?: InventoryLoanStatus | 'all'
  itemId?: string
  borrowerId?: string
}): Promise<
  (InventoryLoan & {
    item: InventoryItem
    borrower?: { full_name: string; email?: string }
    approver?: { full_name: string }
  })[]
> {
  let query = supabase
    .from('inventory_loans')
    .select('*, item:inventory_items(*), borrower:profiles!inventory_loans_borrower_id_fkey(full_name), approver:profiles!inventory_loans_approved_by_fkey(full_name)')
    .order('created_at', { ascending: false })

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status)
  }

  if (options?.itemId) {
    query = query.eq('item_id', options.itemId)
  }

  if (options?.borrowerId) {
    query = query.eq('borrower_id', options.borrowerId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Gagal memuat data peminjaman: ${error.message}`)
  }

  return (data as any) || []
}

export async function requestInventoryLoan(input: RequestLoanInput): Promise<InventoryLoan> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sesi pengguna tidak valid.')

  // Check item availability
  const { data: item, error: itemErr } = await supabase
    .from('inventory_items')
    .select('available_quantity, name')
    .eq('id', input.item_id)
    .single()

  if (itemErr || !item) throw new Error('Barang tidak ditemukan.')
  if (item.available_quantity < input.quantity) {
    throw new Error(
      `Stok barang "${item.name}" tidak mencukupi (Tersedia: ${item.available_quantity}, Diminta: ${input.quantity}).`
    )
  }

  const { data, error } = await supabase
    .from('inventory_loans')
    .insert({
      item_id: input.item_id,
      borrower_id: user.id,
      quantity: input.quantity,
      purpose: input.purpose.trim(),
      expected_return_date: input.expected_return_date,
      condition_before: input.condition_before || 'good',
      notes: input.notes?.trim() || null,
      status: 'pending',
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Gagal mengajukan peminjaman: ${error?.message}`)
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

import { supabase } from '@/lib/supabase'
import type {
  SurveyForm,
  SurveyField,
  SurveyResponse,
  SurveyAnswer,
  SurveyCategory,
  SurveyFieldType,
  SurveyResponseStatus,
} from '@/types/database'

export interface SurveyTemplate {
  key: string
  title: string
  category: SurveyCategory
  description: string
  fields: {
    label: string
    field_type: SurveyFieldType
    required: boolean
    options?: string[]
  }[]
}

export const DUSUN_PRINGGASELA_SELATAN = [
  'Pringgasela Lauk',
  'Pringgasela Daye',
  'Timuk Rurung',
  'Dasan Baru',
  'Gubuk Daya',
  'Montong Meje',
  'Karang Anyar',
]

export const PREDEFINED_SURVEY_TEMPLATES: SurveyTemplate[] = [
  {
    key: 'profil_dusun',
    title: 'Survei Profil Wilayah & Dusun',
    category: 'wilayah_dusun',
    description:
      'Pendataan kondisi fisik, geografis, aksesibilitas, fasilitas umum, dan jaringan di dusun.',
    fields: [
      {
        label: 'Kondisi Geografis & Topografi',
        field_type: 'single_choice',
        required: true,
        options: ['Dataran Rendah', 'Perbukitan / Lereng', 'Area Persawahan & Aliran Sungai'],
      },
      {
        label: 'Kondisi Jalan & Akses Transportasi',
        field_type: 'single_choice',
        required: true,
        options: ['Aspal Baik', 'Aspal Sebagian Rusak', 'Rabat Beton / Paving', 'Tanah / Makadam'],
      },
      {
        label: 'Fasilitas Pendidikan di Lingkungan Dusun',
        field_type: 'multiple_choice',
        required: false,
        options: ['PAUD / TK', 'SD / MI', 'SMP / MTs', 'SMA / MA', 'TPQ / Pesantren', 'Tidak Ada'],
      },
      {
        label: 'Fasilitas Kesehatan Terdekat',
        field_type: 'multiple_choice',
        required: false,
        options: ['Posyandu Dusun', 'Pustu / Polindes', 'Puskesmas Pembantu', 'Praktek Bidan / Perawat'],
      },
      {
        label: 'Ketersediaan Sarana Ibadah',
        field_type: 'multiple_choice',
        required: false,
        options: ['Masjid Utama', 'Musholla / Langgar', 'Lainnya'],
      },
      {
        label: 'Kualitas Jaringan Komunikasi & Internet',
        field_type: 'single_choice',
        required: true,
        options: ['Sangat Baik (4G Cepat)', 'Cukup Baik (4G Stabil)', 'Kurang Stabil', 'Blank Spot / Lemah'],
      },
      {
        label: 'Permasalahan Utama yang Ditemukan di Wilayah Dusun',
        field_type: 'long_text',
        required: true,
      },
      {
        label: 'Potensi Sumber Daya Lingkungan yang Menonjol',
        field_type: 'text',
        required: false,
      },
    ],
  },
  {
    key: 'potensi_umkm',
    title: 'Pendataan Potensi Ekonomi & UMKM Warga',
    category: 'ekonomi_umkm',
    description:
      'Pemetaan usaha mikro, kecil, dan menengah warga desa untuk perumusan program kerja digitalisasi dan legalitas.',
    fields: [
      {
        label: 'Nama Usaha / Usaha Dagang',
        field_type: 'text',
        required: true,
      },
      {
        label: 'Nama Pemilik Usaha (Jika Bersedia)',
        field_type: 'text',
        required: false,
      },
      {
        label: 'Kategori Sektor Usaha',
        field_type: 'single_choice',
        required: true,
        options: [
          'Kuliner / Makanan Olahan',
          'Kerajinan Tenun / Anyaman',
          'Pertanian / Perkebunan',
          'Perdagangan / Kelontong',
          'Jasa & Bengkel',
          'Peternakan / Perikanan',
          'Lainnya',
        ],
      },
      {
        label: 'Produk Unggulan atau Jasa yang Dihasilkan',
        field_type: 'text',
        required: true,
      },
      {
        label: 'Skala Usaha',
        field_type: 'single_choice',
        required: true,
        options: ['Ultra Mikro (Rumahan)', 'Mikro (Omzet < 2 Jt/Bln)', 'Kecil (Omzet 2-10 Jt/Bln)'],
      },
      {
        label: 'Metode Pemasaran Saat Ini',
        field_type: 'single_choice',
        required: true,
        options: ['Offline Lokal / Titip Warung', 'Media Sosial (WA/FB/IG)', 'Marketplace Online', 'Keduanya'],
      },
      {
        label: 'Kendala Utama yang Dihadapi Pelaku Usaha',
        field_type: 'long_text',
        required: true,
      },
      {
        label: 'Kebutuhan Pengembangan (Pelatihan, Legalitas NIB, Pemasaran)',
        field_type: 'long_text',
        required: false,
      },
      {
        label: 'Persetujuan Penggunaan Data untuk Kegiatan KKN',
        field_type: 'single_choice',
        required: true,
        options: ['Ya, Bersedia Diberikan Pendampingan KKN', 'Hanya untuk Dokumentasi Tertutup'],
      },
    ],
  },
  {
    key: 'potensi_desa',
    title: 'Survei Potensi Sumber Daya Desa',
    category: 'potensi_desa',
    description: 'Eksplorasi potensi pertanian, peternakan, pariwisata budaya, dan kerajinan lokal.',
    fields: [
      {
        label: 'Sektor Potensi Unggulan',
        field_type: 'single_choice',
        required: true,
        options: [
          'Pertanian Padi & Palawija',
          'Perkebunan Kopi / Buah-buahan',
          'Peternakan Sapi / Kambing / Unggas',
          'Kerajinan Tenun Tradisional',
          'Wisata Alam & Budaya Desa',
          'Pengolahan Pangan Lokal',
        ],
      },
      {
        label: 'Nama Komoditas / Objek Potensi',
        field_type: 'text',
        required: true,
      },
      {
        label: 'Kondisi Infrastruktur Pendukung',
        field_type: 'single_choice',
        required: true,
        options: ['Memadai', 'Kurang Memadai', 'Belum Tersedia'],
      },
      {
        label: 'Peluang Pengembangan Berkelanjutan',
        field_type: 'long_text',
        required: true,
      },
      {
        label: 'Hambatan atau Tantangan Pengembangan',
        field_type: 'long_text',
        required: true,
      },
    ],
  },
  {
    key: 'kebutuhan_warga',
    title: 'Survei Pemetaan Kebutuhan & Aspirasi Masyarakat',
    category: 'kebutuhan_warga',
    description:
      'Penjaringan aspirasi kebutuhan warga untuk sinkronisasi prioritas program kerja KKN.',
    fields: [
      {
        label: 'Kelompok Sasaran Utama',
        field_type: 'single_choice',
        required: true,
        options: ['Petani & Peternak', 'Pelaku UMKM / Pengrajin', 'Ibu Rumah Tangga', 'Pemuda / Remaja', 'Anak-Anak / Pelajar', 'Lansia'],
      },
      {
        label: 'Isu / Kebutuhan yang Diidentifikasi',
        field_type: 'long_text',
        required: true,
      },
      {
        label: 'Tingkat Urgensi Masalah',
        field_type: 'single_choice',
        required: true,
        options: ['Sangat Mendesak', 'Tinggi', 'Sedang', 'Jangka Panjang'],
      },
      {
        label: 'Rekomendasi Bentuk Kegiatan KKN',
        field_type: 'long_text',
        required: true,
      },
    ],
  },
  {
    key: 'posyandu_agregat',
    title: 'Rekapitulasi Layanan Posyandu (Agregat Non-Identifiable)',
    category: 'posyandu_agregat',
    description:
      'Pencatatan statistik agregat penimbangan balita dan ibu hamil tanpa data pribadi/rekam medis personal.',
    fields: [
      {
        label: 'Nama Posyandu Dusun',
        field_type: 'text',
        required: true,
      },
      {
        label: 'Jumlah Total Sasaran Balita Terdaftar (Jiwa)',
        field_type: 'number',
        required: true,
      },
      {
        label: 'Jumlah Balita Hadir Penimbangan (Jiwa)',
        field_type: 'number',
        required: true,
      },
      {
        label: 'Jumlah Balita Gizi Baik / Garis Hijau (Agregat Jiwa)',
        field_type: 'number',
        required: true,
      },
      {
        label: 'Jumlah Balita Berisiko Kurang Gizi / Garis Kuning (Agregat Jiwa)',
        field_type: 'number',
        required: true,
      },
      {
        label: 'Jumlah Ibu Hamil Hadir Pemeriksaan (Jiwa)',
        field_type: 'number',
        required: false,
      },
      {
        label: 'Ketersediaan & Jenis PMT yang Diberikan',
        field_type: 'text',
        required: false,
      },
      {
        label: 'Catatan & Kendala Pelayanan Kader Posyandu',
        field_type: 'long_text',
        required: false,
      },
    ],
  },
]

export interface SurveyFormDetail extends SurveyForm {
  fields: SurveyField[]
  response_count?: number
}

export interface SurveyResponseDetail extends SurveyResponse {
  form: SurveyForm
  answers: (SurveyAnswer & {
    field: SurveyField
  })[]
  submitter?: {
    full_name: string
  }
  verifier?: {
    full_name: string
  }
}

export async function fetchSurveyForms(options?: {
  category?: SurveyCategory | 'all'
  status?: string | 'all'
}): Promise<SurveyFormDetail[]> {
  let query = supabase
    .from('survey_forms')
    .select('*, fields:survey_fields(*)')
    .order('created_at', { ascending: false })

  if (options?.category && options.category !== 'all') {
    query = query.eq('category', options.category)
  }

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Gagal memuat formulir survei: ${error.message}`)
  }

  // Get response count per form
  const forms = (data as any[]) || []
  const formIds = forms.map((f) => f.id)

  if (formIds.length > 0) {
    const { data: counts } = await supabase
      .from('survey_responses')
      .select('form_id')
      .in('form_id', formIds)

    const countMap: Record<string, number> = {}
    counts?.forEach((r) => {
      countMap[r.form_id] = (countMap[r.form_id] || 0) + 1
    })

    return forms.map((f) => ({
      ...f,
      fields: (f.fields || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      response_count: countMap[f.id] || 0,
    }))
  }

  return forms
}

export async function fetchSurveyFormById(id: string): Promise<SurveyFormDetail> {
  const { data: form, error } = await supabase
    .from('survey_forms')
    .select('*, fields:survey_fields(*)')
    .eq('id', id)
    .single()

  if (error || !form) {
    throw new Error(`Formulir survei tidak ditemukan: ${error?.message}`)
  }

  return {
    ...form,
    fields: (form.fields || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
  }
}

export async function createSurveyForm(input: {
  title: string
  description?: string
  category: SurveyCategory
  target_dusun?: string
  template_key?: string
  fields: {
    label: string
    field_type: SurveyFieldType
    required: boolean
    options?: string[]
  }[]
}): Promise<SurveyForm> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sesi pengguna tidak valid.')

  const { data: form, error: formError } = await supabase
    .from('survey_forms')
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category,
      target_dusun: input.target_dusun || null,
      template_key: input.template_key || null,
      status: 'active',
      created_by: user.id,
    })
    .select()
    .single()

  if (formError || !form) {
    throw new Error(`Gagal membuat formulir survei: ${formError?.message}`)
  }

  if (input.fields && input.fields.length > 0) {
    const fieldRows = input.fields.map((f, idx) => ({
      form_id: form.id,
      label: f.label.trim(),
      field_type: f.field_type,
      required: f.required,
      options: f.options || [],
      sort_order: idx + 1,
    }))

    const { error: fieldsError } = await supabase.from('survey_fields').insert(fieldRows)
    if (fieldsError) {
      throw new Error(`Gagal menyimpan butir pertanyaan survei: ${fieldsError.message}`)
    }
  }

  return form as SurveyForm
}

export async function updateSurveyFormStatus(
  id: string,
  status: 'draft' | 'active' | 'closed'
): Promise<void> {
  const { error } = await supabase.from('survey_forms').update({ status }).eq('id', id)
  if (error) {
    throw new Error(`Gagal memperbarui status formulir: ${error.message}`)
  }
}

export async function fetchSurveyResponses(options?: {
  formId?: string
  dusun?: string
  status?: SurveyResponseStatus | 'all'
  category?: SurveyCategory | 'all'
}): Promise<SurveyResponseDetail[]> {
  let query = supabase
    .from('survey_responses')
    .select('*, form:survey_forms(*), submitter:profiles!survey_responses_submitted_by_fkey(full_name), verifier:profiles!survey_responses_verified_by_fkey(full_name)')
    .order('created_at', { ascending: false })

  if (options?.formId) {
    query = query.eq('form_id', options.formId)
  }

  if (options?.dusun && options.dusun !== 'all') {
    query = query.eq('dusun', options.dusun)
  }

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Gagal memuat hasil survei: ${error.message}`)
  }

  let results = (data as any[]) || []
  if (options?.category && options.category !== 'all') {
    results = results.filter((r) => r.form?.category === options.category)
  }

  return results
}

export async function fetchSurveyResponseById(id: string): Promise<SurveyResponseDetail> {
  const { data: response, error } = await supabase
    .from('survey_responses')
    .select('*, form:survey_forms(*), submitter:profiles!survey_responses_submitted_by_fkey(full_name), verifier:profiles!survey_responses_verified_by_fkey(full_name)')
    .eq('id', id)
    .single()

  if (error || !response) {
    throw new Error(`Data survei tidak ditemukan: ${error?.message}`)
  }

  const { data: answers } = await supabase
    .from('survey_answers')
    .select('*, field:survey_fields(*)')
    .eq('response_id', id)

  return {
    ...response,
    answers: (answers as any[]) || [],
  }
}

export async function submitSurveyResponse(input: {
  form_id: string
  dusun?: string
  respondent_name?: string
  location_details?: string
  notes?: string
  status?: SurveyResponseStatus
  answers: {
    field_id: string
    answer_text?: string | null
    answer_json?: unknown | null
  }[]
}): Promise<SurveyResponse> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sesi pengguna tidak valid.')

  const { data: response, error: respError } = await supabase
    .from('survey_responses')
    .insert({
      form_id: input.form_id,
      submitted_by: user.id,
      dusun: input.dusun || null,
      respondent_name: input.respondent_name?.trim() || null,
      location_details: input.location_details?.trim() || null,
      notes: input.notes?.trim() || null,
      status: input.status || 'submitted',
    })
    .select()
    .single()

  if (respError || !response) {
    throw new Error(`Gagal menyimpan data survei: ${respError?.message}`)
  }

  if (input.answers && input.answers.length > 0) {
    const answerRows = input.answers.map((a) => ({
      response_id: response.id,
      field_id: a.field_id,
      answer_text: a.answer_text != null ? String(a.answer_text) : null,
      answer_json: a.answer_json != null ? (a.answer_json as any) : null,
    }))

    const { error: ansError } = await supabase.from('survey_answers').insert(answerRows)
    if (ansError) {
      throw new Error(`Gagal menyimpan jawaban survei: ${ansError.message}`)
    }
  }

  return response as SurveyResponse
}

export async function verifySurveyResponse(
  responseId: string,
  verified: boolean,
  notes?: string
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sesi pengguna tidak valid.')

  const { error } = await supabase
    .from('survey_responses')
    .update({
      status: verified ? 'verified' : 'draft',
      verified_by: verified ? user.id : null,
      verified_at: verified ? new Date().toISOString() : null,
      verification_notes: notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', responseId)

  if (error) {
    throw new Error(`Gagal memverifikasi respons survei: ${error.message}`)
  }
}

export async function calculateSurveyStats(): Promise<{
  totalForms: number
  activeForms: number
  totalResponses: number
  verifiedResponses: number
  draftResponses: number
  byDusun: Record<string, number>
  byCategory: Record<string, number>
}> {
  const { data: forms } = await supabase.from('survey_forms').select('id, category, status')
  const { data: responses } = await supabase.from('survey_responses').select('id, dusun, status, form:survey_forms(category)')

  const totalForms = forms?.length || 0
  const activeForms = forms?.filter((f) => f.status === 'active').length || 0
  const totalResponses = responses?.length || 0
  const verifiedResponses = responses?.filter((r) => r.status === 'verified').length || 0
  const draftResponses = responses?.filter((r) => r.status === 'draft').length || 0

  const byDusun: Record<string, number> = {}
  const byCategory: Record<string, number> = {}

  responses?.forEach((r: any) => {
    if (r.dusun) {
      byDusun[r.dusun] = (byDusun[r.dusun] || 0) + 1
    }
    const cat = r.form?.category || 'lainnya'
    byCategory[cat] = (byCategory[cat] || 0) + 1
  })

  return {
    totalForms,
    activeForms,
    totalResponses,
    verifiedResponses,
    draftResponses,
    byDusun,
    byCategory,
  }
}

import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

export function errorResponse(message: string, status = 400, code?: string) {
  return jsonResponse({ error: message, code }, status)
}

function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function requireAuthenticatedUser(
  req: Request,
  supabaseAdmin: SupabaseClient
): Promise<User> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw { status: 401, message: 'Unauthorized: Missing or invalid Authorization header.' }
  }

  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!jwt) {
    throw { status: 401, message: 'Unauthorized: Empty bearer token.' }
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(jwt)
  if (error || !user) {
    throw { status: 401, message: 'Unauthorized: Invalid or expired session token.' }
  }

  return user
}

interface StepPayload {
  id?: string
  title: string
  description?: string
  order_index?: number
  completion_status?: boolean
}

interface AgendaInputPayload {
  title?: string
  description?: string
  category?: string
  start_at?: string
  end_at?: string
  location?: string
  responsible_division?: string
  target_audience?: string
  target_output?: string
  equipment_needed?: string[]
  steps?: StepPayload[]
}

interface RequestBody {
  action:
    | 'generate_agenda'
    | 'improve_description'
    | 'regenerate_agenda'
    | 'add_activity'
    | 'improve_activity'
    | 'simplify_activities'
    | 'expand_activities'
    | 'reorder_activities'
  prompt?: string
  current_agenda?: AgendaInputPayload
  step_context?: {
    step_title?: string
    step_description?: string
    step_index?: number
  }
}

// Fallback template generator when GEMINI_API_KEY is not configured or API fails/times out
function generateFallbackAgenda(action: string, promptText: string, current?: AgendaInputPayload) {
  const idea = (promptText || current?.title || 'Kegiatan KKN di Desa Pringgasela Selatan').trim()
  const lower = idea.toLowerCase()

  let category = current?.category || 'Umum'
  let division = current?.responsible_division || 'Acara'
  let location = current?.location || 'Posko KKN Desa Pringgasela Selatan'
  let audience = current?.target_audience || 'Warga Desa Pringgasela Selatan'
  let output = current?.target_output || 'Terlaksananya kegiatan pengabdian KKN dengan lancar dan partisipasi aktif'
  let equipment = current?.equipment_needed && current.equipment_needed.length > 0
    ? current.equipment_needed
    : ['Buku catatan & presensi', 'Kamera / Smartphone dokumentasi', 'Sound system / Mic portable', 'ATK']

  if (lower.includes('stunting') || lower.includes('posyandu') || lower.includes('kesehatan') || lower.includes('gizi')) {
    category = 'Kesehatan & Posyandu'
    division = 'Acara'
    location = 'Posyandu Dusun / Aula Kantor Desa Pringgasela Selatan'
    audience = 'Ibu balita, kader posyandu, dan ibu hamil'
    output = 'Peningkatan wawasan pencegahan stunting dan pencatatan tumbuh kembang anak'
    equipment = ['Timbangan & pita lila', 'Brosur panduan MPASI & gizi seimbang', 'Proyektor & layar', 'Kamera dokumentasi', 'Konsumsi sehat / PMT']
  } else if (lower.includes('umkm') || lower.includes('tenun') || lower.includes('pemasaran') || lower.includes('digital') || lower.includes('produk')) {
    category = 'UMKM & Ekonomi Kreatif'
    division = 'Acara'
    location = 'Sentra Pengrajin Tenun Pringgasela Selatan'
    audience = 'Pelaku UMKM dan pengrajin lokal Desa Pringgasela Selatan'
    output = 'Pelaku usaha memahami katalog digital, foto produk, dan pemasaran media sosial'
    equipment = ['Kamera & mini studio foto', 'Laptop & koneksi internet', 'Modul panduan Canva/Shopee/Instagram', 'Contoh produk UMKM']
  } else if (lower.includes('sampah') || lower.includes('lingkungan') || lower.includes('gotong royong') || lower.includes('bersih')) {
    category = 'Kerja Bakti & Lingkungan'
    division = 'Konsumsi'
    location = 'Area publik dan saluran irigasi Desa Pringgasela Selatan'
    audience = 'Pemuda karang taruna dan warga setempat'
    output = 'Lingkungan desa yang lebih bersih, asri, dan pemilahan sampah organik/anorganik'
    equipment = ['Karung sampah & kantong trash bag', 'Sapu lidi & cangkul', 'Sarung tangan pelindung', 'Air mineral & konsumsi']
  } else if (lower.includes('belajar') || lower.includes('les') || lower.includes('sekolah') || lower.includes('anak') || lower.includes('bimbingan')) {
    category = 'Pendidikan & Bimbingan'
    division = 'Acara'
    location = 'Posko KKN / SDN Desa Pringgasela Selatan'
    audience = 'Siswa-siswi SD dan anak-anak usia sekolah'
    output = 'Peningkatan minat belajar membaca, berhitung ceria, dan keterampilan kreativitas'
    equipment = ['Modul materi ajar & cerita', 'Kertas gambar & krayon/pensil warna', 'Papan tulis kecil & spidol', 'Hadiah motivasi belajar']
  } else if (lower.includes('sosialisasi') || lower.includes('penyuluhan')) {
    category = 'Sosialisasi & Edukasi'
    division = 'Humper'
    location = 'Aula Kantor Desa Pringgasela Selatan'
    audience = 'Tokoh masyarakat, perangkat desa, dan kepala dusun'
    output = 'Tersampaikannya informasi program KKN dan terjalinnya kemitraan strategis desa'
    equipment = ['Materi presentasi ppt', 'LCD Proyektor & kabel HDMI', 'Sound system kantor desa', 'Daftar hadir & lembar masukan warga']
  }

  const generatedTitle = current?.title && current.title.length > 5 ? current.title : idea
  const description = current?.description && current.description.length > 20
    ? current.description
    : `Kegiatan "${generatedTitle}" yang dilaksanakan oleh mahasiswa KKN Universitas Mataram bersama masyarakat Desa Pringgasela Selatan guna mendukung penguatan kapasitas dan kesejahteraan desa secara berkelanjutan.`

  const steps: StepPayload[] = [
    {
      order_index: 1,
      title: 'Koordinasi Awal dan Perizinan',
      description: 'Menghubungi kepala desa, kepala dusun, atau tokoh terkait untuk menyepakati waktu dan lokasi kegiatan.'
    },
    {
      order_index: 2,
      title: 'Persiapan Teknis & Logistik',
      description: `Menyiapkan perlengkapan yang dibutuhkan: ${equipment.slice(0, 3).join(', ')}, serta memastikan pembagian tugas anggota.`
    },
    {
      order_index: 3,
      title: 'Pelaksanaan Kegiatan Inti',
      description: `Membuka sesi kegiatan, penyampaian materi/pelaksanaan lapangan bersama ${audience}, dan sesi interaktif tanya jawab.`
    },
    {
      order_index: 4,
      title: 'Dokumentasi & Pengisian Absensi',
      description: 'Divisi PDD mengambil foto/video kegiatan dan mencatat daftar hadir serta respon audiens.'
    },
    {
      order_index: 5,
      title: 'Evaluasi & Beres-Beres',
      description: 'Membersihkan area kegiatan, merapikan peralatan ke Posko KKN, dan melakukan evaluasi singkat tim.'
    }
  ]

  const suggestions = [
    'Pastikan konfirmasi ke Kepala Dusun H-1 sebelum kegiatan dilaksanakan.',
    'Sediakan form presensi fisik atau digital untuk laporan berkala KKN.',
    'Koordinasikan konsumsi ringan dengan Divisi Konsumsi Posko.',
    'Dokumentasikan minimal 3 sudut: foto audiens, pemateri/tim, dan interaksi warga.'
  ]

  return {
    title: generatedTitle,
    category,
    description,
    location,
    responsible_division: division,
    target_audience: audience,
    target_output: output,
    equipment_needed: equipment,
    steps,
    optional_suggestions: suggestions
  }
}

async function callGeminiApi(
  apiKey: string,
  systemInstruction: string,
  promptText: string
): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemInstruction}\n\nUser Request / Context:\n${promptText}` }]
      }
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json'
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 20000)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    })

    if (!response.ok) {
      const errText = await response.text()
      console.warn('Gemini API non-200 response:', response.status, errText)
      throw new Error(`Gemini API returned status ${response.status}`)
    }

    const data = await response.json()
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) {
      throw new Error('Empty response content from Gemini API')
    }

    return JSON.parse(rawText)
  } finally {
    clearTimeout(timeoutId)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const caller = await requireAuthenticatedUser(req, supabaseAdmin)

    // Verify caller active profile and active membership
    const [profileRes, adminRes, membershipRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('is_active').eq('id', caller.id).maybeSingle(),
      supabaseAdmin.from('system_admins').select('user_id').eq('user_id', caller.id).maybeSingle(),
      supabaseAdmin.from('memberships').select('role, status, division').eq('user_id', caller.id).eq('status', 'active').maybeSingle()
    ])

    if (profileRes.data && profileRes.data.is_active === false) {
      return errorResponse('Akun Anda dinonaktifkan.', 403)
    }

    const isSuperAdmin = Boolean(adminRes.data)
    const isActiveMember = Boolean(membershipRes.data)

    if (!isSuperAdmin && !isActiveMember) {
      return errorResponse('Akses ditolak: Hanya anggota aktif KKN yang dapat menggunakan asisten agenda.', 403)
    }

    const body: RequestBody = await req.json().catch(() => ({}))
    const { action, prompt = '', current_agenda, step_context } = body

    if (!action) {
      return errorResponse('Action wajib disertakan.', 400)
    }

    const sanitizedPrompt = (prompt || '').slice(0, 1000)
    const apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY') || ''

    // If API key is available, attempt Gemini AI call
    if (apiKey) {
      try {
        const systemInstruction = `
Kamu adalah "AI Agenda Assistant" untuk mahasiswa KKN Universitas Mataram di Desa Pringgasela Selatan, Lombok Timur, NTB.
Tugasmu adalah membantu mahasiswa menyusun rencana agenda kegiatan yang terstruktur, realistis, dan kontekstual dengan kehidupan desa.

Kategori yang valid:
- "Sosialisasi & Edukasi"
- "Kerja Bakti & Lingkungan"
- "Kesehatan & Posyandu"
- "Pendidikan & Bimbingan"
- "UMKM & Ekonomi Kreatif"
- "Rapat & Koordinasi"
- "Umum"

Divisi yang valid:
- "Acara"
- "PDD"
- "Humper"
- "Konsumsi"
- "Ketua"
- "Sekretaris"
- "Bendahara"

Action yang diminta: "${action}".

Output HARUS SELALU berformat JSON murni dengan skema berikut:
{
  "title": string (Judul agenda yang profesional dan jelas),
  "category": string (Salah satu dari kategori yang valid),
  "description": string (Deskripsi operasional lengkap 2-4 kalimat mencakup latar belakang, tujuan, dan metode),
  "location": string (Lokasi spesifik di Desa Pringgasela Selatan),
  "responsible_division": string (Salah satu divisi yang valid),
  "target_audience": string (Sasaran kegiatan yang dituju),
  "target_output": string (Target capaian atau hasil nyata yang terukur),
  "equipment_needed": string[] (Daftar peralatan/logistik yang diperlukan),
  "steps": [
    {
      "order_index": number (mulai dari 1),
      "title": string (Judul langkah tahapan kegiatan),
      "description": string (Penjelasan teknis langkah tersebut)
    }
  ],
  "optional_suggestions": string[] (3-5 tips praktis atau mitigasi risiko)
}
`
        let promptContent = `Aksi: ${action}\nInput Ide / Arahan: ${sanitizedPrompt || 'Rencanakan agenda kegiatan KKN yang bermanfaat'}`
        if (current_agenda) {
          promptContent += `\nAgenda Saat Ini:\n${JSON.stringify(current_agenda, null, 2)}`
        }
        if (step_context) {
          promptContent += `\nKonteks Tahapan Spesifik:\n${JSON.stringify(step_context, null, 2)}`
        }

        const aiResult = await callGeminiApi(apiKey, systemInstruction, promptContent)

        if (aiResult && aiResult.title && Array.isArray(aiResult.steps)) {
          return jsonResponse({
            success: true,
            source: 'gemini_ai',
            data: aiResult
          })
        }
      } catch (geminiError: any) {
        console.warn('Gemini AI failed, using intelligent template engine fallback:', geminiError?.message || geminiError)
      }
    }

    // Fallback template engine
    const fallbackData = generateFallbackAgenda(action, sanitizedPrompt, current_agenda)
    return jsonResponse({
      success: true,
      source: 'template_engine',
      data: fallbackData,
      note: apiKey ? 'AI sedang sibuk, saran dibuat menggunakan mesin template cerdas KKN SPACE.' : 'Asisten agenda berjalan dalam mode template standar KKN SPACE.'
    })
  } catch (err: any) {
    console.error('ai-agenda-assistant error:', err)
    return errorResponse(err?.message || 'Internal server error', err?.status || 500)
  }
})

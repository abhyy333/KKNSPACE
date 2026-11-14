import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { fetchGroupSettings } from '@/services/dashboardApi'
import { fetchTeamDirectory } from '@/services/membersApi'
import { fetchProgramsBundle } from '@/services/programsApi'
import { fetchFinanceLedgerData } from '@/services/financeApi'
import { fetchInventoryItems } from '@/services/inventoryApi'
import { fetchSurveyResponses } from '@/services/surveysApi'
import { computeFinanceSummaryAndRecap, formatRupiah } from '@/lib/finance'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BrandLogo } from '@/components/brand/BrandLogo'
import {
  Printer,
  Award,
  Users,
  Wallet,
  Package,
  ClipboardList,
  Sparkles,
  ArrowLeft,
} from 'lucide-react'

export const FinalReportPage: React.FC = () => {
  // 1. Group settings
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ['workspace', 'group-settings'],
    queryFn: fetchGroupSettings,
  })

  // 2. Team directory (Official 11 Members: 10 students + 1 DPL)
  const { data: teamDirectory = [], isLoading: loadingDirectory } = useQuery({
    queryKey: ['workspace', 'team-directory'],
    queryFn: fetchTeamDirectory,
  })

  // 3. Work programs & tasks
  const { data: programsBundle, isLoading: loadingPrograms } = useQuery({
    queryKey: ['programs-bundle'],
    queryFn: fetchProgramsBundle,
  })

  // 4. Finance Ledger
  const { data: financeLedger, isLoading: loadingFinance } = useQuery({
    queryKey: ['finance-ledger'],
    queryFn: fetchFinanceLedgerData,
  })

  // 5. Inventory
  const { data: inventoryItems = [], isLoading: loadingInventory } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => fetchInventoryItems(),
  })

  // 6. Surveys
  const { data: surveyResponses = [], isLoading: loadingSurveys } = useQuery({
    queryKey: ['survey-responses-all'],
    queryFn: () => fetchSurveyResponses({}),
  })

  // 7. Activity Documentations
  const { data: documentations = [], isLoading: loadingDocs } = useQuery({
    queryKey: ['activity-docs-report'],
    queryFn: async () => {
      const { data } = await supabase
        .from('activity_documentations')
        .select('id, title, activity_date, location_name, description')
        .order('activity_date', { ascending: false })
        .limit(6)
      return (data || []).map((d) => ({
        id: d.id,
        title: d.title,
        event_date: d.activity_date,
        location: d.location_name,
        description: d.description,
      }))
    },
  })

  const isLoading =
    loadingSettings ||
    loadingDirectory ||
    loadingPrograms ||
    loadingFinance ||
    loadingInventory ||
    loadingSurveys ||
    loadingDocs

  // Calculated Stats
  const activeMembers = useMemo(() => teamDirectory.filter((m) => m.is_active), [teamDirectory])
  const dplMember = useMemo(() => activeMembers.find((m) => m.role === 'dpl'), [activeMembers])
  const studentMembers = useMemo(() => activeMembers.filter((m) => m.role !== 'dpl'), [activeMembers])

  const programs = programsBundle?.programs ?? []
  const completedPrograms = useMemo(() => programs.filter((p) => p.status === 'completed'), [programs])

  const financeSummary = useMemo(() => {
    return computeFinanceSummaryAndRecap(
      financeLedger?.transactions ?? [],
      financeLedger?.categories ?? []
    )
  }, [financeLedger])

  const groupOwnedInventory = useMemo(
    () => inventoryItems.filter((i) => i.ownership_type === 'GROUP_OWNED'),
    [inventoryItems]
  )
  const personalInventory = useMemo(
    () => inventoryItems.filter((i) => i.ownership_type === 'PERSONAL_OWNED'),
    [inventoryItems]
  )

  const verifiedSurveys = useMemo(
    () => surveyResponses.filter((s) => s.status === 'verified'),
    [surveyResponses]
  )

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Action Bar (Hidden during print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/workspace"
              className="text-xs text-sage-800 hover:text-sage-900 inline-flex items-center gap-1 font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Kembali ke Workspace</span>
            </Link>
            <span className="text-charcoal-muted">·</span>
            <Badge variant="outline" className="border-sage-400 text-sage-800 bg-sage-50 text-[10px]">
              Dokumen Resmi KKN
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal mt-1">
            Laporan Rekapitulasi &amp; Akhir KKN
          </h1>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Rangkuman terpadu seluruh kegiatan, program kerja, keuangan, inventaris posko, dan survei lapangan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handlePrint}
            className="text-xs gap-1.5 bg-sage-700 hover:bg-sage-800 text-white shadow-subtle"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Cetak / Simpan PDF</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        /* Printable Report Document Sheet */
        <div className="bg-white rounded-xl border border-warm-300 print:border-none print:shadow-none shadow-xs p-6 sm:p-10 space-y-10 max-w-5xl mx-auto print:p-0">
          {/* 1. Header & Cover Identitas */}
          <div className="border-b-2 border-sage-800 pb-8 text-center space-y-3">
            <div className="flex justify-center mb-2">
              <BrandLogo className="h-14 w-auto" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal tracking-tight uppercase">
              Laporan Pertanggungjawaban &amp; Realisasi Program
            </h2>
            <h3 className="text-lg font-serif font-semibold text-sage-800">
              Kuliah Kerja Nyata (KKN) Pemberdayaan Masyarakat
            </h3>
            <p className="text-sm font-medium text-charcoal">
              Desa Pringgasela Selatan · Kecamatan Pringgasela · Kabupaten Lombok Timur · NTB
            </p>
            <p className="text-xs text-charcoal-muted pt-1">
              Universitas Mataram · Periode KKN:{' '}
              {settings?.period_start ? new Date(settings.period_start).toLocaleDateString('id-ID') : '2026'} s.d.{' '}
              {settings?.period_end ? new Date(settings.period_end).toLocaleDateString('id-ID') : '2026'}
            </p>
          </div>

          {/* 2. Ringkasan Eksekutif Metrik Kunci */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-lg border border-warm-200 bg-warm-50/50 space-y-1">
              <p className="text-[11px] font-semibold text-charcoal-muted uppercase">Total Anggota Sah</p>
              <p className="text-2xl font-serif font-bold text-charcoal">{activeMembers.length} Orang</p>
              <p className="text-[10px] text-charcoal-muted">10 Mahasiswa + 1 DPL</p>
            </div>
            <div className="p-4 rounded-lg border border-warm-200 bg-warm-50/50 space-y-1">
              <p className="text-[11px] font-semibold text-charcoal-muted uppercase">Program Kerja</p>
              <p className="text-2xl font-serif font-bold text-emerald-700">{completedPrograms.length} / {programs.length}</p>
              <p className="text-[10px] text-charcoal-muted">{completedPrograms.length} Berhasil Terlaksana</p>
            </div>
            <div className="p-4 rounded-lg border border-warm-200 bg-warm-50/50 space-y-1">
              <p className="text-[11px] font-semibold text-charcoal-muted uppercase">Saldo Kas Akhir</p>
              <p className="text-2xl font-serif font-bold text-charcoal">{formatRupiah(financeSummary.cashBalance)}</p>
              <p className="text-[10px] text-charcoal-muted">{financeSummary.allTimeTotalCount} Transaksi Ledger</p>
            </div>
            <div className="p-4 rounded-lg border border-warm-200 bg-warm-50/50 space-y-1">
              <p className="text-[11px] font-semibold text-charcoal-muted uppercase">Survei Lapangan</p>
              <p className="text-2xl font-serif font-bold text-sage-800">{verifiedSurveys.length} Data</p>
              <p className="text-[10px] text-charcoal-muted">Terverifikasi di 7 Dusun</p>
            </div>
          </div>

          {/* 3. Struktur Organisasi Tim Posko (11 Orang) */}
          <div className="space-y-4">
            <div className="border-b border-warm-200 pb-2 flex items-center justify-between">
              <h4 className="font-serif font-semibold text-base text-charcoal flex items-center gap-2">
                <Users className="h-4 w-4 text-sage-800" />
                <span>I. Susunan Personalia Tim Posko KKN (11 Orang)</span>
              </h4>
              <span className="text-xs text-charcoal-muted">Data Resmi Universitas Mataram</span>
            </div>

            {dplMember && (
              <div className="p-3.5 rounded-lg border border-sage-300 bg-sage-50/60 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold text-sage-800 uppercase tracking-wider block">Dosen Pembimbing Lapangan (DPL)</span>
                  <p className="font-semibold text-charcoal text-sm">{dplMember.full_name}</p>
                  <p className="text-charcoal-muted">NIP/Identitas: {dplMember.identity_number} · Program: {dplMember.study_program}</p>
                </div>
                <Badge variant="outline" className="border-sage-400 text-sage-800 bg-white">Pembimbing</Badge>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-warm-200">
                <thead>
                  <tr className="bg-warm-100 text-charcoal font-semibold border-b border-warm-200">
                    <th className="p-2.5 w-10 text-center">No</th>
                    <th className="p-2.5">Nama Mahasiswa</th>
                    <th className="p-2.5">NIM</th>
                    <th className="p-2.5">Program Studi</th>
                    <th className="p-2.5">Jabatan / Peran Posko</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200">
                  {studentMembers.map((m, idx) => (
                    <tr key={m.id} className="hover:bg-warm-50/60">
                      <td className="p-2.5 text-center text-charcoal-muted">{idx + 1}</td>
                      <td className="p-2.5 font-medium text-charcoal">{m.full_name}</td>
                      <td className="p-2.5 font-mono text-charcoal-muted">{m.identity_number}</td>
                      <td className="p-2.5 text-charcoal-muted">{m.study_program}</td>
                      <td className="p-2.5 font-medium text-sage-800">{m.position_label || m.role.toUpperCase()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Realisasi Program Kerja */}
          <div className="space-y-4">
            <div className="border-b border-warm-200 pb-2 flex items-center justify-between">
              <h4 className="font-serif font-semibold text-base text-charcoal flex items-center gap-2">
                <Award className="h-4 w-4 text-sage-800" />
                <span>II. Realisasi &amp; Pencapaian Program Kerja</span>
              </h4>
              <span className="text-xs text-charcoal-muted">{programs.length} Program Terdaftar</span>
            </div>

            {programs.length === 0 ? (
              <p className="text-xs text-charcoal-muted italic">Belum ada program kerja tercatat.</p>
            ) : (
              <div className="space-y-3">
                {programs.map((p, idx) => (
                  <div key={p.id} className="p-4 rounded-lg border border-warm-200 bg-white space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-semibold text-charcoal text-sm">
                          {idx + 1}. {p.title}
                        </span>
                        <p className="text-charcoal-muted text-[11px] mt-0.5">
                          Status Publikasi: <strong className="text-charcoal">{p.publication_status === 'published' ? 'Terpublikasi di Portal Publik' : 'Internal Posko'}</strong>
                        </p>
                      </div>
                      <Badge
                        variant={p.status === 'completed' ? 'success' : p.status === 'ongoing' ? 'secondary' : 'warning'}
                      >
                        {p.status === 'completed' ? 'Selesai' : p.status === 'ongoing' ? 'Berjalan' : 'Rencana'}
                      </Badge>
                    </div>
                    {p.description && <p className="text-charcoal-muted leading-relaxed">{p.description}</p>}
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-charcoal-muted border-t border-warm-100">
                      <span>Jadwal Pelaksanaan: {p.start_date || '-'} s.d. {p.end_date || '-'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. Rekapitulasi Keuangan Posko */}
          <div className="space-y-4">
            <div className="border-b border-warm-200 pb-2 flex items-center justify-between">
              <h4 className="font-serif font-semibold text-base text-charcoal flex items-center gap-2">
                <Wallet className="h-4 w-4 text-sage-800" />
                <span>III. Rekapitulasi Arus Kas &amp; Keuangan Posko</span>
              </h4>
              <span className="text-xs text-charcoal-muted">Pencatatan Berkelanjutan</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 rounded-lg border border-warm-200 bg-warm-50">
                <p className="text-charcoal-muted">Total Pemasukan</p>
                <p className="text-lg font-bold text-emerald-700 mt-0.5">{formatRupiah(financeSummary.allTimeIncome)}</p>
              </div>
              <div className="p-3 rounded-lg border border-warm-200 bg-warm-50">
                <p className="text-charcoal-muted">Total Pengeluaran</p>
                <p className="text-lg font-bold text-rose-700 mt-0.5">{formatRupiah(financeSummary.allTimeExpense)}</p>
              </div>
              <div className="p-3 rounded-lg border border-warm-200 bg-warm-50">
                <p className="text-charcoal-muted">Saldo Kas Akhir</p>
                <p className="text-lg font-bold text-charcoal mt-0.5">{formatRupiah(financeSummary.cashBalance)}</p>
              </div>
            </div>
          </div>

          {/* 6. Rekonsiliasi Inventaris & Logistik */}
          <div className="space-y-4">
            <div className="border-b border-warm-200 pb-2 flex items-center justify-between">
              <h4 className="font-serif font-semibold text-base text-charcoal flex items-center gap-2">
                <Package className="h-4 w-4 text-sage-800" />
                <span>IV. Status Rekonsiliasi Inventaris Posko</span>
              </h4>
              <span className="text-xs text-charcoal-muted">{inventoryItems.length} Aset Tercatat</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-lg border border-warm-200 bg-white space-y-1">
                <p className="font-semibold text-charcoal">Barang Milik Kelompok (Kas KKN)</p>
                <p className="text-2xl font-bold text-emerald-700">{groupOwnedInventory.length} Barang</p>
                <p className="text-charcoal-muted text-[11px]">Aset tetap posko dan perlengkapan kegiatan.</p>
              </div>
              <div className="p-3.5 rounded-lg border border-warm-200 bg-white space-y-1">
                <p className="font-semibold text-charcoal">Barang Pribadi Anggota</p>
                <p className="text-2xl font-bold text-blue-700">{personalInventory.length} Barang</p>
                <p className="text-charcoal-muted text-[11px]">Terdaftar untuk memastikan kepemilikan dan pengembalian.</p>
              </div>
            </div>
          </div>

          {/* 7. Hasil Survei & Pendataan Lapangan */}
          <div className="space-y-4">
            <div className="border-b border-warm-200 pb-2 flex items-center justify-between">
              <h4 className="font-serif font-semibold text-base text-charcoal flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-sage-800" />
                <span>V. Temuan Survei Lapangan 7 Wilayah Dusun</span>
              </h4>
              <span className="text-xs text-charcoal-muted">{surveyResponses.length} Data Dikumpulkan</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {['Dasan Baru', 'Gubuk Bagek', 'Montong Melem', 'Pringgasela Selatan Indah', 'Pringgasela Selatan', 'Rempung Indah', 'Timuk Gawah'].map((dusun) => {
                const count = surveyResponses.filter((s) => s.dusun === dusun).length
                return (
                  <div key={dusun} className="p-2.5 rounded border border-warm-200 bg-warm-50 text-center">
                    <p className="font-semibold text-charcoal text-[11px] truncate">{dusun}</p>
                    <p className="text-charcoal-muted text-[10px] mt-0.5">{count} hasil survei</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 8. Dokumentasi Kegiatan Utama */}
          <div className="space-y-4">
            <div className="border-b border-warm-200 pb-2 flex items-center justify-between">
              <h4 className="font-serif font-semibold text-base text-charcoal flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-sage-800" />
                <span>VI. Arsip Dokumentasi Kegiatan Utama</span>
              </h4>
              <span className="text-xs text-charcoal-muted">Dokumentasi Terpublikasi</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {documentations.map((doc) => (
                <div key={doc.id} className="p-3 rounded-lg border border-warm-200 bg-warm-50/50 space-y-1 text-xs">
                  <p className="font-semibold text-charcoal line-clamp-1">{doc.title}</p>
                  <p className="text-[10px] text-charcoal-muted">
                    {doc.event_date ? new Date(doc.event_date).toLocaleDateString('id-ID') : '-'} · {doc.location || 'Desa Pringgasela Selatan'}
                  </p>
                  {doc.description && <p className="text-charcoal-muted line-clamp-2 text-[11px]">{doc.description}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* 9. Lembar Pengesahan */}
          <div className="pt-8 border-t-2 border-warm-300 space-y-6 text-xs text-charcoal">
            <p className="text-center italic text-charcoal-muted">
              Demikian laporan pertanggungjawaban ini disusun dengan sebenar-benarnya berdasarkan data operasional aktual KKN Universitas Mataram di Desa Pringgasela Selatan.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-center pt-4">
              <div className="space-y-14">
                <p>Ketua Kelompok KKN</p>
                <div>
                  <p className="font-semibold underline">
                    {studentMembers.find((m) => m.role === 'ketua')?.full_name || 'Josua Ujung'}
                  </p>
                  <p className="text-[10px] text-charcoal-muted">
                    NIM. {studentMembers.find((m) => m.role === 'ketua')?.identity_number || 'C1N02310035'}
                  </p>
                </div>
              </div>

              <div className="space-y-14">
                <p>Sekretaris Kelompok</p>
                <div>
                  <p className="font-semibold underline">
                    {studentMembers.find((m) => m.role === 'sekretaris')?.full_name || 'Dini Aminarti'}
                  </p>
                  <p className="text-[10px] text-charcoal-muted">
                    NIM. {studentMembers.find((m) => m.role === 'sekretaris')?.identity_number || 'B1D02310013'}
                  </p>
                </div>
              </div>

              <div className="space-y-14 col-span-2 sm:col-span-1">
                <p>Dosen Pembimbing Lapangan</p>
                <div>
                  <p className="font-semibold underline">{dplMember?.full_name || 'Lalu Muhammad Aby Dujana, M.Si.'}</p>
                  <p className="text-[10px] text-charcoal-muted">
                    NIP. {dplMember?.identity_number || '198910222024061001'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

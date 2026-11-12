import { ModulePlaceholder } from './ModulePlaceholder'

// Future operational modules
export const MeetingsPage = () => (
  <ModulePlaceholder
    title="Rapat & Notulensi"
    subtitle="Agenda musyawarah kelompok, daftar hadir anggota, notulensi resmi sekretaris, dan keputusan rapat."
    category="Program & Kegiatan"
    phaseNumber={4}
  />
)

export const InventoryPage = () => (
  <ModulePlaceholder
    title="Inventaris & Logistik Posko"
    subtitle="Pencatatan aset posko, alat peraga penyuluhan, ATK kelompok, dan status peminjaman barang."
    category="Operasional Lapangan"
    phaseNumber={5}
  />
)

export const SurveysPage = () => (
  <ModulePlaceholder
    title="Survei & Pendataan Warga Desa"
    subtitle="Formulir survei lapangan dusun, pendataan profil UMKM, dan kuesioner stunting posyandu."
    category="Operasional Lapangan"
    phaseNumber={5}
  />
)

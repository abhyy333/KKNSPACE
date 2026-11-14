import React from 'react'
import {
  History,
  Scroll,
  Landmark,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VillageSubnav } from '@/components/village/VillageSubnav'

export const VillageHistoryPage: React.FC = () => {

  const timelineSteps = [
    {
      year: 'Pra-2010',
      title: 'Wilayah Bagian Selatan Desa Pringgasela Induk',
      desc: 'Kawasan selatan Pringgasela dihuni oleh masyarakat agraris dan pengrajin tenun songket gedogan. Keberagaman penduduk telah terbentuk dari interaksi keluarga Trah Pringgasela dengan perantau Trah Rempung/Sumbawa dan komunitas perbatasan Masbagik.',
      badge: 'Latar Belakang',
    },
    {
      year: '15 November 2010',
      title: 'Peresmian Status Desa Persiapan',
      desc: 'Pemerintah Kabupaten Lombok Timur menetapkan pembentukan Desa Persiapan Pringgasela Selatan melalui Peraturan Bupati Lombok Timur Nomor 40 Tahun 2010 guna meningkatkan kualitas pelayanan publik dan pemerataan pembangunan di koridor selatan.',
      badge: 'Perbup No. 40/2010',
    },
    {
      year: '25 November 2011',
      title: 'Pengesahan Status Desa Definitif',
      desc: 'Setelah memenuhi seluruh indikator kelayakan tata kelola dan kesiapan wilayah, Desa Pringgasela Selatan resmi disahkan sebagai Desa Definitif melalui Peraturan Bupati Lombok Timur Nomor 7 Tahun 2011, terbagi ke dalam 7 dusun kewilayahan.',
      badge: 'Perbup No. 7/2011',
    },
    {
      year: '2011 — Sekarang',
      title: 'Pembangunan Kemandirian Desa & Prestasi Budaya',
      desc: 'Di bawah kepemimpinan Kepala Desa Baihaki Habil, desa memperkuat identitas budaya dan pariwisata. Pada tahun 2022, Pringgasela Selatan berhasil masuk nominasi 10 Besar Desa Budaya Unggulan Tingkat Nasional Kemendikbudristek RI dan terdaftar di Jadesta Kemenpar (#63548).',
      badge: 'Era Kemandirian',
    },
  ]

  return (
    <div className="min-h-screen bg-warm-100/60 pb-20">
      <VillageSubnav />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-8 space-y-12">
        {/* Header Section */}
        <div className="border-b border-warm-300 pb-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
            <History className="h-4 w-4" />
            <span>Rekam Jejak Historis & Dinamika Sosial</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-charcoal">
            Sejarah Pembentukan & Keberagaman Tiga Trah
          </h1>
          <p className="text-sm text-charcoal-muted max-w-3xl leading-relaxed">
            Menelusuri proses pemekaran Desa Pringgasela Selatan dari desa induk, dasar hukum resmi
            Pemerintah Kabupaten Lombok Timur, serta jejak keharmonisan kultural tiga trah masyarakat.
          </p>
        </div>

        {/* Narrative Card */}
        <Card className="border-warm-300 bg-white shadow-sm overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-sage-700 via-amber-600 to-sage-800" />
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-2">
              <Scroll className="h-5 w-5 text-amber-700" />
              <h2 className="text-xl font-serif font-bold text-charcoal">
                Dinamika Pemekaran Desa
              </h2>
            </div>

            <div className="prose prose-sage max-w-none text-charcoal text-xs sm:text-sm leading-relaxed space-y-4">
              <p>
                Sebelum tahun 2010, seluruh wilayah yang kini menjadi Desa Pringgasela Selatan
                merupakan bagian integral dari <strong>Desa Pringgasela</strong> (desa induk),
                sebuah desa tua di Lombok Timur yang memiliki reputasi panjang sebagai episentrum
                peradaban tenun tradisional Sasak.
              </p>
              <p>
                Seiring pertumbuhan penduduk dan kebutuhan percepatan pemerataan layanan
                administrasi serta pembangunan infrastruktur pertanian, para tokoh masyarakat
                bersama Pemerintah Desa Pringgasela dan Pemerintah Kecamatan mengusulkan pemekaran
                wilayah bagian selatan.
              </p>
              <p>
                Aspirasi tersebut disambut oleh Pemerintah Kabupaten Lombok Timur dengan diterbitkannya{' '}
                <strong>Peraturan Bupati Lombok Timur Nomor 40 Tahun 2010</strong> pada tanggal{' '}
                <strong>15 November 2010</strong> tentang pembentukan Desa Persiapan Pringgasela
                Selatan. Masa persiapan ini menjadi fase penataan batas wilayah, pembagian dusun,
                serta pembenahan sarana kantor pelayanan publik.
              </p>
              <p>
                Tepat satu tahun berselang, pada tanggal <strong>25 November 2011</strong>, status
                desa ditingkatkan secara resmi menjadi desa definitif melalui{' '}
                <strong>Peraturan Bupati Lombok Timur Nomor 7 Tahun 2011</strong>. Di bawah
                kepemimpinan Kepala Desa <strong>Baihaki Habil</strong>, desa ini berkembang menjadi
                desa mandiri yang mempertahankan akar kebudayaan lokal sekaligus aktif dalam inovasi
                ekonomi kreatif dan pariwisata rintisan.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Timeline Pembentukan */}
        <section className="space-y-6">
          <div className="border-b border-warm-300 pb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sage-700">
              Kronologi Administrasi
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-charcoal">
              Tonggak Sejarah Pembentukan Desa
            </h2>
          </div>

          <div className="relative border-l-2 border-sage-300 ml-4 pl-6 sm:ml-8 sm:pl-8 space-y-8">
            {timelineSteps.map((step, idx) => (
              <div key={idx} className="relative group">
                {/* Dot Marker */}
                <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full bg-sage-700 border-4 border-warm-100 group-hover:scale-125 transition-transform" />

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-sage-800 font-serif">
                      {step.year}
                    </span>
                    <Badge className="bg-sage-100 text-sage-800 border-sage-300 text-[10px]">
                      {step.badge}
                    </Badge>
                  </div>
                  <h3 className="text-base sm:text-lg font-serif font-bold text-charcoal">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-charcoal-muted leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Keberagaman Tiga Trah Historis */}
        <section className="space-y-6">
          <div className="border-b border-warm-300 pb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
              Eksplorasi Sosiokultural
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-charcoal">
              Keberagaman Tiga Trah: Fondasi Sosial Masyarakat
            </h2>
            <p className="text-xs text-charcoal-muted mt-1">
              Data resmi Jejaring Desa Wisata (Jadesta Kemenpar) mencatat bahwa masyarakat
              Pringgasela Selatan tersusun dari perpaduan tiga trah suku dengan latar budaya yang
              saling melengkapi:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Trah 1 */}
            <Card className="border-warm-300 bg-white shadow-sm flex flex-col justify-between">
              <CardContent className="p-6 space-y-3">
                <Badge className="bg-sage-100 text-sage-800 border-sage-300 text-xs font-serif font-bold">
                  1. Trah Pringgasela (Tanaq Gadang)
                </Badge>
                <h4 className="text-base font-serif font-bold text-charcoal">
                  Pewaris Kriya Tenun Gedogan
                </h4>
                <p className="text-xs text-charcoal leading-relaxed">
                  Menghubungkan tali kekerabatan masyarakat dengan desa induk di sisi utara. Komunitas
                  ini memegang teguh kearifan tenun songket gedogan di Dusun Gubuk Lauk, menjunjung
                  tinggi adat Sasak, serta memelihara nilai-nilai persaudaraan luhur antargenerasi.
                </p>
              </CardContent>
              <div className="p-4 pt-0 border-t border-warm-100 text-[11px] text-charcoal-muted">
                Sentra Konsentrasi: Dusun Gubuk Lauk
              </div>
            </Card>

            {/* Trah 2 */}
            <Card className="border-warm-300 bg-white shadow-sm flex flex-col justify-between">
              <CardContent className="p-6 space-y-3">
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-xs font-serif font-bold">
                  2. Trah Rempung / Sumbawa
                </Badge>
                <h4 className="text-base font-serif font-bold text-charcoal">
                  Jejak Dakwah & Ketangguhan Agraris
                </h4>
                <p className="text-xs text-charcoal leading-relaxed">
                  Berakar dari sejarah perantauan para pendahulu dari Tanah Samawa (Pulau Sumbawa)
                  yang bermukim di wilayah selatan berbatasan dengan Desa Rempung. Komunitas ini
                  memiliki etos agraris yang gigih, tradisi gotong royong, serta penghormatan
                  mendalam kepada tokoh ulama pejuang dakwah TGH. Muhammad Toyyib.
                </p>
              </CardContent>
              <div className="p-4 pt-0 border-t border-warm-100 text-[11px] text-charcoal-muted">
                Sentra Konsentrasi: Dusun Gubuk Rempung
              </div>
            </Card>

            {/* Trah 3 */}
            <Card className="border-warm-300 bg-white shadow-sm flex flex-col justify-between">
              <CardContent className="p-6 space-y-3">
                <Badge className="bg-blue-100 text-blue-900 border-blue-300 text-xs font-serif font-bold">
                  3. Trah Masbagik
                </Badge>
                <h4 className="text-base font-serif font-bold text-charcoal">
                  Dinamika Niaga & Seni Kriya
                </h4>
                <p className="text-xs text-charcoal leading-relaxed">
                  Terhubung secara historis dengan kawasan barat Masbagik. Komunitas ini memperkaya
                  variasi dialek lokal, membawa keuletan perniagaan hasil bumi, serta melahirkan
                  kreativitas kerajinan seperti inovasi batik Sasambo di Dusun Kedondong dan kriya
                  mebel kayu di Timba Gerah.
                </p>
              </CardContent>
              <div className="p-4 pt-0 border-t border-warm-100 text-[11px] text-charcoal-muted">
                Sentra Konsentrasi: Dusun Kedondong & Timba Gerah
              </div>
            </Card>
          </div>
        </section>

        {/* Tokoh Bersejarah: Makam TGH. Muhammad Toyyib */}
        <Card className="border-warm-300 bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12">
            <div className="md:col-span-5 bg-warm-200">
              <img
                src="/assets/village/kerajinan_budaya_desa.jpg"
                alt="Makam TGH Muhammad Toyyib"
                className="w-full h-full object-cover min-h-[220px]"
              />
            </div>
            <div className="md:col-span-7 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-emerald-700" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Tokoh Sejarah & Destinasi Religi
                </span>
              </div>
              <h3 className="text-xl font-serif font-bold text-charcoal">
                Makam TGH. Muhammad Toyyib di Gubuk Rempung
              </h3>
              <p className="text-xs sm:text-sm text-charcoal leading-relaxed">
                Tuan Guru Haji (TGH) Muhammad Toyyib merupakan sosok ulama karismatik perintis
                dakwah Islam yang sangat dihormati masyarakat Pringgasela dan sekitarnya. Makam
                beliau berlokasi di Dusun Gubuk Rempung dan hingga kini menjadi tujuan ziarah religi
                warga untuk mendoakan serta mengenang jasa perjuangan syiar dakwah beliau.
              </p>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                Untuk mengabadikan ketokohan dan jasa-jasa beliau, nama TGH. Muhammad Toyyib secara
                resmi diabadikan sebagai nama jalan poros utama yang menghubungkan kawasan Rempung
                menuju Pringgasela, yaitu <strong>Jl. TGH. Muhammad Toyib</strong>.
              </p>
            </div>
          </div>
        </Card>

        {/* Sumber Referensi Sejarah */}
        <div className="p-5 rounded-2xl bg-warm-50 border border-warm-200 space-y-3">
          <h4 className="text-xs font-serif font-bold text-charcoal flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-sage-700" />
            <span>Dasar Rujukan Sejarah & Legalitas</span>
          </h4>
          <ul className="text-xs text-charcoal-muted space-y-1.5 list-disc pl-5">
            <li>
              Peraturan Bupati Lombok Timur Nomor 40 Tahun 2010 tentang Pembentukan Desa Persiapan
              Pringgasela Selatan (Diresmikan 15 November 2010).
            </li>
            <li>
              Peraturan Bupati Lombok Timur Nomor 7 Tahun 2011 tentang Penetapan Desa Definitif
              Pringgasela Selatan (Ditetapkan 25 November 2011).
            </li>
            <li>
              Katalog Jejaring Desa Wisata (Jadesta) Kementerian Pariwisata RI — ID #63548 (Data
              Kewilayahan 7 Dusun & Keberagaman 3 Trah).
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

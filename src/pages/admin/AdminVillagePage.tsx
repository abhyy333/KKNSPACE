import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Map,
  Save,
  AlertCircle,
  FileText,
  Compass,
  Sparkles,
  Image as ImageIcon,
  BookOpen,
  Layers,
  Upload,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import {
  fetchVillageProfile,
  fetchVillageDusuns,
  fetchVillageDestinations,
  fetchVillageCulturalHeritages,
  fetchVillageGalleryItems,
  fetchVillageReferences,
  updateVillageProfile,
} from '@/services/villageApi'
import type { VillageProfileData } from '@/types/village'

export const AdminVillagePage: React.FC = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'overview' | 'geodata' | 'dusuns' | 'destinations' | 'culture' | 'gallery' | 'references'>('overview')

  // Queries
  const { data: profile } = useQuery({
    queryKey: ['admin-village-profile'],
    queryFn: fetchVillageProfile,
  })

  const { data: dusuns = [] } = useQuery({
    queryKey: ['admin-village-dusuns'],
    queryFn: fetchVillageDusuns,
  })

  const { data: destinations = [] } = useQuery({
    queryKey: ['admin-village-destinations'],
    queryFn: () => fetchVillageDestinations(),
  })

  const { data: heritages = [] } = useQuery({
    queryKey: ['admin-village-heritages'],
    queryFn: fetchVillageCulturalHeritages,
  })

  const { data: galleryItems = [] } = useQuery({
    queryKey: ['admin-village-gallery'],
    queryFn: () => fetchVillageGalleryItems(),
  })

  const { data: references = [] } = useQuery({
    queryKey: ['admin-village-references'],
    queryFn: fetchVillageReferences,
  })

  // Form State for Main Profile
  const [profileForm, setProfileForm] = useState<Partial<VillageProfileData>>({})
  const [geojsonInput, setGeojsonInput] = useState<string>('')
  const [geojsonError, setGeojsonError] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setProfileForm({
        hero_title: profile.hero_title,
        hero_subtitle: profile.hero_subtitle,
        hero_image_url: profile.hero_image_url,
        overview: profile.overview,
        history_narrative: profile.history_narrative,
        kades_name: profile.kades_name,
        area_hectares: profile.area_hectares,
        elevation_masl: profile.elevation_masl,
        is_published: profile.is_published,
      })
      if (profile.geojson_data) {
        setGeojsonInput(JSON.stringify(profile.geojson_data, null, 2))
      }
    }
  }, [profile])

  // Mutation for Profile
  const profileMutation = useMutation({
    mutationFn: updateVillageProfile,
    onSuccess: () => {
      toast({
        title: 'Profil Desa Berhasil Disimpan',
        description: 'Perubahan telah disinkronkan ke portal publik.',
        variant: 'success',
      })
      queryClient.invalidateQueries({ queryKey: ['village-profile'] })
      queryClient.invalidateQueries({ queryKey: ['admin-village-profile'] })
    },
    onError: (err: any) => {
      toast({
        title: 'Gagal Menyimpan Profil',
        description: err.message,
        variant: 'error',
      })
    },
  })

  const handleSaveProfile = () => {
    profileMutation.mutate(profileForm)
  }

  const handleSaveGeoJSON = () => {
    setGeojsonError(null)
    if (!geojsonInput.trim()) {
      profileMutation.mutate({ geojson_data: null })
      return
    }
    try {
      const parsed = JSON.parse(geojsonInput)
      profileMutation.mutate({ geojson_data: parsed })
    } catch (err: any) {
      setGeojsonError('Format JSON tidak valid: ' + err.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage-700">
            <Map className="h-4 w-4" />
            <span>Manajemen Konten Publik</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-charcoal mt-1">
            Pengelolaan Profil & Geoportal Desa
          </h1>
          <p className="text-xs text-charcoal-muted mt-1">
            Konfigurasi narasi, data statistik, peta geospasial, tujuh dusun, destinasi, dan galeri
            Desa Pringgasela Selatan.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-warm-300 scrollbar-none">
        {[
          { id: 'overview', label: 'Ringkasan & Narasi', icon: FileText },
          { id: 'geodata', label: 'Data Peta & GeoJSON', icon: Layers },
          { id: 'dusuns', label: '7 Dusun', icon: Map },
          { id: 'destinations', label: 'Destinasi Wisata', icon: Compass },
          { id: 'culture', label: 'Adat & Budaya', icon: Sparkles },
          { id: 'gallery', label: 'Galeri Visual', icon: ImageIcon },
          { id: 'references', label: 'Sumber Referensi', icon: BookOpen },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-sage-800 text-white shadow-sm'
                  : 'text-charcoal-muted hover:text-charcoal hover:bg-warm-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab: Overview & Narrative */}
      {activeTab === 'overview' && (
        <Card className="border-warm-300 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-serif font-bold text-charcoal">
              Pengaturan Profil Utama Desa
            </CardTitle>
            <CardDescription className="text-xs">
              Ubah judul editorial, subjudul hero, narasi sejarah, dan status publikasi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-charcoal">Judul Hero</label>
                <Input
                  value={profileForm.hero_title || ''}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, hero_title: e.target.value }))
                  }
                  className="bg-warm-50 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-charcoal">Subjudul Hero</label>
                <Input
                  value={profileForm.hero_subtitle || ''}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, hero_subtitle: e.target.value }))
                  }
                  className="bg-warm-50 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-charcoal">Kepala Desa</label>
                <Input
                  value={profileForm.kades_name || ''}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, kades_name: e.target.value }))
                  }
                  className="bg-warm-50 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-charcoal">Luas Wilayah (Ha)</label>
                <Input
                  type="number"
                  value={profileForm.area_hectares || 465}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      area_hectares: Number(e.target.value),
                    }))
                  }
                  className="bg-warm-50 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-charcoal">Ketinggian Wilayah</label>
                <Input
                  value={profileForm.elevation_masl || ''}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, elevation_masl: e.target.value }))
                  }
                  className="bg-warm-50 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-charcoal">URL Foto Hero Cover</label>
              <Input
                value={profileForm.hero_image_url || ''}
                onChange={(e) =>
                  setProfileForm((prev) => ({ ...prev, hero_image_url: e.target.value }))
                }
                className="bg-warm-50 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-charcoal">Gambaran Umum (Overview)</label>
              <textarea
                rows={4}
                value={profileForm.overview || ''}
                onChange={(e) =>
                  setProfileForm((prev) => ({ ...prev, overview: e.target.value }))
                }
                className="w-full rounded-md border border-warm-300 bg-warm-50 p-3 text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-charcoal">Narasi Sejarah Pemekaran</label>
              <textarea
                rows={5}
                value={profileForm.history_narrative || ''}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    history_narrative: e.target.value,
                  }))
                }
                className="w-full rounded-md border border-warm-300 bg-warm-50 p-3 text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-warm-200">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-charcoal">
                <input
                  type="checkbox"
                  checked={profileForm.is_published ?? true}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, is_published: e.target.checked }))
                  }
                  className="rounded text-sage-600 focus:ring-sage-500 h-4 w-4"
                />
                <span>Publikasikan Halaman Profil Desa ke Pengunjung Publik</span>
              </label>

              <Button
                type="button"
                onClick={handleSaveProfile}
                disabled={profileMutation.isPending}
                className="bg-sage-800 hover:bg-sage-700 text-white text-xs flex items-center gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{profileMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab: GeoJSON & Map Management */}
      {activeTab === 'geodata' && (
        <Card className="border-warm-300 bg-white shadow-sm space-y-4">
          <CardHeader>
            <CardTitle className="text-base font-serif font-bold text-charcoal">
              Pengelolaan Poligon Geospasial (GeoJSON Resmi)
            </CardTitle>
            <CardDescription className="text-xs">
              Sesuai instruksi, poligon batas dusun/desa tidak boleh dikarang. Tempelkan berkas
              GeoJSON resmi hasil penetapan kadastral Pemerintah Desa/BPN ketika telah tersedia.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-warm-50 border border-warm-200 text-xs text-charcoal space-y-1">
              <span className="font-semibold text-sage-800">Status Data Saat Ini:</span>
              <p className="text-charcoal-muted leading-relaxed">
                {profile?.geojson_data
                  ? 'Data poligon GeoJSON resmi aktif dan ditampilkan pada peta wilayah publik.'
                  : 'Belum ada berkas poligon GeoJSON resmi. Peta publik menampilkan koordinat sentroid 7 dusun dan marker lokasi terverifikasi.'}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-charcoal">
                Payload GeoJSON (Feature / FeatureCollection):
              </label>
              <textarea
                rows={8}
                value={geojsonInput}
                onChange={(e) => {
                  setGeojsonInput(e.target.value)
                  setGeojsonError(null)
                }}
                placeholder='{"type": "FeatureCollection", "features": [...]}'
                className="w-full font-mono text-[11px] rounded-md border border-warm-300 bg-warm-50 p-3 text-charcoal focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
              {geojsonError && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{geojsonError}</span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setGeojsonInput('')}
                className="text-xs"
              >
                Kosongkan Data GeoJSON
              </Button>
              <Button
                type="button"
                onClick={handleSaveGeoJSON}
                disabled={profileMutation.isPending}
                className="bg-sage-800 hover:bg-sage-700 text-white text-xs flex items-center gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Simpan Berkas GeoJSON</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab: 7 Dusun */}
      {activeTab === 'dusuns' && (
        <Card className="border-warm-300 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-serif font-bold text-charcoal">
              Daftar Tujuh Dusun Pringgasela Selatan
            </CardTitle>
            <CardDescription className="text-xs">
              Dusun resmi berdasarkan Peraturan Bupati Lombok Timur Nomor 7 Tahun 2011.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="divide-y divide-warm-200">
              {dusuns.map((dusun) => (
                <div key={dusun.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-sage-100 text-sage-800 text-[10px]">
                        #{dusun.order_index}
                      </Badge>
                      <h4 className="font-serif font-bold text-charcoal text-sm">
                        {dusun.name}
                      </h4>
                    </div>
                    <p className="text-xs text-charcoal-muted max-w-2xl">
                      {dusun.description}
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {dusun.key_potentials.map((pot, idx) => (
                        <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-warm-100 text-charcoal">
                          {pot}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-charcoal-muted shrink-0 text-right">
                    Lat: {dusun.center_coordinates.lat}
                    <br />
                    Lng: {dusun.center_coordinates.lng}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab: Destinations */}
      {activeTab === 'destinations' && (
        <Card className="border-warm-300 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-serif font-bold text-charcoal">
              Destinasi & Potensi Wisata
            </CardTitle>
            <CardDescription className="text-xs">
              Daftar objek wisata yang telah diverifikasi pada platform Jadesta dan dokumen desa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="divide-y divide-warm-200">
              {destinations.map((dest) => (
                <div key={dest.id} className="py-3.5 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-sage-100 text-sage-800 text-[10px] uppercase">
                        {dest.category}
                      </Badge>
                      <h4 className="font-serif font-bold text-charcoal text-sm">
                        {dest.name}
                      </h4>
                    </div>
                    <p className="text-xs text-charcoal-muted max-w-xl">
                      {dest.description}
                    </p>
                    <span className="text-[10px] text-charcoal-muted block">
                      Lokasi: {dest.dusun_name} · Sumber: {dest.sources}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {dest.status_type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab: Cultural Heritages */}
      {activeTab === 'culture' && (
        <Card className="border-warm-300 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-serif font-bold text-charcoal">
              Warisan Adat & Kebudayaan
            </CardTitle>
            <CardDescription className="text-xs">
              Tenun gedogan, Festival Dongdala, Musik Klenang, Zikir Zaman, dan Batik Sasambo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="divide-y divide-warm-200">
              {heritages.map((item) => (
                <div key={item.id} className="py-3.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-100 text-amber-900 text-[10px] uppercase">
                      {item.category}
                    </Badge>
                    <h4 className="font-serif font-bold text-charcoal text-sm">
                      {item.title}
                    </h4>
                  </div>
                  <p className="text-xs text-charcoal-muted max-w-2xl">
                    {item.summary}
                  </p>
                  <span className="text-[10px] text-charcoal-muted block">
                    Asal Kewilayahan: {item.dusun_origin}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab: Gallery */}
      {activeTab === 'gallery' && (
        <Card className="border-warm-300 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-serif font-bold text-charcoal">
              Koleksi Galeri Foto Terverifikasi
            </CardTitle>
            <CardDescription className="text-xs">
              Foto otentik dengan atribusi fotografer/arsip dan catatan lisensi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {galleryItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-warm-200 overflow-hidden bg-warm-50/50">
                  <div className="h-32 w-full overflow-hidden bg-warm-200">
                    <img src={item.image_url} alt={item.alt_text} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3 space-y-1 text-xs">
                    <h5 className="font-serif font-bold text-charcoal truncate">{item.title}</h5>
                    <p className="text-[10px] text-charcoal-muted line-clamp-1">{item.caption}</p>
                    <div className="text-[10px] text-charcoal-muted pt-1 border-t border-warm-100 flex justify-between">
                      <span>{item.credit}</span>
                      <span>{item.year_taken}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab: References */}
      {activeTab === 'references' && (
        <Card className="border-warm-300 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-serif font-bold text-charcoal">
              Daftar Rujukan & Sumber Primer
            </CardTitle>
            <CardDescription className="text-xs">
              Memastikan seluruh informasi yang dipublikasikan dapat dipertanggungjawabkan keasliannya.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-warm-200 text-xs">
              {references.map((ref) => (
                <div key={ref.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <h5 className="font-semibold text-charcoal">{ref.title}</h5>
                    <Badge variant="outline" className="text-[10px]">{ref.source_type}</Badge>
                  </div>
                  <p className="text-charcoal-muted text-[11px]">
                    {ref.author_publisher} (Tahun {ref.year})
                  </p>
                  {ref.notes && <p className="text-charcoal-muted text-[10px] italic">{ref.notes}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

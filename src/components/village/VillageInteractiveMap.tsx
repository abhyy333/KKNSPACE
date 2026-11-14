import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  Info,
} from 'lucide-react'
import type { VillageDusun, VillageDestination } from '@/types/village'

interface VillageInteractiveMapProps {
  dusuns: VillageDusun[]
  destinations: VillageDestination[]
  geojsonData?: any | null
  className?: string
  selectedDusunSlug?: string | null
  onSelectDusun?: (slug: string) => void
}

const DEFAULT_CENTER: [number, number] = [-8.5492, 116.4485]
const DEFAULT_ZOOM = 14

export const VillageInteractiveMap: React.FC<VillageInteractiveMapProps> = ({
  dusuns,
  destinations,
  geojsonData,
  className = '',
  selectedDusunSlug,
  onSelectDusun,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeTileLayer, setActiveTileLayer] = useState<'osm' | 'topo' | 'light'>('light')
  const [selectedItem, setSelectedItem] = useState<{
    type: 'dusun' | 'destination'
    data: VillageDusun | VillageDestination
  } | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return

    // Avoid duplicate initialization
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
    })

    // Custom Zoom Control top-right
    L.control.zoom({ position: 'topright' }).addTo(map)

    // Attribution
    L.control
      .attribution({
        position: 'bottomright',
        prefix: '<span class="text-[10px] text-charcoal-muted">Leaflet | © OpenStreetMap contributors</span>',
      })
      .addTo(map)

    const markersGroup = L.layerGroup().addTo(map)
    markersLayerRef.current = markersGroup
    mapInstanceRef.current = map

    // Fix leaflet default icon asset paths
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    })

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Manage Tile Layers
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Clean old tile layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer)
      }
    })

    let tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
    let maxZoom = 19

    if (activeTileLayer === 'osm') {
      tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    } else if (activeTileLayer === 'topo') {
      tileUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
      maxZoom = 17
    }

    L.tileLayer(tileUrl, {
      maxZoom,
      subdomains: 'abcd',
    }).addTo(map)
  }, [activeTileLayer])

  // Handle GeoJSON Polygons (if provided officially)
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    if (geojsonLayerRef.current) {
      map.removeLayer(geojsonLayerRef.current)
      geojsonLayerRef.current = null
    }

    if (geojsonData) {
      try {
        const geoLayer = L.geoJSON(geojsonData, {
          style: {
            color: '#15803d',
            weight: 2,
            opacity: 0.85,
            fillColor: '#86efac',
            fillOpacity: 0.15,
          },
          onEachFeature: (feature, layer) => {
            if (feature.properties && feature.properties.name) {
              layer.bindTooltip(feature.properties.name, {
                permanent: false,
                direction: 'center',
                className: 'font-serif text-xs font-semibold px-2 py-1 bg-white/90 shadow rounded',
              })
            }
          },
        }).addTo(map)
        geojsonLayerRef.current = geoLayer
        map.fitBounds(geoLayer.getBounds(), { padding: [30, 30] })
      } catch (err) {
        console.error('Failed to parse official GeoJSON:', err)
      }
    }
  }, [geojsonData])

  // Update Markers based on Filters
  useEffect(() => {
    const map = mapInstanceRef.current
    const group = markersLayerRef.current
    if (!map || !group) return

    group.clearLayers()

    // 1. Dusun Markers (Centroids)
    if (filterCategory === 'all' || filterCategory === 'dusun') {
      dusuns.forEach((dusun) => {
        const coords: [number, number] = [
          dusun.center_coordinates.lat,
          dusun.center_coordinates.lng,
        ]

        // Custom HTML marker for Dusun
        const dusunIcon = L.divIcon({
          className: 'custom-dusun-marker',
          html: `
            <div class="relative group cursor-pointer">
              <div class="w-8 h-8 rounded-full bg-sage-800 text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-sage-500/30 transition-transform duration-300 hover:scale-110">
                <span class="text-[11px] font-bold font-serif">${dusun.order_index}</span>
              </div>
              <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-charcoal text-white text-[10px] font-medium px-1.5 py-0.5 rounded shadow pointer-events-none opacity-90">
                ${dusun.name}
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })

        const marker = L.marker(coords, { icon: dusunIcon })
        marker.on('click', () => {
          setSelectedItem({ type: 'dusun', data: dusun })
          onSelectDusun?.(dusun.slug)
          map.flyTo(coords, 15, { duration: 0.8 })
        })
        marker.addTo(group)
      })
    }

    // 2. Destination Markers
    const filteredDestinations =
      filterCategory === 'all'
        ? destinations
        : destinations.filter((d) => d.category === filterCategory)

    filteredDestinations.forEach((dest) => {
      const coords: [number, number] = [dest.coordinates.lat, dest.coordinates.lng]

      let badgeColor = 'bg-earth-600'
      if (dest.category === 'alam') badgeColor = 'bg-teal-700'
      if (dest.category === 'budaya') badgeColor = 'bg-amber-800'
      if (dest.category === 'religi') badgeColor = 'bg-emerald-800'
      if (dest.category === 'buatan') badgeColor = 'bg-blue-700'
      if (dest.category === 'agrowisata') badgeColor = 'bg-lime-800'

      const destIcon = L.divIcon({
        className: 'custom-destination-marker',
        html: `
          <div class="relative group cursor-pointer">
            <div class="w-7 h-7 rounded-full ${badgeColor} text-white flex items-center justify-center shadow-md border-2 border-white transition-transform duration-300 hover:scale-125">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white text-charcoal border border-warm-200 text-[10px] font-semibold px-1.5 py-0.5 rounded shadow pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20">
              ${dest.name}
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })

      const marker = L.marker(coords, { icon: destIcon })
      marker.on('click', () => {
        setSelectedItem({ type: 'destination', data: dest })
        map.flyTo(coords, 16, { duration: 0.8 })
      })
      marker.addTo(group)
    })
  }, [dusuns, destinations, filterCategory, onSelectDusun])

  // Sync when selectedDusunSlug changes externally
  useEffect(() => {
    if (!selectedDusunSlug) return
    const target = dusuns.find((d) => d.slug === selectedDusunSlug)
    if (target && mapInstanceRef.current) {
      setSelectedItem({ type: 'dusun', data: target })
      mapInstanceRef.current.flyTo(
        [target.center_coordinates.lat, target.center_coordinates.lng],
        15,
        { duration: 0.8 }
      )
    }
  }, [selectedDusunSlug, dusuns])

  const handleResetView = () => {
    if (!mapInstanceRef.current) return
    mapInstanceRef.current.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 0.8 })
    setSelectedItem(null)
  }

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev)
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize()
    }, 300)
  }

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-warm-300 shadow-md bg-white ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : className
      }`}
    >
      {/* Top Map Action Bar */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2">
        {/* Layer Switcher */}
        <div className="bg-white/95 backdrop-blur-sm border border-warm-200 rounded-lg p-1 shadow-sm flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTileLayer('light')}
            className={`px-2 py-1 rounded transition-colors ${
              activeTileLayer === 'light'
                ? 'bg-sage-700 text-white font-medium'
                : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Kartografi
          </button>
          <button
            type="button"
            onClick={() => setActiveTileLayer('osm')}
            className={`px-2 py-1 rounded transition-colors ${
              activeTileLayer === 'osm'
                ? 'bg-sage-700 text-white font-medium'
                : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            OpenStreetMap
          </button>
          <button
            type="button"
            onClick={() => setActiveTileLayer('topo')}
            className={`px-2 py-1 rounded transition-colors ${
              activeTileLayer === 'topo'
                ? 'bg-sage-700 text-white font-medium'
                : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            Topografi
          </button>
        </div>

        {/* Category Filters */}
        <div className="hidden sm:flex bg-white/95 backdrop-blur-sm border border-warm-200 rounded-lg p-1 shadow-sm items-center gap-1 text-xs">
          {[
            { id: 'all', label: 'Semua Objek' },
            { id: 'dusun', label: '7 Dusun' },
            { id: 'alam', label: 'Wisata Alam' },
            { id: 'budaya', label: 'Sentra Budaya' },
            { id: 'religi', label: 'Religi' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterCategory(cat.id)}
              className={`px-2 py-1 rounded transition-colors ${
                filterCategory === cat.id
                  ? 'bg-warm-800 text-white font-medium'
                  : 'text-charcoal-muted hover:text-charcoal'
              }`}
            >
              ${cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Control Tools (Reset & Fullscreen) */}
      <div className="absolute top-16 right-3 z-20 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleResetView}
          title="Reset Sudut Pandang"
          className="w-8 h-8 rounded-lg bg-white/95 border border-warm-200 shadow-sm flex items-center justify-center text-charcoal hover:bg-warm-50 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
          className="w-8 h-8 rounded-lg bg-white/95 border border-warm-200 shadow-sm flex items-center justify-center text-charcoal hover:bg-warm-50 transition-colors"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Map Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-[520px] lg:h-[620px] bg-warm-100 z-10" />

      {/* Official Geospatial Disclaimer Note */}
      <div className="absolute bottom-2 left-2 right-2 sm:right-auto sm:max-w-md z-20">
        <div className="bg-white/95 backdrop-blur-md border border-warm-200 rounded-xl p-3 shadow-lg text-[11px] text-charcoal leading-relaxed flex items-start gap-2.5">
          <Info className="h-4 w-4 text-sage-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sage-900 font-serif">
              Status Data Geospasial Terverifikasi
            </p>
            <p className="text-charcoal-muted text-[10px] mt-0.5">
              Peta menampilkan koordinat sentroid 7 dusun dan lokasi penting yang telah diverifikasi
              secara faktual. Batas poligon resmi dusun sedang dalam proses digitalisasi oleh
              pemerintah desa.
            </p>
          </div>
        </div>
      </div>

      {/* Side Detail Drawer (When Item Selected) */}
      {selectedItem && (
        <div className="absolute top-14 left-3 right-3 sm:left-auto sm:right-3 sm:w-80 max-h-[80%] overflow-y-auto bg-white/95 backdrop-blur-md border border-warm-300 rounded-xl shadow-2xl p-4 z-30 space-y-3 transition-all animate-in fade-in slide-in-from-right-4">
          <div className="flex items-start justify-between border-b border-warm-200 pb-2">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-sage-700">
                {selectedItem.type === 'dusun'
                  ? `Kewilayahan #${(selectedItem.data as VillageDusun).order_index}`
                  : `Destinasi ${(selectedItem.data as VillageDestination).category}`}
              </span>
              <h4 className="text-sm font-serif font-bold text-charcoal">
                {selectedItem.data.name}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="text-xs text-charcoal-muted hover:text-charcoal px-1.5 py-0.5 rounded border border-warm-200"
            >
              ✕
            </button>
          </div>

          {selectedItem.data.cover_image_url && (
            <div className="h-28 w-full rounded-lg overflow-hidden border border-warm-200">
              <img
                src={selectedItem.data.cover_image_url}
                alt={selectedItem.data.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <p className="text-xs text-charcoal leading-relaxed">
            {selectedItem.data.description}
          </p>

          {selectedItem.type === 'dusun' && (
            <div className="space-y-2 pt-1">
              <div>
                <span className="text-[10px] font-semibold text-charcoal-muted block uppercase">
                  Potensi Utama:
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(selectedItem.data as VillageDusun).key_potentials.map((pot, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 rounded bg-sage-50 text-sage-800 text-[10px] border border-sage-200"
                    >
                      {pot}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-charcoal-muted block uppercase">
                  Lokasi Penting:
                </span>
                <ul className="text-[11px] text-charcoal list-disc pl-4 space-y-0.5 mt-1">
                  {(selectedItem.data as VillageDusun).notable_places.map((place, idx) => (
                    <li key={idx}>{place}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {selectedItem.type === 'destination' && (
            <div className="space-y-2 pt-1 text-[11px]">
              <div>
                <span className="text-[10px] font-semibold text-charcoal-muted block uppercase">
                  Keunikan:
                </span>
                <p className="text-charcoal mt-0.5 italic">
                  {(selectedItem.data as VillageDestination).uniqueness}
                </p>
              </div>
              {(selectedItem.data as VillageDestination).sources && (
                <div className="pt-2 border-t border-warm-200 text-[10px] text-charcoal-muted">
                  <span className="font-medium text-charcoal">Sumber Verifikasi: </span>
                  {(selectedItem.data as VillageDestination).sources}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

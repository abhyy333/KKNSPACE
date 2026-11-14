import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'maplibre-gl/dist/maplibre-gl.css'
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import '@maplibre/maplibre-gl-leaflet'

// Set MapLibre worker URL for Vite bundler
setWorkerUrl(workerUrl)

import {
  Maximize2,
  Minimize2,
  RotateCcw,
  Crosshair,
  Info,
  Loader2,
  AlertTriangle,
  ChevronDown,
  Layers,
  Trees,
  Waves,
  Landmark,
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

// Verified coordinates for Desa Pringgasela Selatan
const DEFAULT_CENTER: [number, number] = [-8.5492, 116.4485]
const DEFAULT_ZOOM = 14

// OpenFreeMap vector styles (100% Free, Zero API Key, Zero Watermark)
const OPENFREEMAP_STYLES = {
  positron: 'https://tiles.openfreemap.org/styles/positron', // Default clean & minimal
  bright: 'https://tiles.openfreemap.org/styles/bright',
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
}

const OPENFREEMAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener" class="hover:underline">© OpenFreeMap</a> <a href="https://openmaptiles.org" target="_blank" rel="noopener" class="hover:underline">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" class="hover:underline">© OpenStreetMap contributors</a>'

// Custom SVG Icons for Editorial Marker System
const MARKER_ICONS = {
  // Dongdala Weaving Textile Diamond Motif
  tenun: `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2L2 12l10 10 10-10L12 2z"/>
      <path d="M12 6.5l5.5 5.5-5.5 5.5L6.5 12 12 6.5z"/>
    </svg>
  `,
  // Mountain / Nature
  nature: `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m8 3 4 8 5-5 5 15H2L8 3z"/>
    </svg>
  `,
  // Water / River / Spring
  water: `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
      <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
      <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
    </svg>
  `,
  // Heritage Landmark
  landmark: `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="2" x2="22" y1="22" y2="22"/>
      <line x1="6" x2="6" y1="11"/>
      <line x1="10" x2="10" y1="11"/>
      <line x1="14" x2="14" y1="11"/>
      <line x1="18" x2="18" y1="11"/>
      <polygon points="12 2 20 7 4 7"/>
      <line x1="2" x2="22" y1="18" y2="18"/>
    </svg>
  `,
  // Public Facility / Building
  building: `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
      <path d="M10 6h4"/>
      <path d="M10 10h4"/>
      <path d="M10 14h4"/>
      <path d="M10 18h4"/>
    </svg>
  `,
  // Agriculture / Crops
  agriculture: `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 22h20"/>
      <path d="M12 2v20"/>
      <path d="m4.93 10.93 4.24 4.24"/>
      <path d="m14.83 9.17 4.24-4.24"/>
      <path d="m14.83 15.17 4.24 4.24"/>
      <path d="m4.93 5.93 4.24-4.24"/>
    </svg>
  `,
}

// Marker Style & Color Resolver
function getCategoryMarkerConfig(category: string, name: string) {
  const lowerName = name.toLowerCase()

  // Water check
  if (
    lowerName.includes('air') ||
    lowerName.includes('sungai') ||
    lowerName.includes('umbul') ||
    lowerName.includes('mata air') ||
    lowerName.includes('telaga') ||
    lowerName.includes('embung')
  ) {
    return {
      svg: MARKER_ICONS.water,
      bgColor: '#164e63', // Deep cyan / teal
      ringColor: '#0891b2',
      label: 'Wisata Air',
    }
  }

  // Weaving & Textile check
  if (
    category === 'budaya' &&
    (lowerName.includes('tenun') || lowerName.includes('songket') || lowerName.includes('kain'))
  ) {
    return {
      svg: MARKER_ICONS.tenun,
      bgColor: '#854d0e', // Ochre / bronze gold
      ringColor: '#ca8a04',
      label: 'Sentra Tenun',
    }
  }

  // General Category Matching
  switch (category) {
    case 'alam':
      return {
        svg: MARKER_ICONS.nature,
        bgColor: '#204d30', // Forest green
        ringColor: '#367e50',
        label: 'Wisata Alam',
      }
    case 'budaya':
      return {
        svg: MARKER_ICONS.tenun,
        bgColor: '#7c2d12', // Terracotta
        ringColor: '#b45309',
        label: 'Sentra Budaya',
      }
    case 'religi':
      return {
        svg: MARKER_ICONS.landmark,
        bgColor: '#1e3a29', // Deep Islamic forest green
        ringColor: '#2d5a3f',
        label: 'Religi & Sejarah',
      }
    case 'agrowisata':
      return {
        svg: MARKER_ICONS.agriculture,
        bgColor: '#3f6212', // Olive lime
        ringColor: '#65a30d',
        label: 'Pertanian & Agro',
      }
    default:
      return {
        svg: MARKER_ICONS.building,
        bgColor: '#292524', // Warm Charcoal
        ringColor: '#57534e',
        label: 'Fasilitas & Lokasi',
      }
  }
}

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
  const glLayerRef = useRef<L.Layer | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null)

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeStyle, setActiveStyle] = useState<'positron' | 'bright' | 'liberty'>('positron')
  const [isLoadingTile, setIsLoadingTile] = useState(true)
  const [tileError, setTileError] = useState<string | null>(null)
  const [isLegendOpen, setIsLegendOpen] = useState(false)

  // Multi-layer controlled state: each layer toggles independently
  const [layers, setLayers] = useState({
    dusun: true,
    alam: true,
    budaya: true,
    religi: true,
  })

  const [selectedItem, setSelectedItem] = useState<{
    type: 'dusun' | 'destination'
    data: VillageDusun | VillageDestination
  } | null>(null)

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return

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
      maxBounds: [
        [180, -Infinity],
        [-180, Infinity],
      ],
      maxBoundsViscosity: 1,
      minZoom: 2,
    })

    // Custom Zoom Control top-right
    L.control.zoom({ position: 'topright' }).addTo(map)

    // Attribution Control at bottom-right showing OpenFreeMap credits
    L.control
      .attribution({
        position: 'bottomright',
        prefix: false,
      })
      .addAttribution(OPENFREEMAP_ATTRIBUTION)
      .addTo(map)

    const markersGroup = L.layerGroup().addTo(map)
    markersLayerRef.current = markersGroup
    mapInstanceRef.current = map

    return () => {
      if (glLayerRef.current && map) {
        map.removeLayer(glLayerRef.current)
        glLayerRef.current = null
      }
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Manage OpenFreeMap Basemap Layer (Positron Default)
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    setIsLoadingTile(true)
    setTileError(null)

    // Remove existing GL or tile layer
    if (glLayerRef.current) {
      map.removeLayer(glLayerRef.current)
      glLayerRef.current = null
    }

    const styleUrl = OPENFREEMAP_STYLES[activeStyle]

    try {
      // Use @maplibre/maplibre-gl-leaflet to render OpenFreeMap vector basemap
      const gl = (L as any).maplibreGL({
        style: styleUrl,
        attribution: OPENFREEMAP_ATTRIBUTION,
        interactive: true,
      })

      gl.addTo(map)
      glLayerRef.current = gl

      // Hook into maplibre map events for loading and error states
      try {
        const libreMap = gl.getMaplibreMap?.()
        if (libreMap) {
          libreMap.once('load', () => {
            setIsLoadingTile(false)
          })
          libreMap.on('error', (e: any) => {
            console.warn('OpenFreeMap style event:', e)
          })
        } else {
          setIsLoadingTile(false)
        }
      } catch {
        setIsLoadingTile(false)
      }
    } catch (err: any) {
      console.warn('MapLibre GL initialization failed, falling back to OSM tile:', err)
      setTileError('WebGL vector renderer dialihkan ke basemap alternatif.')

      const fallbackLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(map)
      glLayerRef.current = fallbackLayer
      setIsLoadingTile(false)
    }

    const timer = setTimeout(() => {
      setIsLoadingTile(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [activeStyle])

  // Handle Official GeoJSON Polygons (if provided)
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
            color: '#1e4a30', // Deep Forest Green outline
            weight: 2.5,
            opacity: 0.9,
            fillColor: '#36704d',
            fillOpacity: 0.12,
            dashArray: '6, 6',
          },
          onEachFeature: (feature, layer) => {
            const name = feature.properties?.name || 'Desa Pringgasela Selatan'
            layer.bindTooltip(`Wilayah Administrasi: ${name}`, {
              permanent: false,
              direction: 'center',
              className: 'font-serif text-xs font-semibold px-2 py-1 bg-white/95 shadow-md rounded border border-sage-200 text-charcoal',
            })
            layer.on('mouseover', () => {
              ;(layer as any).setStyle({
                weight: 3.5,
                fillOpacity: 0.22,
                color: '#143522',
              })
            })
            layer.on('mouseout', () => {
              ;(layer as any).setStyle({
                weight: 2.5,
                fillOpacity: 0.12,
                color: '#1e4a30',
              })
            })
          },
        }).addTo(map)
        geojsonLayerRef.current = geoLayer
      } catch (err) {
        console.error('Failed to parse official GeoJSON:', err)
      }
    }
  }, [geojsonData])

  // Update Custom Editorial Markers based on Layer Toggles
  useEffect(() => {
    const map = mapInstanceRef.current
    const group = markersLayerRef.current
    if (!map || !group) return

    group.clearLayers()

    // 1. Dusun Markers (Centroids) — Refined Editorial Emblem
    if (layers.dusun) {
      dusuns.forEach((dusun) => {
        const coords: [number, number] = [
          dusun.center_coordinates.lat,
          dusun.center_coordinates.lng,
        ]
        const isSelected = selectedItem?.type === 'dusun' && selectedItem.data.id === dusun.id

        const dusunIcon = L.divIcon({
          className: 'custom-dusun-marker-container',
          html: `
            <div class="relative group cursor-pointer flex flex-col items-center">
              <div class="w-8 h-8 rounded-full bg-sage-800 text-warm-100 flex items-center justify-center shadow-md border-2 border-white ring-2 ${
                isSelected ? 'ring-sage-500 scale-125' : 'ring-sage-600/30'
              } transition-all duration-200 hover:scale-115">
                <span class="text-xs font-bold font-serif tracking-tight">${dusun.order_index}</span>
              </div>
              <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white text-charcoal border border-warm-300 text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-subtle pointer-events-none transition-all ${
                isSelected ? 'opacity-100 font-bold border-sage-600 text-sage-900 ring-1 ring-sage-500/20' : 'opacity-90 group-hover:opacity-100'
              }">
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

    // 2. Destination Markers — Editorial Circular SVG Icons
    destinations.forEach((dest) => {
      // Check category layer state
      let isVisible = false
      if (dest.category === 'alam' && layers.alam) isVisible = true
      if (dest.category === 'budaya' && layers.budaya) isVisible = true
      if (dest.category === 'religi' && layers.religi) isVisible = true
      if (dest.category !== 'alam' && dest.category !== 'budaya' && dest.category !== 'religi') {
        isVisible = layers.budaya || layers.alam
      }

      if (!isVisible) return

      const coords: [number, number] = [dest.coordinates.lat, dest.coordinates.lng]
      const isSelected = selectedItem?.type === 'destination' && selectedItem.data.id === dest.id
      const markerConfig = getCategoryMarkerConfig(dest.category, dest.name)

      const destIcon = L.divIcon({
        className: 'custom-destination-marker-container',
        html: `
          <div class="relative group cursor-pointer flex flex-col items-center">
            <div style="background-color: ${markerConfig.bgColor};" class="w-8 h-8 rounded-full text-white flex items-center justify-center shadow-md border-2 border-white ring-2 ${
              isSelected ? 'ring-amber-500 scale-125' : 'ring-black/15'
            } transition-all duration-200 hover:scale-115">
              ${markerConfig.svg}
            </div>
            <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/95 text-charcoal border border-warm-300 text-[10px] font-medium px-2 py-0.5 rounded-full shadow-subtle pointer-events-none transition-all ${
              isSelected ? 'opacity-100 font-bold border-amber-600 text-charcoal' : 'opacity-0 group-hover:opacity-100'
            } z-20">
              ${dest.name}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })

      const marker = L.marker(coords, { icon: destIcon })
      marker.on('click', () => {
        setSelectedItem({ type: 'destination', data: dest })
        map.flyTo(coords, 16, { duration: 0.8 })
      })
      marker.addTo(group)
    })
  }, [dusuns, destinations, layers, selectedItem, onSelectDusun])

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

  // Dynamic Resize & InvalidateSize Handling via ResizeObserver & Window Listeners
  useEffect(() => {
    if (!mapContainerRef.current) return

    let rafId: number | null = null

    const handleResize = () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize({ pan: false })
        }
        if (glLayerRef.current) {
          try {
            const libreMap = (glLayerRef.current as any).getMaplibreMap?.()
            libreMap?.resize()
          } catch {}
        }
      })
    }

    const resizeObserver = new ResizeObserver(() => {
      handleResize()
    })

    resizeObserver.observe(mapContainerRef.current)

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    document.addEventListener('fullscreenchange', handleResize)

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
      document.removeEventListener('fullscreenchange', handleResize)
    }
  }, [])

  // Fullscreen transition sizing & body scroll lock
  useEffect(() => {
    const runInvalidate = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize({ pan: false })
      }
      if (glLayerRef.current) {
        try {
          const libreMap = (glLayerRef.current as any).getMaplibreMap?.()
          libreMap?.resize()
        } catch {}
      }
    }

    const t1 = setTimeout(runInvalidate, 50)
    const t2 = setTimeout(runInvalidate, 150)
    const t3 = setTimeout(runInvalidate, 300)
    const t4 = setTimeout(runInvalidate, 500)

    if (isFullscreen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
      document.body.style.overflow = ''
    }
  }, [isFullscreen])

  // Feature 3: Fokus Wilayah Desa (Smooth flyTo or fitBounds of official village limits)
  const handleFocusVillage = () => {
    const map = mapInstanceRef.current
    if (!map) return

    map.closePopup()
    setSelectedItem(null)

    if (geojsonLayerRef.current) {
      try {
        const bounds = geojsonLayerRef.current.getBounds()
        if (bounds.isValid()) {
          map.fitBounds(bounds, {
            padding: [40, 40],
            maxZoom: 15,
            animate: true,
          })
          return
        }
      } catch {}
    }

    map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 0.9 })
  }

  const handleResetView = () => {
    if (!mapInstanceRef.current) return
    mapInstanceRef.current.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 0.8 })
    setSelectedItem(null)
  }

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev)
  }

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const enableAllLayers = () => {
    setLayers({ dusun: true, alam: true, budaya: true, religi: true })
  }

  return (
    <div
      className={`relative overflow-hidden bg-white ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none w-screen h-screen max-w-none m-0 p-0 border-0 shadow-none'
          : `w-full rounded-2xl border border-warm-300 shadow-md ${className || ''}`
      }`}
    >
      {/* Top Map Action Bar — Always Visible with Horizontal Scroll on Mobile */}
      <div className="absolute top-3 left-3 right-14 sm:right-16 z-20 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pointer-events-auto touch-pan-x">
        
        {/* Style Switcher: Positron (Default), Bright, Liberty */}
        <div className="bg-white/95 backdrop-blur-md border border-warm-300 rounded-xl p-1 shadow-subtle flex items-center gap-1 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveStyle('positron')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              activeStyle === 'positron'
                ? 'bg-sage-700 text-white shadow-2xs'
                : 'text-charcoal-muted hover:text-charcoal hover:bg-warm-100'
            }`}
            title="OpenFreeMap Positron (Minimalis & Bersih)"
          >
            Positron
          </button>
          <button
            type="button"
            onClick={() => setActiveStyle('bright')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              activeStyle === 'bright'
                ? 'bg-sage-700 text-white shadow-2xs'
                : 'text-charcoal-muted hover:text-charcoal hover:bg-warm-100'
            }`}
            title="OpenFreeMap Bright (Warna Terang)"
          >
            Bright
          </button>
          <button
            type="button"
            onClick={() => setActiveStyle('liberty')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              activeStyle === 'liberty'
                ? 'bg-sage-700 text-white shadow-2xs'
                : 'text-charcoal-muted hover:text-charcoal hover:bg-warm-100'
            }`}
            title="OpenFreeMap Liberty (Topografi Lengkap)"
          >
            Liberty
          </button>
        </div>

        {/* Feature 2: Category Layer Toggles — Permanently Visible, Never Disappears */}
        <div className="bg-white/95 backdrop-blur-md border border-warm-300 rounded-xl p-1 shadow-subtle flex items-center gap-1 text-xs shrink-0">
          
          <button
            type="button"
            onClick={() => toggleLayer('dusun')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              layers.dusun
                ? 'bg-sage-800 text-white shadow-2xs'
                : 'bg-warm-100/80 text-charcoal-muted hover:text-charcoal border border-dashed border-warm-300 opacity-70'
            }`}
            title={layers.dusun ? 'Sembunyikan 7 Dusun' : 'Tampilkan 7 Dusun'}
          >
            <span className={`w-2 h-2 rounded-full ${layers.dusun ? 'bg-emerald-400' : 'bg-charcoal-muted'}`} />
            <span>7 Dusun</span>
          </button>

          <button
            type="button"
            onClick={() => toggleLayer('alam')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              layers.alam
                ? 'bg-sage-800 text-white shadow-2xs'
                : 'bg-warm-100/80 text-charcoal-muted hover:text-charcoal border border-dashed border-warm-300 opacity-70'
            }`}
            title={layers.alam ? 'Sembunyikan Wisata Alam' : 'Tampilkan Wisata Alam'}
          >
            <span className={`w-2 h-2 rounded-full ${layers.alam ? 'bg-teal-400' : 'bg-charcoal-muted'}`} />
            <span>Wisata Alam</span>
          </button>

          <button
            type="button"
            onClick={() => toggleLayer('budaya')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              layers.budaya
                ? 'bg-sage-800 text-white shadow-2xs'
                : 'bg-warm-100/80 text-charcoal-muted hover:text-charcoal border border-dashed border-warm-300 opacity-70'
            }`}
            title={layers.budaya ? 'Sembunyikan Sentra Budaya' : 'Tampilkan Sentra Budaya'}
          >
            <span className={`w-2 h-2 rounded-full ${layers.budaya ? 'bg-amber-400' : 'bg-charcoal-muted'}`} />
            <span>Sentra Budaya</span>
          </button>

          <button
            type="button"
            onClick={() => toggleLayer('religi')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              layers.religi
                ? 'bg-sage-800 text-white shadow-2xs'
                : 'bg-warm-100/80 text-charcoal-muted hover:text-charcoal border border-dashed border-warm-300 opacity-70'
            }`}
            title={layers.religi ? 'Sembunyikan Religi & Sejarah' : 'Tampilkan Religi & Sejarah'}
          >
            <span className={`w-2 h-2 rounded-full ${layers.religi ? 'bg-lime-400' : 'bg-charcoal-muted'}`} />
            <span>Religi</span>
          </button>

          {/* Quick Show All */}
          {(!layers.dusun || !layers.alam || !layers.budaya || !layers.religi) && (
            <button
              type="button"
              onClick={enableAllLayers}
              className="px-2 py-1 rounded-lg text-[11px] font-medium text-sage-800 bg-sage-50 hover:bg-sage-100 border border-sage-200 transition-colors ml-1"
            >
              Aktifkan Semua
            </button>
          )}
        </div>
      </div>

      {/* Control Tools Top-Right (Placed safely below Leaflet Zoom Controls) */}
      <div className="absolute top-20 right-3 z-20 flex flex-col gap-1.5">
        
        {/* Feature 3: Dedicated "Fokus Wilayah Desa" Button with Crosshair */}
        <button
          type="button"
          onClick={handleFocusVillage}
          title="Kembali ke Wilayah Pringgasela Selatan"
          aria-label="Kembali ke Wilayah Pringgasela Selatan"
          className="w-9 h-9 rounded-xl bg-white/95 border border-warm-300 shadow-md flex items-center justify-center text-sage-800 hover:bg-sage-50 hover:text-sage-900 transition-all hover:scale-105 group"
        >
          <Crosshair className="h-4 w-4 text-sage-700 group-hover:scale-110 transition-transform" />
        </button>

        {/* Reset View */}
        <button
          type="button"
          onClick={handleResetView}
          title="Reset Sudut Pandang"
          aria-label="Reset Sudut Pandang"
          className="w-9 h-9 rounded-xl bg-white/95 border border-warm-300 shadow-md flex items-center justify-center text-charcoal hover:bg-warm-100 transition-colors"
        >
          <RotateCcw className="h-4 w-4 text-charcoal-muted" />
        </button>

        {/* Fullscreen */}
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
          aria-label={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
          className="w-9 h-9 rounded-xl bg-white/95 border border-warm-300 shadow-md flex items-center justify-center text-charcoal hover:bg-warm-100 transition-colors"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4 text-charcoal" /> : <Maximize2 className="h-4 w-4 text-charcoal" />}
        </button>
      </div>

      {/* Loading Tile Indicator */}
      {isLoadingTile && (
        <div className="absolute top-3 right-14 sm:right-16 z-20 bg-white/95 backdrop-blur-sm border border-warm-200 rounded-lg px-2.5 py-1 shadow-sm flex items-center gap-1.5 text-[11px] text-charcoal-muted">
          <Loader2 className="h-3 w-3 animate-spin text-sage-600" />
          <span>Memuat basemap...</span>
        </div>
      )}

      {/* Tile Error Warning */}
      {tileError && (
        <div className="absolute top-16 left-3 z-20 bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-1 shadow-sm flex items-center gap-1.5 text-[11px] text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          <span>{tileError}</span>
        </div>
      )}

      {/* Map Leaflet Container with Viewport-Aware Responsive Dimensions */}
      <div
        ref={mapContainerRef}
        className={`w-full bg-warm-100 z-10 transition-[height] duration-200 ${
          isFullscreen
            ? 'h-full w-full min-h-0 max-h-none'
            : 'h-[52vh] min-h-[360px] max-h-[460px] sm:h-[58vh] sm:min-h-[420px] sm:max-h-[520px] lg:h-[64vh] lg:min-h-[460px] lg:max-h-[580px] xl:max-h-[620px]'
        }`}
      />

      {/* Feature 4 & 5: Minimalist Interactive Legend & Official Boundaries Note (Responsive Collapsible) */}
      <div
        className={`absolute bottom-3 left-3 z-20 max-w-[calc(100vw-24px)] sm:max-w-xs transition-opacity duration-200 ${
          selectedItem ? 'hidden sm:block' : 'block'
        }`}
      >
        <div className="bg-white/95 backdrop-blur-md border border-warm-300 rounded-2xl p-3 shadow-lg text-xs space-y-2">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sage-600" />
              <span className="font-serif font-bold text-charcoal">Legenda Wilayah Desa</span>
            </div>
            <button
              type="button"
              onClick={() => setIsLegendOpen((prev) => !prev)}
              className="text-[10px] font-semibold text-charcoal-muted hover:text-charcoal flex items-center gap-0.5"
            >
              <span>{isLegendOpen ? 'Tutup' : 'Buka'}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isLegendOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Quick Summary Pill always visible */}
          <div className="flex items-center gap-3 text-[11px] text-charcoal-muted pt-1 border-t border-warm-200">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-sage-800 text-white text-[9px] flex items-center justify-center font-serif font-bold">1</span>
              <span>7 Dusun</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-teal-800 inline-block" />
              <span>Wisata</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-amber-800 inline-block" />
              <span>Budaya/Tenun</span>
            </div>
          </div>

          {/* Detailed Collapsible Legend Content */}
          {isLegendOpen && (
            <div className="pt-2 border-t border-warm-200 space-y-2 text-[11px] text-charcoal animate-fade-in">
              <div className="grid grid-cols-2 gap-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-sage-800 text-white text-[9px] flex items-center justify-center font-serif font-bold shrink-0">1</div>
                  <span className="truncate">Sentroid 7 Dusun</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-800 flex items-center justify-center text-white shrink-0 p-0.5">
                    <Trees className="w-2.5 h-2.5" />
                  </div>
                  <span className="truncate">Wisata Alam</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-cyan-900 flex items-center justify-center text-white shrink-0 p-0.5">
                    <Waves className="w-2.5 h-2.5" />
                  </div>
                  <span className="truncate">Wisata Air / Sungai</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-amber-800 flex items-center justify-center text-white shrink-0 p-0.5">
                    <Landmark className="w-2.5 h-2.5" />
                  </div>
                  <span className="truncate">Sentra Budaya & Tenun</span>
                </div>
              </div>

              {/* Status Batas Administrasi */}
              <div className="p-2 rounded-xl bg-warm-100/90 border border-warm-200 text-[10px] text-charcoal-muted leading-relaxed">
                <div className="flex items-center gap-1 font-semibold text-charcoal mb-0.5">
                  <Info className="w-3 h-3 text-sage-600 shrink-0" />
                  <span>Batas Wilayah Resmi (465 Ha)</span>
                </div>
                {geojsonData ? (
                  <span className="text-emerald-700 font-medium">Poligon GeoJSON batas resmi aktif ditampilkan.</span>
                ) : (
                  <span>
                    Batas kadastral definitif: Utara (Desa Pringgasela), Selatan (Desa Rempung), Barat (Desa Masbagik Baru), Timur (Desa Pringgasela Timur). Data poligon BIG/BPN dapat diunggah melalui Admin Console.
                  </span>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Side Detail Drawer (Responsive: Bottom Sheet on Mobile, Floating Card on Tablet/Desktop) */}
      {selectedItem && (
        <div className="absolute bottom-3 left-3 right-3 sm:bottom-auto sm:top-14 sm:left-auto sm:right-3 sm:w-80 md:w-88 max-h-[55%] sm:max-h-[80%] overflow-y-auto bg-white/95 backdrop-blur-md border border-warm-300 rounded-2xl shadow-2xl p-4 z-30 space-y-3 transition-all animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-right-4">
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
              className="text-xs text-charcoal-muted hover:text-charcoal px-2 py-1 rounded-lg border border-warm-200 hover:bg-warm-100"
            >
              ✕
            </button>
          </div>

          {selectedItem.data.cover_image_url && (
            <div className="h-28 w-full rounded-xl overflow-hidden border border-warm-200">
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
                      className="px-2 py-0.5 rounded-full bg-sage-50 text-sage-800 text-[10px] border border-sage-200 font-medium"
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

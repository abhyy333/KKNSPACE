import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  Search,
  Award,
  CheckSquare,
  Users,
  Package,
  ClipboardList,
  Image as ImageIcon,
  UserCheck,
  ArrowRight,
  Loader2,
  X,
  CornerDownLeft,
} from 'lucide-react'

export interface SearchResultItem {
  id: string
  category: 'program' | 'task' | 'meeting' | 'inventory' | 'survey' | 'documentation' | 'member'
  categoryLabel: string
  title: string
  subtitle: string
  href: string
  badge?: string
  badgeVariant?: 'default' | 'success' | 'warning' | 'secondary' | 'outline'
}

interface WorkspaceGlobalSearchModalProps {
  open: boolean
  onClose: () => void
}

export const WorkspaceGlobalSearchModal: React.FC<WorkspaceGlobalSearchModalProps> = ({
  open,
  onClose,
}) => {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setSearchTerm('')
      setResults([])
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Perform search across tables with debounce
  useEffect(() => {
    if (!open) return
    const trimmed = searchTerm.trim()
    if (!trimmed || trimmed.length < 2) {
      setResults([])
      setIsSearching(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const pattern = `%${trimmed}%`

        const [
          programsRes,
          tasksRes,
          meetingsRes,
          inventoryRes,
          surveysRes,
          docsRes,
          membersRes,
        ] = await Promise.all([
          supabase
            .from('work_programs')
            .select('id, title, category, status')
            .ilike('title', pattern)
            .limit(5),
          supabase
            .from('tasks')
            .select('id, title, priority, status')
            .ilike('title', pattern)
            .limit(5),
          supabase
            .from('meetings')
            .select('id, title, meeting_date, status')
            .ilike('title', pattern)
            .limit(5),
          supabase
            .from('inventory_items')
            .select('id, name, category, ownership_type, item_status')
            .ilike('name', pattern)
            .limit(5),
          supabase
            .from('survey_forms')
            .select('id, title, category')
            .ilike('title', pattern)
            .limit(5),
          supabase
            .from('activity_documentations')
            .select('id, title, event_date, location')
            .ilike('title', pattern)
            .limit(5),
          supabase
            .from('kkn_team_directory')
            .select('id, full_name, role, position_label, study_program')
            .or(`full_name.ilike.${pattern},study_program.ilike.${pattern}`)
            .limit(5),
        ])

        const combined: SearchResultItem[] = []

        // Programs
        if (programsRes.data) {
          for (const p of programsRes.data) {
            combined.push({
              id: `proker-${p.id}`,
              category: 'program',
              categoryLabel: 'Program Kerja',
              title: p.title,
              subtitle: `Kategori: ${p.category || 'Umum'}`,
              href: '/workspace/programs',
              badge: p.status === 'completed' ? 'Selesai' : p.status === 'ongoing' ? 'Berjalan' : 'Rencana',
              badgeVariant: p.status === 'completed' ? 'success' : 'secondary',
            })
          }
        }

        // Tasks
        if (tasksRes.data) {
          for (const t of tasksRes.data) {
            combined.push({
              id: `task-${t.id}`,
              category: 'task',
              categoryLabel: 'Tugas Tim',
              title: t.title,
              subtitle: `Prioritas: ${t.priority || 'Normal'}`,
              href: '/workspace/tasks',
              badge: t.status === 'done' ? 'Selesai' : t.status === 'in_progress' ? 'Dikerjakan' : 'Belum Mulai',
              badgeVariant: t.status === 'done' ? 'success' : 'warning',
            })
          }
        }

        // Meetings
        if (meetingsRes.data) {
          for (const m of meetingsRes.data) {
            combined.push({
              id: `meet-${m.id}`,
              category: 'meeting',
              categoryLabel: 'Rapat & Notulensi',
              title: m.title,
              subtitle: m.meeting_date ? new Date(m.meeting_date).toLocaleDateString('id-ID') : 'Jadwal Rapat',
              href: '/workspace/meetings',
              badge: m.status === 'completed' ? 'Selesai' : 'Terjadwal',
              badgeVariant: m.status === 'completed' ? 'success' : 'outline',
            })
          }
        }

        // Inventory
        if (inventoryRes.data) {
          for (const inv of inventoryRes.data) {
            combined.push({
              id: `inv-${inv.id}`,
              category: 'inventory',
              categoryLabel: 'Inventaris Barang',
              title: inv.name,
              subtitle: `Kategori: ${inv.category || 'Barang Posko'}`,
              href: '/workspace/inventory',
              badge: inv.ownership_type === 'PERSONAL_OWNED' ? 'Pribadi' : 'Aset Posko',
              badgeVariant: inv.ownership_type === 'PERSONAL_OWNED' ? 'secondary' : 'default',
            })
          }
        }

        // Surveys
        if (surveysRes.data) {
          for (const s of surveysRes.data) {
            combined.push({
              id: `survey-${s.id}`,
              category: 'survey',
              categoryLabel: 'Survei Lapangan',
              title: s.title,
              subtitle: `Formulir: ${s.category || 'Survei Dusun'}`,
              href: '/workspace/surveys',
            })
          }
        }

        // Documentations
        if (docsRes.data) {
          for (const doc of docsRes.data) {
            combined.push({
              id: `doc-${doc.id}`,
              category: 'documentation',
              categoryLabel: 'Dokumentasi',
              title: doc.title,
              subtitle: `${doc.event_date ? new Date(doc.event_date).toLocaleDateString('id-ID') : ''} ${doc.location ? `· ${doc.location}` : ''}`,
              href: '/workspace/documentation',
            })
          }
        }

        // Members
        if (membersRes.data) {
          for (const mem of membersRes.data) {
            combined.push({
              id: `mem-${mem.id}`,
              category: 'member',
              categoryLabel: 'Anggota Posko',
              title: mem.full_name,
              subtitle: `${mem.position_label || mem.role} · ${mem.study_program}`,
              href: '/workspace/members',
              badge: mem.role.toUpperCase(),
              badgeVariant: mem.role === 'ketua' || mem.role === 'dpl' ? 'success' : 'secondary',
            })
          }
        }

        setResults(combined)
        setSelectedIndex(0)
      } catch (err) {
        console.error('Global search error:', err)
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [searchTerm, open])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      handleSelect(results[selectedIndex])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const handleSelect = (item: SearchResultItem) => {
    navigate(item.href)
    onClose()
  }

  const getCategoryIcon = (category: SearchResultItem['category']) => {
    switch (category) {
      case 'program':
        return <Award className="h-4 w-4 text-emerald-700" />
      case 'task':
        return <CheckSquare className="h-4 w-4 text-blue-700" />
      case 'meeting':
        return <Users className="h-4 w-4 text-purple-700" />
      case 'inventory':
        return <Package className="h-4 w-4 text-amber-700" />
      case 'survey':
        return <ClipboardList className="h-4 w-4 text-sage-700" />
      case 'documentation':
        return <ImageIcon className="h-4 w-4 text-rose-700" />
      case 'member':
        return <UserCheck className="h-4 w-4 text-charcoal" />
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-charcoal/40 p-4 pt-16 sm:pt-24 backdrop-blur-xs transition-opacity animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-xl border border-warm-300 bg-white shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-warm-200 px-4 py-3 bg-white">
          <Search className="h-5 w-5 text-charcoal-muted shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Cari program kerja, tugas, rapat, inventaris, survei, dokumentasi, anggota..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-sm text-charcoal placeholder:text-charcoal-muted focus:outline-none"
          />
          {isSearching ? (
            <Loader2 className="h-4 w-4 text-sage-600 animate-spin shrink-0 ml-2" />
          ) : searchTerm ? (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="p-1 rounded text-charcoal-muted hover:text-charcoal"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-warm-100 p-2">
          {searchTerm.trim().length < 2 ? (
            <div className="py-8 text-center text-xs text-charcoal-muted space-y-1.5">
              <p className="font-medium text-charcoal">Pencarian Cepat Workspace</p>
              <p>Ketik minimal 2 karakter untuk mencari data di seluruh modul KKN SPACE.</p>
              <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-charcoal-light">
                <span className="rounded bg-warm-100 px-1.5 py-0.5 border border-warm-200 font-mono">↑↓</span> navigasi
                <span className="rounded bg-warm-100 px-1.5 py-0.5 border border-warm-200 font-mono">Enter</span> pilih
                <span className="rounded bg-warm-100 px-1.5 py-0.5 border border-warm-200 font-mono">Esc</span> tutup
              </div>
            </div>
          ) : isSearching && results.length === 0 ? (
            <div className="py-8 text-center text-xs text-charcoal-muted">
              <Loader2 className="h-5 w-5 text-sage-600 animate-spin mx-auto mb-2" />
              Mencari data di database...
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-xs text-charcoal-muted space-y-1">
              <p className="font-semibold text-charcoal">Tidak Ada Hasil Ditemukan</p>
              <p>Tidak ada data yang cocok dengan "{searchTerm}". Coba kata kunci lain.</p>
            </div>
          ) : (
            results.map((item, index) => {
              const isSelected = index === selectedIndex
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors text-xs ${
                    isSelected ? 'bg-sage-50 border border-sage-300' : 'hover:bg-warm-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warm-100 shrink-0">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-charcoal truncate">{item.title}</span>
                        {item.badge && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                              item.badgeVariant === 'success'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.badgeVariant === 'warning'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-warm-200 text-charcoal-muted'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-charcoal-muted mt-0.5">
                        <span className="font-semibold text-sage-800">{item.categoryLabel}</span>
                        <span>·</span>
                        <span className="truncate">{item.subtitle}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-charcoal-muted shrink-0 pl-3">
                    {isSelected && (
                      <span className="flex items-center gap-0.5 text-[10px] text-sage-700 font-medium">
                        <span>Buka</span>
                        <CornerDownLeft className="h-3 w-3" />
                      </span>
                    )}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-warm-200 px-4 py-2 bg-warm-50 text-[11px] text-charcoal-muted">
          <span>{results.length} hasil ditemukan</span>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">Tekan Esc untuk menutup</span>
            <button
              type="button"
              onClick={onClose}
              className="text-sage-800 font-medium hover:underline"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

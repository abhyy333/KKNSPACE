import React, { useState } from 'react'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  callAiAgendaAssistant,
  type AiAgendaAssistantResponse,
  type CalendarEventFormInput,
} from '@/services/agendaApi'
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  RotateCcw,
  Wand2,
  FileText,
  MapPin,
  Users,
  Target,
  Package,
  ListOrdered,
  Lightbulb,
} from 'lucide-react'

interface AiAgendaAssistantModalProps {
  open: boolean
  onClose: () => void
  currentFormValues?: Partial<CalendarEventFormInput>
  onApplyToForm: (data: {
    title: string
    category: string
    description: string
    location: string
    responsibleDivision: string
    targetAudience: string
    targetOutput: string
    equipmentNeeded: string[]
    steps: {
      order_index: number
      title: string
      description: string
      completion_status: boolean
    }[]
  }) => void
}

const QUICK_PROMPTS = [
  'Sosialisasi pencegahan stunting & MPASI bergizi di posyandu desa',
  'Pelatihan foto produk & katalog digital untuk UMKM tenun lokal',
  'Kerja bakti pembersihan saluran irigasi sawah bersama warga dusun',
  'Bimbingan belajar ceria membaca & berhitung untuk anak-anak posko',
  'Rapat koordinasi mingguan tim KKN evaluasi program kerja',
]

export const AiAgendaAssistantModal: React.FC<AiAgendaAssistantModalProps> = ({
  open,
  onClose,
  currentFormValues,
  onApplyToForm,
}) => {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedResult, setGeneratedResult] = useState<AiAgendaAssistantResponse['data'] | null>(null)
  const [resultSource, setResultSource] = useState<'gemini_ai' | 'template_engine' | null>(null)
  const [sourceNote, setSourceNote] = useState<string | null>(null)
  const [newEquipmentTag, setNewEquipmentTag] = useState('')
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false)

  const handleGenerate = async (
    action:
      | 'generate_agenda'
      | 'improve_description'
      | 'regenerate_agenda'
      | 'add_activity'
      | 'simplify_activities'
      | 'expand_activities'
  ) => {
    setError(null)
    setLoading(true)

    try {
      const response = await callAiAgendaAssistant({
        action,
        prompt: prompt.trim() || currentFormValues?.title || '',
        current_agenda: generatedResult
          ? {
              title: generatedResult.title,
              category: generatedResult.category,
              description: generatedResult.description,
              location: generatedResult.location,
              responsibleDivision: generatedResult.responsible_division,
              targetAudience: generatedResult.target_audience,
              targetOutput: generatedResult.target_output,
              equipmentNeeded: generatedResult.equipment_needed,
              steps: generatedResult.steps.map((st, i) => ({
                order_index: typeof st.order_index === 'number' ? st.order_index : i + 1,
                title: st.title,
                description: st.description || '',
                completion_status: false,
              })),
            }
          : currentFormValues,
      })

      if (response && response.success && response.data) {
        setGeneratedResult(response.data)
        setResultSource(response.source)
        setSourceNote(response.note || null)
      } else {
        throw new Error('Format saran tidak valid.')
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memproses permintaan asisten agenda.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddEquipmentTag = () => {
    if (!newEquipmentTag.trim() || !generatedResult) return
    const tag = newEquipmentTag.trim()
    if (!generatedResult.equipment_needed.includes(tag)) {
      setGeneratedResult({
        ...generatedResult,
        equipment_needed: [...generatedResult.equipment_needed, tag],
      })
    }
    setNewEquipmentTag('')
  }

  const handleRemoveEquipmentTag = (idxToRemove: number) => {
    if (!generatedResult) return
    setGeneratedResult({
      ...generatedResult,
      equipment_needed: generatedResult.equipment_needed.filter((_, idx) => idx !== idxToRemove),
    })
  }

  const handleRemoveStep = (idxToRemove: number) => {
    if (!generatedResult) return
    const updated = generatedResult.steps.filter((_, idx) => idx !== idxToRemove)
    setGeneratedResult({
      ...generatedResult,
      steps: updated.map((st, i) => ({ ...st, order_index: i + 1 })),
    })
  }

  const handleAddBlankStep = () => {
    if (!generatedResult) return
    const nextIdx = generatedResult.steps.length + 1
    setGeneratedResult({
      ...generatedResult,
      steps: [
        ...generatedResult.steps,
        {
          order_index: nextIdx,
          title: `Tahapan ${nextIdx}`,
          description: 'Rincian pelaksanaan tahapan kegiatan.',
        },
      ],
    })
  }

  const handleApply = () => {
    if (!generatedResult) return

    // If user has existing title/description and hasn't confirmed yet, show confirmation
    if (
      !showOverrideConfirm &&
      currentFormValues?.title &&
      currentFormValues.title.trim().length > 3
    ) {
      setShowOverrideConfirm(true)
      return
    }

    onApplyToForm({
      title: generatedResult.title,
      category: generatedResult.category,
      description: generatedResult.description,
      location: generatedResult.location,
      responsibleDivision: generatedResult.responsible_division,
      targetAudience: generatedResult.target_audience,
      targetOutput: generatedResult.target_output,
      equipmentNeeded: generatedResult.equipment_needed,
      steps: generatedResult.steps.map((s, idx) => ({
        order_index: typeof s.order_index === 'number' ? s.order_index : idx + 1,
        title: s.title,
        description: s.description,
        completion_status: false,
      })),
    })

    setShowOverrideConfirm(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="AI Agenda Assistant — Co-Pilot KKN"
      description="Susun rencana agenda operasional, tahapan checklist, dan kebutuhan logistik kegiatan secara cerdas dan kontekstual."
      maxWidthClass="max-w-3xl"
      scrollableContent={false}
    >
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5">
        {/* Ideation Input Section */}
        <div className="space-y-2.5 rounded-xl border border-sage-200 bg-sage-50/50 p-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-forest flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-forest" />
              <span>Gagasan / Ide Kegiatan KKN:</span>
            </label>
            <span className="text-[11px] text-charcoal-muted">
              {prompt.length}/1000 karakter
            </span>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
            rows={2}
            placeholder="Ketik ide kegiatan santai, misal: 'Mau adakan pelatihan UMKM tenun desa biar bisa jualan di Instagram'..."
            className="w-full rounded-lg border border-warm-300 bg-white px-3.5 py-2.5 text-xs text-charcoal placeholder:text-charcoal-muted focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
          />

          {/* Quick Prompts */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-charcoal-muted">
              Inspirasi cepat ide desa:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((qp, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPrompt(qp)}
                  className="rounded-full border border-warm-300 bg-white px-2.5 py-0.5 text-[11px] text-charcoal-muted hover:border-forest hover:text-forest transition-colors text-left"
                >
                  + {qp}
                </button>
              ))}
            </div>
          </div>

          {/* Generation Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-sage-200">
            <Button
              type="button"
              size="sm"
              disabled={loading || (!prompt.trim() && !currentFormValues?.title)}
              onClick={() => handleGenerate('generate_agenda')}
              className="gap-1.5 bg-forest hover:bg-forest/90 text-white text-xs"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5" />
              )}
              <span>Susun Rencana Agenda Lengkap</span>
            </Button>

            {generatedResult && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  onClick={() => handleGenerate('regenerate_agenda')}
                  className="text-xs gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Regenerasi</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  onClick={() => handleGenerate('simplify_activities')}
                  className="text-xs"
                >
                  Sederhanakan Tahapan
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  onClick={() => handleGenerate('expand_activities')}
                  className="text-xs"
                >
                  Perluas Rincian
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Pemberitahuan Asisten</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Source indicator */}
        {generatedResult && (
          <div className="flex items-center justify-between px-1 text-[11px] text-charcoal-muted">
            <span className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  resultSource === 'gemini_ai' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              {resultSource === 'gemini_ai'
                ? 'Dihasilkan oleh Gemini 1.5 Flash (AI Co-pilot)'
                : 'Dihasilkan oleh Template Cerdas KKN SPACE'}
            </span>
            {sourceNote && <span className="italic">{sourceNote}</span>}
          </div>
        )}

        {/* Override Confirmation Alert */}
        {showOverrideConfirm && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
            <div className="flex items-start gap-2 text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold">Konfirmasi Penimpaan Formulir</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Formulir agenda Anda sudah memiliki data judul: "
                  <span className="font-semibold">{currentFormValues?.title}</span>".
                  Menerapkan saran asisten akan memperbarui data judul, deskripsi, dan tahapan di formulir.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowOverrideConfirm(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleApply}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
              >
                Ya, Terapkan ke Formulir
              </Button>
            </div>
          </div>
        )}

        {/* Generated Structured Preview */}
        {generatedResult && (
          <div className="rounded-xl border border-warm-300 bg-white p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-warm-200 pb-3">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-muted">
                  Pratinjau Hasil Asisten
                </span>
                <h3 className="text-base font-serif font-bold text-forest mt-0.5">
                  {generatedResult.title}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="border-forest text-forest bg-forest/5 text-xs font-medium">
                  {generatedResult.category}
                </Badge>
                <Badge variant="secondary" className="text-xs font-medium">
                  Divisi: {generatedResult.responsible_division}
                </Badge>
              </div>
            </div>

            {/* Editable Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <span className="font-medium text-charcoal-muted flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-forest" />
                  Rekomendasi Lokasi:
                </span>
                <input
                  type="text"
                  value={generatedResult.location}
                  onChange={(e) =>
                    setGeneratedResult({ ...generatedResult, location: e.target.value })
                  }
                  className="w-full rounded-md border border-warm-300 px-2.5 py-1.5 text-xs text-charcoal focus:border-forest focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <span className="font-medium text-charcoal-muted flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-forest" />
                  Target Sasaran Warga:
                </span>
                <input
                  type="text"
                  value={generatedResult.target_audience}
                  onChange={(e) =>
                    setGeneratedResult({ ...generatedResult, target_audience: e.target.value })
                  }
                  className="w-full rounded-md border border-warm-300 px-2.5 py-1.5 text-xs text-charcoal focus:border-forest focus:outline-none"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-charcoal-muted flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-forest" />
                Deskripsi Operasional Kegiatan:
              </span>
              <textarea
                value={generatedResult.description}
                onChange={(e) =>
                  setGeneratedResult({ ...generatedResult, description: e.target.value })
                }
                rows={3}
                className="w-full rounded-lg border border-warm-300 p-2.5 text-xs text-charcoal focus:border-forest focus:outline-none"
              />
            </div>

            {/* Target Output */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-charcoal-muted flex items-center gap-1">
                <Target className="h-3.5 w-3.5 text-forest" />
                Target Capaian (Output Terukur):
              </span>
              <input
                type="text"
                value={generatedResult.target_output}
                onChange={(e) =>
                  setGeneratedResult({ ...generatedResult, target_output: e.target.value })
                }
                className="w-full rounded-lg border border-warm-300 px-3 py-2 text-xs text-charcoal focus:border-forest focus:outline-none"
              />
            </div>

            {/* Equipment Needed Tags */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-charcoal-muted flex items-center gap-1">
                <Package className="h-3.5 w-3.5 text-forest" />
                Kebutuhan Perlengkapan / Logistik:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {generatedResult.equipment_needed.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-full bg-warm-100 px-2.5 py-1 text-xs text-charcoal"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEquipmentTag(idx)}
                      className="text-charcoal-muted hover:text-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  value={newEquipmentTag}
                  onChange={(e) => setNewEquipmentTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddEquipmentTag()
                    }
                  }}
                  placeholder="Tambah alat / kebutuhan..."
                  className="rounded-md border border-warm-300 px-2.5 py-1 text-xs text-charcoal w-48 focus:border-forest focus:outline-none"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddEquipmentTag}
                  className="h-7 px-2 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Tambah
                </Button>
              </div>
            </div>

            {/* Steps Checklist */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-charcoal flex items-center gap-1">
                  <ListOrdered className="h-4 w-4 text-forest" />
                  Rancangan Tahapan Kegiatan ({generatedResult.steps.length} Langkah):
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleAddBlankStep}
                  className="h-7 px-2 text-xs text-forest gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Tambah Langkah</span>
                </Button>
              </div>

              <div className="space-y-2">
                {generatedResult.steps.map((st, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-lg border border-warm-200 bg-warm-50/60 p-2.5 text-xs"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest text-[11px] font-semibold text-white">
                      {idx + 1}
                    </span>
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={st.title}
                        onChange={(e) => {
                          const updated = [...generatedResult.steps]
                          updated[idx].title = e.target.value
                          setGeneratedResult({ ...generatedResult, steps: updated })
                        }}
                        className="w-full rounded border border-warm-300 bg-white px-2 py-1 text-xs font-semibold text-charcoal focus:border-forest focus:outline-none"
                      />
                      <textarea
                        value={st.description || ''}
                        onChange={(e) => {
                          const updated = [...generatedResult.steps]
                          updated[idx].description = e.target.value
                          setGeneratedResult({ ...generatedResult, steps: updated })
                        }}
                        rows={1}
                        className="w-full rounded border border-warm-300 bg-white px-2 py-1 text-[11px] text-charcoal-muted focus:border-forest focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(idx)}
                      className="p-1 text-charcoal-muted hover:text-red-600 transition-colors shrink-0"
                      title="Hapus langkah"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Optional suggestions */}
            {generatedResult.optional_suggestions && generatedResult.optional_suggestions.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-1.5 text-xs">
                <span className="font-semibold text-amber-900 flex items-center gap-1">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-700" />
                  Saran Praktis &amp; Mitigasi Lapangan:
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-amber-800 text-[11px]">
                  {generatedResult.optional_suggestions.map((sug, i) => (
                    <li key={i}>{sug}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        </div>

        {/* Modal Actions Sticky Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-warm-200 bg-warm-50/95 px-4 py-3 sm:px-6 sm:py-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-9 px-3.5 text-xs text-charcoal hover:bg-warm-100"
          >
            Tutup
          </Button>

          {generatedResult && (
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              className="h-9 px-4 bg-forest hover:bg-forest/90 text-white text-xs font-semibold gap-1.5 shadow-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Terapkan ke Formulir Agenda</span>
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

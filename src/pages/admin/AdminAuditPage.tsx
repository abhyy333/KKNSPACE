import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { History, RefreshCw, AlertCircle } from 'lucide-react'

interface AuditEventRow {
  id: number | string
  actor_id: string | null
  actor_email: string | null
  actor_authority: string | null
  action: string
  table_name: string
  record_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  created_at: string
}

export const AdminAuditPage: React.FC = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-audit-events'],
    queryFn: async () => {
      const { data: rows, error: err } = await supabase
        .from('audit_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (err) throw err
      return (rows ?? []) as AuditEventRow[]
    },
    retry: false,
  })

  const events = data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal">
            Log Audit Sistem & Keamanan
          </h1>
          <p className="text-xs text-charcoal-muted mt-1">
            Catatan kronologis undangan anggota, perubahan peran, suspensi akun, dan persetujuan sistem (immutable).
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-xs gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          <span>Segarkan</span>
        </Button>
      </div>

      {isError && (
        <Card className="border-red-200 bg-red-50/60">
          <CardContent className="p-6 flex items-center justify-between gap-4 text-xs text-red-800">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <span>{(error as Error)?.message || 'Gagal membaca tabel audit_events.'}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs bg-white">
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      )}

      {!isError && (
        <Card className="overflow-hidden">
          {isLoading ? (
            <CardContent className="p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          ) : events.length === 0 ? (
            <CardContent className="p-12 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warm-200 text-charcoal">
                <History className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-charcoal">Belum Ada Log Audit Tercatat</h3>
              <p className="text-xs text-charcoal-muted max-w-md mx-auto">
                Aktivitas undangan, perubahan role, dan penonaktifan akun akan muncul secara otomatis di sini.
              </p>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-warm-300 bg-warm-50 text-[11px] font-semibold uppercase tracking-wider text-charcoal-muted">
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3">Aksi</th>
                    <th className="px-4 py-3">Tabel Target</th>
                    <th className="px-4 py-3">Record ID</th>
                    <th className="px-4 py-3">Actor &amp; Authority</th>
                    <th className="px-4 py-3">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200 bg-white">
                  {events.map((ev) => {
                    const tbl = ev.table_name || '—'
                    const recId = ev.record_id || '—'
                    const actor = ev.actor_id || '—'
                    const actorLabel =
                      ev.actor_email || (actor.length > 12 ? `${actor.slice(0, 8)}...` : actor)
                    const detailPayload = ev.new_values ?? ev.old_values

                    return (
                      <tr key={ev.id} className="hover:bg-warm-50/70">
                        <td className="px-4 py-3 text-[11px] text-charcoal-muted whitespace-nowrap font-mono">
                          {new Date(ev.created_at).toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            {ev.action}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-[11px] font-mono text-charcoal whitespace-nowrap">
                          {tbl}
                        </td>
                        <td className="px-4 py-3 text-[11px] font-mono text-charcoal-muted whitespace-nowrap">
                          {recId.length > 12 ? `${recId.slice(0, 8)}...` : recId}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-charcoal whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono">{actorLabel}</span>
                            {ev.actor_authority && (
                              <Badge variant="outline" className="text-[10px]">
                                {ev.actor_authority}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-charcoal-muted max-w-xs truncate">
                          {detailPayload ? JSON.stringify(detailPayload) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

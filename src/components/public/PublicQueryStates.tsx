import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

export const PublicCardGridSkeleton: React.FC<{ count?: number; columnsClass?: string }> = ({
  count = 3,
  columnsClass = 'grid-cols-1 md:grid-cols-3',
}) => (
  <div className={`grid gap-6 ${columnsClass}`}>
    {Array.from({ length: count }).map((_, index) => (
      <Card key={index} className="border-warm-300 bg-white">
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    ))}
  </div>
)

export const PublicSectionError: React.FC<{
  title?: string
  message: string
  onRetry: () => void
  isRetrying?: boolean
}> = ({
  title = 'Data belum dapat dimuat',
  message,
  onRetry,
  isRetrying = false,
}) => (
  <Card className="border-rose-200 bg-white">
    <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
          <AlertCircle className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-charcoal">{title}</h3>
          <p className="text-xs text-charcoal-muted leading-relaxed">{message}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        disabled={isRetrying}
        className="text-xs gap-1.5 shrink-0"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
        <span>{isRetrying ? 'Memuat ulang...' : 'Coba Lagi'}</span>
      </Button>
    </CardContent>
  </Card>
)

export const PublicEmptyState: React.FC<{
  icon: React.ReactNode
  title: string
  description: string
}> = ({ icon, title, description }) => (
  <Card className="border-dashed border-warm-300 bg-white/80">
    <CardContent className="p-10 text-center space-y-3">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-sage-100 text-sage-700">
        {icon}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-charcoal">{title}</h3>
        <p className="text-xs text-charcoal-muted max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      </div>
    </CardContent>
  </Card>
)

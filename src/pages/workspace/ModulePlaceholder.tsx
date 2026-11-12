import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Construction } from 'lucide-react'

interface ModulePlaceholderProps {
  title: string
  subtitle: string
  category: string
  phaseNumber: number
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  title,
  subtitle,
  category,
  phaseNumber,
}) => {
  return (
    <div className="space-y-6">
      <div className="border-b border-warm-300 pb-5">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{category}</Badge>
          <span className="text-xs text-charcoal-muted">Fase {phaseNumber}</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal mt-2">
          {title}
        </h1>
        <p className="text-xs text-charcoal-muted mt-1">{subtitle}</p>
      </div>

      <Card className="border-dashed border-warm-300 bg-white">
        <CardContent className="p-12 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage-100 text-sage-800">
            <Construction className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-charcoal">
              Modul {title}
            </h3>
            <p className="text-xs text-charcoal-muted max-w-md mx-auto leading-relaxed">
              Struktur shell dan navigasi modul ini telah terintegrasi dalam App Shell. Integrasi database penuh dan fitur interaktif dijadwalkan pada Fase {phaseNumber}.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

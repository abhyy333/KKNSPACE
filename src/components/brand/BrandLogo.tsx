import React from 'react'
import { cn } from '@/lib/utils'

export type BrandLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'custom'
export type BrandLogoVariant = 'default' | 'light' | 'dark'

export interface BrandLogoProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'size'> {
  size?: BrandLogoSize
  variant?: BrandLogoVariant
  className?: string
  alt?: string
  withRing?: boolean
}

const SIZE_CLASSES: Record<BrandLogoSize, string> = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
  '2xl': 'h-20 w-20',
  custom: '',
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'default',
  className,
  alt = 'Logo Resmi KKN Pringgasela Selatan 2026–2027 Universitas Mataram',
  withRing = false,
  ...props
}) => {
  const sizeClass = SIZE_CLASSES[size]

  return (
    <img
      src="/brand/kkn-pringgasela-selatan-2026-2027.png"
      alt={alt}
      loading="eager"
      className={cn(
        'shrink-0 object-contain select-none transition-transform duration-150',
        sizeClass,
        withRing && 'rounded-full ring-1 ring-warm-300/80 shadow-subtle',
        variant === 'dark' && 'drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]',
        className
      )}
      {...props}
    />
  )
}

export interface BrandIdentityBadgeProps {
  className?: string
  size?: BrandLogoSize
  showSubtext?: boolean
  inverted?: boolean
}

export const BrandIdentityBadge: React.FC<BrandIdentityBadgeProps> = ({
  className,
  size = 'sm',
  showSubtext = true,
  inverted = false,
}) => {
  return (
    <div className={cn('flex items-center gap-2.5 min-w-0', className)}>
      <BrandLogo size={size} variant={inverted ? 'dark' : 'default'} />
      <div className="flex flex-col min-w-0 leading-tight">
        <span
          className={cn(
            'text-xs font-semibold tracking-tight truncate',
            inverted ? 'text-white' : 'text-charcoal'
          )}
        >
          KKN Pringgasela Selatan
        </span>
        {showSubtext && (
          <span
            className={cn(
              'text-[10px] truncate',
              inverted ? 'text-warm-200' : 'text-charcoal-muted'
            )}
          >
            Universitas Mataram 2026–2027
          </span>
        )}
      </div>
    </div>
  )
}

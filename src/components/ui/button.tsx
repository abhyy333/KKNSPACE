import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sage-500 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-sage-600 text-white shadow-subtle hover:bg-sage-700 active:bg-sage-800",
        destructive:
          "bg-red-600 text-white shadow-subtle hover:bg-red-700",
        outline:
          "border border-warm-300 bg-white text-charcoal shadow-subtle hover:bg-warm-100 hover:text-charcoal",
        secondary:
          "bg-sage-100 text-sage-800 hover:bg-sage-200",
        ghost: "hover:bg-warm-200/70 text-charcoal hover:text-charcoal",
        link: "text-sage-600 underline-offset-4 hover:underline",
        subtle: "bg-white/10 text-white hover:bg-white/20 border border-white/20",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

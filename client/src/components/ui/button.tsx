import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,#22C55E_0%,#16A34A_100%)] text-white shadow-[0_10px_20px_rgba(22,163,74,0.25)] hover:shadow-[0_10px_20px_rgba(22,163,74,0.40)] hover:brightness-110 focus-visible:ring-[#16A34A] border-0",
        destructive:
          "bg-[#DC2626] text-white shadow-lg hover:bg-[#B91C1C] focus-visible:ring-[#DC2626] border-0",
        outline:
          "border border-[#CBD5E1] shadow-sm bg-transparent hover:bg-[#F1F5F9] text-[#334155] focus-visible:ring-[#16A34A]",
        secondary:
          "bg-[#F1F5F9] text-[#334155] shadow-sm hover:bg-[#E2E8F0] focus-visible:ring-[#16A34A] border border-[#E2E8F0]",
        ghost: "border border-transparent hover:bg-[#F1F5F9] text-[#334155]",
        link: "text-[#2563EB] underline-offset-4 hover:underline hover:text-[#1D4ED8]",
        success:
          "bg-[#16A34A] text-white shadow-lg hover:bg-[#15803D] focus-visible:ring-[#16A34A] border-0",
        warning:
          "bg-[#F59E0B] text-black shadow-lg hover:bg-[#D97706] focus-visible:ring-[#F59E0B] border-0",
        danger:
          "bg-[#DC2626] text-white shadow-lg hover:bg-[#B91C1C] focus-visible:ring-[#DC2626] border-0",
        info:
          "bg-[#2563EB] text-white shadow-lg hover:bg-[#1D4ED8] focus-visible:ring-[#2563EB] border-0",
        gold:
          "bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:from-amber-400 hover:to-yellow-400 border-0",
        purple:
          "bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:from-purple-400 hover:to-violet-400 border-0",
        primaryGradient:
          "bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 text-white shadow-lg shadow-violet-500/25 hover:from-violet-700 hover:via-pink-700 hover:to-amber-600 hover:shadow-violet-500/40 border-0",
        secondaryAccent:
          "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-cyan-600 hover:shadow-emerald-500/40 border-0",
        glassOutline:
          "bg-white/60 backdrop-blur-sm border border-slate-200/50 text-slate-700 shadow-sm hover:bg-white/80 hover:border-slate-300 focus-visible:ring-violet-500",
      },
      size: {
        // @replit changed sizes
        default: "min-h-9 px-4 py-2",
        sm: "min-h-8 rounded-md px-3 text-xs",
        lg: "min-h-10 rounded-md px-8",
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
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

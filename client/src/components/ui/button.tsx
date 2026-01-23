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
          "bg-[linear-gradient(135deg,var(--color-semantic-success)_0%,var(--color-semantic-success)_100%)] text-white shadow-[0_10px_20px_rgba(34,197,94,0.25)] hover:shadow-[0_10px_20px_rgba(34,197,94,0.40)] hover:brightness-110 focus-visible:ring-semantic-success border-0",
        destructive:
          "bg-semantic-danger text-white shadow-lg hover:brightness-90 focus-visible:ring-semantic-danger border-0",
        outline:
          "border border-border shadow-sm bg-transparent hover:bg-muted text-foreground focus-visible:ring-semantic-success",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-muted focus-visible:ring-semantic-success border border-border",
        ghost: "border border-transparent hover:bg-muted text-foreground",
        link: "text-semantic-info underline-offset-4 hover:underline hover:brightness-90",
        success:
          "bg-semantic-success text-white shadow-lg hover:brightness-90 focus-visible:ring-semantic-success border-0",
        warning:
          "bg-gold text-black shadow-lg hover:brightness-90 focus-visible:ring-gold border-0",
        danger:
          "bg-semantic-danger text-white shadow-lg hover:brightness-90 focus-visible:ring-semantic-danger border-0",
        info:
          "bg-semantic-info text-white shadow-lg hover:brightness-90 focus-visible:ring-semantic-info border-0",
        gold:
          "bg-gradient-to-r from-gold to-gold text-black shadow-lg shadow-gold hover:shadow-gold hover:brightness-110 border-0",
        purple:
          "bg-gradient-to-r from-primary to-primary text-white shadow-lg shadow-purple hover:shadow-purple hover:brightness-110 border-0",
        primaryGradient:
          "bg-gradient-to-r from-primary via-primary to-gold text-white shadow-lg shadow-purple hover:brightness-110 border-0",
        secondaryAccent:
          "bg-gradient-to-r from-semantic-success to-system text-white shadow-lg shadow-[rgba(34,197,94,0.25)] hover:brightness-110 border-0",
        glassOutline:
          "bg-card/60 backdrop-blur-sm border border-border text-foreground shadow-sm hover:bg-card/80 hover:border-border focus-visible:ring-primary",
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

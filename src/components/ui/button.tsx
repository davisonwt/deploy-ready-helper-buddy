import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 transform hover:scale-105 cursor-pointer relative overflow-hidden before:absolute before:inset-0 before:bg-white before:opacity-0 hover:before:opacity-10 before:transition-opacity before:duration-300 after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white after:to-transparent after:opacity-0 hover:after:opacity-20 after:transform after:skew-x-12 after:translate-x-full hover:after:translate-x-[-100%] after:transition-transform after:duration-700 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&.neon-button]:overflow-visible [&.neon-button]:before:content-none [&.neon-button]:after:content-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl border-0 ring-2 ring-primary/20 hover:ring-primary/30",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg hover:shadow-xl border-0 ring-2 ring-destructive/20 hover:ring-destructive/30",
        outline: "border-2 border-primary bg-background hover:bg-accent text-primary shadow-md hover:shadow-lg hover:border-primary/80 backdrop-blur-sm",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-md hover:shadow-lg border border-border",
        ghost: "hover:bg-accent text-accent-foreground hover:shadow-md transition-all duration-300",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80 transition-colors duration-200",
        rain: "bg-info text-info-foreground hover:bg-info/90 shadow-lg hover:shadow-xl border-0 ring-2 ring-info/20 hover:ring-info/30 animate-pulse hover:animate-none",
        golden: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-lg hover:shadow-xl border-0 ring-2 ring-warning/20 hover:ring-warning/30",
        harvest: "bg-harvest text-harvest-foreground hover:bg-harvest/90 shadow-lg hover:shadow-xl border-0 ring-2 ring-harvest/20 hover:ring-harvest/30",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-lg hover:shadow-xl border-0 ring-2 ring-success/20 hover:ring-success/30",
        neon: "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500 shadow-lg hover:shadow-xl border-0 relative neon-button z-10",
      },
      size: {
        default: "h-12 px-6 py-3 text-base",
        sm: "h-9 px-4 text-sm",
        lg: "h-14 px-8 text-lg font-semibold",
        xl: "h-16 px-10 text-xl font-bold",
        icon: "h-12 w-12",
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

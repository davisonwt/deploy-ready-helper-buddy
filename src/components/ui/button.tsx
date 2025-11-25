import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 transform hover:scale-105 cursor-pointer relative overflow-visible [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-white text-[#0A1931] border-2 border-[#0A1931] hover:bg-[#0A1931]/5 shadow-md hover:shadow-lg",
        destructive: "bg-white text-[#0A1931] border-2 border-[#0A1931] hover:bg-[#0A1931]/5 shadow-md hover:shadow-lg",
        outline: "bg-white text-[#0A1931] border-2 border-[#0A1931] hover:bg-[#0A1931]/5 shadow-md hover:shadow-lg",
        secondary: "bg-white text-[#0A1931] border-2 border-[#0A1931] hover:bg-[#0A1931]/5 shadow-md hover:shadow-lg",
        ghost: "bg-white text-[#0A1931] border-2 border-[#0A1931] hover:bg-[#0A1931]/5 shadow-md hover:shadow-lg",
        link: "bg-white text-[#0A1931] border-2 border-[#0A1931] hover:bg-[#0A1931]/5 shadow-md hover:shadow-lg underline-offset-4 hover:underline",
        rain: "bg-white text-[#0A1931] border-2 border-[#0A1931] hover:bg-[#0A1931]/5 shadow-md hover:shadow-lg",
        golden: "bg-white text-[#0A1931] border-2 border-[#0A1931] hover:bg-[#0A1931]/5 shadow-md hover:shadow-lg",
        harvest: "bg-white text-[#0A1931] border-2 border-[#0A1931] hover:bg-[#0A1931]/5 shadow-md hover:shadow-lg",
        success: "bg-white text-[#0A1931] border-2 border-[#0A1931] hover:bg-[#0A1931]/5 shadow-md hover:shadow-lg",
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

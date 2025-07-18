import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: string }
>(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "border border-border bg-card text-card-foreground hover:border-primary/30",
    elevated: "border-0 bg-card text-card-foreground shadow-lg hover:shadow-2xl",
    glass: "border border-border/20 bg-card/90 backdrop-blur-lg text-card-foreground",
    gradient: "border-0 bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 text-card-foreground",
    orchard: "border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-card to-primary/5 hover:border-primary/50 hover:shadow-lg text-card-foreground",
    rain: "border-2 border-info/30 bg-gradient-to-br from-info/10 via-card to-info/5 hover:border-info/50 hover:shadow-lg text-card-foreground",
    harvest: "border-2 border-harvest/30 bg-gradient-to-br from-harvest/10 via-card to-harvest/5 hover:border-harvest/50 hover:shadow-lg text-card-foreground"
  }
  
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] relative overflow-hidden",
        "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-background before:to-transparent before:opacity-0 hover:before:opacity-20 before:transform before:translate-x-[-100%] hover:before:translate-x-full before:transition-transform before:duration-1000",
        variants[variant as keyof typeof variants] || variants.default,
        className
      )}
      {...props}
    />
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-2 p-6 pb-4", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-bold leading-tight tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-2", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-4 gap-3", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

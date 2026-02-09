import { HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Predefined explanations for app-specific terminology
export const HELP_TERMS = {
  orchards: 'Your crowdfunding projects that grow with community support',
  sowing: 'Contributing funds to help projects grow',
  rain: 'Sending tips or gifts to creators',
  seeds: 'Starting funds for new projects',
  bestowals: 'Contributions made to support projects',
  whisperer: 'A community ambassador who shares the platform',
  garden: 'Your personal dashboard with all your content and activities',
} as const

interface HelpTooltipProps {
  term: keyof typeof HELP_TERMS
  className?: string
}

export function HelpTooltip({ term, className = '' }: HelpTooltipProps) {
  const explanation = HELP_TERMS[term]
  
  if (!explanation) {
    return null
  }
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button 
            type="button"
            className={`inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors ${className}`}
            aria-label={`What is ${term}?`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-[200px] text-center"
        >
          <p className="text-sm">{explanation}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Inline version that wraps text with tooltip
interface HelpTextProps {
  term: keyof typeof HELP_TERMS
  children: React.ReactNode
  className?: string
}

export function HelpText({ term, children, className = '' }: HelpTextProps) {
  const explanation = HELP_TERMS[term]
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1 cursor-help border-b border-dotted border-current ${className}`}>
            {children}
            <HelpCircle className="h-3 w-3 opacity-60" />
          </span>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-[200px] text-center"
        >
          <p className="text-sm">{explanation}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 🛡️ DEFENSIVE FORMATTING UTILITIES

/**
 * Safe currency formatting with fallback handling
 */
export function formatCurrency(amount: number | string | undefined | null, currency = "USDC", fallback = "0.00") {
  // Handle undefined, null, or empty values
  if (amount === undefined || amount === null || amount === "") {
    return `${fallback} USDC`
  }
  
  // Handle string values
  if (typeof amount === "string") {
    amount = amount.trim()
    if (amount === "") return `${fallback} USDC`
  }
  
  // Convert to number and validate
  const value = parseFloat(String(amount))
  
  // Return fallback if not a valid number
  if (isNaN(value) || !isFinite(value)) {
    return `${fallback} USDC`
  }
  
  // Format to 2 decimal places with USDC suffix
  return `${value.toFixed(2)} USDC`
}

/**
 * Safe amount formatting without currency symbol
 */
export function formatAmount(amount: number | string | undefined | null, fallback = "0.00") {
  if (amount === undefined || amount === null || amount === "") {
    return fallback
  }
  
  if (typeof amount === "string") {
    amount = amount.trim()
    if (amount === "") return fallback
  }
  
  const value = parseFloat(String(amount))
  
  if (isNaN(value) || !isFinite(value)) {
    return fallback
  }
  
  return value.toFixed(2)
}

/**
 * Safe percentage formatting
 */
export function formatPercentage(value: number | string | undefined | null, fallback = "0.0") {
  if (value === undefined || value === null || value === "") {
    return fallback
  }
  
  const numValue = parseFloat(String(value))
  
  if (isNaN(numValue) || !isFinite(numValue)) {
    return fallback
  }
  
  return numValue.toFixed(1)
}

/**
 * Safe integer formatting
 */
export function formatInteger(value: number | string | undefined | null, fallback = 0) {
  if (value === undefined || value === null || value === "") {
    return fallback
  }
  
  const numValue = parseInt(String(value))
  
  if (isNaN(numValue) || !isFinite(numValue)) {
    return fallback
  }
  
  return numValue
}

function getLocaleForCurrency(currencyCode: string) {
  const currencyLocales: Record<string, string> = {
    'USD': 'en-US',
    'EUR': 'de-DE',
    'GBP': 'en-GB',
    'JPY': 'ja-JP',
    'CAD': 'en-CA',
    'AUD': 'en-AU',
    'CHF': 'de-CH',
    'CNY': 'zh-CN',
    'INR': 'hi-IN',
    'ZAR': 'en-ZA',
    'BRL': 'pt-BR',
    'RUB': 'ru-RU',
    'KRW': 'ko-KR',
    'MXN': 'es-MX',
    'SGD': 'en-SG',
    'NZD': 'en-NZ',
    'NOK': 'nb-NO',
    'SEK': 'sv-SE',
    'DKK': 'da-DK',
    'PLN': 'pl-PL'
  }
  
  return currencyLocales[currencyCode] || 'en-US'
}

/**
 * Safe date formatting
 */
export function formatDate(dateValue: string | number | Date | undefined | null, fallback = "Unknown") {
  if (!dateValue) return fallback
  
  try {
    const date = new Date(dateValue)
    if (isNaN(date.getTime())) {
      return fallback
    }
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date)
  } catch (error) {
    return fallback
  }
}

export function formatRelativeTime(dateValue: string | number | Date | undefined | null, fallback = "Unknown") {
  if (!dateValue) return fallback
  
  try {
    const now = new Date()
    const date = new Date(dateValue)
    
    if (isNaN(date.getTime())) {
      return fallback
    }
    
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) {
      return "just now"
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    } else {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days} day${days > 1 ? 's' : ''} ago`
    }
  } catch (error) {
    return fallback
  }
}

// 🌱 ORCHARD-SPECIFIC UTILITIES

export function getGrowthStage(daysGrowing: number | string | undefined | null) {
  const safeDays = formatInteger(daysGrowing, 0)
  if (safeDays <= 7) return "sprout"
  if (safeDays <= 21) return "young"
  if (safeDays <= 42) return "growing"
  return "mature"
}

export function getGrowthStageColor(stage: string) {
  switch (stage) {
    case "sprout": return "bg-green-200 text-green-800"
    case "young": return "bg-green-300 text-green-900"
    case "growing": return "bg-green-400 text-green-900"
    case "mature": return "bg-green-600 text-white"
    default: return "bg-gray-200 text-gray-800"
  }
}

export function calculateCompletionRate(filled: number | string | undefined | null, total: number | string | undefined | null) {
  const safeFilled = formatInteger(filled, 0)
  const safeTotal = formatInteger(total, 0)
  
  if (safeTotal === 0) return 0
  return Math.round((safeFilled / safeTotal) * 100)
}

export function generatePocketGrid(totalPockets: number | string | undefined | null, pocketsPerRow = 10) {
  const safePockets = formatInteger(totalPockets, 0)
  const safePerRow = formatInteger(pocketsPerRow, 10)
  
  const grid: number[] = []
  const rows = Math.ceil(safePockets / safePerRow)
  
  for (let row = 0; row < rows; row++) {
    const pocketsInRow = Math.min(safePerRow, safePockets - (row * safePerRow))
    grid.push(pocketsInRow)
  }
  
  return grid
}

// 🔒 VALIDATION UTILITIES

export function validateEmail(email: string | undefined | null) {
  if (!email || typeof email !== 'string') return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Validates password strength according to security best practices
 * Requirements:
 * - Minimum 10 characters (12+ recommended)
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * 
 * @param password - Password string to validate
 * @returns true if password meets all requirements, false otherwise
 */
export function validatePassword(password: string | undefined | null): boolean {
  if (!password || typeof password !== 'string') return false
  
  // Minimum 10 characters for security
  if (password.length < 10) return false
  
  // Must contain at least one uppercase letter
  if (!/[A-Z]/.test(password)) return false
  
  // Must contain at least one lowercase letter
  if (!/[a-z]/.test(password)) return false
  
  // Must contain at least one number
  if (!/[0-9]/.test(password)) return false
  
  // Must contain at least one special character
  if (!/[^A-Za-z0-9]/.test(password)) return false
  
  return true
}

/**
 * Gets password validation feedback for user display
 * @param password - Password string to validate
 * @returns Object with validation status and feedback messages
 */
export function getPasswordValidationFeedback(password: string | undefined | null): {
  isValid: boolean
  feedback: string[]
  strength: 'weak' | 'fair' | 'strong' | 'very-strong'
} {
  const feedback: string[] = []
  let strength: 'weak' | 'fair' | 'strong' | 'very-strong' = 'weak'
  
  if (!password || typeof password !== 'string') {
    return { isValid: false, feedback: ['Password is required'], strength }
  }
  
  if (password.length < 10) {
    feedback.push(`Password must be at least 10 characters (currently ${password.length})`)
  } else if (password.length >= 16) {
    strength = 'very-strong'
  } else if (password.length >= 12) {
    strength = 'strong'
  } else {
    strength = 'fair'
  }
  
  if (!/[A-Z]/.test(password)) {
    feedback.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    feedback.push('Password must contain at least one lowercase letter')
  }
  
  if (!/[0-9]/.test(password)) {
    feedback.push('Password must contain at least one number')
  }
  
  if (!/[^A-Za-z0-9]/.test(password)) {
    feedback.push('Password must contain at least one special character (!@#$%^&* etc.)')
  }
  
  return {
    isValid: feedback.length === 0,
    feedback,
    strength: feedback.length === 0 ? strength : 'weak'
  }
}

// 🧮 SAFE CALCULATION HELPERS

export function safeAdd(a: number | string | undefined | null, b: number | string | undefined | null) {
  const numA = parseFloat(String(a)) || 0
  const numB = parseFloat(String(b)) || 0
  return numA + numB
}

export function safeMultiply(a: number | string | undefined | null, b: number | string | undefined | null) {
  const numA = parseFloat(String(a)) || 0
  const numB = parseFloat(String(b)) || 0
  return numA * numB
}

export function safeSubtract(a: number | string | undefined | null, b: number | string | undefined | null) {
  const numA = parseFloat(String(a)) || 0
  const numB = parseFloat(String(b)) || 0
  return numA - numB
}

export function safeDivide(a: number | string | undefined | null, b: number | string | undefined | null) {
  const numA = parseFloat(String(a)) || 0
  const numB = parseFloat(String(b)) || 1 // Avoid division by zero
  return numA / numB
}

// ⚡ PERFORMANCE UTILITIES

export function debounce<T extends (...args: unknown[]) => unknown>(func: T, wait: number) {
  let timeout: NodeJS.Timeout
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export function throttle<T extends (...args: unknown[]) => unknown>(func: T, limit: number) {
  let inThrottle: boolean
  return function(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// 🎯 SUPABASE HELPERS

/**
 * Format Supabase error messages for user display
 */
export function formatSupabaseError(error: unknown) {
  if (!error) return "Unknown error occurred"
  
  // Handle common Supabase error patterns
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    if (error.message.includes('duplicate key')) {
      return "This item already exists"
    }
    if (error.message.includes('violates foreign key')) {
      return "Referenced item not found"
    }
    if (error.message.includes('permission denied')) {
      return "You don't have permission to perform this action"
    }
    if (error.message.includes('JWT expired')) {
      return "Your session has expired. Please log in again"
    }
    return error.message
  }
  
  return "An unexpected error occurred"
}

/**
 * Check if user has specific role (for use with RLS policies)
 */
export function hasRole(user: unknown, role: string) {
  if (!user || !role || typeof user !== 'object') return false
  const userWithMetadata = user as { user_metadata?: { roles?: string[] } }
  return userWithMetadata.user_metadata?.roles?.includes(role) || false
}

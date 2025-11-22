/**
 * SECURITY: Input Sanitization and XSS Protection Utilities
 * 
 * This module provides comprehensive input sanitization to prevent XSS attacks
 * and ensure data integrity across the application.
 */

// Enhanced sanitization for different input types
export const sanitizeInput = {
  /**
   * Sanitize text input to prevent XSS attacks
   */
  text: (input: any, maxLength = 1000): string => {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .trim()
      .slice(0, maxLength)
      // Remove HTML tags and potential script injections
      .replace(/<[^>]*>/g, '')
      // Remove potential JavaScript protocols
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/vbscript:/gi, '')
      // Remove potential SQL injection patterns
      .replace(/['";]/g, '')
      // Remove potential XSS patterns
      .replace(/on\w+\s*=/gi, '')
      .replace(/expression\s*\(/gi, '')
      .replace(/url\s*\(/gi, '');
  },

  /**
   * Sanitize HTML content (for rich text editors)
   */
  html: (input: any, maxLength = 5000): string => {
    if (!input || typeof input !== 'string') return '';
    
    const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li'];
    const allowedTagsRegex = new RegExp(`</?(?:${allowedTags.join('|')})(?:\\s[^>]*)?>`, 'gi');
    
    return input
      .trim()
      .slice(0, maxLength)
      // Remove all HTML except allowed tags
      .replace(/<[^>]*>/g, (match) => {
        return allowedTagsRegex.test(match) ? match : '';
      })
      // Remove JavaScript protocols and event handlers
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/expression\s*\(/gi, '');
  },

  /**
   * Sanitize email addresses
   */
  email: (input: any): string => {
    if (!input || typeof input !== 'string') return '';
    
    const email = input.trim().toLowerCase().slice(0, 254);
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    return emailRegex.test(email) ? email : '';
  },

  /**
   * Sanitize URLs to prevent malicious redirects
   */
  url: (input: any): string => {
    if (!input || typeof input !== 'string') return '';
    
    const url = input.trim().slice(0, 2000);
    
    // Only allow http and https protocols
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return '';
    }
    
    // Remove potential XSS in URLs
    return url
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/<[^>]*>/g, '');
  },

  /**
   * Sanitize numeric input
   */
  number: (input: any, min?: number, max?: number): number | null => {
    const num = parseFloat(input);
    
    if (isNaN(num) || !isFinite(num)) return null;
    
    if (min !== undefined && num < min) return null;
    if (max !== undefined && num > max) return null;
    
    return num;
  },

  /**
   * Sanitize phone numbers
   */
  phone: (input: any): string => {
    if (!input || typeof input !== 'string') return '';
    
    // Remove all non-digit characters except + and -
    return input
      .trim()
      .replace(/[^\d+\-\s]/g, '')
      .slice(0, 20);
  },

  /**
   * Sanitize file names
   */
  filename: (input: any): string => {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .trim()
      .slice(0, 255)
      // Remove path traversal attempts
      .replace(/\.\./g, '')
      .replace(/[\/\\]/g, '')
      // Remove potentially dangerous characters
      .replace(/[<>:"|?*]/g, '')
      // Remove null bytes
      .replace(/\0/g, '');
  },

  /**
   * Sanitize JSON input
   */
  json: (input: any, maxDepth = 5): any => {
    if (!input) return null;
    
    try {
      const parsed = typeof input === 'string' ? JSON.parse(input) : input;
      
      // Recursively sanitize JSON object
      const sanitizeObject = (obj: any, depth = 0): any => {
        if (depth > maxDepth) return null;
        
        if (Array.isArray(obj)) {
          return obj.slice(0, 100).map(item => sanitizeObject(item, depth + 1));
        }
        
        if (typeof obj === 'object' && obj !== null) {
          const sanitized: any = {};
          const keys = Object.keys(obj).slice(0, 50); // Limit number of keys
          
          for (const key of keys) {
            const sanitizedKey = sanitizeInput.text(key, 100);
            if (sanitizedKey) {
              sanitized[sanitizedKey] = sanitizeObject(obj[key], depth + 1);
            }
          }
          return sanitized;
        }
        
        if (typeof obj === 'string') {
          return sanitizeInput.text(obj, 1000);
        }
        
        if (typeof obj === 'number') {
          return isFinite(obj) ? obj : null;
        }
        
        if (typeof obj === 'boolean') {
          return obj;
        }
        
        return null;
      };
      
      return sanitizeObject(parsed);
    } catch {
      return null;
    }
  }
};

/**
 * Rate limiting for form submissions
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];
    
    // Remove attempts outside the time window
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    recentAttempts.push(now);
    this.attempts.set(identifier, recentAttempts);
    
    return true;
  }
  
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

// Global rate limiter instances
export const formSubmissionLimiter = new RateLimiter(5, 60000); // 5 attempts per minute
export const aiGenerationLimiter = new RateLimiter(10, 300000); // 10 attempts per 5 minutes

/**
 * MIME type validation for file uploads
 */
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  // Check both MIME type and file extension
  const mimeType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  const fileExtension = fileName.split('.').pop() || '';
  
  // Define allowed MIME types and extensions
  const typeMap: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'video/mp4': ['mp4'],
    'video/webm': ['webm'],
    'application/pdf': ['pdf'],
    'text/plain': ['txt'],
    'application/json': ['json']
  };
  
  for (const allowedType of allowedTypes) {
    if (mimeType === allowedType) {
      const validExtensions = typeMap[allowedType] || [];
      return validExtensions.includes(fileExtension);
    }
  }
  
  return false;
};

/**
 * Content Security Policy headers (for use in components)
 */
export const cspDirectives = {
  'default-src': "'self'",
  'script-src': "'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com https://meet.sow2growapp.com",
  'style-src': "'self' 'unsafe-inline'",
  'font-src': "'self' data: https://meet.sow2growapp.com",
  'img-src': "'self' data: https: blob: https://meet.sow2growapp.com",
  'media-src': "'self' https: blob:",
  'connect-src': "'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co wss://meet.sow2growapp.com https://meet.sow2growapp.com",
  'frame-src': "'self' https://js.stripe.com https://checkout.stripe.com https://meet.sow2growapp.com",
  'object-src': "'none'",
  'base-uri': "'self'",
  'form-action': "'self'"
};
/**
 * SECURITY: Secure Input Components with Built-in Sanitization
 * 
 * These components provide automatic input sanitization and XSS protection
 * while maintaining the same API as regular UI components.
 */

import React, { forwardRef, useCallback } from 'react';
import { Input } from './input';
import { Textarea } from './textarea';
import { sanitizeInput, formSubmissionLimiter } from '@/utils/inputSanitization';
import { useToast } from '@/hooks/use-toast';

interface SecureInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  sanitizeType?: 'text' | 'email' | 'url' | 'phone' | 'filename';
  maxLength?: number;
  rateLimitKey?: string;
}

interface SecureTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  sanitizeType?: 'text' | 'html';
  maxLength?: number;
  rateLimitKey?: string;
}

/**
 * Secure Input component with automatic sanitization
 */
export const SecureInput = forwardRef<HTMLInputElement, SecureInputProps>(
  ({ sanitizeType = 'text', maxLength = 1000, rateLimitKey, onChange, onBlur, ...props }, ref) => {
    const { toast } = useToast();

    const handleSecureChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const originalValue = e.target.value;
      let sanitizedValue: string;

      // Apply appropriate sanitization based on type
      switch (sanitizeType) {
        case 'email':
          sanitizedValue = sanitizeInput.email(originalValue);
          break;
        case 'url':
          sanitizedValue = sanitizeInput.url(originalValue);
          break;
        case 'phone':
          sanitizedValue = sanitizeInput.phone(originalValue);
          break;
        case 'filename':
          sanitizedValue = sanitizeInput.filename(originalValue);
          break;
        default:
          sanitizedValue = sanitizeInput.text(originalValue, maxLength);
      }

      // Check for potential security issues
      if (originalValue !== sanitizedValue && originalValue.length > 0) {
        toast({
          title: "Input Sanitized",
          description: "Some potentially unsafe characters were removed from your input.",
          variant: "destructive"
        });
      }

      // Update the input value
      e.target.value = sanitizedValue;

      // Call original onChange if provided
      if (onChange) {
        onChange(e);
      }
    }, [sanitizeType, maxLength, onChange, toast]);

    const handleSecureBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      // Rate limiting check on blur (for form submissions)
      if (rateLimitKey && !formSubmissionLimiter.isAllowed(rateLimitKey)) {
        toast({
          title: "Rate Limit Exceeded",
          description: "Please wait before submitting again.",
          variant: "destructive"
        });
        return;
      }

      if (onBlur) {
        onBlur(e);
      }
    }, [rateLimitKey, onBlur, toast]);

    return (
      <Input
        {...props}
        ref={ref}
        onChange={handleSecureChange}
        onBlur={handleSecureBlur}
        maxLength={maxLength}
      />
    );
  }
);
SecureInput.displayName = "SecureInput";

/**
 * Secure Textarea component with automatic sanitization
 */
export const SecureTextarea = forwardRef<HTMLTextAreaElement, SecureTextareaProps>(
  ({ sanitizeType = 'text', maxLength = 5000, rateLimitKey, onChange, onBlur, ...props }, ref) => {
    const { toast } = useToast();

    const handleSecureChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const originalValue = e.target.value;
      let sanitizedValue: string;

      // Apply appropriate sanitization based on type
      switch (sanitizeType) {
        case 'html':
          sanitizedValue = sanitizeInput.html(originalValue, maxLength);
          break;
        default:
          sanitizedValue = sanitizeInput.text(originalValue, maxLength);
      }

      // Check for potential security issues
      if (originalValue !== sanitizedValue && originalValue.length > 0) {
        toast({
          title: "Input Sanitized",
          description: "Some potentially unsafe characters were removed from your input.",
          variant: "destructive"
        });
      }

      // Update the textarea value
      e.target.value = sanitizedValue;

      // Call original onChange if provided
      if (onChange) {
        onChange(e);
      }
    }, [sanitizeType, maxLength, onChange, toast]);

    const handleSecureBlur = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
      // Rate limiting check on blur (for form submissions)
      if (rateLimitKey && !formSubmissionLimiter.isAllowed(rateLimitKey)) {
        toast({
          title: "Rate Limit Exceeded",
          description: "Please wait before submitting again.",
          variant: "destructive"
        });
        return;
      }

      if (onBlur) {
        onBlur(e);
      }
    }, [rateLimitKey, onBlur, toast]);

    return (
      <Textarea
        {...props}
        ref={ref}
        onChange={handleSecureChange}
        onBlur={handleSecureBlur}
        maxLength={maxLength}
      />
    );
  }
);
SecureTextarea.displayName = "SecureTextarea";

/**
 * Secure File Input with MIME type validation
 */
interface SecureFileInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  allowedTypes: string[];
  maxSize?: number; // in bytes
  onChange?: (files: FileList | null) => void;
  rateLimitKey?: string;
}

export const SecureFileInput = forwardRef<HTMLInputElement, SecureFileInputProps>(
  ({ allowedTypes, maxSize = 10 * 1024 * 1024, rateLimitKey, onChange, ...props }, ref) => {
    const { toast } = useToast();

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      
      if (!files || files.length === 0) {
        if (onChange) onChange(null);
        return;
      }

      // Rate limiting check
      if (rateLimitKey && !formSubmissionLimiter.isAllowed(rateLimitKey)) {
        toast({
          title: "Rate Limit Exceeded",
          description: "Please wait before uploading again.",
          variant: "destructive"
        });
        e.target.value = '';
        return;
      }

      // Validate each file
      const validFiles: File[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check file size
        if (file.size > maxSize) {
          toast({
            title: "File Too Large",
            description: `File "${file.name}" exceeds the maximum size limit.`,
            variant: "destructive"
          });
          continue;
        }

        // Check file type (simplified validation)
        const isValidType = allowedTypes.some(type => {
          if (type.includes('/')) {
            return file.type === type;
          } else {
            return file.name.toLowerCase().endsWith(`.${type.toLowerCase()}`);
          }
        });

        if (!isValidType) {
          toast({
            title: "Invalid File Type",
            description: `File "${file.name}" is not an allowed file type.`,
            variant: "destructive"
          });
          continue;
        }

        // Sanitize filename
        const sanitizedName = sanitizeInput.filename(file.name);
        if (sanitizedName !== file.name) {
          toast({
            title: "Filename Sanitized",
            description: `Filename for "${file.name}" was cleaned for security.`,
            variant: "default"
          });
        }

        validFiles.push(file);
      }

      if (validFiles.length === 0) {
        e.target.value = '';
        if (onChange) onChange(null);
        return;
      }

      // Create new FileList with valid files (this is a workaround since FileList is readonly)
      const dt = new DataTransfer();
      validFiles.forEach(file => dt.items.add(file));
      
      if (onChange) {
        onChange(dt.files);
      }
    }, [allowedTypes, maxSize, rateLimitKey, onChange, toast]);

    return (
      <Input
        {...props}
        type="file"
        ref={ref}
        onChange={handleFileChange}
        accept={allowedTypes.join(',')}
      />
    );
  }
);
SecureFileInput.displayName = "SecureFileInput";
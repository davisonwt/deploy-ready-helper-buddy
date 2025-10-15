/**
 * Permissive Input Components - Allow all characters including special characters
 * 
 * These components DO NOT sanitize input beyond basic length limits.
 * Use only for contexts where special characters are explicitly allowed.
 */

import React, { forwardRef, useCallback } from 'react';
import { Input } from './input';
import { Textarea } from './textarea';

interface PermissiveInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  maxLength?: number;
}

interface PermissiveTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxLength?: number;
}

/**
 * Permissive Input component - allows all characters
 */
export const PermissiveInput = forwardRef<HTMLInputElement, PermissiveInputProps>(
  ({ maxLength = 1000, onChange, ...props }, ref) => {
    const handlePermissiveChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      // Only enforce max length, allow all characters
      if (maxLength && e.target.value.length > maxLength) {
        e.target.value = e.target.value.slice(0, maxLength);
      }

      // Call original onChange if provided
      if (onChange) {
        onChange(e);
      }
    }, [maxLength, onChange]);

    return (
      <Input
        {...props}
        ref={ref}
        onChange={handlePermissiveChange}
        maxLength={maxLength}
      />
    );
  }
);
PermissiveInput.displayName = "PermissiveInput";

/**
 * Permissive Textarea component - allows all characters
 */
export const PermissiveTextarea = forwardRef<HTMLTextAreaElement, PermissiveTextareaProps>(
  ({ maxLength = 5000, onChange, ...props }, ref) => {
    const handlePermissiveChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      // Only enforce max length, allow all characters
      if (maxLength && e.target.value.length > maxLength) {
        e.target.value = e.target.value.slice(0, maxLength);
      }

      // Call original onChange if provided
      if (onChange) {
        onChange(e);
      }
    }, [maxLength, onChange]);

    return (
      <Textarea
        {...props}
        ref={ref}
        onChange={handlePermissiveChange}
        maxLength={maxLength}
      />
    );
  }
);
PermissiveTextarea.displayName = "PermissiveTextarea";

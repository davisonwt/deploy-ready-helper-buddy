import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sanitizeInput } from "@/utils/inputSanitization";
import { useSecurityLogging } from "@/hooks/useSecurityLogging";
import { useToast } from "@/hooks/use-toast";
import { Shield, AlertTriangle } from "lucide-react";

interface EnhancedSecureInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  sanitizeType?: 'text' | 'email' | 'url' | 'phone' | 'filename';
  maxLength?: number;
  rateLimitKey?: string;
  securityLevel?: 'standard' | 'high' | 'maximum';
  onSecurityViolation?: (violationType: string, details: any) => void;
}

interface EnhancedSecureTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  sanitizeType?: 'text' | 'html';
  maxLength?: number;
  rateLimitKey?: string;
  securityLevel?: 'standard' | 'high' | 'maximum';
  onSecurityViolation?: (violationType: string, details: any) => void;
}

/**
 * Enhanced secure input with advanced threat detection
 */
export const EnhancedSecureInput: React.FC<EnhancedSecureInputProps> = ({
  sanitizeType = 'text',
  maxLength = 1000,
  rateLimitKey,
  securityLevel = 'standard',
  onSecurityViolation,
  onChange,
  onBlur,
  value,
  ...props
}) => {
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([]);
  const [isSecure, setIsSecure] = useState(true);
  const { logSecurityEvent, checkRateLimit } = useSecurityLogging();
  const { toast } = useToast();
  const lastValueRef = useRef<string>('');
  const violationCountRef = useRef<number>(0);

  const detectThreats = (inputValue: string) => {
    const threats: string[] = [];
    
    // XSS detection patterns
    const xssPatterns = [
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[\s\S]*?>/gi,
      /data:text\/html/gi,
      /vbscript:/gi
    ];

    // SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /'(\s)*(OR|AND)\s+'/gi,
      /--[\s\S]*$/gm,
      /\/\*[\s\S]*?\*\//g
    ];

    // Command injection patterns
    const commandPatterns = [
      /[\|&;$`\\]/g,
      /\$\([^)]*\)/g,
      /`[^`]*`/g
    ];

    if (securityLevel === 'maximum' || securityLevel === 'high') {
      xssPatterns.forEach(pattern => {
        if (pattern.test(inputValue)) {
          threats.push('XSS_ATTEMPT');
        }
      });

      sqlPatterns.forEach(pattern => {
        if (pattern.test(inputValue)) {
          threats.push('SQL_INJECTION_ATTEMPT');
        }
      });
    }

    if (securityLevel === 'maximum') {
      commandPatterns.forEach(pattern => {
        if (pattern.test(inputValue)) {
          threats.push('COMMAND_INJECTION_ATTEMPT');
        }
      });
    }

    // Path traversal
    if (inputValue.includes('../') || inputValue.includes('..\\')) {
      threats.push('PATH_TRAVERSAL_ATTEMPT');
    }

    // Excessive length (potential DoS)
    if (inputValue.length > maxLength * 2) {
      threats.push('EXCESSIVE_LENGTH');
    }

    return threats;
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // Threat detection
    const threats = detectThreats(rawValue);
    
    if (threats.length > 0) {
      violationCountRef.current += 1;
      setSecurityWarnings(threats);
      setIsSecure(false);
      
      // Log security violation
      await logSecurityEvent('input_security_violation', {
        threats,
        input_type: sanitizeType,
        field: props.name || 'unknown',
        violation_count: violationCountRef.current
      }, 'warning');

      // Callback for parent component
      onSecurityViolation?.(threats[0], { threats, rawValue });

      // Block input if multiple violations
      if (violationCountRef.current >= 3) {
        toast({
          variant: "destructive",
          title: "Security Alert",
          description: "Multiple security violations detected. Input blocked.",
        });
        return;
      }

      toast({
        variant: "destructive",
        title: "Security Warning",
        description: `Potentially malicious content detected: ${threats.join(', ')}`,
      });
    } else {
      setSecurityWarnings([]);
      setIsSecure(true);
    }

    // Sanitize the input
    const sanitized = sanitizeInput[sanitizeType](rawValue, maxLength);
    
    // Create synthetic event with sanitized value
    const syntheticEvent = {
      ...e,
      target: { ...e.target, value: sanitized }
    };

    lastValueRef.current = sanitized;
    onChange?.(syntheticEvent);
  };

  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    // Rate limiting check on blur
    if (rateLimitKey) {
      const isAllowed = await checkRateLimit(
        `${rateLimitKey}_${e.target.name}`,
        'input_validation',
        20, // 20 validations
        5   // per 5 minutes
      );

      if (!isAllowed) {
        e.preventDefault();
        return;
      }
    }

    onBlur?.(e);
  };

  return (
    <div className="relative">
      <Input
        {...props}
        value={value}
        onChange={handleInputChange}
        onBlur={handleBlur}
        className={`
          ${!isSecure ? 'border-destructive bg-destructive/5' : ''}
          ${securityWarnings.length > 0 ? 'pr-10' : ''}
        `}
      />
      
      {securityWarnings.length > 0 && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>
      )}
      
      {isSecure && securityLevel === 'maximum' && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Shield className="h-4 w-4 text-green-600" />
        </div>
      )}
      
      {securityWarnings.length > 0 && (
        <div className="mt-1 text-xs text-destructive">
          Security issues detected: {securityWarnings.join(', ')}
        </div>
      )}
    </div>
  );
};

/**
 * Enhanced secure textarea with advanced threat detection
 */
export const EnhancedSecureTextarea: React.FC<EnhancedSecureTextareaProps> = ({
  sanitizeType = 'text',
  maxLength = 5000,
  rateLimitKey,
  securityLevel = 'standard',
  onSecurityViolation,
  onChange,
  onBlur,
  value,
  ...props
}) => {
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([]);
  const [isSecure, setIsSecure] = useState(true);
  const { logSecurityEvent, checkRateLimit } = useSecurityLogging();
  const { toast } = useToast();

  const handleTextareaChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const rawValue = e.target.value;
    
    // Basic threat detection (similar to input)
    const threats: string[] = [];
    
    if (securityLevel !== 'standard') {
      if (/<script[\s\S]*?>[\s\S]*?<\/script>/gi.test(rawValue)) {
        threats.push('XSS_ATTEMPT');
      }
      
      if (rawValue.length > maxLength * 1.5) {
        threats.push('EXCESSIVE_LENGTH');
      }
    }

    if (threats.length > 0) {
      setSecurityWarnings(threats);
      setIsSecure(false);
      
      await logSecurityEvent('textarea_security_violation', {
        threats,
        field: props.name || 'unknown'
      }, 'warning');
      
      onSecurityViolation?.(threats[0], { threats, rawValue });
    } else {
      setSecurityWarnings([]);
      setIsSecure(true);
    }

    // Sanitize the input
    const sanitized = sanitizeInput[sanitizeType](rawValue, maxLength);
    
    // Create synthetic event with sanitized value
    const syntheticEvent = {
      ...e,
      target: { ...e.target, value: sanitized }
    };

    onChange?.(syntheticEvent);
  };

  const handleBlur = async (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (rateLimitKey) {
      const isAllowed = await checkRateLimit(`${rateLimitKey}_${e.target.name}`, 'textarea_validation', 15, 10);
      if (!isAllowed) {
        e.preventDefault();
        return;
      }
    }
    onBlur?.(e);
  };

  return (
    <div className="relative">
      <Textarea
        {...props}
        value={value}
        onChange={handleTextareaChange}
        onBlur={handleBlur}
        className={!isSecure ? 'border-destructive bg-destructive/5' : ''}
      />
      
      {securityWarnings.length > 0 && (
        <div className="absolute right-2 top-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>
      )}
      
      {securityWarnings.length > 0 && (
        <div className="mt-1 text-xs text-destructive">
          Security issues: {securityWarnings.join(', ')}
        </div>
      )}
    </div>
  );
};
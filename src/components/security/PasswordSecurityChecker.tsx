import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, Eye, EyeOff, Check, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PasswordStrength {
  score: number;
  feedback: string[];
  isStrong: boolean;
  hasLeakedPassword: boolean;
}

interface PasswordSecurityCheckerProps {
  value: string;
  onChange: (value: string) => void;
  onStrengthChange?: (strength: PasswordStrength) => void;
  label?: string;
  placeholder?: string;
}

export const PasswordSecurityChecker: React.FC<PasswordSecurityCheckerProps> = ({
  value,
  onChange,
  onStrengthChange,
  label = "Password",
  placeholder = "Enter a secure password"
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkPasswordStrength = useCallback(async (password: string): Promise<PasswordStrength> => {
    const feedback: string[] = [];
    let score = 0;
    let hasLeakedPassword = false;

    // Basic length check
    if (password.length >= 8) {
      score += 20;
    } else {
      feedback.push("Use at least 8 characters");
    }

    // Character variety checks
    if (/[a-z]/.test(password)) score += 10;
    else feedback.push("Include lowercase letters");

    if (/[A-Z]/.test(password)) score += 10;
    else feedback.push("Include uppercase letters");

    if (/[0-9]/.test(password)) score += 15;
    else feedback.push("Include numbers");

    if (/[^a-zA-Z0-9]/.test(password)) score += 20;
    else feedback.push("Include special characters");

    // Length bonus
    if (password.length >= 12) score += 15;
    if (password.length >= 16) score += 10;

    // Common patterns penalty
    if (/(.)\1{2,}/.test(password)) {
      score -= 10;
      feedback.push("Avoid repeating characters");
    }

    if (/123|abc|qwe|password|admin/i.test(password)) {
      score -= 20;
      feedback.push("Avoid common patterns and words");
    }

    // Check for leaked passwords (simplified - in production use HaveIBeenPwned API)
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      'letmein', 'welcome', 'monkey', '1234567890', 'dragon'
    ];
    
    if (commonPasswords.some(common => password.toLowerCase().includes(common.toLowerCase()))) {
      hasLeakedPassword = true;
      score = Math.min(score, 30);
      feedback.push("This password appears in common password databases");
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      feedback,
      isStrong: score >= 70 && !hasLeakedPassword,
      hasLeakedPassword
    };
  }, []);

  const handlePasswordChange = useCallback(async (newPassword: string) => {
    onChange(newPassword);
    
    if (newPassword.length > 0) {
      setIsChecking(true);
      const strength = await checkPasswordStrength(newPassword);
      setIsChecking(false);
      onStrengthChange?.(strength);
    } else {
      onStrengthChange?.({
        score: 0,
        feedback: [],
        isStrong: false,
        hasLeakedPassword: false
      });
    }
  }, [onChange, onStrengthChange, checkPasswordStrength]);

  const [currentStrength, setCurrentStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: [],
    isStrong: false,
    hasLeakedPassword: false
  });

  React.useEffect(() => {
    if (value) {
      checkPasswordStrength(value).then(setCurrentStrength);
    }
  }, [value, checkPasswordStrength]);

  const getStrengthColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getStrengthLabel = (score: number) => {
    if (score >= 80) return "Very Strong";
    if (score >= 60) return "Strong";
    if (score >= 40) return "Fair";
    if (score >= 20) return "Weak";
    return "Very Weak";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            value={value}
            onChange={(e) => handlePasswordChange(e.target.value)}
            placeholder={placeholder}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>

        {value && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Password Strength</span>
                <Badge 
                  variant={currentStrength.isStrong ? "default" : "secondary"}
                  className={getStrengthColor(currentStrength.score)}
                >
                  {getStrengthLabel(currentStrength.score)}
                </Badge>
              </div>
              
              <div className="space-y-1">
                <Progress 
                  value={currentStrength.score} 
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground">
                  {currentStrength.score}/100
                </div>
              </div>
            </div>

            {currentStrength.hasLeakedPassword && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-destructive">Security Warning</div>
                  <div className="text-destructive/80">
                    This password has been found in data breaches. Please choose a different password.
                  </div>
                </div>
              </div>
            )}

            {currentStrength.feedback.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Suggestions:</span>
                <div className="space-y-1">
                  {currentStrength.feedback.map((suggestion, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <X className="h-3 w-3 text-red-500" />
                      <span className="text-muted-foreground">{suggestion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStrength.isStrong && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check className="h-4 w-4" />
                <span>Password meets security requirements</span>
              </div>
            )}
          </>
        )}

        {isChecking && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
            <span>Checking password security...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
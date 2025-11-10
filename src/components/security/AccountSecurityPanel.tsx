import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Key,
  Smartphone
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function AccountSecurityPanel() {
  const { user } = useAuth();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return strength;
  };

  const getStrengthLabel = (strength: number) => {
    if (strength <= 1) return { label: 'Weak', color: 'text-red-500' };
    if (strength <= 2) return { label: 'Fair', color: 'text-orange-500' };
    if (strength <= 3) return { label: 'Good', color: 'text-yellow-500' };
    if (strength <= 4) return { label: 'Strong', color: 'text-green-500' };
    return { label: 'Very Strong', color: 'text-green-600' };
  };

  const strength = passwordStrength(newPassword);
  const strengthInfo = getStrengthLabel(strength);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (strength < 3) {
      toast.error('Password is not strong enough. Use at least 12 characters with mixed case, numbers, and special characters.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Password update error:', error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    toast.info('Two-factor authentication setup will be available soon. This feature is being implemented for enhanced security.');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account Security
          </CardTitle>
          <CardDescription>
            Manage your account security settings and protect your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Security Status */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>Security Status: </span>
                <Badge variant="outline" className="ml-2">
                  {user?.email_confirmed_at ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Email Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      Verify Email
                    </span>
                  )}
                </Badge>
              </div>
            </AlertDescription>
          </Alert>

          {/* Two-Factor Authentication */}
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="font-medium flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Two-Factor Authentication (Coming Soon)
                </h4>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
              <Button onClick={handleEnable2FA} variant="outline">
                Enable 2FA
              </Button>
            </div>
          </div>

          {/* Password Change */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Change Password
            </h4>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {newPassword && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            strength <= 1 ? 'bg-red-500 w-1/5' :
                            strength <= 2 ? 'bg-orange-500 w-2/5' :
                            strength <= 3 ? 'bg-yellow-500 w-3/5' :
                            strength <= 4 ? 'bg-green-500 w-4/5' :
                            'bg-green-600 w-full'
                          }`}
                        />
                      </div>
                      <span className={`text-xs font-medium ${strengthInfo.color}`}>
                        {strengthInfo.label}
                      </span>
                    </div>
                    <div className="text-xs space-y-1 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {newPassword.length >= 12 ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span>At least 12 characters</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span>Mixed case letters</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {/\d/.test(newPassword) ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span>Numbers</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {/[^a-zA-Z0-9]/.test(newPassword) ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span>Special characters</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                className="w-full"
              >
                <Key className="h-4 w-4 mr-2" />
                Update Password
              </Button>
            </div>
          </div>

          {/* Security Recommendations */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Security Best Practices:</p>
                <ul className="text-sm space-y-1 ml-4 list-disc">
                  <li>Use a unique password for this account</li>
                  <li>Enable two-factor authentication when available</li>
                  <li>Never share your password with anyone</li>
                  <li>Regularly review your account activity</li>
                  <li>Use a password manager for best security</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
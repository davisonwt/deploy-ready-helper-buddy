import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface CredentialVerificationFormProps {
  roomId: string;
  prefillUsername: string;
  prefillEmail: string;
  userId: string;
  isVerified?: boolean;
}

export const CredentialVerificationForm: React.FC<CredentialVerificationFormProps> = ({ 
  roomId,
  prefillUsername,
  prefillEmail,
  userId,
  isVerified = false 
}) => {
  const [username, setUsername] = useState(prefillUsername || '');
  const [email, setEmail] = useState(prefillEmail || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(isVerified);
  const [error, setError] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  // Real-time validation
  const usernameMatch = username.toLowerCase() === prefillUsername.toLowerCase();
  const emailMatch = email.toLowerCase() === prefillEmail.toLowerCase();
  // Enhanced password validation (client-side UX feedback)
  // Note: Server-side validation in Supabase Dashboard is the real security layer
  const passwordValid = 
    password.length >= 10 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
  
  const allValid = usernameMatch && emailMatch && passwordValid;
  
  // Show field-specific errors
  const showUsernameError = username.length > 0 && !usernameMatch;
  const showEmailError = email.length > 0 && !emailMatch;
  const showPasswordError = password.length > 0 && !passwordValid;

  useEffect(() => {
    // Clear general error when user types
    if (error) setError('');
  }, [username, email, password]);

  const handleVerify = async () => {
    if (!allValid) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Ensure we have a fresh auth token; the edge function requires a valid JWT
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session?.access_token) {
        throw new Error('You are not signed in. Please sign in again and retry verification.');
      }

      console.log('Calling verify-chatapp with:', { username, email, roomId, userId, hasJwt: !!session.access_token });
      
      const { data, error: verifyError } = await supabase.functions.invoke('verify-chatapp', {
        body: { 
          username,
          email,
          password,
          roomId,
          userId
        }
      });

      console.log('Verification response:', { data, error: verifyError });

      if (verifyError) {
        console.error('Supabase function error:', verifyError);
        throw verifyError;
      }

      if (data?.success) {
        setVerified(true);
        toast({
          title: "Credentials Confirmed! ✅",
          description: "You may now close this chat and log in.",
        });

        // Wait 2 seconds then redirect to login
        setTimeout(() => {
          navigate('/login?firstTime=true');
        }, 2000);
      } else {
        const errorMsg = data?.error || 'Credentials do not match our records.';
        console.error('Verification failed with message:', errorMsg);
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error('Verification exception:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));

      // Fallback: direct fetch to functions endpoint if supabase.functions.invoke failed (CORS/proxy issues)
      if (err?.name === 'FunctionsFetchError' || err?.value?.name === 'FunctionsFetchError') {
        try {
          // Use environment variables only (secure approach)
          const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
          const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

          if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            throw new Error('Supabase configuration not found. Please check your environment variables.');
          }

          const { data: s } = await supabase.auth.getSession();
          const access = s?.session?.access_token;

          const resp = await fetch(`${SUPABASE_URL}/functions/v1/verify-chatapp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': access ? `Bearer ${access}` : '',
              apikey: SUPABASE_ANON_KEY,
              'x-client-info': 'manual-fetch-fallback'
            },
            credentials: 'omit',
            body: JSON.stringify({ username, email, password, roomId, userId })
          });

          const json = await resp.json().catch(() => ({}));
          console.log('Fallback fetch response:', resp.status, json);

          if (resp.ok && json?.success) {
            setVerified(true);
            toast({ title: 'Credentials Confirmed! ✅', description: 'You may now close this chat and log in.' });
            setTimeout(() => navigate('/login?firstTime=true'), 2000);
            return;
          }

          const msg = json?.error || `Verification failed (${resp.status}).`;
          setError(msg);
          toast({ title: 'Verification Failed', description: msg, variant: 'destructive' });
          return;
        } catch (fallbackErr: any) {
          console.error('Fallback fetch failed:', fallbackErr);
        }
      }

      setError(err?.message || 'Verification failed. Please check your credentials and try again.');
      toast({
        title: "Verification Failed",
        description: err?.message || "Please check your credentials and try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950 border-2 border-emerald-500 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-semibold">Credentials confirmed!</span>
        </div>
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          You may now close this chat and log in to access all features.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 dark:bg-gray-800 rounded-xl p-4 space-y-3 border border-gray-700">
      <div className="space-y-2">
        <Label htmlFor="username" className="text-white">Username</Label>
        <Input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          className="bg-gray-800 border-gray-600 text-white"
        />
        {showUsernameError && (
          <p className="text-red-400 text-xs flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Username does not match our records.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-white">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="bg-gray-800 border-gray-600 text-white"
        />
        {showEmailError && (
          <p className="text-red-400 text-xs flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Email does not match our records.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-white">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          className="bg-gray-800 border-gray-600 text-white"
        />
        {showPasswordError && (
          <p className="text-red-400 text-xs flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Password must be at least 6 characters.
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
          <p className="text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        </div>
      )}

      <Button
        onClick={handleVerify}
        disabled={!allValid || loading}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium transition-all"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Checking credentials...
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Verify my account
          </>
        )}
      </Button>

      <p className="text-xs text-gray-400 text-center">
        All fields must match your registration details
      </p>
    </div>
  );
};

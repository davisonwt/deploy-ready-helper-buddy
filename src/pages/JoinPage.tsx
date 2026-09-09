import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { getInvitePreview, claimCustomerInvite, type InvitePreview } from '@/hooks/useJobInvoicing';
import { validatePassword, getPasswordValidationFeedback } from '@/lib/utils';

export default function JoinPage() {
  const [params] = useSearchParams();
  const token = params.get('invite');
  const navigate = useNavigate();
  const { user, login, register } = useAuth();

  const [preview, setPreview] = useState<InvitePreview | null | undefined>(undefined);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!token) { setPreview(null); return; }
    getInvitePreview(token).then(setPreview).catch(() => setPreview(null));
  }, [token]);

  useEffect(() => {
    if (preview?.email) setEmail(preview.email);
  }, [preview]);

  const doClaim = async () => {
    if (!token) return;
    setClaiming(true);
    try {
      const result = await claimCustomerInvite(token);
      if (!result.ok) {
        toast.error(inviteError(result.error));
        return;
      }
      toast.success("You're in! Your invite has been accepted — check chat for the estimate.");
      navigate('/chatapp');
    } catch (e: any) {
      toast.error(e?.message || 'Could not accept the invite');
    } finally {
      setClaiming(false);
    }
  };

  // Already signed in when this page loads -- just claim.
  useEffect(() => {
    if (user && token && preview) doClaim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token, preview]);

  const submitLogin = async () => {
    if (!email.trim() || !password) return toast.error('Enter your email and password');
    setSubmitting(true);
    try {
      const result = await login(email.trim(), password);
      if (!result.success) { toast.error(result.error || 'Could not log in'); return; }
      await doClaim();
    } finally {
      setSubmitting(false);
    }
  };

  const submitRegister = async () => {
    if (!firstName.trim() || !lastName.trim()) return toast.error('Enter your name');
    if (!validatePassword(password)) {
      const feedback = getPasswordValidationFeedback(password);
      toast.error(feedback.feedback.join('. ') || 'Choose a stronger password');
      return;
    }
    setSubmitting(true);
    try {
      const result = await register({
        email: email.trim(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        location: 'Unknown',
        currency: 'USD',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        country: 'Unknown',
      });
      if (!result.success) { toast.error(result.error || 'Could not create your account'); return; }
      await doClaim();
    } finally {
      setSubmitting(false);
    }
  };

  if (!token || preview === null) {
    return <Centered><p className="text-muted-foreground">This invite link isn't valid or has expired.</p></Centered>;
  }
  if (preview === undefined) {
    return <Centered><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></Centered>;
  }
  if (claiming) {
    return <Centered><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></Centered>;
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-10 space-y-6">
      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Join {preview.business_name} on Sow2Grow</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in or create an account to see and approve your estimate in chat.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant={mode === 'login' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => setMode('login')}>I have an account</Button>
            <Button variant={mode === 'register' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => setMode('register')}>I'm new</Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="join-email">Email</Label>
            <Input id="join-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="join-first">First name</Label>
                <Input id="join-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="join-last">Last name</Label>
                <Input id="join-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="join-password">Password</Label>
            <Input id="join-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <Button className="w-full" disabled={submitting} onClick={mode === 'login' ? submitLogin : submitRegister}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {mode === 'login' ? 'Log in and join' : 'Create account and join'}
          </Button>
        </CardContent>
      </Card>
      <div className="text-center">
        <Link to="/" className="text-xs text-muted-foreground underline">sow2growapp.com</Link>
      </div>
    </div>
  );
}

function inviteError(code?: string): string {
  switch (code) {
    case 'invite_expired': return 'This invite link has expired. Ask the business to resend it.';
    case 'email_mismatch': return "That account's email doesn't match this invite. Log in with the email the invite was sent to.";
    case 'invite_not_found': return "This invite link isn't valid.";
    default: return 'Could not accept the invite.';
  }
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[50vh] items-center justify-center px-4">{children}</div>;
}

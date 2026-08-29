import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const RESEND_COOLDOWN_SECONDS = 60;

interface Props {
  email: string;
  onVerified: () => void;
}

/** Thrown on a non-2xx response; `code` is the function's own `error` field, `attemptsRemaining`/`retryAfterSeconds` carried through when present. */
class VerifyError extends Error {
  attemptsRemaining?: number;
  retryAfterSeconds?: number;
}

async function invokeVerify(action: 'send' | 'verify', email: string, code?: string) {
  const { data, error } = await supabase.functions.invoke('paypal-email-verify', {
    body: { action, email, ...(code ? { code } : {}) },
  });
  if (error) {
    // Non-2xx: supabase-js puts the raw Response on error.context — read its
    // JSON body for the function's real error code, rather than the generic
    // "Edge Function returned a non-2xx status code" message.
    let body: any = null;
    try { body = await (error as any)?.context?.json?.(); } catch { /* not JSON, or already consumed */ }
    const e = new VerifyError(body?.error || (error as any)?.message || 'Request failed');
    e.attemptsRemaining = body?.attemptsRemaining;
    e.retryAfterSeconds = body?.retryAfterSeconds;
    throw e;
  }
  return data as any;
}

/**
 * Inline "Verify" control for a single unverified PayPal email wallet row.
 * Send a 6-digit code -> enter it -> user_wallets.verified_at gets set
 * server-side (paypal-email-verify). 10-minute code expiry, 3 attempts,
 * 60s between resends -- all enforced server-side; this component just
 * reflects that back.
 */
export default function VerifyPaypalEmailControl({ email, onVerified }: Props) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startCooldown = (seconds: number = RESEND_COOLDOWN_SECONDS) => {
    setCooldown(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1 && timerRef.current) clearInterval(timerRef.current);
        return Math.max(0, c - 1);
      });
    }, 1000);
  };

  const sendCode = async () => {
    setSending(true);
    try {
      await invokeVerify('send', email);
      setOpen(true);
      setAttemptsRemaining(null);
      setCode('');
      startCooldown();
      toast.success('Verification code sent', { description: `Check ${email} for a 6-digit code.` });
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to send code';
      if (msg === 'resend_too_soon') {
        setOpen(true);
        startCooldown(typeof e?.retryAfterSeconds === 'number' ? e.retryAfterSeconds : RESEND_COOLDOWN_SECONDS);
        toast.error('Please wait before requesting another code.');
      } else {
        toast.error(msg);
      }
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6) return;
    setVerifying(true);
    try {
      await invokeVerify('verify', email, code);
      toast.success('PayPal email verified!');
      setOpen(false);
      setCode('');
      onVerified();
    } catch (e: any) {
      const msg = e?.message ?? 'Verification failed';
      if (msg === 'code_expired') {
        toast.error('That code expired. Send a new one.');
        setAttemptsRemaining(null);
      } else if (msg === 'too_many_attempts') {
        toast.error('Too many attempts. Send a new code.');
        setAttemptsRemaining(0);
      } else if (msg === 'invalid_code') {
        setAttemptsRemaining(typeof e?.attemptsRemaining === 'number' ? e.attemptsRemaining : null);
        toast.error('Incorrect code. Please try again.');
      } else {
        toast.error(msg);
      }
    } finally {
      setVerifying(false);
    }
  };

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={sendCode} disabled={sending || cooldown > 0} className="gap-1">
        {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Verify'}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="6-digit code"
        inputMode="numeric"
        className="w-28 font-mono"
        maxLength={6}
        onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 6) verifyCode(); }}
      />
      <Button size="sm" onClick={verifyCode} disabled={verifying || code.length !== 6}>
        {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm'}
      </Button>
      <Button size="sm" variant="ghost" onClick={sendCode} disabled={sending || cooldown > 0}>
        {cooldown > 0 ? `${cooldown}s` : 'Resend'}
      </Button>
      {attemptsRemaining != null && (
        <span className="text-xs text-muted-foreground">{attemptsRemaining} attempt{attemptsRemaining === 1 ? '' : 's'} left</span>
      )}
    </div>
  );
}

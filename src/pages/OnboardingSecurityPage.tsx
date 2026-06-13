import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SECURITY_QUESTIONS } from "@/lib/securityQuestions";
import { useAuth } from "@/hooks/useAuth";

export default function OnboardingSecurityPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated, loading, reinitializeAuth } = useAuth();
  const [picks, setPicks] = useState<string[]>(["", "", ""]);
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);

  const available = useMemo(
    () =>
      SECURITY_QUESTIONS.map((q) => ({
        ...q,
        disabledIn: (idx: number) => picks.some((p, i) => i !== idx && p === q.label),
      })),
    [picks]
  );

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !user?.id) {
      navigate("/login", { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      const [{ data: profile }, { data: securityQuestions }] = await Promise.all([
        supabase
          .from("profiles")
          .select("security_setup_complete")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_security_questions")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      if (profile?.security_setup_complete || securityQuestions?.user_id) {
        navigate("/dashboard", { replace: true });
        return;
      }
      setCheckingExisting(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loading, navigate, user?.id]);

  if (loading || checkingExisting) return null;

  const canSubmit =
    picks.every((p) => p.trim().length > 0) &&
    answers.every((a) => a.trim().length >= 2) &&
    new Set(picks).size === 3;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const { error } = await supabase.rpc("set_security_questions", {
      q1: picks[0], a1: answers[0],
      q2: picks[1], a2: answers[1],
      q3: picks[2], a3: answers[2],
    });
    setSubmitting(false);
    if (error) {
      toast({ variant: "destructive", title: "Could not save", description: error.message });
      return;
    }
    toast({
      title: "You're all set 🔒",
      description: "Your account is fully activated. All communication on Sow2Grow stays private.",
    });
    await reinitializeAuth?.();
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Secure your account</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            To protect your privacy and ensure you never lose access to your account, please set up your
            security questions. Sow2Grow keeps all your communication private — you will never need to
            share your phone number or personal contact details with anyone here.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {[0, 1, 2].map((idx) => (
            <div key={idx} className="space-y-2">
              <div className="text-sm font-medium">Security question {idx + 1}</div>
              <Select
                value={picks[idx]}
                onValueChange={(v) => setPicks((p) => p.map((x, i) => (i === idx ? v : x)))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a question" />
                </SelectTrigger>
                <SelectContent>
                  {available.map((q) => (
                    <SelectItem
                      key={q.key}
                      value={q.label}
                      disabled={q.disabledIn(idx)}
                    >
                      {q.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Your answer"
                value={answers[idx]}
                onChange={(e) => {
                  const v = e.currentTarget?.value ?? "";
                  setAnswers((a) => a.map((x, i) => (i === idx ? v : x)));
                }}
                autoComplete="off"
              />
            </div>
          ))}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            Answers are hashed and stored encrypted. They are case-insensitive.
          </div>
          <Button
            className="w-full"
            size="lg"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Saving…" : "Activate my account"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Step = "email" | "questions" | "password" | "done" | "locked";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [questions, setQuestions] = useState<string[]>(["", "", ""]);
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchQuestions = async () => {
    if (!email) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("get_security_questions_for_email", {
      p_email: email,
    });
    setBusy(false);
    if (error || !data || data.length === 0) {
      toast({ variant: "destructive", title: "Unable to start recovery", description: "Please try again." });
      return;
    }
    const row = data[0] as any;
    setQuestions([row.question_1, row.question_2, row.question_3]);
    setStep("questions");
  };

  const verifyAnswers = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("verify_security_answers_and_issue_token", {
      p_email: email,
      p_a1: answers[0],
      p_a2: answers[1],
      p_a3: answers[2],
    });
    setBusy(false);
    const row = (data as any)?.[0];
    if (error || !row) {
      toast({ variant: "destructive", title: "Verification failed" });
      return;
    }
    if (row.locked) {
      setStep("locked");
      return;
    }
    if (!row.success) {
      toast({ variant: "destructive", title: "Incorrect answers" });
      return;
    }
    setToken(row.token);
    setStep("password");
  };

  const completeReset = async () => {
    if (password.length < 10) {
      toast({ variant: "destructive", title: "Password too short", description: "Use at least 10 characters." });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("reset-password-via-questions", {
      body: { token, new_password: password },
    });
    setBusy(false);
    if (error || !(data as any)?.success) {
      toast({ variant: "destructive", title: "Could not reset password" });
      return;
    }
    setStep("done");
    setTimeout(() => navigate("/login", { replace: true }), 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Recover your account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "email" && (
            <>
              <p className="text-sm text-muted-foreground">
                Enter the email on your account. We will ask the security questions you chose during setup —
                we never send recovery emails or SMS.
              </p>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.currentTarget?.value ?? "")}
              />
              <Button className="w-full" disabled={busy || !email} onClick={fetchQuestions}>
                Continue
              </Button>
            </>
          )}

          {step === "questions" && (
            <>
              {questions.map((q, i) => (
                <div key={i} className="space-y-1">
                  <div className="text-sm font-medium">{q}</div>
                  <Input
                    value={answers[i]}
                    onChange={(e) => {
                      const v = e.currentTarget?.value ?? "";
                      setAnswers((a) => a.map((x, idx) => (idx === i ? v : x)));
                    }}
                  />
                </div>
              ))}
              <Button
                className="w-full"
                disabled={busy || answers.some((a) => a.trim().length < 2)}
                onClick={verifyAnswers}
              >
                Verify answers
              </Button>
            </>
          )}

          {step === "password" && (
            <>
              <p className="text-sm text-muted-foreground">Choose a new password (min 10 characters).</p>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget?.value ?? "")}
              />
              <Button className="w-full" disabled={busy} onClick={completeReset}>
                Set new password
              </Button>
            </>
          )}

          {step === "done" && (
            <p className="text-sm">Password updated. Redirecting to sign in…</p>
          )}

          {step === "locked" && (
            <p className="text-sm">
              For your safety this account is temporarily locked. Please contact support through the
              in-app ChatApp.
            </p>
          )}

          <div className="text-center text-sm">
            <Link to="/login" className="text-primary hover:underline">
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

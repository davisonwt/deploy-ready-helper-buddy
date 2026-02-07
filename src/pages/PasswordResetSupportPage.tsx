import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Lock, Mail, CheckCircle, Shield, Loader2, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Step = "email" | "questions" | "success";

interface SecurityQuestions {
  question_1: string;
  question_2: string;
  question_3: string;
}

export default function PasswordResetSupportPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [questions, setQuestions] = useState<SecurityQuestions | null>(null);
  const [answer1, setAnswer1] = useState("");
  const [answer2, setAnswer2] = useState("");
  const [answer3, setAnswer3] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [noQuestions, setNoQuestions] = useState(false);
  const navigate = useNavigate();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("password-reset-with-security", {
        body: { action: "get-questions", email: email.trim().toLowerCase() }
      });

      if (fnError) throw new Error(fnError.message);
      
      if (data?.noQuestions) {
        setNoQuestions(true);
        setError(data.error);
        return;
      }
      
      if (data?.error) throw new Error(data.error);

      if (data?.questions) {
        setQuestions(data.questions);
        setStep("questions");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!answer1.trim() || !answer2.trim() || !answer3.trim()) {
      setError("Please answer all security questions");
      return;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("password-reset-with-security", {
        body: {
          action: "verify-and-reset",
          email: email.trim().toLowerCase(),
          answer1: answer1.trim(),
          answer2: answer2.trim(),
          answer3: answer3.trim(),
          newPassword: password
        }
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setStep("success");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-amber-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-lg border-0 shadow-2xl">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-green-700 mb-2">Password Reset Successful!</h2>
              <p className="text-muted-foreground">
                Your password has been updated. You can now log in with your new password.
              </p>
            </div>
            <Button
              onClick={() => navigate("/login")}
              className="w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Security questions step
  if (step === "questions" && questions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-amber-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Link 
            to="/login" 
            className="inline-flex items-center text-blue-700 hover:text-blue-600 mb-6 transition-all duration-300 hover:scale-105 font-medium group bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full shadow-md hover:shadow-lg"
          >
            <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
            Back to Login
          </Link>

          <Card className="bg-white/95 backdrop-blur-lg border-0 shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-green-100 rounded-full flex items-center justify-center">
                  <HelpCircle className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <CardTitle className="text-xl text-blue-700" style={{ fontFamily: "Playfair Display, serif" }}>
                Answer Security Questions
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Answer all 3 questions correctly to reset your password.
              </p>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleResetSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Question 1 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-blue-700">{questions.question_1}</Label>
                  <Input
                    type="text"
                    value={answer1}
                    onChange={(e) => setAnswer1(e.target.value)}
                    placeholder="Your answer"
                    disabled={loading}
                    autoComplete="off"
                  />
                </div>

                {/* Question 2 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-green-700">{questions.question_2}</Label>
                  <Input
                    type="text"
                    value={answer2}
                    onChange={(e) => setAnswer2(e.target.value)}
                    placeholder="Your answer"
                    disabled={loading}
                    autoComplete="off"
                  />
                </div>

                {/* Question 3 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-amber-700">{questions.question_3}</Label>
                  <Input
                    type="text"
                    value={answer3}
                    onChange={(e) => setAnswer3(e.target.value)}
                    placeholder="Your answer"
                    disabled={loading}
                    autoComplete="off"
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium text-foreground mb-3">New Password</h4>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center">
                        <Lock className="h-4 w-4 mr-2 text-primary" />
                        New Password
                      </Label>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter new password (min 8 characters)"
                        disabled={loading}
                        minLength={8}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center">
                        <Lock className="h-4 w-4 mr-2 text-primary" />
                        Confirm Password
                      </Label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white py-3 shadow-lg"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Email entry step (default)
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link 
          to="/login" 
          className="inline-flex items-center text-blue-700 hover:text-blue-600 mb-6 transition-all duration-300 hover:scale-105 font-medium group bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full shadow-md hover:shadow-lg"
        >
          <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Back to Login
        </Link>

        <Card className="bg-white/95 backdrop-blur-lg border-0 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-green-100 rounded-full flex items-center justify-center">
                <Lock className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-xl text-blue-700" style={{ fontFamily: "Playfair Display, serif" }}>
              Reset Your Password
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Enter your email to retrieve your security questions.
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleEmailSubmit} className="space-y-5">
              {error && (
                <Alert variant={noQuestions ? "default" : "destructive"} className={noQuestions ? "bg-amber-50 border-amber-200" : ""}>
                  <AlertDescription className={noQuestions ? "text-amber-700" : ""}>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-blue-700 flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-blue-500" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full"
                  disabled={loading}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white py-3 shadow-lg hover:shadow-xl transition-all duration-300"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading Questions...
                  </span>
                ) : (
                  "Continue"
                )}
              </Button>

              <Alert className="bg-blue-50 border-blue-200">
                <Shield className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700 text-sm">
                  You'll need to answer the security questions you set up during registration to reset your password.
                </AlertDescription>
              </Alert>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

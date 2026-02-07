import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Lock, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Predefined security questions
export const SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  "What was the name of your first pet?",
  "What city were you born in?",
  "What was the name of your elementary school?",
  "What is your favorite book?",
  "What was the make of your first car?",
  "What is your favorite movie?",
  "What street did you grow up on?",
  "What was the name of your childhood best friend?",
  "What is the middle name of your oldest sibling?",
  "What was your childhood nickname?",
  "What is the name of the town where your grandparents lived?",
  "What was your favorite food as a child?",
  "What was your first job?",
  "What is the name of your favorite teacher?",
];

interface SecurityQuestionsSetupProps {
  onComplete: () => void;
  userId?: string;
  isRegistration?: boolean;
}

// Simple hash function for answer verification
async function hashAnswer(answer: string): Promise<string> {
  const normalized = answer.trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function SecurityQuestionsSetup({ onComplete, userId, isRegistration = false }: SecurityQuestionsSetupProps) {
  const [question1, setQuestion1] = useState("");
  const [answer1, setAnswer1] = useState("");
  const [question2, setQuestion2] = useState("");
  const [answer2, setAnswer2] = useState("");
  const [question3, setQuestion3] = useState("");
  const [answer3, setAnswer3] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getAvailableQuestions = (exclude: string[]) => {
    return SECURITY_QUESTIONS.filter(q => !exclude.includes(q));
  };

  const validateForm = (): string | null => {
    if (!question1 || !question2 || !question3) return "Please select all 3 security questions";
    if (!answer1.trim() || !answer2.trim() || !answer3.trim()) return "Please answer all 3 questions";
    if (answer1.trim().length < 2 || answer2.trim().length < 2 || answer3.trim().length < 2) {
      return "Answers must be at least 2 characters long";
    }
    if (question1 === question2 || question2 === question3 || question1 === question3) {
      return "Please select 3 different questions";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Get current user if not provided
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        currentUserId = user.id;
      }

      // Hash the answers
      const [hash1, hash2, hash3] = await Promise.all([
        hashAnswer(answer1),
        hashAnswer(answer2),
        hashAnswer(answer3)
      ]);

      // Insert security questions
      const { error: insertError } = await supabase
        .from("user_security_questions")
        .upsert({
          user_id: currentUserId,
          question_1: question1,
          answer_1_hash: hash1,
          question_2: question2,
          answer_2_hash: hash2,
          question_3: question3,
          answer_3_hash: hash3,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

      if (insertError) throw insertError;

      onComplete();
    } catch (err: any) {
      console.error("Error saving security questions:", err);
      setError(err.message || "Failed to save security questions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white/95 backdrop-blur-lg border-0 shadow-2xl">
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-green-100 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <CardTitle className="text-xl text-blue-700" style={{ fontFamily: "Playfair Display, serif" }}>
          Set Up Security Questions
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          These questions will be used to verify your identity if you need to reset your password.
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Question 1 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-blue-700 flex items-center">
              <Lock className="h-4 w-4 mr-2 text-blue-500" />
              Security Question 1
            </Label>
            <Select value={question1} onValueChange={setQuestion1}>
              <SelectTrigger>
                <SelectValue placeholder="Select a security question" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableQuestions([question2, question3]).map((q) => (
                  <SelectItem key={q} value={q}>{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label className="text-sm font-medium text-green-700 flex items-center">
              <Lock className="h-4 w-4 mr-2 text-green-500" />
              Security Question 2
            </Label>
            <Select value={question2} onValueChange={setQuestion2}>
              <SelectTrigger>
                <SelectValue placeholder="Select a security question" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableQuestions([question1, question3]).map((q) => (
                  <SelectItem key={q} value={q}>{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label className="text-sm font-medium text-amber-700 flex items-center">
              <Lock className="h-4 w-4 mr-2 text-amber-500" />
              Security Question 3
            </Label>
            <Select value={question3} onValueChange={setQuestion3}>
              <SelectTrigger>
                <SelectValue placeholder="Select a security question" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableQuestions([question1, question2]).map((q) => (
                  <SelectItem key={q} value={q}>{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="text"
              value={answer3}
              onChange={(e) => setAnswer3(e.target.value)}
              placeholder="Your answer"
              disabled={loading}
              autoComplete="off"
            />
          </div>

          <Alert className="bg-amber-50 border-amber-200">
            <Shield className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 text-sm">
              Remember your answers! They are case-insensitive but must match exactly. You'll need them to reset your password.
            </AlertDescription>
          </Alert>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white py-3 shadow-lg"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                {isRegistration ? "Complete Registration" : "Save Security Questions"}
              </span>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

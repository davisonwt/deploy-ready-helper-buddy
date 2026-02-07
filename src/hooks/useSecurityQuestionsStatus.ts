import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SecurityQuestionsStatus {
  hasSecurityQuestions: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSecurityQuestionsStatus(): SecurityQuestionsStatus {
  const [hasSecurityQuestions, setHasSecurityQuestions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHasSecurityQuestions(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("user_security_questions")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (queryError) {
        console.error("Error checking security questions:", queryError);
        setError(queryError.message);
        return;
      }

      setHasSecurityQuestions(!!data);
    } catch (err: any) {
      console.error("Error in useSecurityQuestionsStatus:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return {
    hasSecurityQuestions,
    loading,
    error,
    refetch: checkStatus
  };
}

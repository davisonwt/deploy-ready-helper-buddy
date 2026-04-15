import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type ShepherdContext = 'sow-description' | 'progress-update' | 'harvest-story' | 'bestower-suggestion';

interface UseOrchardShepherdResult {
  generateText: (context: ShepherdContext, input: Record<string, any>) => Promise<string>;
  isLoading: boolean;
  error: string | null;
}

export function useOrchardShepherd(): UseOrchardShepherdResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateText = async (context: ShepherdContext, input: Record<string, any>): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('orchard-shepherd', {
        body: { context, input },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      return data?.text || '';
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'The Shepherd is resting';
      setError(msg);
      return '';
    } finally {
      setIsLoading(false);
    }
  };

  return { generateText, isLoading, error };
}

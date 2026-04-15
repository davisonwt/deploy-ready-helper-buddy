import { useState, useEffect } from 'react';
import { Leaf, Sparkles, ArrowRight } from 'lucide-react';
import { useOrchardShepherd } from '@/hooks/useOrchardShepherd';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ShepherdSuggestionsProps {
  orchardTitle: string;
}

export function ShepherdSuggestions({ orchardTitle }: ShepherdSuggestionsProps) {
  const { generateText, isLoading } = useOrchardShepherd();
  const [suggestion, setSuggestion] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    generateText('bestower-suggestion', {
      justBestowedTo: orchardTitle,
    }).then((text) => {
      if (text) setSuggestion(text);
    });
  }, [orchardTitle]);

  if (!suggestion && !isLoading) return null;

  return (
    <div className="rounded-xl bg-gradient-to-br from-amber-50/50 to-emerald-50/50 border border-amber-200/30 p-5 space-y-3">
      <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
        <Sparkles className="h-3 w-3" />
        <span>A whisper from the Shepherd</span>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Finding orchards that might warm your heart…</span>
        </div>
      ) : (
        <>
          <p className="text-sm text-foreground/80 leading-relaxed">
            🌿 {suggestion}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/browse-orchards')}
            className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            Explore orchards
            <ArrowRight className="h-3 w-3" />
          </Button>
        </>
      )}
    </div>
  );
}

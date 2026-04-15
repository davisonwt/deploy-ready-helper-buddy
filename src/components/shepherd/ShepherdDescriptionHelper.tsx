import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Leaf, Loader2, Sparkles } from 'lucide-react';
import { useOrchardShepherd } from '@/hooks/useOrchardShepherd';

interface ShepherdDescriptionHelperProps {
  currentDescription: string;
  orchardTitle: string;
  onApply: (description: string) => void;
}

export function ShepherdDescriptionHelper({ currentDescription, orchardTitle, onApply }: ShepherdDescriptionHelperProps) {
  const { generateText, isLoading } = useOrchardShepherd();
  const [suggestion, setSuggestion] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleGenerate = async () => {
    setIsExpanded(true);
    const text = await generateText('sow-description', {
      title: orchardTitle,
      roughDescription: currentDescription,
    });
    if (text) setSuggestion(text);
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={isLoading}
        className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Leaf className="h-4 w-4" />
        )}
        Let the Shepherd help describe your seed
      </Button>

      {isExpanded && suggestion && (
        <div className="rounded-xl border border-emerald-200/50 bg-emerald-50/30 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-emerald-600">
            <Sparkles className="h-3 w-3" />
            <span>From the Orchard Shepherd</span>
          </div>
          <Textarea
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            rows={3}
            className="bg-white/70 border-emerald-200/50 text-sm"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onApply(suggestion);
                setIsExpanded(false);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
            >
              <Leaf className="h-3 w-3" />
              Use this description
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(false)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

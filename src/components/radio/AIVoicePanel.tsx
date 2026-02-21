import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Volume2, VolumeX, Mic, ArrowLeft, Loader2 } from 'lucide-react';

interface AIVoicePanelProps {
  segmentDurationMinutes: number;
  onStartTeleprompterRecord: (script: string) => void;
  onBack: () => void;
}

export const AIVoicePanel: React.FC<AIVoicePanelProps> = ({
  segmentDurationMinutes,
  onStartTeleprompterRecord,
  onBack,
}) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [polishedScript, setPolishedScript] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const polishScript = useCallback(async () => {
    if (!notes.trim()) {
      toast({ title: 'Enter some notes first', variant: 'destructive' });
      return;
    }
    setIsPolishing(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-radio-script', {
        body: { notes: notes.trim() },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: 'AI Error', description: data.error, variant: 'destructive' });
        return;
      }
      setPolishedScript(data.script || '');
      toast({ title: 'Script polished! ✨' });
    } catch (err: any) {
      console.error('Polish error:', err);
      toast({ title: 'Failed to polish script', description: err.message, variant: 'destructive' });
    } finally {
      setIsPolishing(false);
    }
  }, [notes, toast]);

  const listenToScript = useCallback(() => {
    const text = polishedScript || notes;
    if (!text.trim()) {
      toast({ title: 'Nothing to read aloud', variant: 'destructive' });
      return;
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [polishedScript, notes, isSpeaking, toast]);

  // Cleanup speech on unmount
  React.useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const scriptToRecord = polishedScript || notes;

  return (
    <div className="space-y-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">AI Script Helper</span>
      </div>

      {/* Step 1: Rough notes */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">
          Type your rough notes or bullet points:
        </p>
        <Textarea
          placeholder="e.g. welcome listeners, tonight's theme is gospel praise, shout out to Sister Mary, remind about prayer meeting on Friday..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="text-sm min-h-[80px]"
        />
      </div>

      {/* Polish button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full text-xs gap-1.5"
        onClick={polishScript}
        disabled={isPolishing || !notes.trim()}
      >
        {isPolishing ? (
          <><Loader2 className="h-3 w-3 animate-spin" /> Polishing...</>
        ) : (
          <><Sparkles className="h-3 w-3" /> Polish Script</>
        )}
      </Button>

      {/* Step 2: Polished script (editable) */}
      {polishedScript && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">
            Polished script (edit if needed):
          </p>
          <Textarea
            value={polishedScript}
            onChange={(e) => setPolishedScript(e.target.value)}
            className="text-sm min-h-[100px] bg-background"
          />
        </div>
      )}

      {/* Listen + Record buttons */}
      {(polishedScript || notes.trim()) && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 flex-1"
            onClick={listenToScript}
          >
            {isSpeaking ? (
              <><VolumeX className="h-3 w-3" /> Stop</>
            ) : (
              <><Volume2 className="h-3 w-3" /> Listen</>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 flex-1 border-primary/50 text-primary hover:bg-primary/10"
            onClick={() => onStartTeleprompterRecord(scriptToRecord)}
          >
            <Mic className="h-3 w-3" /> Record This
          </Button>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        💡 "Listen" uses your browser's text-to-speech. "Record This" starts mic recording with the script visible.
      </p>
    </div>
  );
};

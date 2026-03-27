import React, { useState, useCallback } from 'react';
import { Sprout, Pencil, Check, X } from 'lucide-react';
import { useSeedStory } from '@/hooks/useSeedStory';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SowerStoryStripProps {
  seedId: string;
  sowerName: string;
  seedTitle: string;
  daysSincePlanted: number;
  bestowalsCount: number;
  engagements: number;
  seedCategory: string;
  /** The user_id of the sower who owns this seed */
  sowerUserId?: string;
  /** Current logged-in user id */
  currentUserId?: string;
}

export const SowerStoryStrip: React.FC<SowerStoryStripProps> = (props) => {
  const { story, loading, setStoryOverride } = useSeedStory(props);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const isOwner = !!(props.currentUserId && props.sowerUserId && props.currentUserId === props.sowerUserId);

  const handleStartEdit = useCallback(() => {
    setEditText(story || '');
    setEditing(true);
  }, [story]);

  const handleSave = useCallback(async () => {
    if (!editText.trim() || !props.currentUserId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('seed_story_overrides' as any)
        .upsert({
          seed_id: props.seedId,
          user_id: props.currentUserId,
          story_text: editText.trim(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'seed_id,user_id' });

      if (error) throw error;
      setStoryOverride(editText.trim());
      setEditing(false);
      toast({ title: 'Story updated! ✍️' });
    } catch (err: any) {
      toast({ title: 'Error saving story', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [editText, props.seedId, props.currentUserId, setStoryOverride, toast]);

  if (loading) {
    return (
      <div
        className="mx-3 my-1 rounded-r-lg"
        style={{
          borderLeft: '2px solid #1D9E75',
          padding: '10px 12px',
          background: 'hsl(210 50% 14% / 0.7)',
        }}
      >
        <div className="flex items-center gap-1 mb-1.5">
          <Sprout className="w-3 h-3 text-emerald-400" />
          <span className="font-semibold uppercase tracking-wider text-emerald-400" style={{ fontSize: '10px' }}>
            Sower's story
          </span>
        </div>
        <div className="space-y-1.5 animate-pulse">
          <div className="h-3 rounded w-full" style={{ background: 'hsl(210 30% 25%)' }} />
          <div className="h-3 rounded w-4/5" style={{ background: 'hsl(210 30% 25%)' }} />
        </div>
      </div>
    );
  }

  if (!story && !editing) return null;

  const isLong = (story || '').length > 200;
  const displayText = !expanded && isLong ? (story || '').slice(0, 200).trimEnd() + '…' : story;

  return (
    <div
      className="mx-3 my-1 rounded-r-lg"
      style={{
        borderLeft: '2px solid #1D9E75',
        padding: '10px 12px',
        background: 'hsl(210 50% 14% / 0.7)',
      }}
    >
      <div className="flex items-center gap-1 mb-1">
        <Sprout className="w-3 h-3 text-emerald-400" />
        <span className="font-semibold uppercase tracking-wider text-emerald-400" style={{ fontSize: '10px' }}>
          Sower's story
        </span>
        {isOwner && !editing && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStartEdit(); }}
            className="ml-auto p-0.5 rounded hover:bg-white/10 transition-colors"
            title="Edit your story"
          >
            <Pencil className="w-3 h-3 text-emerald-400/70 hover:text-emerald-300" />
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full bg-white/5 border border-emerald-500/30 rounded-lg p-2 text-white/80 text-[13px] leading-relaxed resize-none focus:outline-none focus:border-emerald-400"
            rows={4}
            maxLength={500}
            placeholder="Write your story..."
          />
          <div className="flex items-center gap-2 justify-end">
            <span className="text-[10px] text-white/40 mr-auto">{editText.length}/500</span>
            <button
              onClick={() => setEditing(false)}
              className="p-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
              disabled={saving}
            >
              <X className="w-3.5 h-3.5 text-white/60" />
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !editText.trim()}
              className="p-1 rounded bg-emerald-500/80 hover:bg-emerald-500 transition-colors disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      ) : (
        <p className="text-white/75 leading-[1.6]" style={{ fontSize: '13px' }}>
          {displayText}
          {isLong && !expanded && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(true); }}
              className="inline ml-1 font-semibold text-emerald-400 hover:text-emerald-300 hover:underline"
              style={{ fontSize: '12px', background: 'none', border: 'none', padding: 0 }}
            >
              read more
            </button>
          )}
        </p>
      )}
    </div>
  );
};

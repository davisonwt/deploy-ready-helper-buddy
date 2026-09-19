import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import StoryFields from './StoryFields';
import type { StallPdfResult } from './StallPdfUpload';

interface Props {
  ownerId: string;
  onClose: () => void;
  /** Lets the caller (StallHotspotSheet) update its own already-rendered
   *  story content directly from the save result, instead of a refetch. */
  onSaved: (story: string | null, storyPdfUrl: string | null) => void;
}

/**
 * "Edit" on the stall interior's My Story sheet -- opens IN PLACE over
 * StallInteriorView, same fixed-overlay layering convention as
 * StallChatSheet.tsx, stacked one level higher since it opens from inside
 * StallHotspotSheet, which is itself an overlay. Never navigate() to
 * /stall/build. Reuses StoryFields (the exact same Textarea +
 * StallPdfUpload StallBuildPage's own Setup step renders) rather than a
 * second set of story fields, and writes only stalls.story/
 * story_pdf_path -- not StallBuildPage's handlePublish, which upserts the
 * whole row and requires front/interior/hotspots/categories that a
 * story-only edit has no reason to load.
 */
export default function StoryEditSheet({ ownerId, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [story, setStory] = useState('');
  const [storyPdf, setStoryPdf] = useState<StallPdfResult | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from('stalls').select('story, story_pdf_path').eq('user_id', ownerId).maybeSingle();
      const row = data as { story?: string | null; story_pdf_path?: string | null } | null;
      if (!alive) return;
      setStory(row?.story ?? '');
      if (row?.story_pdf_path) {
        // Fixed upload path (StallPdfUpload always writes `${ownerId}/story.pdf`) -- deterministic, no need to parse it back out of the URL.
        setStoryPdf({ url: row.story_pdf_path, storagePath: `${ownerId}/story.pdf`, fileName: 'story.pdf' });
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [ownerId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('stalls')
        .update({ story: story.trim() || null, story_pdf_path: storyPdf?.url ?? null })
        .eq('user_id', ownerId);
      if (error) throw error;
      toast.success('Story saved');
      onSaved(story.trim() || null, storyPdf?.url ?? null);
    } catch (e: unknown) {
      toast.error('Could not save your story', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[10010] bg-black/70" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 top-[8vh] z-[10011] flex flex-col rounded-t-2xl bg-[#180f08] border-t border-amber-500/25 shadow-2xl sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:h-[85vh] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border">
        <div className="flex items-center justify-between border-b border-amber-500/15 px-5 py-3 shrink-0">
          <h2 className="font-serif text-lg text-amber-200 tracking-wide">Edit My Story</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-amber-100/60 hover:text-amber-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-amber-100/40" /></div>
          ) : (
            <StoryFields pathPrefix={ownerId} story={story} onStoryChange={setStory} storyPdf={storyPdf} onStoryPdfChange={setStoryPdf} />
          )}
        </div>
        <div className="shrink-0 border-t border-amber-500/15 px-5 py-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-amber-400 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </>
  );
}

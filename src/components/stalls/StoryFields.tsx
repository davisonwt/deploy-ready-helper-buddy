import { Textarea } from '@/components/ui/textarea';
import StallPdfUpload, { type StallPdfResult } from '@/components/stalls/StallPdfUpload';
import StoryPhotoUpload, { type StoryPhotoResult } from '@/components/stalls/StoryPhotoUpload';

interface Props {
  /** user id -- StallPdfUpload always writes `${pathPrefix}/story.pdf`. */
  pathPrefix: string;
  story: string;
  onStoryChange: (value: string) => void;
  storyPdf: StallPdfResult | null;
  onStoryPdfChange: (value: StallPdfResult | null) => void;
  storyPhoto: StoryPhotoResult | null;
  onStoryPhotoChange: (value: StoryPhotoResult | null) => void;
}

/**
 * The "My Story" text + optional PDF fields -- extracted out of
 * StallBuildPage's Setup step so the stall-interior "Edit" affordance
 * (StoryEditSheet.tsx) can open the SAME editor in place rather than a
 * second one with its own drifting copy of these fields.
 */
export default function StoryFields({ pathPrefix, story, onStoryChange, storyPdf, onStoryPdfChange, storyPhoto, onStoryPhotoChange }: Props) {
  return (
    <div>
      <label className="text-sm font-medium mb-2 block text-amber-100/80">My Story (optional)</label>
      <div className="mb-3 flex items-center gap-3">
        <StoryPhotoUpload pathPrefix={pathPrefix} value={storyPhoto} onChange={onStoryPhotoChange} />
        <p className="text-xs text-amber-100/50">
          A photo of you -- the story is about a person, so shows above it. Optional.
        </p>
      </div>
      <p className="text-xs text-amber-100/50 mb-1.5">
        Shown under the MY STORY button inside your stall. Blank lines start a new paragraph.
        Type a line in ALL CAPS to make it a heading — everything renders exactly as typed, so write it the way you want it read.
      </p>
      <Textarea
        value={story}
        onChange={(e) => onStoryChange(e.target.value)}
        maxLength={4000}
        rows={8}
        placeholder={"MY JOURNEY\n\nit started with a single song..."}
        className="bg-black/30 border-amber-500/25 text-amber-50 placeholder:text-amber-100/30"
      />
      <p className="text-xs text-amber-100/50 mt-3 mb-1.5">
        Prefer a PDF instead? Upload one and it replaces the text above inside your stall.
      </p>
      <StallPdfUpload pathPrefix={pathPrefix} value={storyPdf} onChange={onStoryPdfChange} />
    </div>
  );
}

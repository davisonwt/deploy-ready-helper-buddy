import petals from '@/assets/hearts-petals.jpg';
import { Quote } from 'lucide-react';

/**
 * A small cinematic interlude — sets the emotional tone of Tribal Hearts.
 * Pure visual + one whispered line. Used above the tabs on the main page.
 */
export function SoulStoryStrip() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/30 shadow-lg">
      <img
        src={petals}
        alt="Dewdrops on a rose at sunrise"
        width={1280}
        height={832}
        loading="lazy"
        className="h-40 w-full object-cover sm:h-48"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/35 to-transparent" />
      <div className="absolute inset-0 flex items-center">
        <div className="max-w-md px-5 sm:px-7">
          <Quote className="h-4 w-4 text-primary" />
          <p className="mt-1 font-serif text-base italic leading-snug text-foreground sm:text-lg">
            "Two souls, one rhythm — found gently, in their own time."
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Tribal Hearts · A Sow2Grow garden
          </p>
        </div>
      </div>
    </div>
  );
}

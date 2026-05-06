-- Rename companion slugs from Linux distro names to tree names
ALTER TABLE public.s2g_companion_entitlements DROP CONSTRAINT IF EXISTS s2g_companion_entitlements_companion_slug_fkey;
ALTER TABLE public.s2g_companion_usage DROP CONSTRAINT IF EXISTS s2g_companion_usage_companion_slug_fkey;

-- Map old → new
UPDATE public.s2g_companions SET slug = CASE slug
  WHEN 'gentoo' THEN 'linden'
  WHEN 'tux'    THEN 'maple'
  WHEN 'ubuntu' THEN 'cypress'
  WHEN 'kali'   THEN 'willow'
  WHEN 'fedora' THEN 'birch'
  WHEN 'debian' THEN 'elm'
  WHEN 'arch'   THEN 'hickory'
  WHEN 'mint'   THEN 'beech'
  WHEN 'loaf'   THEN 'alder'
  WHEN 'sage'   THEN 'hawthorn'
  ELSE slug END,
  name = CASE slug
  WHEN 'gentoo' THEN 'Linden'
  WHEN 'tux'    THEN 'Maple'
  WHEN 'ubuntu' THEN 'Cypress'
  WHEN 'kali'   THEN 'Willow'
  WHEN 'fedora' THEN 'Birch'
  WHEN 'debian' THEN 'Elm'
  WHEN 'arch'   THEN 'Hickory'
  WHEN 'mint'   THEN 'Beech'
  WHEN 'loaf'   THEN 'Alder'
  WHEN 'sage'   THEN 'Hawthorn'
  ELSE name END
WHERE slug IN ('gentoo','tux','ubuntu','kali','fedora','debian','arch','mint','loaf','sage');

UPDATE public.s2g_companion_entitlements SET companion_slug = CASE companion_slug
  WHEN 'gentoo' THEN 'linden'
  WHEN 'tux'    THEN 'maple'
  WHEN 'ubuntu' THEN 'cypress'
  WHEN 'kali'   THEN 'willow'
  WHEN 'fedora' THEN 'birch'
  WHEN 'debian' THEN 'elm'
  WHEN 'arch'   THEN 'hickory'
  WHEN 'mint'   THEN 'beech'
  WHEN 'loaf'   THEN 'alder'
  WHEN 'sage'   THEN 'hawthorn'
  ELSE companion_slug END
WHERE companion_slug IN ('gentoo','tux','ubuntu','kali','fedora','debian','arch','mint','loaf','sage');

UPDATE public.s2g_companion_usage SET companion_slug = CASE companion_slug
  WHEN 'gentoo' THEN 'linden'
  WHEN 'tux'    THEN 'maple'
  WHEN 'ubuntu' THEN 'cypress'
  WHEN 'kali'   THEN 'willow'
  WHEN 'fedora' THEN 'birch'
  WHEN 'debian' THEN 'elm'
  WHEN 'arch'   THEN 'hickory'
  WHEN 'mint'   THEN 'beech'
  WHEN 'loaf'   THEN 'alder'
  WHEN 'sage'   THEN 'hawthorn'
  ELSE companion_slug END
WHERE companion_slug IN ('gentoo','tux','ubuntu','kali','fedora','debian','arch','mint','loaf','sage');

UPDATE public.s2g_companion_runs SET companion_slug = CASE companion_slug
  WHEN 'gentoo' THEN 'linden'
  WHEN 'tux'    THEN 'maple'
  WHEN 'ubuntu' THEN 'cypress'
  WHEN 'kali'   THEN 'willow'
  WHEN 'fedora' THEN 'birch'
  WHEN 'debian' THEN 'elm'
  WHEN 'arch'   THEN 'hickory'
  WHEN 'mint'   THEN 'beech'
  WHEN 'loaf'   THEN 'alder'
  WHEN 'sage'   THEN 'hawthorn'
  ELSE companion_slug END
WHERE companion_slug IN ('gentoo','tux','ubuntu','kali','fedora','debian','arch','mint','loaf','sage');

-- Update summaries to the new tribe-facing copy
UPDATE public.s2g_companions SET summary = CASE slug
  WHEN 'hickory'  THEN 'Opens HearthCall sessions and routes voice or video connections for the tribe.'
  WHEN 'beech'    THEN 'Tracks bestowals, sends weekly reports, and tends the 1% tribe leader finance.'
  WHEN 'alder'    THEN 'Watches over Field & Forge stock, deliveries, and order tracking.'
  WHEN 'hawthorn' THEN 'Suggests fair pricing, surfaces performance insights, and whispers the best time to post.'
  WHEN 'linden'   THEN 'Coordinates the whole orchard — daily briefings, task routing, and warm login greetings.'
  WHEN 'maple'    THEN 'Drafts SeedFlow posts, captions, content calendars, and gentle marketing copy.'
  WHEN 'cypress'  THEN 'Reviews drafts for tone, values, and brand alignment before anything is planted in the feed.'
  WHEN 'willow'   THEN 'Generates and refines images — seed covers, product photos, and banners.'
  WHEN 'birch'    THEN 'Plans video reels, testimonial clips, and orchard introductions.'
  WHEN 'elm'      THEN 'Drafts outreach, thank-yous, and warm collaboration proposals.'
  ELSE summary END
WHERE slug IN ('hickory','beech','alder','hawthorn','linden','maple','cypress','willow','birch','elm');

-- Re-add FKs
ALTER TABLE public.s2g_companion_entitlements
  ADD CONSTRAINT s2g_companion_entitlements_companion_slug_fkey
  FOREIGN KEY (companion_slug) REFERENCES public.s2g_companions(slug) ON DELETE CASCADE;

ALTER TABLE public.s2g_companion_usage
  ADD CONSTRAINT s2g_companion_usage_companion_slug_fkey
  FOREIGN KEY (companion_slug) REFERENCES public.s2g_companions(slug) ON DELETE CASCADE;
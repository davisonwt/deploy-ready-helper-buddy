-- RegisterWanderingPage.tsx rebuild — a role's profile card needs more
-- than display_name/base_town: a photo, a one-line tagline, a gallery
-- (3-8 photos), and a handful of sower-entered testimonials for now
-- ("they'll be able to add their own after a booking").
alter table public.wandering_roles add column photo_url text;
alter table public.wandering_roles add column tagline text;
alter table public.wandering_roles add column gallery_urls text[];
alter table public.wandering_roles add column testimonials jsonb;

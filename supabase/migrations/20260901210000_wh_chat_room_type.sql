-- New chat_room_type value for Wandering Hearts conversations. Must be its
-- own migration/statement -- Postgres won't let a newly-added enum value be
-- used in the same transaction that added it.
ALTER TYPE public.chat_room_type ADD VALUE IF NOT EXISTS 'wandering_hearts';

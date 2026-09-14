-- Root cause of a live incident, 2026-09-14 (3 real participants): the Daily
-- room name (`jitsi_room`) had no durable identity -- goLive()
-- (useTribalLiveOrchard.ts) minted `s2g_seed_<id>_<Date.now()>` on EVERY
-- call, even when reusing an already-live gathering_sessions row (host
-- refresh / re-entering their own still-live seed, an explicitly documented
-- path -- see SeedCard.tsx's "I'm the host re-entering my own still-live
-- room" comment). gathering_sessions.id was already correctly reused across
-- that same path; the room name was not. Any host-side re-trigger of
-- goLive() while others were already connected silently moved the HOST to a
-- brand-new Daily room while board_state/spotlight/the stage:${seedId}
-- broadcast channel -- all keyed by the stable seed/row id -- stayed
-- identical for everyone. Symptom: board/spotlight state stayed perfectly
-- synced (never left the shared channel) while audio/video silently split
-- across two different Daily rooms with no error anywhere.
--
-- Fix: persist jitsi_room on the row, exactly like the row id itself is
-- already reused -- goLive() now reads and reuses the EXISTING row's stored
-- room instead of minting a fresh one every time.

alter table public.gathering_sessions
  add column if not exists jitsi_room text;

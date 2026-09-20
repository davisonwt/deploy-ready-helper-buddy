-- Radio duration-integrity sweep, 2026-09-20. Probed the real audio file
-- (ffprobe) for all 51 audio-format tracks in the radio schedule's own
-- pool (products where type='music', status='active', duration>0 -- the
-- exact query _shared/radioSchedule.ts's fetchRadioTracks() uses; NOT
-- dj_music_tracks, which is a different, unrelated table the schedule
-- never reads). 3 rows are .MOV video files, out of scope for this
-- audio-only probe -- their stored durations are unverified by this sweep.
--
-- 4 of 51 probed rows differed from their real file by more than 1
-- second. Corrected to the FLOORED real duration (never rounded up) --
-- rounding up risks recreating the exact bug being fixed: a stored
-- duration a listener's seek can land past the real end of.
--
-- Named rows below, not a WHERE clause that could match differently later.
--
--   title                                  | stored | real (ffprobe) | new (floor)
--   ---------------------------------------|--------|-----------------|------------
--   The Sinner's Prayers                   |    192 |          194.18 |        194
--   Fooled Again                           |    207 |          209.30 |        209
--   the totality of elohiym's will         |    283 |          223.68 |        223  (worst: -60s, 0.46% of the ~215min schedule cycle)
--   blessed is he (song of deliverance)    |    190 |          188.95 |        188

UPDATE public.products SET duration = 194 WHERE id = '485a0a4a-1c66-4076-b976-ae3fef81e2a1'::uuid;
UPDATE public.products SET duration = 209 WHERE id = '97d4dcdd-ed3f-42ea-899c-d6dcc1a09e57'::uuid;
UPDATE public.products SET duration = 223 WHERE id = '0b7ed18c-ae21-43bd-a563-de09e5d12081'::uuid;
UPDATE public.products SET duration = 188 WHERE id = '515fd1ea-69d5-41d9-bbe7-37bc71c9c637'::uuid;

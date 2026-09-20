-- MOV/video-container completion of the 2026-09-20 radio duration-integrity
-- sweep (see fix-radio-track-durations-20260920.sql, which explicitly
-- excluded these 3 rows as out of scope for its audio-only ffprobe pass).
-- Probed via ffprobe against the real files (all three are h264/hevc video
-- + aac audio; real duration read from the FORMAT block, same method as
-- the first sweep).
--
-- These are NOT small schedule drift like the first sweep's worst case
-- (-60s on a ~223s track). All three are wildly mismatched -- roughly
-- 10x too long -- consistent with a placeholder/copy-paste duration from
-- upload, not a re-encode rounding difference.
--
--   title                        | stored | real (ffprobe) | new (floor)
--   -----------------------------|--------|-----------------|------------
--   From Dust To LIfe            |    304 |          30.292 |        30   (-274s, -90%)
--   The Shepherd Warrior         |    215 |          28.625 |        28   (-187s, -87%)
--   Standing At The Crossroads   |    311 |          30.138 |        30   (-281s, -90%)
--
-- Separately, and more consequentially: browser <audio>-element playback
-- was tested directly (not assumed) against all three real files. "From
-- Dust To LIfe" (H.264 video + AAC audio) played fine. "The Shepherd
-- Warrior" and "Standing At The Crossroads" (both HEVC video + AAC audio)
-- both hard-failed with MEDIA_ELEMENT_ERROR/"Format error" -- no HEVC
-- decoder, zero playback, not a quality issue. _shared/radioSchedule.ts's
-- fetchRadioTracks() has been changed in the same commit as this file to
-- exclude video-container uploads (.mov/.mp4/.mkv/.avi/.webm/.m4v) from
-- the radio pool outright, so autopilot can never land on one of these
-- three, or any future upload with the same container. This duration fix
-- is applied anyway for the record and in case a future decision reverses
-- the exclusion.
--
-- Named rows below, not a WHERE clause that could match differently later.

UPDATE public.products SET duration = 30 WHERE id = 'c83ed2b7-02a9-4037-a56c-d1a1c4fb84c7'::uuid;
UPDATE public.products SET duration = 28 WHERE id = '46301f31-a5a7-4979-ac21-d6e5ba6ae11b'::uuid;
UPDATE public.products SET duration = 30 WHERE id = '52a1134d-aeea-42bb-9394-59c516ee0847'::uuid;

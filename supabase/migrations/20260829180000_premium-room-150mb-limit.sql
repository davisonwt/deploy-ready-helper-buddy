-- Raise the premium-room bucket's per-object limit to 150MB, matching the
-- project-wide Storage fileSizeLimit raised to the same value via the
-- Management API (config/storage, not expressible in SQL) in the same pass.
-- Storage enforces the smaller of the two, so both had to move together --
-- the project-wide cap was 50MB and was the actual operative ceiling even
-- though this bucket already claimed 100MB (set in 20260827155959).
UPDATE storage.buckets
SET file_size_limit = 157286400 -- 150MB
WHERE id = 'premium-room';

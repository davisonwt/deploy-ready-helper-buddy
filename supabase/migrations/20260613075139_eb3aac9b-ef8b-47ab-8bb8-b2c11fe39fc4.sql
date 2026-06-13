
-- FIX 1: Column-level SELECT restriction on wallet secret columns
REVOKE SELECT ON public.organization_wallets FROM authenticated;
REVOKE SELECT ON public.organization_wallets FROM anon;
GRANT SELECT (
  id, user_id, wallet_address, wallet_name, wallet_type, blockchain,
  is_active, supported_tokens, created_at, updated_at
) ON public.organization_wallets TO authenticated;

REVOKE SELECT ON public.user_wallets FROM authenticated;
REVOKE SELECT ON public.user_wallets FROM anon;
GRANT SELECT (
  id, user_id, wallet_address, wallet_type, is_primary,
  is_active, created_at, updated_at
) ON public.user_wallets TO authenticated;

GRANT ALL ON public.organization_wallets TO service_role;
GRANT ALL ON public.user_wallets TO service_role;

-- FIX 2: Tribal Hearts media — require mutual match
DROP POLICY IF EXISTS "hearts_media_ambassador_read" ON storage.objects;

CREATE POLICY "hearts_media_matched_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'tribal-hearts-media'
  AND public.is_tribal_hearts_member(auth.uid())
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.tribal_hearts_matches m
      WHERE m.status = 'mutual'
        AND (
          (m.member_a_id = auth.uid() AND m.member_b_id::text = (storage.foldername(name))[1])
          OR
          (m.member_b_id = auth.uid() AND m.member_a_id::text = (storage.foldername(name))[1])
        )
    )
  )
);

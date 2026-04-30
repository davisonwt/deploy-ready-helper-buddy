-- Add wandering role identity to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS wandering_role TEXT
  CHECK (wandering_role IS NULL OR wandering_role IN
    ('field','hand','hearth','pillow','whisperer','story','heart','forge','wheel'));

CREATE INDEX IF NOT EXISTS idx_products_wandering_role
  ON public.products(wandering_role) WHERE wandering_role IS NOT NULL;

-- View used by the admin credentials review queue
CREATE OR REPLACE VIEW public.admin_pending_credentials_v
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.user_id,
  c.credential_type,
  c.file_url,
  c.notes,
  c.status,
  c.submitted_at,
  c.reviewed_at,
  c.reviewed_by,
  c.rejection_reason,
  c.expires_at,
  p.display_name,
  p.avatar_url
FROM public.seller_credentials c
LEFT JOIN public.profiles p ON p.id = c.user_id
ORDER BY
  CASE c.status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END,
  c.submitted_at DESC;

GRANT SELECT ON public.admin_pending_credentials_v TO authenticated;
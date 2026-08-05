CREATE TABLE IF NOT EXISTS public.prescription_upload_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sower_id uuid NOT NULL,
  object_path text NOT NULL UNIQUE,
  file_name text,
  mime_type text,
  declared_size bigint,
  consumed boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.prescription_upload_tokens TO service_role;

ALTER TABLE public.prescription_upload_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No client access to prescription upload tokens" ON public.prescription_upload_tokens;
CREATE POLICY "No client access to prescription upload tokens"
  ON public.prescription_upload_tokens
  FOR SELECT
  TO authenticated
  USING (false);

CREATE INDEX IF NOT EXISTS idx_prescription_upload_tokens_user
  ON public.prescription_upload_tokens (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_prescription_upload_tokens_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prescription_upload_tokens_updated_at ON public.prescription_upload_tokens;
CREATE TRIGGER trg_prescription_upload_tokens_updated_at
  BEFORE UPDATE ON public.prescription_upload_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_prescription_upload_tokens_updated_at();

-- F-3: no more direct browser writes into the prescriptions bucket.
DROP POLICY IF EXISTS "Auth users can upload prescriptions" ON storage.objects;

-- New key layout: {patient_uid}/{sower_id}/{uuid}.{ext}
DROP POLICY IF EXISTS "Pharmacists read prescriptions of their sower" ON storage.objects;
CREATE POLICY "Pharmacists read prescriptions of their sower"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'prescriptions'
    AND EXISTS (
      SELECT 1 FROM public.sowers s
      WHERE s.user_id = auth.uid()
        AND (storage.foldername(name))[2] = s.id::text
    )
  );

DROP POLICY IF EXISTS "Clients read own prescription uploads" ON storage.objects;
CREATE POLICY "Clients read own prescription uploads"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'prescriptions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
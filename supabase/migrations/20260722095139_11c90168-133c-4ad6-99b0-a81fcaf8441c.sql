
-- ============================================================================
-- 1. Extend sowers with seller_template
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sowers' AND column_name='seller_template') THEN
    ALTER TABLE public.sowers ADD COLUMN seller_template TEXT;
  END IF;
END $$;

-- ============================================================================
-- 2. Gating trigger: regulated_business requires approved credential
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_regulated_business_credential()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.seller_template = 'regulated_business' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.seller_credentials sc
      WHERE sc.user_id = NEW.user_id
        AND sc.status = 'approved'
        AND sc.credential_type IN (
          'pharmacist_license',
          'vet_license',
          'herbalist_cert',
          'optometrist_license',
          'clinic_license',
          'regulated_business'
        )
    ) THEN
      RAISE EXCEPTION 'Regulated business template requires an approved professional credential.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_regulated_business_credential ON public.sowers;
CREATE TRIGGER trg_enforce_regulated_business_credential
BEFORE INSERT OR UPDATE OF seller_template ON public.sowers
FOR EACH ROW
EXECUTE FUNCTION public.enforce_regulated_business_credential();

-- ============================================================================
-- 3. prescription_requests table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.prescription_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sower_id UUID NOT NULL REFERENCES public.sowers(id) ON DELETE CASCADE,
  chat_room_id UUID,
  prescription_file_path TEXT,
  prescription_file_name TEXT,
  client_notes TEXT,
  pharmacist_notes TEXT,
  quoted_amount_usdc NUMERIC(12,2),
  fulfillment_mode TEXT CHECK (fulfillment_mode IN ('pickup','self_deliver','community_driver','courier_quote')),
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','reviewed','quoted','paid','ready','fulfilled','cancelled')),
  delivery_address TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescription_requests_user ON public.prescription_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_prescription_requests_sower ON public.prescription_requests(sower_id);
CREATE INDEX IF NOT EXISTS idx_prescription_requests_status ON public.prescription_requests(status);

GRANT SELECT, INSERT, UPDATE ON public.prescription_requests TO authenticated;
GRANT ALL ON public.prescription_requests TO service_role;

ALTER TABLE public.prescription_requests ENABLE ROW LEVEL SECURITY;

-- Client: can see and create their own requests
CREATE POLICY "Clients view own prescription requests"
  ON public.prescription_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Clients create own prescription requests"
  ON public.prescription_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Client can cancel their own request (limited to non-fulfilled statuses)
CREATE POLICY "Clients cancel own prescription requests"
  ON public.prescription_requests FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND status IN ('submitted','reviewed','quoted','cancelled'));

-- Pharmacist (sower owner): can view and manage requests addressed to them
CREATE POLICY "Sowers view their prescription requests"
  ON public.prescription_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sowers s
      WHERE s.id = prescription_requests.sower_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Sowers manage their prescription requests"
  ON public.prescription_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sowers s
      WHERE s.id = prescription_requests.sower_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sowers s
      WHERE s.id = prescription_requests.sower_id
        AND s.user_id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_prescription_requests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prescription_requests_updated_at ON public.prescription_requests;
CREATE TRIGGER trg_prescription_requests_updated_at
BEFORE UPDATE ON public.prescription_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_prescription_requests_updated_at();

-- ============================================================================
-- 4. Storage bucket policies for private `prescriptions` bucket
-- (bucket itself is created via the storage_create_bucket tool)
-- ============================================================================
-- Path convention: {sower_id}/{request_id}/{filename}
-- Clients can upload to their own request; pharmacists can read via signed URLs
-- from edge functions using service role. We still add a client insert policy
-- so uploads from the browser work before the edge function stitches things.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Auth users can upload prescriptions'
  ) THEN
    CREATE POLICY "Auth users can upload prescriptions"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'prescriptions');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Pharmacists read prescriptions of their sower'
  ) THEN
    CREATE POLICY "Pharmacists read prescriptions of their sower"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'prescriptions'
        AND EXISTS (
          SELECT 1 FROM public.sowers s
          WHERE s.user_id = auth.uid()
            AND (storage.foldername(name))[1] = s.id::text
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Clients read own prescription uploads'
  ) THEN
    CREATE POLICY "Clients read own prescription uploads"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'prescriptions'
        AND owner = auth.uid()
      );
  END IF;
END $$;

-- Create public bucket for premium room assets
insert into storage.buckets (id, name, public)
values ('premium-room', 'premium-room', true)
on conflict (id) do nothing;

-- Create policies safely if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read premium-room'
  ) THEN
    CREATE POLICY "Public read premium-room"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'premium-room');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated upload premium-room'
  ) THEN
    CREATE POLICY "Authenticated upload premium-room"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'premium-room' AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated update premium-room'
  ) THEN
    CREATE POLICY "Authenticated update premium-room"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'premium-room' AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated delete premium-room'
  ) THEN
    CREATE POLICY "Authenticated delete premium-room"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'premium-room' AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

-- Premium room access table
CREATE TABLE IF NOT EXISTS public.premium_room_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  user_id uuid NOT NULL,
  payment_amount numeric(10,2) DEFAULT 0,
  payment_status text CHECK (payment_status IN ('pending','completed','failed','free')) DEFAULT 'completed',
  access_granted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE (room_id, user_id)
);

ALTER TABLE public.premium_room_access ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'premium_room_access' AND policyname = 'Users insert own access'
  ) THEN
    CREATE POLICY "Users insert own access"
      ON public.premium_room_access FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'premium_room_access' AND policyname = 'Users read own access'
  ) THEN
    CREATE POLICY "Users read own access"
      ON public.premium_room_access FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Premium item purchases table
CREATE TABLE IF NOT EXISTS public.premium_item_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  room_id uuid NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('music','document','artwork')),
  item_id text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  payment_status text CHECK (payment_status IN ('pending','completed','failed')) DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.premium_item_purchases ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'premium_item_purchases' AND policyname = 'Buyer inserts own purchases'
  ) THEN
    CREATE POLICY "Buyer inserts own purchases"
      ON public.premium_item_purchases FOR INSERT
      TO authenticated
      WITH CHECK (buyer_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'premium_item_purchases' AND policyname = 'Buyer reads own purchases'
  ) THEN
    CREATE POLICY "Buyer reads own purchases"
      ON public.premium_item_purchases FOR SELECT
      TO authenticated
      USING (buyer_id = auth.uid());
  END IF;
END $$;
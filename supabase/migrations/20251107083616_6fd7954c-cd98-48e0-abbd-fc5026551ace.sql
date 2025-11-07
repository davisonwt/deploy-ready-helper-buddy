-- Create premium_room_access table
CREATE TABLE IF NOT EXISTS public.premium_room_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.premium_rooms(id) ON DELETE CASCADE,
  access_granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, room_id)
);

-- Create premium_item_purchases table
CREATE TABLE IF NOT EXISTS public.premium_item_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.premium_rooms(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.premium_room_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_item_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for premium_room_access
CREATE POLICY "Users can view their own access"
  ON public.premium_room_access FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own access"
  ON public.premium_room_access FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Room creators can view all access"
  ON public.premium_room_access FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.premium_rooms
      WHERE premium_rooms.id = premium_room_access.room_id
      AND premium_rooms.creator_id = auth.uid()
    )
  );

-- RLS Policies for premium_item_purchases
CREATE POLICY "Users can view their own purchases"
  ON public.premium_item_purchases FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Users can insert their own purchases"
  ON public.premium_item_purchases FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Room creators can view purchases"
  ON public.premium_item_purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.premium_rooms
      WHERE premium_rooms.id = premium_item_purchases.room_id
      AND premium_rooms.creator_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_premium_room_access_user ON public.premium_room_access(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_room_access_room ON public.premium_room_access(room_id);
CREATE INDEX IF NOT EXISTS idx_premium_item_purchases_buyer ON public.premium_item_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_premium_item_purchases_room ON public.premium_item_purchases(room_id);
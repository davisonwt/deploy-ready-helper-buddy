-- Add bestowal_value to sower_books (base price before 15% fee)
ALTER TABLE public.sower_books
ADD COLUMN IF NOT EXISTS bestowal_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'physical' CHECK (delivery_type IN ('physical', 'digital', 'both')),
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Create book_orders table for physical book deliveries
CREATE TABLE IF NOT EXISTS public.book_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.sower_books(id) ON DELETE CASCADE,
  bestower_id UUID NOT NULL,
  sower_id UUID NOT NULL,
  -- Shipping details
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  street_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  delivery_notes TEXT,
  -- Payment details
  bestowal_amount NUMERIC NOT NULL,
  tithing_amount NUMERIC NOT NULL,
  admin_fee NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'nowpayments',
  payment_reference TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded')),
  -- Tracking
  tracking_number TEXT,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.book_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for book_orders
CREATE POLICY "Users can view their own book orders"
ON public.book_orders
FOR SELECT
USING (auth.uid() = bestower_id);

CREATE POLICY "Sowers can view orders for their books"
ON public.book_orders
FOR SELECT
USING (auth.uid() = sower_id);

CREATE POLICY "Users can create their own book orders"
ON public.book_orders
FOR INSERT
WITH CHECK (auth.uid() = bestower_id);

CREATE POLICY "Sowers can update their book orders"
ON public.book_orders
FOR UPDATE
USING (auth.uid() = sower_id);

-- Updated at trigger for book_orders
CREATE TRIGGER update_book_orders_updated_at
BEFORE UPDATE ON public.book_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_book_orders_bestower ON public.book_orders(bestower_id);
CREATE INDEX IF NOT EXISTS idx_book_orders_sower ON public.book_orders(sower_id);
CREATE INDEX IF NOT EXISTS idx_book_orders_book ON public.book_orders(book_id);
CREATE INDEX IF NOT EXISTS idx_sower_books_public ON public.sower_books(is_public) WHERE is_public = true;
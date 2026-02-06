-- Create whisperers table for users who market products
CREATE TABLE public.whisperers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  profile_id UUID REFERENCES public.profiles(id),
  display_name TEXT NOT NULL,
  bio TEXT,
  specialties TEXT[],
  wallet_address TEXT,
  wallet_type TEXT DEFAULT 'solana',
  total_earnings NUMERIC(12, 2) DEFAULT 0,
  total_products_promoted INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create product_whisperer_assignments for linking products to whisperers
CREATE TABLE public.product_whisperer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  orchard_id UUID REFERENCES public.orchards(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.sower_books(id) ON DELETE CASCADE,
  whisperer_id UUID REFERENCES public.whisperers(id) ON DELETE CASCADE NOT NULL,
  sower_id UUID NOT NULL,
  commission_percent NUMERIC(5, 2) NOT NULL CHECK (commission_percent >= 0 AND commission_percent <= 85),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  total_bestowals INTEGER DEFAULT 0,
  total_earned NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- Ensure only one of product_id, orchard_id, or book_id is set
  CONSTRAINT one_entity_type CHECK (
    (product_id IS NOT NULL AND orchard_id IS NULL AND book_id IS NULL) OR
    (product_id IS NULL AND orchard_id IS NOT NULL AND book_id IS NULL) OR
    (product_id IS NULL AND orchard_id IS NULL AND book_id IS NOT NULL)
  )
);

-- Create whisperer_earnings for tracking payments to whisperers
CREATE TABLE public.whisperer_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whisperer_id UUID REFERENCES public.whisperers(id) ON DELETE CASCADE NOT NULL,
  assignment_id UUID REFERENCES public.product_whisperer_assignments(id) ON DELETE SET NULL,
  bestowal_id UUID NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  commission_percent NUMERIC(5, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Add whisperer columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS has_whisperer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whisperer_commission_percent NUMERIC(5, 2);

-- Add whisperer columns to orchards table
ALTER TABLE public.orchards 
ADD COLUMN IF NOT EXISTS has_whisperer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whisperer_commission_percent NUMERIC(5, 2);

-- Add whisperer columns to sower_books table
ALTER TABLE public.sower_books 
ADD COLUMN IF NOT EXISTS has_whisperer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whisperer_commission_percent NUMERIC(5, 2);

-- Enable RLS on whisperers
ALTER TABLE public.whisperers ENABLE ROW LEVEL SECURITY;

-- Whisperers are viewable by everyone
CREATE POLICY "Whisperers are viewable by everyone" 
ON public.whisperers FOR SELECT 
USING (true);

-- Users can create their own whisperer profile
CREATE POLICY "Users can create their own whisperer profile" 
ON public.whisperers FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own whisperer profile
CREATE POLICY "Users can update their own whisperer profile" 
ON public.whisperers FOR UPDATE 
USING (auth.uid() = user_id);

-- Enable RLS on product_whisperer_assignments
ALTER TABLE public.product_whisperer_assignments ENABLE ROW LEVEL SECURITY;

-- Assignments are viewable by sower or whisperer
CREATE POLICY "Assignments viewable by sower or whisperer" 
ON public.product_whisperer_assignments FOR SELECT 
USING (
  auth.uid() = sower_id OR 
  auth.uid() IN (SELECT user_id FROM public.whisperers WHERE id = whisperer_id)
);

-- Sowers can create assignments
CREATE POLICY "Sowers can create assignments" 
ON public.product_whisperer_assignments FOR INSERT 
WITH CHECK (auth.uid() = sower_id);

-- Sowers can update their assignments
CREATE POLICY "Sowers can update their assignments" 
ON public.product_whisperer_assignments FOR UPDATE 
USING (auth.uid() = sower_id);

-- Enable RLS on whisperer_earnings
ALTER TABLE public.whisperer_earnings ENABLE ROW LEVEL SECURITY;

-- Whisperers can view their own earnings
CREATE POLICY "Whisperers can view their own earnings" 
ON public.whisperer_earnings FOR SELECT 
USING (
  auth.uid() IN (SELECT user_id FROM public.whisperers WHERE id = whisperer_id)
);

-- Create indexes for performance
CREATE INDEX idx_whisperers_user_id ON public.whisperers(user_id);
CREATE INDEX idx_whisperers_active ON public.whisperers(is_active) WHERE is_active = true;
CREATE INDEX idx_assignments_whisperer ON public.product_whisperer_assignments(whisperer_id);
CREATE INDEX idx_assignments_product ON public.product_whisperer_assignments(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_assignments_orchard ON public.product_whisperer_assignments(orchard_id) WHERE orchard_id IS NOT NULL;
CREATE INDEX idx_assignments_book ON public.product_whisperer_assignments(book_id) WHERE book_id IS NOT NULL;
CREATE INDEX idx_earnings_whisperer ON public.whisperer_earnings(whisperer_id);
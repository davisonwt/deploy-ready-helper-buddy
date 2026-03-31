-- Phase 1: Provider feature database schema

-- 1. Add 'provider' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'provider';

-- 2. Create providers table
CREATE TABLE public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subtype text NOT NULL CHECK (subtype IN ('farmer', 'homesteader', 'manufacturer')),
  business_name text NOT NULL,
  bio text,
  address_line text,
  city text,
  country text,
  latitude numeric,
  longitude numeric,
  phone text,
  email text,
  payout_details jsonb DEFAULT '{}'::jsonb,
  logo_url text,
  photos text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. Create provider_products table
CREATE TABLE public.provider_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  category text,
  photos text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold_out')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create provider_orders table
CREATE TABLE public.provider_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.provider_products(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  total_amount numeric NOT NULL,
  courier_fee numeric NOT NULL DEFAULT 0,
  platform_commission numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'picked_up', 'delivered', 'completed', 'cancelled')),
  delivery_type text DEFAULT 'local' CHECK (delivery_type IN ('local', 'international')),
  delivery_address text,
  delivery_city text,
  delivery_country text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Enable RLS on all tables
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_orders ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for providers
CREATE POLICY "Users can read own provider profile"
  ON public.providers FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can read approved providers"
  ON public.providers FOR SELECT TO authenticated
  USING (status = 'approved');

CREATE POLICY "Users can insert own provider application"
  ON public.providers FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own provider profile"
  ON public.providers FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all providers"
  ON public.providers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update any provider"
  ON public.providers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. RLS policies for provider_products
CREATE POLICY "Anyone can read active products"
  ON public.provider_products FOR SELECT TO authenticated
  USING (status = 'active');

CREATE POLICY "Provider owner can manage products"
  ON public.provider_products FOR ALL TO authenticated
  USING (
    provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all products"
  ON public.provider_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 8. RLS policies for provider_orders
CREATE POLICY "Buyers can read own orders"
  ON public.provider_orders FOR SELECT TO authenticated
  USING (buyer_id = auth.uid());

CREATE POLICY "Providers can read their orders"
  ON public.provider_orders FOR SELECT TO authenticated
  USING (
    provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
  );

CREATE POLICY "Buyers can create orders"
  ON public.provider_orders FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Providers can update order status"
  ON public.provider_orders FOR UPDATE TO authenticated
  USING (
    provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all orders"
  ON public.provider_orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 9. Create storage bucket for provider assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('provider-assets', 'provider-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 10. Storage RLS policies
CREATE POLICY "Anyone can read provider assets"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'provider-assets');

CREATE POLICY "Authenticated users can upload provider assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'provider-assets');

CREATE POLICY "Users can update own provider assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'provider-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 11. Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_provider_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_providers_updated_at
  BEFORE UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.update_provider_updated_at();

CREATE TRIGGER update_provider_products_updated_at
  BEFORE UPDATE ON public.provider_products
  FOR EACH ROW EXECUTE FUNCTION public.update_provider_updated_at();

CREATE TRIGGER update_provider_orders_updated_at
  BEFORE UPDATE ON public.provider_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_provider_updated_at();
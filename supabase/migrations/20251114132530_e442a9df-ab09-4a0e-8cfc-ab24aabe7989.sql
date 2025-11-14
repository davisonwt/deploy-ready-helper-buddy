-- 1. Add RLS policies for organization_wallets table
-- Only gosats can view and manage organization wallets

-- Enable RLS on organization_wallets if not already enabled
ALTER TABLE public.organization_wallets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Gosats can view organization wallets" ON public.organization_wallets;
DROP POLICY IF EXISTS "Gosats can manage organization wallets" ON public.organization_wallets;

-- Gosats can view organization wallets
CREATE POLICY "Gosats can view organization wallets"
ON public.organization_wallets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'gosat'::app_role
  )
);

-- Gosats can update organization wallets
CREATE POLICY "Gosats can manage organization wallets"
ON public.organization_wallets
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'gosat'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'gosat'::app_role
  )
);

-- 2. Create courier confirmation system
-- Add courier role to app_role enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
  
  -- Add courier role if it doesn't exist
  BEGIN
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'courier';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Create courier_deliveries table to track delivery confirmations
CREATE TABLE IF NOT EXISTS public.courier_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bestowal_id uuid NOT NULL REFERENCES public.bestowals(id) ON DELETE CASCADE,
  orchard_id uuid NOT NULL REFERENCES public.orchards(id) ON DELETE CASCADE,
  courier_id uuid NOT NULL, -- user_id of courier
  
  -- Pickup information
  pickup_confirmed boolean DEFAULT false,
  pickup_confirmed_at timestamp with time zone,
  pickup_notes text,
  pickup_photo_url text,
  
  -- Delivery information
  delivery_confirmed boolean DEFAULT false,
  delivery_confirmed_at timestamp with time zone,
  delivery_notes text,
  delivery_photo_url text,
  bestower_signature text, -- base64 signature or URL
  
  -- Status tracking
  status text NOT NULL DEFAULT 'pending', -- pending, in_transit, delivered, cancelled
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_bestowal_delivery UNIQUE (bestowal_id)
);

-- Enable RLS on courier_deliveries
ALTER TABLE public.courier_deliveries ENABLE ROW LEVEL SECURITY;

-- Couriers can view their own deliveries
CREATE POLICY "Couriers can view their deliveries"
ON public.courier_deliveries
FOR SELECT
TO authenticated
USING (
  auth.uid() = courier_id OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('gosat'::app_role, 'admin'::app_role)
  )
);

-- Couriers can update their own deliveries
CREATE POLICY "Couriers can update their deliveries"
ON public.courier_deliveries
FOR UPDATE
TO authenticated
USING (
  auth.uid() = courier_id OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('gosat'::app_role, 'admin'::app_role)
  )
)
WITH CHECK (
  auth.uid() = courier_id OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('gosat'::app_role, 'admin'::app_role)
  )
);

-- Gosats and admins can create courier deliveries
CREATE POLICY "Admins can create courier deliveries"
ON public.courier_deliveries
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('gosat'::app_role, 'admin'::app_role)
  )
);

-- Create trigger to automatically move bestowals to manual distribution queue after delivery confirmation
CREATE OR REPLACE FUNCTION public.handle_delivery_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When delivery is confirmed, update the bestowal distribution_data
  IF NEW.delivery_confirmed = true AND (OLD.delivery_confirmed IS NULL OR OLD.delivery_confirmed = false) THEN
    UPDATE public.bestowals
    SET 
      distribution_data = jsonb_set(
        COALESCE(distribution_data, '{}'::jsonb),
        '{mode}',
        '"manual"'::jsonb
      ),
      distribution_data = jsonb_set(
        COALESCE(distribution_data, '{}'::jsonb),
        '{hold_reason}',
        to_jsonb('Delivery confirmed by courier - awaiting gosat distribution approval'::text)
      ),
      distribution_data = jsonb_set(
        COALESCE(distribution_data, '{}'::jsonb),
        '{courier_confirmed_at}',
        to_jsonb(NEW.delivery_confirmed_at::text)
      ),
      updated_at = now()
    WHERE id = NEW.bestowal_id
    AND payment_status = 'completed';
    
    -- Log for debugging
    RAISE NOTICE 'Delivery confirmed for bestowal %: moving to manual distribution queue', NEW.bestowal_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on courier_deliveries
DROP TRIGGER IF EXISTS trigger_delivery_confirmation ON public.courier_deliveries;
CREATE TRIGGER trigger_delivery_confirmation
AFTER UPDATE ON public.courier_deliveries
FOR EACH ROW
WHEN (NEW.delivery_confirmed = true AND (OLD.delivery_confirmed IS NULL OR OLD.delivery_confirmed = false))
EXECUTE FUNCTION public.handle_delivery_confirmation();

-- Create updated_at trigger for courier_deliveries
CREATE OR REPLACE FUNCTION public.update_courier_delivery_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_courier_deliveries_timestamp ON public.courier_deliveries;
CREATE TRIGGER update_courier_deliveries_timestamp
BEFORE UPDATE ON public.courier_deliveries
FOR EACH ROW
EXECUTE FUNCTION public.update_courier_delivery_timestamp();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_courier_deliveries_courier ON public.courier_deliveries(courier_id);
CREATE INDEX IF NOT EXISTS idx_courier_deliveries_bestowal ON public.courier_deliveries(bestowal_id);
CREATE INDEX IF NOT EXISTS idx_courier_deliveries_status ON public.courier_deliveries(status);

-- Add comments for documentation
COMMENT ON TABLE public.courier_deliveries IS 'Tracks courier pickup and delivery confirmations for product-based bestowals';
COMMENT ON COLUMN public.courier_deliveries.status IS 'pending, in_transit, delivered, cancelled';
COMMENT ON TRIGGER trigger_delivery_confirmation ON public.courier_deliveries IS 'Automatically moves bestowals to manual distribution queue when courier confirms delivery';
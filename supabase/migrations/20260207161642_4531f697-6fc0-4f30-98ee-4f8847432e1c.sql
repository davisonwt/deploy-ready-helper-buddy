-- Add delivery_type to products table for differentiating digital vs physical delivery
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'digital' CHECK (delivery_type IN ('digital', 'physical', 'both'));

-- Add release_status to product_bestowals for escrow tracking
ALTER TABLE public.product_bestowals ADD COLUMN IF NOT EXISTS release_status TEXT DEFAULT 'pending' CHECK (release_status IN ('pending', 'held', 'released', 'refunded'));
ALTER TABLE public.product_bestowals ADD COLUMN IF NOT EXISTS hold_reason TEXT;
ALTER TABLE public.product_bestowals ADD COLUMN IF NOT EXISTS released_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.product_bestowals ADD COLUMN IF NOT EXISTS delivery_confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.product_bestowals ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Add escrow fields to bestowals table for orchards
ALTER TABLE public.bestowals ADD COLUMN IF NOT EXISTS release_status TEXT DEFAULT 'pending' CHECK (release_status IN ('pending', 'held', 'released', 'refunded'));
ALTER TABLE public.bestowals ADD COLUMN IF NOT EXISTS released_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_product_bestowals_release_status ON product_bestowals(release_status);
CREATE INDEX IF NOT EXISTS idx_bestowals_release_status ON bestowals(release_status);
CREATE INDEX IF NOT EXISTS idx_products_delivery_type ON products(delivery_type);

-- Comment explaining the escrow logic
COMMENT ON COLUMN products.delivery_type IS 'digital = immediate release, physical/both = held until courier confirms pickup';
COMMENT ON COLUMN product_bestowals.release_status IS 'pending = awaiting payment, held = payment received but requires courier, released = funds sent to sower';
COMMENT ON COLUMN bestowals.release_status IS 'pending = awaiting payment, held = payment received but requires courier, released = funds sent to sower';

-- Add status column to products table for pause/relaunch functionality
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused'));

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);

COMMENT ON COLUMN public.products.status IS 'Product status: active (visible to public) or paused (hidden from marketplace)';

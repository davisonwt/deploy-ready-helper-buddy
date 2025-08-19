-- Add courier_cost column to orchards table
ALTER TABLE public.orchards 
ADD COLUMN IF NOT EXISTS courier_cost numeric DEFAULT 0;

-- Update the column comment
COMMENT ON COLUMN public.orchards.courier_cost IS 'Cost for courier/shipping services to deliver the orchard item';

-- Add an index for courier cost queries
CREATE INDEX IF NOT EXISTS idx_orchards_courier_cost ON public.orchards(courier_cost) WHERE courier_cost > 0;
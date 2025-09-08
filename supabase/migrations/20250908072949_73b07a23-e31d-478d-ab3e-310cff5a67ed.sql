-- Add missing commission marketing columns to orchards table
ALTER TABLE public.orchards 
ADD COLUMN allow_commission_marketing boolean DEFAULT false,
ADD COLUMN commission_rate numeric(5,2) DEFAULT NULL;
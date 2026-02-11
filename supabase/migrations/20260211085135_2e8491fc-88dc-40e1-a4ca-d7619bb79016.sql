-- Add image_urls column to products table for multi-image support
ALTER TABLE public.products ADD COLUMN image_urls TEXT[] DEFAULT '{}';

-- Backfill existing products: copy cover_image_url into image_urls array
UPDATE public.products 
SET image_urls = ARRAY[cover_image_url] 
WHERE cover_image_url IS NOT NULL AND (image_urls IS NULL OR image_urls = '{}');
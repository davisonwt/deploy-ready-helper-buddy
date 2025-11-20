
-- Fix SECURITY DEFINER functions by adding SET search_path = 'public'
-- This prevents schema injection attacks

-- Fix increment_product_download_count
CREATE OR REPLACE FUNCTION public.increment_product_download_count(product_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE products 
  SET download_count = download_count + 1,
      updated_at = NOW()
  WHERE id = product_uuid;
END;
$function$;

-- Fix increment_product_play_count
CREATE OR REPLACE FUNCTION public.increment_product_play_count(product_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE products 
  SET play_count = play_count + 1,
      updated_at = NOW()
  WHERE id = product_uuid;
END;
$function$;

-- Fix update_follower_count
CREATE OR REPLACE FUNCTION public.update_follower_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'followers' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO follower_notifications (user_id, follower_id, source_type, source_id)
      VALUES (NEW.following_id, NEW.follower_id, NEW.source_type, NEW.source_id);
    END IF;
  ELSIF TG_TABLE_NAME = 'product_likes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE products SET like_count = like_count + 1 WHERE id = NEW.product_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE products SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.product_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'orchard_likes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE orchards SET like_count = like_count + 1 WHERE id = NEW.orchard_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE orchards SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.orchard_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

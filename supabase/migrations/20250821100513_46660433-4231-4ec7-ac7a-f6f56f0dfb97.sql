-- CRITICAL SECURITY FIXES

-- 1. FIX CRITICAL ERROR: Remove Security Definer View
-- The radio_sessions_public view is bypassing RLS and poses a security risk
DROP VIEW IF EXISTS public.radio_sessions_public;

-- 2. FIX FUNCTION SEARCH PATH VULNERABILITIES  
-- Add missing SET search_path TO 'public' to remaining functions

-- Fix is_admin_or_gosat function
CREATE OR REPLACE FUNCTION public.is_admin_or_gosat(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'gosat')
  )
$function$;

-- Fix user_is_in_room function 
CREATE OR REPLACE FUNCTION public.user_is_in_room(check_room_id uuid, check_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.chat_participants 
    WHERE room_id = check_room_id 
    AND user_id = check_user_id 
    AND is_active = true
  );
$function$;

-- Fix increment_ai_usage function
CREATE OR REPLACE FUNCTION public.increment_ai_usage(user_id_param uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER;
BEGIN
  INSERT INTO public.ai_usage (user_id, date, generations_count)
  VALUES (user_id_param, current_date, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET generations_count = public.ai_usage.generations_count + 1;
  
  SELECT generations_count INTO current_count
  FROM public.ai_usage
  WHERE user_id = user_id_param AND date = current_date;
  
  RETURN current_count;
END;
$function$;

-- Fix user_has_premium_room_access function
CREATE OR REPLACE FUNCTION public.user_has_premium_room_access(room_id_param uuid, user_id_param uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM chat_rooms cr
    JOIN bestowals b ON b.orchard_id = cr.orchard_id
    WHERE cr.id = room_id_param
    AND b.bestower_id = user_id_param
    AND b.payment_status = 'completed'
    AND b.amount >= cr.required_bestowal_amount
  ) OR EXISTS (
    SELECT 1 
    FROM chat_rooms cr
    WHERE cr.id = room_id_param
    AND cr.created_by = user_id_param
  );
$function$;
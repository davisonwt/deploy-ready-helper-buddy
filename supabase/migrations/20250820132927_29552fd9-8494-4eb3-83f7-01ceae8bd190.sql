-- Create function to automatically generate premium rooms when orchards are completed
CREATE OR REPLACE FUNCTION public.auto_generate_premium_room()
RETURNS TRIGGER AS $$
DECLARE
  room_category premium_room_category;
  max_participants_count integer;
BEGIN
  -- Only proceed if orchard just became completed (filled_pockets >= total_pockets)
  IF NEW.filled_pockets >= NEW.total_pockets AND 
     (OLD.filled_pockets IS NULL OR OLD.filled_pockets < OLD.total_pockets) THEN
    
    -- Map orchard category to premium room category
    room_category := CASE 
      WHEN NEW.category ILIKE '%cooking%' OR NEW.category ILIKE '%nutrition%' THEN 'cooking_nutrition'
      WHEN NEW.category ILIKE '%diy%' OR NEW.category ILIKE '%home%' THEN 'diy_home'
      WHEN NEW.category ILIKE '%health%' OR NEW.category ILIKE '%natural%' THEN 'natural_health'
      WHEN NEW.category ILIKE '%business%' OR NEW.category ILIKE '%training%' THEN 'business_training'
      WHEN NEW.category ILIKE '%podcast%' OR NEW.category ILIKE '%interview%' THEN 'podcasts_interviews'
      WHEN NEW.category ILIKE '%marketing%' THEN 'marketing'
      ELSE 'general_courses'
    END;
    
    -- Calculate max participants (total pockets represents max attendees)
    max_participants_count := NEW.total_pockets;
    
    -- Create premium room automatically
    INSERT INTO public.chat_rooms (
      name,
      description,
      room_type,
      is_premium,
      premium_category,
      orchard_id,
      required_bestowal_amount,
      access_description,
      max_participants,
      created_by
    ) VALUES (
      NEW.title || ' - Live Session',
      'Premium live session for ' || NEW.title || '. ' || COALESCE(NEW.description, ''),
      'group',
      true,
      room_category,
      NEW.id,
      NEW.pocket_price, -- Minimum bestowal to join
      'Access granted to all contributors who bestowed at least $' || NEW.pocket_price || ' to this orchard.',
      max_participants_count,
      NEW.user_id
    );
    
    -- Log the auto-generation
    INSERT INTO public.user_notifications (
      user_id,
      type,
      title,
      message,
      action_url
    ) VALUES (
      NEW.user_id,
      'premium_room_created',
      'Premium Room Auto-Generated',
      'Your completed orchard "' || NEW.title || '" now has a premium live session room with ' || max_participants_count || ' spots available!',
      '/chatapp'
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically generate premium rooms
CREATE TRIGGER trigger_auto_generate_premium_room
  AFTER UPDATE ON public.orchards
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_premium_room();

-- Create function to check if user has access to premium room based on bestowals
CREATE OR REPLACE FUNCTION public.user_has_premium_room_access(room_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;
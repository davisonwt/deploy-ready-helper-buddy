-- Chat App Security Hardening
-- Critical security fixes for chat system handling verification, transactions, invoices, and file downloads

-- 1. Secure system message insertion - Only service role and authorized functions can insert system messages
DROP POLICY IF EXISTS "System messages can be inserted by service role only" ON public.chat_messages;

-- System messages (sender_id IS NULL) can ONLY be inserted via service role or SECURITY DEFINER functions
-- Regular users CANNOT insert system messages
CREATE POLICY "System messages service role only" 
ON public.chat_messages
FOR INSERT
TO service_role
WITH CHECK (
  sender_id IS NULL AND
  system_metadata IS NOT NULL AND
  system_metadata->>'is_system' = 'true'
);

-- 2. Ensure regular users CANNOT insert system messages
-- The existing policies require auth.uid() = sender_id, which prevents NULL sender_id
-- This is correct - we just need to ensure it's enforced

-- 3. Add audit logging for chat system messages (verification, payments, invoices)
CREATE TABLE IF NOT EXISTS public.chat_system_message_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL, -- 'verification', 'payment_confirmation', 'invoice', 'file_delivery'
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_system_audit_message ON public.chat_system_message_audit(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_system_audit_room ON public.chat_system_message_audit(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_system_audit_user ON public.chat_system_message_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_system_audit_type ON public.chat_system_message_audit(message_type);

-- Enable RLS
ALTER TABLE public.chat_system_message_audit ENABLE ROW LEVEL SECURITY;

-- Only admins and service role can view audit logs
CREATE POLICY "chat_system_audit_admin_only" 
ON public.chat_system_message_audit 
FOR SELECT 
USING (
  current_setting('role') = 'service_role' 
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'gosat')
  )
);

-- 4. Function to securely insert system messages with audit logging
CREATE OR REPLACE FUNCTION public.insert_system_chat_message(
  p_room_id UUID,
  p_content TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_system_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_message_id UUID;
  v_user_id UUID;
  v_audit_type TEXT;
BEGIN
  -- Verify this is being called from service role context
  IF current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'System messages can only be inserted via service role';
  END IF;

  -- Extract user_id from metadata if available
  v_user_id := (p_system_metadata->>'user_id')::UUID;
  
  -- Determine audit type from metadata
  v_audit_type := COALESCE(
    p_system_metadata->>'type',
    CASE 
      WHEN p_message_type = 'purchase_delivery' THEN 'file_delivery'
      WHEN p_system_metadata->>'type' = 'verification' THEN 'verification'
      WHEN p_system_metadata->>'type' = 'credential_verification' THEN 'verification'
      WHEN p_system_metadata->>'type' = 'verification_success' THEN 'verification'
      ELSE 'system'
    END
  );

  -- Insert system message
  INSERT INTO public.chat_messages (
    room_id,
    sender_id, -- NULL for system messages
    content,
    message_type,
    system_metadata
  ) VALUES (
    p_room_id,
    NULL,
    p_content,
    p_message_type,
    jsonb_set(
      COALESCE(p_system_metadata, '{}'::jsonb),
      '{is_system}',
      'true'::jsonb
    )
  )
  RETURNING id INTO v_message_id;

  -- Log audit event
  INSERT INTO public.chat_system_message_audit (
    message_id,
    room_id,
    message_type,
    user_id,
    metadata
  ) VALUES (
    v_message_id,
    p_room_id,
    v_audit_type,
    v_user_id,
    p_system_metadata
  );

  RETURN v_message_id;
END;
$$;

-- 5. Secure file download URLs - Add expiry validation
CREATE OR REPLACE FUNCTION public.validate_file_download_access(
  p_file_url TEXT,
  p_room_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_message_exists BOOLEAN;
  v_is_participant BOOLEAN;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Check if user is participant in the room
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE room_id = p_room_id
    AND user_id = p_user_id
    AND is_active = true
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
    RETURN false;
  END IF;

  -- Check if file URL exists in a message in this room
  SELECT EXISTS (
    SELECT 1 FROM public.chat_messages
    WHERE room_id = p_room_id
    AND (
      file_url = p_file_url
      OR system_metadata->>'file_url' = p_file_url
    )
  ) INTO v_message_exists;

  IF NOT v_message_exists THEN
    RETURN false;
  END IF;

  -- Check expiry if present in metadata
  SELECT (system_metadata->>'expires_at')::TIMESTAMP WITH TIME ZONE
  INTO v_expires_at
  FROM public.chat_messages
  WHERE room_id = p_room_id
  AND (
    file_url = p_file_url
    OR system_metadata->>'file_url' = p_file_url
  )
  LIMIT 1;

  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- 6. Enhance chat room access control for verification and payment rooms
-- Ensure only authorized users can access verification rooms
CREATE OR REPLACE FUNCTION public.can_access_verification_room(
  p_room_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_room_type TEXT;
  v_created_by UUID;
BEGIN
  -- Get room details
  SELECT room_type, created_by INTO v_room_type, v_created_by
  FROM public.chat_rooms
  WHERE id = p_room_id;

  IF v_room_type IS NULL THEN
    RETURN false;
  END IF;

  -- Verification rooms: only creator or gosat can access
  IF v_room_type = 'direct' AND EXISTS (
    SELECT 1 FROM public.chat_rooms
    WHERE id = p_room_id
    AND (name = 'Sow2Grow Verification' OR is_system_room = true)
  ) THEN
    RETURN (
      v_created_by = p_user_id
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = p_user_id
        AND role IN ('admin', 'gosat')
      )
    );
  END IF;

  -- Regular rooms: check participant status
  RETURN EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE room_id = p_room_id
    AND user_id = p_user_id
    AND is_active = true
  );
END;
$$;

-- 7. Add rate limiting for chat message sending (prevent spam)
-- This complements the existing rate limiting in edge functions
CREATE OR REPLACE FUNCTION public.check_chat_rate_limit(
  p_user_id UUID,
  p_room_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_message_count INTEGER;
  v_time_window TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Check messages in last 1 minute
  v_time_window := now() - INTERVAL '1 minute';
  
  SELECT COUNT(*) INTO v_message_count
  FROM public.chat_messages
  WHERE sender_id = p_user_id
  AND room_id = p_room_id
  AND created_at > v_time_window;

  -- Allow max 10 messages per minute per room
  RETURN v_message_count < 10;
END;
$$;

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION public.insert_system_chat_message(UUID, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_file_download_access(TEXT, UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_verification_room(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_chat_rate_limit(UUID, UUID) TO authenticated, service_role;

COMMENT ON TABLE public.chat_system_message_audit IS 'Audit log for all system messages in chat (verification, payments, invoices, file deliveries)';
COMMENT ON FUNCTION public.insert_system_chat_message IS 'Securely insert system messages with audit logging. Only callable via service role.';
COMMENT ON FUNCTION public.validate_file_download_access IS 'Validates user has access to download file from chat room and checks expiry';


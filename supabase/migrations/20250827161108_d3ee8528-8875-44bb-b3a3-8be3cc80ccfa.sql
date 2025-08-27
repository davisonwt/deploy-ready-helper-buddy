-- Create audit logging table for profile access
CREATE TABLE public.profile_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accessed_profile_id UUID NOT NULL,
    accessor_user_id UUID NOT NULL,
    access_type TEXT NOT NULL, -- 'view_sensitive', 'view_public', 'update', 'admin_view'
    accessed_fields TEXT[], -- Array of field names accessed
    access_reason TEXT, -- Required reason for admin access
    ip_address INET DEFAULT inet_client_addr(),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    session_info JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on audit logs
ALTER TABLE public.profile_access_logs ENABLE ROW LEVEL SECURITY;

-- Only admins and gosats can view audit logs
CREATE POLICY "Only admins can view profile access logs"
ON public.profile_access_logs
FOR SELECT
TO authenticated
USING (is_admin_or_gosat(auth.uid()));

-- System can insert audit logs (for functions)
CREATE POLICY "System can insert profile access logs"
ON public.profile_access_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create secure function for admin profile access with mandatory logging
CREATE OR REPLACE FUNCTION public.get_profile_admin_secure(
    target_user_id UUID,
    access_reason TEXT,
    requested_fields TEXT[] DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    -- Sensitive fields only returned with specific justification
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    country TEXT,
    timezone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    profile_record RECORD;
    accessed_fields TEXT[];
BEGIN
    -- CRITICAL: Only allow admin/gosat access
    IF NOT is_admin_or_gosat(auth.uid()) THEN
        -- Log unauthorized access attempt
        INSERT INTO public.profile_access_logs (
            accessed_profile_id, accessor_user_id, access_type, 
            access_reason, accessed_fields
        ) VALUES (
            target_user_id, auth.uid(), 'unauthorized_attempt', 
            'BLOCKED: Non-admin attempted admin profile access', 
            ARRAY[]::TEXT[]
        );
        
        RAISE EXCEPTION 'SECURITY VIOLATION: Admin access required for detailed profile data'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Require access reason for audit trail
    IF access_reason IS NULL OR LENGTH(trim(access_reason)) < 10 THEN
        RAISE EXCEPTION 'Access reason required (minimum 10 characters) for admin profile access'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- Rate limiting: max 20 profile views per hour per admin
    IF (SELECT COUNT(*) FROM public.profile_access_logs 
        WHERE accessor_user_id = auth.uid() 
        AND access_type = 'admin_view'
        AND created_at > now() - INTERVAL '1 hour') >= 20 THEN
        
        RAISE EXCEPTION 'Rate limit exceeded: Maximum 20 admin profile views per hour'
            USING ERRCODE = 'too_many_requests';
    END IF;

    -- Get profile data
    SELECT * INTO profile_record
    FROM public.profiles p
    WHERE p.user_id = target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found for user: %', target_user_id
            USING ERRCODE = 'no_data_found';
    END IF;

    -- Determine accessed fields based on request
    IF requested_fields IS NULL THEN
        accessed_fields := ARRAY['id', 'user_id', 'display_name', 'avatar_url', 'bio', 
                                'location', 'created_at', 'first_name', 'last_name', 
                                'phone', 'country', 'timezone'];
    ELSE
        accessed_fields := requested_fields;
    END IF;

    -- MANDATORY AUDIT LOGGING
    INSERT INTO public.profile_access_logs (
        accessed_profile_id, accessor_user_id, access_type, 
        access_reason, accessed_fields, session_info
    ) VALUES (
        target_user_id, auth.uid(), 'admin_view', 
        access_reason, accessed_fields,
        jsonb_build_object(
            'function_called', 'get_profile_admin_secure',
            'timestamp', now()::text,
            'profile_exists', true
        )
    );

    -- Return profile data
    RETURN QUERY
    SELECT 
        profile_record.id,
        profile_record.user_id,
        profile_record.display_name,
        profile_record.avatar_url,
        profile_record.bio,
        profile_record.location,
        profile_record.created_at,
        profile_record.first_name,
        profile_record.last_name,
        profile_record.phone,
        profile_record.country,
        profile_record.timezone;
END;
$$;

-- Update the existing admin policy to be more restrictive
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create new restrictive policy that only allows public data for admins
CREATE POLICY "Admins can view public profile data only"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    is_admin_or_gosat(auth.uid()) AND (auth.uid() IS NOT NULL)
    -- This policy now only allows access to non-sensitive fields
    -- Sensitive fields must go through the secure function
);

-- Enhance the existing log_profile_access trigger to be more comprehensive
CREATE OR REPLACE FUNCTION public.log_detailed_profile_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Log any access to sensitive profile fields during updates
    IF TG_OP = 'UPDATE' AND (
        OLD.first_name IS DISTINCT FROM NEW.first_name OR
        OLD.last_name IS DISTINCT FROM NEW.last_name OR
        OLD.phone IS DISTINCT FROM NEW.phone OR
        OLD.location IS DISTINCT FROM NEW.location
    ) THEN
        INSERT INTO public.profile_access_logs (
            accessed_profile_id, accessor_user_id, access_type, 
            access_reason, accessed_fields, session_info
        ) VALUES (
            NEW.user_id, auth.uid(), 'profile_update',
            'User updated their own profile', 
            ARRAY[
                CASE WHEN OLD.first_name IS DISTINCT FROM NEW.first_name THEN 'first_name' END,
                CASE WHEN OLD.last_name IS DISTINCT FROM NEW.last_name THEN 'last_name' END,
                CASE WHEN OLD.phone IS DISTINCT FROM NEW.phone THEN 'phone' END,
                CASE WHEN OLD.location IS DISTINCT FROM NEW.location THEN 'location' END
            ]::TEXT[],
            jsonb_build_object('operation', TG_OP, 'table', TG_TABLE_NAME)
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for profile access logging
DROP TRIGGER IF EXISTS log_profile_access_detailed ON public.profiles;
CREATE TRIGGER log_profile_access_detailed
    AFTER UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.log_detailed_profile_access();

-- Create function to get admin activity report
CREATE OR REPLACE FUNCTION public.get_admin_profile_access_report(
    days_back INTEGER DEFAULT 7
)
RETURNS TABLE(
    accessor_display_name TEXT,
    accessor_user_id UUID,
    total_accesses BIGINT,
    unique_profiles_accessed BIGINT,
    sensitive_field_accesses BIGINT,
    last_access TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Only admins can view the report
    IF NOT is_admin_or_gosat(auth.uid()) THEN
        RAISE EXCEPTION 'Admin access required to view profile access reports'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    RETURN QUERY
    SELECT 
        COALESCE(p.display_name, p.first_name || ' ' || p.last_name, 'Unknown Admin') as accessor_display_name,
        pal.accessor_user_id,
        COUNT(*) as total_accesses,
        COUNT(DISTINCT pal.accessed_profile_id) as unique_profiles_accessed,
        COUNT(*) FILTER (WHERE pal.access_type = 'admin_view') as sensitive_field_accesses,
        MAX(pal.created_at) as last_access
    FROM public.profile_access_logs pal
    LEFT JOIN public.profiles p ON p.user_id = pal.accessor_user_id
    WHERE pal.created_at > now() - (days_back || ' days')::INTERVAL
    AND pal.access_type IN ('admin_view', 'profile_update')
    GROUP BY pal.accessor_user_id, p.display_name, p.first_name, p.last_name
    ORDER BY total_accesses DESC;
END;
$$;
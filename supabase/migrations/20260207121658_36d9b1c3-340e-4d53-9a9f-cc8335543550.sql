-- Create password_reset_requests table for manual password reset flow
CREATE TABLE public.password_reset_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Only gosat/admin roles can read password reset requests
CREATE POLICY "Gosats can view password reset requests"
ON public.password_reset_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'gosat'));

-- Only gosat/admin roles can update password reset requests (approve/reject)
CREATE POLICY "Gosats can update password reset requests"
ON public.password_reset_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'gosat'))
WITH CHECK (public.has_role(auth.uid(), 'gosat'));

-- Edge functions can insert (using service role, bypasses RLS)
-- No insert policy needed for regular users - edge function uses service role

-- Create index for faster lookups
CREATE INDEX idx_password_reset_requests_status ON public.password_reset_requests(status);
CREATE INDEX idx_password_reset_requests_email ON public.password_reset_requests(email);
CREATE INDEX idx_password_reset_requests_expires_at ON public.password_reset_requests(expires_at);
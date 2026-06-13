
CREATE TABLE public.signup_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  first_name text,
  last_name text,
  success boolean NOT NULL DEFAULT false,
  error_code text,
  error_message text,
  user_agent text,
  referral_code text,
  ip_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.signup_attempts TO anon, authenticated;
GRANT ALL ON public.signup_attempts TO service_role;

ALTER TABLE public.signup_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a signup attempt"
ON public.signup_attempts
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can read signup attempts"
ON public.signup_attempts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_signup_attempts_email ON public.signup_attempts (lower(email));
CREATE INDEX idx_signup_attempts_created_at ON public.signup_attempts (created_at DESC);

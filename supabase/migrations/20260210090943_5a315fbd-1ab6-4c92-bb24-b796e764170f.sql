
CREATE TABLE public.ambassador_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  "current_role" TEXT,
  username TEXT,
  email TEXT NOT NULL,
  platforms TEXT[] DEFAULT '{}',
  brand_name TEXT,
  why_represent TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ambassador_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit ambassador applications"
  ON public.ambassador_applications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own ambassador applications"
  ON public.ambassador_applications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create seed_submissions table for managing seed submissions
CREATE TABLE public.seed_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.seed_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for seed submissions
CREATE POLICY "Users can create their own seed submissions" 
ON public.seed_submissions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own seed submissions" 
ON public.seed_submissions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending submissions" 
ON public.seed_submissions 
FOR UPDATE 
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins and gosats can view all seed submissions" 
ON public.seed_submissions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gosat'::app_role));

CREATE POLICY "Admins and gosats can update seed submissions" 
ON public.seed_submissions 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gosat'::app_role));

-- Create trigger for updating timestamps
CREATE TRIGGER update_seed_submissions_updated_at
BEFORE UPDATE ON public.seed_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_seed_submissions_status ON public.seed_submissions(status);
CREATE INDEX idx_seed_submissions_user_id ON public.seed_submissions(user_id);
CREATE INDEX idx_seed_submissions_created_at ON public.seed_submissions(created_at DESC);
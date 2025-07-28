-- Create seeds table for gifted products/services
CREATE TABLE public.seeds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gifter_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  images text[] DEFAULT '{}',
  video_url text,
  additional_details jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.seeds ENABLE ROW LEVEL SECURITY;

-- Create policies for seeds
CREATE POLICY "Seeds are viewable by everyone" 
ON public.seeds 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own seeds" 
ON public.seeds 
FOR INSERT 
WITH CHECK (auth.uid() = gifter_id);

CREATE POLICY "Users can update their own seeds" 
ON public.seeds 
FOR UPDATE 
USING (auth.uid() = gifter_id);

CREATE POLICY "Users can delete their own seeds" 
ON public.seeds 
FOR DELETE 
USING (auth.uid() = gifter_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_seeds_updated_at
BEFORE UPDATE ON public.seeds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
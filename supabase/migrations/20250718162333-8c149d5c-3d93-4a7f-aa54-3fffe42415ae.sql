-- Create storage buckets for orchard media
INSERT INTO storage.buckets (id, name, public) VALUES ('orchard-images', 'orchard-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('orchard-videos', 'orchard-videos', true);

-- Create storage policies for orchard images
CREATE POLICY "Anyone can view orchard images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'orchard-images');

CREATE POLICY "Authenticated users can upload orchard images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'orchard-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own orchard images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'orchard-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own orchard images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'orchard-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for orchard videos
CREATE POLICY "Anyone can view orchard videos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'orchard-videos');

CREATE POLICY "Authenticated users can upload orchard videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'orchard-videos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own orchard videos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'orchard-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own orchard videos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'orchard-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create enum for orchard types
CREATE TYPE public.orchard_type AS ENUM ('standard', 'full_value');

-- Create enum for orchard status
CREATE TYPE public.orchard_status AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');

-- Create enum for verification status
CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'rejected');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create orchards table
CREATE TABLE public.orchards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  orchard_type public.orchard_type NOT NULL DEFAULT 'standard',
  seed_value DECIMAL(10,2) NOT NULL,
  original_seed_value DECIMAL(10,2) NOT NULL,
  tithing_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_processing_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  pocket_price DECIMAL(10,2) NOT NULL DEFAULT 150,
  total_pockets INTEGER GENERATED ALWAYS AS (CEIL(seed_value / pocket_price)) STORED,
  filled_pockets INTEGER NOT NULL DEFAULT 0,
  completion_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN CEIL(seed_value / pocket_price) > 0 
    THEN (filled_pockets::DECIMAL / CEIL(seed_value / pocket_price)) * 100 
    ELSE 0 END
  ) STORED,
  location TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  why_needed TEXT,
  how_it_helps TEXT,
  community_impact TEXT,
  expected_completion TEXT,
  features TEXT[],
  images TEXT[],
  video_url TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  supporters INTEGER NOT NULL DEFAULT 0,
  status public.orchard_status NOT NULL DEFAULT 'active',
  verification_status public.verification_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on orchards
ALTER TABLE public.orchards ENABLE ROW LEVEL SECURITY;

-- Create policies for orchards
CREATE POLICY "Orchards are viewable by everyone" 
ON public.orchards 
FOR SELECT 
USING (status = 'active');

CREATE POLICY "Users can create their own orchards" 
ON public.orchards 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orchards" 
ON public.orchards 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own orchards" 
ON public.orchards 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create bestowals table
CREATE TABLE public.bestowals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orchard_id UUID NOT NULL REFERENCES public.orchards(id) ON DELETE CASCADE,
  bestower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  pockets_count INTEGER NOT NULL,
  pocket_numbers INTEGER[],
  payment_method TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_reference TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on bestowals
ALTER TABLE public.bestowals ENABLE ROW LEVEL SECURITY;

-- Create policies for bestowals
CREATE POLICY "Users can view their own bestowals" 
ON public.bestowals 
FOR SELECT 
USING (auth.uid() = bestower_id);

CREATE POLICY "Orchard owners can view bestowals for their orchards" 
ON public.bestowals 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orchards 
    WHERE orchards.id = bestowals.orchard_id 
    AND orchards.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create bestowals" 
ON public.bestowals 
FOR INSERT 
WITH CHECK (auth.uid() = bestower_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orchards_updated_at
  BEFORE UPDATE ON public.orchards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bestowals_updated_at
  BEFORE UPDATE ON public.bestowals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, display_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      CONCAT(
        NEW.raw_user_meta_data ->> 'first_name',
        ' ',
        NEW.raw_user_meta_data ->> 'last_name'
      )
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update orchard stats
CREATE OR REPLACE FUNCTION public.update_orchard_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update filled_pockets and supporters count
  UPDATE public.orchards
  SET 
    filled_pockets = (
      SELECT COALESCE(SUM(pockets_count), 0)
      FROM public.bestowals
      WHERE orchard_id = NEW.orchard_id AND payment_status = 'completed'
    ),
    supporters = (
      SELECT COUNT(DISTINCT bestower_id)
      FROM public.bestowals
      WHERE orchard_id = NEW.orchard_id AND payment_status = 'completed'
    )
  WHERE id = NEW.orchard_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update orchard stats when bestowals change
CREATE TRIGGER update_orchard_stats_trigger
  AFTER INSERT OR UPDATE ON public.bestowals
  FOR EACH ROW EXECUTE FUNCTION public.update_orchard_stats();

-- Create function to increment orchard views
CREATE OR REPLACE FUNCTION public.increment_orchard_views(orchard_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.orchards
  SET views = views + 1
  WHERE id = orchard_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX idx_orchards_user_id ON public.orchards(user_id);
CREATE INDEX idx_orchards_status ON public.orchards(status);
CREATE INDEX idx_orchards_category ON public.orchards(category);
CREATE INDEX idx_orchards_created_at ON public.orchards(created_at DESC);
CREATE INDEX idx_bestowals_orchard_id ON public.bestowals(orchard_id);
CREATE INDEX idx_bestowals_bestower_id ON public.bestowals(bestower_id);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
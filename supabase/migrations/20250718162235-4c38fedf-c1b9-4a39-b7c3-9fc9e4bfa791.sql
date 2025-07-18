-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  profile_picture TEXT,
  preferred_currency TEXT DEFAULT 'USD',
  bio TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orchards table
CREATE TABLE public.orchards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  orchard_type TEXT DEFAULT 'standard' CHECK (orchard_type IN ('standard', 'full_value')),
  seed_value DECIMAL(12,2) NOT NULL CHECK (seed_value > 0),
  original_seed_value DECIMAL(12,2) NOT NULL CHECK (original_seed_value > 0),
  tithing_amount DECIMAL(12,2) DEFAULT 0,
  payment_processing_fee DECIMAL(12,2) DEFAULT 0,
  pocket_price DECIMAL(12,2) DEFAULT 150 CHECK (pocket_price > 0),
  total_pockets INTEGER GENERATED ALWAYS AS (CEIL(seed_value / pocket_price)) STORED,
  filled_pockets INTEGER DEFAULT 0,
  location TEXT,
  why_needed TEXT,
  how_it_helps TEXT,
  community_impact TEXT,
  expected_completion TEXT,
  features TEXT[],
  images TEXT[],
  video_url TEXT,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  progress DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN seed_value > 0 THEN LEAST((filled_pockets * pocket_price / seed_value) * 100, 100)
      ELSE 0
    END
  ) STORED,
  views INTEGER DEFAULT 0,
  supporters_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bestowals table (for tracking individual contributions)
CREATE TABLE public.bestowals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orchard_id UUID NOT NULL REFERENCES public.orchards(id) ON DELETE CASCADE,
  bestower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  pockets_purchased INTEGER NOT NULL CHECK (pockets_purchased > 0),
  currency TEXT DEFAULT 'USD',
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT,
  payment_reference TEXT,
  message TEXT,
  anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orchards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bestowals ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view all profiles" 
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

-- Create policies for orchards
CREATE POLICY "Anyone can view active orchards" 
ON public.orchards 
FOR SELECT 
USING (status = 'active' OR auth.uid() = user_id);

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

-- Create policies for bestowals
CREATE POLICY "Users can view bestowals for their orchards or their own bestowals" 
ON public.bestowals 
FOR SELECT 
USING (
  auth.uid() = bestower_id OR 
  auth.uid() IN (SELECT user_id FROM public.orchards WHERE id = orchard_id)
);

CREATE POLICY "Users can create bestowals" 
ON public.bestowals 
FOR INSERT 
WITH CHECK (auth.uid() = bestower_id);

CREATE POLICY "Users can update their own bestowals" 
ON public.bestowals 
FOR UPDATE 
USING (auth.uid() = bestower_id);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('orchard-images', 'orchard-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('orchard-videos', 'orchard-videos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-pictures', 'profile-pictures', true);

-- Create storage policies for orchard images
CREATE POLICY "Anyone can view orchard images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'orchard-images');

CREATE POLICY "Users can upload orchard images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'orchard-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own orchard images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'orchard-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own orchard images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'orchard-images' AND auth.uid() IS NOT NULL);

-- Create storage policies for orchard videos
CREATE POLICY "Anyone can view orchard videos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'orchard-videos');

CREATE POLICY "Users can upload orchard videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'orchard-videos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own orchard videos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'orchard-videos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own orchard videos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'orchard-videos' AND auth.uid() IS NOT NULL);

-- Create storage policies for profile pictures
CREATE POLICY "Anyone can view profile pictures" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can upload their own profile picture" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile picture" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile picture" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

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

-- Create trigger to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, phone)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'first_name', 
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Create function to update orchard statistics when bestowals change
CREATE OR REPLACE FUNCTION public.update_orchard_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the orchard's filled_pockets and supporters_count
  UPDATE public.orchards 
  SET 
    filled_pockets = COALESCE((
      SELECT SUM(pockets_purchased) 
      FROM public.bestowals 
      WHERE orchard_id = COALESCE(NEW.orchard_id, OLD.orchard_id) 
      AND payment_status = 'completed'
    ), 0),
    supporters_count = COALESCE((
      SELECT COUNT(DISTINCT bestower_id) 
      FROM public.bestowals 
      WHERE orchard_id = COALESCE(NEW.orchard_id, OLD.orchard_id) 
      AND payment_status = 'completed'
    ), 0)
  WHERE id = COALESCE(NEW.orchard_id, OLD.orchard_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orchard_stats_on_bestowal
AFTER INSERT OR UPDATE OR DELETE ON public.bestowals
FOR EACH ROW
EXECUTE FUNCTION public.update_orchard_stats();

-- Create indexes for better performance
CREATE INDEX idx_orchards_user_id ON public.orchards(user_id);
CREATE INDEX idx_orchards_status ON public.orchards(status);
CREATE INDEX idx_orchards_category ON public.orchards(category);
CREATE INDEX idx_orchards_created_at ON public.orchards(created_at DESC);
CREATE INDEX idx_bestowals_orchard_id ON public.bestowals(orchard_id);
CREATE INDEX idx_bestowals_bestower_id ON public.bestowals(bestower_id);
CREATE INDEX idx_bestowals_payment_status ON public.bestowals(payment_status);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);

-- Insert some sample data for testing
INSERT INTO public.orchards (
  user_id, title, description, category, seed_value, original_seed_value, 
  tithing_amount, payment_processing_fee, pocket_price, location, 
  why_needed, community_impact, status, filled_pockets, supporters_count
) VALUES 
-- Only insert if there are users (this will work after someone signs up)
-- We'll add this data through the app instead
-- Commission Marketing Tables
CREATE TABLE public.affiliates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  earnings NUMERIC NOT NULL DEFAULT 0,
  commission_rate NUMERIC NOT NULL DEFAULT 10,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  orchard_id UUID REFERENCES public.orchards(id) ON DELETE CASCADE,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  commission_rate NUMERIC NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Gamification Tables Enhancement
CREATE TABLE public.available_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  achievement_type TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  icon TEXT,
  criteria JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Push Notification Tables
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS Policies for Commission Marketing
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.available_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Affiliates policies
CREATE POLICY "Users can view their own affiliate data" ON public.affiliates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own affiliate data" ON public.affiliates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert affiliate data" ON public.affiliates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Referrals policies
CREATE POLICY "Referrers can view their referrals" ON public.referrals
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM public.affiliates WHERE id = referrer_id
  ));

CREATE POLICY "System can manage referrals" ON public.referrals
  FOR ALL USING (true);

-- Available achievements policies
CREATE POLICY "Anyone can view available achievements" ON public.available_achievements
  FOR SELECT USING (is_active = true);

-- Push subscriptions policies
CREATE POLICY "Users can manage their own push subscriptions" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Insert sample achievements
INSERT INTO public.available_achievements (achievement_type, title, description, points_awarded, icon, criteria) VALUES
('first_orchard', 'First Orchard', 'Created your first orchard', 100, 'seedling', '{"orchards_created": 1}'),
('first_bestowal', 'First Supporter', 'Made your first bestowal', 50, 'heart', '{"bestowals_made": 1}'),
('early_bird', 'Early Bird', 'Among the first 100 users', 200, 'clock', '{"user_rank": 100}'),
('community_builder', 'Community Builder', 'Helped fund 10 orchards', 500, 'users', '{"bestowals_made": 10}'),
('generous_supporter', 'Generous Supporter', 'Total donations over $1000', 1000, 'gift', '{"total_donated": 1000}');

-- Function to automatically create affiliate when user signs up
CREATE OR REPLACE FUNCTION public.create_affiliate_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.affiliates (user_id, referral_code)
  VALUES (NEW.id, UPPER(SUBSTRING(MD5(NEW.id::text), 1, 8)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create affiliate on user signup
CREATE TRIGGER on_user_created_affiliate
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_affiliate_on_signup();
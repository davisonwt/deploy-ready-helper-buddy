-- Create followers table to track user follows
CREATE TABLE public.followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT CHECK (source_type IN ('product', 'orchard', 'profile')),
  source_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Create product likes table
CREATE TABLE public.product_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);

-- Create orchard likes table
CREATE TABLE public.orchard_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orchard_id UUID NOT NULL REFERENCES orchards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(orchard_id, user_id)
);

-- Create follower notifications table
CREATE TABLE public.follower_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT CHECK (source_type IN ('product', 'orchard', 'profile')),
  source_id UUID,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add follower counts to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Add follower counts to orchards table  
ALTER TABLE orchards ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0;
ALTER TABLE orchards ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orchard_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follower_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for followers
CREATE POLICY "Users can follow others" ON public.followers
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON public.followers
  FOR DELETE USING (auth.uid() = follower_id);

CREATE POLICY "Anyone can view followers" ON public.followers
  FOR SELECT USING (true);

-- RLS Policies for product likes
CREATE POLICY "Users can like products" ON public.product_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike products" ON public.product_likes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view product likes" ON public.product_likes
  FOR SELECT USING (true);

-- RLS Policies for orchard likes
CREATE POLICY "Users can like orchards" ON public.orchard_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike orchards" ON public.orchard_likes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view orchard likes" ON public.orchard_likes
  FOR SELECT USING (true);

-- RLS Policies for notifications
CREATE POLICY "Users can view their notifications" ON public.follower_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications" ON public.follower_notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.follower_notifications
  FOR INSERT WITH CHECK (true);

-- Create function to update follower counts
CREATE OR REPLACE FUNCTION update_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'followers' THEN
    IF TG_OP = 'INSERT' THEN
      -- Insert notification
      INSERT INTO follower_notifications (user_id, follower_id, source_type, source_id)
      VALUES (NEW.following_id, NEW.follower_id, NEW.source_type, NEW.source_id);
    END IF;
  ELSIF TG_TABLE_NAME = 'product_likes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE products SET like_count = like_count + 1 WHERE id = NEW.product_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE products SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.product_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'orchard_likes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE orchards SET like_count = like_count + 1 WHERE id = NEW.orchard_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE orchards SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.orchard_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER update_follower_count_trigger
  AFTER INSERT OR DELETE ON followers
  FOR EACH ROW EXECUTE FUNCTION update_follower_count();

CREATE TRIGGER update_product_like_count_trigger
  AFTER INSERT OR DELETE ON product_likes
  FOR EACH ROW EXECUTE FUNCTION update_follower_count();

CREATE TRIGGER update_orchard_like_count_trigger
  AFTER INSERT OR DELETE ON orchard_likes
  FOR EACH ROW EXECUTE FUNCTION update_follower_count();

-- Create indexes for performance
CREATE INDEX idx_followers_follower ON followers(follower_id);
CREATE INDEX idx_followers_following ON followers(following_id);
CREATE INDEX idx_followers_source ON followers(source_type, source_id);
CREATE INDEX idx_product_likes_product ON product_likes(product_id);
CREATE INDEX idx_product_likes_user ON product_likes(user_id);
CREATE INDEX idx_orchard_likes_orchard ON orchard_likes(orchard_id);
CREATE INDEX idx_orchard_likes_user ON orchard_likes(user_id);
CREATE INDEX idx_notifications_user ON follower_notifications(user_id, read);
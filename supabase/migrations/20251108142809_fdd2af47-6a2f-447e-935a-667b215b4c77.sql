-- Create sowers table for content creators
CREATE TABLE IF NOT EXISTS sowers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  logo_url TEXT,
  bio TEXT,
  is_verified BOOLEAN DEFAULT false,
  wallet_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create products table for music, files, and art
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sower_id UUID REFERENCES sowers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('music', 'file', 'art')),
  category TEXT,
  license_type TEXT CHECK (license_type IN ('free', 'bestowal')) DEFAULT 'free',
  price DECIMAL(10,2) DEFAULT 0,
  file_url TEXT NOT NULL,
  cover_image_url TEXT,
  duration INTEGER,
  play_count BIGINT DEFAULT 0,
  download_count BIGINT DEFAULT 0,
  bestowal_count BIGINT DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create baskets table
CREATE TABLE IF NOT EXISTS baskets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create basket_items table
CREATE TABLE IF NOT EXISTS basket_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  basket_id UUID REFERENCES baskets(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(basket_id, product_id)
);

-- Create bestowals table for tracking transactions
CREATE TABLE IF NOT EXISTS product_bestowals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bestower_id UUID REFERENCES auth.users(id),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  sower_id UUID REFERENCES sowers(id),
  amount DECIMAL(10,2) NOT NULL,
  s2g_fee DECIMAL(10,2) NOT NULL,
  sower_amount DECIMAL(10,2) NOT NULL,
  grower_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'completed',
  payment_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE baskets ENABLE ROW LEVEL SECURITY;
ALTER TABLE basket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_bestowals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sowers
CREATE POLICY "Anyone can view sowers" ON sowers FOR SELECT USING (true);
CREATE POLICY "Users can create their sower profile" ON sowers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their sower profile" ON sowers FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for products
CREATE POLICY "Anyone can view products" ON products FOR SELECT USING (true);
CREATE POLICY "Sowers can create products" ON products FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM sowers WHERE sowers.id = products.sower_id AND sowers.user_id = auth.uid())
);
CREATE POLICY "Sowers can update their products" ON products FOR UPDATE USING (
  EXISTS (SELECT 1 FROM sowers WHERE sowers.id = products.sower_id AND sowers.user_id = auth.uid())
);
CREATE POLICY "Sowers can delete their products" ON products FOR DELETE USING (
  EXISTS (SELECT 1 FROM sowers WHERE sowers.id = products.sower_id AND sowers.user_id = auth.uid())
);

-- RLS Policies for baskets
CREATE POLICY "Users can view their basket" ON baskets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their basket" ON baskets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their basket" ON baskets FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for basket_items
CREATE POLICY "Users can view their basket items" ON basket_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM baskets WHERE baskets.id = basket_items.basket_id AND baskets.user_id = auth.uid())
);
CREATE POLICY "Users can add to their basket" ON basket_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM baskets WHERE baskets.id = basket_items.basket_id AND baskets.user_id = auth.uid())
);
CREATE POLICY "Users can update their basket items" ON basket_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM baskets WHERE baskets.id = basket_items.basket_id AND baskets.user_id = auth.uid())
);
CREATE POLICY "Users can remove from their basket" ON basket_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM baskets WHERE baskets.id = basket_items.basket_id AND baskets.user_id = auth.uid())
);

-- RLS Policies for product_bestowals
CREATE POLICY "Users can view their bestowals" ON product_bestowals FOR SELECT USING (
  auth.uid() = bestower_id OR 
  EXISTS (SELECT 1 FROM sowers WHERE sowers.id = product_bestowals.sower_id AND sowers.user_id = auth.uid())
);
CREATE POLICY "Users can create bestowals" ON product_bestowals FOR INSERT WITH CHECK (auth.uid() = bestower_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_sower_id ON products(sower_id);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_bestowal_count ON products(bestowal_count DESC);
CREATE INDEX IF NOT EXISTS idx_basket_items_basket_id ON basket_items(basket_id);
CREATE INDEX IF NOT EXISTS idx_product_bestowals_bestower ON product_bestowals(bestower_id);
CREATE INDEX IF NOT EXISTS idx_product_bestowals_product ON product_bestowals(product_id);

-- Create function to update product stats
CREATE OR REPLACE FUNCTION increment_product_play_count(product_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE products 
  SET play_count = play_count + 1,
      updated_at = NOW()
  WHERE id = product_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment download count
CREATE OR REPLACE FUNCTION increment_product_download_count(product_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE products 
  SET download_count = download_count + 1,
      updated_at = NOW()
  WHERE id = product_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sowers_updated_at BEFORE UPDATE ON sowers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_baskets_updated_at BEFORE UPDATE ON baskets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
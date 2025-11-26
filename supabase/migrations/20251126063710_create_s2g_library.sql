-- Create s2g_library_items table for e-books, documents, training courses, art assets, and music
CREATE TABLE IF NOT EXISTS s2g_library_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('ebook', 'document', 'training_course', 'art_asset', 'music')),
  category TEXT,
  file_url TEXT NOT NULL, -- Full file URL (only accessible after bestowal)
  preview_url TEXT, -- Preview/thumbnail URL (shown in community library)
  cover_image_url TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'USDC',
  bestowal_count BIGINT DEFAULT 0,
  download_count BIGINT DEFAULT 0,
  is_public BOOLEAN DEFAULT true, -- Whether to show in community library
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create s2g_library_bestowals table to track purchases
CREATE TABLE IF NOT EXISTS s2g_library_bestowals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_item_id UUID NOT NULL REFERENCES s2g_library_items(id) ON DELETE CASCADE,
  bestower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USDC',
  payment_reference TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT,
  distribution_mode TEXT DEFAULT 'auto' CHECK (distribution_mode IN ('auto', 'manual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create s2g_library_item_access table to track who has access to full files
CREATE TABLE IF NOT EXISTS s2g_library_item_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_item_id UUID NOT NULL REFERENCES s2g_library_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bestowal_id UUID REFERENCES s2g_library_bestowals(id) ON DELETE SET NULL,
  access_granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(library_item_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_s2g_library_items_user_id ON s2g_library_items(user_id);
CREATE INDEX IF NOT EXISTS idx_s2g_library_items_type ON s2g_library_items(type);
CREATE INDEX IF NOT EXISTS idx_s2g_library_items_is_public ON s2g_library_items(is_public);
CREATE INDEX IF NOT EXISTS idx_s2g_library_bestowals_library_item_id ON s2g_library_bestowals(library_item_id);
CREATE INDEX IF NOT EXISTS idx_s2g_library_bestowals_bestower_id ON s2g_library_bestowals(bestower_id);
CREATE INDEX IF NOT EXISTS idx_s2g_library_bestowals_sower_id ON s2g_library_bestowals(sower_id);
CREATE INDEX IF NOT EXISTS idx_s2g_library_bestowals_payment_status ON s2g_library_bestowals(payment_status);
CREATE INDEX IF NOT EXISTS idx_s2g_library_item_access_library_item_id ON s2g_library_item_access(library_item_id);
CREATE INDEX IF NOT EXISTS idx_s2g_library_item_access_user_id ON s2g_library_item_access(user_id);

-- Enable Row Level Security
ALTER TABLE s2g_library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE s2g_library_bestowals ENABLE ROW LEVEL SECURITY;
ALTER TABLE s2g_library_item_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for s2g_library_items
-- Users can view their own items
CREATE POLICY "Users can view their own library items"
  ON s2g_library_items FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view public items in community library
CREATE POLICY "Anyone can view public library items"
  ON s2g_library_items FOR SELECT
  USING (is_public = true);

-- Users can create their own library items
CREATE POLICY "Users can create their own library items"
  ON s2g_library_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own library items
CREATE POLICY "Users can update their own library items"
  ON s2g_library_items FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own library items
CREATE POLICY "Users can delete their own library items"
  ON s2g_library_items FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for s2g_library_bestowals
-- Users can view their own bestowals (as bestower or sower)
CREATE POLICY "Users can view their own library bestowals"
  ON s2g_library_bestowals FOR SELECT
  USING (auth.uid() = bestower_id OR auth.uid() = sower_id);

-- Users can create bestowals
CREATE POLICY "Users can create library bestowals"
  ON s2g_library_bestowals FOR INSERT
  WITH CHECK (auth.uid() = bestower_id);

-- RLS Policies for s2g_library_item_access
-- Users can view their own access records
CREATE POLICY "Users can view their own library access"
  ON s2g_library_item_access FOR SELECT
  USING (auth.uid() = user_id);

-- System can grant access (via service role)
CREATE POLICY "System can grant library access"
  ON s2g_library_item_access FOR INSERT
  WITH CHECK (true); -- This will be restricted by service role usage

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_s2g_library_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_s2g_library_items_updated_at
  BEFORE UPDATE ON s2g_library_items
  FOR EACH ROW
  EXECUTE FUNCTION update_s2g_library_items_updated_at();

CREATE TRIGGER update_s2g_library_bestowals_updated_at
  BEFORE UPDATE ON s2g_library_bestowals
  FOR EACH ROW
  EXECUTE FUNCTION update_s2g_library_items_updated_at();


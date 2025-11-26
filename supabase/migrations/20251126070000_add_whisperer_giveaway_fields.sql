-- Add whisperer percentage, giveaway fields, and preview_url to s2g_library_items
ALTER TABLE s2g_library_items
ADD COLUMN IF NOT EXISTS whisperer_percentage DECIMAL(5,2) DEFAULT 0 CHECK (whisperer_percentage >= 0 AND whisperer_percentage <= 30),
ADD COLUMN IF NOT EXISTS is_giveaway BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS giveaway_limit INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS giveaway_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS preview_url TEXT,
ADD COLUMN IF NOT EXISTS preview_duration_seconds INTEGER DEFAULT 30 CHECK (preview_duration_seconds >= 0 AND preview_duration_seconds <= 300);

-- Add whisperer percentage to products table as well
ALTER TABLE products
ADD COLUMN IF NOT EXISTS whisperer_percentage DECIMAL(5,2) DEFAULT 0 CHECK (whisperer_percentage >= 0 AND whisperer_percentage <= 30),
ADD COLUMN IF NOT EXISTS is_giveaway BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS giveaway_limit INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS giveaway_count INTEGER DEFAULT 0;

-- Update comment
COMMENT ON COLUMN s2g_library_items.whisperer_percentage IS 'Percentage (2.5% to 30%) allocated to S2G whisperers (content marketers)';
COMMENT ON COLUMN s2g_library_items.is_giveaway IS 'If true, item is a limited giveaway instead of requiring bestowal';
COMMENT ON COLUMN s2g_library_items.giveaway_limit IS 'Maximum number of free downloads for giveaway items';
COMMENT ON COLUMN s2g_library_items.preview_duration_seconds IS 'Preview duration in seconds (30 for music/courses, full preview for e-books)';

-- Ensure price is required for non-giveaway items (enforced at application level)
-- Note: We can't add a CHECK constraint here because price can be 0 for giveaways


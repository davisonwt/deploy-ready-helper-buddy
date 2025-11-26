-- Create library items table for S2G Community Library/Music
CREATE TABLE IF NOT EXISTS public.s2g_library_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'ebook',
  category TEXT,
  price NUMERIC DEFAULT 0,
  file_url TEXT NOT NULL,
  preview_url TEXT,
  cover_image_url TEXT,
  file_size BIGINT,
  tags TEXT[],
  is_public BOOLEAN DEFAULT true,
  bestowal_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create library item access table
CREATE TABLE IF NOT EXISTS public.s2g_library_item_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  library_item_id UUID NOT NULL REFERENCES public.s2g_library_items(id) ON DELETE CASCADE,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  access_type TEXT DEFAULT 'download'
);

-- Enable RLS
ALTER TABLE public.s2g_library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.s2g_library_item_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for library items
CREATE POLICY "Users can view public library items"
  ON public.s2g_library_items FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view their own library items"
  ON public.s2g_library_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own library items"
  ON public.s2g_library_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own library items"
  ON public.s2g_library_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own library items"
  ON public.s2g_library_items FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for library item access
CREATE POLICY "Users can view their own access records"
  ON public.s2g_library_item_access FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own access records"
  ON public.s2g_library_item_access FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_s2g_library_items_user_id ON public.s2g_library_items(user_id);
CREATE INDEX idx_s2g_library_items_type ON public.s2g_library_items(type);
CREATE INDEX idx_s2g_library_item_access_user_id ON public.s2g_library_item_access(user_id);
CREATE INDEX idx_s2g_library_item_access_library_item_id ON public.s2g_library_item_access(library_item_id);

-- Create updated_at trigger
CREATE TRIGGER update_s2g_library_items_updated_at
  BEFORE UPDATE ON public.s2g_library_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
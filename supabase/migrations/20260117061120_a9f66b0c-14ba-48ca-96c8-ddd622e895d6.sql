-- Create sower_books table for books written by sowers
CREATE TABLE public.sower_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sower_id UUID NOT NULL REFERENCES public.sowers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  isbn TEXT,
  description TEXT CHECK (char_length(description) <= 5000),
  cover_image_url TEXT,
  published_date DATE,
  publisher TEXT,
  page_count INTEGER,
  genre TEXT,
  language TEXT DEFAULT 'English',
  purchase_link TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX idx_sower_books_sower_id ON public.sower_books(sower_id);
CREATE INDEX idx_sower_books_user_id ON public.sower_books(user_id);
CREATE INDEX idx_sower_books_created_at ON public.sower_books(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.sower_books ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all books
CREATE POLICY "Anyone can view sower books" 
ON public.sower_books 
FOR SELECT 
USING (true);

-- Policy: Users can create their own books
CREATE POLICY "Users can create their own books" 
ON public.sower_books 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own books
CREATE POLICY "Users can update their own books" 
ON public.sower_books 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy: Users can delete their own books
CREATE POLICY "Users can delete their own books" 
ON public.sower_books 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sower_books_updated_at
BEFORE UPDATE ON public.sower_books
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
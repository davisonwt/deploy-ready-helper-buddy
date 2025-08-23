-- Create storage bucket for session documents/images
INSERT INTO storage.buckets (id, name, public) VALUES ('session-documents', 'session-documents', true);

-- Create table for tracking shared documents in sessions
CREATE TABLE public.session_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  uploader_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  current_page INTEGER DEFAULT 1,
  total_pages INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for session listeners (unlimited)
CREATE TABLE public.session_listeners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  user_id UUID NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(session_id, user_id)
);

-- Create table for document annotations/pointers
CREATE TABLE public.document_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES session_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  annotation_type TEXT NOT NULL DEFAULT 'pointer', -- pointer, highlight, note
  page_number INTEGER NOT NULL DEFAULT 1,
  x_position NUMERIC,
  y_position NUMERIC,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.session_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_listeners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_annotations ENABLE ROW LEVEL SECURITY;

-- RLS policies for session_documents
CREATE POLICY "Users can view documents in their sessions" ON public.session_documents
  FOR SELECT USING (
    session_id IN (
      SELECT session_id FROM public.session_listeners 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Authenticated users can upload documents" ON public.session_documents
  FOR INSERT WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Document uploaders and hosts can update documents" ON public.session_documents
  FOR UPDATE USING (
    auth.uid() = uploader_id OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gosat'::app_role)
  );

-- RLS policies for session_listeners
CREATE POLICY "Users can view listeners in their sessions" ON public.session_listeners
  FOR SELECT USING (
    session_id IN (
      SELECT session_id FROM public.session_listeners 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can join as listeners" ON public.session_listeners
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own listener status" ON public.session_listeners
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for document_annotations
CREATE POLICY "Users can view annotations in their sessions" ON public.document_annotations
  FOR SELECT USING (
    document_id IN (
      SELECT sd.id FROM public.session_documents sd
      JOIN public.session_listeners sl ON sd.session_id = sl.session_id
      WHERE sl.user_id = auth.uid() AND sl.is_active = true
    )
  );

CREATE POLICY "Authenticated users can create annotations" ON public.document_annotations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own annotations" ON public.document_annotations
  FOR UPDATE USING (auth.uid() = user_id);

-- Storage policies for session documents
CREATE POLICY "Authenticated users can upload session documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'session-documents' AND 
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can view documents in their sessions" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'session-documents' AND 
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Document uploaders can update their files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'session-documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to update document page for all viewers
CREATE OR REPLACE FUNCTION public.update_document_page(document_id_param UUID, new_page INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if user has permission to control document
  IF NOT EXISTS (
    SELECT 1 FROM public.session_documents sd
    JOIN public.session_listeners sl ON sd.session_id = sl.session_id
    WHERE sd.id = document_id_param 
    AND sl.user_id = auth.uid() 
    AND sl.is_active = true
    AND (sd.uploader_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to control document';
  END IF;
  
  -- Update the current page
  UPDATE public.session_documents 
  SET 
    current_page = new_page,
    updated_at = now()
  WHERE id = document_id_param;
  
  RETURN true;
END;
$$;
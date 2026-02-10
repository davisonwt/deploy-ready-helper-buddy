-- Add reply support to memry_comments
ALTER TABLE public.memry_comments ADD COLUMN parent_comment_id UUID REFERENCES public.memry_comments(id) ON DELETE CASCADE;

CREATE INDEX idx_memry_comments_parent ON public.memry_comments(parent_comment_id);

ALTER TABLE public.s2g_library_items 
  ADD COLUMN IF NOT EXISTS study_number integer,
  ADD COLUMN IF NOT EXISTS parent_study_id uuid REFERENCES public.s2g_library_items(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS section_title text,
  ADD COLUMN IF NOT EXISTS section_order integer DEFAULT 0;

-- Create index for parent study lookups
CREATE INDEX IF NOT EXISTS idx_library_items_parent_study ON public.s2g_library_items(parent_study_id) WHERE parent_study_id IS NOT NULL;

-- Create index for study numbering lookups
CREATE INDEX IF NOT EXISTS idx_library_items_study_number ON public.s2g_library_items(user_id, study_number) WHERE type = 'study' AND parent_study_id IS NULL;

-- Function to auto-assign study_number on insert
CREATE OR REPLACE FUNCTION public.assign_study_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'study' AND NEW.parent_study_id IS NULL AND NEW.study_number IS NULL THEN
    SELECT COALESCE(MAX(study_number), 0) + 1 INTO NEW.study_number
    FROM public.s2g_library_items
    WHERE user_id = NEW.user_id AND type = 'study' AND parent_study_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_assign_study_number
BEFORE INSERT ON public.s2g_library_items
FOR EACH ROW
EXECUTE FUNCTION public.assign_study_number();

-- Backfill existing studies with study_number
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) AS rn
  FROM public.s2g_library_items
  WHERE type = 'study' AND parent_study_id IS NULL AND study_number IS NULL
)
UPDATE public.s2g_library_items SET study_number = numbered.rn
FROM numbered WHERE s2g_library_items.id = numbered.id;

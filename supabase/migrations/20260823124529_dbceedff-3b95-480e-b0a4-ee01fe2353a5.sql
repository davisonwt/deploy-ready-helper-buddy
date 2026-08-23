ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS item_id uuid REFERENCES public.books_items(id) ON DELETE SET NULL;
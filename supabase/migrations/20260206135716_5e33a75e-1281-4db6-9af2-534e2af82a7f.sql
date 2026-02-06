-- Create whisperer invitations table for sower → whisperer invites
CREATE TABLE public.whisperer_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  orchard_id UUID REFERENCES public.orchards(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.sower_books(id) ON DELETE CASCADE,
  sower_id UUID NOT NULL,
  whisperer_id UUID NOT NULL REFERENCES public.whisperers(id) ON DELETE CASCADE,
  proposed_commission_percent NUMERIC NOT NULL CHECK (proposed_commission_percent >= 1 AND proposed_commission_percent <= 50),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  message TEXT, -- Optional message from sower
  responded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure at least one entity is linked
  CONSTRAINT invitation_has_entity CHECK (
    (product_id IS NOT NULL)::int + (orchard_id IS NOT NULL)::int + (book_id IS NOT NULL)::int = 1
  )
);

-- Add max_whisperers column to products, orchards, sower_books
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS max_whisperers INTEGER DEFAULT 3 CHECK (max_whisperers >= 1 AND max_whisperers <= 3);
ALTER TABLE public.orchards ADD COLUMN IF NOT EXISTS max_whisperers INTEGER DEFAULT 3 CHECK (max_whisperers >= 1 AND max_whisperers <= 3);
ALTER TABLE public.sower_books ADD COLUMN IF NOT EXISTS max_whisperers INTEGER DEFAULT 3 CHECK (max_whisperers >= 1 AND max_whisperers <= 3);

-- Update product_whisperer_assignments to require accepted invitation
ALTER TABLE public.product_whisperer_assignments ADD COLUMN IF NOT EXISTS invitation_id UUID REFERENCES public.whisperer_invitations(id);

-- Enable RLS
ALTER TABLE public.whisperer_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for invitations
CREATE POLICY "Sowers can create invitations for their own products/orchards/books"
ON public.whisperer_invitations FOR INSERT
WITH CHECK (auth.uid() = sower_id);

CREATE POLICY "Users can view invitations they sent or received"
ON public.whisperer_invitations FOR SELECT
USING (
  auth.uid() = sower_id OR 
  auth.uid() IN (SELECT user_id FROM public.whisperers WHERE id = whisperer_id)
);

CREATE POLICY "Whisperers can update invitation status (accept/decline)"
ON public.whisperer_invitations FOR UPDATE
USING (
  auth.uid() IN (SELECT user_id FROM public.whisperers WHERE id = whisperer_id)
)
WITH CHECK (
  auth.uid() IN (SELECT user_id FROM public.whisperers WHERE id = whisperer_id)
);

CREATE POLICY "Sowers can cancel their own invitations"
ON public.whisperer_invitations FOR UPDATE
USING (auth.uid() = sower_id AND status = 'pending')
WITH CHECK (auth.uid() = sower_id AND status = 'cancelled');

-- Indexes for performance
CREATE INDEX idx_whisperer_invitations_whisperer ON public.whisperer_invitations(whisperer_id);
CREATE INDEX idx_whisperer_invitations_sower ON public.whisperer_invitations(sower_id);
CREATE INDEX idx_whisperer_invitations_status ON public.whisperer_invitations(status);
CREATE INDEX idx_whisperer_invitations_product ON public.whisperer_invitations(product_id) WHERE product_id IS NOT NULL;

-- Trigger to update updated_at
CREATE TRIGGER update_whisperer_invitations_updated_at
BEFORE UPDATE ON public.whisperer_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
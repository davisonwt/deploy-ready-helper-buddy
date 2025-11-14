-- Add user_id column to organization_wallets for ownership
ALTER TABLE public.organization_wallets 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster user lookups
CREATE INDEX idx_organization_wallets_user_id ON public.organization_wallets(user_id);

-- Update RLS policies for organization_wallets
DROP POLICY IF EXISTS "Gosat users can manage organization wallets" ON public.organization_wallets;

-- Users can view wallets they own or platform wallets (s2gholding, s2gbestow)
CREATE POLICY "Users can view their wallets or platform wallets"
ON public.organization_wallets
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR wallet_name IN ('s2gholding', 's2gbestow')
  OR has_role(auth.uid(), 'gosat')
  OR has_role(auth.uid(), 'admin')
);

-- Users can update their own wallets, gosats can update all
CREATE POLICY "Users can update their own wallets"
ON public.organization_wallets
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  OR has_role(auth.uid(), 'gosat')
  OR has_role(auth.uid(), 'admin')
)
WITH CHECK (
  user_id = auth.uid() 
  OR has_role(auth.uid(), 'gosat')
  OR has_role(auth.uid(), 'admin')
);

-- Users can insert their own wallets
CREATE POLICY "Users can create their own wallets"
ON public.organization_wallets
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  OR has_role(auth.uid(), 'gosat')
  OR has_role(auth.uid(), 'admin')
);

-- Only admins/gosats can delete
CREATE POLICY "Admins can delete wallets"
ON public.organization_wallets
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'gosat')
  OR has_role(auth.uid(), 'admin')
);
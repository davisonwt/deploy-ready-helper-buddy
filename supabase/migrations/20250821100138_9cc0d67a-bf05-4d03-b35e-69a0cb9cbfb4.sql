-- CRITICAL SECURITY FIX: Strengthen Anonymous Access Policies
-- Fix policies that currently allow anonymous access when they should require authentication

-- Update policies that need stronger authentication requirements
-- Fix ai_creations policies to explicitly require authentication
DROP POLICY IF EXISTS "Users can view their own AI creations" ON public.ai_creations;
CREATE POLICY "Users can view their own AI creations" 
ON public.ai_creations 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own AI creations" ON public.ai_creations;
CREATE POLICY "Users can update their own AI creations" 
ON public.ai_creations 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own AI creations" ON public.ai_creations;
CREATE POLICY "Users can delete their own AI creations" 
ON public.ai_creations 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Fix bestowals policies to explicitly require authentication
DROP POLICY IF EXISTS "Users can view their own bestowals" ON public.bestowals;
CREATE POLICY "Users can view their own bestowals" 
ON public.bestowals 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = bestower_id);

DROP POLICY IF EXISTS "Orchard owners can view bestowals for their orchards" ON public.bestowals;
CREATE POLICY "Orchard owners can view bestowals for their orchards" 
ON public.bestowals 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM orchards 
    WHERE orchards.id = bestowals.orchard_id 
    AND orchards.user_id = auth.uid()
  )
);

-- Fix user_wallets policies to explicitly require authentication
DROP POLICY IF EXISTS "Users can view their own wallets" ON public.user_wallets;
CREATE POLICY "Users can view their own wallets" 
ON public.user_wallets 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own wallets" ON public.user_wallets;
CREATE POLICY "Users can update their own wallets" 
ON public.user_wallets 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Fix user_billing_info policy
DROP POLICY IF EXISTS "Users can only access their own billing data" ON public.user_billing_info;
CREATE POLICY "Users can only access their own billing data" 
ON public.user_billing_info 
FOR ALL 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
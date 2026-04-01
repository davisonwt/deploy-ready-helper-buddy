
-- Add escrow columns to provider_orders
ALTER TABLE public.provider_orders 
  ADD COLUMN IF NOT EXISTS escrow_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS escrow_held_at timestamptz,
  ADD COLUMN IF NOT EXISTS escrow_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS buyer_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_reason text,
  ADD COLUMN IF NOT EXISTS dispute_resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'wallet',
  ADD COLUMN IF NOT EXISTS tx_reference text;

-- Create escrow transaction log
CREATE TABLE IF NOT EXISTS public.provider_escrow_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.provider_orders(id) ON DELETE CASCADE,
  action text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  from_wallet text,
  to_wallet text,
  performed_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for escrow transactions
ALTER TABLE public.provider_escrow_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view own escrow txns" ON public.provider_escrow_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.provider_orders po WHERE po.id = order_id AND po.buyer_id = auth.uid()
    )
  );

CREATE POLICY "Providers can view their escrow txns" ON public.provider_escrow_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.provider_orders po 
      JOIN public.providers p ON p.id = po.provider_id
      WHERE po.id = order_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all escrow txns" ON public.provider_escrow_transactions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert escrow txns" ON public.provider_escrow_transactions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

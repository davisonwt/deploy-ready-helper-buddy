-- Add verification status to profiles table
DO $$ 
BEGIN
    -- Create verification status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
        CREATE TYPE verification_status AS ENUM ('pending', 'verified');
    END IF;
END $$;

-- Add verification columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS verifier_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS verification_chat_id uuid,
ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone;

-- Create message types enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_message_type') THEN
        CREATE TYPE chat_message_type AS ENUM ('text', 'verification', 'acknowledgment', 'invoice', 'system', 'file');
    END IF;
END $$;

-- Create chat room types enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_room_type_enum') THEN
        CREATE TYPE chat_room_type_enum AS ENUM ('direct', 'group', 'verification', 'system', 'payment');
    END IF;
END $$;

-- Update chat_messages table to include message types
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS message_type chat_message_type DEFAULT 'text',
ADD COLUMN IF NOT EXISTS system_metadata jsonb;

-- Update chat_rooms table to include room types
ALTER TABLE public.chat_rooms 
ADD COLUMN IF NOT EXISTS room_type_detailed chat_room_type_enum DEFAULT 'direct',
ADD COLUMN IF NOT EXISTS is_system_room boolean DEFAULT false;

-- Create system user for verification (sower/bestower bot)
INSERT INTO public.profiles (
    user_id,
    first_name,
    last_name,
    display_name,
    bio,
    verification_status,
    avatar_url
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'System',
    'Verifier',
    'Sower',
    'Official sow2grow verification system - I help verify new accounts and send payment confirmations.',
    'verified',
    null
) ON CONFLICT (user_id) DO UPDATE SET
    display_name = 'Sower',
    bio = 'Official sow2grow verification system - I help verify new accounts and send payment confirmations.',
    verification_status = 'verified';

-- Create payment invoices table
CREATE TABLE IF NOT EXISTS public.payment_invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bestowal_id uuid REFERENCES public.bestowals(id),
    amount numeric NOT NULL,
    currency text NOT NULL DEFAULT 'USD',
    invoice_number text UNIQUE NOT NULL,
    invoice_url text,
    chat_message_id uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on payment_invoices
ALTER TABLE public.payment_invoices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payment_invoices
CREATE POLICY "Users can view their own invoices" 
ON public.payment_invoices 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert invoices" 
ON public.payment_invoices 
FOR INSERT 
WITH CHECK (true);

-- Create user verification logs table
CREATE TABLE IF NOT EXISTS public.user_verification_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action text NOT NULL, -- 'verification_sent', 'acknowledged', 'verified', 'reminder_sent'
    details jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on verification logs
ALTER TABLE public.user_verification_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for verification logs
CREATE POLICY "Admins can view all verification logs" 
ON public.user_verification_logs 
FOR SELECT 
USING (is_admin_or_gosat(auth.uid()));

CREATE POLICY "System can insert verification logs" 
ON public.user_verification_logs 
FOR INSERT 
WITH CHECK (true);

-- Create function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    invoice_number text;
    year_month text;
    sequence_num integer;
BEGIN
    -- Get current year and month
    year_month := TO_CHAR(now(), 'YYYYMM');
    
    -- Get next sequence number for this month
    SELECT COALESCE(MAX(
        CASE 
            WHEN invoice_number LIKE year_month || '-%' 
            THEN CAST(SUBSTRING(invoice_number FROM LENGTH(year_month) + 2) AS integer)
            ELSE 0 
        END
    ), 0) + 1
    INTO sequence_num
    FROM public.payment_invoices;
    
    -- Format as YYYYMM-XXXX
    invoice_number := year_month || '-' || LPAD(sequence_num::text, 4, '0');
    
    RETURN invoice_number;
END;
$$;

-- Create trigger to auto-generate invoice numbers
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number := generate_invoice_number();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_invoice_number_trigger
    BEFORE INSERT ON public.payment_invoices
    FOR EACH ROW
    EXECUTE FUNCTION set_invoice_number();

-- Update handle_new_user function to set verification status
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public 
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    first_name, 
    last_name, 
    display_name,
    location,
    preferred_currency,
    timezone,
    country,
    verification_status
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      CONCAT(
        NEW.raw_user_meta_data ->> 'first_name',
        ' ',
        NEW.raw_user_meta_data ->> 'last_name'
      )
    ),
    NEW.raw_user_meta_data ->> 'location',
    COALESCE(NEW.raw_user_meta_data ->> 'preferred_currency', 'USD'),
    COALESCE(NEW.raw_user_meta_data ->> 'timezone', 'UTC'),
    NEW.raw_user_meta_data ->> 'country',
    'pending'::verification_status
  );
  RETURN NEW;
END;
$$;
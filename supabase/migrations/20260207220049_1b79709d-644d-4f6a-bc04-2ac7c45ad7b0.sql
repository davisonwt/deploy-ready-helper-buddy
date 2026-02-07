-- ============================================
-- COMMUNITY SERVICE PROVIDERS FEATURE
-- ============================================

-- Create service_providers table for skilled workers
CREATE TABLE public.service_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    full_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    services_offered TEXT[] NOT NULL DEFAULT '{}',
    custom_services TEXT[] DEFAULT '{}',
    country TEXT,
    city TEXT,
    service_areas TEXT[] DEFAULT '{}',
    hourly_rate DECIMAL(10,2),
    description TEXT,
    portfolio_images TEXT[] DEFAULT '{}',
    no_income_confirmed BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_service_provider_per_user UNIQUE (user_id)
);

-- Create service_provider_availability table for calendar
CREATE TABLE public.service_provider_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
    available_date DATE NOT NULL,
    locations_available TEXT[] DEFAULT '{}',
    time_slots TEXT[] DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_availability_per_day UNIQUE (provider_id, available_date)
);

-- Create service_quote_requests table for booking flow
CREATE TABLE public.service_quote_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL,
    service_needed TEXT NOT NULL,
    location TEXT NOT NULL,
    job_description TEXT NOT NULL,
    preferred_date DATE,
    preferred_time TEXT,
    urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'accepted', 'declined', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create service_quotes table for provider responses
CREATE TABLE public.service_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.service_quote_requests(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
    quote_amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ZAR',
    estimated_duration TEXT,
    message TEXT,
    valid_until TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_quotes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_providers
CREATE POLICY "Anyone can view approved service providers"
ON public.service_providers FOR SELECT
USING (status = 'approved');

CREATE POLICY "Users can view their own provider profile"
ON public.service_providers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own provider profile"
ON public.service_providers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own provider profile"
ON public.service_providers FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for service_provider_availability
CREATE POLICY "Anyone can view availability of approved providers"
ON public.service_provider_availability FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.service_providers 
        WHERE id = provider_id AND status = 'approved'
    )
);

CREATE POLICY "Providers can manage their own availability"
ON public.service_provider_availability FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.service_providers 
        WHERE id = provider_id AND user_id = auth.uid()
    )
);

-- RLS Policies for service_quote_requests
CREATE POLICY "Requesters can view their own requests"
ON public.service_quote_requests FOR SELECT
USING (auth.uid() = requester_id);

CREATE POLICY "Providers can view requests sent to them"
ON public.service_quote_requests FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.service_providers 
        WHERE id = provider_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Authenticated users can create requests"
ON public.service_quote_requests FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Requesters can update their own requests"
ON public.service_quote_requests FOR UPDATE
USING (auth.uid() = requester_id);

CREATE POLICY "Providers can update requests sent to them"
ON public.service_quote_requests FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.service_providers 
        WHERE id = provider_id AND user_id = auth.uid()
    )
);

-- RLS Policies for service_quotes
CREATE POLICY "Providers can view and manage their quotes"
ON public.service_quotes FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.service_providers 
        WHERE id = provider_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Requesters can view quotes on their requests"
ON public.service_quotes FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.service_quote_requests 
        WHERE id = request_id AND requester_id = auth.uid()
    )
);

CREATE POLICY "Requesters can update quote status"
ON public.service_quote_requests FOR UPDATE
USING (auth.uid() = requester_id);

-- Create indexes for performance
CREATE INDEX idx_service_providers_user_id ON public.service_providers(user_id);
CREATE INDEX idx_service_providers_status ON public.service_providers(status);
CREATE INDEX idx_service_providers_country_city ON public.service_providers(country, city);
CREATE INDEX idx_service_provider_availability_provider_id ON public.service_provider_availability(provider_id);
CREATE INDEX idx_service_provider_availability_date ON public.service_provider_availability(available_date);
CREATE INDEX idx_service_quote_requests_provider_id ON public.service_quote_requests(provider_id);
CREATE INDEX idx_service_quote_requests_requester_id ON public.service_quote_requests(requester_id);
CREATE INDEX idx_service_quotes_request_id ON public.service_quotes(request_id);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_service_providers_updated_at
    BEFORE UPDATE ON public.service_providers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_quote_requests_updated_at
    BEFORE UPDATE ON public.service_quote_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_quotes_updated_at
    BEFORE UPDATE ON public.service_quotes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
-- Add location columns to community_drivers table
ALTER TABLE public.community_drivers 
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS service_areas text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS delivery_radius_km integer;

-- Create driver_quote_requests table
CREATE TABLE public.driver_quote_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES public.community_drivers(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL,
    pickup_location text NOT NULL,
    dropoff_location text NOT NULL,
    item_description text NOT NULL,
    preferred_date date,
    preferred_time text CHECK (preferred_time IN ('Morning', 'Afternoon', 'Evening', 'Flexible')),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'accepted', 'declined', 'completed', 'cancelled')),
    notes text,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create driver_quotes table
CREATE TABLE public.driver_quotes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES public.driver_quote_requests(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.community_drivers(id) ON DELETE CASCADE,
    quote_amount decimal(10,2) NOT NULL,
    currency text NOT NULL DEFAULT 'ZAR',
    estimated_duration text,
    message text,
    valid_until TIMESTAMP WITH TIME ZONE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.driver_quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_quotes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for driver_quote_requests
CREATE POLICY "Users can create quote requests"
ON public.driver_quote_requests
FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can view their own requests"
ON public.driver_quote_requests
FOR SELECT
USING (auth.uid() = requester_id);

CREATE POLICY "Drivers can view requests sent to them"
ON public.driver_quote_requests
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.community_drivers cd 
        WHERE cd.id = driver_id AND cd.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own requests"
ON public.driver_quote_requests
FOR UPDATE
USING (auth.uid() = requester_id);

CREATE POLICY "Drivers can update requests sent to them"
ON public.driver_quote_requests
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.community_drivers cd 
        WHERE cd.id = driver_id AND cd.user_id = auth.uid()
    )
);

-- RLS Policies for driver_quotes
CREATE POLICY "Drivers can create quotes for their requests"
ON public.driver_quotes
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.community_drivers cd 
        WHERE cd.id = driver_id AND cd.user_id = auth.uid()
    )
);

CREATE POLICY "Drivers can view their own quotes"
ON public.driver_quotes
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.community_drivers cd 
        WHERE cd.id = driver_id AND cd.user_id = auth.uid()
    )
);

CREATE POLICY "Requesters can view quotes on their requests"
ON public.driver_quotes
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.driver_quote_requests dqr 
        WHERE dqr.id = request_id AND dqr.requester_id = auth.uid()
    )
);

CREATE POLICY "Requesters can update quote status"
ON public.driver_quotes
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.driver_quote_requests dqr 
        WHERE dqr.id = request_id AND dqr.requester_id = auth.uid()
    )
);

CREATE POLICY "Drivers can update their own quotes"
ON public.driver_quotes
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.community_drivers cd 
        WHERE cd.id = driver_id AND cd.user_id = auth.uid()
    )
);

-- Create indexes for performance
CREATE INDEX idx_quote_requests_driver ON public.driver_quote_requests(driver_id);
CREATE INDEX idx_quote_requests_requester ON public.driver_quote_requests(requester_id);
CREATE INDEX idx_quote_requests_status ON public.driver_quote_requests(status);
CREATE INDEX idx_quotes_request ON public.driver_quotes(request_id);
CREATE INDEX idx_quotes_driver ON public.driver_quotes(driver_id);
CREATE INDEX idx_community_drivers_country ON public.community_drivers(country);
CREATE INDEX idx_community_drivers_city ON public.community_drivers(city);

-- Update trigger for driver_quote_requests
CREATE TRIGGER update_driver_quote_requests_updated_at
BEFORE UPDATE ON public.driver_quote_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for driver_quotes
CREATE TRIGGER update_driver_quotes_updated_at
BEFORE UPDATE ON public.driver_quotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
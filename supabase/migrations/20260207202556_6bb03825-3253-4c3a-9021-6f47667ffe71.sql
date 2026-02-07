-- Create community_drivers table for vehicle registration
CREATE TABLE public.community_drivers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    full_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('Car', 'Truck', 'Bike', 'Van', 'Other')),
    vehicle_description TEXT NOT NULL,
    vehicle_images TEXT[] DEFAULT '{}',
    no_income_confirmed BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_registration UNIQUE (user_id)
);

-- Enable Row Level Security
ALTER TABLE public.community_drivers ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read approved drivers (for browsing)
CREATE POLICY "Anyone can view approved drivers"
ON public.community_drivers
FOR SELECT
USING (status = 'approved');

-- Policy: Users can view their own registration regardless of status
CREATE POLICY "Users can view their own registration"
ON public.community_drivers
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can create their own registration
CREATE POLICY "Users can create their own registration"
ON public.community_drivers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own registration
CREATE POLICY "Users can update their own registration"
ON public.community_drivers
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own registration
CREATE POLICY "Users can delete their own registration"
ON public.community_drivers
FOR DELETE
USING (auth.uid() = user_id);

-- Policy: Admins can manage all registrations
CREATE POLICY "Admins can manage all registrations"
ON public.community_drivers
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_community_drivers_updated_at
BEFORE UPDATE ON public.community_drivers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_community_drivers_status ON public.community_drivers(status);
CREATE INDEX idx_community_drivers_vehicle_type ON public.community_drivers(vehicle_type);
CREATE INDEX idx_community_drivers_user_id ON public.community_drivers(user_id);
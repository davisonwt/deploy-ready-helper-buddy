-- Create content_flags table for storing flagged content
CREATE TABLE public.content_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type TEXT NOT NULL CHECK (content_type IN ('message', 'media', 'room', 'orchard', 'forum_post')),
    content_id UUID NOT NULL,
    user_id UUID NOT NULL,
    violation_type TEXT NOT NULL CHECK (violation_type IN ('profanity', 'explicit', 'gambling', 'manipulation')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    detected_terms TEXT[] DEFAULT '{}',
    auto_action_taken TEXT DEFAULT 'none' CHECK (auto_action_taken IN ('none', 'hidden', 'blocked')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'confirmed')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    ai_confidence NUMERIC(3, 2),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create gosat_alerts table for real-time alerts
CREATE TABLE public.gosat_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_id UUID REFERENCES public.content_flags(id) ON DELETE CASCADE NOT NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('new_violation', 'escalation', 'pattern_detected')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'critical')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create moderation_word_lists table for configurable word lists
CREATE TABLE public.moderation_word_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN ('profanity', 'gambling', 'manipulation', 'explicit')),
    words TEXT[] NOT NULL DEFAULT '{}',
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(category)
);

-- Enable RLS on all tables
ALTER TABLE public.content_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gosat_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_word_lists ENABLE ROW LEVEL SECURITY;

-- Create indexes for better query performance
CREATE INDEX idx_content_flags_status ON public.content_flags(status);
CREATE INDEX idx_content_flags_severity ON public.content_flags(severity);
CREATE INDEX idx_content_flags_user_id ON public.content_flags(user_id);
CREATE INDEX idx_content_flags_created_at ON public.content_flags(created_at DESC);
CREATE INDEX idx_gosat_alerts_is_read ON public.gosat_alerts(is_read);
CREATE INDEX idx_gosat_alerts_priority ON public.gosat_alerts(priority);

-- RLS Policies for content_flags (only admin/gosat can access)
CREATE POLICY "Admins and GoSats can view all content flags"
ON public.content_flags
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gosat'));

CREATE POLICY "Edge function can insert content flags"
ON public.content_flags
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins and GoSats can update content flags"
ON public.content_flags
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gosat'));

-- RLS Policies for gosat_alerts (only admin/gosat can access)
CREATE POLICY "Admins and GoSats can view all alerts"
ON public.gosat_alerts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gosat'));

CREATE POLICY "Edge function can insert alerts"
ON public.gosat_alerts
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins and GoSats can update alerts"
ON public.gosat_alerts
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gosat'));

-- RLS Policies for moderation_word_lists (only admin/gosat can manage)
CREATE POLICY "Admins and GoSats can view word lists"
ON public.moderation_word_lists
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gosat'));

CREATE POLICY "Admins can manage word lists"
ON public.moderation_word_lists
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Seed initial word lists
INSERT INTO public.moderation_word_lists (category, words, severity, is_active) VALUES
('profanity', ARRAY['fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard', 'crap', 'piss', 'slut', 'whore', 'cock', 'dick', 'pussy', 'cunt', 'nigger', 'faggot', 'retard'], 'medium', true),
('gambling', ARRAY['bet', 'casino', 'lottery', 'wager', 'jackpot', 'odds', 'gambling', 'poker', 'blackjack', 'roulette', 'slot machine', 'bookie', 'spread', 'parlay'], 'medium', true),
('manipulation', ARRAY['guaranteed returns', 'act now', 'limited time', 'you''re missing out', 'risk-free', 'double your money', 'get rich quick', 'secret investment', 'once in a lifetime', 'exclusive opportunity', 'wire transfer', 'urgent action required'], 'high', true),
('explicit', ARRAY['nude', 'naked', 'sex', 'porn', 'xxx', 'nsfw', 'erotic', 'hardcore', 'masturbate', 'orgasm', 'fetish', 'hentai', 'onlyfans'], 'high', true);

-- Create function to automatically create alert when flag is inserted
CREATE OR REPLACE FUNCTION public.create_gosat_alert_on_flag()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.gosat_alerts (flag_id, alert_type, priority)
    VALUES (
        NEW.id,
        'new_violation',
        CASE 
            WHEN NEW.severity = 'critical' THEN 'critical'
            WHEN NEW.severity = 'high' THEN 'urgent'
            ELSE 'normal'
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create alerts
CREATE TRIGGER trigger_create_gosat_alert
AFTER INSERT ON public.content_flags
FOR EACH ROW
EXECUTE FUNCTION public.create_gosat_alert_on_flag();
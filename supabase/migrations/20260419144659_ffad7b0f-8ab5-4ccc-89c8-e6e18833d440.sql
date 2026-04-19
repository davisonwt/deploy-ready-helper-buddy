-- ============================================================
-- Phase 4: Agent Marketplace + Elder Council
-- ============================================================

-- 1. AGENT TEMPLATES
CREATE TABLE public.agent_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  icon TEXT,
  prompt_template TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_schedule TEXT,
  install_bestowal_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft',
  installs_count INTEGER NOT NULL DEFAULT 0,
  rating_avg NUMERIC NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agent_templates_status_check CHECK (status IN ('draft','pending_review','approved','rejected','archived'))
);

ALTER TABLE public.agent_templates ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_agent_templates_status ON public.agent_templates(status);
CREATE INDEX idx_agent_templates_author ON public.agent_templates(author_id);
CREATE INDEX idx_agent_templates_category ON public.agent_templates(category);

-- 2. AGENT TEMPLATE INSTALLS
CREATE TABLE public.agent_template_installs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.agent_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  custom_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  bestowal_id UUID REFERENCES public.bestowals(id) ON DELETE SET NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  run_count INTEGER NOT NULL DEFAULT 0,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, user_id)
);

ALTER TABLE public.agent_template_installs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_agent_installs_user ON public.agent_template_installs(user_id);
CREATE INDEX idx_agent_installs_template ON public.agent_template_installs(template_id);

-- 3. AGENT TEMPLATE REVIEWS
CREATE TABLE public.agent_template_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.agent_templates(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  decision TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agent_reviews_decision_check CHECK (decision IN ('approve','reject','request_changes'))
);

ALTER TABLE public.agent_template_reviews ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_agent_reviews_template ON public.agent_template_reviews(template_id);

-- 4. ELDER COUNCIL SEATS
CREATE TABLE public.elder_council_seats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  seat_type TEXT NOT NULL DEFAULT 'auto',
  seated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  term_ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  seated_by UUID,
  notes TEXT,
  CONSTRAINT council_seats_type_check CHECK (seat_type IN ('auto','curated')),
  UNIQUE (user_id, is_active)
);

ALTER TABLE public.elder_council_seats ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_council_seats_user ON public.elder_council_seats(user_id);
CREATE INDEX idx_council_seats_active ON public.elder_council_seats(is_active);

-- 5. COUNCIL DECISIONS
CREATE TABLE public.council_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seat_id UUID NOT NULL REFERENCES public.elder_council_seats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  decision_type TEXT NOT NULL,
  entity_id UUID,
  entity_type TEXT,
  vote TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT council_decisions_type_check CHECK (decision_type IN ('template_review','dispute','blessing','rotation')),
  CONSTRAINT council_decisions_vote_check CHECK (vote IN ('approve','reject','abstain'))
);

ALTER TABLE public.council_decisions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_council_decisions_seat ON public.council_decisions(seat_id);
CREATE INDEX idx_council_decisions_entity ON public.council_decisions(entity_id);

-- 6. ORCHARD BLESSINGS
CREATE TABLE public.orchard_blessings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orchard_id UUID NOT NULL REFERENCES public.orchards(id) ON DELETE CASCADE,
  granted_by_seat_id UUID NOT NULL REFERENCES public.elder_council_seats(id) ON DELETE CASCADE,
  granted_by_user_id UUID NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (orchard_id, granted_by_seat_id)
);

ALTER TABLE public.orchard_blessings ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_orchard_blessings_orchard ON public.orchard_blessings(orchard_id);

-- ============================================================
-- HELPER FUNCTIONS (security definer to avoid recursion)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_council_member(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.elder_council_seats
    WHERE user_id = _user_id
      AND is_active = true
      AND (term_ends_at IS NULL OR term_ends_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.current_council_seat_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.elder_council_seats
  WHERE user_id = _user_id
    AND is_active = true
    AND (term_ends_at IS NULL OR term_ends_at > now())
  LIMIT 1;
$$;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- agent_templates
CREATE POLICY "Approved templates are public"
  ON public.agent_templates FOR SELECT
  USING (status = 'approved' OR author_id = auth.uid() OR public.is_council_member(auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Authors can create templates"
  ON public.agent_templates FOR INSERT
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors update own drafts; council can update any"
  ON public.agent_templates FOR UPDATE
  USING (
    (author_id = auth.uid() AND status IN ('draft','rejected','pending_review'))
    OR public.is_council_member(auth.uid())
    OR public.has_role(auth.uid(),'admin')
  );

CREATE POLICY "Authors delete own drafts"
  ON public.agent_templates FOR DELETE
  USING (author_id = auth.uid() AND status = 'draft');

-- agent_template_installs
CREATE POLICY "Users see own installs"
  ON public.agent_template_installs FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Users install approved templates for themselves"
  ON public.agent_template_installs FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.agent_templates t WHERE t.id = template_id AND t.status = 'approved')
  );

CREATE POLICY "Users update own installs"
  ON public.agent_template_installs FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own installs"
  ON public.agent_template_installs FOR DELETE
  USING (user_id = auth.uid());

-- agent_template_reviews
CREATE POLICY "Reviews visible to author, council, admin"
  ON public.agent_template_reviews FOR SELECT
  USING (
    public.is_council_member(auth.uid())
    OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.agent_templates t WHERE t.id = template_id AND t.author_id = auth.uid())
  );

CREATE POLICY "Council members create reviews"
  ON public.agent_template_reviews FOR INSERT
  WITH CHECK (reviewer_id = auth.uid() AND public.is_council_member(auth.uid()));

-- elder_council_seats
CREATE POLICY "Active council seats are public"
  ON public.elder_council_seats FOR SELECT
  USING (true);

CREATE POLICY "Admins manage curated seats"
  ON public.elder_council_seats FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gosat'));

CREATE POLICY "Admins update seats"
  ON public.elder_council_seats FOR UPDATE
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gosat'));

CREATE POLICY "Admins delete seats"
  ON public.elder_council_seats FOR DELETE
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gosat'));

-- council_decisions
CREATE POLICY "Decisions visible to council and admins"
  ON public.council_decisions FOR SELECT
  USING (public.is_council_member(auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Council members log decisions"
  ON public.council_decisions FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.is_council_member(auth.uid()));

-- orchard_blessings
CREATE POLICY "Blessings are public"
  ON public.orchard_blessings FOR SELECT
  USING (true);

CREATE POLICY "Council members grant blessings"
  ON public.orchard_blessings FOR INSERT
  WITH CHECK (granted_by_user_id = auth.uid() AND public.is_council_member(auth.uid()));

CREATE POLICY "Council members revoke own blessings"
  ON public.orchard_blessings FOR DELETE
  USING (granted_by_user_id = auth.uid() AND public.is_council_member(auth.uid()));

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER trg_agent_templates_updated_at
  BEFORE UPDATE ON public.agent_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-increment installs_count
CREATE OR REPLACE FUNCTION public.bump_template_install_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.agent_templates
  SET installs_count = installs_count + 1
  WHERE id = NEW.template_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bump_install_count
  AFTER INSERT ON public.agent_template_installs
  FOR EACH ROW EXECUTE FUNCTION public.bump_template_install_count();

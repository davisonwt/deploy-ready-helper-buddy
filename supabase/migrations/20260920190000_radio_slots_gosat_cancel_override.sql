-- Grove Station DJ Slots follow-up (2026-09-20): inside the 24h notice
-- window, a DJ is correctly blocked from cancelling their own slot -- but
-- there was no path for gosat/admin to pull a show either, even for a
-- genuine problem (wrong/bad content, a DJ no-show, abuse). This adds a
-- second, narrowly-scoped UPDATE policy: gosat/admin may update ANY slot
-- at ANY time, but only to cancel it -- WITH CHECK still requires the
-- resulting status to be 'cancelled', so this grant doesn't become a
-- general "gosat can edit any slot's fields" door.
CREATE POLICY "gosat or admin can cancel any slot"
  ON public.radio_slots FOR UPDATE
  USING (has_role(auth.uid(), 'gosat'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (
    (has_role(auth.uid(), 'gosat'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
    AND status = 'cancelled'
  );

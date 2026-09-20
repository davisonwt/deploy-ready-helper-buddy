-- Rundown lock: segments are only mutable while their slot is still
-- 'draft'. Previously the mutate policy checked ownership only, not slot
-- status -- meaning a DJ (or any direct API call, same class of gap the
-- duration-trust fix closed) could still insert/update/delete segments on
-- an already-'scheduled' slot, bypassing submit-radio-slot's validation
-- and duration recomputation entirely for anything added after the fact.
-- 'submitted' is dropped from the editable set too: nothing in this
-- codebase ever sets that status (submit-radio-slot goes straight from
-- 'draft'/'submitted' to 'scheduled' on success), so it was never a real
-- editable state to begin with.
DROP POLICY "A DJ manages their own slot's segments" ON public.radio_rundown_segments;

CREATE POLICY "A DJ manages their own draft slot's segments"
  ON public.radio_rundown_segments FOR ALL
  USING (EXISTS (SELECT 1 FROM public.radio_slots s WHERE s.id = slot_id AND s.dj_user_id = auth.uid() AND s.status = 'draft'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.radio_slots s WHERE s.id = slot_id AND s.dj_user_id = auth.uid() AND s.status = 'draft'));

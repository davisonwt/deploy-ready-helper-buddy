CREATE POLICY "DJs can delete their own schedule slots"
ON public.radio_schedule
FOR DELETE
USING (auth.uid() IN (
  SELECT radio_djs.user_id
  FROM radio_djs
  WHERE radio_djs.id = radio_schedule.dj_id
));
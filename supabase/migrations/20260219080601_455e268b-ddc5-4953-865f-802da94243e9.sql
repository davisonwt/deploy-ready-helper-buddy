-- Insert a test 2-hour radio slot for right now with playlist attached
INSERT INTO radio_schedule (
  show_id, dj_id, start_time, end_time, time_slot_date, hour_slot, 
  status, approval_status, broadcast_mode, playlist_id, show_notes
) VALUES (
  'ac20a222-0073-4bc0-8173-060e3e448192',
  'bcef36bb-322f-4fcd-bb32-5f117937d261',
  '2026-02-19T08:00:00Z',
  '2026-02-19T10:00:00Z',
  '2026-02-19',
  8,
  'scheduled',
  'approved',
  'pre_recorded',
  'f452fd58-ceab-4a98-ada7-0bcde7b172c9',
  'Test 2hr slot with playlist for audio playback verification'
);
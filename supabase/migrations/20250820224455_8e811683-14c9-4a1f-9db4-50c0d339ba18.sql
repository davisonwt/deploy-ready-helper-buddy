-- Update radio station name to "the set-apart heretics!"
UPDATE public.radio_station_config 
SET 
  station_name = 'The Set-Apart Heretics!',
  station_description = 'Your 24/7 community radio station for those who dare to be different',
  station_tagline = 'Where bold voices grow and unconventional ideas bloom',
  updated_at = now();
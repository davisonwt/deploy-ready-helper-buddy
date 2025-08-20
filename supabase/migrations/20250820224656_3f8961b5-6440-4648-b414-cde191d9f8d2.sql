-- Update radio station name to "The Set-Apart Heretics AOD Frequencies"
UPDATE public.radio_station_config 
SET 
  station_name = 'The Set-Apart Heretics AOD Frequencies',
  station_description = 'Broadcasting from the Ancient of Days - Your 24/7 community radio station for those who dare to be different',
  station_tagline = 'Where eternal wisdom meets bold voices - Ancient of Days Frequencies',
  updated_at = now();
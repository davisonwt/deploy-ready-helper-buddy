-- Repair: "Beautifull Geodesic Domes Surrounded with Mountains" (pillow).
--
-- The listing was saved with -26.2, 28 -- the Johannesburg country default
-- inherited from the owner's profile -- because Nominatim returns nothing
-- for the whole string "Mossel Bay, Seven Bells, Western Cape". It was
-- therefore 1050 km from where it actually is and invisible to anyone
-- searching near Mossel Bay.
--
-- Coordinates below are Nominatim's answer for "Mossel Bay, Western Cape":
--   -34.1832022, 22.1536248  (Mossel Bay, Garden Route District, 6500, ZA)
--
-- Nothing is deleted. Only the two coordinate columns change; the owner's
-- typed base_location is left exactly as he wrote it.

-- before
select product_id, base_location, base_lat, base_lng
from public.pillow_seed_details
where product_id = '3a238098-f438-40bb-90ed-d7d2f05540e6';

update public.pillow_seed_details
set base_lat = -34.1832022,
    base_lng = 22.1536248,
    updated_at = now()
where product_id = '3a238098-f438-40bb-90ed-d7d2f05540e6'
  and base_lat = -26.2
  and base_lng = 28;

-- after
select product_id, base_location, base_lat, base_lng
from public.pillow_seed_details
where product_id = '3a238098-f438-40bb-90ed-d7d2f05540e6';

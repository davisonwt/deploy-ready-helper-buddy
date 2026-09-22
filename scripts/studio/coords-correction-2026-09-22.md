# Coordinate correction — 2026-09-22

**System-written fake coordinates, corrected. No member typed any of these.**

## Root cause

`src/hooks/useUserLocation.ts` held a `KNOWN_LOCATIONS` lookup and a
`DEFAULT_LOCATION`, both mapping loosely-worded text to a city centroid:

| text | stamped as |
|---|---|
| `south africa`, `za`, `johannesburg`, DEFAULT | -26.2, 28.0 |
| `pretoria` | -25.7479, 28.2293 |
| `cape town` | -33.9249, 18.4241 |
| `durban` | -29.8587, 31.0218 |

When a member's `profiles.location` merely read "South Africa",
`locationFromText()` returned the Johannesburg centroid and
`saveLocationToProfile()` **persisted it to profiles.latitude/longitude as
though it were a real fix**. `RegisterWanderingPage.tsx:143` then copies
those columns onto the member's `wandering_roles` row.

Net effect: a Wandering Pillow based in Stilbay and a Wandering Wheel based
in Mossel Bay were both plotted in Johannesburg -- about 1,000 km and 400 km
from their own stated towns.

Fixed at source in the same batch: `saveLocationToProfile` now writes only a
`browser` or `manual` location. A guess may be displayed; it is never stored.
Unknown stays null.

## Audit

Every centroid the code can emit was searched across both tables. Only the
Johannesburg pair was ever written -- no Pretoria, Cape Town or Durban rows.

- `public.profiles`: **13 rows** at -26.2 / 28, all with `location = 'South Africa'`
- `public.wandering_roles`: **4 rows** at -26.2 / 28

## wandering_roles — corrected to the member's own stated town

| member | role | base_town | was | now |
|---|---|---|---|---|
| chariwellnesspro | pillow | Stilbay | -26.2, 28 | -34.3716, 21.4222 |
| davison.taljaard | hand | Mossel Bay | -26.2, 28 | -34.1833, 22.146 |
| davison.taljaard | pillow | Mossel Bay | -26.2, 28 | -34.1833, 22.146 |
| davison.taljaard | wheel | Mossel Bay | -26.2, 28 | -34.1833, 22.146 |

## profiles — set to NULL

Their `location` is the country "South Africa", not a town, so there is no
stated place to correct them to. Null is the honest value: unknown. Nothing
breaks -- `useUserLocation` still derives a display-only location from the
same text, it simply no longer writes it back.

| member | location | was |
|---|---|---|
| blomkind1 | South Africa | -26.2, 28 |
| callth3guy | South Africa | -26.2, 28 |
| camokahola | South Africa | -26.2, 28 |
| chariwellnesspro | South Africa | -26.2, 28 |
| coenie | South Africa | -26.2, 28 |
| davison.taljaard | South Africa | -26.2, 28 |
| dpak.wessel | South Africa | -26.2, 28 |
| ezra.taljaard | South Africa | -26.2, 28 |
| grootbrak | South Africa | -26.2, 28 |
| jtphotographer2 | South Africa | -26.2, 28 |
| lribouet | South Africa | -26.2, 28 |
| otaviocosta1973 | South Africa | -26.2, 28 |
| (no username) | South Africa | -26.2, 28 |

## Future work, deliberately NOT built here

Real geocoding at registration. `/register-wandering` collects a `base_town`
in free text and never turns it into coordinates; it only inherits whatever
the profile happens to carry. Until that is built, a member's coordinates are
either a browser fix they granted, a value corrected by hand here, or null.

## Undo

`scripts/studio/restore-coords-2026-09-22.sql` puts every row back to
-26.2 / 28.

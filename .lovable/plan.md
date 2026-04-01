

# Gig Booking System — Driver Notifications, Live Tracking, Fair Distribution & Availability

This plan covers 5 interconnected features for the ride booking system.

---

## 1. Booking Notifications via ChatApp

**What happens now:** When a booking is created, it's saved to the database but no notification is sent to the driver.

**What we'll build:** After a booking is created in the `gig-bookings` edge function, send a ChatApp message to the driver using the existing `get_or_create_direct_room` + `insert_system_chat_message` RPCs (same pattern used for bestowal notifications).

**Changes:**
- **`supabase/functions/gig-bookings/index.ts`** — After the booking insert succeeds, look up the GoSat system user, create/get a direct room with the driver, and send a system message with booking details (pickup, dropoff, time, passenger count).
- **Broadcast to eligible drivers** — When `provider_id` is empty or booking uses "find nearest" mode, query all approved drivers whose `max_passengers >= requested passengers`, then notify each via ChatApp. First driver to accept gets the booking.

---

## 2. Passenger-Based Driver Matching

**What happens now:** The booking modal sends to `drivers[0]` (first driver returned). No filtering by capacity.

**What we'll build:**
- **`gig-bookings` edge function `/search`** — Add `min_passengers` query param to filter `community_drivers` where `max_passengers >= min_passengers`.
- **`GigBookingModal.tsx`** — Pass `passengerCount` into the booking payload as `service_details.passenger_count`. When creating a ride booking without a specific driver, set `provider_id` to empty and let the backend broadcast to eligible drivers.

---

## 3. Live Driver Map (ETA tracking)

**What we'll build:** A map component shown after a booking is confirmed, displaying the driver's live location and estimated arrival time.

**Database changes:**
- Add `last_location_updated_at` timestamp column to `community_drivers` (the table already has `current_lat` and `current_lng`).

**New files:**
- **`src/components/gig/DriverTrackingMap.tsx`** — Uses Leaflet (free, no API key) to render a map with driver pin and customer pin. Subscribes to Supabase Realtime on the `community_drivers` table filtered by driver ID for live `current_lat`/`current_lng` updates. Shows estimated distance/time using Haversine formula.

**Driver-side location updates:**
- **`src/hooks/useDriverLocationBroadcast.ts`** — When a driver has an active `in_progress` booking, uses `navigator.geolocation.watchPosition` to push location updates to `community_drivers.current_lat/lng` every 15 seconds.

---

## 4. Fair Booking Distribution (Round-Robin)

**What we'll build:** A scoring system so drivers who have had fewer recent bookings get priority.

**Database changes:**
- Add `booking_score` (integer, default 0) column to `community_drivers` — incremented each time a driver gets a booking, periodically reset.

**Logic in `gig-bookings` edge function:**
- When broadcasting a new ride request, sort eligible drivers by `booking_score ASC` (fewest bookings first), then by `rating DESC` as tiebreaker.
- After a booking is confirmed, increment that driver's `booking_score`.
- Add a simple daily reset: when checking scores, ignore bookings older than 24 hours (or use a scheduled function to reset weekly).

---

## 5. Driver Unavailability Notification to S2G

**What we'll build:** A button/toggle on the driver dashboard that marks them unavailable for the day and sends a ChatApp notification to S2G (GoSat system account).

**Changes:**
- **`src/components/gig/DriverAvailabilityToggle.tsx`** (new) — A toggle component. When a driver switches to "unavailable," it:
  1. Updates `community_drivers.is_online = false`
  2. Calls the `gig-availability` edge function to mark the date unavailable
  3. Sends a ChatApp message to the GoSat system user: "🚗 [Driver Name] is not available today [date]. Reason: [optional reason]"
- **Driver dashboard integration** — Add this toggle to the driver's booking management area.

---

## Technical Summary

| Area | Files Changed |
|------|--------------|
| Booking notifications | `supabase/functions/gig-bookings/index.ts` |
| Driver matching | `supabase/functions/gig-bookings/index.ts`, `GigBookingModal.tsx` |
| Live tracking map | New: `DriverTrackingMap.tsx`, `useDriverLocationBroadcast.ts`. Migration for `last_location_updated_at` |
| Fair distribution | Migration for `booking_score`. Edge function logic |
| Unavailability | New: `DriverAvailabilityToggle.tsx`. Uses existing edge functions + ChatApp RPCs |
| Runtime error fix | Fix the current import error in `GigBookingModal.tsx` |

**Dependencies:** Leaflet + react-leaflet (already commonly available, free map tiles from OpenStreetMap — no API key needed).


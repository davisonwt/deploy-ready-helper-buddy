# S2G Driver Feature Enhancement Plan

## ✅ COMPLETED IMPLEMENTATION

All enhancements have been implemented and are live.

---

## Summary of Completed Changes

### 1. Dashboard Integration ✅
- Added "Become a S2G Driver" button in Quick Actions grid on `/dashboard`
- Green gradient styling with Car icon
- Links to `/register-vehicle`

### 2. Database Schema Updates ✅
Extended `community_drivers` table with:
- `country` (text) - Driver's country
- `city` (text) - Driver's city/town
- `service_areas` (text[]) - Array of areas they serve
- `delivery_radius_km` (integer) - Max delivery distance

Created `driver_quote_requests` table:
- Stores quote requests from sowers to drivers
- Fields: pickup_location, dropoff_location, item_description, preferred_date/time, status, notes

Created `driver_quotes` table:
- Stores quotes submitted by drivers
- Fields: quote_amount, currency, estimated_duration, message, valid_until, status

### 3. Enhanced Registration Form ✅
Added new Step 2 "Service Area" with:
- Country dropdown (African + common countries)
- City/Town text input
- Service Areas tag system (add/remove neighborhoods)
- Optional delivery radius in km

### 4. Quote Request System ✅
- `QuoteRequestDialog` - Modal for sowers to request quotes from drivers
- `DriverDashboardPage` - For drivers to view/respond to quote requests
- `MyDriverRequestsPage` - For sowers to track their requests and quotes

### 5. Enhanced Driver Card ✅
- Shows location (city, country)
- Displays service area badges
- Shows delivery radius if set
- "Request Quote" button (primary action)
- "Contact" icon button (secondary)

### 6. Edge Functions ✅
- `notify-quote-request` - Logs/sends notifications when quotes are requested

---

## Routes Added

| Route | Page | Purpose |
|-------|------|---------|
| `/register-vehicle` | RegisterVehiclePage | Multi-step driver registration |
| `/community-drivers` | CommunityDriversPage | Browse available drivers |
| `/driver-dashboard` | DriverDashboardPage | Driver's incoming requests |
| `/my-driver-requests` | MyDriverRequestsPage | Sower's sent requests |

---

## User Flows

### Driver Registration
1. Dashboard → "Become a S2G Driver" button
2. Step 1: Personal Info (name, phone, email)
3. Step 2: Service Area (country, city, neighborhoods, radius)
4. Step 3: Vehicle Details (type, description)
5. Step 4: Upload Photos (up to 3 images)
6. Step 5: Declaration & Submit

### Quote Request (Sower)
1. Browse `/community-drivers`
2. Click "Request Quote" on a driver card
3. Fill in pickup, dropoff, item, date/time
4. Submit → Driver notified
5. Track at `/my-driver-requests`
6. View received quotes → Accept/Decline
7. If accepted → Contact info shown

### Quote Response (Driver)
1. Access `/driver-dashboard`
2. View incoming requests
3. Click "Send Quote" → Enter amount, duration, message
4. Submit quote → Sower notified
5. Track accepted jobs

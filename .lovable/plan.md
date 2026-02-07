

# S2G Driver Feature Enhancement Plan

## Overview
Enhance the Community Drivers feature with a prominent dashboard button, location-based registration, and a quote request system to allow sowers to request and receive quotes from drivers.

---

## Current State Analysis

### What Already Exists
- **Registration form** at `/register-vehicle` with personal info, vehicle details, image upload, and no-income declaration
- **Browse page** at `/community-drivers` with search and vehicle type filters
- **Database table** `community_drivers` with user_id, contact info, vehicle_type, vehicle_description, vehicle_images, status

### What's Missing
- No button on dashboard to access the driver registration
- No location information (country, town, area) for drivers
- No quote request/response system for bookings

---

## Proposed Enhancements

### 1. Dashboard "Become a S2G Driver" Button
Add a new quick action button in the Quick Actions grid on the dashboard that:
- Shows "Become a S2G Driver" for new users
- Shows "My Driver Profile" for already-registered users
- Uses a distinctive car/truck icon with community-friendly styling
- Links to `/register-vehicle`

**Location**: Inside the Quick Actions Card grid (line ~850-1003 in DashboardPage.jsx)

### 2. Enhanced Registration Form with Location Fields
Add a new step or extend Step 1 to include service area information:

**New Fields:**
- **Country** (dropdown with common countries, sorted by usage)
- **Town/City** (text input with autocomplete if possible)
- **Service Areas** (multi-select or text area for listing neighborhoods/areas they can service)
- **Delivery Radius** (optional: km range they're willing to travel)

### 3. Database Schema Updates
Extend the `community_drivers` table with location columns:

```text
New Columns:
+-------------------+-------------+--------------------------------+
| Column            | Type        | Description                    |
+-------------------+-------------+--------------------------------+
| country           | text        | Driver's country               |
| city              | text        | Driver's city/town             |
| service_areas     | text[]      | Array of areas they serve      |
| delivery_radius_km| integer     | Max delivery distance (km)     |
+-------------------+-------------+--------------------------------+
```

### 4. Quote Request System
Create a booking flow where sowers can request quotes from drivers:

**New Table: `driver_quote_requests`**
```text
+-------------------+-------------+--------------------------------+
| Column            | Type        | Description                    |
+-------------------+-------------+--------------------------------+
| id                | uuid (PK)   | Primary key                    |
| driver_id         | uuid        | FK to community_drivers        |
| requester_id      | uuid        | FK to auth.users (sower)       |
| pickup_location   | text        | Where to pick up               |
| dropoff_location  | text        | Where to deliver               |
| item_description  | text        | What needs transporting        |
| preferred_date    | date        | When they need it              |
| preferred_time    | text        | Morning/Afternoon/Evening      |
| status            | text        | pending/quoted/accepted/declined/completed |
| notes             | text        | Additional info                |
| created_at        | timestamptz | Request timestamp              |
+-------------------+-------------+--------------------------------+
```

**New Table: `driver_quotes`**
```text
+-------------------+-------------+--------------------------------+
| Column            | Type        | Description                    |
+-------------------+-------------+--------------------------------+
| id                | uuid (PK)   | Primary key                    |
| request_id        | uuid        | FK to driver_quote_requests    |
| driver_id         | uuid        | FK to community_drivers        |
| quote_amount      | decimal     | Quoted price                   |
| currency          | text        | Currency (default: ZAR)        |
| estimated_duration| text        | How long the job will take     |
| message           | text        | Driver's message to sower      |
| valid_until       | timestamptz | Quote expiry date              |
| status            | text        | pending/accepted/rejected      |
| created_at        | timestamptz | Quote timestamp                |
+-------------------+-------------+--------------------------------+
```

### 5. Enhanced Driver Card with Quote Button
Update the DriverCard component to show:
- Driver's service area (country, city)
- "Request Quote" button instead of just "Contact Driver"
- Service areas tags

### 6. Quote Request Flow UI

**New Component: QuoteRequestDialog**
- Popup form when sower clicks "Request Quote"
- Fields: Pickup location, Dropoff location, Item description, Preferred date/time, Notes
- Submit creates entry in `driver_quote_requests`

**New Page: `/my-driver-requests` (for sowers)**
- List of quote requests sent
- Status tracking (pending, quoted, accepted)
- View received quotes and accept/decline

**New Page: `/driver-dashboard` (for drivers)**
- List of incoming quote requests
- Submit quotes with amount and message
- Track accepted jobs

---

## Implementation Summary

### Database Changes (Migration)
1. Add location columns to `community_drivers` table
2. Create `driver_quote_requests` table with RLS
3. Create `driver_quotes` table with RLS

### Frontend Changes

| File | Changes |
|------|---------|
| `src/pages/DashboardPage.jsx` | Add "Become a S2G Driver" button in Quick Actions |
| `src/components/drivers/VehicleRegistrationForm.tsx` | Add location fields (country, city, service areas) |
| `src/components/drivers/DriverCard.tsx` | Show location info, add "Request Quote" button |
| `src/components/drivers/QuoteRequestDialog.tsx` | **New** - Quote request form dialog |
| `src/pages/CommunityDriversPage.tsx` | Add location filters |
| `src/pages/DriverDashboardPage.tsx` | **New** - Driver's incoming requests & quote management |
| `src/pages/MyDriverRequestsPage.tsx` | **New** - Sower's sent requests & received quotes |

### Backend Changes
| File | Purpose |
|------|---------|
| `supabase/functions/notify-quote-request/index.ts` | **New** - Email driver when quote requested |
| `supabase/functions/notify-quote-received/index.ts` | **New** - Email sower when quote received |

---

## User Flow Diagrams

### Driver Registration Flow
```text
Dashboard → "Become a S2G Driver" → Registration Form
                                          ↓
                                   Step 1: Personal Info
                                          ↓
                                   Step 2: Location & Service Areas ← NEW
                                          ↓
                                   Step 3: Vehicle Details
                                          ↓
                                   Step 4: Upload Photos
                                          ↓
                                   Step 5: Declaration & Submit
                                          ↓
                                   Success → Community Drivers Page
```

### Quote Request Flow
```text
Sower browses /community-drivers
        ↓
Finds a driver → Clicks "Request Quote"
        ↓
Fills in pickup, dropoff, item, date
        ↓
Driver receives notification
        ↓
Driver submits quote with price
        ↓
Sower receives notification
        ↓
Sower accepts/declines quote
        ↓
If accepted → Contact exchange for final coordination
```

---

## Technical Notes

### Location Data
- Use a simple dropdown for countries (top 20 African countries + common others)
- City/town is a free-text field (no API needed)
- Service areas stored as text array (allows multiple neighborhoods)

### RLS Policies for New Tables
- `driver_quote_requests`: Requesters can create/view their own; drivers can view requests sent to them
- `driver_quotes`: Drivers can create/view their own quotes; requesters can view quotes on their requests

### Existing Patterns Used
- Form validation with Zod (matching VehicleRegistrationForm)
- Toast notifications via sonner
- Card-based layouts matching existing UI
- Button styling following dashboard theme system


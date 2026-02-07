
# Community Drivers Registration Feature

## Overview
Create a new section in sow2growapp.com where users without income can register their vehicles (car, truck, bike, van) to offer community services like deliveries, passenger transport, or hauling. Other community members ("sowers") can browse and hire these drivers.

---

## Feature Components

### 1. Database Schema
Create a new `community_drivers` table in Supabase to store vehicle registrations:

```text
Table: community_drivers
+----------------------+-------------+--------------------------------+
| Column               | Type        | Description                    |
+----------------------+-------------+--------------------------------+
| id                   | uuid (PK)   | Primary key                    |
| user_id              | uuid        | Foreign key to auth.users      |
| full_name            | text        | Driver's full name             |
| contact_phone        | text        | Contact phone number           |
| contact_email        | text        | Contact email                  |
| vehicle_type         | text        | Car, Truck, Bike, Van, Other   |
| vehicle_description  | text        | Vehicle details                |
| vehicle_images       | text[]      | Array of image URLs (up to 3)  |
| no_income_confirmed  | boolean     | Declaration checkbox           |
| status               | text        | pending/approved/rejected      |
| created_at           | timestamptz | Registration timestamp         |
| updated_at           | timestamptz | Last update timestamp          |
+----------------------+-------------+--------------------------------+
```

Row Level Security (RLS) policies:
- Users can read all approved drivers (for browsing)
- Users can only create/update their own registration
- Admins can manage all registrations

### 2. Frontend Components

#### New Page: `/register-vehicle`
Location: `src/pages/RegisterVehiclePage.tsx`

A multi-step form with:
- **Step 1: Personal Information**
  - Full Name (required)
  - Contact Phone (required)
  - Contact Email (auto-filled from logged-in user)
  
- **Step 2: Vehicle Information**
  - Vehicle Type (dropdown: Car, Truck, Bike, Van, Other)
  - Vehicle Description (textarea)
  
- **Step 3: Upload Vehicle Photos**
  - Drag-and-drop zone for up to 3 images
  - JPEG/PNG only, max 5MB each
  - Live thumbnail previews
  
- **Step 4: Declaration & Submit**
  - No-Income Declaration checkbox
  - Terms acceptance
  - Submit button

#### New Page: `/community-drivers`
Location: `src/pages/CommunityDriversPage.tsx`

Browse and hire drivers:
- Grid of driver cards with vehicle photos
- Filter by vehicle type
- Search by location/name
- "Contact Driver" button (opens chat or shows contact info)

#### New Components
- `src/components/drivers/VehicleRegistrationForm.tsx` - Multi-step registration form
- `src/components/drivers/DriverCard.tsx` - Display card for each driver
- `src/components/drivers/VehicleImageUpload.tsx` - Image upload with previews
- `src/components/drivers/DriverFilters.tsx` - Filtering controls

### 3. Backend: Edge Function
Create `supabase/functions/notify-driver-registration/index.ts`

Handles:
- Sending confirmation email to the registering driver
- Sending notification to admins about new registration
- Uses existing Brevo email integration

### 4. Storage
Use existing `orchard-images` storage bucket for vehicle photos (organized in a `drivers/` subfolder).

---

## Implementation Details

### Authentication Check
The registration page will be protected using the existing `ProtectedRoute` component, ensuring only logged-in users can access it.

### Form Validation
Using Zod schema validation:
- Name: 2-100 characters, trimmed
- Phone: Valid phone format
- Email: Valid email format
- Vehicle Description: 10-500 characters
- Images: Max 3 files, each under 5MB, JPEG/PNG only
- No-Income checkbox: Must be checked

### Image Upload Flow
1. User selects images (up to 3)
2. Client-side validation (size, type)
3. Preview thumbnails displayed
4. On form submit, upload to Supabase Storage
5. Store returned URLs in `vehicle_images` array

### Duplicate Prevention
- One registration per user (enforced by unique constraint on `user_id`)
- If user already registered, show "Edit Registration" instead of "New Registration"

### UI Design
Following existing app patterns:
- Tailwind CSS for styling
- Card-based layout matching other forms
- Responsive design (mobile-first)
- Community-focused messaging with encouraging copy
- Success/error toast notifications using sonner

---

## File Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `src/pages/RegisterVehiclePage.tsx` | Registration form page |
| `src/pages/CommunityDriversPage.tsx` | Browse drivers page |
| `src/components/drivers/VehicleRegistrationForm.tsx` | Multi-step form component |
| `src/components/drivers/DriverCard.tsx` | Driver display card |
| `src/components/drivers/VehicleImageUpload.tsx` | Image upload component |
| `src/components/drivers/DriverFilters.tsx` | Filter controls |
| `supabase/functions/notify-driver-registration/index.ts` | Email notification function |

### Modified Files
| File | Changes |
|------|---------|
| `src/App.tsx` | Add routes for `/register-vehicle` and `/community-drivers` |

### Database Migration
Create `community_drivers` table with RLS policies.

---

## Technical Notes

### Why Supabase (not Firestore)?
This project uses Supabase as its primary backend for data persistence, authentication, and storage. While Firebase/Firestore is configured, the app's main data flows through Supabase. This feature will follow the same pattern.

### Email Integration
Uses the existing `send_brevo_email` edge function already configured in the project with the `BREVO_API_KEY` secret.

### Security Considerations
- RLS policies ensure users can only modify their own registrations
- Input validation on both client and server side
- File type and size restrictions for uploads
- No-income declaration stored for audit purposes

---

## User Journey

```text
Logged-in User                                           System
      |                                                     |
      |---> Navigate to /register-vehicle ---------------->|
      |                                                     |
      |<--- Display multi-step form ----------------------<|
      |                                                     |
      |---> Fill personal info, vehicle details ---------->|
      |                                                     |
      |---> Upload up to 3 vehicle photos --------------->|
      |                                                     |
      |---> Check no-income declaration, submit ---------->|
      |                                                     |
      |                    [Validate & Save to Supabase]   |
      |                    [Send confirmation email]        |
      |                    [Notify admins]                  |
      |                                                     |
      |<--- Success message, redirect to /community-drivers<|
      |                                                     |
```

---

## Encouraging Messaging Examples

- Header: "Help Grow Our Community by Offering Your Vehicle for Gigs!"
- Subtext: "Connect with fellow sowers who need deliveries, transport, or hauling services"
- Success: "Welcome to the Community Drivers network! Your registration is under review."
- CTA: "Start Earning While Helping Your Community"

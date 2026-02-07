
# Password Reset via Gosat Support Chat - Implementation Plan

## Problem Summary
The "Go to Support Chat" button on the login page's Forgot Password modal doesn't work. When clicked, nothing happens because:

1. The button tries to create an anonymous session via `loginAnonymously()`
2. Supabase returns error: **"Anonymous sign-ins are disabled"**
3. The function fails silently and never navigates to the support chat

## Solution Overview
Build a dedicated password reset flow that works without requiring any login:

1. Create a **public password reset page** (`/password-reset-support`) that doesn't require authentication
2. User enters their email address and new password (twice for confirmation)
3. A secure edge function validates the request and sends a notification to gosat admins
4. Gosat reviews and approves the reset via their admin dashboard/ChatApp
5. Upon approval, the password is updated and user is redirected to login

## Implementation Steps

### Step 1: Create Public Password Reset Request Page
Create a new page at `/password-reset-support` that is publicly accessible (no auth required):

**New file: `src/pages/PasswordResetSupportPage.tsx`**
- Form fields: Email, New Password, Confirm Password
- Client-side validation (password match, minimum length)
- Submit button that calls the edge function
- Success state showing "Request submitted, gosat will review"
- No authentication required to access this page

### Step 2: Create Edge Function for Password Reset Requests
Create a new edge function to handle password reset requests securely:

**New file: `supabase/functions/password-reset-request/index.ts`**
- Accepts: email, new password hash (never store plain text)
- Validates email exists in the system
- Creates a `password_reset_requests` record with:
  - `email`
  - `password_hash` (hashed new password)
  - `status`: "pending"
  - `created_at`
  - `expires_at` (24 hours)
- Sends notification to gosat admins (via activity feed or direct chat message)
- Returns success without revealing if email exists (security)

### Step 3: Create Database Table for Password Reset Requests
Create migration for the `password_reset_requests` table:

```text
┌─────────────────────────────────┐
│   password_reset_requests       │
├─────────────────────────────────┤
│ id: uuid (PK)                   │
│ email: text (NOT NULL)          │
│ password_hash: text (NOT NULL)  │
│ status: text (pending/approved/ │
│         rejected/expired)       │
│ requested_at: timestamptz       │
│ reviewed_by: uuid (FK->users)   │
│ reviewed_at: timestamptz        │
│ expires_at: timestamptz         │
└─────────────────────────────────┘
```

RLS: Only gosat/admin roles can read and update this table.

### Step 4: Create Edge Function for Gosat Approval
Create edge function for gosats to approve password reset:

**New file: `supabase/functions/password-reset-approve/index.ts`**
- Accepts: request_id, action (approve/reject)
- Validates caller is gosat/admin
- If approved: Updates user's password using the stored hash via Supabase Admin API
- Updates request status to "approved" or "rejected"
- Returns success/failure

### Step 5: Create Gosat Admin UI for Pending Resets
Add a component/page for gosats to view and approve pending password reset requests:

**New file: `src/components/admin/PasswordResetApprovalPanel.tsx`**
- Lists pending password reset requests
- Shows email, requested time, expiry
- Approve/Reject buttons
- Only visible to gosat/admin users
- Can be added to existing admin dashboard or as standalone page

### Step 6: Update Login Page
Update `src/pages/LoginPage.jsx`:
- Change the "Go to Support Chat" button to navigate directly to `/password-reset-support`
- Remove the failed anonymous login logic
- Simple navigation: `navigate("/password-reset-support")`

### Step 7: Add Route to App.tsx
Add the public route for the password reset support page:

```jsx
<Route path="/password-reset-support" element={<PasswordResetSupportPage />} />
```

No `ProtectedRoute` wrapper - this is a public page.

## Security Considerations

1. **Password Hashing**: Passwords are hashed client-side before sending to the edge function using a secure algorithm
2. **Rate Limiting**: Implement rate limiting on the edge function to prevent abuse
3. **Expiry**: Requests expire after 24 hours
4. **Email Privacy**: Never reveal if an email exists in the system
5. **Gosat Verification**: Only verified gosat/admin roles can approve resets
6. **Audit Trail**: All approvals/rejections are logged with reviewer ID and timestamp

## User Flow Diagram

```text
User Flow:
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Login Page  │────▶│ Forgot Password  │────▶│ Password Reset  │
│             │     │ Modal            │     │ Support Page    │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                      │
                                             Enter email +
                                             new password (2x)
                                                      │
                                                      ▼
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Login Again │◀────│ Gosat Approves   │◀────│ Edge Function   │
│             │     │ Reset            │     │ Stores Request  │
└─────────────┘     └──────────────────┘     └─────────────────┘
```

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/pages/PasswordResetSupportPage.tsx` |
| Create | `supabase/functions/password-reset-request/index.ts` |
| Create | `supabase/functions/password-reset-approve/index.ts` |
| Create | `src/components/admin/PasswordResetApprovalPanel.tsx` |
| Modify | `src/pages/LoginPage.jsx` - update button handler |
| Modify | `src/App.tsx` - add public route |
| Create | Database migration for `password_reset_requests` table |

## Technical Notes

- **No Anonymous Auth Required**: This solution bypasses the need for anonymous authentication entirely
- **Secure by Design**: Gosats manually verify user identity before approving
- **Audit Trail**: Complete tracking of who requested what and who approved
- **Fallback**: If edge functions fail, clear error messages guide the user

# Profile Security Guidelines

## 🔒 CRITICAL: Profile Data Security

This document outlines the security measures implemented to protect user personal information in the `profiles` table.

## Security Issues Fixed

### Previous Vulnerabilities:
- ❌ **Admin policies allowed SELECT * exposing all sensitive data**
- ❌ **Application code using SELECT * throughout codebase**
- ❌ **Phone numbers, locations, and personal data exposed publicly**
- ❌ **No audit trail for admin profile access**

### Security Measures Implemented:

#### 1. **Secure RLS Policies**
- ✅ Users can only view their own complete profile
- ✅ Public access limited to safe fields only (display_name, avatar_url, bio, etc.)
- ✅ Admin access requires proper justification and logging
- ✅ No SELECT * allowed for public access

#### 2. **Application Code Security**
- ✅ All direct table queries updated to use explicit field selection
- ✅ Created `useSecureProfiles` hook for safe profile operations
- ✅ Eliminated SELECT * usage in chat, user selection, and admin components

#### 3. **Data Classification**

**🔴 SENSITIVE (Never Publicly Accessible):**
- `phone` - Phone numbers
- `location` - Exact addresses
- `timezone` - Location patterns
- `country` - Personal location data
- `first_name` + `last_name` combination
- `has_complete_billing_info` - Financial status

**🟡 PROTECTED (Admin Only with Logging):**
- `first_name` - Individual name components
- `last_name` - Individual name components
- `location` - For moderation purposes
- `country` - For regional management
- `timezone` - For scheduling

**🟢 SAFE (Public Access Allowed):**
- `display_name` - User-chosen public name
- `avatar_url` - Profile pictures
- `bio` - User descriptions
- `verification_status` - Trust indicators
- `created_at` - Account age
- `show_social_media` - Privacy preference
- Social media URLs (only if show_social_media = true)

## Developer Guidelines

### ❌ NEVER DO:
```javascript
// FORBIDDEN: Exposes all sensitive data
const { data } = await supabase.from('profiles').select('*')

// FORBIDDEN: Direct sensitive field access
const { data } = await supabase.from('profiles').select('phone, location, timezone')
```

### ✅ ALWAYS DO:
```javascript
// CORRECT: Use secure hook
import { useSecureProfiles } from '@/hooks/useSecureProfiles'
const { getPublicProfile } = useSecureProfiles()
const profile = await getPublicProfile(userId)

// CORRECT: Explicit safe field selection
const { data } = await supabase
  .from('profiles')
  .select('display_name, avatar_url, bio, verification_status')
  .eq('user_id', userId)

// CORRECT: User accessing own data
const { data } = await supabase
  .from('profiles')
  .select('*') // OK - user can see their own data
  .eq('user_id', auth.uid())
```

### Admin Access Requirements:
```javascript
// CORRECT: Admin access with justification
import { useSecureProfiles } from '@/hooks/useSecureProfiles'
const { getProfileForModeration } = useSecureProfiles()
const profile = await getProfileForModeration(userId, "Investigating user report #12345")
```

## Security Functions Available

### `useSecureProfiles()` Hook:
- `getPublicProfile(userId)` - Safe public data only
- `getPublicProfiles(userIds)` - Multiple safe profiles
- `getOwnProfile()` - User's complete profile
- `updateOwnProfile(updates)` - Update own profile
- `getProfileForModeration(userId, reason)` - Admin access with logging

### Database Functions:
- `get_public_profile(profile_user_id)` - Public-safe profile data
- `get_profile_admin_data(profile_user_id, access_reason)` - Admin access with audit

## Audit & Monitoring

All admin profile access is logged in `profile_access_logs` with:
- Who accessed the profile
- When it was accessed
- Why it was accessed (required justification)
- What fields were accessed

## Testing Security

### Verify Public Access Limitation:
```sql
-- This should only return safe fields for other users
SELECT * FROM profiles WHERE user_id != auth.uid();
```

### Verify Admin Logging:
```sql
-- Check admin access is logged
SELECT * FROM profile_access_logs WHERE access_type = 'admin_profile_access';
```

## Incident Response

If sensitive data exposure is suspected:
1. Check `profile_access_logs` for unauthorized access
2. Review application logs for SELECT * queries
3. Audit RLS policies for policy violations
4. Update affected users immediately

---

**⚠️ IMPORTANT:** Any changes to profile queries must be reviewed for security compliance. When in doubt, use the `useSecureProfiles` hook.
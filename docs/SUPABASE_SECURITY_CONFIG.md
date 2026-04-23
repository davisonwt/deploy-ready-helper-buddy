# Supabase Security Configuration Guide

## ✅ Completed: Schema Injection Protection

All database functions with `SECURITY DEFINER` have been updated to include `SET search_path = 'public'` to prevent schema injection attacks. This has been applied across all migrations.

## ⚠️ Manual Configuration Required

**📋 For detailed step-by-step instructions, see: [`SUPABASE_DASHBOARD_SECURITY_CONFIG.md`](./SUPABASE_DASHBOARD_SECURITY_CONFIG.md)**

The following security settings need to be configured manually in your Supabase Dashboard:

### 1. Auth OTP Long Expiry ⚙️

**Location**: Supabase Dashboard → Authentication → Email Templates / Settings

**Quick Steps**:
1. Go to **Authentication** → **Settings** → **Email Auth**
2. Set **OTP Expiry** to **3600 seconds (60 minutes)** for email verification
3. Set **OTP Expiry** to **1800 seconds (30 minutes)** for password reset
4. Update email templates to include expiry information

**Recommended Values**:
- Email Verification: **60 minutes** (3600 seconds)
- Password Reset: **30 minutes** (1800 seconds)

**Why this matters**: 
- Prevents expired OTPs from being used
- Balances security with user experience
- Reduces support requests for expired links

**📖 See [`SUPABASE_DASHBOARD_SECURITY_CONFIG.md`](./SUPABASE_DASHBOARD_SECURITY_CONFIG.md) for detailed instructions**

### 2. Leaked Password Protection ⚙️

**Location**: Supabase Dashboard → Authentication → Policies

**Quick Steps**:
1. Go to **Authentication** → **Policies** (or **Settings** → **Password Settings**)
2. Enable **"Check passwords against Have I Been Pwned database"**
3. Set minimum password length to **10 characters**
4. Enable all complexity requirements (uppercase, lowercase, numbers, special chars)
5. Enable password history (prevent reusing last 5 passwords)

**Recommended Settings**:
- Minimum Length: **10 characters**
- Require Uppercase: ✅ **Yes**
- Require Lowercase: ✅ **Yes**
- Require Numbers: ✅ **Yes**
- Require Special Characters: ✅ **Yes**
- Check Against HIBP: ✅ **Yes**
- Password History: ✅ **Yes** (last 5)

**Why this matters**:
- Prevents users from using passwords found in data breaches
- Reduces risk of credential stuffing attacks
- Enhances overall account security

**📖 See [`SUPABASE_DASHBOARD_SECURITY_CONFIG.md`](./SUPABASE_DASHBOARD_SECURITY_CONFIG.md) for detailed instructions**

## Additional Security Recommendations

### Rate Limiting
- Configure rate limits for authentication endpoints
- Set up rate limiting for password reset requests
- Implement CAPTCHA for repeated failed login attempts

### Session Management
- Configure session timeout (recommended: 1-2 hours of inactivity)
- Enable secure cookie settings (HttpOnly, Secure, SameSite)
- Implement refresh token rotation

### Email Verification
- Require email verification before account activation
- Set up email templates for security notifications
- Enable email change verification

## Verification

After configuring these settings:

1. Test OTP expiry by requesting an OTP and waiting for it to expire
2. Test leaked password protection by attempting to use a known compromised password
3. Review your authentication logs regularly for suspicious activity

## Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [Have I Been Pwned API](https://haveibeenpwned.com/API/v3)


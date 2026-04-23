# Supabase Dashboard Security Configuration Guide

## 🔐 Manual Configuration Required

These security settings must be configured manually in your Supabase Dashboard. They cannot be set via code or migrations.

---

## 1. Auth OTP Long Expiry Configuration

### ⚠️ Issue
OTP (One-Time Password) codes for email verification and password reset may expire too quickly, causing user frustration.

### ✅ Solution: Configure OTP Expiry Time

**Steps:**

1. **Navigate to Supabase Dashboard**
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Select your project (sow2growapp.com)

2. **Go to Authentication Settings**
   - Click on **"Authentication"** in the left sidebar
   - Click on **"Settings"** (or **"Configuration"**)

3. **Find OTP Settings**
   - Scroll to **"Email Auth"** or **"OTP Settings"** section
   - Look for **"OTP Expiry"** or **"Token Expiry"** setting

4. **Configure Expiry Time**
   - **Recommended**: Set to **3600 seconds (60 minutes)** or **1800 seconds (30 minutes)**
   - For password reset: **1800 seconds (30 minutes)** is recommended
   - For email verification: **3600 seconds (60 minutes)** is recommended
   - Click **"Save"**

5. **Configure Email Templates (Optional but Recommended)**
   - Go to **Authentication** → **Email Templates**
   - Update **"Confirm signup"** template:
     - Add clear expiry time information
     - Example: "This link will expire in 60 minutes"
   - Update **"Reset password"** template:
     - Add expiry time information
     - Example: "This link will expire in 30 minutes"

### 📝 Configuration Values

| Setting | Recommended Value | Reason |
|---------|------------------|--------|
| Email Verification OTP | 3600 seconds (60 min) | Balances security with user experience |
| Password Reset OTP | 1800 seconds (30 min) | Shorter for security, but not too short |
| Magic Link OTP | 3600 seconds (60 min) | Standard for email links |

### ⚠️ Security Considerations

- **Too Short (< 5 minutes)**: Users may not receive emails in time
- **Too Long (> 2 hours)**: Increases security risk if email is compromised
- **Recommended Range**: 15-60 minutes depending on use case

---

## 2. Leaked Password Protection Configuration

### ⚠️ Issue
Users may use passwords that have been exposed in data breaches, making accounts vulnerable to credential stuffing attacks.

### ✅ Solution: Enable Have I Been Pwned Integration

**Steps:**

1. **Navigate to Supabase Dashboard**
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Select your project

2. **Go to Authentication Settings**
   - Click on **"Authentication"** in the left sidebar
   - Click on **"Policies"** or **"Password Settings"**

3. **Enable Password Protection**
   - Look for **"Password Protection"** or **"Password Policies"** section
   - Find **"Check passwords against Have I Been Pwned database"**
   - **Toggle ON** this setting

4. **Configure Password Strength Requirements**
   - **Minimum Length**: Set to **10 characters** (recommended) or **8 characters** (minimum)
   - **Require Uppercase**: ✅ Enable
   - **Require Lowercase**: ✅ Enable
   - **Require Numbers**: ✅ Enable
   - **Require Special Characters**: ✅ Enable (recommended)

5. **Enable Password History (Optional but Recommended)**
   - **Password History**: Enable to prevent password reuse
   - **History Count**: Set to **5** (prevents reusing last 5 passwords)

6. **Save Settings**
   - Click **"Save"** or **"Update"**

### 📝 Recommended Password Policy

| Setting | Recommended Value |
|---------|------------------|
| Minimum Length | 10 characters |
| Require Uppercase | ✅ Yes |
| Require Lowercase | ✅ Yes |
| Require Numbers | ✅ Yes |
| Require Special Characters | ✅ Yes |
| Check Against HIBP | ✅ Yes |
| Password History | ✅ Yes (last 5) |

### 🔒 Additional Security Recommendations

1. **Enable Rate Limiting for Password Reset**
   - Go to **Authentication** → **Settings** → **Rate Limits**
   - Set password reset attempts: **5 per hour per IP**

2. **Enable Email Change Verification**
   - Go to **Authentication** → **Settings**
   - Enable **"Require email confirmation for email changes"**

3. **Enable Account Lockout (if available)**
   - After 5 failed login attempts, lock account for 15 minutes
   - Prevents brute force attacks

---

## 3. Additional Security Settings to Review

### Email Verification
- **Location**: Authentication → Settings → Email Auth
- **Action**: Ensure **"Enable email confirmations"** is enabled
- **Benefit**: Prevents fake email registrations

### Session Management
- **Location**: Authentication → Settings → Sessions
- **Recommended Settings**:
  - **Session Timeout**: 1-2 hours of inactivity
  - **Refresh Token Rotation**: Enable
  - **Secure Cookies**: Enable (HttpOnly, Secure, SameSite)

### Rate Limiting
- **Location**: Authentication → Settings → Rate Limits
- **Recommended Limits**:
  - **Sign up**: 5 per hour per IP
  - **Sign in**: 10 per 15 minutes per IP
  - **Password reset**: 5 per hour per IP
  - **Email change**: 3 per hour per user

---

## 📋 Configuration Checklist

### OTP Expiry
- [ ] Email verification OTP set to 60 minutes
- [ ] Password reset OTP set to 30 minutes
- [ ] Email templates updated with expiry information
- [ ] Settings saved

### Leaked Password Protection
- [ ] Have I Been Pwned check enabled
- [ ] Minimum password length set to 10 characters
- [ ] Password complexity requirements enabled
- [ ] Password history enabled (last 5)
- [ ] Settings saved

### Additional Security
- [ ] Email verification required
- [ ] Rate limiting configured
- [ ] Session timeout configured
- [ ] Secure cookies enabled

---

## 🧪 Testing After Configuration

### Test OTP Expiry
1. Request password reset
2. Wait for email
3. Verify link works within expiry time
4. Wait past expiry time
5. Verify link no longer works

### Test Leaked Password Protection
1. Try to set password: `password123` (common leaked password)
2. Should be rejected with message about leaked password
3. Try to set password: `MySecureP@ssw0rd2024!` (strong, unique)
4. Should be accepted

### Test Password Requirements
1. Try password: `short` (too short)
2. Should be rejected
3. Try password: `nouppercase123!` (no uppercase)
4. Should be rejected
5. Try password: `ValidP@ssw0rd123!` (meets all requirements)
6. Should be accepted

---

## 📞 Support

If you encounter issues:

1. **Supabase Documentation**: [https://supabase.com/docs/guides/auth](https://supabase.com/docs/guides/auth)
2. **Supabase Support**: [https://supabase.com/support](https://supabase.com/support)
3. **Have I Been Pwned API**: [https://haveibeenpwned.com/API/v3](https://haveibeenpwned.com/API/v3)

---

## ⚠️ Important Notes

- These settings **cannot** be configured via code or migrations
- Changes take effect **immediately** after saving
- Test thoroughly after configuration
- Document your settings for team reference
- Review settings **quarterly** for security updates

---

**Last Updated**: 2024-11-20  
**Status**: ⚠️ Manual configuration required


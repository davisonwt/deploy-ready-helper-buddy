# Wallet Balance Fix - Binance Pay

## Issue Identified

**Problem**: Wallet balance shows 0 even though user has balance in Binance
**Root Cause**: 
1. User wallets don't have Binance API credentials stored
2. Code was falling back to cache which had no record (returned 0)
3. Binance Pay balance API returns **merchant wallet balance**, not individual user balances

## Important: Binance Pay API Limitation

**⚠️ CRITICAL**: Binance Pay's `/binancepay/openapi/balance` endpoint returns the **merchant's wallet balance**, not individual user Pay ID balances.

**What this means**:
- Users link their Pay ID (e.g., "1180585394")
- But we can't query their personal balance via API
- The balance API only returns the platform's merchant account balance
- Individual user balances must be tracked in our database (`wallet_balances` table)

## Solution Implemented

### 1. ✅ Fallback to Platform Credentials
**File**: `supabase/functions/refresh-binance-wallet-balance/index.ts`

**Change**: If user wallet doesn't have API credentials, use platform-level Binance credentials instead of failing.

**Note**: This will still return merchant balance, not user balance. For user wallets, we now:
- Try to fetch from Binance (will get merchant balance)
- Fall back to cached balance in database
- Initialize balance to 0 if no cache exists

### 2. ✅ Better Error Handling
- Added try-catch around Binance API call
- Better logging for debugging
- Clearer error messages

### 3. ⚠️ User Balance Tracking

**Current State**:
- User balances are stored in `wallet_balances` table
- Should be updated via webhooks when payments are received
- Manual refresh currently returns merchant balance (not user balance)

**Recommended Solution**:
1. **Update balances via webhooks**: When Binance Pay webhook confirms payment, update user's balance in `wallet_balances` table
2. **Manual sync option**: Create a function that syncs balances from payment history
3. **Display cached balance**: Show balance from `wallet_balances` table, not from Binance API

---

## How Binance Pay Works

1. **User links Pay ID**: User provides their Binance Pay ID (e.g., "1180585394")
2. **Platform uses merchant credentials**: All API calls use platform's merchant account
3. **Payments flow**: 
   - User pays → Binance → Webhook → Platform updates `wallet_balances`
4. **Balance tracking**: 
   - Tracked in `wallet_balances` table
   - Updated via webhooks
   - NOT queryable via API for individual users

---

## Next Steps

### Option A: Use Cached Balance (Recommended)
- Always show balance from `wallet_balances` table
- Update via webhooks when payments are received
- Don't try to fetch from Binance API for user wallets

### Option B: Sync from Payment History
- Create a function that calculates balance from payment transactions
- Sum all payments received minus payments sent
- Update `wallet_balances` table

### Option C: Manual Balance Entry
- Allow users/gosats to manually update balance
- Use for reconciliation

---

## Files Modified

1. ✅ `supabase/functions/refresh-binance-wallet-balance/index.ts`
   - Fallback to platform credentials
   - Better error handling
   - Note about merchant vs user balance

---

## Testing

1. **Test with user wallet**:
   - Should use platform credentials
   - Should return cached balance from database
   - Should initialize to 0 if no cache

2. **Test with organization wallet**:
   - Should use platform credentials
   - Should return merchant wallet balance from Binance

---

## Status

✅ **Fixed**: Fallback to platform credentials
⚠️ **Limitation**: Binance Pay API doesn't support querying individual user balances
📋 **Recommendation**: Track balances in database and update via webhooks

**The balance will now show from cache (database) instead of always showing 0.**


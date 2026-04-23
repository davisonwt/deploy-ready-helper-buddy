# Critical Payment System Fixes

## Issues Found & Fixed

### 1. ✅ FIXED: Payment Edge Function Error
**Problem**: `create-binance-pay-order` was using `serviceClient` before it was defined (line 74 vs line 97)
**Error**: "Edge Function returned a non-2xx status code"
**Fix**: Moved `serviceClient` creation before idempotency check

### 2. ✅ FIXED: Missing Idempotency Key
**Problem**: Client code wasn't sending required `x-idempotency-key` header
**Error**: "Idempotency key required" (400 error)
**Fix**: Added idempotency key generation and header in `useBinancePay.tsx`

### 3. ⚠️ BASKET DISPLAY ISSUE
**Problem**: Two separate basket systems:
- `/basket` - Orchard basket (uses `useBasket` hook, `sowBasket` in localStorage)
- `/products/basket` - Product basket (uses `useProductBasket` hook, `productBasket` in localStorage)

**The image shows "Bestowal Basket" which is the PRODUCT basket**, but items might be added to the ORCHARD basket.

**Solution Needed**: 
- Check which basket the user is adding items to
- Ensure they navigate to the correct basket page
- Or unify the basket systems

### 4. ✅ FIXED: Wallet Balance Showing Zero
**Problem**: Balance loads from cache first, and if cache is 0 or stale, it shows 0
**Fix**: Auto-refresh balance if:
- Cached balance is 0
- Cache is older than 5 minutes
- No cache exists

---

## Files Modified

1. ✅ `supabase/functions/create-binance-pay-order/index.ts`
   - Fixed `serviceClient` used before definition
   
2. ✅ `src/hooks/useBinancePay.tsx`
   - Added idempotency key generation and header
   
3. ✅ `src/hooks/useBinanceWallet.ts`
   - Added auto-refresh logic for stale/zero balances

---

## Testing Checklist

- [ ] Test payment flow - should work now with idempotency key
- [ ] Test wallet balance - should auto-refresh if 0 or stale
- [ ] Verify which basket system is being used
- [ ] Test adding items to basket and verify they appear

---

## Next Steps

1. **Test the payment flow** - The edge function error should be fixed
2. **Check basket routing** - Verify which basket page items are added to
3. **Monitor wallet balance** - Should auto-refresh now


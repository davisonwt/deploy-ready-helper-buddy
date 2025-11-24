# Cryptomus Payment Gateway Integration

This guide covers the complete integration of Cryptomus as your payment gateway and preferred wallet for wallet-to-wallet payments.

## Overview

Cryptomus is a cryptocurrency payment gateway that supports multiple cryptocurrencies and networks. This integration replaces Binance Pay and provides:

- **Multiple Cryptocurrency Support**: USDC, USDT, BTC, ETH, and more
- **Multiple Network Support**: TRC20, ERC20, BEP20, and others
- **Wallet-to-Wallet Payments**: Direct transfers between wallets
- **Automatic Payment Confirmation**: Webhook-based payment verification
- **Domain Verification**: DNS-based domain ownership verification

## Prerequisites

1. **Cryptomus Account**: Sign up at [cryptomus.com](https://cryptomus.com)
2. **Merchant Account**: Create a merchant account in the Business section
3. **Domain Verification**: Complete domain verification (see `CRYPTOMUS_DNS_SETUP.md`)
4. **API Credentials**: Obtain Merchant ID and Payment API Key

## Step 1: Domain Verification

Before you can use Cryptomus, you must verify your domain ownership. See `CRYPTOMUS_DNS_SETUP.md` for detailed instructions.

**Quick Steps:**
1. Add DNS TXT record: `cryptomus=48a058b3` (value from Cryptomus dashboard)
2. Wait for DNS propagation (5 minutes to 48 hours)
3. Click "Check" in Cryptomus dashboard
4. Confirm domain

## Step 2: Get API Credentials

**Note**: Your project must be approved first. After submission, wait up to 24 hours for approval.

1. Log into Cryptomus dashboard
2. Navigate to **Business** → **Merchants**
3. Select your merchant account
4. Go to **Settings** → **API Integration**
5. Copy your:
   - **Merchant ID**: `48a058b3-0edc-467f-9391-834e1c7c4247` (you already have this)
   - **Payment API Key** (you'll receive this after approval)

**Your Project Details**:
- Project Name: sow2grow
- Project URL: https://sow2growapp.com
- Merchant ID: `48a058b3-0edc-467f-9391-834e1c7c4247`

## Step 3: Configure Environment Variables

Add these environment variables to your Supabase Edge Functions configuration:

```bash
# Required
CRYPTOMUS_MERCHANT_ID=48a058b3-0edc-467f-9391-834e1c7c4247
CRYPTOMUS_PAYMENT_API_KEY=your_payment_api_key_here  # You'll receive this after approval

# Optional
CRYPTOMUS_API_BASE_URL=https://api.cryptomus.com/v1  # Default
PUBLIC_SITE_URL=https://sow2growapp.com  # Your project URL
```

### Setting Environment Variables in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** → **Settings**
3. Add the environment variables under **Secrets**
4. Save changes

## Step 4: Configure Webhook URL

1. In Cryptomus dashboard, go to **Settings** → **Webhooks**
2. Add webhook URL:
   ```
   https://zuwkgasbkpjlxzsjzumu.supabase.co/functions/v1/cryptomus-webhook
   ```
   (This is your Supabase project URL - verify it matches your project)
3. Select events to receive:
   - Payment status changed
   - Payment confirmed
   - Payment expired
   - Payment failed

## Step 5: Update Your Application

### Replace Binance Pay with Cryptomus

In your payment components, replace `BinancePayButton` with `CryptomusPayButton`:

```tsx
import { CryptomusPayButton } from '@/components/payment/CryptomusPayButton';

// Replace this:
<BinancePayButton
  orchardId={orchardId}
  amount={amount}
  pocketsCount={pocketsCount}
/>

// With this:
<CryptomusPayButton
  orchardId={orchardId}
  amount={amount}
  pocketsCount={pocketsCount}
  currency="USDC"  // Optional: defaults to USDC
  network="TRC20"  // Optional: defaults to TRC20
/>
```

### Using the Hook Directly

```tsx
import { useCryptomusPay } from '@/hooks/useCryptomusPay';

function MyComponent() {
  const { processing, initiateCryptomusPayment } = useCryptomusPay();

  const handlePay = async () => {
    const result = await initiateCryptomusPayment({
      orchardId: '...',
      amount: 100,
      pocketsCount: 1,
      currency: 'USDC',
      network: 'TRC20',
    });

    if (result?.paymentUrl) {
      // Open payment page or show payment address
      window.open(result.paymentUrl, '_blank');
    }
  };
}
```

## Architecture

### Edge Functions

1. **`create-cryptomus-payment`**
   - Creates payment invoice in Cryptomus
   - Stores bestowal record
   - Returns payment URL and wallet address
   - Handles idempotency

2. **`cryptomus-webhook`**
   - Verifies webhook signatures
   - Updates payment status
   - Triggers distribution (if automatic)
   - Prevents replay attacks

### Shared Utilities

- **`_shared/cryptomus.ts`**: Cryptomus API client with signature generation

### Frontend Components

- **`CryptomusPayButton`**: Payment button component
- **`useCryptomusPay`**: React hook for payment initiation

## Payment Flow

1. **User Initiates Payment**
   - User clicks "Pay with Cryptomus" button
   - Frontend calls `create-cryptomus-payment` edge function
   - Function creates bestowal record and Cryptomus invoice
   - Returns payment URL and wallet address

2. **User Completes Payment**
   - User sends cryptocurrency to provided address
   - Cryptomus detects payment
   - Cryptomus sends webhook to `cryptomus-webhook`

3. **Payment Confirmation**
   - Webhook verifies signature
   - Updates bestowal status to "completed"
   - Triggers distribution (if automatic mode)
   - Sends notifications

## Supported Currencies and Networks

### Currencies
- USDC (USD Coin)
- USDT (Tether)
- BTC (Bitcoin)
- ETH (Ethereum)
- And more (check Cryptomus documentation)

### Networks
- **TRC20**: Tron network (recommended for USDC/USDT - low fees)
- **ERC20**: Ethereum network
- **BEP20**: Binance Smart Chain
- And more

## Distribution Rules

Same as Binance Pay integration:

- **Standard orchards**: Funds held in `s2gholding` until Gosat release
- **Full value orchards (no courier)**: Instant distribution
- **Digital products**: Instant distribution
- **15% to s2gbestow**: 10% tithe + 5% admin stewardship

## Security Features

1. **Signature Verification**: All webhooks verified using MD5 signatures
2. **Idempotency**: Prevents duplicate payments
3. **Amount Verification**: Webhook amounts verified against stored amounts
4. **Replay Protection**: Webhooks tracked to prevent reprocessing
5. **CORS Protection**: Only allowed origins can call functions

## Testing

### Test Mode

Cryptomus provides a test/sandbox environment:

1. Use test API credentials from Cryptomus dashboard
2. Test payments won't affect real balances
3. Test webhooks will be sent to your webhook URL

### Testing Checklist

- [ ] Domain verification complete
- [ ] API credentials configured
- [ ] Webhook URL configured
- [ ] Test payment creation
- [ ] Test webhook reception
- [ ] Test payment confirmation
- [ ] Test distribution (if automatic)
- [ ] Test error handling

## Troubleshooting

### Payment Not Created

- Check API credentials are correct
- Verify domain is confirmed in Cryptomus
- Check edge function logs for errors
- Ensure idempotency key is unique

### Webhook Not Received

- Verify webhook URL is correct in Cryptomus dashboard
- Check Supabase function logs
- Ensure webhook events are enabled
- Verify signature verification is working

### Payment Not Confirmed

- Check webhook is being received
- Verify signature verification
- Check bestowal record exists
- Review distribution logic

### Amount Mismatch

- Verify webhook amount matches stored amount
- Check currency conversion (if applicable)
- Review payment transaction records

## Migration from Binance Pay

If migrating from Binance Pay:

1. **Keep Both Active**: Run both systems in parallel initially
2. **Update Components**: Replace `BinancePayButton` with `CryptomusPayButton`
3. **Update Hooks**: Replace `useBinancePay` with `useCryptomusPay`
4. **Test Thoroughly**: Test all payment flows
5. **Monitor**: Watch for any issues
6. **Deprecate**: Remove Binance Pay code after successful migration

## API Reference

### Create Payment

**Endpoint**: `create-cryptomus-payment`

**Request**:
```json
{
  "orchardId": "uuid",
  "amount": 100,
  "pocketsCount": 1,
  "message": "Optional message",
  "growerId": "uuid (optional)",
  "currency": "USDC (optional)",
  "network": "TRC20 (optional)",
  "clientOrigin": "https://yourdomain.com"
}
```

**Response**:
```json
{
  "success": true,
  "bestowalId": "uuid",
  "paymentUrl": "https://cryptomus.com/pay/...",
  "paymentId": "uuid",
  "address": "T...",
  "amount": "100.00",
  "currency": "USDC",
  "network": "TRC20"
}
```

### Webhook Payload

**Endpoint**: `cryptomus-webhook`

**Headers**:
- `merchant`: Merchant ID
- `sign`: MD5 signature

**Payload**:
```json
{
  "orderId": "bestowal-uuid",
  "uuid": "payment-uuid",
  "amount": "100.00",
  "currency": "USDC",
  "paymentStatus": "paid",
  "state": 1,
  "txId": "transaction-hash",
  "address": "wallet-address"
}
```

## Support

- **Cryptomus Documentation**: https://doc.cryptomus.com
- **Cryptomus Support**: support@cryptomus.com
- **Telegram**: @cryptomussupport

## Next Steps

1. Complete domain verification
2. Configure API credentials
3. Test payment flow
4. Update your UI components
5. Monitor webhook logs
6. Go live!


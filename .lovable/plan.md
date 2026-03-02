

# Fix: Deploy PayPal Edge Functions

## Problem
The "Complete Bestowal with PayPal" button fails with "Failed to send a request to the Edge Function" because the `create-paypal-order` edge function has not been deployed to Supabase.

The edge function logs confirm it boots successfully but the client can't reach it — indicating a deployment issue.

Additionally, the `paypal-webhook` function has a bug: it crashes with `SyntaxError: Unexpected end of JSON input` when PayPal sends health-check pings (empty body). This needs a guard.

## Plan

### 1. Deploy both edge functions
Deploy `create-paypal-order` and `paypal-webhook` to Supabase using the deploy tool.

### 2. Fix webhook empty-body crash
Add a guard in `paypal-webhook/index.ts` to handle empty request bodies gracefully (PayPal sends periodic verification pings with no body). Change the JSON parse to check for empty body first.


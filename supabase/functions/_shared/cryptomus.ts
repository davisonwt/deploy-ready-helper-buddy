// Import MD5 library for Cryptomus signature generation
// Using esm.sh for MD5 implementation
import { md5 as md5Hash } from "https://esm.sh/md5@2.3.0";

export interface CryptomusConfig {
  merchantId: string;
  paymentApiKey: string;
  apiBaseUrl: string;
  walletName?: string; // Track which wallet this config is for
}

export interface CreatePaymentPayload {
  orderId: string;
  amount: number;
  currency: string; // e.g., "USDC", "USDT", "BTC"
  network?: string; // e.g., "TRC20", "ERC20", "BEP20"
  urlReturn?: string;
  urlSuccess?: string;
  urlCallback?: string;
  isPaymentMultiple?: boolean;
  lifetime?: number; // Invoice lifetime in minutes
  toCurrency?: string; // For conversion
  subtract?: number; // Fee percentage
  accuracy?: number; // Payment accuracy percentage
  additionalData?: Record<string, unknown>;
  currencies?: string[]; // Allowed currencies
  exceptCurrencies?: string[]; // Excluded currencies
}

export interface CryptomusPaymentResponse {
  state: number; // 0 = pending, 1 = paid, 2 = expired, 3 = failed
  result: {
    uuid: string;
    orderId: string;
    amount: string;
    paymentAmount: string;
    paymentAmountUsd: string;
    currency: string;
    network: string;
    address: string;
    from: string;
    txId: string;
    paymentStatus: string;
    url: string;
    expiredAt: number;
    status: string;
    isFinal: boolean;
    additionalData?: Record<string, unknown>;
  };
}

export interface CryptomusWebhookPayload {
  orderId: string;
  type: string; // "payment" | "withdrawal"
  sign: string;
  merchantId: string;
  [key: string]: unknown;
}

const encoder = new TextEncoder();

export function loadCryptomusConfig(walletName?: string): CryptomusConfig {
  const merchantId = Deno.env.get("CRYPTOMUS_MERCHANT_ID");
  const paymentApiKey = Deno.env.get("CRYPTOMUS_PAYMENT_API_KEY");

  if (!merchantId || !paymentApiKey) {
    throw new Error(
      "Missing Cryptomus configuration. Ensure CRYPTOMUS_MERCHANT_ID and CRYPTOMUS_PAYMENT_API_KEY are set.",
    );
  }

  return {
    merchantId,
    paymentApiKey,
    apiBaseUrl: Deno.env.get("CRYPTOMUS_API_BASE_URL") ??
      "https://api.cryptomus.com/v1",
    walletName,
  };
}


/**
 * Generate MD5 hash (required for Cryptomus)
 * Using imported MD5 library
 */
function md5Sync(text: string): string {
  return md5Hash(text);
}

/**
 * Generate Cryptomus signature using MD5
 * Note: This uses a synchronous MD5 implementation
 * For production, ensure you have a proper MD5 library
 */
function generateCryptomusSignature(
  merchantId: string,
  orderId: string,
  amount: string,
  currency: string,
  apiKey: string,
): string {
  const payload = `${merchantId}${orderId}${amount}${currency}${apiKey}`;
  return md5Sync(payload);
}

function buildHeaders(
  config: CryptomusConfig,
  signature: string,
): HeadersInit {
  return {
    "Content-Type": "application/json",
    "merchant": config.merchantId,
    "sign": signature,
  };
}

export class CryptomusClient {
  private readonly config: CryptomusConfig;

  constructor(config?: CryptomusConfig) {
    this.config = config ?? loadCryptomusConfig();
  }

  async createPayment(
    payload: CreatePaymentPayload,
  ): Promise<CryptomusPaymentResponse> {
    const amountStr = payload.amount.toString();
    const signature = generateCryptomusSignature(
      this.config.merchantId,
      payload.orderId,
      amountStr,
      payload.currency,
      this.config.paymentApiKey,
    );

    const requestBody: Record<string, unknown> = {
      amount: amountStr,
      currency: payload.currency,
      orderId: payload.orderId,
      urlReturn: payload.urlReturn,
      urlSuccess: payload.urlSuccess,
      urlCallback: payload.urlCallback,
      network: payload.network,
      isPaymentMultiple: payload.isPaymentMultiple ?? false,
      lifetime: payload.lifetime ?? 30, // Default 30 minutes
      toCurrency: payload.toCurrency,
      subtract: payload.subtract,
      accuracy: payload.accuracy,
      additionalData: payload.additionalData,
      currencies: payload.currencies,
      exceptCurrencies: payload.exceptCurrencies,
    };

    // Remove undefined values
    Object.keys(requestBody).forEach(key => {
      if (requestBody[key] === undefined) {
        delete requestBody[key];
      }
    });

    const response = await this.privateRequest(
      "/payment",
      JSON.stringify(requestBody),
      signature,
    );

    if (response.state !== 0 && response.state !== 1) {
      throw new Error(
        `Cryptomus payment creation failed: ${JSON.stringify(response)}`,
      );
    }

    return response;
  }

  async getPaymentStatus(orderId: string): Promise<CryptomusPaymentResponse> {
    const signature = generateCryptomusSignature(
      this.config.merchantId,
      orderId,
      "0",
      "USDC",
      this.config.paymentApiKey,
    );

    const response = await this.privateRequest(
      `/payment/${orderId}`,
      JSON.stringify({}),
      signature,
      "GET",
    );

    return response;
  }

  async verifyWebhookSignature(
    rawBody: string,
    headers: Headers,
  ): Promise<boolean> {
    const sign = headers.get("sign");
    const merchantId = headers.get("merchant");

    if (!sign || !merchantId) {
      return false;
    }

    if (merchantId !== this.config.merchantId) {
      console.error("Cryptomus merchant ID mismatch", merchantId);
      return false;
    }

    try {
      const body = JSON.parse(rawBody);
      const orderId = body.orderId || "";
      const amount = body.amount || "0";
      const currency = body.currency || "USDC";

      const expectedSignature = generateCryptomusSignature(
        this.config.merchantId,
        orderId,
        amount.toString(),
        currency,
        this.config.paymentApiKey,
      );

      return timingSafeEqual(sign, expectedSignature);
    } catch (e) {
      console.error("Failed to verify Cryptomus webhook signature:", e);
      return false;
    }
  }

  private async privateRequest(
    endpoint: string,
    body: string,
    signature: string,
    method: string = "POST",
  ): Promise<any> {
    const fullUrl = `${this.config.apiBaseUrl}${endpoint}`;
    console.log(`[Cryptomus] Request to: ${fullUrl}`);
    console.log(`[Cryptomus] Request body: ${body}`);

    const response = await fetch(
      fullUrl,
      {
        method,
        headers: buildHeaders(this.config, signature),
        body: method !== "GET" ? body : undefined,
      },
    );

    const responseText = await response.text();
    console.log(`[Cryptomus] Response status: ${response.status}`);
    console.log(`[Cryptomus] Response body: ${responseText}`);

    if (!response.ok) {
      throw new Error(
        `Cryptomus HTTP error ${response.status}: ${responseText}`,
      );
    }

    try {
      const parsed = JSON.parse(responseText);
      return parsed;
    } catch (e) {
      console.error(`[Cryptomus] Failed to parse response as JSON:`, e);
      throw new Error(`Invalid JSON response from Cryptomus: ${responseText}`);
    }
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function formatAmount(amount: number): string {
  return amount.toFixed(2);
}


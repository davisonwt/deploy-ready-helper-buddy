export interface BinancePayConfig {
  apiKey: string;
  apiSecret: string;
  merchantId: string;
  apiBaseUrl: string;
  defaultTradeType: string;
}

export interface CreateOrderPayload {
  merchantTradeNo: string;
  currency: string;
  totalAmount: number;
  subject: string;
  description?: string;
  buyer?: {
    referenceUserId?: string;
  };
  returnUrl?: string;
  cancelUrl?: string;
  goods?: Array<{
    goodsType: string;
    goodsCategory?: string;
    referenceGoodsId?: string;
    goodsName: string;
  }>;
  meta?: Record<string, unknown>;
}

export interface BinanceOrderResponse {
  prepayId: string;
  prepayUrl?: string;
  qrcodeLink?: string;
  checkoutUrl?: string;
  [key: string]: unknown;
}

export interface BinanceBalanceResponse {
  balance: number;
  asset: string;
  fiat: string;
  availableFiatValuation?: number;
  availableBtcValuation?: number;
}

export interface TransferInstruction {
  requestId: string;
  payeeId: string;
  payeeType?: string;
  amount: number;
  currency: string;
  remark?: string;
}

export interface BinanceTransferResponse {
  transferId: string;
  status: string;
  [key: string]: unknown;
}

const encoder = new TextEncoder();

export function loadBinancePayConfig(): BinancePayConfig {
  const apiKey = Deno.env.get("BINANCE_PAY_API_KEY");
  const apiSecret = Deno.env.get("BINANCE_PAY_API_SECRET");
  const merchantId = Deno.env.get("BINANCE_PAY_MERCHANT_ID");

  if (!apiKey || !apiSecret || !merchantId) {
    throw new Error(
      "Missing Binance Pay configuration. Ensure BINANCE_PAY_API_KEY, BINANCE_PAY_API_SECRET, and BINANCE_PAY_MERCHANT_ID are set.",
    );
  }

  return {
    apiKey,
    apiSecret,
    merchantId,
    apiBaseUrl: Deno.env.get("BINANCE_PAY_API_BASE_URL") ??
      "https://bpay.binanceapi.com",
    defaultTradeType: Deno.env.get("BINANCE_PAY_TRADE_TYPE") ?? "WEB",
  };
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

async function generateSignature(
  body: string,
  timestamp: string,
  nonce: string,
  secret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-512",
    },
    false,
    ["sign"],
  );

  const payload = `${timestamp}\n${nonce}\n${body}\n`;
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );

  return toHex(signature);
}

function buildHeaders(
  config: BinancePayConfig,
  signature: string,
  timestamp: string,
  nonce: string,
): HeadersInit {
  return {
    "Content-Type": "application/json",
    "BinancePay-Timestamp": timestamp,
    "BinancePay-Nonce": nonce,
    "BinancePay-Certificate-SN": config.apiKey,
    "BinancePay-Signature": signature,
  };
}

function getNonce(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export class BinancePayClient {
  private readonly config: BinancePayConfig;

  constructor(config?: BinancePayConfig) {
    this.config = config ?? loadBinancePayConfig();
  }

  async createOrder(
    payload: CreateOrderPayload,
  ): Promise<BinanceOrderResponse> {
    const requestBody = JSON.stringify({
      merchantId: this.config.merchantId,
      merchantTradeNo: payload.merchantTradeNo,
      tradeType: this.config.defaultTradeType,
      currency: payload.currency,
      totalFee: formatAmount(payload.totalAmount),
      goodsDetails: payload.goods?.map((good) => ({
        ...good,
        goodsName: good.goodsName.slice(0, 128),
        goodsType: good.goodsType ?? "02",
      })),
      productType: "STANDARD",
      returnUrl: payload.returnUrl,
      cancelUrl: payload.cancelUrl,
      orderExpireTime: getExpiryTime(),
      passThroughInfo: payload.meta ?? {},
      buyer: payload.buyer,
    });

    const response = await this.privateRequest(
      "/binancepay/openapi/v3/order",
      requestBody,
    );

    if (response.code !== "SUCCESS") {
      throw new Error(
        `Binance Pay order creation failed: ${response.code} - ${response.errorMessage ?? response.message}`,
      );
    }

    return response.data as BinanceOrderResponse;
  }

  async createTransfer(
    instruction: TransferInstruction,
  ): Promise<BinanceTransferResponse> {
    const requestBody = JSON.stringify({
      merchantId: this.config.merchantId,
      requestId: instruction.requestId,
      transferType: "CUSTOMIZED_BY_USER_ID",
      payeeType: instruction.payeeType ?? "PAY_ID",
      payeeId: instruction.payeeId,
      transferAmount: formatAmount(instruction.amount),
      transferCurrency: instruction.currency,
      remark: instruction.remark,
    });

    const response = await this.privateRequest(
      "/binancepay/openapi/v3/transfer",
      requestBody,
    );

    if (response.code !== "SUCCESS") {
      throw new Error(
        `Binance Pay transfer failed: ${response.code} - ${response.errorMessage ?? response.message}`,
      );
    }

    return response.data as BinanceTransferResponse;
  }

  async getWalletBalance(
    params: {
      wallet?: string;
      currency?: string;
    },
  ): Promise<BinanceBalanceResponse> {
    const requestBody = JSON.stringify({
      wallet: params.wallet ?? "FUNDING_WALLET",
      currency: params.currency ?? "USDC",
    });

    const response = await this.privateRequest(
      "/binancepay/openapi/balance",
      requestBody,
    );

    if (response.status !== "SUCCESS") {
      throw new Error(
        `Failed to fetch Binance Pay balance: ${response.code} - ${response.errorMessage ?? response.message}`,
      );
    }

    return response.data;
  }

  async verifyWebhookSignature(
    rawBody: string,
    headers: Headers,
  ): Promise<boolean> {
    const timestamp = headers.get("BinancePay-Timestamp");
    const nonce = headers.get("BinancePay-Nonce");
    const signature = headers.get("BinancePay-Signature");
    const certificateSn = headers.get("BinancePay-Certificate-SN");

    if (!timestamp || !nonce || !signature || !certificateSn) {
      return false;
    }

    if (certificateSn !== this.config.apiKey) {
      console.error(
        "Binance Pay certificate mismatch",
        certificateSn,
      );
      return false;
    }

    const now = Date.now();
    const requestTime = Number(timestamp);
    const toleranceMs = Number(
      Deno.env.get("BINANCE_PAY_WEBHOOK_TOLERANCE_MS") ?? 5 * 60 * 1000,
    );

    if (Number.isFinite(requestTime) && Math.abs(now - requestTime) > toleranceMs) {
      console.warn(
        `Binance Pay webhook timestamp outside tolerance: now=${now}, timestamp=${requestTime}`,
      );
      return false;
    }

    return await verifySignature(
      rawBody,
      timestamp,
      nonce,
      signature,
      this.config.apiSecret,
    );
  }

  private async privateRequest(
    endpoint: string,
    body: string,
  ): Promise<any> {
    const timestamp = Date.now().toString();
    const nonce = getNonce();
    const signature = await generateSignature(
      body,
      timestamp,
      nonce,
      this.config.apiSecret,
    );

    const fullUrl = `${this.config.apiBaseUrl}${endpoint}`;
    console.log(`[Binance Pay] Request to: ${fullUrl}`);
    console.log(`[Binance Pay] Request body: ${body}`);

    const response = await fetch(
      fullUrl,
      {
        method: "POST",
        headers: buildHeaders(this.config, signature, timestamp, nonce),
        body,
      },
    );

    const responseText = await response.text();
    console.log(`[Binance Pay] Response status: ${response.status}`);
    console.log(`[Binance Pay] Response body: ${responseText}`);

    if (!response.ok) {
      throw new Error(
        `Binance Pay HTTP error ${response.status}: ${responseText}`,
      );
    }

    try {
      return JSON.parse(responseText);
    } catch (e) {
      console.error(`[Binance Pay] Failed to parse response as JSON:`, e);
      throw new Error(`Invalid JSON response from Binance Pay: ${responseText}`);
    }
  }
}

export async function verifySignature(
  rawBody: string,
  timestamp: string,
  nonce: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const expectedSignature = await generateSignature(
    rawBody,
    timestamp,
    nonce,
    secret,
  );

  return timingSafeEqual(signature, expectedSignature);
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

function getExpiryTime(): string {
  const expiryMinutes = Number(
    Deno.env.get("BINANCE_PAY_ORDER_EXPIRY_MINUTES") ?? "15",
  );
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  return expiresAt.toISOString();
}

export function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

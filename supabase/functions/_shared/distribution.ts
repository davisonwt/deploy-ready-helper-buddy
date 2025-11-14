import { BinancePayClient } from "./binance.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface DistributionData {
  total_amount: number;
  currency: string;
  holding_wallet: string;
  tithing_admin_wallet: string;
  tithing_admin_amount: number;
  sower_wallet: string;
  sower_amount: number;
  grower_wallet?: string | null;
  grower_amount?: number | null;
  sower_user_id?: string;
  grower_user_id?: string | null;
  mode: "automatic" | "manual";
  hold_reason?: string | null;
  orchard_type?: string | null;
  courier_required?: boolean;
  proof_sent_at?: string | null;
  manual_release_at?: string | null;
  manual_release_user_id?: string | null;
  percentages: {
    holding: number;
    tithing_admin: number;
    sower: number;
    grower?: number;
  };
  generated_at: string;
}

export interface DistributionContext {
  orchardId: string;
  orchardTitle: string;
  orchardUserId: string;
  totalAmount: number;
  currency: string;
  growerUserId?: string | null;
  distributionMode?: "automatic" | "manual";
  holdReason?: string | null;
  orchardType?: string | null;
  courierRequired?: boolean;
  productType?: string | null;
}

const DEFAULT_TITHING_PERCENT = Number(
  Deno.env.get("BESTOWAL_TITHING_PERCENT") ?? "0.15",
);

const DEFAULT_GROWER_PERCENT = Number(
  Deno.env.get("BESTOWAL_GROWER_PERCENT") ?? "0.10",
);

export async function buildDistributionData(
  supabase: SupabaseClient,
  context: DistributionContext,
): Promise<DistributionData> {
  const distributionMode = context.distributionMode ?? "automatic";
  const tithingPercent = clampPercentage(DEFAULT_TITHING_PERCENT);
  const growerPercent = context.growerUserId
    ? clampPercentage(DEFAULT_GROWER_PERCENT)
    : 0;
  const sowerPercent = clampPercentage(
    1 - tithingPercent - growerPercent,
  );

  const wallets = await fetchOrganizationWallets(supabase, [
    "s2gholding",
    "s2gbestow",
    "s2gdavison",
  ]);

  if (!wallets.s2gholding) {
    throw new Error("Holding wallet (s2gholding) is not configured");
  }

  if (!wallets.s2gbestow) {
    throw new Error("Tithing wallet (s2gbestow) is not configured");
  }

  const sowerWallet = await resolveUserWallet(
    supabase,
    context.orchardUserId,
  ) ?? wallets.s2gdavison;

  if (!sowerWallet) {
    throw new Error(
      "Unable to determine sower Binance Pay wallet. Please configure a wallet for the orchard owner or set organization wallet s2gdavison.",
    );
  }

  const growerWallet = context.growerUserId
    ? await resolveUserWallet(supabase, context.growerUserId)
    : null;

  const totalAmount = roundAmount(context.totalAmount);
  const tithingAmount = roundAmount(totalAmount * tithingPercent);
  const growerAmount = growerPercent > 0
    ? roundAmount(totalAmount * growerPercent)
    : 0;
  const sowerAmount = roundAmount(
    totalAmount - tithingAmount - growerAmount,
  );

  return {
    total_amount: totalAmount,
    currency: context.currency,
    holding_wallet: wallets.s2gholding,
    tithing_admin_wallet: wallets.s2gbestow,
    tithing_admin_amount: tithingAmount,
    sower_wallet: sowerWallet,
    sower_amount: sowerAmount,
    sower_user_id: context.orchardUserId,
    grower_wallet: growerWallet,
    grower_amount: growerAmount || null,
    grower_user_id: context.growerUserId ?? null,
    mode: distributionMode,
    hold_reason: context.holdReason ?? null,
    orchard_type: context.orchardType ?? null,
    courier_required: context.courierRequired ?? false,
    proof_sent_at: null,
    manual_release_at: null,
    manual_release_user_id: null,
    percentages: {
      holding: 1,
      tithing_admin: tithingPercent,
      sower: sowerPercent,
      grower: growerPercent || undefined,
    },
    generated_at: new Date().toISOString(),
  };
}

export interface DistributionResult {
  success: boolean;
  transfers: Array<{
    payee: string;
    amount: number;
    currency: string;
    response: unknown;
  }>;
}

export async function executeDistribution(
  supabase: SupabaseClient,
  binanceClient: BinancePayClient,
  bestowalId: string,
  distribution: DistributionData,
): Promise<DistributionResult> {
  const transfers: DistributionResult["transfers"] = [];

  if (distribution.tithing_admin_amount > 0) {
    const response = await executeTransfer(binanceClient, {
      bestowalId,
      suffix: "tithing",
      wallet: distribution.tithing_admin_wallet,
      amount: distribution.tithing_admin_amount,
      currency: distribution.currency,
      remark: "Bestowal distribution - tithing & admin",
    });

    transfers.push({
      payee: distribution.tithing_admin_wallet,
      amount: distribution.tithing_admin_amount,
      currency: distribution.currency,
      response,
    });
  }

  if (distribution.sower_amount > 0) {
    const response = await executeTransfer(binanceClient, {
      bestowalId,
      suffix: "sower",
      wallet: distribution.sower_wallet,
      amount: distribution.sower_amount,
      currency: distribution.currency,
      remark: "Bestowal distribution - sower",
    });

    transfers.push({
      payee: distribution.sower_wallet,
      amount: distribution.sower_amount,
      currency: distribution.currency,
      response,
    });

    if (distribution.sower_user_id) {
      await incrementWalletBalance(
        supabase,
        distribution.sower_user_id,
        distribution.sower_wallet,
        distribution.sower_amount,
      );
    }
  }

  if (distribution.grower_wallet && (distribution.grower_amount ?? 0) > 0) {
    const response = await executeTransfer(binanceClient, {
      bestowalId,
      suffix: "grower",
      wallet: distribution.grower_wallet,
      amount: distribution.grower_amount ?? 0,
      currency: distribution.currency,
      remark: "Bestowal distribution - product whispers",
    });

    transfers.push({
      payee: distribution.grower_wallet,
      amount: distribution.grower_amount ?? 0,
      currency: distribution.currency,
      response,
    });

    if (distribution.grower_user_id) {
      await incrementWalletBalance(
        supabase,
        distribution.grower_user_id,
        distribution.grower_wallet,
        distribution.grower_amount ?? 0,
      );
    }
  }

  await supabase
    .from("bestowals")
    .update({
      payment_status: "distributed",
      distributed_at: new Date().toISOString(),
    })
    .eq("id", bestowalId);

  return {
    success: true,
    transfers,
  };
}

async function fetchOrganizationWallets(
  supabase: SupabaseClient,
  walletNames: string[],
): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("organization_wallets")
    .select("wallet_name, wallet_address")
    .in("wallet_name", walletNames)
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  const result: Record<string, string> = {};
  for (const wallet of data ?? []) {
    result[wallet.wallet_name] = wallet.wallet_address;
  }

  return result;
}

async function resolveUserWallet(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data: wallet, error } = await supabase
    .from("user_wallets")
    .select("wallet_address")
    .eq("user_id", userId)
    .in("wallet_type", ["binance_pay", "binance", "binance_pay_id"])
    .eq("is_active", true)
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching user wallet:", error);
  }

  if (wallet?.wallet_address) {
    return wallet.wallet_address;
  }

  const { data: sower } = await supabase
    .from("sowers")
    .select("wallet_address")
    .eq("user_id", userId)
    .maybeSingle();

  if (sower?.wallet_address) {
    return sower.wallet_address;
  }

  return null;
}

async function executeTransfer(
  binanceClient: BinancePayClient,
  params: {
    bestowalId: string;
    suffix: string;
    wallet: string;
    amount: number;
    currency: string;
    remark: string;
  },
) {
  return await binanceClient.createTransfer({
    requestId: `${params.bestowalId}-${params.suffix}-${crypto.randomUUID()}`,
    payeeId: params.wallet,
    amount: params.amount,
    currency: params.currency,
    remark: params.remark,
  });
}

function clampPercentage(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}

function roundAmount(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function incrementWalletBalance(
  supabase: SupabaseClient,
  userId: string,
  walletAddress: string,
  amountDelta: number,
) {
  try {
    const { data: existing } = await supabase
      .from("wallet_balances")
      .select("usdc_balance")
      .eq("user_id", userId)
      .eq("wallet_address", walletAddress)
      .maybeSingle();

    const currentBalance = Number(existing?.usdc_balance ?? 0);
    const newBalance = roundAmount(currentBalance + amountDelta);

    await supabase.rpc("update_wallet_balance_secure", {
      target_user_id: userId,
      target_wallet_address: walletAddress,
      new_balance: newBalance,
    });
  } catch (error) {
    console.error(
      "Failed to increment wallet balance for",
      walletAddress,
      ":", error,
    );
  }
}

import { ethers } from 'ethers';

// Cronos mainnet configuration
export const CRONOS_CHAIN_ID = 25;
export const CRONOS_RPC_URL = 'https://evm.cronos.org';

// USDC on Cronos mainnet
export const USDC_ADDRESS = '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59';

// USDC ABI (minimal for transfers)
export const USDC_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

export const formatUSDC = (amount: string | number): string => {
  try {
    const amountStr = typeof amount === 'number' ? amount.toString() : amount;
    const parsed = parseFloat(amountStr);
    if (isNaN(parsed)) return '0.00';
    return parsed.toFixed(2);
  } catch {
    return '0.00';
  }
};

export const parseUSDC = (amount: string | number): bigint => {
  try {
    const amountStr = typeof amount === 'number' ? amount.toString() : amount;
    const parsed = parseFloat(amountStr);
    if (isNaN(parsed)) return BigInt(0);
    // USDC has 6 decimals on Cronos
    return ethers.parseUnits(parsed.toFixed(6), 6);
  } catch {
    return BigInt(0);
  }
};

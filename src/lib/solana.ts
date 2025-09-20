import { Connection, PublicKey } from '@solana/web3.js';

export const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
export const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // Mainnet USDC
/**
 * Runs once per payments-suite run. The devnet purchase spec moves real
 * devnet USDC from the test wallet, so it is excluded unless asked for
 * (RUN_DEVNET_PURCHASE=1, see playwright.config.ts) -- and a run that left
 * it out says so, rather than letting a green suite imply it ran.
 */
export default function globalSetup() {
  if (process.env.RUN_DEVNET_PURCHASE !== '1') {
    console.log('[payments] devnet-purchase-routing NOT run (spends devnet USDC). Run it with RUN_DEVNET_PURCHASE=1 after any change to checkout, SeedCard purchase routing or finalize -- see tests/live/README.md.');
  }
}

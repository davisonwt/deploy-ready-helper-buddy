# Contributing

## TypeScript ratchet (Slice 8)

The codebase is mid-migration from JavaScript to TypeScript. To stop the JS
surface from growing while we burn down the existing `.jsx` files, the
following rules apply:

1. **All new files must be `.ts` or `.tsx`.** No new `.js` or `.jsx` files.
   ESLint emits a warning on every `.js`/`.jsx` file in `src/` to make this
   visible during review.

2. **Opportunistic conversion only.** When you touch an existing `.jsx` file
   for a real change, rename it to `.tsx` and add types as needed. Do **not**
   open standalone "convert to TS" PRs across many files — those create huge
   diffs that are impossible to review and tend to introduce regressions.

3. **No big-bang.** Strict-null-checks will be flipped on per-folder using
   TypeScript project references in a separate slice, not as part of file
   renames.

4. **Existing `.jsx` files are grandfathered.** The ~180 legacy `.jsx` files
   are intentionally left alone until they're naturally touched. The ESLint
   warning is informational, not a CI blocker.

## Scope discipline

When editing, only touch files directly required for the change you were
asked to make. Unrelated refactors, renames, and "while I'm here"
improvements should be proposed separately, not bundled in.

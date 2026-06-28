## Investigation report — read only, no changes made

### 1. `ethers` — **UNUSED (dead weight)**

**Imports found (2):**
- `src/hooks/useWallet.tsx` — exports `useWallet()` hook (Cronos USDC wallet)
- `src/lib/cronos.ts` — exports `USDC_ADDRESS`, `USDC_ABI`

**Consumers in `src/`:** none.
- `useWallet` is not imported anywhere outside its own file.
- `@/lib/cronos` is imported only by `useWallet.tsx` itself.

**Conclusion:** Leftover from the Binance/Cronos/crypto-wallet removal earlier today. Safe to delete both files and drop the `ethers` package.

---

### 2. `@huggingface/transformers` — **EFFECTIVELY UNUSED**

**Import found (1):**
- `src/utils/backgroundRemoval.ts` — uses `pipeline('image-segmentation', 'Xenova/segformer-...')` for in-browser background removal. Exports: `removeBackground`, `loadImage`, `loadImageFromUrl`.

**Consumers in `src/`:**
- `src/components/LogoProcessor.tsx` — calls `removeBackground` and `loadImageFromUrl`. **`LogoProcessor` itself has zero consumers** (no page/route imports it).
- `src/utils/videoProcessor.js` — has `import { loadImage } from '@/utils/backgroundRemoval'` but **never calls `loadImage`** (import-only, unused symbol). `videoProcessor` itself is heavily used, but it does not trigger the transformers pipeline.

**Conclusion:** Only the orphaned `LogoProcessor` actually executes the transformers code. Safe to delete `LogoProcessor.tsx` + `backgroundRemoval.ts` (and remove the unused `loadImage` import from `videoProcessor.js`), then drop the `@huggingface/transformers` package.

---

### 3. `socket.io-client` — **UNUSED (dead weight)**

**Import found (1):**
- `src/utils/liveStreamingService.js` — `import io from 'socket.io-client'`, a custom WebRTC + Socket.IO live-streaming service class.

**Consumer chain:**
- `liveStreamingService` → used only by `src/hooks/useLiveStreaming.jsx`
- `useLiveStreaming` → used only by 3 components in `src/components/streaming/`:
  - `LiveStreamViewer.jsx`
  - `LiveStreamBroadcaster.jsx`
  - `LiveStreamDirectory.jsx`
- **None of these 3 components are imported anywhere** (no route, no page, no parent).

Note: the `LiveStream*` components actually rendered by the app live in `src/components/radio/` (`LiveStreamInterface`, `LiveStreamListener`, used by `GroveStationPage`). Those are unrelated and do NOT use socket.io — radio/live features go through Supabase realtime.

**Conclusion:** Entire `components/streaming/` + `useLiveStreaming` + `liveStreamingService` chain is dead. Safe to delete all of it and drop `socket.io-client`.

---

### Summary

| Package | Status | Files implicated |
|---|---|---|
| `ethers` | Dead | `useWallet.tsx`, `lib/cronos.ts` |
| `@huggingface/transformers` | Dead | `backgroundRemoval.ts`, `LogoProcessor.tsx`, unused import in `videoProcessor.js` |
| `socket.io-client` | Dead | `liveStreamingService.js`, `useLiveStreaming.jsx`, `components/streaming/LiveStream{Viewer,Broadcaster,Directory}.jsx` |

All three can be removed cleanly. **Awaiting your go-ahead before deleting any files or uninstalling packages** (per scope-lock + checkpoint rules).

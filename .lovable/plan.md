# Radio visual identity — plan

## Architecture confirmed

- `RadioPage.tsx` mounts four tab components: `MusicLibrary`, `PlaylistManager`, `LiveStreamPlayer`, `ListenerInteractions`. Grepped — **none of these four are imported anywhere else**. `GroveStationPage` and `RadioManagementPage` use different `DJ*`/`Public*` siblings. Safe to restyle directly with **zero risk** to other surfaces.
- `LiveStreamPlayer` has a real `<audio ref={audioRef} src={streamUrl}>` element with real `play`/`pause`/`loadstart`/`error` listeners. The `playing` boolean is **genuinely tied to media element state**.
- `listenerCount` is partially real (Supabase RPC `get_current_radio_show` + `radio-live-updates` broadcast channel) but has an optimistic `prev + 1` bump on local play — that bump is already-existing behavior, I won't touch it.

## The honest constraint (waveform)

A true frequency-reactive waveform requires `AudioContext` + `MediaElementAudioSourceNode` + `AnalyserNode` wired to the `<audio>` element. The stream is **cross-origin** (`s9.voscast.com:9525/stream`) and the `<audio>` tag has no `crossOrigin="anonymous"` attribute. Without proper `Access-Control-Allow-Origin` headers from that Shoutcast server, `createMediaElementSource` either throws or returns silent zeros — and Shoutcast endpoints almost never set CORS for arbitrary origins. Adding `crossOrigin="anonymous"` could also break playback entirely if the server rejects the preflight.

**I will not build fake spectrum analysis.** Instead:

- **CSS-animated EQ bar cluster** (8–12 vertical bars with staggered keyframe heights) rendered next to the play button and in the "Stream Information" card.
- Bars **animate only while `playing === true`** (controlled by a class toggle); when paused/stopped they **freeze flat at ~10% height**. This makes the visual honestly tied to the one real signal we have: media element play state.
- Bars labeled visually as decorative (subtle, no axis labels, no "Hz" markings) — never implying real audio analysis.
- `prefers-reduced-motion`: bars hold a static stepped silhouette, no animation.

If the user later wires up a same-origin / CORS-enabled stream, swapping to a real `AnalyserNode` is a one-component change.

## Design tokens (added to `tailwind.config.ts` + `src/index.css`)

```
radio.bg     #0A1628   (deep navy night)
radio.blue   #4A90D9   (warm primary)
radio.amber  #FFB454   (dial-glow accent)
radio.ink    #14233B   (raised surface)
radio.mist   #B8C5D9   (muted text)
```

Font: import **Bitter** via `index.html` Google Fonts link; add `font-bitter` family to Tailwind. Headers only — body stays Inter.

Animation: `@keyframes radio-eq` (height bounce between 15% and 95%) with 8 stagger-delayed variants. `prefers-reduced-motion` media query halts it.

## Scope of files

1. `index.html` — add Bitter Google Fonts link.
2. `tailwind.config.ts` — add `radio.*` colors, `font-bitter`, `radio-eq` keyframes/animation.
3. `src/index.css` — `.radio-surface` scoping class + `prefers-reduced-motion` fallback for `radio-eq`.
4. `src/components/radio/RadioPage.tsx` — wrap in `radio-surface` background, Bitter title with amber-to-blue gradient, restyle tab list, quick-access buttons, badges, Stream Information card, Chat Guidelines card.
5. `src/components/radio/LiveStreamPlayer.tsx` — new `<EqBars playing={playing} />` inline component (declared in same file, ~25 lines), restyle Card with navy/blue palette and amber play button glow, replace listener Badge with amber dial chip.
6. `src/components/radio/MusicLibrary.tsx`, `PlaylistManager.tsx`, `ListenerInteractions.tsx` — restyle cards/headers/buttons to use radio palette + Bitter headers. No logic changes.

## Regression discipline

- The four restyled components are imported **only** by `RadioPage.tsx` (verified via ripgrep). Other radio surfaces use `DJMusicLibrary`, `DJPlaylistManager`, `PublicMusicLibrary` — untouched.
- All new tokens are namespaced under `radio.*` — no global token mutation. Classroom / SkillDrop / Training / ChatApp unaffected.
- New EQ visual is a local component in `LiveStreamPlayer.tsx` — no shared-component prop additions needed this round.
- `tsgo --noEmit` after the pass.

## Verification

- `tsgo --noEmit` clean.
- Visual spot-check `/radio`: navy background, Bitter title, amber play button, EQ bars animate on play / freeze on pause.
- Spot-check `/grove-station` and `/radio-management` unchanged (they use different components).

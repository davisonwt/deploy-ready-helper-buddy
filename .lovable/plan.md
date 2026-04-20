

## Hide redundant top nav on Let It Rain pages

### What you're seeing
When Julia (or anyone) clicks **Let It Rain → Tithing** from the dashboard, the Tithing page opens wrapped in the **old `<Layout>` chrome**, which paints a horizontal pill row at the top:

`Back · sow2grow · dashboard · chatapp · s2g memry · 364yhvh · My Garden · Let It Rain · gosat's`

That row duplicates the navigation that already lives in the new app sidebar / Let It Rain panel. On the Tithing flow it adds visual noise and lets users wander away mid-payment.

### Goal
Strip the duplicate nav from the four "Let It Rain" destinations so users stay focused on giving:

- `/tithing` (and `/tithing-2`)
- `/free-will-gifting`
- `/364yhvh-orchards`
- `/support-us`

Keep only a small **Back** affordance and the sow2grow logo (so they can still escape).

### Approach (safe, isolated — does NOT touch other pages)

1. **Add a `minimal` prop to `src/components/Layout.jsx`**
   - Default `minimal={false}` → existing behaviour everywhere else stays 100% identical.
   - When `minimal={true}` the header renders only:
     - `<BackButton />`
     - sow2grow logo + tagline
     - basket icon (small, top-right) so users can still reach checkout
   - The desktop nav buttons (`dashboard / chatapp / s2g memry / 364yhvh / My Garden / Let It Rain / gosat's`) and the mobile hamburger sheet are skipped in minimal mode.
   - All side panels (`MyGardenPanel`, `LetItRainPanel`, `GosatPanel`, `YHVHDaysPanel`) are also skipped — nothing to open from this header.

2. **Pass `minimal` on the four Let It Rain routes in `src/App.tsx`**
   ```tsx
   <Layout minimal>
     <TithingPage />
   </Layout>
   ```
   Applied to: `/tithing`, `/tithing-2`, `/free-will-gifting`, `/364yhvh-orchards`, `/support-us`.

3. **Leave everything else untouched** — `MarketingVideosPage`, `MyS2GTribePage`, `BrowseOrchardsPage`, `TribalHearts`, `EnochianCalendarDesignPage`, etc. continue to render the full Layout header exactly as today.

### Why this won't break anything
- `Layout` is only modified additively (one optional prop with a safe default).
- Routes not opted in keep the legacy header verbatim.
- The pages themselves (`TithingPage.jsx`, etc.) are not touched — their PayPal/basket flow is unaffected.
- Back navigation, sow2grow logo, and basket access are preserved on the minimal pages, so no user can get stuck.

### Files that will change
- `src/components/Layout.jsx` — add `minimal` prop and conditional render of the nav block.
- `src/App.tsx` — add `minimal` to the 5 Let It Rain route wrappers listed above.

### After approval
You can ask Julia to refresh and try Tithing again — she'll see a clean focused page (just Back · sow2grow · basket) and the form, with no navigation distractions on the way to PayPal.


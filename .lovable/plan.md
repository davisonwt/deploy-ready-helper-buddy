# Investigation — My Garden books/videos showing 0

Read-only. No changes.

## 1. JSX bindings in MyOrchardsPage — VERIFIED CORRECT

The Books / Videos / Music sections in `MyOrchardsPage.jsx` **are** wired to the `useMyContent` hook. No leftover local state, no divergent query.

`MyOrchardsPage.jsx:58-65` — destructured straight from the hook:
```jsx
const {
  seeds: mySeeds,
  music: myMusic,
  books: myBooks,
  videos: myVideos,
  orchards: myOrchards,
  refetch: fetchAllMyContent,
} = useMyContent(user?.id)
```

`MyOrchardsPage.jsx:147-149` — card arrays built from those hook values:
```jsx
const musicCards = myMusic.map(m  => buildMusicCard(m, ownerHandlers))
const bookCards  = myBooks.map(b  => buildBookCard(b, ownerHandlers))
const videoCards = myVideos.map(v => buildVideoCard(v, ownerHandlers))
```

`MyOrchardsPage.jsx:327-332` — sections render those exact arrays:
```jsx
<MyGardenSection title="Music"  cards={musicCards} emptyHint="No tracks yet…" />
<MyGardenSection title="Books"  cards={bookCards}  emptyHint="No books yet…" />
<MyGardenSection title="Videos" cards={videoCards} emptyHint="No videos yet…" />
```

Dashboard does the exact same thing — only difference is it mirrors `myContent.books` / `myContent.videos` into local state via `useEffect` (`DashboardPage.jsx:401-402`) before mapping. Same hook, same import path (`@/api/sowerContent`), same `user?.id`.

`MyGardenSection.jsx` shows the count from `cards.length` and renders the empty-hint when 0. So "0 / no books yet" means `bookCards` really is length 0 at render time.

**Verdict:** the JSX is not the bug. If Dashboard shows the items and My Garden doesn't with the same hook + same `user.id`, the data array can't legitimately differ between the two pages.

## 2. Hook's data path — books and videos

`sowerContent.ts:142-203` (`useMyContent`):

- **Books** = union of `sower_books` rows where `user_id = userId` (L145-147, current user only — **not** linked-account scoped) ∪ books surfaced by the `get_my_dashboard_content` RPC (where bulk-uploaded `products` of type `ebook`/`book` appear, scoped across linked accounts).
- **Videos** = `community_videos` rows where `uploader_id = userId` only (L148-150). **No RPC union, no linked-account scoping.**

Real DB rows confirmed:
- `sower_books` newest row: `title="from skin to light"`, `user_id=04754d57-d41d-4ea7-93df-542047a6785b`, `sower_id=a69d6147-…`
- `community_videos` newest rows: 5 broadcasts owned by `uploader_id=110b5a23-ce07-45c8-a432-086550aa78b5`

The rows exist. Whether they belong to the currently-signed-in `user.id` is the question — I can't read `auth.uid()` from outside the session.

## 3. Where the real divergence could be hiding

Given the JSX is correct and the hook is shared, the only ways Dashboard can show items that My Garden doesn't are:

a) **One of the queries inside `useMyContent` is throwing on this session**, the whole Promise.all rejects, the `catch` block runs, and `setData` is never called — books/videos stay at the initial `EMPTY` arrays. Dashboard would then *also* show empty… unless Dashboard had previously succeeded and the local-state `useEffect` is still holding the old populated array (Dashboard mirrors into local state; MyOrchards reads live from the hook each render).

b) **The book/video rows belong to a linked account, not the signed-in `user.id`.** The RPC union would surface them on both pages — *only* if the items live in `products` (bulk path). Single-uploaded `sower_books`/`community_videos` rows owned by a linked account are invisible to `useMyContent`'s direct queries on both pages.

c) **Founder saw the books/videos on Dashboard via a different code path** (e.g. an earlier sower-books-specific component) and not via `myContent.books`/`myContent.videos`. Worth double-checking before assuming Dashboard truly reflects the same hook output.

## What I need to confirm the actual cause (no code changes yet)

Either:
1. Have the founder open My Garden with the browser console open and paste any `[useMyContent]` warning/error lines (the hook logs RPC failures at `sowerContent.ts:155-156` and a catch-all at L205).
2. Or tell me the signed-in user's `user.id` and which uploads they expect to see, so I can verify the rows actually match that id and that RLS lets that session read them.

Once we know whether it's case (a), (b), or (c), the fix is one of:
- (a) Make the Promise.all tolerant — partial failures shouldn't blank the whole payload.
- (b) Scope the direct `sower_books`/`community_videos` queries through linked-account ids the same way the RPC does.
- (c) Audit Dashboard's render path for a stray legacy fetch that's masking the real bug.

Awaiting your direction before touching code.

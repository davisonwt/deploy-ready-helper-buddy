
## Answer to your question
"Tell me where the radio Go Live button lives…" — yes, that was a question to you, but ignore it. I'll just turn on the radio music dropdown automatically wherever a host opens a live session whose seed type is `RADIO` / `radio_station` (`isRadio` flag already plumbed). No action needed from you.

---

## What I'll build

### 1. Invitation codes actually bind new sign-ups to the inviter's tribe

**Problem:** the share link does carry `?ref=CODE`, but `RegisterPage.jsx` and `useAuth.register` never read it, so no `referrals` row is ever written — that's why `referrals` is empty and nobody appears in anyone's tribe.

**Fix:**
- On `RegisterPage` mount (and `QuickRegistration`), read `?ref=` from `window.location.search` AND from `localStorage` (set by a tiny `useReferralCapture` hook on the public landing/register routes so the code survives the OAuth/email-confirm bounce).
- Pass `referral_code` into `supabase.auth.signUp({ options: { data: { referral_code } } })` so it lands in `raw_user_meta_data`.
- Update the `handle_new_user` trigger (or add a sibling trigger) to:
  1. Look up `affiliates.id` by `referral_code` from `raw_user_meta_data`.
  2. Insert into `public.referrals (referrer_id, referred_id, status, commission_rate)` with `status='active'`.
  3. Bump `affiliates.total_referrals`.
- Add a SECURITY DEFINER RPC `claim_referral_code(code text)` so an already-registered user (Bianca, Ernie, Vickee, etc.) can self-attach if the trigger missed them.

### 2. Backfill the existing tribe links (one-time SQL migration)

Davison Taljaard = `04754d57-d41d-4ea7-93df-542047a6785b`. He has no `affiliates` row yet — create one first.

```text
Davison (root)
├── every existing user EXCEPT Bianca/Ernie/Vickee → referrals(referrer=Davison)
└── Bianca Liebenberg (b19c9972…) → referrals(referrer=Davison)
    ├── Ernie Matthews (4dfc2eb7…) → referrals(referrer=Bianca)
    └── Vickee Fleetwood (bdb3153f…) → referrals(referrer=Bianca)
```

Skip the 4 founders (Davison/Ed/Amber/Ezra) and any user who already has a referrer.

### 3. Dashboard widgets — Tribe size, Wallet bestowals, Unread messages

Add a 3-tile strip at the top of `DashboardPage.jsx` (above SeedFlow), each tile clickable:

| Tile | Source | Click → |
|---|---|---|
| **My Tribe** — count of `referrals` where `referrer_id = my_affiliate.id` + 3 newest member avatars | `referrals` + `profiles` | `/my-tribe` |
| **Bestowals received** — sum of `bestowals.amount_usdc` where `recipient_id = me`, plus last 3 bestowal notes | `bestowals` / `product_bestowals` | `/wallet` |
| **Unread messages** — count of `chat_messages` in my rooms where `created_at > my last_read_at` | `chat_messages` + `chat_room_members` | `/chatapp?filter=unread` |

Real-time refresh via Supabase Realtime on `referrals`, `bestowals`, `chat_messages`.

### 4. Fix unreadable Admin heading (Image 2)

`AdminDashboardPage.jsx` line 353 uses `bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 bg-clip-text text-transparent` — on the deep-navy admin background the text is washed out. Switch to solid `text-cyan-100` with a subtle text-shadow (or brighten the gradient stops to `cyan-200/sky-100/violet-200` and add `drop-shadow`). Same treatment for the subtitle.

---

## Technical details

**Migration 1 — referral capture trigger update**
```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  v_code text := new.raw_user_meta_data->>'referral_code';
  v_ref_aff uuid;
begin
  -- existing profile/affiliate creation stays
  if v_code is not null then
    select id into v_ref_aff from affiliates where referral_code = v_code;
    if v_ref_aff is not null then
      insert into referrals(referrer_id, referred_id, status, commission_rate)
      values (v_ref_aff, new.id, 'active', 10)
      on conflict do nothing;
      update affiliates set total_referrals = total_referrals + 1
        where id = v_ref_aff;
    end if;
  end if;
  return new;
end$$;
```

**Migration 2 — backfill**
```sql
-- 1. Ensure Davison has affiliates row
insert into affiliates(user_id, referral_code, commission_rate)
select '04754d57-d41d-4ea7-93df-542047a6785b','S2G-DAVISON',10
where not exists (select 1 from affiliates where user_id='04754d57-d41d-4ea7-93df-542047a6785b');

-- 2. Bianca → Davison; Ernie/Vickee → Bianca; everyone else → Davison
-- (script writes referrals + bumps total_referrals, skipping founders)
```

**Files touched**
- `supabase/migrations/<ts>_tribe_referral_binding.sql` (new)
- `src/hooks/useReferralCapture.ts` (new — reads `?ref`, stores in localStorage)
- `src/pages/RegisterPage.jsx`, `src/components/auth/QuickRegistration.tsx` — pass code to signUp
- `src/pages/DashboardPage.jsx` — top widgets row
- `src/components/dashboard/TribeStatTile.tsx`, `BestowalStatTile.tsx`, `UnreadStatTile.tsx` (new)
- `src/pages/AdminDashboardPage.jsx` — readable heading
- `src/pages/ChatappPage.jsx` — accept `?filter=unread`

No new tables; uses existing `affiliates`, `referrals`, `bestowals`, `chat_messages`.

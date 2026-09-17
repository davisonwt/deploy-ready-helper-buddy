# scripts/studio

One-off SQL and scripts run by hand against production, by the database owner.
Nothing in here runs automatically.

Two rules govern this folder. Both are in `CLAUDE.md` as well; they are
repeated here because this is where they get broken.

## 1. Snapshot member content before overwriting it

Before any script or migration that **overwrites or nulls a column holding
member-created content**, first write a snapshot of the affected rows into
this folder as an executable restore script, and give the user its full path.
No exceptions, no matter how small the change looks.

Member-created content is anything a member placed or typed themselves:

- `stalls.hotspots`, `stalls.tiles`, stall names, taglines, stories
- `wheel_seed_details`, `pillow_seed_details`, `hand_seed_details` and their
  rates, locations, photos and references
- profile fields, wandering-role fields

If you are unsure whether a column qualifies, it qualifies.

The restore script must run on its own, and must name the rows it restores
explicitly rather than re-deriving them from a `WHERE` clause that could match
a different set later.

A snapshot looks like this. Take it **before** the destructive statement, not
in the same file as an afterthought:

```sql
-- Restores stalls.hotspots for <member> as it stood on <date>, before
-- <the-script-that-changed-it>.sql ran.
UPDATE public.stalls
   SET hotspots = '[...the exact array...]'::jsonb
 WHERE id = '<stall uuid>';
```

**Why this rule exists.** On 2026-09-11 `use-template-interior.sql` set one
member's `stalls.hotspots` to NULL so his stall would inherit a shared
template's hotspots instead. The intent was reasonable and the change was one
statement. His own placements were unrecoverable, and he found out six days
later when he noticed the hotspots on his stall were not the ones he had
placed. A snapshot would have made it a one-line fix.

## 2. Every Studio query the user runs lives here

Do not print SQL into the terminal for the user to copy. Write it to a file in
this folder, commit it, and give the full absolute path. That way the query
that was actually run is recoverable later.

Read-only checks belong here too, not just writes.

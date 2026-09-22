# QA Wandering storage archive — 2026-09-22

**Archive path (outside the repo, never committed):**

    C:\Users\Ezra\S2G-backups\storage-archive\2026-09-22-qa-wandering

8 files plus `MANIFEST.json`, each with its sha256. The bytes were pulled
down and checksummed BEFORE the delete, per the Storage rule in CLAUDE.md:
database backups hold no Storage objects, so a deleted object is gone
forever unless its bytes were archived first.

## What was deleted, and why it was safe

These 8 objects belonged to the two QA `wandering_roles` rows removed in
579a06ed (`QA wheel tester`, `QA hand tester`, both davisontest1's). With
those rows gone nothing referenced the files. Verified per object against
`wandering_roles.photo_url`, `wandering_roles.gallery_urls` and
`memry_posts.media_url` / `thumbnail_url` -- all false before deleting.

The bucket is private, so the archive was fetched with the owning
account's own JWT rather than a public URL.

| file | bytes | sha256 |
|---|---|---|
| `1789514512752.jpg` | 47314 | `1d58f32f6ee85a0c668433a862002111` |
| `gallery-1789514514828-5xjoz.jpg` | 39923 | `d4b17e012dc499a168028a84a96d9315` |
| `gallery-1789514516855-qkrha.jpg` | 39923 | `d4b17e012dc499a168028a84a96d9315` |
| `gallery-1789514518879-a9j50.jpg` | 39923 | `d4b17e012dc499a168028a84a96d9315` |
| `1789661182978.jpg` | 47314 | `1d58f32f6ee85a0c668433a862002111` |
| `gallery-1789661186038-m6p4p.jpg` | 39923 | `d4b17e012dc499a168028a84a96d9315` |
| `gallery-1789661188582-rgyf4.jpg` | 39923 | `d4b17e012dc499a168028a84a96d9315` |
| `gallery-1789661191122-g8rxv.jpg` | 39923 | `d4b17e012dc499a168028a84a96d9315` |

All 8 sat under `premium-room/covers/de22c876-d477-4a5e-81a2-cd22091ce125/`.
Note the checksums: the two photos are byte-identical to each other and the
six gallery images are byte-identical to each other -- the QA seeder reused
the same two placeholder images throughout.

## Verified after

- the 8 objects: **0 remain**
- davisontest1's premium-room folder: 466 -> **458** objects

## Not actioned — the wider residue

That folder still holds **458 objects, about 20 MB**, almost all of it QA
seeding from 2026-09-13 to 2026-09-17. Only the 8 tied to the two deleted
rows were in scope here. Clearing the rest is a bigger destructive Storage
operation and needs its own archive, its own orphan check against every
table that can reference the bucket, and a decision -- it is flagged, not
assumed.

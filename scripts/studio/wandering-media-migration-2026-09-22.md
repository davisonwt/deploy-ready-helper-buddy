# Wandering media migration — premium-room → wandering — 2026-09-22

**25 objects across 4 rows.** Every copy verified byte-identical by sha256
BEFORE the originals were deleted. The verified copies in the public
`wandering` bucket are the live data; the local archive below is the
belt-and-braces copy required by the Storage rule in CLAUDE.md.

**Local archive:**

    C:\Users\Ezra\S2G-backups\storage-archive\2026-09-22-wandering-migration

## Why

Every `wandering_roles.photo_url` and gallery url lived in `premium-room`,
a PRIVATE bucket. In-app this was invisible because `SignedImg` re-signs
private URLs client-side. A link-preview crawler has no session, so
`api/wandering.ts` had to suppress `og:image` rather than advertise a URL
that 400s -- a shared door could never carry the member's own photo.

## Order of operations

1. `wandering` bucket created: public read, writes scoped to
   `auth.uid() = foldername(name)[1]` -- the same policy shape `stalls`
   uses. Path changed from `covers/<uid>/<file>` to `<uid>/<file>` so that
   policy applies unchanged.
2. Confirmed first, as specified: `parsePrivateStorageUrl` returns null for
   an allowlisted bucket, so `SignedImg` passes public URLs through
   untouched. `wandering` was added to that allowlist in the same commit --
   without it every URL would have taken a signing round trip and come back
   as `/object/sign/`, which expires.
3. All 25 originals downloaded and sha256'd.
4. Copies uploaded, then re-downloaded **through the public URL** and
   re-hashed: 25/25 byte-identical. That also proved public read works.
5. Rows rewritten. Verified: 0 rows still reference premium-room.
6. Page confirmed rendering all 9 of Chari's images from the new bucket,
   logged in AND logged out, 0 signed URLs, 0 broken.
7. Only then were the 25 originals deleted. Verified: 0 remain.

## Temporary policies, added and removed

Writes are owner-scoped, and I hold no session for chariwellnesspro. Two
short-lived policies were added and dropped in the same run, both gated on
`has_role(gosat|admin)` -- the same shape as the existing
`conv_exports_gosat_upload`:

- `TEMP migration 2026-09-22 gosat write wandering` (INSERT)
- `TEMP migration 2026-09-22 gosat delete premium-room` (DELETE)

Both confirmed dropped: 0 policies matching `TEMP migration%` remain. No
permanent widening of write access.

## Objects

| member | role | file | bytes | sha256 (full) | identical |
|---|---|---|---|---|---|
| chariwellnesspro | pillow | `1790008774337.jpg` | 377675 | `d7e9ead2003d15d6190847c694b2670b8c8d05be36f79e12300246469bfc8ee3` | yes |
| chariwellnesspro | pillow | `gallery-1790008843592-truk7.png` | 5880340 | `58233c146617c42dbfd2cce6c001d3c9346effccfbb4e6b74fdd0d2833a4f216` | yes |
| chariwellnesspro | pillow | `gallery-1790008906053-30tka.jpg` | 215897 | `e40192f9fecfd9533c53baecbb203a562e7b19d512937a71a368d3f237a2fb4c` | yes |
| chariwellnesspro | pillow | `gallery-1790008936882-izelf.png` | 8994796 | `f000ee4e953c90eacd12219c79633c08e6e226d3ca6034f9dbf8157404187a88` | yes |
| chariwellnesspro | pillow | `gallery-1790009014252-cn2xm.jpg` | 258663 | `1c9b2fa2430f0e4bf6881779776f4d59a9cc243d842fe815c0c61441ecf308c2` | yes |
| chariwellnesspro | pillow | `gallery-1790009042383-xj6hy.jpg` | 269066 | `184c66f83665cf16d886bab3f483b84335289f01f2d198ce9c465d391245b9bf` | yes |
| chariwellnesspro | pillow | `gallery-1790009087409-t0ckk.jpg` | 227420 | `7b99ea0e0eef1e405cca68ac21516f017acc5320aeae76c2385c58bb63d58896` | yes |
| chariwellnesspro | pillow | `gallery-1790009145291-ktq0g.jpg` | 137277 | `e7d5e7bb257578f326638533522ee45c1d7908a9a208863eee2c0724ae3868fe` | yes |
| chariwellnesspro | pillow | `gallery-1790009196674-s9qxy.jpg` | 487553 | `789c40d8d069b3848afb14669f1a99b29782369ca7855bf2d7beb823037affd6` | yes |
| davison.taljaard | hand | `1789623233814.jpg` | 139989 | `ab29b217bb23e323c3ea07789c438806538651894436110491e9b13e9a4aca18` | yes |
| davison.taljaard | hand | `gallery-1789623263594-90gre.jpg` | 106311 | `8873ae61fa1b28c39d3bc30d29fd836294a15209ef56e2dd8452c809709f0c7d` | yes |
| davison.taljaard | hand | `gallery-1789623271748-jn5uv.jpg` | 124711 | `b8b2a012a2c4233d4f6aeb482c591bdbca8693d2785266ed6fb0ed7431aa842f` | yes |
| davison.taljaard | hand | `gallery-1789623281225-le7gv.jpg` | 68545 | `077e6b40e29edc4f7892e000baf9fb927715965d9d9d9de40593edca5a675f98` | yes |
| davison.taljaard | hand | `gallery-1789623289469-zn5ck.jpg` | 118606 | `a51838e23f376b37c5bbd6352aa9dff99d762fee98e39050693b6f6c83366bc1` | yes |
| davison.taljaard | pillow | `1789620078576.jpg` | 295497 | `4a6e7a043f83f81bcf3ea5179664548cee1ce6aa2f416e3e99e87eb345a7d1b4` | yes |
| davison.taljaard | pillow | `gallery-1789619908727-shtaj.jpg` | 82672 | `5d1e342b4b3cb5659de440dd15c9d7b6ecee3887c63a54c6129dd47abb0f66d0` | yes |
| davison.taljaard | pillow | `gallery-1789619933581-s1r4k.jpg` | 192473 | `2cd4e41562937a4dfd980e9b61c1b3a1bc872645a9a072b50df6af5eeb27a098` | yes |
| davison.taljaard | pillow | `gallery-1789619944140-1vs02.jpg` | 56538 | `81d55a2f14ce39564ec4bfa029dc9215993df436f72812cce00fbb90a6361e1a` | yes |
| davison.taljaard | pillow | `gallery-1789619957740-f1g6k.jpg` | 32948 | `33b2d7b153a6bd07e04352c1ec8d57e01d81af42023632c481134661f82705b9` | yes |
| davison.taljaard | pillow | `gallery-1789619969126-9zg3g.jpg` | 30287 | `c1251e1ef0444a3a177076cfd7f11981866192ae6b082a5c0c4313b61a58e758` | yes |
| davison.taljaard | pillow | `gallery-1789619976960-phyet.jpg` | 29525 | `bce38be2ddc60b02a3640630fcbc7e39922bb70f7561a6c5a1a97d25660b50f3` | yes |
| davison.taljaard | wheel | `1789577424019.jpg` | 107173 | `8cf0cebb1dc42b0ef17414b587a580183f1db0b5d6a84e9d75eff23673f94de0` | yes |
| davison.taljaard | wheel | `gallery-1789577480667-zsg08.jpg` | 154231 | `38c01877bed6daefd9cf713dd6b43c8ac70885e6820570f62aa5f137886cd335` | yes |
| davison.taljaard | wheel | `gallery-1789577503859-33fa4.jpg` | 154231 | `38c01877bed6daefd9cf713dd6b43c8ac70885e6820570f62aa5f137886cd335` | yes |
| davison.taljaard | wheel | `gallery-1789577523844-q3oen.jpg` | 154231 | `38c01877bed6daefd9cf713dd6b43c8ac70885e6820570f62aa5f137886cd335` | yes |

## Verified after

- `wandering` bucket: **25 objects, 18 MB**
- premium-room originals: **0 remain**
- rows referencing premium-room: **0**
- member page: 9/9 images load from `/object/public/wandering/`, 0 signed,
  0 broken, logged in and logged out
- door preview og:image: **200, image/jpeg, 80,186 bytes, decoded 1200x630**
- stall preview unregressed: **200, image/jpeg, 176,397 bytes**

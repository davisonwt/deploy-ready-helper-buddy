# Gathering files under the two test accounts — manifest, 2026-09-21

Written BEFORE any deletion, per the snapshot golden rule in CLAUDE.md.

**Storage bytes are not recoverable from this file.** It records exactly which
objects existed, their size and their reference status at the moment of the
audit, so a deletion can be audited afterwards — it is not a restore script,
because the object bytes live in S3 and nothing in SQL can put them back.

## What "orphan" means here

Two columns in the database mention a `/gathering/` path:

- `media_moderation.object_path` — 77 rows, one per upload. This is the
  moderation audit log; every object ever uploaded has a row, so it says
  nothing about whether a file is still in use.
- `gathering_sessions.board_state` — 16 rows. This IS the live reference: the
  board still shows the file.

An object is an orphan here only when no `gathering_sessions.board_state`
mentions it.

## Correction to the premise

The task described davisontest1 as having 49 orphaned PDFs. It has 49 files,
but only 36 are orphans — 13 are still referenced by live
`gathering_sessions.board_state` rows. Deleting all 49 would have broken those.

## Counts

| account | total | referenced (KEEP) | orphan (delete) |
|---|---|---|---|
| davisontest1 | 49 | 13 | 36 |
| davisontest2 | 3 | 0 | 3 |

Not in scope, left untouched (real members, not test accounts):
`davison.taljaard` 23 files / 20 orphan, `primitivevsns` 1 / 1, `infoclayroses` 1 / 1.

## Referenced — MUST NOT be deleted

- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789384536510.pdf` (1100 bytes, 2026-09-14 11:15:36.839819+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789384629058.pdf` (1100 bytes, 2026-09-14 11:17:09.377878+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789384732591.pdf` (1100 bytes, 2026-09-14 11:18:52.868435+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789384827450.pdf` (1100 bytes, 2026-09-14 11:20:27.728214+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789391663319.pdf` (1100 bytes, 2026-09-14 13:14:23.606966+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789410601724.pdf` (1100 bytes, 2026-09-14 18:30:02.670564+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789415727072.pdf` (1100 bytes, 2026-09-14 19:55:27.382545+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789416438404.pdf` (1100 bytes, 2026-09-14 20:07:18.712607+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789417029369.pdf` (1100 bytes, 2026-09-14 20:17:09.645527+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789417493007.pdf` (1100 bytes, 2026-09-14 20:24:52.835417+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789418881781.pdf` (1100 bytes, 2026-09-14 20:48:02.182617+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789420496243.pdf` (1100 bytes, 2026-09-14 21:14:56.089206+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789422364996.pdf` (1100 bytes, 2026-09-14 21:46:04.868584+00)

## Orphans — safe to delete

- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789305190414.pdf` (289 bytes, 2026-09-13 13:13:10.704413+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789305228682.pdf` (289 bytes, 2026-09-13 13:13:48.957822+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789305530122.pdf` (289 bytes, 2026-09-13 13:18:50.396557+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789305805347.pdf` (289 bytes, 2026-09-13 13:23:25.659013+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789307225334.pdf` (289 bytes, 2026-09-13 13:47:05.660669+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789307446899.pdf` (289 bytes, 2026-09-13 13:50:47.171217+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789307647059.pdf` (289 bytes, 2026-09-13 13:54:07.376266+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789307815441.pdf` (289 bytes, 2026-09-13 13:56:55.735976+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789307989556.pdf` (289 bytes, 2026-09-13 13:59:49.849931+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789308336002.pdf` (289 bytes, 2026-09-13 14:05:36.755614+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789308653970.pdf` (289 bytes, 2026-09-13 14:10:55.159673+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789309038938.pdf` (289 bytes, 2026-09-13 14:17:19.682195+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789309161219.pdf` (289 bytes, 2026-09-13 14:19:21.498176+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789309340232.pdf` (289 bytes, 2026-09-13 14:22:20.996509+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789331799739.pdf` (241480 bytes, 2026-09-13 20:36:41.136938+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789332101942.pdf` (241480 bytes, 2026-09-13 20:41:42.930623+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789332460998.pdf` (241480 bytes, 2026-09-13 20:47:41.909924+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789332548160.pdf` (241480 bytes, 2026-09-13 20:49:09.557508+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789332615231.pdf` (241480 bytes, 2026-09-13 20:50:16.120396+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789334133203.pdf` (241480 bytes, 2026-09-13 21:15:34.005249+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789334369465.pdf` (241480 bytes, 2026-09-13 21:19:30.353143+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789334407442.pdf` (241480 bytes, 2026-09-13 21:20:08.084278+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789374386969.pdf` (241480 bytes, 2026-09-14 08:26:27.775089+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789374515778.pdf` (241480 bytes, 2026-09-14 08:28:37.151656+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789377042254.pdf` (241480 bytes, 2026-09-14 09:10:43.378223+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789377143185.pdf` (241480 bytes, 2026-09-14 09:12:24.017602+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789377224616.pdf` (241480 bytes, 2026-09-14 09:13:45.550992+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789377397162.pdf` (241480 bytes, 2026-09-14 09:16:38.369155+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789377931533.pdf` (241480 bytes, 2026-09-14 09:25:32.461121+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789378102472.pdf` (241480 bytes, 2026-09-14 09:28:23.477101+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789378268650.pdf` (241480 bytes, 2026-09-14 09:31:09.20461+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789381419284.pdf` (1100 bytes, 2026-09-14 10:23:39.585321+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789381515286.pdf` (1100 bytes, 2026-09-14 10:25:16.029099+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789381685937.pdf` (1100 bytes, 2026-09-14 10:28:06.202662+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789382186666.pdf` (1100 bytes, 2026-09-14 10:36:26.967509+00)
- `de22c876-d477-4a5e-81a2-cd22091ce125/gathering/1789383567639.pdf` (1100 bytes, 2026-09-14 10:59:27.910715+00)
- `a8872ed5-951c-4343-ba05-d4921af18eb2/gathering/voicenote-1789309108685.webm` (716898 bytes, 2026-09-13 14:18:30.511314+00)
- `a8872ed5-951c-4343-ba05-d4921af18eb2/gathering/voicenote-1789309230843.webm` (715932 bytes, 2026-09-13 14:20:32.645728+00)
- `a8872ed5-951c-4343-ba05-d4921af18eb2/gathering/voicenote-1789309406908.webm` (717850 bytes, 2026-09-13 14:23:28.69328+00)

## The query that decided this

```sql
select o.name,
  exists(select 1 from public.gathering_sessions s
         where s.board_state::text like '%'||o.name||'%') as referenced
from storage.objects o
where o.bucket_id='stalls' and o.name like '%/gathering/%';
```

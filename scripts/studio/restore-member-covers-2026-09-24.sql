-- SNAPSHOT + RESTORE: member cover images, captured 2026-09-24 BEFORE
-- repointing them off Lovable's dead asset route.
--
-- 32 rows -- 7 products and 25 dj_music_tracks -- held a
-- cover_image_url of the form /__l5e/assets-v1/<id>/<file>. That route is
-- served by Lovable's preview host and NOT by Vercel, which serves
-- production, so every one of these covers renders broken for the member
-- who owns it and for everyone browsing.
--
-- This is MEMBER CONTENT: covers on seeds and tracks these people sowed.
-- Re-running this file restores every cover_image_url exactly as it was,
-- by id, named explicitly -- never by a WHERE that could match differently
-- later.
--
-- The image BYTES are archived separately, with sha256s, at
--   C:\Users\Ezra\S2G-backups\storage-archive\lovable-db-covers-2026-09-24\
-- Restoring these URLs alone points back at a route that serves nothing,
-- so this file undoes the ROW change only. The bytes come from there.

update public.products t
   set cover_image_url = v.cover_image_url
  from (values
  ('866a8dbc-4f72-4b1a-99c9-63db1f781411'::uuid, '/__l5e/assets-v1/8c920678-c0c4-4c01-a107-3926f279cda2/be-your-ori-cover.png')  -- davison.taljaard: be your ori,
  ('5895c8ee-7cd3-4679-9ac8-91b959da8b86'::uuid, '/__l5e/assets-v1/e812f351-da86-4f2f-9742-77186ebea7f9/because-of-you-cover.png')  -- davison.taljaard: because of you,
  ('515fd1ea-69d5-41d9-bbe7-37bc71c9c637'::uuid, '/__l5e/assets-v1/7232d3bd-8a93-4f8d-9a8f-b6f8a238acae/cover-39ac20b5-cb1b-4d34-bce0-935a313f6da8.png')  -- davison.taljaard: blessed is he (song of deliverance),
  ('2ff1f04d-295d-4b73-abe4-2bf8209b8e42'::uuid, '/__l5e/assets-v1/4c2fed8c-7272-4fe1-9290-41b43dd7a122/davison-album-1-cover.png')  -- davison.taljaard: davison album 1,
  ('9af96ac8-9029-43db-8a5b-78ba1369915c'::uuid, '/__l5e/assets-v1/79a8b712-6713-4560-bafb-8ed3278973d7/7fe0fb45-316d-46dd-b83c-e135c1162498.png')  -- davison.taljaard: the true fast,
  ('82a2f784-fdf8-4f61-9401-bdb789b2882e'::uuid, '/__l5e/assets-v1/7c9ccaf1-34a6-40c7-87c7-b4465a5a593d/you-i-him-cover.png')  -- davison.taljaard: you, i, him,
  ('61174bb8-4ff9-4fbd-8c78-787bc582dae6'::uuid, '/__l5e/assets-v1/256edf88-69cc-45f4-a213-97b0ed42b39c/cover-3a5fe2da-df88-40f3-b90b-e0f3bfd03ee4.png')  -- davison.taljaard: your spirit is calling
) as v(id, cover_image_url)
 where t.id = v.id;

update public.dj_music_tracks t
   set cover_image_url = v.cover_image_url
  from (values
  ('14dafd18-7739-4711-a4c9-9d08055879a9'::uuid, '/__l5e/assets-v1/1747f547-fbd6-444d-b8b2-02bd337d99e8/tale_of_beginnings_spring.jpg')  -- davison.taljaard: a tale of beginnings - spring,
  ('9ad7b1ea-9355-4e6c-adce-3006466c8552'::uuid, '/__l5e/assets-v1/ab05fe5d-f6e5-4f28-9540-4c5fdad62e64/back_to_a_beginning.jpg')  -- davison.taljaard: back to a beginning,
  ('1dc1ac8d-cb0b-4cf9-851b-7bcac8d17357'::uuid, '/__l5e/assets-v1/8c920678-c0c4-4c01-a107-3926f279cda2/be-your-ori-cover.png')  -- davison.taljaard: be your ori,
  ('f5933d87-b2fc-4479-a118-3201092b0bb0'::uuid, '/__l5e/assets-v1/7e066c8e-0159-49ab-a11a-98b5220d4d73/cover-f5933d87-b2fc-4479-a118-3201092b0bb0.png')  -- davison.taljaard: because of you 1a ,
  ('39ac20b5-cb1b-4d34-bce0-935a313f6da8'::uuid, '/__l5e/assets-v1/7232d3bd-8a93-4f8d-9a8f-b6f8a238acae/cover-39ac20b5-cb1b-4d34-bce0-935a313f6da8.png')  -- davison.taljaard: Blessed is He (Song of Deliverance),
  ('309478b1-fb48-45a0-96f5-4418ee326425'::uuid, '/__l5e/assets-v1/96305cd0-e369-4de0-8ef3-eabc510cff84/cover-309478b1-fb48-45a0-96f5-4418ee326425.png')  -- davison.taljaard: Breath of Life (An Everlasting Romance),
  ('e2f4dd22-ff4f-4166-b6a3-4fc60e49f971'::uuid, '/__l5e/assets-v1/0db491b4-2b74-40ed-9b57-c2ed84e5cc15/cover-e2f4dd22-ff4f-4166-b6a3-4fc60e49f971.png')  -- davison.taljaard: he did not come to take the blame,
  ('5f6637b7-99eb-46fb-b70e-f6bede635fca'::uuid, '/__l5e/assets-v1/4347350c-b646-4240-a97a-c0cb6a24c1f7/how_does_a_day_start.jpg')  -- davison.taljaard: how does a day start,
  ('171a4468-04ba-4285-948a-1fe0fa752dd9'::uuid, '/__l5e/assets-v1/fc05f0c0-4444-4a2a-8715-ce7476b517a0/cover-171a4468-04ba-4285-948a-1fe0fa752dd9.png')  -- davison.taljaard: i tasted forever,
  ('e279fc8b-9a88-4079-a1c2-1e2e95231579'::uuid, '/__l5e/assets-v1/123af697-70ee-46cb-957d-db6b17751c72/cover-e279fc8b-9a88-4079-a1c2-1e2e95231579.png')  -- davison.taljaard: intimacy ,
  ('e9c0d414-f422-4961-9240-c96aff8ca5e8'::uuid, '/__l5e/assets-v1/612d8260-0014-4f52-879d-0400843027a2/jewels_in_the_mud.jpg')  -- davison.taljaard: jewels in the mud,
  ('e2796176-dcfc-4519-b1f1-c92858f4f247'::uuid, '/__l5e/assets-v1/3d28f175-9a20-42e1-b906-ae7f30d040e8/cover-e2796176-dcfc-4519-b1f1-c92858f4f247.png')  -- davison.taljaard: jy, ek, hy,
  ('b02392be-62f8-48a6-ab38-7779697997c1'::uuid, '/__l5e/assets-v1/75f32650-d14f-4efb-9330-5b3e15328143/life.jpg')  -- davison.taljaard: life,
  ('71fd4999-c3ca-4a16-9023-544940deae7c'::uuid, '/__l5e/assets-v1/e5875d09-2c63-4a92-91eb-be84247a33be/cover-71fd4999-c3ca-4a16-9023-544940deae7c.png')  -- davison.taljaard: man formed from 7 elements,
  ('bde5d645-6b60-4e0c-b5e8-4a45ca59460e'::uuid, '/__l5e/assets-v1/118f1f50-3652-499d-a2bf-65c0595182ad/cover-bde5d645-6b60-4e0c-b5e8-4a45ca59460e.png')  -- davison.taljaard: rice above the shadow,
  ('dfaacd99-faf3-40ec-a34a-315ef7aec4a5'::uuid, '/__l5e/assets-v1/0225044d-c1dc-4f07-b13b-ca7794dd6ac1/cover-dfaacd99-faf3-40ec-a34a-315ef7aec4a5.png')  -- davison.taljaard: riding on the hope of being free,
  ('d30fd8ca-e5bc-461d-8b51-8573ab1e72fb'::uuid, '/__l5e/assets-v1/a73357b5-0c5c-45db-8cda-701c0867ca15/cover-d30fd8ca-e5bc-461d-8b51-8573ab1e72fb.png')  -- davison.taljaard: The shadows dance,
  ('7fe0fb45-316d-46dd-b83c-e135c1162498'::uuid, '/__l5e/assets-v1/ccfdb0eb-135d-43fb-809a-eb152e255ccf/true_fast.jpg')  -- davison.taljaard: The true fast,
  ('06175d9b-6b38-4d79-beb0-1f38ddfe8ffa'::uuid, '/__l5e/assets-v1/e0fdf68d-1733-4441-ad4c-947d73731c48/the_word.jpg')  -- davison.taljaard: the word,
  ('442a9487-bcab-4dd9-b976-efeb0941c028'::uuid, '/__l5e/assets-v1/9b5d5be2-a134-46b0-b9be-256d43e0dbda/cover-442a9487-bcab-4dd9-b976-efeb0941c028.png')  -- davison.taljaard: What Is the Soul,
  ('3a381c4e-19f1-4bbc-bbbb-922f55760ab2'::uuid, '/__l5e/assets-v1/6fb5699f-8890-4cf2-a464-b81b3b3e4279/written_in_sand.jpg')  -- davison.taljaard: what was written in the sand,
  ('3746896b-9ac6-4106-af50-ab3df5783deb'::uuid, '/__l5e/assets-v1/7c9ccaf1-34a6-40c7-87c7-b4465a5a593d/you-i-him-cover.png')  -- davison.taljaard: you i him,
  ('32de770d-635a-4337-b6e7-1ba1904be83c'::uuid, '/__l5e/assets-v1/b004c2c2-d8c4-4629-8d8b-22a41e3a9e09/you_know_me.jpg')  -- davison.taljaard: You Know Me” (Inspired by Psalm 139),
  ('4b98d52a-5386-463b-89b2-123453c8a3cd'::uuid, '/__l5e/assets-v1/5d4f81fa-ee5d-4019-9273-7956c8e0dd8c/cover-4b98d52a-5386-463b-89b2-123453c8a3cd.png')  -- davison.taljaard: you, you i love version 2,
  ('3a5fe2da-df88-40f3-b90b-e0f3bfd03ee4'::uuid, '/__l5e/assets-v1/256edf88-69cc-45f4-a213-97b0ed42b39c/cover-3a5fe2da-df88-40f3-b90b-e0f3bfd03ee4.png')  -- davison.taljaard: your spirit is calling
) as v(id, cover_image_url)
 where t.id = v.id;


-- ---------------------------------------------------------------------
-- SECOND PASS, same day: the columns the first sweep did not cover.
-- products.image_urls (4 rows) and radio_djs.avatar_url (1 row) also held
-- /__l5e/ paths. The products ones matter more than they look: four of
-- the seven products above ALSO had image_urls[0] pointing at the dead
-- route, and MusicLibraryPage prefers image_urls[0] over cover_image_url
-- once the old '/__l5e/' special case is removed -- so leaving these
-- would have turned four working covers back into broken ones.
update public.products p
   set image_urls = v.image_urls
  from (values
  ('2ff1f04d-295d-4b73-abe4-2bf8209b8e42'::uuid, '{"/__l5e/assets-v1/4c2fed8c-7272-4fe1-9290-41b43dd7a122/davison-album-1-cover.png"}'::text[])  -- davison album 1,
  ('82a2f784-fdf8-4f61-9401-bdb789b2882e'::uuid, '{"/__l5e/assets-v1/7c9ccaf1-34a6-40c7-87c7-b4465a5a593d/you-i-him-cover.png"}'::text[])  -- you, i, him,
  ('866a8dbc-4f72-4b1a-99c9-63db1f781411'::uuid, '{"/__l5e/assets-v1/8c920678-c0c4-4c01-a107-3926f279cda2/be-your-ori-cover.png"}'::text[])  -- be your ori,
  ('5895c8ee-7cd3-4679-9ac8-91b959da8b86'::uuid, '{"/__l5e/assets-v1/e812f351-da86-4f2f-9742-77186ebea7f9/because-of-you-cover.png"}'::text[])  -- because of you
) as v(id, image_urls)
 where p.id = v.id;

-- radio_djs.avatar_url is NOT in this file, deliberately. The column-wide
-- sweep flagged one row, but that value is a base64 data: URI whose
-- payload happens to contain the characters "__l5e". It was never a
-- Lovable URL and nothing about it was changed. A LIKE '%__l5e%' over
-- image columns matches base64 noise; the real test is LIKE '/__l5e/%'.

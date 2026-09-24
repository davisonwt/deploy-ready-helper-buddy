-- SNAPSHOT + RESTORE: curated_calendar_photos public_url / storage_path,
-- captured 2026-09-24 BEFORE repointing them off Lovable's dead asset route.
--
-- All 48 rows held a /__l5e/assets-v1/... public_url. That route is served
-- by Lovable's preview host and NOT by Vercel, which serves production, so
-- every curated calendar photo 404'd on /calendar/print -- the 3-up picker
-- showed broken images for months. The same bytes now live in our own
-- public app-assets bucket and these rows point there instead.
--
-- Re-running this puts every row back exactly as it was, by id. Named rows
-- only, never a WHERE that could match differently later.
--
-- The bytes themselves are archived at
--   C:\Users\Ezra\S2G-backups\storage-archive\lovable-assets-2026-09-24\
-- so a restore of these URLs alone would point back at a route that no
-- longer serves anything -- this file exists to undo the ROW change, not
-- to recover images.
update public.curated_calendar_photos c
   set public_url = v.public_url,
       storage_path = v.storage_path
  from (values
  ('15347d51-087f-438a-b0b7-04f12c262b7e'::uuid, '/__l5e/assets-v1/721d748d-e855-464e-bae5-ec8b5d84e479/month-01-autumn.jpg', 'nature/month-01-option-1.jpg'),
  ('3c74e302-85d1-43bf-84d5-70a3b1b34a8f'::uuid, '/__l5e/assets-v1/be39b689-7416-4037-80f8-df8fdfc7ce8f/calendar-upload-64.png', 'nature/month-01-option-2.png'),
  ('3a9518d2-1a2d-4451-a795-64666453b876'::uuid, '/__l5e/assets-v1/3d0ce24a-f82f-4d06-8846-f5a09117a747/calendar-month-15.png', 'nature/month-01-option-3.png'),
  ('da25ccae-d87c-437b-8aa4-4d9cbdc8b01f'::uuid, '/__l5e/assets-v1/4fbe32ec-e7f5-4e5c-92e6-4da256535b73/month-02-autumn.jpg', 'nature/month-02-option-1.jpg'),
  ('4a99696f-3223-4fee-8d0d-5cc6989806aa'::uuid, '/__l5e/assets-v1/74cac904-0382-4c7a-9e46-7017f4e075f2/calendar-upload-65.png', 'nature/month-02-option-2.png'),
  ('922c8113-828f-4f7f-84d6-db22fc91e94a'::uuid, '/__l5e/assets-v1/ec68c9f8-5881-4d5e-9cdd-d3f447846acd/calendar-month-16.png', 'nature/month-02-option-3.png'),
  ('b133dbdf-0761-48a8-86ea-1fcc6dab0b2b'::uuid, '/__l5e/assets-v1/eb253869-0e17-4e93-bffa-2d73a8500a1f/month-03-autumn.jpg', 'nature/month-03-option-1.jpg'),
  ('96e7fd25-ed21-4e23-b92f-5ba86ab1c696'::uuid, '/__l5e/assets-v1/8674b5c1-9a8a-4c77-83e1-c489ed1372e5/calendar-upload-63.png', 'nature/month-03-option-2.png'),
  ('1b1b1bb6-f6c2-4d0b-8509-afdcb5dcf493'::uuid, '/__l5e/assets-v1/a7f7f323-b53c-42d4-91ef-dc5ec8fe8000/calendar-month-17.png', 'nature/month-03-option-3.png'),
  ('bc7f9a15-0150-4063-aa3f-1631d8132c91'::uuid, '/__l5e/assets-v1/4e5e7f2d-fea5-4e0e-b2f1-806efeadc674/month-04-winter.jpg', 'nature/month-04-option-1.jpg'),
  ('59962afb-4721-4e33-8549-42896cdaa7ce'::uuid, '/__l5e/assets-v1/b028ccf6-71fa-43ce-9267-8c725d9f13d3/calendar-upload-66.png', 'nature/month-04-option-2.png'),
  ('9c28700f-4b34-45a3-8155-9e54c460204f'::uuid, '/__l5e/assets-v1/9383cfa8-ac29-4421-a45a-850330e55a07/calendar-month-18.png', 'nature/month-04-option-3.png'),
  ('6de82513-b9ae-4b88-9800-1c862fbea3d3'::uuid, '/__l5e/assets-v1/4dce8768-3bc5-41a6-a625-90f34fdc384b/month-05-winter.jpg', 'nature/month-05-option-1.jpg'),
  ('cd873a56-b48c-4c50-ace3-3fdcfa8273fe'::uuid, '/__l5e/assets-v1/eac177c7-e3b1-4497-87ca-eb8761d1efd3/calendar-upload-68.png', 'nature/month-05-option-2.png'),
  ('8839cab3-9589-49fa-b500-3bc9093070ae'::uuid, '/__l5e/assets-v1/c792a6a4-8040-4598-aacb-c8fd69f0400e/calendar-month-19.png', 'nature/month-05-option-3.png'),
  ('33d1e2ed-7202-401a-8572-2b7b69e9cb62'::uuid, '/__l5e/assets-v1/3741bfcd-c491-4d7c-8f6a-05126bbb1230/month-06-winter.jpg', 'nature/month-06-option-1.jpg'),
  ('0b10b0d5-01d7-4c9f-9313-0b8fc0e7bdf2'::uuid, '/__l5e/assets-v1/f9138f76-0172-4f86-9855-a96b7eaaedb1/calendar-upload-67.png', 'nature/month-06-option-2.png'),
  ('c93f0b7b-89ab-4868-bcf6-b906fea82da8'::uuid, '/__l5e/assets-v1/06127482-de18-408a-956f-b18354f1af1a/calendar-month-23.png', 'nature/month-06-option-3.png'),
  ('5edf054d-81a3-45d2-a407-30637cf7992a'::uuid, '/__l5e/assets-v1/511a437d-3909-4413-bc7e-a10dd5e5be07/month-07-spring.jpg', 'nature/month-07-option-1.jpg'),
  ('acbc07d3-1fe2-4772-b444-e785cf7e6b50'::uuid, '/__l5e/assets-v1/2911a2b8-d33e-46e6-b34a-fa81e346e012/calendar-upload-69.png', 'nature/month-07-option-2.png'),
  ('754942b2-f02b-4c60-a4fb-9e603dee47e7'::uuid, '/__l5e/assets-v1/51b0f720-40a9-4632-85d0-8414528d2d6e/calendar-month-26.png', 'nature/month-07-option-3.png'),
  ('5ad3fc55-b447-47bb-9201-8627e69b2550'::uuid, '/__l5e/assets-v1/12218f94-8e9b-4fd0-867e-6b8a722883f0/month-08-spring.jpg', 'nature/month-08-option-1.jpg'),
  ('695b2639-670b-434c-aa18-e08660e5ad44'::uuid, '/__l5e/assets-v1/f481fe90-3919-4c1e-9ffb-aebaede77d32/calendar-upload-70.png', 'nature/month-08-option-2.png'),
  ('3d361f2b-2dbb-490b-91da-be5c2327268a'::uuid, '/__l5e/assets-v1/b05186bf-9229-4a8a-89c8-e8a540afef0c/calendar-month-34.png', 'nature/month-08-option-3.png'),
  ('3e191e13-1dec-44b0-af7a-48be70d2d002'::uuid, '/__l5e/assets-v1/c52962d1-a97b-4d9e-bcf3-5fb96da1d13c/month-09-spring.jpg', 'nature/month-09-option-1.jpg'),
  ('fae9d8fd-076b-4e91-8b4f-9b6dcf0fb1ee'::uuid, '/__l5e/assets-v1/327e989c-a1a4-4bc5-aad5-2a99bce61a85/calendar-upload-72.png', 'nature/month-09-option-2.png'),
  ('10ebd7cd-58e5-4a1f-afe5-61d673af89be'::uuid, '/__l5e/assets-v1/af165586-b092-49fe-936b-287b84dabf24/calendar-month-36.png', 'nature/month-09-option-3.png'),
  ('e52836bb-d9c9-459a-b120-48b2fce36eba'::uuid, '/__l5e/assets-v1/57c1a589-26d2-4366-8c72-d82b6b44f51e/month-10-summer.jpg', 'nature/month-10-option-1.jpg'),
  ('fcd052c2-0225-4900-a691-2f5ea468c687'::uuid, '/__l5e/assets-v1/479246c5-87e1-46bb-b65c-7cd29b16f820/calendar-upload-73.png', 'nature/month-10-option-2.png'),
  ('fd78a203-818d-476a-b9a9-62ff041ba99d'::uuid, '/__l5e/assets-v1/3368a425-2fa5-487d-8c07-032059059068/calendar-month-42.png', 'nature/month-10-option-3.png'),
  ('98b14e95-a9c5-46b8-a88e-85f496e282f1'::uuid, '/__l5e/assets-v1/ba9059e8-07a3-4c17-a2da-3ebdee6d74c4/month-11-summer.jpg', 'nature/month-11-option-1.jpg'),
  ('7f412da6-a6ab-4c18-a3c1-726014cbe53d'::uuid, '/__l5e/assets-v1/272f37f5-fba6-4c5c-8492-31c833526911/calendar-upload-74.png', 'nature/month-11-option-2.png'),
  ('4cd1a1f8-c2ee-44c8-a9ff-bb10a7066605'::uuid, '/__l5e/assets-v1/950caac6-b3f9-4e5c-ab2d-81f768ada8e3/calendar-month-45.png', 'nature/month-11-option-3.png'),
  ('89130f9e-4be7-48b3-9e33-00cc9b95633f'::uuid, '/__l5e/assets-v1/e79e14a4-dc21-4dc6-8782-89bc3f5958cf/month-12-summer.jpg', 'nature/month-12-option-1.jpg'),
  ('c0feb12b-dca3-45dd-a49a-a1c947e04f03'::uuid, '/__l5e/assets-v1/aa2e6ddf-ab56-49ed-a9b4-e3402a09cecb/calendar-upload-75.png', 'nature/month-12-option-2.png'),
  ('53b5430b-8d57-4728-9ca4-26bf84878f56'::uuid, '/__l5e/assets-v1/8484946f-5dc1-4c92-a81d-a9a174a582f0/calendar-month-33.png', 'nature/month-12-option-3.png'),
  ('3f69d5b1-79a7-48fb-a5a7-582188d2551e'::uuid, '/__l5e/assets-v1/be39b689-7416-4037-80f8-df8fdfc7ce8f/calendar-upload-64.png', 'autumn/autumn-1.jpg'),
  ('331f4cab-9506-4973-ae22-122a2f592e98'::uuid, '/__l5e/assets-v1/b028ccf6-71fa-43ce-9267-8c725d9f13d3/calendar-upload-66.png', 'winter/winter-1.jpg'),
  ('a8ca31a3-5128-419b-b1c5-abc9e3666dd4'::uuid, '/__l5e/assets-v1/327e989c-a1a4-4bc5-aad5-2a99bce61a85/calendar-upload-72.png', 'summer/summer-1.jpg'),
  ('078d5d96-25db-41ef-b5ca-a648b97c5c7b'::uuid, '/__l5e/assets-v1/2911a2b8-d33e-46e6-b34a-fa81e346e012/calendar-upload-69.png', 'spring/spring-1.jpg'),
  ('8892e281-8f35-49ad-b075-250becdd6f5b'::uuid, '/__l5e/assets-v1/74cac904-0382-4c7a-9e46-7017f4e075f2/calendar-upload-65.png', 'autumn/autumn-2.jpg'),
  ('7f15aeba-e7dc-47f3-842a-b675428f7108'::uuid, '/__l5e/assets-v1/eac177c7-e3b1-4497-87ca-eb8761d1efd3/calendar-upload-68.png', 'winter/winter-2.jpg'),
  ('66d945c4-6c54-4214-b662-0f4998e73d1e'::uuid, '/__l5e/assets-v1/f481fe90-3919-4c1e-9ffb-aebaede77d32/calendar-upload-70.png', 'spring/spring-2.jpg'),
  ('10848085-b196-46f0-acda-5ce900b92422'::uuid, '/__l5e/assets-v1/479246c5-87e1-46bb-b65c-7cd29b16f820/calendar-upload-73.png', 'summer/summer-2.jpg'),
  ('18a057c1-1ec1-4e3a-837c-76626d630b09'::uuid, '/__l5e/assets-v1/aa2e6ddf-ab56-49ed-a9b4-e3402a09cecb/calendar-upload-75.png', 'summer/summer-3.jpg'),
  ('dccf474f-f484-4879-b27e-04b896b684c2'::uuid, '/__l5e/assets-v1/272f37f5-fba6-4c5c-8492-31c833526911/calendar-upload-74.png', 'spring/spring-3.jpg'),
  ('796f16d3-56fd-4548-8ce6-47048c5f3374'::uuid, '/__l5e/assets-v1/f9138f76-0172-4f86-9855-a96b7eaaedb1/calendar-upload-67.png', 'winter/winter-3.jpg'),
  ('2bdc1aa6-1b63-4da9-9b18-fdfa38eedab9'::uuid, '/__l5e/assets-v1/8674b5c1-9a8a-4c77-83e1-c489ed1372e5/calendar-upload-63.png', 'autumn/autumn-3.jpg')
) as v(id, public_url, storage_path)
 where c.id = v.id;

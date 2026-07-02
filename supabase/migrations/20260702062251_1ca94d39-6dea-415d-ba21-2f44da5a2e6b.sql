-- Repoint curated_calendar_photos rows to the 12 bundled seasonal CDN images
-- so the picker on the Print Calendar page shows real photos immediately
-- (instead of empty storage placeholders).

UPDATE public.curated_calendar_photos SET public_url = CASE
  WHEN season='autumn' AND slot=1 THEN '/__l5e/assets-v1/be39b689-7416-4037-80f8-df8fdfc7ce8f/calendar-upload-64.png'
  WHEN season='autumn' AND slot=2 THEN '/__l5e/assets-v1/74cac904-0382-4c7a-9e46-7017f4e075f2/calendar-upload-65.png'
  WHEN season='autumn' AND slot=3 THEN '/__l5e/assets-v1/8674b5c1-9a8a-4c77-83e1-c489ed1372e5/calendar-upload-63.png'
  WHEN season='winter' AND slot=1 THEN '/__l5e/assets-v1/b028ccf6-71fa-43ce-9267-8c725d9f13d3/calendar-upload-66.png'
  WHEN season='winter' AND slot=2 THEN '/__l5e/assets-v1/eac177c7-e3b1-4497-87ca-eb8761d1efd3/calendar-upload-68.png'
  WHEN season='winter' AND slot=3 THEN '/__l5e/assets-v1/f9138f76-0172-4f86-9855-a96b7eaaedb1/calendar-upload-67.png'
  WHEN season='spring' AND slot=1 THEN '/__l5e/assets-v1/2911a2b8-d33e-46e6-b34a-fa81e346e012/calendar-upload-69.png'
  WHEN season='spring' AND slot=2 THEN '/__l5e/assets-v1/f481fe90-3919-4c1e-9ffb-aebaede77d32/calendar-upload-70.png'
  WHEN season='spring' AND slot=3 THEN '/__l5e/assets-v1/272f37f5-fba6-4c5c-8492-31c833526911/calendar-upload-74.png'
  WHEN season='summer' AND slot=1 THEN '/__l5e/assets-v1/327e989c-a1a4-4bc5-aad5-2a99bce61a85/calendar-upload-72.png'
  WHEN season='summer' AND slot=2 THEN '/__l5e/assets-v1/479246c5-87e1-46bb-b65c-7cd29b16f820/calendar-upload-73.png'
  WHEN season='summer' AND slot=3 THEN '/__l5e/assets-v1/aa2e6ddf-ab56-49ed-a9b4-e3402a09cecb/calendar-upload-75.png'
  ELSE public_url
END,
label = CASE
  WHEN season='autumn' AND slot=1 THEN 'Autumn — golden fields'
  WHEN season='autumn' AND slot=2 THEN 'Autumn — amber forest'
  WHEN season='autumn' AND slot=3 THEN 'Autumn — harvest light'
  WHEN season='winter' AND slot=1 THEN 'Winter — snowy stillness'
  WHEN season='winter' AND slot=2 THEN 'Winter — frosted valley'
  WHEN season='winter' AND slot=3 THEN 'Winter — quiet peaks'
  WHEN season='spring' AND slot=1 THEN 'Spring — blossoming meadow'
  WHEN season='spring' AND slot=2 THEN 'Spring — new green'
  WHEN season='spring' AND slot=3 THEN 'Spring — bright bloom'
  WHEN season='summer' AND slot=1 THEN 'Summer — long light'
  WHEN season='summer' AND slot=2 THEN 'Summer — high sun'
  WHEN season='summer' AND slot=3 THEN 'Summer — warm coast'
  ELSE label
END
WHERE season IN ('autumn','winter','spring','summer') AND slot IN (1,2,3);
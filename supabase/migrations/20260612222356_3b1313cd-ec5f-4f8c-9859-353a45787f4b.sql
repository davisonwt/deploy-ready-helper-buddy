UPDATE public.dj_music_tracks SET cover_image_url = CASE id
  WHEN '3a381c4e-19f1-4bbc-bbbb-922f55760ab2'::uuid THEN '/__l5e/assets-v1/3aa439cd-28c2-43af-a186-793a33fb5273/3a381c4e-19f1-4bbc-bbbb-922f55760ab2.png'
  WHEN '7fe0fb45-316d-46dd-b83c-e135c1162498'::uuid THEN '/__l5e/assets-v1/79a8b712-6713-4560-bafb-8ed3278973d7/7fe0fb45-316d-46dd-b83c-e135c1162498.png'
  WHEN '32de770d-635a-4337-b6e7-1ba1904be83c'::uuid THEN '/__l5e/assets-v1/17b9f5db-5616-4a9f-bd8d-4bd8710b60b6/32de770d-635a-4337-b6e7-1ba1904be83c.png'
  WHEN 'e9c0d414-f422-4961-9240-c96aff8ca5e8'::uuid THEN '/__l5e/assets-v1/ee13e109-96f1-47e4-9690-d89d7542018a/e9c0d414-f422-4961-9240-c96aff8ca5e8.png'
  WHEN '5f6637b7-99eb-46fb-b70e-f6bede635fca'::uuid THEN '/__l5e/assets-v1/f1abbbed-8ed7-44d6-914f-8abd3e2cb693/5f6637b7-99eb-46fb-b70e-f6bede635fca.png'
  WHEN '9ad7b1ea-9355-4e6c-adce-3006466c8552'::uuid THEN '/__l5e/assets-v1/1ad97e2a-6a9b-40e7-bb38-94a8e58485e7/9ad7b1ea-9355-4e6c-adce-3006466c8552.png'
  WHEN '14dafd18-7739-4711-a4c9-9d08055879a9'::uuid THEN '/__l5e/assets-v1/a2487746-9fd0-4aba-8398-9ff2e0d478b9/14dafd18-7739-4711-a4c9-9d08055879a9.png'
  WHEN '06175d9b-6b38-4d79-beb0-1f38ddfe8ffa'::uuid THEN '/__l5e/assets-v1/e2af6228-20c4-4e95-81a6-a0b054d35937/06175d9b-6b38-4d79-beb0-1f38ddfe8ffa.png'
  WHEN 'b02392be-62f8-48a6-ab38-7779697997c1'::uuid THEN '/__l5e/assets-v1/6dd93761-30ec-49f0-87a7-d4f524d24cc5/b02392be-62f8-48a6-ab38-7779697997c1.png'
END,
updated_at = now()
WHERE id IN (
  '3a381c4e-19f1-4bbc-bbbb-922f55760ab2','7fe0fb45-316d-46dd-b83c-e135c1162498','32de770d-635a-4337-b6e7-1ba1904be83c',
  'e9c0d414-f422-4961-9240-c96aff8ca5e8','5f6637b7-99eb-46fb-b70e-f6bede635fca','9ad7b1ea-9355-4e6c-adce-3006466c8552',
  '14dafd18-7739-4711-a4c9-9d08055879a9','06175d9b-6b38-4d79-beb0-1f38ddfe8ffa','b02392be-62f8-48a6-ab38-7779697997c1'
);
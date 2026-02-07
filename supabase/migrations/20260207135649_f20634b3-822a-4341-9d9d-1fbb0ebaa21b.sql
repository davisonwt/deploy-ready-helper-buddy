
-- Migrate Amber Wheeles' sower profile from old account to new account
-- Old account: amberwheeles@gmail.com (432df4a7-07f1-4a5e-835c-a3c2806ce6c5)
-- New account: amberswheeles@gmail.com (c34c0eba-0010-480b-8326-7063cd7221ae)

UPDATE public.sowers 
SET user_id = 'c34c0eba-0010-480b-8326-7063cd7221ae'
WHERE id = '9ccd3c67-4ece-4457-a9b7-565bad7ccde1'
  AND user_id = '432df4a7-07f1-4a5e-835c-a3c2806ce6c5';

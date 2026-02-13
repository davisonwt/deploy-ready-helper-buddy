-- Reassign all references from duplicate DJ profiles to main DJ bcef36bb

-- radio_schedule
UPDATE radio_schedule SET dj_id = 'bcef36bb-322f-4fcd-bb32-5f117937d261' WHERE dj_id IN ('14b7003f-bf1a-43a8-b777-5ca8dbe0eb15', 'ffec0a3d-f4b6-4960-8793-d41086844320', 'd1f590d4-7dc3-4b35-aa99-57898e7d70f0', '0ae9cd3b-a726-4555-b581-e6541ddb6a5b');

-- radio_shows
UPDATE radio_shows SET dj_id = 'bcef36bb-322f-4fcd-bb32-5f117937d261' WHERE dj_id IN ('14b7003f-bf1a-43a8-b777-5ca8dbe0eb15', 'ffec0a3d-f4b6-4960-8793-d41086844320', 'd1f590d4-7dc3-4b35-aa99-57898e7d70f0', '0ae9cd3b-a726-4555-b581-e6541ddb6a5b');

-- radio_stats
UPDATE radio_stats SET dj_id = 'bcef36bb-322f-4fcd-bb32-5f117937d261' WHERE dj_id IN ('14b7003f-bf1a-43a8-b777-5ca8dbe0eb15', 'ffec0a3d-f4b6-4960-8793-d41086844320', 'd1f590d4-7dc3-4b35-aa99-57898e7d70f0', '0ae9cd3b-a726-4555-b581-e6541ddb6a5b');

-- dj_music_tracks (CASCADE but let's be explicit)
UPDATE dj_music_tracks SET dj_id = 'bcef36bb-322f-4fcd-bb32-5f117937d261' WHERE dj_id IN ('14b7003f-bf1a-43a8-b777-5ca8dbe0eb15', 'ffec0a3d-f4b6-4960-8793-d41086844320', 'd1f590d4-7dc3-4b35-aa99-57898e7d70f0', '0ae9cd3b-a726-4555-b581-e6541ddb6a5b');

-- dj_playlists
UPDATE dj_playlists SET dj_id = 'bcef36bb-322f-4fcd-bb32-5f117937d261' WHERE dj_id IN ('14b7003f-bf1a-43a8-b777-5ca8dbe0eb15', 'ffec0a3d-f4b6-4960-8793-d41086844320', 'd1f590d4-7dc3-4b35-aa99-57898e7d70f0', '0ae9cd3b-a726-4555-b581-e6541ddb6a5b');

-- radio_co_host_invites
UPDATE radio_co_host_invites SET host_dj_id = 'bcef36bb-322f-4fcd-bb32-5f117937d261' WHERE host_dj_id IN ('14b7003f-bf1a-43a8-b777-5ca8dbe0eb15', 'ffec0a3d-f4b6-4960-8793-d41086844320', 'd1f590d4-7dc3-4b35-aa99-57898e7d70f0', '0ae9cd3b-a726-4555-b581-e6541ddb6a5b');
UPDATE radio_co_host_invites SET co_host_dj_id = 'bcef36bb-322f-4fcd-bb32-5f117937d261' WHERE co_host_dj_id IN ('14b7003f-bf1a-43a8-b777-5ca8dbe0eb15', 'ffec0a3d-f4b6-4960-8793-d41086844320', 'd1f590d4-7dc3-4b35-aa99-57898e7d70f0', '0ae9cd3b-a726-4555-b581-e6541ddb6a5b');

-- radio_live_hosts
UPDATE radio_live_hosts SET dj_id = 'bcef36bb-322f-4fcd-bb32-5f117937d261' WHERE dj_id IN ('14b7003f-bf1a-43a8-b777-5ca8dbe0eb15', 'ffec0a3d-f4b6-4960-8793-d41086844320', 'd1f590d4-7dc3-4b35-aa99-57898e7d70f0', '0ae9cd3b-a726-4555-b581-e6541ddb6a5b');

-- Now delete the duplicate DJ profiles
DELETE FROM radio_djs WHERE id IN ('14b7003f-bf1a-43a8-b777-5ca8dbe0eb15', 'ffec0a3d-f4b6-4960-8793-d41086844320', 'd1f590d4-7dc3-4b35-aa99-57898e7d70f0', '0ae9cd3b-a726-4555-b581-e6541ddb6a5b');
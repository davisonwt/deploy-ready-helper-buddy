-- Clean up Jamie Richardson's orphaned data (user_id: 800369ec-94f3-4762-9a22-4fab161f7695)

-- Delete likes on his posts and his own likes
DELETE FROM memry_likes WHERE post_id IN ('ac3c1f9c-7687-4bdb-9699-64abc6c0311b', 'ef5a25d0-7d77-4713-8601-268d88e29045');
DELETE FROM memry_likes WHERE user_id = '800369ec-94f3-4762-9a22-4fab161f7695';

-- Delete comments on his posts and his own comments
DELETE FROM memry_comments WHERE post_id IN ('ac3c1f9c-7687-4bdb-9699-64abc6c0311b', 'ef5a25d0-7d77-4713-8601-268d88e29045');
DELETE FROM memry_comments WHERE user_id = '800369ec-94f3-4762-9a22-4fab161f7695';

-- Delete his memry posts
DELETE FROM memry_posts WHERE user_id = '800369ec-94f3-4762-9a22-4fab161f7695';
-- Object hotspots for Davison's real stall (user_id 04754d57-d41d-4ea7-
-- 93df-542047a6785b, username davison.taljaard). His stalls.hotspots was
-- NULL (falling back to the shared farm-stall-1 template's 5 hotspots --
-- the 4 bottom plaques + mugs). This sets his own override: the same 4
-- painted plaques (unchanged coords, still working), plus one real object
-- hotspot per described item, many sharing a kind (now allowed --
-- stalls.hotspots is no longer one-per-kind). Coordinates are percentages
-- of the interior image's own 1216x848 natural size, measured by eye
-- against /stalls/templates/farm-stall-interior.png.
update public.stalls
set hotspots = '[
  {"id": "plaque-books",   "kind": "books",  "label": "Books",     "x": 5.9,  "y": 67.0, "w": 20.6, "h": 20.0},
  {"id": "plaque-music",   "kind": "music",  "label": "Music",     "x": 28.4, "y": 67.0, "w": 20.6, "h": 20.0},
  {"id": "plaque-lyrics",  "kind": "lyrics", "label": "Lyrics",    "x": 50.8, "y": 67.0, "w": 20.6, "h": 20.0},
  {"id": "plaque-story",   "kind": "story",  "label": "My Story",  "x": 73.4, "y": 67.0, "w": 20.8, "h": 20.0},

  {"id": "obj-mug",        "kind": "mugs",   "label": "My mugs",   "x": 7.8,  "y": 50.3, "w": 7.6,  "h": 10.0, "caption": "Every one needs a coffee to read a good book"},

  {"id": "obj-bookshelf",  "kind": "books",  "label": "My books",  "x": 1,    "y": 6,    "w": 18,   "h": 50},
  {"id": "obj-booktable",  "kind": "books",  "label": "My books",  "x": 41,   "y": 57,   "w": 11,   "h": 8},

  {"id": "obj-guitar",     "kind": "music",  "label": "My music",  "x": 27,   "y": 40,   "w": 8,    "h": 24},
  {"id": "obj-piano",      "kind": "music",  "label": "My music",  "x": 40,   "y": 42,   "w": 9,    "h": 12},
  {"id": "obj-vinylcrate", "kind": "music",  "label": "My music",  "x": 75,   "y": 60,   "w": 14,   "h": 20},
  {"id": "obj-headphones", "kind": "music",  "label": "My music",  "x": 58,   "y": 56,   "w": 9,    "h": 9},
  {"id": "obj-turntable",  "kind": "music",  "label": "My music",  "x": 83,   "y": 20,   "w": 14,   "h": 28},

  {"id": "obj-notebook",   "kind": "lyrics", "label": "My lyrics", "x": 47,   "y": 58,   "w": 13,   "h": 9},

  {"id": "obj-window",     "kind": "story",  "label": "My story",  "x": 34,   "y": 20,   "w": 24,   "h": 36},
  {"id": "obj-chair",      "kind": "story",  "label": "My story",  "x": 65,   "y": 52,   "w": 13,   "h": 14}
]'::jsonb
where user_id = '04754d57-d41d-4ea7-93df-542047a6785b';

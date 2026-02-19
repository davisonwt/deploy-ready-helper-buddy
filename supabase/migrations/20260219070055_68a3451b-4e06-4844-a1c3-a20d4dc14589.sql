
-- Segment templates table (pre-built show templates)
CREATE TABLE public.radio_segment_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🎙️',
  segments_json JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.radio_segment_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view segment templates"
  ON public.radio_segment_templates FOR SELECT
  USING (true);

-- Slot segments table (per-slot segment plan)
CREATE TABLE public.radio_slot_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID REFERENCES public.radio_schedule(id) ON DELETE CASCADE,
  segment_type TEXT NOT NULL,
  segment_order INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 5,
  title TEXT,
  mapped_track_id UUID REFERENCES public.dj_music_tracks(id) ON DELETE SET NULL,
  emoji_icon TEXT DEFAULT '🎤',
  color TEXT DEFAULT '#6b7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.radio_slot_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own slot segments"
  ON public.radio_slot_segments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.radio_schedule rs
      JOIN public.radio_shows rsh ON rs.show_id = rsh.id
      JOIN public.radio_djs rd ON rsh.dj_id = rd.id
      WHERE rs.id = radio_slot_segments.schedule_id
      AND rd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own slot segments"
  ON public.radio_slot_segments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.radio_schedule rs
      JOIN public.radio_shows rsh ON rs.show_id = rsh.id
      JOIN public.radio_djs rd ON rsh.dj_id = rd.id
      WHERE rs.id = radio_slot_segments.schedule_id
      AND rd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own slot segments"
  ON public.radio_slot_segments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.radio_schedule rs
      JOIN public.radio_shows rsh ON rs.show_id = rsh.id
      JOIN public.radio_djs rd ON rsh.dj_id = rd.id
      WHERE rs.id = radio_slot_segments.schedule_id
      AND rd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own slot segments"
  ON public.radio_slot_segments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.radio_schedule rs
      JOIN public.radio_shows rsh ON rs.show_id = rsh.id
      JOIN public.radio_djs rd ON rsh.dj_id = rd.id
      WHERE rs.id = radio_slot_segments.schedule_id
      AND rd.user_id = auth.uid()
    )
  );

-- Pre-populate 4 segment templates
INSERT INTO public.radio_segment_templates (name, description, icon, segments_json) VALUES
(
  'Growth Groove Starter',
  'Perfect for new DJs wanting an easy, upbeat flow with balanced content.',
  '🌱',
  '[
    {"type":"opening","title":"Welcome & Seed of the Day","duration":2,"emoji":"🎤","color":"#f97316"},
    {"type":"teaching","title":"Teaching Block","duration":5,"emoji":"📖","color":"#3b82f6"},
    {"type":"music","title":"Music Play & Talk","duration":5,"emoji":"🎵","color":"#22c55e"},
    {"type":"advert","title":"Quick Advert / Shoutout","duration":1,"emoji":"📢","color":"#ef4444"},
    {"type":"qa","title":"Q&A / Listener Interaction","duration":10,"emoji":"🙋","color":"#a855f7"},
    {"type":"teaching","title":"Teaching Deep Dive","duration":10,"emoji":"📖","color":"#3b82f6"},
    {"type":"music","title":"Music Break","duration":10,"emoji":"🎵","color":"#22c55e"},
    {"type":"opening","title":"Mid-Show Energizer","duration":2,"emoji":"⚡","color":"#f97316"},
    {"type":"guest","title":"Guest / Co-host Spot","duration":10,"emoji":"🤝","color":"#14b8a6"},
    {"type":"reflection","title":"Music + Reflection","duration":10,"emoji":"🧘","color":"#6366f1"},
    {"type":"freeflow","title":"Free Flow / Wrap","duration":55,"emoji":"🎙️","color":"#6b7280"}
  ]'::jsonb
),
(
  'Deep Sow Session',
  'Ideal for pastors/teachers sharing lessons, with music as support.',
  '📖',
  '[
    {"type":"opening","title":"Opening + Prayer","duration":5,"emoji":"🙏","color":"#f97316"},
    {"type":"teaching","title":"Main Teaching Part 1","duration":15,"emoji":"📖","color":"#3b82f6"},
    {"type":"music","title":"Music Interlude","duration":5,"emoji":"🎵","color":"#22c55e"},
    {"type":"teaching","title":"Main Teaching Part 2","duration":15,"emoji":"📖","color":"#3b82f6"},
    {"type":"advert","title":"Community Notice","duration":1,"emoji":"📢","color":"#ef4444"},
    {"type":"qa","title":"Listener Questions","duration":10,"emoji":"🙋","color":"#a855f7"},
    {"type":"guest","title":"Testimony / Application","duration":15,"emoji":"🤝","color":"#14b8a6"},
    {"type":"music","title":"Worship Music Set","duration":10,"emoji":"🎵","color":"#22c55e"},
    {"type":"reflection","title":"Interactive Reflection","duration":14,"emoji":"🧘","color":"#6366f1"},
    {"type":"teaching","title":"Closing Teaching","duration":15,"emoji":"📖","color":"#3b82f6"},
    {"type":"music","title":"Music Outro + Blessings","duration":15,"emoji":"🎵","color":"#22c55e"}
  ]'::jsonb
),
(
  'Vibe & Grow Playlist Party',
  'Great for DJs focused on motivational/gospel/positive music, with lighter teaching.',
  '🎵',
  '[
    {"type":"opening","title":"High-Energy Opening","duration":3,"emoji":"🔥","color":"#f97316"},
    {"type":"music","title":"Music Block 1","duration":15,"emoji":"🎵","color":"#22c55e"},
    {"type":"teaching","title":"Motivation Burst","duration":5,"emoji":"💡","color":"#3b82f6"},
    {"type":"music","title":"Music Block 2","duration":15,"emoji":"🎵","color":"#22c55e"},
    {"type":"advert","title":"Advert","duration":1,"emoji":"📢","color":"#ef4444"},
    {"type":"qa","title":"Listener Dedications & Bestow","duration":10,"emoji":"🎁","color":"#a855f7"},
    {"type":"music","title":"Music Block 3","duration":15,"emoji":"🎵","color":"#22c55e"},
    {"type":"guest","title":"Fun Interaction Segment","duration":10,"emoji":"🤝","color":"#14b8a6"},
    {"type":"music","title":"Music Block 4","duration":15,"emoji":"🎵","color":"#22c55e"},
    {"type":"reflection","title":"Deeper Reflection + Teaching","duration":15,"emoji":"🧘","color":"#6366f1"},
    {"type":"music","title":"Final Wind-Down + Closing","duration":16,"emoji":"🎵","color":"#22c55e"}
  ]'::jsonb
),
(
  'Grow Together Live',
  'Max engagement — lots of listener participation and community interaction.',
  '🤝',
  '[
    {"type":"opening","title":"Welcome & Icebreaker","duration":5,"emoji":"👋","color":"#f97316"},
    {"type":"qa","title":"Live Shoutouts & Messages","duration":10,"emoji":"📣","color":"#a855f7"},
    {"type":"teaching","title":"Teaching or Topic Intro","duration":10,"emoji":"📖","color":"#3b82f6"},
    {"type":"music","title":"Music + Listener Reactions","duration":10,"emoji":"🎵","color":"#22c55e"},
    {"type":"advert","title":"Advert","duration":1,"emoji":"📢","color":"#ef4444"},
    {"type":"qa","title":"Open Mic / Hand-Raise","duration":20,"emoji":"✋","color":"#a855f7"},
    {"type":"guest","title":"Co-Host / Group Discussion","duration":15,"emoji":"🤝","color":"#14b8a6"},
    {"type":"music","title":"Music & Bestow Party","duration":15,"emoji":"🎁","color":"#22c55e"},
    {"type":"qa","title":"Q&A Deep Dive","duration":14,"emoji":"🙋","color":"#a855f7"},
    {"type":"freeflow","title":"Wrap-Up Celebration","duration":20,"emoji":"🎉","color":"#6b7280"}
  ]'::jsonb
);

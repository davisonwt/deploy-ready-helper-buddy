

# Sprint 1: Execute Database Migration

I'm in read-only planning mode. I'll switch to implementation mode to execute this migration. Here's the exact execution plan:

## Single Migration File

Create `supabase/migrations/20260227_sprint1_story_whisperer_foundation.sql` with all 8 steps:

1. **Add AI columns to `chat_messages`** — `intent_tags TEXT[]`, `emotional_tone TEXT`, `ai_generated BOOLEAN`, `immutable_hash TEXT`
2. **Enable pgvector + embedding** — `CREATE EXTENSION IF NOT EXISTS vector`, add `embedding vector(768)`, IVFFlat index
3. **Create `sower_stories`** — FK `sower_id → profiles(user_id)`, RLS with `has_role()`
4. **Create `ai_generated_content`** — FK `sower_id → profiles(user_id)`, includes `tts_provider TEXT`
5. **Create `arweave_exports`** — FK `room_id → chat_rooms(id)`, weekly batch fields
6. **Create `registered_agents`** — agent registry scaffold
7. **Create `gosat_insights`** — tiered access + `get_gosat_insight_details()` security definer
8. **Storage buckets** — `voice-clones` and `conversation-exports` (private) + `cleanup_inactive_voice_clones()` function

## Post-Migration Validation

Run 6 verification queries:
- pgvector extension active
- Backward-compatible INSERT to `chat_messages`
- Forward-compatible INSERT with new columns
- All 5 tables exist with correct columns
- Storage buckets created
- Supabase linter for RLS coverage

## On Success

Proceed to Sprint 2: Intent Tagging Edge Function with self-hosted HuggingFace on RunPod and keyword-matching fallback.


# Migration drift audit — 2026-09-21

**READ-ONLY. Nothing in this audit was applied. No schema object was created,
altered or dropped.**

The repo's migration history is known to be drifted (see the autonomous-deploy
note: use the Management API, not `supabase db push`). This is a measurement of
how far, and a plan for closing it — not the closing itself.

## Method, and what it cannot see

Live side: `information_schema` / `pg_catalog` over schema `public` only, read
through the Management API.

Repo side: a text parse of all 705 files in `supabase/migrations/*.sql`, applied
in filename order, with `CREATE` adding and `DROP` removing. Before matching,
line comments, block comments and `$$ … $$` function bodies are stripped —
without that, prose inside a comment ("… applies **to** certain rows …") parses
as a trigger on a table called `to`.

Four things this therefore gets wrong, and they matter when reading the lists:

1. **Only schema `public` is read live.** `users.on_auth_user_created` and
   `users.on_user_created_affiliate` below are triggers on `auth.users`, so they
   appear repo-not-live while almost certainly being present. Treat every
   `users.*` row as unverified rather than missing.
2. **Objects created dynamically** — inside a `DO $$ … $$` block, or by a
   function — are invisible to the repo parse. `notifications` is the clearest
   case: it is absent live AND absent from the parsed repo set, so it shows up
   in neither list despite being a known gap.
3. **Function overloads collapse to the name.** A function whose signature
   changed reads as present.
4. **`CREATE TABLE IF NOT EXISTS` in a later migration** cannot be distinguished
   from a first creation, so a table dropped and recreated may misreport.

Anything acted on later should be confirmed object-by-object first. These counts
are a map, not a warrant.

## Counts
| object | repo, not live | live, not repo |
|---|---|---|
| tables | 7 | 110 |
| functions | 29 | 75 |
| triggers | 11 | 142 |
| views | 5 | 0 |

The asymmetry is the story: **110 live tables and 142 live triggers have no
`CREATE` anywhere in the migration folder.** Drift here is overwhelmingly
production running ahead of the repo — changes made in the dashboard or by a
Lovable-side edit — not the repo holding migrations that were never applied.
That shape means the reconciliation is mostly *capture*, not *apply*, which is
the safer direction.

## Repo, not live

These have a `CREATE` in the migrations and do not exist in the live database.

### Tables
- `lecture_halls`
- `moderation_audit_log`
- `s2g_library_bestowals`
- `user_favorites`
- `user_moderation_actions`
- `user_moderation_status`
- `user_progress`

### Triggers
- `ambassador_applications.update_ambassador_applications_updated_at`
- `bestowals.update_orchard_stats_on_bestowal`
- `circle_members.circle_member_count_trigger`
- `dj_playlist_tracks.auto_order_tracks`
- `lecture_halls.update_lecture_halls_updated_at`
- `s2g_library_bestowals.update_s2g_library_bestowals_updated_at`
- `user_progress.update_user_progress_updated_at`
- `users.on_auth_user_created`
- `users.on_user_created_affiliate`
- `video_comments.update_comment_stats`
- `video_likes.update_like_stats`

### Views
- `payment_config_public`
- `public_profiles`
- `radio_sessions_public`
- `secure_profiles`
- `tribal_hearts_browse`

### Functions
- `apply_moderation_action`
- `auto_order_playlist_tracks`
- `award_referral_xp`
- `booking_ratings_guard`
- `create_system_verifier`
- `create_verification_chat`
- `enforce_minimum_music_price`
- `get_public_profile_data`
- `get_safe_profile_display`
- `handle_new_user_verification`
- `handle_verification_message`
- `initialize_user_progress`
- `log_billing_data_access`
- `log_moderation_action`
- `sync_progress_to_user_points`
- `sync_user_points_to_progress`
- `update_ambassador_applications_updated_at`
- `update_birthdays_updated_at`
- `update_circle_member_count`
- `update_journal_entries_updated_at`
- `update_message_streak`
- `update_s2g_library_items_updated_at`
- `update_user_moderation_status`
- `update_user_points`
- `update_user_progress_last_active`
- `update_user_progress_updated_at`
- `update_video_stats`
- `validate_encryption_status`
- `verify_user_account`

`user_progress` and its `update_user_progress_updated_at` trigger are the
already-known case, together with the XP-award path that writes to it. The
cluster around it — `user_moderation_status`, `user_moderation_actions`,
`moderation_audit_log`, `user_favorites`, `lecture_halls`,
`s2g_library_bestowals` — is the same shape: whole features declared in
migrations that never reached production.

## Live, not repo

These exist in production and have no `CREATE` in the migration folder. This is
the bulk of the drift.

### Tables
- `agent_template_installs`
- `agent_template_reviews`
- `agent_templates`
- `ai_generated_content`
- `analytics_events`
- `arweave_exports`
- `availability_calendar`
- `bestowal_reports`
- `biz_ads`
- `book_orders`
- `clubhouse_gifts`
- `community_drivers`
- `content_flags`
- `council_decisions`
- `driver_quote_requests`
- `driver_quotes`
- `elder_council_seats`
- `garden_activities`
- `garden_profiles`
- `gig_bookings`
- `gig_live_tracking`
- `gig_transactions`
- `gosat_alerts`
- `gosat_insights`
- `intelligent_listing_sessions`
- `invoices`
- `line_items`
- `linux_family_activity_log`
- `linux_family_agents`
- `linux_family_call_log`
- `linux_family_memory`
- `linux_family_outbound_messages`
- `linux_family_social_connections`
- `linux_family_suggestions`
- `linux_family_tasks`
- `live_room_moderators`
- `live_room_participants`
- `live_rooms`
- `live_session_messages`
- `live_session_participants`
- …and 70 more (full list in the JSON appendix below)

### Triggers
- `abuse_flags.abuse_repeat_offender`
- `agent_template_installs.trg_bump_install_count`
- `agent_templates.trg_agent_templates_updated_at`
- `availability_calendar.update_availability_calendar_updated_at`
- `bestowals.trg_award_xp_on_bestowal`
- `bestowals.trg_bestowal_invite_kickback`
- `book_orders.trg_guard_book_orders_financials`
- `book_orders.update_book_orders_updated_at`
- `booking_live_locations.booking_live_locations_guard_trg`
- `bookings.trg_bookings_currency`
- `bulk_upload_jobs.trg_bulk_upload_jobs_touch`
- `chat_files.on_chat_file_deleted`
- `chat_messages.abuse_detect_chat_message`
- `chat_messages.chat_message_notify_participants`
- `chat_messages.trg_award_xp_on_chat`
- `chat_messages.wh_block_contact_info`
- `chat_participants.trg_chat_participants_fill_profile_id`
- `chat_room_documents.on_chat_document_deleted`
- `chat_rooms.on_chat_room_deleted`
- `chat_rooms.trg_ensure_creator_participant`
- `chat_rooms.trg_ensure_creator_participant_update`
- `classroom_invites.update_classroom_invites_updated_at`
- `clubhouse_gifts.update_clubhouse_gifts_updated_at`
- `community_drivers.trg_drivers_protect_status`
- `community_drivers.update_community_drivers_updated_at`
- `content_flags.trigger_create_gosat_alert`
- `content_purchases.trg_content_purchases_updated_at`
- `courier_deliveries.trigger_delivery_confirmation`
- `courier_deliveries.update_courier_deliveries_timestamp`
- `dj_music_tracks.enforce_dj_music_tracks_min_price`
- `dj_playlist_tracks.update_playlist_on_track_change`
- `driver_quote_requests.trg_guard_driver_quote_request_status`
- `driver_quote_requests.update_driver_quote_requests_updated_at`
- `driver_quotes.update_driver_quotes_updated_at`
- `estimates.trg_estimates_status_transition`
- `followers.trg_award_xp_on_follow`
- `gig_bookings.trg_guard_gig_bookings_financials`
- `gig_bookings.update_gig_bookings_updated_at`
- `hand_seed_details.trg_hand_household_needs_reference`
- `hand_seed_details.trg_hand_seed_details_group`
- …and 102 more (full list in the JSON appendix below)

### Functions
- `add_room_participants`
- `assign_study_number`
- `auto_create_referral_link`
- `auto_process_referral`
- `award_radio_play_xp`
- `award_xp_on_bestowal`
- `award_xp_on_chat`
- `award_xp_on_follow`
- `award_xp_on_memry_comment`
- `award_xp_on_memry_like`
- `award_xp_on_memry_post`
- `award_xp_on_orchard`
- `award_xp_on_product`
- `award_xp_on_song_vote`
- `bump_template_install_count`
- `calculate_booking_fees`
- `check_dj_badges`
- `check_provider_availability`
- `cleanup_inactive_voice_clones`
- `create_gosat_alert_on_flag`
- `current_council_seat_id`
- `enforce_library_music_minimum_price`
- `enforce_product_music_minimum_price`
- `enforce_single_music_minimum_price`
- `ensure_linux_family_agents`
- `generate_ref_code`
- `generate_referral_code`
- `get_current_week_id`
- `get_gosat_insight_details`
- `get_hearts_gender`
- `get_my_dashboard_content`
- `get_or_create_community_room`
- `get_or_create_gosat_room`
- `get_profile_admin_data`
- `get_public_profile_info`
- `get_security_questions_for_reset`
- `get_song_vote_count`
- `get_upcoming_tribal_events`
- `get_user_pii`
- `get_user_remaining_votes`
- …and 35 more (full list in the JSON appendix below)

## Reconciliation plan

Sequenced so that nothing destructive happens before the repo can describe what
is actually running. No step is authorised by this document; each needs its own
go-ahead.

**Step 1 — capture live into the repo (no schema change).**
`supabase db dump --schema public` against production, committed as a single
baseline migration marked "captured from live, not replayed". This makes the
repo describe production for the first time and costs nothing at runtime. Do
this before anything else: every later step is safer once the baseline exists.

**Step 2 — decide each repo-not-live object, one at a time.** For each of the 7
tables and 11 triggers above, exactly one of:
  (a) still wanted → apply it deliberately via the Management API, or
  (b) abandoned → delete the migration, with the reason in the commit message.
`user_progress` is the one to settle first, since the XP-award trigger writes to
a table that is not there — that is a live error path, not just untidiness.

**Step 3 — reset the migration history to the baseline.** Once step 1 is
committed and step 2 is resolved, the pre-baseline migrations are history, not
instructions. Archive them under `supabase/migrations/archive/` rather than
deleting, so the reasoning stays readable.

**Step 4 — close the door.** The drift exists because production can be changed
without a migration. Until every change goes through one, this audit will be
stale within a week. Agreeing that rule is the only step that stops it
recurring; the three above are one-off cleanup.

**Not in this plan, deliberately:** dropping any live object. 110 live tables
are unaccounted for in the repo, and "not in the migrations" is not evidence
that something is unused — it is evidence the migrations are incomplete. Any
drop needs its own audit of real usage first.

## Appendix — machine-readable diff

Regenerate with the query and parse described under Method.

```json
{
 "files": 705,
 "tables": {
  "repo_not_live": [
   "lecture_halls",
   "moderation_audit_log",
   "s2g_library_bestowals",
   "user_favorites",
   "user_moderation_actions",
   "user_moderation_status",
   "user_progress"
  ],
  "live_not_repo": [
   "agent_template_installs",
   "agent_template_reviews",
   "agent_templates",
   "ai_generated_content",
   "analytics_events",
   "arweave_exports",
   "availability_calendar",
   "bestowal_reports",
   "biz_ads",
   "book_orders",
   "clubhouse_gifts",
   "community_drivers",
   "content_flags",
   "council_decisions",
   "driver_quote_requests",
   "driver_quotes",
   "elder_council_seats",
   "garden_activities",
   "garden_profiles",
   "gig_bookings",
   "gig_live_tracking",
   "gig_transactions",
   "gosat_alerts",
   "gosat_insights",
   "intelligent_listing_sessions",
   "invoices",
   "line_items",
   "linux_family_activity_log",
   "linux_family_agents",
   "linux_family_call_log",
   "linux_family_memory",
   "linux_family_outbound_messages",
   "linux_family_social_connections",
   "linux_family_suggestions",
   "linux_family_tasks",
   "live_room_moderators",
   "live_room_participants",
   "live_rooms",
   "live_session_messages",
   "live_session_participants",
   "memry_bookmarks",
   "memry_comments",
   "memry_likes",
   "memry_posts",
   "mentorship_pairings",
   "moderation_word_lists",
   "orchard_blessings",
   "password_reset_requests",
   "product_whisperer_assignments",
   "provider_escrow_transactions",
   "provider_orders",
   "provider_products",
   "providers",
   "public_profiles",
   "radio_dj_badges",
   "radio_listener_streaks",
   "radio_play_xp_log",
   "radio_reactions",
   "radio_seed_plays",
   "radio_seed_requests",
   "radio_segment_templates",
   "radio_slot_segments",
   "recipes",
   "referral_circle",
   "registered_agents",
   "s2g_agent_free_access",
   "seed_analytics_daily",
   "seed_story_overrides",
   "service_provider_availability",
   "service_providers",
   "service_quote_requests",
   "service_quotes",
   "service_zones",
   "skilldrop_host_applications",
   "skilldrop_session_subscriptions",
   "skilldrop_sessions",
   "song_votes",
   "sower_balances",
   "sower_books",
   "sower_payouts",
   "stay_availability",
   "stay_bookings",
   "stay_listings",
   "stay_reviews",
   "stay_seasonal_pricing",
   "stay_units",
   "stay_wishlists",
   "study_subscriptions",
   "tribal_event_rsvps",
   "tribal_events",
   "tribal_hearts_answers",
   "tribal_hearts_blocks",
   "tribal_hearts_matches",
   "tribal_hearts_profiles",
   "tribal_hearts_safety_flags",
   "tribal_matches",
   "tribal_scores",
   "user_consent",
   "user_crops",
   "user_referrals",
   "user_security_questions",
   "video_jobs",
   "wallets",
   "weekly_playlists",
   "whisperer_clicks",
   "whisperer_conversions",
   "whisperer_earnings",
   "whisperer_invitations",
   "whisperer_referral_links",
   "whisperers"
  ]
 },
 "functions": {
  "repo_not_live": [
   "apply_moderation_action",
   "auto_order_playlist_tracks",
   "award_referral_xp",
   "booking_ratings_guard",
   "create_system_verifier",
   "create_verification_chat",
   "enforce_minimum_music_price",
   "get_public_profile_data",
   "get_safe_profile_display",
   "handle_new_user_verification",
   "handle_verification_message",
   "initialize_user_progress",
   "log_billing_data_access",
   "log_moderation_action",
   "sync_progress_to_user_points",
   "sync_user_points_to_progress",
   "update_ambassador_applications_updated_at",
   "update_birthdays_updated_at",
   "update_circle_member_count",
   "update_journal_entries_updated_at",
   "update_message_streak",
   "update_s2g_library_items_updated_at",
   "update_user_moderation_status",
   "update_user_points",
   "update_user_progress_last_active",
   "update_user_progress_updated_at",
   "update_video_stats",
   "validate_encryption_status",
   "verify_user_account"
  ],
  "live_not_repo": [
   "add_room_participants",
   "assign_study_number",
   "auto_create_referral_link",
   "auto_process_referral",
   "award_radio_play_xp",
   "award_xp_on_bestowal",
   "award_xp_on_chat",
   "award_xp_on_follow",
   "award_xp_on_memry_comment",
   "award_xp_on_memry_like",
   "award_xp_on_memry_post",
   "award_xp_on_orchard",
   "award_xp_on_product",
   "award_xp_on_song_vote",
   "bump_template_install_count",
   "calculate_booking_fees",
   "check_dj_badges",
   "check_provider_availability",
   "cleanup_inactive_voice_clones",
   "create_gosat_alert_on_flag",
   "current_council_seat_id",
   "enforce_library_music_minimum_price",
   "enforce_product_music_minimum_price",
   "enforce_single_music_minimum_price",
   "ensure_linux_family_agents",
   "generate_ref_code",
   "generate_referral_code",
   "get_current_week_id",
   "get_gosat_insight_details",
   "get_hearts_gender",
   "get_my_dashboard_content",
   "get_or_create_community_room",
   "get_or_create_gosat_room",
   "get_profile_admin_data",
   "get_public_profile_info",
   "get_security_questions_for_reset",
   "get_song_vote_count",
   "get_upcoming_tribal_events",
   "get_user_pii",
   "get_user_remaining_votes",
   "get_users_pii",
   "get_vault_secret",
   "get_weekly_leaderboard",
   "has_free_agent_access",
   "increment_referral_clicks",
   "init_tribal_score",
   "invoke_money_job",
   "is_active_ambassador",
   "is_council_member",
   "is_participant_in_room",
   "is_tribal_hearts_member",
   "linux_family_on_new_seed",
   "log_security_event",
   "log_security_event_enhanced",
   "notify_event_rsvp",
   "notify_new_mentorship_pairing",
   "orchard_funding_status",
   "recompute_tribal_score",
   "record_revenue_correction",
   "record_treasury_movement",
   "search_user_profiles",
   "set_intelligent_listing_updated_at",
   "sleeping_pillows_near",
   "sync_auth_email_to_profile",
   "sync_public_profiles_from_profiles",
   "sync_user_email",
   "tribal_hearts_match_validate",
   "tribal_hearts_profile_validate",
   "update_clubhouse_gifts_updated_at",
   "update_listener_streak",
   "update_memry_comments_count",
   "update_memry_likes_count",
   "update_provider_updated_at",
   "upsert_vault_secret",
   "verify_security_answers_and_issue_token"
  ]
 },
 "triggers": {
  "repo_not_live": [
   "ambassador_applications.update_ambassador_applications_updated_at",
   "bestowals.update_orchard_stats_on_bestowal",
   "circle_members.circle_member_count_trigger",
   "dj_playlist_tracks.auto_order_tracks",
   "lecture_halls.update_lecture_halls_updated_at",
   "s2g_library_bestowals.update_s2g_library_bestowals_updated_at",
   "user_progress.update_user_progress_updated_at",
   "users.on_auth_user_created",
   "users.on_user_created_affiliate",
   "video_comments.update_comment_stats",
   "video_likes.update_like_stats"
  ],
  "live_not_repo": [
   "abuse_flags.abuse_repeat_offender",
   "agent_template_installs.trg_bump_install_count",
   "agent_templates.trg_agent_templates_updated_at",
   "availability_calendar.update_availability_calendar_updated_at",
   "bestowals.trg_award_xp_on_bestowal",
   "bestowals.trg_bestowal_invite_kickback",
   "book_orders.trg_guard_book_orders_financials",
   "book_orders.update_book_orders_updated_at",
   "booking_live_locations.booking_live_locations_guard_trg",
   "bookings.trg_bookings_currency",
   "bulk_upload_jobs.trg_bulk_upload_jobs_touch",
   "chat_files.on_chat_file_deleted",
   "chat_messages.abuse_detect_chat_message",
   "chat_messages.chat_message_notify_participants",
   "chat_messages.trg_award_xp_on_chat",
   "chat_messages.wh_block_contact_info",
   "chat_participants.trg_chat_participants_fill_profile_id",
   "chat_room_documents.on_chat_document_deleted",
   "chat_rooms.on_chat_room_deleted",
   "chat_rooms.trg_ensure_creator_participant",
   "chat_rooms.trg_ensure_creator_participant_update",
   "classroom_invites.update_classroom_invites_updated_at",
   "clubhouse_gifts.update_clubhouse_gifts_updated_at",
   "community_drivers.trg_drivers_protect_status",
   "community_drivers.update_community_drivers_updated_at",
   "content_flags.trigger_create_gosat_alert",
   "content_purchases.trg_content_purchases_updated_at",
   "courier_deliveries.trigger_delivery_confirmation",
   "courier_deliveries.update_courier_deliveries_timestamp",
   "dj_music_tracks.enforce_dj_music_tracks_min_price",
   "dj_playlist_tracks.update_playlist_on_track_change",
   "driver_quote_requests.trg_guard_driver_quote_request_status",
   "driver_quote_requests.update_driver_quote_requests_updated_at",
   "driver_quotes.update_driver_quotes_updated_at",
   "estimates.trg_estimates_status_transition",
   "followers.trg_award_xp_on_follow",
   "gig_bookings.trg_guard_gig_bookings_financials",
   "gig_bookings.update_gig_bookings_updated_at",
   "hand_seed_details.trg_hand_household_needs_reference",
   "hand_seed_details.trg_hand_seed_details_group",
   "hand_seed_references.trg_hand_reference_delete_guard",
   "intelligent_listing_sessions.set_intelligent_listing_sessions_updated_at",
   "invoices.trg_invoices_status_transition",
   "job_notes.trg_job_notes_status_transition",
   "linux_family_agents.trg_lfa_updated",
   "linux_family_memory.trg_lfm_updated",
   "linux_family_social_connections.trg_lfsc_updated",
   "live_room_participants.update_participant_count_trigger",
   "live_session_messages.update_live_session_messages_updated_at",
   "live_session_participants.update_live_session_participants_updated_at",
   "memry_comments.trg_award_xp_on_memry_comment",
   "memry_comments.update_memry_comments_count_trigger",
   "memry_likes.trg_award_xp_on_memry_like",
   "memry_likes.update_memry_likes_count_trigger",
   "memry_posts.trg_award_xp_on_memry_post",
   "mentorship_pairings.trg_mentorship_pairings_updated_at",
   "mentorship_pairings.trg_notify_new_mentorship_pairing",
   "orchard_holdings.orchard_holdings_recount",
   "orchard_release_payments.trg_orchard_release_payments_guard",
   "orchards.abuse_detect_orchard",
   "orchards.calculate_pockets_trigger",
   "orchards.sync_orchard_profile_trigger",
   "orchards.trg_award_xp_on_orchard",
   "orchards.trg_linux_family_on_new_seed",
   "orchards.trg_orchards_default_company_id",
   "orchards.trg_orchards_protect_verification",
   "orchards.trg_orchards_settlement_consent",
   "orchards.trg_orchards_uplift_gate",
   "orchards.validate_orchard_updates_trigger",
   "payment_config_secure.monitor_payment_config_access",
   "payment_config_secure.update_payment_config_secure_updated_at",
   "pillow_units.trg_pillow_units_price",
   "prescription_requests.trg_prescription_requests_updated_at",
   "prescription_upload_tokens.trg_prescription_upload_tokens_updated_at",
   "product_whisperer_assignments.trg_auto_create_referral_link",
   "product_whisperer_assignments.trg_enforce_whisperer_assignment_flow",
   "products.abuse_detect_product",
   "products.enforce_products_music_min_price",
   "products.trg_award_xp_on_product",
   "products.trg_books_sync_product_item",
   "products.trg_products_default_company_id",
   "products.trg_products_settlement_consent",
   "profiles.abuse_detect_profile",
   "profiles.log_profile_access_detailed",
   "profiles.on_profile_created_global_chat_join",
   "profiles.on_profile_created_process_referral",
   "profiles.on_profile_created_verification",
   "profiles.profile_access_monitor",
   "profiles.sync_email_on_profile_insert",
   "profiles.trg_auto_create_user_referral",
   "profiles.trg_log_payout_detail_change",
   "profiles.trg_log_suspension_change",
   "profiles.trg_profiles_protect_privileged",
   "profiles.trg_sync_public_profiles_from_profiles",
   "profiles.trigger_init_tribal_score",
   "profiles.update_profiles_updated_at",
   "profiles.validate_user_input_trigger",
   "provider_orders.trg_guard_provider_orders_escrow",
   "provider_orders.update_provider_orders_updated_at",
   "provider_products.update_provider_products_updated_at",
   "providers.trg_providers_protect_status",
   "providers.update_providers_updated_at",
   "radio_schedule.notify_gosats_on_radio_request",
   "radio_seed_plays.trigger_award_radio_play_xp",
   "recipes.update_recipes_updated_at",
   "revenue_ledger.revenue_ledger_no_update_delete",
   "s2g_library_items.enforce_s2g_library_items_min_price",
   "s2g_library_items.trg_assign_study_number",
   "seed_analytics_daily.trg_sad_updated",
   "service_providers.trg_service_providers_protect_status",
   "service_providers.update_service_providers_updated_at",
   "service_quote_requests.trg_guard_service_quote_request_status",
   "service_quote_requests.update_service_quote_requests_updated_at",
   "service_quotes.update_service_quotes_updated_at",
   "service_zones.update_service_zones_updated_at",
   "skilldrop_sessions.update_lecture_halls_updated_at",
   "song_votes.trg_award_xp_on_song_vote",
   "sower_balances.update_sower_balances_updated_at",
   "sower_books.update_sower_books_updated_at",
   "sower_payouts.update_sower_payouts_updated_at",
   "sowers.trg_enforce_regulated_business_credential",
   "sowers.trg_sowers_ensure_default_company",
   "stalls.trg_stalls_enforce_image_ownership",
   "stalls.trg_stalls_sync_category",
   "stay_bookings.trg_guard_stay_bookings_financials",
   "stream_viewers.trigger_update_viewer_count_delete",
   "stream_viewers.trigger_update_viewer_count_insert",
   "stream_viewers.trigger_update_viewer_count_update",
   "topups.trg_topups_updated_at",
   "tribal_event_rsvps.trg_notify_event_rsvp",
   "tribal_events.trg_tribal_events_updated_at",
   "tribal_hearts_matches.trg_tribal_hearts_match_validate",
   "tribal_hearts_profiles.trg_tribal_hearts_profile_validate",
   "tribal_matches.update_tribal_matches_updated_at",
   "user_billing_info.log_billing_update_trigger",
   "user_billing_info.monitor_billing_access",
   "user_roles.validate_role_changes_trigger",
   "user_wallets.trg_mark_payout_setup_complete",
   "video_jobs.video_jobs_updated_at",
   "wallet_balances.update_wallet_balances_updated_at",
   "whisperer_invitations.update_whisperer_invitations_updated_at",
   "whisperer_referral_links.update_whisperer_referral_links_updated_at"
  ]
 },
 "views": {
  "repo_not_live": [
   "payment_config_public",
   "public_profiles",
   "radio_sessions_public",
   "secure_profiles",
   "tribal_hearts_browse"
  ],
  "live_not_repo": []
 }
}
```

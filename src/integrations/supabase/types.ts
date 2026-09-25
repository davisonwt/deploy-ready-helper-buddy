export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      abuse_flag_views: {
        Row: {
          flag_id: string
          id: string
          viewed_at: string
          viewed_by: string
        }
        Insert: {
          flag_id: string
          id?: string
          viewed_at?: string
          viewed_by: string
        }
        Update: {
          flag_id?: string
          id?: string
          viewed_at?: string
          viewed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "abuse_flag_views_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "abuse_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      abuse_flags: {
        Row: {
          action_taken: string
          author_id: string
          category: string
          content_id: string | null
          content_type: string
          created_at: string
          id: string
          matched_rule: string
          repeat_offender: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          room_id: string | null
          severity: string
          status: string
        }
        Insert: {
          action_taken: string
          author_id: string
          category: string
          content_id?: string | null
          content_type: string
          created_at?: string
          id?: string
          matched_rule: string
          repeat_offender?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          room_id?: string | null
          severity: string
          status?: string
        }
        Update: {
          action_taken?: string
          author_id?: string
          category?: string
          content_id?: string | null
          content_type?: string
          created_at?: string
          id?: string
          matched_rule?: string
          repeat_offender?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          room_id?: string | null
          severity?: string
          status?: string
        }
        Relationships: []
      }
      account_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          label: string | null
          linked_user_id: string
          owner_user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          linked_user_id: string
          owner_user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          linked_user_id?: string
          owner_user_id?: string
        }
        Relationships: []
      }
      achievements: {
        Row: {
          achievement_name: string
          achievement_type: string
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          unlocked_at: string | null
          user_id: string
          xp_reward: number | null
        }
        Insert: {
          achievement_name: string
          achievement_type: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          unlocked_at?: string | null
          user_id: string
          xp_reward?: number | null
        }
        Update: {
          achievement_name?: string
          achievement_type?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          unlocked_at?: string | null
          user_id?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      activity_feed: {
        Row: {
          action_type: string
          actor_id: string
          actor_profile_id: string | null
          content: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          metadata: Json | null
          mode_type: string
          user_id: string
        }
        Insert: {
          action_type: string
          actor_id: string
          actor_profile_id?: string | null
          content?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          mode_type: string
          user_id: string
        }
        Update: {
          action_type?: string
          actor_id?: string
          actor_profile_id?: string | null
          content?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          mode_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_feed_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          commission_rate: number
          created_at: string
          earnings: number
          id: string
          is_active: boolean
          referral_code: string
          total_referrals: number
          updated_at: string
          user_id: string
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          earnings?: number
          id?: string
          is_active?: boolean
          referral_code: string
          total_referrals?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          commission_rate?: number
          created_at?: string
          earnings?: number
          id?: string
          is_active?: boolean
          referral_code?: string
          total_referrals?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_template_installs: {
        Row: {
          bestowal_id: string | null
          custom_config: Json
          enabled: boolean
          id: string
          installed_at: string
          last_run_at: string | null
          run_count: number
          template_id: string
          user_id: string
        }
        Insert: {
          bestowal_id?: string | null
          custom_config?: Json
          enabled?: boolean
          id?: string
          installed_at?: string
          last_run_at?: string | null
          run_count?: number
          template_id: string
          user_id: string
        }
        Update: {
          bestowal_id?: string | null
          custom_config?: Json
          enabled?: boolean
          id?: string
          installed_at?: string
          last_run_at?: string | null
          run_count?: number
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_template_installs_bestowal_id_fkey"
            columns: ["bestowal_id"]
            isOneToOne: false
            referencedRelation: "bestowals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_template_installs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "agent_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_template_reviews: {
        Row: {
          created_at: string
          decision: string
          id: string
          notes: string | null
          reviewer_id: string
          template_id: string
        }
        Insert: {
          created_at?: string
          decision: string
          id?: string
          notes?: string | null
          reviewer_id: string
          template_id: string
        }
        Update: {
          created_at?: string
          decision?: string
          id?: string
          notes?: string | null
          reviewer_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_template_reviews_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "agent_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_templates: {
        Row: {
          author_id: string
          category: string
          created_at: string
          currency: string
          default_schedule: string | null
          description: string
          icon: string | null
          id: string
          install_bestowal_amount: number
          installs_count: number
          is_featured: boolean
          name: string
          prompt_template: string
          rating_avg: number
          rating_count: number
          status: string
          trigger_config: Json
          updated_at: string
        }
        Insert: {
          author_id: string
          category?: string
          created_at?: string
          currency?: string
          default_schedule?: string | null
          description: string
          icon?: string | null
          id?: string
          install_bestowal_amount?: number
          installs_count?: number
          is_featured?: boolean
          name: string
          prompt_template: string
          rating_avg?: number
          rating_count?: number
          status?: string
          trigger_config?: Json
          updated_at?: string
        }
        Update: {
          author_id?: string
          category?: string
          created_at?: string
          currency?: string
          default_schedule?: string | null
          description?: string
          icon?: string | null
          id?: string
          install_bestowal_amount?: number
          installs_count?: number
          is_featured?: boolean
          name?: string
          prompt_template?: string
          rating_avg?: number
          rating_count?: number
          status?: string
          trigger_config?: Json
          updated_at?: string
        }
        Relationships: []
      }
      ai_creations: {
        Row: {
          content_text: string | null
          content_type: Database["public"]["Enums"]["ai_content_type"]
          created_at: string
          custom_prompt: string | null
          id: string
          image_url: string | null
          is_favorited: boolean | null
          metadata: Json | null
          product_description: string | null
          style: string | null
          target_audience: string | null
          title: string
          updated_at: string
          user_id: string
          video_length: number | null
        }
        Insert: {
          content_text?: string | null
          content_type: Database["public"]["Enums"]["ai_content_type"]
          created_at?: string
          custom_prompt?: string | null
          id?: string
          image_url?: string | null
          is_favorited?: boolean | null
          metadata?: Json | null
          product_description?: string | null
          style?: string | null
          target_audience?: string | null
          title: string
          updated_at?: string
          user_id: string
          video_length?: number | null
        }
        Update: {
          content_text?: string | null
          content_type?: Database["public"]["Enums"]["ai_content_type"]
          created_at?: string
          custom_prompt?: string | null
          id?: string
          image_url?: string | null
          is_favorited?: boolean | null
          metadata?: Json | null
          product_description?: string | null
          style?: string | null
          target_audience?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          video_length?: number | null
        }
        Relationships: []
      }
      ai_generated_content: {
        Row: {
          audio_url: string | null
          content: string | null
          content_type: string
          created_at: string
          id: string
          is_approved: boolean | null
          metadata: Json | null
          model_version: string | null
          prompt_used: string | null
          sower_id: string
          title: string
          tts_provider: string | null
          tts_voice_id: string | null
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          content?: string | null
          content_type?: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          metadata?: Json | null
          model_version?: string | null
          prompt_used?: string | null
          sower_id: string
          title: string
          tts_provider?: string | null
          tts_voice_id?: string | null
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          content?: string | null
          content_type?: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          metadata?: Json | null
          model_version?: string | null
          prompt_used?: string | null
          sower_id?: string
          title?: string
          tts_provider?: string | null
          tts_voice_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generated_content_sower_id_fkey"
            columns: ["sower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ai_generated_content_sower_id_fkey"
            columns: ["sower_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          date: string
          generations_count: number
          id: string
          user_id: string
        }
        Insert: {
          date?: string
          generations_count?: number
          id?: string
          user_id: string
        }
        Update: {
          date?: string
          generations_count?: number
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      ambassador_applications: {
        Row: {
          brand_name: string | null
          created_at: string
          current_role: string | null
          email: string
          full_name: string
          id: string
          platforms: string[] | null
          status: string
          updated_at: string
          user_id: string | null
          username: string | null
          why_represent: string
        }
        Insert: {
          brand_name?: string | null
          created_at?: string
          current_role?: string | null
          email: string
          full_name: string
          id?: string
          platforms?: string[] | null
          status?: string
          updated_at?: string
          user_id?: string | null
          username?: string | null
          why_represent: string
        }
        Update: {
          brand_name?: string | null
          created_at?: string
          current_role?: string | null
          email?: string
          full_name?: string
          id?: string
          platforms?: string[] | null
          status?: string
          updated_at?: string
          user_id?: string | null
          username?: string | null
          why_represent?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          attribution_channel: string | null
          created_at: string
          device_model: string | null
          event: string
          id: string
          ip_city: string | null
          ip_country: string | null
          os_version: string | null
          properties: Json | null
          screen_height: number | null
          screen_width: number | null
          session_id: string
          timestamp: string
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          attribution_channel?: string | null
          created_at?: string
          device_model?: string | null
          event: string
          id?: string
          ip_city?: string | null
          ip_country?: string | null
          os_version?: string | null
          properties?: Json | null
          screen_height?: number | null
          screen_width?: number | null
          session_id: string
          timestamp?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          attribution_channel?: string | null
          created_at?: string
          device_model?: string | null
          event?: string
          id?: string
          ip_city?: string | null
          ip_country?: string | null
          os_version?: string | null
          properties?: Json | null
          screen_height?: number | null
          screen_width?: number | null
          session_id?: string
          timestamp?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      arweave_exports: {
        Row: {
          arweave_tx_id: string | null
          batch_end: string | null
          batch_start: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          export_status: string
          exported_by: string | null
          file_hash: string | null
          file_size_bytes: number | null
          id: string
          message_count: number | null
          room_id: string
        }
        Insert: {
          arweave_tx_id?: string | null
          batch_end?: string | null
          batch_start?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          export_status?: string
          exported_by?: string | null
          file_hash?: string | null
          file_size_bytes?: number | null
          id?: string
          message_count?: number | null
          room_id: string
        }
        Update: {
          arweave_tx_id?: string | null
          batch_end?: string | null
          batch_start?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          export_status?: string
          exported_by?: string | null
          file_hash?: string | null
          file_size_bytes?: number | null
          id?: string
          message_count?: number | null
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arweave_exports_exported_by_fkey"
            columns: ["exported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "arweave_exports_exported_by_fkey"
            columns: ["exported_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "arweave_exports_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_calendar: {
        Row: {
          available_date: string
          created_at: string | null
          estimated_hours_remaining: number | null
          id: string
          is_available: boolean | null
          location_zone: string | null
          max_distance_km_remaining: number | null
          time_slots: Json | null
          updated_at: string | null
          user_id: string
          user_type: string
        }
        Insert: {
          available_date: string
          created_at?: string | null
          estimated_hours_remaining?: number | null
          id?: string
          is_available?: boolean | null
          location_zone?: string | null
          max_distance_km_remaining?: number | null
          time_slots?: Json | null
          updated_at?: string | null
          user_id: string
          user_type: string
        }
        Update: {
          available_date?: string
          created_at?: string | null
          estimated_hours_remaining?: number | null
          id?: string
          is_available?: boolean | null
          location_zone?: string | null
          max_distance_km_remaining?: number | null
          time_slots?: Json | null
          updated_at?: string | null
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      available_achievements: {
        Row: {
          achievement_type: string
          created_at: string
          criteria: Json | null
          description: string
          icon: string | null
          id: string
          is_active: boolean
          points_awarded: number
          title: string
        }
        Insert: {
          achievement_type: string
          created_at?: string
          criteria?: Json | null
          description: string
          icon?: string | null
          id?: string
          is_active?: boolean
          points_awarded?: number
          title: string
        }
        Update: {
          achievement_type?: string
          created_at?: string
          criteria?: Json | null
          description?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          points_awarded?: number
          title?: string
        }
        Relationships: []
      }
      balance_ledger: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string | null
          kind: string
          notes: string | null
          reference_id: string | null
          reference_table: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          kind: string
          notes?: string | null
          reference_id?: string | null
          reference_table?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          kind?: string
          notes?: string | null
          reference_id?: string | null
          reference_table?: string | null
          user_id?: string
        }
        Relationships: []
      }
      basket_items: {
        Row: {
          added_at: string | null
          basket_id: string | null
          id: string
          product_id: string | null
          quantity: number | null
        }
        Insert: {
          added_at?: string | null
          basket_id?: string | null
          id?: string
          product_id?: string | null
          quantity?: number | null
        }
        Update: {
          added_at?: string | null
          basket_id?: string | null
          id?: string
          product_id?: string | null
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "basket_items_basket_id_fkey"
            columns: ["basket_id"]
            isOneToOne: false
            referencedRelation: "baskets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "basket_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      basket_order_bestowals: {
        Row: {
          basket_order_id: string
          bestowal_id: string
          created_at: string
        }
        Insert: {
          basket_order_id: string
          bestowal_id: string
          created_at?: string
        }
        Update: {
          basket_order_id?: string
          bestowal_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "basket_order_bestowals_basket_order_id_fkey"
            columns: ["basket_order_id"]
            isOneToOne: false
            referencedRelation: "basket_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "basket_order_bestowals_bestowal_id_fkey"
            columns: ["bestowal_id"]
            isOneToOne: false
            referencedRelation: "product_bestowals"
            referencedColumns: ["id"]
          },
        ]
      }
      basket_orders: {
        Row: {
          approve_url: string | null
          buyer_total: number
          completed_at: string | null
          created_at: string
          currency: string
          id: string
          items: Json
          pay_currency: string | null
          processor_fee: number
          provider: string
          provider_invoice_id: string | null
          provider_order_id: string | null
          status: string
          subtotal: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approve_url?: string | null
          buyer_total: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          items: Json
          pay_currency?: string | null
          processor_fee?: number
          provider: string
          provider_invoice_id?: string | null
          provider_order_id?: string | null
          status?: string
          subtotal: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approve_url?: string | null
          buyer_total?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          items?: Json
          pay_currency?: string | null
          processor_fee?: number
          provider?: string
          provider_invoice_id?: string | null
          provider_order_id?: string | null
          status?: string
          subtotal?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      baskets: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bestowal_reports: {
        Row: {
          created_at: string
          html_snapshot: string | null
          id: string
          metrics: Json
          pdf_url: string | null
          period_end: string
          period_start: string
          report_type: string
          seed_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          html_snapshot?: string | null
          id?: string
          metrics?: Json
          pdf_url?: string | null
          period_end: string
          period_start: string
          report_type?: string
          seed_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          html_snapshot?: string | null
          id?: string
          metrics?: Json
          pdf_url?: string | null
          period_end?: string
          period_start?: string
          report_type?: string
          seed_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bestowals: {
        Row: {
          amount: number
          base_amount: number | null
          bestower_id: string
          bestower_profile_id: string | null
          blockchain_network: string | null
          buyer_total_amount: number | null
          context_id: string | null
          context_kind: string | null
          created_at: string
          currency: string
          delivery_address: Json | null
          distributed_at: string | null
          distribution_data: Json | null
          distribution_mode: string | null
          hold_reason: string | null
          id: string
          message: string | null
          orchard_id: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          payout_attempted_at: string | null
          payout_completed_at: string | null
          payout_currency: string | null
          payout_destination: string | null
          payout_error: string | null
          payout_fee_amount: number | null
          payout_provider: string | null
          payout_reference: string | null
          payout_status: string | null
          pocket_numbers: number[] | null
          pocket_type: string | null
          pockets_count: number
          processor_fee_amount: number | null
          processor_fee_currency: string | null
          provider: string | null
          provider_order_id: string | null
          release_status: string | null
          released_at: string | null
          tx_signature: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          base_amount?: number | null
          bestower_id: string
          bestower_profile_id?: string | null
          blockchain_network?: string | null
          buyer_total_amount?: number | null
          context_id?: string | null
          context_kind?: string | null
          created_at?: string
          currency?: string
          delivery_address?: Json | null
          distributed_at?: string | null
          distribution_data?: Json | null
          distribution_mode?: string | null
          hold_reason?: string | null
          id?: string
          message?: string | null
          orchard_id?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          payout_attempted_at?: string | null
          payout_completed_at?: string | null
          payout_currency?: string | null
          payout_destination?: string | null
          payout_error?: string | null
          payout_fee_amount?: number | null
          payout_provider?: string | null
          payout_reference?: string | null
          payout_status?: string | null
          pocket_numbers?: number[] | null
          pocket_type?: string | null
          pockets_count: number
          processor_fee_amount?: number | null
          processor_fee_currency?: string | null
          provider?: string | null
          provider_order_id?: string | null
          release_status?: string | null
          released_at?: string | null
          tx_signature?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          base_amount?: number | null
          bestower_id?: string
          bestower_profile_id?: string | null
          blockchain_network?: string | null
          buyer_total_amount?: number | null
          context_id?: string | null
          context_kind?: string | null
          created_at?: string
          currency?: string
          delivery_address?: Json | null
          distributed_at?: string | null
          distribution_data?: Json | null
          distribution_mode?: string | null
          hold_reason?: string | null
          id?: string
          message?: string | null
          orchard_id?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          payout_attempted_at?: string | null
          payout_completed_at?: string | null
          payout_currency?: string | null
          payout_destination?: string | null
          payout_error?: string | null
          payout_fee_amount?: number | null
          payout_provider?: string | null
          payout_reference?: string | null
          payout_status?: string | null
          pocket_numbers?: number[] | null
          pocket_type?: string | null
          pockets_count?: number
          processor_fee_amount?: number | null
          processor_fee_currency?: string | null
          provider?: string | null
          provider_order_id?: string | null
          release_status?: string | null
          released_at?: string | null
          tx_signature?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bestowals_bestower_profile_id_fkey"
            columns: ["bestower_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bestowals_bestower_profile_id_fkey"
            columns: ["bestower_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bestowals_orchard_id_fkey"
            columns: ["orchard_id"]
            isOneToOne: false
            referencedRelation: "orchards"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_access_logs: {
        Row: {
          access_type: string
          accessed_by: string | null
          created_at: string
          id: string
          ip_address: unknown
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_type: string
          accessed_by?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_type?: string
          accessed_by?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      birthdays: {
        Row: {
          created_at: string
          gregorian_date: string | null
          id: string
          notes: string | null
          person_name: string
          relationship: string | null
          updated_at: string
          user_id: string
          yhwh_day: number
          yhwh_month: number
        }
        Insert: {
          created_at?: string
          gregorian_date?: string | null
          id?: string
          notes?: string | null
          person_name: string
          relationship?: string | null
          updated_at?: string
          user_id: string
          yhwh_day: number
          yhwh_month: number
        }
        Update: {
          created_at?: string
          gregorian_date?: string | null
          id?: string
          notes?: string | null
          person_name?: string
          relationship?: string | null
          updated_at?: string
          user_id?: string
          yhwh_day?: number
          yhwh_month?: number
        }
        Relationships: []
      }
      biz_ads: {
        Row: {
          created_at: string
          description: string | null
          duration_seconds: number | null
          file_size: number | null
          id: string
          is_active: boolean | null
          media_type: string
          media_url: string
          mime_type: string | null
          overlay_headline: string | null
          overlay_position: string | null
          overlay_tagline: string | null
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          voiceover_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          media_type?: string
          media_url: string
          mime_type?: string | null
          overlay_headline?: string | null
          overlay_position?: string | null
          overlay_tagline?: string | null
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          voiceover_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          media_type?: string
          media_url?: string
          mime_type?: string | null
          overlay_headline?: string | null
          overlay_position?: string | null
          overlay_tagline?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          voiceover_url?: string | null
        }
        Relationships: []
      }
      book_orders: {
        Row: {
          admin_fee: number
          bestowal_amount: number
          bestower_id: string
          book_id: string
          city: string
          country: string
          created_at: string
          delivered_at: string | null
          delivery_notes: string | null
          email: string
          full_name: string
          id: string
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          phone: string | null
          postal_code: string
          shipped_at: string | null
          sower_id: string
          state: string
          street_address: string
          tithing_amount: number
          total_amount: number
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          admin_fee: number
          bestowal_amount: number
          bestower_id: string
          book_id: string
          city: string
          country: string
          created_at?: string
          delivered_at?: string | null
          delivery_notes?: string | null
          email: string
          full_name: string
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          phone?: string | null
          postal_code: string
          shipped_at?: string | null
          sower_id: string
          state: string
          street_address: string
          tithing_amount: number
          total_amount: number
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          admin_fee?: number
          bestowal_amount?: number
          bestower_id?: string
          book_id?: string
          city?: string
          country?: string
          created_at?: string
          delivered_at?: string | null
          delivery_notes?: string | null
          email?: string
          full_name?: string
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          phone?: string | null
          postal_code?: string
          shipped_at?: string | null
          sower_id?: string
          state?: string
          street_address?: string
          tithing_amount?: number
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_orders_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "sower_books"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_live_locations: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          revoked_at: string | null
          shared_by_user_id: string
          updated_at: string
          url: string
          url_host: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          revoked_at?: string | null
          shared_by_user_id: string
          updated_at?: string
          url: string
          url_host: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          revoked_at?: string | null
          shared_by_user_id?: string
          updated_at?: string
          url?: string
          url_host?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_live_locations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_ratings: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          id: string
          provider_replied_at: string | null
          provider_reply: string | null
          provider_user_id: string
          rater_user_id: string
          stars: number
          updated_at: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          id?: string
          provider_replied_at?: string | null
          provider_reply?: string | null
          provider_user_id: string
          rater_user_id: string
          stars: number
          updated_at?: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          provider_replied_at?: string | null
          provider_reply?: string | null
          provider_user_id?: string
          rater_user_id?: string
          stars?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_ratings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          accepted_at: string | null
          amount: number
          arrived_at: string | null
          booking_kind: string | null
          cancelled_at: string | null
          collected_at: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          currency: string
          declined_at: string | null
          ends_at: string | null
          eta_given_at: string | null
          eta_minutes: number | null
          expires_at: string
          grower_user_id: string
          id: string
          in_transit_at: string | null
          no_show_at: string | null
          no_show_fee: number | null
          note: string | null
          on_my_way_at: string | null
          payment_reference: string | null
          payment_status: string
          pillow_unit_id: string | null
          processor_fee: number | null
          product_id: string
          provider: string | null
          provider_nudged_at: string | null
          provider_order_id: string | null
          quantity: number
          rate_unit: string
          s2g_fee: number
          sower_user_id: string
          started_at: string | null
          starts_at: string
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          amount: number
          arrived_at?: string | null
          booking_kind?: string | null
          cancelled_at?: string | null
          collected_at?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          currency: string
          declined_at?: string | null
          ends_at?: string | null
          eta_given_at?: string | null
          eta_minutes?: number | null
          expires_at?: string
          grower_user_id: string
          id?: string
          in_transit_at?: string | null
          no_show_at?: string | null
          no_show_fee?: number | null
          note?: string | null
          on_my_way_at?: string | null
          payment_reference?: string | null
          payment_status?: string
          pillow_unit_id?: string | null
          processor_fee?: number | null
          product_id: string
          provider?: string | null
          provider_nudged_at?: string | null
          provider_order_id?: string | null
          quantity: number
          rate_unit: string
          s2g_fee: number
          sower_user_id: string
          started_at?: string | null
          starts_at: string
          status?: string
          total: number
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          amount?: number
          arrived_at?: string | null
          booking_kind?: string | null
          cancelled_at?: string | null
          collected_at?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          declined_at?: string | null
          ends_at?: string | null
          eta_given_at?: string | null
          eta_minutes?: number | null
          expires_at?: string
          grower_user_id?: string
          id?: string
          in_transit_at?: string | null
          no_show_at?: string | null
          no_show_fee?: number | null
          note?: string | null
          on_my_way_at?: string | null
          payment_reference?: string | null
          payment_status?: string
          pillow_unit_id?: string | null
          processor_fee?: number | null
          product_id?: string
          provider?: string | null
          provider_nudged_at?: string | null
          provider_order_id?: string | null
          quantity?: number
          rate_unit?: string
          s2g_fee?: number
          sower_user_id?: string
          started_at?: string | null
          starts_at?: string
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_pillow_unit_id_fkey"
            columns: ["pillow_unit_id"]
            isOneToOne: false
            referencedRelation: "pillow_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      books_income: {
        Row: {
          amount: number
          business_id: string
          buyer_reference: string | null
          created_at: string
          currency: string
          description: string
          id: string
          income_type: string
          item_id: string | null
          occurred_at: string
          payment_method: string | null
          platform_fee: number
          source_id: string
          source_table: string
        }
        Insert: {
          amount?: number
          business_id: string
          buyer_reference?: string | null
          created_at?: string
          currency?: string
          description: string
          id?: string
          income_type?: string
          item_id?: string | null
          occurred_at?: string
          payment_method?: string | null
          platform_fee?: number
          source_id: string
          source_table: string
        }
        Update: {
          amount?: number
          business_id?: string
          buyer_reference?: string | null
          created_at?: string
          currency?: string
          description?: string
          id?: string
          income_type?: string
          item_id?: string | null
          occurred_at?: string
          payment_method?: string | null
          platform_fee?: number
          source_id?: string
          source_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "books_income_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_income_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "books_items"
            referencedColumns: ["id"]
          },
        ]
      }
      books_items: {
        Row: {
          active: boolean
          book_id: string | null
          business_id: string
          created_at: string
          currency: string
          default_taxable: boolean
          description: string | null
          id: string
          kind: string
          name: string
          product_id: string | null
          sku: string | null
          source: string
          unit: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          book_id?: string | null
          business_id: string
          created_at?: string
          currency?: string
          default_taxable?: boolean
          description?: string | null
          id?: string
          kind?: string
          name: string
          product_id?: string | null
          sku?: string | null
          source?: string
          unit?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          book_id?: string | null
          business_id?: string
          created_at?: string
          currency?: string
          default_taxable?: boolean
          description?: string | null
          id?: string
          kind?: string
          name?: string
          product_id?: string | null
          sku?: string | null
          source?: string
          unit?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "books_items_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "sower_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_upload_jobs: {
        Row: {
          created_at: string
          error_rows: number
          file_name: string | null
          file_size_bytes: number | null
          file_type: string | null
          id: string
          parse_error: string | null
          parsed_rows: Json
          published_count: number
          scheduled_at: string | null
          sower_id: string | null
          status: string
          total_rows: number
          updated_at: string
          user_id: string
          valid_rows: number
        }
        Insert: {
          created_at?: string
          error_rows?: number
          file_name?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          parse_error?: string | null
          parsed_rows?: Json
          published_count?: number
          scheduled_at?: string | null
          sower_id?: string | null
          status?: string
          total_rows?: number
          updated_at?: string
          user_id: string
          valid_rows?: number
        }
        Update: {
          created_at?: string
          error_rows?: number
          file_name?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          parse_error?: string | null
          parsed_rows?: Json
          published_count?: number
          scheduled_at?: string | null
          sower_id?: string | null
          status?: string
          total_rows?: number
          updated_at?: string
          user_id?: string
          valid_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "bulk_upload_jobs_sower_id_fkey"
            columns: ["sower_id"]
            isOneToOne: false
            referencedRelation: "sowers"
            referencedColumns: ["id"]
          },
        ]
      }
      call_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          room_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          room_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          room_name?: string
          user_id?: string
        }
        Relationships: []
      }
      call_sessions: {
        Row: {
          accepted_at: string | null
          call_type: string
          caller_id: string
          created_at: string
          ended_at: string | null
          id: string
          receiver_id: string
          room_id: string | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          call_type: string
          caller_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          receiver_id: string
          room_id?: string | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          call_type?: string
          caller_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          receiver_id?: string
          room_id?: string | null
          status?: string
        }
        Relationships: []
      }
      chat_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: Database["public"]["Enums"]["file_type"]
          id: string
          mime_type: string | null
          room_id: string
          thumbnail_url: string | null
          uploader_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          file_type: Database["public"]["Enums"]["file_type"]
          id?: string
          mime_type?: string | null
          room_id: string
          thumbnail_url?: string | null
          uploader_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: Database["public"]["Enums"]["file_type"]
          id?: string
          mime_type?: string | null
          room_id?: string
          thumbnail_url?: string | null
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_files_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_join_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          room_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          room_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          room_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_join_requests_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          ai_generated: boolean | null
          content: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          embedding: string | null
          emotional_tone: string | null
          file_name: string | null
          file_size: number | null
          file_type: Database["public"]["Enums"]["file_type"] | null
          file_url: string | null
          id: string
          immutable_hash: string | null
          intent_tags: string[] | null
          is_edited: boolean
          message_type: string
          reply_to_id: string | null
          room_id: string
          sender_id: string | null
          sender_profile_id: string | null
          system_metadata: Json | null
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean | null
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          embedding?: string | null
          emotional_tone?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: Database["public"]["Enums"]["file_type"] | null
          file_url?: string | null
          id?: string
          immutable_hash?: string | null
          intent_tags?: string[] | null
          is_edited?: boolean
          message_type?: string
          reply_to_id?: string | null
          room_id: string
          sender_id?: string | null
          sender_profile_id?: string | null
          system_metadata?: Json | null
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean | null
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          embedding?: string | null
          emotional_tone?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: Database["public"]["Enums"]["file_type"] | null
          file_url?: string | null
          id?: string
          immutable_hash?: string | null
          intent_tags?: string[] | null
          is_edited?: boolean
          message_type?: string
          reply_to_id?: string | null
          room_id?: string
          sender_id?: string | null
          sender_profile_id?: string | null
          system_metadata?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          id: string
          is_active: boolean
          is_moderator: boolean
          joined_at: string
          kick_reason: string | null
          kicked_at: string | null
          kicked_by: string | null
          last_read_at: string | null
          notifications_muted: boolean
          profile_id: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          is_moderator?: boolean
          joined_at?: string
          kick_reason?: string | null
          kicked_at?: string | null
          kicked_by?: string | null
          last_read_at?: string | null
          notifications_muted?: boolean
          profile_id?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_active?: boolean
          is_moderator?: boolean
          joined_at?: string
          kick_reason?: string | null
          kicked_at?: string | null
          kicked_by?: string | null
          last_read_at?: string | null
          notifications_muted?: boolean
          profile_id?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_room_documents: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          room_id: string
          updated_at: string | null
          uploader_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          room_id: string
          updated_at?: string | null
          uploader_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          room_id?: string
          updated_at?: string | null
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_documents_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          access_description: string | null
          category: string | null
          created_at: string
          created_by: string
          current_listeners: number | null
          description: string | null
          id: string
          is_active: boolean
          is_premium: boolean | null
          is_system_room: boolean | null
          max_capacity: number | null
          max_participants: number | null
          metadata: Json | null
          name: string | null
          orchard_id: string | null
          premium_category:
            | Database["public"]["Enums"]["premium_room_category"]
            | null
          required_bestowal_amount: number | null
          room_features: Json | null
          room_type: Database["public"]["Enums"]["chat_room_type"]
          room_type_detailed:
            | Database["public"]["Enums"]["chat_room_type_enum"]
            | null
          updated_at: string
        }
        Insert: {
          access_description?: string | null
          category?: string | null
          created_at?: string
          created_by: string
          current_listeners?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_premium?: boolean | null
          is_system_room?: boolean | null
          max_capacity?: number | null
          max_participants?: number | null
          metadata?: Json | null
          name?: string | null
          orchard_id?: string | null
          premium_category?:
            | Database["public"]["Enums"]["premium_room_category"]
            | null
          required_bestowal_amount?: number | null
          room_features?: Json | null
          room_type?: Database["public"]["Enums"]["chat_room_type"]
          room_type_detailed?:
            | Database["public"]["Enums"]["chat_room_type_enum"]
            | null
          updated_at?: string
        }
        Update: {
          access_description?: string | null
          category?: string | null
          created_at?: string
          created_by?: string
          current_listeners?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_premium?: boolean | null
          is_system_room?: boolean | null
          max_capacity?: number | null
          max_participants?: number | null
          metadata?: Json | null
          name?: string | null
          orchard_id?: string | null
          premium_category?:
            | Database["public"]["Enums"]["premium_room_category"]
            | null
          required_bestowal_amount?: number | null
          room_features?: Json | null
          room_type?: Database["public"]["Enums"]["chat_room_type"]
          room_type_detailed?:
            | Database["public"]["Enums"]["chat_room_type_enum"]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_orchard_id_fkey"
            columns: ["orchard_id"]
            isOneToOne: false
            referencedRelation: "orchards"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_system_message_audit: {
        Row: {
          created_at: string
          id: string
          message_id: string | null
          message_type: string
          metadata: Json | null
          room_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message_id?: string | null
          message_type: string
          metadata?: Json | null
          room_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string | null
          message_type?: string
          metadata?: Json | null
          room_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_system_message_audit_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_system_message_audit_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_members: {
        Row: {
          added_by: string | null
          circle_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          circle_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          circle_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circles: {
        Row: {
          color: string
          created_at: string | null
          emoji: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          color: string
          created_at?: string | null
          emoji: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          emoji?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      classroom_invites: {
        Row: {
          created_at: string
          id: string
          invited_at: string
          invitee_id: string
          inviter_id: string
          message: string | null
          responded_at: string | null
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string
          invitee_id: string
          inviter_id: string
          message?: string | null
          responded_at?: string | null
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string
          invitee_id?: string
          inviter_id?: string
          message?: string | null
          responded_at?: string | null
          session_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      classroom_sessions: {
        Row: {
          attendance_mode: string
          chat_room_id: string | null
          circle_id: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          ended_at: string | null
          host_approved: boolean | null
          id: string
          instructor_id: string
          instructor_profile_id: string | null
          is_free: boolean | null
          max_participants: number | null
          pricing_type: string
          recording_url: string | null
          require_camera: boolean
          scheduled_at: string
          session_fee: number | null
          started_at: string | null
          status: string | null
          title: string
          updated_at: string | null
          whiteboard_data: Json | null
        }
        Insert: {
          attendance_mode?: string
          chat_room_id?: string | null
          circle_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          host_approved?: boolean | null
          id?: string
          instructor_id: string
          instructor_profile_id?: string | null
          is_free?: boolean | null
          max_participants?: number | null
          pricing_type?: string
          recording_url?: string | null
          require_camera?: boolean
          scheduled_at: string
          session_fee?: number | null
          started_at?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          whiteboard_data?: Json | null
        }
        Update: {
          attendance_mode?: string
          chat_room_id?: string | null
          circle_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          host_approved?: boolean | null
          id?: string
          instructor_id?: string
          instructor_profile_id?: string | null
          is_free?: boolean | null
          max_participants?: number | null
          pricing_type?: string
          recording_url?: string | null
          require_camera?: boolean
          scheduled_at?: string
          session_fee?: number | null
          started_at?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          whiteboard_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "classroom_sessions_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classroom_sessions_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classroom_sessions_instructor_profile_id_fkey"
            columns: ["instructor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classroom_sessions_instructor_profile_id_fkey"
            columns: ["instructor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      clubhouse_gifts: {
        Row: {
          amount: number
          created_at: string
          currency: string
          giver_id: string
          id: string
          message: string | null
          payment_reference: string | null
          payment_status: string
          receiver_id: string
          room_id: string
          session_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          giver_id: string
          id?: string
          message?: string | null
          payment_reference?: string | null
          payment_status?: string
          receiver_id: string
          room_id: string
          session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          giver_id?: string
          id?: string
          message?: string | null
          payment_reference?: string | null
          payment_status?: string
          receiver_id?: string
          room_id?: string
          session_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      communication_modes: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon: string
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      community_drivers: {
        Row: {
          background_check_status: string | null
          booking_score: number
          city: string | null
          contact_email: string
          contact_phone: string
          country: string | null
          created_at: string
          current_lat: number | null
          current_lng: number | null
          daily_max_km: number | null
          delivery_radius_km: number | null
          distance_unit: string | null
          driver_license_number: string | null
          earnings_balance: number | null
          full_name: string
          id: string
          insurance_doc_url: string | null
          is_online: boolean | null
          last_location_updated_at: string | null
          license_expiry: string | null
          license_plate: string | null
          max_cargo_kg: number | null
          max_passengers: number | null
          no_income_confirmed: boolean
          rating: number | null
          registration_doc_url: string | null
          service_areas: string[] | null
          status: string
          stripe_connect_account_id: string | null
          total_trips: number | null
          updated_at: string
          user_id: string
          vehicle_description: string
          vehicle_images: string[] | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_type: string
          vehicle_year: number | null
        }
        Insert: {
          background_check_status?: string | null
          booking_score?: number
          city?: string | null
          contact_email: string
          contact_phone: string
          country?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          daily_max_km?: number | null
          delivery_radius_km?: number | null
          distance_unit?: string | null
          driver_license_number?: string | null
          earnings_balance?: number | null
          full_name: string
          id?: string
          insurance_doc_url?: string | null
          is_online?: boolean | null
          last_location_updated_at?: string | null
          license_expiry?: string | null
          license_plate?: string | null
          max_cargo_kg?: number | null
          max_passengers?: number | null
          no_income_confirmed?: boolean
          rating?: number | null
          registration_doc_url?: string | null
          service_areas?: string[] | null
          status?: string
          stripe_connect_account_id?: string | null
          total_trips?: number | null
          updated_at?: string
          user_id: string
          vehicle_description: string
          vehicle_images?: string[] | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_type: string
          vehicle_year?: number | null
        }
        Update: {
          background_check_status?: string | null
          booking_score?: number
          city?: string | null
          contact_email?: string
          contact_phone?: string
          country?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          daily_max_km?: number | null
          delivery_radius_km?: number | null
          distance_unit?: string | null
          driver_license_number?: string | null
          earnings_balance?: number | null
          full_name?: string
          id?: string
          insurance_doc_url?: string | null
          is_online?: boolean | null
          last_location_updated_at?: string | null
          license_expiry?: string | null
          license_plate?: string | null
          max_cargo_kg?: number | null
          max_passengers?: number | null
          no_income_confirmed?: boolean
          rating?: number | null
          registration_doc_url?: string | null
          service_areas?: string[] | null
          status?: string
          stripe_connect_account_id?: string | null
          total_trips?: number | null
          updated_at?: string
          user_id?: string
          vehicle_description?: string
          vehicle_images?: string[] | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_type?: string
          vehicle_year?: number | null
        }
        Relationships: []
      }
      community_post_replies: {
        Row: {
          author_id: string
          author_profile_id: string | null
          content: string
          created_at: string | null
          downvotes: number | null
          id: string
          parent_reply_id: string | null
          post_id: string
          updated_at: string | null
          upvotes: number | null
        }
        Insert: {
          author_id: string
          author_profile_id?: string | null
          content: string
          created_at?: string | null
          downvotes?: number | null
          id?: string
          parent_reply_id?: string | null
          post_id: string
          updated_at?: string | null
          upvotes?: number | null
        }
        Update: {
          author_id?: string
          author_profile_id?: string | null
          content?: string
          created_at?: string | null
          downvotes?: number | null
          id?: string
          parent_reply_id?: string | null
          post_id?: string
          updated_at?: string | null
          upvotes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "community_post_replies_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_replies_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "community_post_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_votes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          reply_id: string | null
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          reply_id?: string | null
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          reply_id?: string | null
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_votes_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "community_post_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          author_profile_id: string | null
          circle_id: string
          content: string
          created_at: string | null
          downvotes: number | null
          id: string
          is_pinned: boolean | null
          media_urls: string[] | null
          reply_count: number | null
          title: string
          updated_at: string | null
          upvotes: number | null
        }
        Insert: {
          author_id: string
          author_profile_id?: string | null
          circle_id: string
          content: string
          created_at?: string | null
          downvotes?: number | null
          id?: string
          is_pinned?: boolean | null
          media_urls?: string[] | null
          reply_count?: number | null
          title: string
          updated_at?: string | null
          upvotes?: number | null
        }
        Update: {
          author_id?: string
          author_profile_id?: string | null
          circle_id?: string
          content?: string
          created_at?: string | null
          downvotes?: number | null
          id?: string
          is_pinned?: boolean | null
          media_urls?: string[] | null
          reply_count?: number | null
          title?: string
          updated_at?: string | null
          upvotes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_videos: {
        Row: {
          category: string | null
          comment_count: number | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          file_size: number | null
          id: string
          like_count: number | null
          orchard_id: string | null
          status: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          uploader_id: string
          uploader_profile_id: string | null
          video_url: string
          view_count: number | null
          wandering_role: string | null
        }
        Insert: {
          category?: string | null
          comment_count?: number | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          file_size?: number | null
          id?: string
          like_count?: number | null
          orchard_id?: string | null
          status?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          uploader_id: string
          uploader_profile_id?: string | null
          video_url: string
          view_count?: number | null
          wandering_role?: string | null
        }
        Update: {
          category?: string | null
          comment_count?: number | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          file_size?: number | null
          id?: string
          like_count?: number | null
          orchard_id?: string | null
          status?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          uploader_id?: string
          uploader_profile_id?: string | null
          video_url?: string
          view_count?: number | null
          wandering_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_videos_orchard_id_fkey"
            columns: ["orchard_id"]
            isOneToOne: false
            referencedRelation: "orchards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_videos_uploader_profile_id_fkey"
            columns: ["uploader_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_videos_uploader_profile_id_fkey"
            columns: ["uploader_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          about: string | null
          address: string | null
          ads_enabled: boolean
          banner_url: string | null
          books_activated_at: string | null
          books_enabled: boolean
          collect_address: string | null
          country: string | null
          created_at: string
          currency: string
          id: string
          is_default: boolean
          is_factory: boolean
          is_store: boolean
          is_verified: boolean
          kind: string | null
          location_lat: number | null
          location_lng: number | null
          logo_url: string | null
          name: string
          offers_collect: boolean | null
          offers_delivery: boolean | null
          owner_user_id: string
          registration_no: string | null
          slug: string
          store_categories: string[] | null
          store_tagline: string | null
          store_theme: Json | null
          tagline: string | null
          tier: Database["public"]["Enums"]["company_tier"]
          updated_at: string
          vat_no: string | null
          website: string | null
        }
        Insert: {
          about?: string | null
          address?: string | null
          ads_enabled?: boolean
          banner_url?: string | null
          books_activated_at?: string | null
          books_enabled?: boolean
          collect_address?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_default?: boolean
          is_factory?: boolean
          is_store?: boolean
          is_verified?: boolean
          kind?: string | null
          location_lat?: number | null
          location_lng?: number | null
          logo_url?: string | null
          name: string
          offers_collect?: boolean | null
          offers_delivery?: boolean | null
          owner_user_id: string
          registration_no?: string | null
          slug: string
          store_categories?: string[] | null
          store_tagline?: string | null
          store_theme?: Json | null
          tagline?: string | null
          tier?: Database["public"]["Enums"]["company_tier"]
          updated_at?: string
          vat_no?: string | null
          website?: string | null
        }
        Update: {
          about?: string | null
          address?: string | null
          ads_enabled?: boolean
          banner_url?: string | null
          books_activated_at?: string | null
          books_enabled?: boolean
          collect_address?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_default?: boolean
          is_factory?: boolean
          is_store?: boolean
          is_verified?: boolean
          kind?: string | null
          location_lat?: number | null
          location_lng?: number | null
          logo_url?: string | null
          name?: string
          offers_collect?: boolean | null
          offers_delivery?: boolean | null
          owner_user_id?: string
          registration_no?: string | null
          slug?: string
          store_categories?: string[] | null
          store_tagline?: string | null
          store_theme?: Json | null
          tagline?: string | null
          tier?: Database["public"]["Enums"]["company_tier"]
          updated_at?: string
          vat_no?: string | null
          website?: string | null
        }
        Relationships: []
      }
      companion_planting: {
        Row: {
          avoid: string[]
          benefits: string | null
          companions: string[]
          created_at: string
          plant: string
        }
        Insert: {
          avoid?: string[]
          benefits?: string | null
          companions?: string[]
          created_at?: string
          plant: string
        }
        Update: {
          avoid?: string[]
          benefits?: string | null
          companions?: string[]
          created_at?: string
          plant?: string
        }
        Relationships: []
      }
      content_flags: {
        Row: {
          ai_confidence: number | null
          auto_action_taken: string | null
          content_id: string
          content_type: string
          created_at: string
          detected_terms: string[] | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          status: string | null
          user_id: string
          violation_type: string
        }
        Insert: {
          ai_confidence?: number | null
          auto_action_taken?: string | null
          content_id: string
          content_type: string
          created_at?: string
          detected_terms?: string[] | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity: string
          status?: string | null
          user_id: string
          violation_type: string
        }
        Update: {
          ai_confidence?: number | null
          auto_action_taken?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          detected_terms?: string[] | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string | null
          user_id?: string
          violation_type?: string
        }
        Relationships: []
      }
      content_purchases: {
        Row: {
          base_amount: number
          buyer_id: string
          buyer_total_amount: number
          completed_at: string | null
          content_id: string
          content_type: string
          created_at: string
          currency: string
          id: string
          metadata: Json
          payment_reference: string | null
          payment_status: string
          payout_attempted_at: string | null
          payout_completed_at: string | null
          payout_currency: string | null
          payout_destination: string | null
          payout_error: string | null
          payout_fee_amount: number | null
          payout_provider: string | null
          payout_reference: string | null
          payout_status: string | null
          platform_fee_amount: number
          processor_fee_amount: number
          provider: string
          provider_order_id: string | null
          seller_id: string
          updated_at: string
        }
        Insert: {
          base_amount: number
          buyer_id: string
          buyer_total_amount: number
          completed_at?: string | null
          content_id: string
          content_type: string
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          payment_reference?: string | null
          payment_status?: string
          payout_attempted_at?: string | null
          payout_completed_at?: string | null
          payout_currency?: string | null
          payout_destination?: string | null
          payout_error?: string | null
          payout_fee_amount?: number | null
          payout_provider?: string | null
          payout_reference?: string | null
          payout_status?: string | null
          platform_fee_amount?: number
          processor_fee_amount?: number
          provider: string
          provider_order_id?: string | null
          seller_id: string
          updated_at?: string
        }
        Update: {
          base_amount?: number
          buyer_id?: string
          buyer_total_amount?: number
          completed_at?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          payment_reference?: string | null
          payment_status?: string
          payout_attempted_at?: string | null
          payout_completed_at?: string | null
          payout_currency?: string | null
          payout_destination?: string | null
          payout_error?: string | null
          payout_fee_amount?: number | null
          payout_provider?: string | null
          payout_reference?: string | null
          payout_status?: string | null
          platform_fee_amount?: number
          processor_fee_amount?: number
          provider?: string
          provider_order_id?: string | null
          seller_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_user_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_user_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_user_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      council_decisions: {
        Row: {
          created_at: string
          decision_type: string
          entity_id: string | null
          entity_type: string | null
          id: string
          notes: string | null
          seat_id: string
          user_id: string
          vote: string
        }
        Insert: {
          created_at?: string
          decision_type: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          notes?: string | null
          seat_id: string
          user_id: string
          vote: string
        }
        Update: {
          created_at?: string
          decision_type?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          notes?: string | null
          seat_id?: string
          user_id?: string
          vote?: string
        }
        Relationships: [
          {
            foreignKeyName: "council_decisions_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "elder_council_seats"
            referencedColumns: ["id"]
          },
        ]
      }
      country_currency: {
        Row: {
          alpha2: string
          country_name: string
          currency_code: string
        }
        Insert: {
          alpha2: string
          country_name: string
          currency_code: string
        }
        Update: {
          alpha2?: string
          country_name?: string
          currency_code?: string
        }
        Relationships: []
      }
      courier_deliveries: {
        Row: {
          bestowal_id: string
          bestower_signature: string | null
          courier_id: string
          created_at: string
          delivery_confirmed: boolean | null
          delivery_confirmed_at: string | null
          delivery_notes: string | null
          delivery_photo_url: string | null
          id: string
          orchard_id: string
          pickup_confirmed: boolean | null
          pickup_confirmed_at: string | null
          pickup_notes: string | null
          pickup_photo_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          bestowal_id: string
          bestower_signature?: string | null
          courier_id: string
          created_at?: string
          delivery_confirmed?: boolean | null
          delivery_confirmed_at?: string | null
          delivery_notes?: string | null
          delivery_photo_url?: string | null
          id?: string
          orchard_id: string
          pickup_confirmed?: boolean | null
          pickup_confirmed_at?: string | null
          pickup_notes?: string | null
          pickup_photo_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          bestowal_id?: string
          bestower_signature?: string | null
          courier_id?: string
          created_at?: string
          delivery_confirmed?: boolean | null
          delivery_confirmed_at?: string | null
          delivery_notes?: string | null
          delivery_photo_url?: string | null
          id?: string
          orchard_id?: string
          pickup_confirmed?: boolean | null
          pickup_confirmed_at?: string | null
          pickup_notes?: string | null
          pickup_photo_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courier_deliveries_bestowal_id_fkey"
            columns: ["bestowal_id"]
            isOneToOne: true
            referencedRelation: "bestowals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courier_deliveries_orchard_id_fkey"
            columns: ["orchard_id"]
            isOneToOne: false
            referencedRelation: "orchards"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_payout_transfers: {
        Row: {
          amount: number
          amount_usd: number | null
          cluster: string
          created_at: string
          created_by: string | null
          destination_address: string
          destination_tag: number | null
          error_message: string | null
          fx_rate: number | null
          fx_sources: Json | null
          id: string
          network: string
          recipient_user_id: string | null
          reference: string | null
          status: string
          tx_hash: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          amount_usd?: number | null
          cluster: string
          created_at?: string
          created_by?: string | null
          destination_address: string
          destination_tag?: number | null
          error_message?: string | null
          fx_rate?: number | null
          fx_sources?: Json | null
          id?: string
          network: string
          recipient_user_id?: string | null
          reference?: string | null
          status?: string
          tx_hash?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_usd?: number | null
          cluster?: string
          created_at?: string
          created_by?: string | null
          destination_address?: string
          destination_tag?: number | null
          error_message?: string | null
          fx_rate?: number | null
          fx_sources?: Json | null
          id?: string
          network?: string
          recipient_user_id?: string | null
          reference?: string | null
          status?: string
          tx_hash?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      curated_calendar_photos: {
        Row: {
          created_at: string
          id: string
          label: string | null
          public_url: string
          scriptural_month: number | null
          season: string
          slot: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          public_url: string
          scriptural_month?: number | null
          season: string
          slot: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          public_url?: string
          scriptural_month?: number | null
          season?: string
          slot?: number
          storage_path?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          archived_at: string | null
          business_id: string
          created_at: string
          default_tax_profile_id: string | null
          email: string | null
          id: string
          invite_expires_at: string | null
          invite_token: string | null
          member_user_id: string | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          business_id: string
          created_at?: string
          default_tax_profile_id?: string | null
          email?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          member_user_id?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          business_id?: string
          created_at?: string
          default_tax_profile_id?: string | null
          email?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          member_user_id?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dj_music_tracks: {
        Row: {
          artist_name: string | null
          bpm: number | null
          cover_image_url: string | null
          created_at: string
          dj_id: string
          duration_seconds: number | null
          file_size: number | null
          file_url: string
          genre: string | null
          id: string
          is_explicit: boolean | null
          is_original: boolean | null
          is_public: boolean | null
          music_genre: string | null
          music_mood: string | null
          preview_url: string | null
          price: number | null
          radio_eligible: boolean
          radio_opted_in_at: string | null
          tags: string[] | null
          track_title: string
          track_type: string
          updated_at: string
          upload_date: string
          wandering_role: string | null
        }
        Insert: {
          artist_name?: string | null
          bpm?: number | null
          cover_image_url?: string | null
          created_at?: string
          dj_id: string
          duration_seconds?: number | null
          file_size?: number | null
          file_url: string
          genre?: string | null
          id?: string
          is_explicit?: boolean | null
          is_original?: boolean | null
          is_public?: boolean | null
          music_genre?: string | null
          music_mood?: string | null
          preview_url?: string | null
          price?: number | null
          radio_eligible?: boolean
          radio_opted_in_at?: string | null
          tags?: string[] | null
          track_title: string
          track_type?: string
          updated_at?: string
          upload_date?: string
          wandering_role?: string | null
        }
        Update: {
          artist_name?: string | null
          bpm?: number | null
          cover_image_url?: string | null
          created_at?: string
          dj_id?: string
          duration_seconds?: number | null
          file_size?: number | null
          file_url?: string
          genre?: string | null
          id?: string
          is_explicit?: boolean | null
          is_original?: boolean | null
          is_public?: boolean | null
          music_genre?: string | null
          music_mood?: string | null
          preview_url?: string | null
          price?: number | null
          radio_eligible?: boolean
          radio_opted_in_at?: string | null
          tags?: string[] | null
          track_title?: string
          track_type?: string
          updated_at?: string
          upload_date?: string
          wandering_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_dj_music_tracks_dj_id"
            columns: ["dj_id"]
            isOneToOne: false
            referencedRelation: "radio_djs"
            referencedColumns: ["id"]
          },
        ]
      }
      dj_playlist_tracks: {
        Row: {
          created_at: string
          fade_in_seconds: number | null
          fade_out_seconds: number | null
          id: string
          is_active: boolean | null
          playlist_id: string
          start_time_seconds: number | null
          track_id: string
          track_order: number
        }
        Insert: {
          created_at?: string
          fade_in_seconds?: number | null
          fade_out_seconds?: number | null
          id?: string
          is_active?: boolean | null
          playlist_id: string
          start_time_seconds?: number | null
          track_id: string
          track_order: number
        }
        Update: {
          created_at?: string
          fade_in_seconds?: number | null
          fade_out_seconds?: number | null
          id?: string
          is_active?: boolean | null
          playlist_id?: string
          start_time_seconds?: number | null
          track_id?: string
          track_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_dj_playlist_tracks_playlist_id"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "dj_playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dj_playlist_tracks_track_id"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "dj_music_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      dj_playlists: {
        Row: {
          created_at: string
          description: string | null
          dj_id: string
          id: string
          is_public: boolean | null
          playlist_name: string
          playlist_type: string
          total_duration_seconds: number | null
          track_count: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          dj_id: string
          id?: string
          is_public?: boolean | null
          playlist_name: string
          playlist_type?: string
          total_duration_seconds?: number | null
          track_count?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          dj_id?: string
          id?: string
          is_public?: boolean | null
          playlist_name?: string
          playlist_type?: string
          total_duration_seconds?: number | null
          track_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_dj_playlists_dj_id"
            columns: ["dj_id"]
            isOneToOne: false
            referencedRelation: "radio_djs"
            referencedColumns: ["id"]
          },
        ]
      }
      dj_track_payout_wallets: {
        Row: {
          created_at: string
          track_id: string
          updated_at: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          track_id: string
          updated_at?: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          track_id?: string
          updated_at?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "dj_track_payout_wallets_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: true
            referencedRelation: "dj_music_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      document_annotations: {
        Row: {
          annotation_type: string
          content: string | null
          created_at: string
          document_id: string
          id: string
          page_number: number
          user_id: string
          x_position: number | null
          y_position: number | null
        }
        Insert: {
          annotation_type?: string
          content?: string | null
          created_at?: string
          document_id: string
          id?: string
          page_number?: number
          user_id: string
          x_position?: number | null
          y_position?: number | null
        }
        Update: {
          annotation_type?: string
          content?: string | null
          created_at?: string
          document_id?: string
          id?: string
          page_number?: number
          user_id?: string
          x_position?: number | null
          y_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_annotations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "session_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_events: {
        Row: {
          actor: string
          actor_ref: string | null
          created_at: string
          document_id: string
          document_kind: string
          event: string
          from_state: string | null
          id: string
          notes: string | null
          to_state: string | null
        }
        Insert: {
          actor: string
          actor_ref?: string | null
          created_at?: string
          document_id: string
          document_kind: string
          event: string
          from_state?: string | null
          id?: string
          notes?: string | null
          to_state?: string | null
        }
        Update: {
          actor?: string
          actor_ref?: string | null
          created_at?: string
          document_id?: string
          document_kind?: string
          event?: string
          from_state?: string | null
          id?: string
          notes?: string | null
          to_state?: string | null
        }
        Relationships: []
      }
      driver_quote_requests: {
        Row: {
          created_at: string
          driver_id: string
          dropoff_location: string
          id: string
          item_description: string
          notes: string | null
          pickup_location: string
          preferred_date: string | null
          preferred_time: string | null
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          dropoff_location: string
          id?: string
          item_description: string
          notes?: string | null
          pickup_location: string
          preferred_date?: string | null
          preferred_time?: string | null
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          dropoff_location?: string
          id?: string
          item_description?: string
          notes?: string | null
          pickup_location?: string
          preferred_date?: string | null
          preferred_time?: string | null
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_quote_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "community_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_quotes: {
        Row: {
          created_at: string
          currency: string
          driver_id: string
          estimated_duration: string | null
          id: string
          message: string | null
          quote_amount: number
          request_id: string
          status: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          driver_id: string
          estimated_duration?: string | null
          id?: string
          message?: string | null
          quote_amount: number
          request_id: string
          status?: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          driver_id?: string
          estimated_duration?: string | null
          id?: string
          message?: string | null
          quote_amount?: number
          request_id?: string
          status?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_quotes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "community_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "driver_quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      elder_council_seats: {
        Row: {
          id: string
          is_active: boolean
          notes: string | null
          seat_type: string
          seated_at: string
          seated_by: string | null
          term_ends_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          notes?: string | null
          seat_type?: string
          seated_at?: string
          seated_by?: string | null
          term_ends_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          is_active?: boolean
          notes?: string | null
          seat_type?: string
          seated_at?: string
          seated_by?: string | null
          term_ends_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      employee_contracts: {
        Row: {
          business_id: string
          employee_id: string
          file_path: string
          id: string
          parse_status: string
          parsed_terms: Json
          uploaded_at: string
        }
        Insert: {
          business_id: string
          employee_id: string
          file_path: string
          id?: string
          parse_status?: string
          parsed_terms?: Json
          uploaded_at?: string
        }
        Update: {
          business_id?: string
          employee_id?: string
          file_path?: string
          id?: string
          parse_status?: string
          parsed_terms?: Json
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_contracts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_contracts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean
          business_id: string
          created_at: string
          hourly_rate: number | null
          hours_per_month: number | null
          id: string
          monthly_salary: number | null
          name: string
          pay_type: string
          role: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_id: string
          created_at?: string
          hourly_rate?: number | null
          hours_per_month?: number | null
          id?: string
          monthly_salary?: number | null
          name: string
          pay_type?: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_id?: string
          created_at?: string
          hourly_rate?: number | null
          hours_per_month?: number | null
          id?: string
          monthly_salary?: number | null
          name?: string
          pay_type?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          component_stack: string | null
          created_at: string
          error_id: string | null
          error_message: string
          error_name: string | null
          error_stack: string | null
          id: string
          timestamp: string
          url: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          component_stack?: string | null
          created_at?: string
          error_id?: string | null
          error_message: string
          error_name?: string | null
          error_stack?: string | null
          id?: string
          timestamp?: string
          url: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          component_stack?: string | null
          created_at?: string
          error_id?: string | null
          error_message?: string
          error_name?: string | null
          error_stack?: string | null
          id?: string
          timestamp?: string
          url?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      escrow_events: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          amount: number | null
          bestowal_id: string
          created_at: string
          event: string
          from_status: string | null
          id: string
          notes: string | null
          to_status: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          amount?: number | null
          bestowal_id: string
          created_at?: string
          event: string
          from_status?: string | null
          id?: string
          notes?: string | null
          to_status?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          amount?: number | null
          bestowal_id?: string
          created_at?: string
          event?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escrow_events_bestowal_id_fkey"
            columns: ["bestowal_id"]
            isOneToOne: false
            referencedRelation: "product_bestowals"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          approval_expires_at: string | null
          approved_at: string | null
          approved_by_email: string | null
          business_id: string
          created_at: string
          currency_display: string
          customer_id: string
          id: string
          job_notes_id: string
          number: string
          public_token: string
          rejected_at: string | null
          rejected_reason: string | null
          sent_at: string | null
          status: string
          subtotal: number
          tax_total: number
          total: number
          updated_at: string
        }
        Insert: {
          approval_expires_at?: string | null
          approved_at?: string | null
          approved_by_email?: string | null
          business_id: string
          created_at?: string
          currency_display?: string
          customer_id: string
          id?: string
          job_notes_id: string
          number: string
          public_token?: string
          rejected_at?: string | null
          rejected_reason?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Update: {
          approval_expires_at?: string | null
          approved_at?: string | null
          approved_by_email?: string | null
          business_id?: string
          created_at?: string
          currency_display?: string
          customer_id?: string
          id?: string
          job_notes_id?: string
          number?: string
          public_token?: string
          rejected_at?: string | null
          rejected_reason?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_job_notes_id_fkey"
            columns: ["job_notes_id"]
            isOneToOne: false
            referencedRelation: "job_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          currency: string
          updated_at: string
          usd_rate: number
        }
        Insert: {
          currency: string
          updated_at?: string
          usd_rate: number
        }
        Update: {
          currency?: string
          updated_at?: string
          usd_rate?: number
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          business_id: string
          category: string
          created_at: string
          currency: string
          description: string
          id: string
          linked_income_id: string | null
          merchant: string | null
          receipt_image_path: string | null
          source: string
          source_id: string | null
          source_table: string | null
          spent_on: string | null
        }
        Insert: {
          amount?: number
          business_id: string
          category?: string
          created_at?: string
          currency?: string
          description: string
          id?: string
          linked_income_id?: string | null
          merchant?: string | null
          receipt_image_path?: string | null
          source?: string
          source_id?: string | null
          source_table?: string | null
          spent_on?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          category?: string
          created_at?: string
          currency?: string
          description?: string
          id?: string
          linked_income_id?: string | null
          merchant?: string | null
          receipt_image_path?: string | null
          source?: string
          source_id?: string | null
          source_table?: string | null
          spent_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_linked_income_id_fkey"
            columns: ["linked_income_id"]
            isOneToOne: false
            referencedRelation: "books_income"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string
          feature: string
          id: string
          period: string | null
          price_usd: number | null
          source: string
          source_ref: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          feature: string
          id?: string
          period?: string | null
          price_usd?: number | null
          source?: string
          source_ref?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          feature?: string
          id?: string
          period?: string | null
          price_usd?: number | null
          source?: string
          source_ref?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      follower_notifications: {
        Row: {
          created_at: string
          follower_id: string
          id: string
          read: boolean | null
          source_id: string | null
          source_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          id?: string
          read?: boolean | null
          source_id?: string | null
          source_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          id?: string
          read?: boolean | null
          source_id?: string | null
          source_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      followers: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
          source_id: string | null
          source_type: string | null
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
          source_id?: string | null
          source_type?: string | null
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
          source_id?: string | null
          source_type?: string | null
        }
        Relationships: []
      }
      function_invocations: {
        Row: {
          created_at: string
          error_message: string | null
          function_name: string
          id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          function_name: string
          id?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          function_name?: string
          id?: string
        }
        Relationships: []
      }
      garden_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          crop_key: string | null
          gregorian_date: string | null
          id: string
          moon_element: string | null
          moon_phase: string | null
          notes: string | null
          photo_url: string | null
          user_id: string
          yhwh_day: number | null
          yhwh_month: number | null
          yhwh_year: number | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          crop_key?: string | null
          gregorian_date?: string | null
          id?: string
          moon_element?: string | null
          moon_phase?: string | null
          notes?: string | null
          photo_url?: string | null
          user_id: string
          yhwh_day?: number | null
          yhwh_month?: number | null
          yhwh_year?: number | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          crop_key?: string | null
          gregorian_date?: string | null
          id?: string
          moon_element?: string | null
          moon_phase?: string | null
          notes?: string | null
          photo_url?: string | null
          user_id?: string
          yhwh_day?: number | null
          yhwh_month?: number | null
          yhwh_year?: number | null
        }
        Relationships: []
      }
      garden_profiles: {
        Row: {
          city: string | null
          created_at: string | null
          hardiness_zone: string | null
          hemisphere: string | null
          id: string
          latitude: number | null
          longitude: number | null
          soil_ph: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          hardiness_zone?: string | null
          hemisphere?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          soil_ph?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string | null
          hardiness_zone?: string | null
          hemisphere?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          soil_ph?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gathering_moderators: {
        Row: {
          added_at: string
          added_by: string
          host_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          added_by: string
          host_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          added_by?: string
          host_id?: string
          user_id?: string
        }
        Relationships: []
      }
      gathering_sessions: {
        Row: {
          access: string
          board_state: Json
          created_at: string
          ended_at: string | null
          host_id: string
          id: string
          jitsi_room: string | null
          music_state: Json
          queue_state: Json
          seed_id: string
          updated_at: string
        }
        Insert: {
          access?: string
          board_state?: Json
          created_at?: string
          ended_at?: string | null
          host_id: string
          id?: string
          jitsi_room?: string | null
          music_state?: Json
          queue_state?: Json
          seed_id: string
          updated_at?: string
        }
        Update: {
          access?: string
          board_state?: Json
          created_at?: string
          ended_at?: string | null
          host_id?: string
          id?: string
          jitsi_room?: string | null
          music_state?: Json
          queue_state?: Json
          seed_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      gathering_song_requests: {
        Row: {
          id: string
          requested_at: string
          requested_by: string
          session_id: string
          song_id: string
          status: string
        }
        Insert: {
          id?: string
          requested_at?: string
          requested_by: string
          session_id: string
          song_id: string
          status?: string
        }
        Update: {
          id?: string
          requested_at?: string
          requested_by?: string
          session_id?: string
          song_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gathering_song_requests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gathering_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gathering_song_requests_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "dj_music_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      geocode_cache: {
        Row: {
          created_at: string
          display_name: string | null
          hit_count: number
          last_used_at: string
          lat: number
          lng: number
          provider: string
          query_norm: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          hit_count?: number
          last_used_at?: string
          lat: number
          lng: number
          provider?: string
          query_norm: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          hit_count?: number
          last_used_at?: string
          lat?: number
          lng?: number
          provider?: string
          query_norm?: string
        }
        Relationships: []
      }
      gig_bookings: {
        Row: {
          actual_distance_km: number | null
          actual_duration_min: number | null
          admin_fee_amount: number | null
          booking_dates: string[] | null
          booking_type: Database["public"]["Enums"]["booking_type"]
          cancellation_reason: string | null
          created_at: string | null
          customer_id: string
          customer_notes: string | null
          dropoff_address: string | null
          dropoff_datetime: string | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          estimated_distance_km: number | null
          estimated_duration_min: number | null
          estimated_fare: number | null
          final_fare: number | null
          id: string
          is_multi_day: boolean | null
          is_round_trip: boolean | null
          parent_booking_id: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          pickup_address: string | null
          pickup_datetime: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          platform_fee_amount: number | null
          provider_earnings: number | null
          provider_id: string
          provider_notes: string | null
          provider_type: string
          return_dropoff_datetime: string | null
          return_pickup_datetime: string | null
          service_details: Json | null
          status: Database["public"]["Enums"]["booking_status"] | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
        }
        Insert: {
          actual_distance_km?: number | null
          actual_duration_min?: number | null
          admin_fee_amount?: number | null
          booking_dates?: string[] | null
          booking_type: Database["public"]["Enums"]["booking_type"]
          cancellation_reason?: string | null
          created_at?: string | null
          customer_id: string
          customer_notes?: string | null
          dropoff_address?: string | null
          dropoff_datetime?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          estimated_distance_km?: number | null
          estimated_duration_min?: number | null
          estimated_fare?: number | null
          final_fare?: number | null
          id?: string
          is_multi_day?: boolean | null
          is_round_trip?: boolean | null
          parent_booking_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          pickup_address?: string | null
          pickup_datetime?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          platform_fee_amount?: number | null
          provider_earnings?: number | null
          provider_id: string
          provider_notes?: string | null
          provider_type: string
          return_dropoff_datetime?: string | null
          return_pickup_datetime?: string | null
          service_details?: Json | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_distance_km?: number | null
          actual_duration_min?: number | null
          admin_fee_amount?: number | null
          booking_dates?: string[] | null
          booking_type?: Database["public"]["Enums"]["booking_type"]
          cancellation_reason?: string | null
          created_at?: string | null
          customer_id?: string
          customer_notes?: string | null
          dropoff_address?: string | null
          dropoff_datetime?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          estimated_distance_km?: number | null
          estimated_duration_min?: number | null
          estimated_fare?: number | null
          final_fare?: number | null
          id?: string
          is_multi_day?: boolean | null
          is_round_trip?: boolean | null
          parent_booking_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          pickup_address?: string | null
          pickup_datetime?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          platform_fee_amount?: number | null
          provider_earnings?: number | null
          provider_id?: string
          provider_notes?: string | null
          provider_type?: string
          return_dropoff_datetime?: string | null
          return_pickup_datetime?: string | null
          service_details?: Json | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gig_bookings_parent_booking_id_fkey"
            columns: ["parent_booking_id"]
            isOneToOne: false
            referencedRelation: "gig_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      gig_live_tracking: {
        Row: {
          accuracy: number | null
          booking_id: string
          heading: number | null
          id: string
          lat: number
          lng: number
          provider_id: string
          recorded_at: string | null
          speed: number | null
          status: Database["public"]["Enums"]["tracking_status"]
        }
        Insert: {
          accuracy?: number | null
          booking_id: string
          heading?: number | null
          id?: string
          lat: number
          lng: number
          provider_id: string
          recorded_at?: string | null
          speed?: number | null
          status: Database["public"]["Enums"]["tracking_status"]
        }
        Update: {
          accuracy?: number | null
          booking_id?: string
          heading?: number | null
          id?: string
          lat?: number
          lng?: number
          provider_id?: string
          recorded_at?: string | null
          speed?: number | null
          status?: Database["public"]["Enums"]["tracking_status"]
        }
        Relationships: [
          {
            foreignKeyName: "gig_live_tracking_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "gig_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      gig_transactions: {
        Row: {
          amount: number
          booking_id: string | null
          breakdown: Json | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          status: string | null
          stripe_transaction_id: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          breakdown?: Json | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          status?: string | null
          stripe_transaction_id?: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          breakdown?: Json | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          status?: string | null
          stripe_transaction_id?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gig_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "gig_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      gosat_alerts: {
        Row: {
          alert_type: string
          created_at: string
          flag_id: string
          id: string
          is_read: boolean | null
          priority: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          flag_id: string
          id?: string
          is_read?: boolean | null
          priority?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          flag_id?: string
          id?: string
          is_read?: boolean | null
          priority?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gosat_alerts_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "content_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      gosat_insights: {
        Row: {
          access_tier: string
          actioned_at: string | null
          actioned_by: string | null
          created_at: string
          details: Json | null
          expires_at: string | null
          id: string
          insight_type: string
          is_actionable: boolean | null
          related_room_ids: string[] | null
          related_user_ids: string[] | null
          severity: string | null
          summary: string | null
          title: string
        }
        Insert: {
          access_tier?: string
          actioned_at?: string | null
          actioned_by?: string | null
          created_at?: string
          details?: Json | null
          expires_at?: string | null
          id?: string
          insight_type?: string
          is_actionable?: boolean | null
          related_room_ids?: string[] | null
          related_user_ids?: string[] | null
          severity?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          access_tier?: string
          actioned_at?: string | null
          actioned_by?: string | null
          created_at?: string
          details?: Json | null
          expires_at?: string | null
          id?: string
          insight_type?: string
          is_actionable?: boolean | null
          related_room_ids?: string[] | null
          related_user_ids?: string[] | null
          severity?: string | null
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "gosat_insights_actioned_by_fkey"
            columns: ["actioned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gosat_insights_actioned_by_fkey"
            columns: ["actioned_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      gosat_radio_roundup_sent: {
        Row: {
          sent_at: string
          track_count: number
          user_id: string
        }
        Insert: {
          sent_at?: string
          track_count?: number
          user_id: string
        }
        Update: {
          sent_at?: string
          track_count?: number
          user_id?: string
        }
        Relationships: []
      }
      grove_message_queue: {
        Row: {
          agent_slug: string
          attempts: number
          body: string
          created_at: string
          delivered_at: string | null
          delivery_error: string | null
          id: string
          metadata: Json
          recipient_id: string
          scheduled_for: string
        }
        Insert: {
          agent_slug: string
          attempts?: number
          body: string
          created_at?: string
          delivered_at?: string | null
          delivery_error?: string | null
          id?: string
          metadata?: Json
          recipient_id: string
          scheduled_for?: string
        }
        Update: {
          agent_slug?: string
          attempts?: number
          body?: string
          created_at?: string
          delivered_at?: string | null
          delivery_error?: string | null
          id?: string
          metadata?: Json
          recipient_id?: string
          scheduled_for?: string
        }
        Relationships: []
      }
      grove_relationship_scores: {
        Row: {
          bestower_id: string
          consecutive_support: number
          last_session_at: string | null
          marked_core_by_sower: boolean
          notes: string | null
          sessions_attended: number
          sower_id: string
          tier: string
          total_bestowed: number
          updated_at: string
        }
        Insert: {
          bestower_id: string
          consecutive_support?: number
          last_session_at?: string | null
          marked_core_by_sower?: boolean
          notes?: string | null
          sessions_attended?: number
          sower_id: string
          tier?: string
          total_bestowed?: number
          updated_at?: string
        }
        Update: {
          bestower_id?: string
          consecutive_support?: number
          last_session_at?: string | null
          marked_core_by_sower?: boolean
          notes?: string | null
          sessions_attended?: number
          sower_id?: string
          tier?: string
          total_bestowed?: number
          updated_at?: string
        }
        Relationships: []
      }
      grove_session_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          session_id: string
          session_kind: string
          sower_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          session_id: string
          session_kind: string
          sower_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          session_id?: string
          session_kind?: string
          sower_id?: string
        }
        Relationships: []
      }
      hand_seed_details: {
        Row: {
          availability: boolean
          background_check_by: string | null
          background_check_declared: boolean
          base_lat: number | null
          base_lng: number | null
          base_location: string | null
          created_at: string
          currency: string
          front_image_url: string | null
          gallery_urls: string[]
          is_professional: boolean
          languages: string[]
          licence_number: string | null
          operator_confirmed_at: string
          operator_confirmed_legal: boolean
          product_id: string
          qualification: string | null
          rate_callout: number | null
          rate_daily: number | null
          rate_hourly: number | null
          rate_monthly: number | null
          rate_per_job: number | null
          rate_per_km: number | null
          rate_weekly: number | null
          service_category: Database["public"]["Enums"]["hand_service_category"]
          service_radius_m: number | null
          updated_at: string
          work_sample_image_url: string | null
          years_experience: number
        }
        Insert: {
          availability?: boolean
          background_check_by?: string | null
          background_check_declared?: boolean
          base_lat?: number | null
          base_lng?: number | null
          base_location?: string | null
          created_at?: string
          currency: string
          front_image_url?: string | null
          gallery_urls?: string[]
          is_professional?: boolean
          languages?: string[]
          licence_number?: string | null
          operator_confirmed_at?: string
          operator_confirmed_legal: boolean
          product_id: string
          qualification?: string | null
          rate_callout?: number | null
          rate_daily?: number | null
          rate_hourly?: number | null
          rate_monthly?: number | null
          rate_per_job?: number | null
          rate_per_km?: number | null
          rate_weekly?: number | null
          service_category: Database["public"]["Enums"]["hand_service_category"]
          service_radius_m?: number | null
          updated_at?: string
          work_sample_image_url?: string | null
          years_experience: number
        }
        Update: {
          availability?: boolean
          background_check_by?: string | null
          background_check_declared?: boolean
          base_lat?: number | null
          base_lng?: number | null
          base_location?: string | null
          created_at?: string
          currency?: string
          front_image_url?: string | null
          gallery_urls?: string[]
          is_professional?: boolean
          languages?: string[]
          licence_number?: string | null
          operator_confirmed_at?: string
          operator_confirmed_legal?: boolean
          product_id?: string
          qualification?: string | null
          rate_callout?: number | null
          rate_daily?: number | null
          rate_hourly?: number | null
          rate_monthly?: number | null
          rate_per_job?: number | null
          rate_per_km?: number | null
          rate_weekly?: number | null
          service_category?: Database["public"]["Enums"]["hand_service_category"]
          service_radius_m?: number | null
          updated_at?: string
          work_sample_image_url?: string | null
          years_experience?: number
        }
        Relationships: [
          {
            foreignKeyName: "hand_seed_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      hand_seed_references: {
        Row: {
          contact: string
          created_at: string
          id: string
          product_id: string
          referee_name: string
          relationship: string | null
        }
        Insert: {
          contact: string
          created_at?: string
          id?: string
          product_id: string
          referee_name: string
          relationship?: string | null
        }
        Update: {
          contact?: string
          created_at?: string
          id?: string
          product_id?: string
          referee_name?: string
          relationship?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hand_seed_references_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligent_listing_sessions: {
        Row: {
          analytics_events: Json
          approvals: Json
          created_at: string
          current_stage: string
          debian_copy: Json
          fedora_story: Json
          final_product_id: string | null
          id: string
          kali_media: Json
          loaf_logistics: Json
          mint_payment: Json
          parsed_details: Json
          published_at: string | null
          raw_description: string
          sage_pricing: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          analytics_events?: Json
          approvals?: Json
          created_at?: string
          current_stage?: string
          debian_copy?: Json
          fedora_story?: Json
          final_product_id?: string | null
          id?: string
          kali_media?: Json
          loaf_logistics?: Json
          mint_payment?: Json
          parsed_details?: Json
          published_at?: string | null
          raw_description: string
          sage_pricing?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          analytics_events?: Json
          approvals?: Json
          created_at?: string
          current_stage?: string
          debian_copy?: Json
          fedora_story?: Json
          final_product_id?: string | null
          id?: string
          kali_media?: Json
          loaf_logistics?: Json
          mint_payment?: Json
          parsed_details?: Json
          published_at?: string | null
          raw_description?: string
          sage_pricing?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoice_payments: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          environment: string
          fee_amount: number | null
          id: string
          invoice_id: string
          payer_email: string | null
          payer_user_id: string | null
          payment_reference: string | null
          payout_completed_at: string | null
          payout_error: string | null
          payout_status: string
          processor_fee: number | null
          provider_order_id: string | null
          rail: string
          status: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          environment: string
          fee_amount?: number | null
          id?: string
          invoice_id: string
          payer_email?: string | null
          payer_user_id?: string | null
          payment_reference?: string | null
          payout_completed_at?: string | null
          payout_error?: string | null
          payout_status?: string
          processor_fee?: number | null
          provider_order_id?: string | null
          rail: string
          status?: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          environment?: string
          fee_amount?: number | null
          id?: string
          invoice_id?: string
          payer_email?: string | null
          payer_user_id?: string | null
          payment_reference?: string | null
          payout_completed_at?: string | null
          payout_error?: string | null
          payout_status?: string
          processor_fee?: number | null
          provider_order_id?: string | null
          rail?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due: number | null
          amount_paid: number
          business_id: string
          created_at: string
          currency_display: string
          customer_id: string
          due_at: string | null
          estimate_id: string
          id: string
          job_notes_id: string
          kind: string
          linked_schedule_item_id: string | null
          notes_to_customer: string | null
          number: string
          paid_at: string | null
          public_token: string
          sent_at: string | null
          status: string
          subtotal: number
          tax_total: number
          total: number
          updated_at: string
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          amount_due?: number | null
          amount_paid?: number
          business_id: string
          created_at?: string
          currency_display?: string
          customer_id: string
          due_at?: string | null
          estimate_id: string
          id?: string
          job_notes_id: string
          kind?: string
          linked_schedule_item_id?: string | null
          notes_to_customer?: string | null
          number: string
          paid_at?: string | null
          public_token?: string
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          amount_due?: number | null
          amount_paid?: number
          business_id?: string
          created_at?: string
          currency_display?: string
          customer_id?: string
          due_at?: string | null
          estimate_id?: string
          id?: string
          job_notes_id?: string
          kind?: string
          linked_schedule_item_id?: string | null
          notes_to_customer?: string | null
          number?: string
          paid_at?: string | null
          public_token?: string
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_notes_id_fkey"
            columns: ["job_notes_id"]
            isOneToOne: false
            referencedRelation: "job_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_linked_schedule_item_id_fkey"
            columns: ["linked_schedule_item_id"]
            isOneToOne: false
            referencedRelation: "payment_schedule_items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_brand_assignments: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_brand_assignments_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "sower_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      job_events: {
        Row: {
          actor: string
          actor_ref: string | null
          created_at: string
          event_type: string
          from_state: string | null
          id: string
          job_notes_id: string
          notes: string | null
          to_state: string | null
        }
        Insert: {
          actor: string
          actor_ref?: string | null
          created_at?: string
          event_type: string
          from_state?: string | null
          id?: string
          job_notes_id: string
          notes?: string | null
          to_state?: string | null
        }
        Update: {
          actor?: string
          actor_ref?: string | null
          created_at?: string
          event_type?: string
          from_state?: string | null
          id?: string
          job_notes_id?: string
          notes?: string | null
          to_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_events_job_notes_id_fkey"
            columns: ["job_notes_id"]
            isOneToOne: false
            referencedRelation: "job_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      job_notes: {
        Row: {
          assigned_to_member_id: string | null
          business_id: string
          chat_channel_id: string | null
          created_at: string
          date_needed: string | null
          description: string | null
          id: string
          location: string | null
          notes_to_supplier: string | null
          sower_user_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to_member_id?: string | null
          business_id: string
          chat_channel_id?: string | null
          created_at?: string
          date_needed?: string | null
          description?: string | null
          id?: string
          location?: string | null
          notes_to_supplier?: string | null
          sower_user_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to_member_id?: string | null
          business_id?: string
          chat_channel_id?: string | null
          created_at?: string
          date_needed?: string | null
          description?: string | null
          id?: string
          location?: string | null
          notes_to_supplier?: string | null
          sower_user_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_notes_chat_channel_id_fkey"
            columns: ["chat_channel_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          ai_prompt: string | null
          answered_prayers: Json | null
          content: string | null
          created_at: string
          dream_entry: string | null
          fasting_type: string | null
          feast: string | null
          gratitude: string | null
          gregorian_date: string
          id: string
          images: string[] | null
          is_shabbat: boolean | null
          is_special_day: boolean | null
          is_tequvah: boolean | null
          mood: string | null
          part_of_yowm: number | null
          prayer_requests: Json | null
          prophetic_words: string[] | null
          recipes: Json | null
          special_day_person: string | null
          special_day_type: string | null
          tags: string[] | null
          tithes_offerings: Json | null
          updated_at: string
          user_id: string
          videos: string[] | null
          voice_notes: string[] | null
          watch: number | null
          water_intake: number | null
          yhwh_day: number
          yhwh_day_of_year: number | null
          yhwh_month: number
          yhwh_weekday: number | null
          yhwh_year: number
        }
        Insert: {
          ai_prompt?: string | null
          answered_prayers?: Json | null
          content?: string | null
          created_at?: string
          dream_entry?: string | null
          fasting_type?: string | null
          feast?: string | null
          gratitude?: string | null
          gregorian_date: string
          id?: string
          images?: string[] | null
          is_shabbat?: boolean | null
          is_special_day?: boolean | null
          is_tequvah?: boolean | null
          mood?: string | null
          part_of_yowm?: number | null
          prayer_requests?: Json | null
          prophetic_words?: string[] | null
          recipes?: Json | null
          special_day_person?: string | null
          special_day_type?: string | null
          tags?: string[] | null
          tithes_offerings?: Json | null
          updated_at?: string
          user_id: string
          videos?: string[] | null
          voice_notes?: string[] | null
          watch?: number | null
          water_intake?: number | null
          yhwh_day: number
          yhwh_day_of_year?: number | null
          yhwh_month: number
          yhwh_weekday?: number | null
          yhwh_year: number
        }
        Update: {
          ai_prompt?: string | null
          answered_prayers?: Json | null
          content?: string | null
          created_at?: string
          dream_entry?: string | null
          fasting_type?: string | null
          feast?: string | null
          gratitude?: string | null
          gregorian_date?: string
          id?: string
          images?: string[] | null
          is_shabbat?: boolean | null
          is_special_day?: boolean | null
          is_tequvah?: boolean | null
          mood?: string | null
          part_of_yowm?: number | null
          prayer_requests?: Json | null
          prophetic_words?: string[] | null
          recipes?: Json | null
          special_day_person?: string | null
          special_day_type?: string | null
          tags?: string[] | null
          tithes_offerings?: Json | null
          updated_at?: string
          user_id?: string
          videos?: string[] | null
          voice_notes?: string[] | null
          watch?: number | null
          water_intake?: number | null
          yhwh_day?: number
          yhwh_day_of_year?: number | null
          yhwh_month?: number
          yhwh_weekday?: number | null
          yhwh_year?: number
        }
        Relationships: []
      }
      line_items: {
        Row: {
          books_item_id: string | null
          created_at: string
          description: string
          estimate_id: string
          id: string
          line_total: number | null
          position: number
          quantity: number
          tax_rate_percent: number
          taxable: boolean
          unit: string | null
          unit_price: number
        }
        Insert: {
          books_item_id?: string | null
          created_at?: string
          description: string
          estimate_id: string
          id?: string
          line_total?: number | null
          position?: number
          quantity?: number
          tax_rate_percent?: number
          taxable?: boolean
          unit?: string | null
          unit_price?: number
        }
        Update: {
          books_item_id?: string | null
          created_at?: string
          description?: string
          estimate_id?: string
          id?: string
          line_total?: number | null
          position?: number
          quantity?: number
          tax_rate_percent?: number
          taxable?: boolean
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "line_items_books_item_id_fkey"
            columns: ["books_item_id"]
            isOneToOne: false
            referencedRelation: "books_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "line_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      linux_family_activity_log: {
        Row: {
          activity_type: string
          agent_name: string
          created_at: string
          id: string
          message: string
          metadata: Json | null
          seed_id: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          agent_name: string
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          seed_id?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          agent_name?: string
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          seed_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      linux_family_agents: {
        Row: {
          agent_name: string
          created_at: string
          enabled: boolean
          id: string
          last_activity_at: string | null
          persona_overrides: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_name: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_activity_at?: string | null
          persona_overrides?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_name?: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_activity_at?: string | null
          persona_overrides?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      linux_family_call_log: {
        Row: {
          call_type: string
          counterparty_user_id: string | null
          created_at: string
          direction: string
          duration_seconds: number | null
          id: string
          jitsi_room: string | null
          notes: string | null
          outcome: string | null
          seed_id: string | null
          transcript: string | null
          user_id: string
        }
        Insert: {
          call_type?: string
          counterparty_user_id?: string | null
          created_at?: string
          direction: string
          duration_seconds?: number | null
          id?: string
          jitsi_room?: string | null
          notes?: string | null
          outcome?: string | null
          seed_id?: string | null
          transcript?: string | null
          user_id: string
        }
        Update: {
          call_type?: string
          counterparty_user_id?: string | null
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          id?: string
          jitsi_room?: string | null
          notes?: string | null
          outcome?: string | null
          seed_id?: string | null
          transcript?: string | null
          user_id?: string
        }
        Relationships: []
      }
      linux_family_memory: {
        Row: {
          agent_name: string
          created_at: string
          id: string
          memory_key: string
          memory_value: Json
          seed_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_name: string
          created_at?: string
          id?: string
          memory_key: string
          memory_value?: Json
          seed_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_name?: string
          created_at?: string
          id?: string
          memory_key?: string
          memory_value?: Json
          seed_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      linux_family_outbound_messages: {
        Row: {
          agent_name: string
          channel: string
          created_at: string
          id: string
          message_body: string
          message_type: string
          recipient_room_id: string | null
          recipient_user_id: string | null
          replied_at: string | null
          reply_text: string | null
          seed_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          agent_name?: string
          channel?: string
          created_at?: string
          id?: string
          message_body: string
          message_type?: string
          recipient_room_id?: string | null
          recipient_user_id?: string | null
          replied_at?: string | null
          reply_text?: string | null
          seed_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          agent_name?: string
          channel?: string
          created_at?: string
          id?: string
          message_body?: string
          message_type?: string
          recipient_room_id?: string | null
          recipient_user_id?: string | null
          replied_at?: string | null
          reply_text?: string | null
          seed_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      linux_family_social_connections: {
        Row: {
          account_handle: string | null
          created_at: string
          id: string
          is_connected: boolean
          metadata: Json | null
          platform: string
          secret_ref: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_handle?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          metadata?: Json | null
          platform: string
          secret_ref?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_handle?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          metadata?: Json | null
          platform?: string
          secret_ref?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      linux_family_suggestions: {
        Row: {
          agent_name: string
          created_at: string
          description: string
          expires_at: string | null
          id: string
          proposed_action: Json
          responded_at: string | null
          seed_id: string | null
          status: string
          suggestion_type: string
          title: string
          user_id: string
        }
        Insert: {
          agent_name: string
          created_at?: string
          description: string
          expires_at?: string | null
          id?: string
          proposed_action?: Json
          responded_at?: string | null
          seed_id?: string | null
          status?: string
          suggestion_type: string
          title: string
          user_id: string
        }
        Update: {
          agent_name?: string
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          proposed_action?: Json
          responded_at?: string | null
          seed_id?: string | null
          status?: string
          suggestion_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      linux_family_tasks: {
        Row: {
          agent_name: string
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          payload: Json
          result: Json | null
          seed_id: string | null
          started_at: string | null
          status: string
          task_type: string
          user_id: string
        }
        Insert: {
          agent_name: string
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          result?: Json | null
          seed_id?: string | null
          started_at?: string | null
          status?: string
          task_type: string
          user_id: string
        }
        Update: {
          agent_name?: string
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          result?: Json | null
          seed_id?: string | null
          started_at?: string | null
          status?: string
          task_type?: string
          user_id?: string
        }
        Relationships: []
      }
      listing_subcategories: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          listing_type: string
          owner_user_id: string
          subcategory_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          listing_type: string
          owner_user_id: string
          subcategory_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          listing_type?: string
          owner_user_id?: string
          subcategory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_subcategories_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "marketplace_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_tags: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          listing_type: string
          owner_user_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          listing_type: string
          owner_user_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          listing_type?: string
          owner_user_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "marketplace_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      live_call_participants: {
        Row: {
          call_session_id: string
          created_at: string
          hand_raised_at: string | null
          id: string
          is_active: boolean
          is_muted: boolean
          joined_at: string
          queue_position: number | null
          recorded_at: string | null
          role: string
          updated_at: string
          user_id: string
          voice_memo_duration: number | null
          voice_memo_url: string | null
        }
        Insert: {
          call_session_id: string
          created_at?: string
          hand_raised_at?: string | null
          id?: string
          is_active?: boolean
          is_muted?: boolean
          joined_at?: string
          queue_position?: number | null
          recorded_at?: string | null
          role?: string
          updated_at?: string
          user_id: string
          voice_memo_duration?: number | null
          voice_memo_url?: string | null
        }
        Update: {
          call_session_id?: string
          created_at?: string
          hand_raised_at?: string | null
          id?: string
          is_active?: boolean
          is_muted?: boolean
          joined_at?: string
          queue_position?: number | null
          recorded_at?: string | null
          role?: string
          updated_at?: string
          user_id?: string
          voice_memo_duration?: number | null
          voice_memo_url?: string | null
        }
        Relationships: []
      }
      live_room_messages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          media_duration_seconds: number | null
          media_url: string | null
          message_type: string
          mime_type: string | null
          room_id: string
          sender_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          media_duration_seconds?: number | null
          media_url?: string | null
          message_type: string
          mime_type?: string | null
          room_id: string
          sender_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          media_duration_seconds?: number | null
          media_url?: string | null
          message_type?: string
          mime_type?: string | null
          room_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_room_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "live_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      live_room_moderators: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          room_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          room_id: string
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: []
      }
      live_room_participants: {
        Row: {
          display_name: string
          hand_raised: boolean | null
          id: string
          is_audio_enabled: boolean | null
          is_video_enabled: boolean | null
          joined_at: string | null
          role: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          display_name: string
          hand_raised?: boolean | null
          id?: string
          is_audio_enabled?: boolean | null
          is_video_enabled?: boolean | null
          joined_at?: string | null
          role?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          display_name?: string
          hand_raised?: boolean | null
          id?: string
          is_audio_enabled?: boolean | null
          is_video_enabled?: boolean | null
          joined_at?: string | null
          role?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: []
      }
      live_rooms: {
        Row: {
          created_at: string | null
          created_by: string
          current_participants: number | null
          description: string | null
          id: string
          is_active: boolean | null
          max_participants: number | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          current_participants?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          current_participants?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      live_session_media: {
        Row: {
          created_at: string
          duration_seconds: number | null
          feedback: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          media_type: string
          metadata: Json | null
          mime_type: string
          price_cents: number | null
          score: number | null
          scored_at: string | null
          scored_by: string | null
          session_id: string
          submission_role: string
          updated_at: string
          uploader_id: string
          watermarked: boolean | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          feedback?: string | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          media_type: string
          metadata?: Json | null
          mime_type: string
          price_cents?: number | null
          score?: number | null
          scored_at?: string | null
          scored_by?: string | null
          session_id: string
          submission_role?: string
          updated_at?: string
          uploader_id: string
          watermarked?: boolean | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          feedback?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          media_type?: string
          metadata?: Json | null
          mime_type?: string
          price_cents?: number | null
          score?: number | null
          scored_at?: string | null
          scored_by?: string | null
          session_id?: string
          submission_role?: string
          updated_at?: string
          uploader_id?: string
          watermarked?: boolean | null
        }
        Relationships: []
      }
      live_session_media_purchases: {
        Row: {
          buyer_id: string
          created_at: string
          delivered_at: string | null
          expires_at: string
          id: string
          media_id: string
          payment_method: string
          payment_reference: string | null
          payment_status: string
          price_paid_cents: number
          seller_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          delivered_at?: string | null
          expires_at?: string
          id?: string
          media_id: string
          payment_method: string
          payment_reference?: string | null
          payment_status?: string
          price_paid_cents: number
          seller_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          delivered_at?: string | null
          expires_at?: string
          id?: string
          media_id?: string
          payment_method?: string
          payment_reference?: string | null
          payment_status?: string
          price_paid_cents?: number
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_session_media_purchases_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "live_session_media"
            referencedColumns: ["id"]
          },
        ]
      }
      live_session_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          message_type: string
          metadata: Json | null
          sender_id: string
          sender_type: string
          session_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_type?: string
          metadata?: Json | null
          sender_id: string
          sender_type?: string
          session_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_type?: string
          metadata?: Json | null
          sender_id?: string
          sender_type?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      live_session_participants: {
        Row: {
          audio_enabled: boolean | null
          can_speak: boolean | null
          check_in_required_at: string | null
          check_in_responded_at: string | null
          created_at: string
          hand_raised: boolean
          hand_raised_at: string | null
          hands_raised_count: number
          id: string
          join_request_approved: boolean | null
          joined_at: string | null
          last_ping_at: string | null
          left_at: string | null
          missed_check_ins: number
          participant_type: string
          presence_status: string
          session_id: string
          status: string
          total_active_seconds: number
          total_away_seconds: number
          updated_at: string
          user_id: string
          video_enabled: boolean | null
        }
        Insert: {
          audio_enabled?: boolean | null
          can_speak?: boolean | null
          check_in_required_at?: string | null
          check_in_responded_at?: string | null
          created_at?: string
          hand_raised?: boolean
          hand_raised_at?: string | null
          hands_raised_count?: number
          id?: string
          join_request_approved?: boolean | null
          joined_at?: string | null
          last_ping_at?: string | null
          left_at?: string | null
          missed_check_ins?: number
          participant_type?: string
          presence_status?: string
          session_id: string
          status?: string
          total_active_seconds?: number
          total_away_seconds?: number
          updated_at?: string
          user_id: string
          video_enabled?: boolean | null
        }
        Update: {
          audio_enabled?: boolean | null
          can_speak?: boolean | null
          check_in_required_at?: string | null
          check_in_responded_at?: string | null
          created_at?: string
          hand_raised?: boolean
          hand_raised_at?: string | null
          hands_raised_count?: number
          id?: string
          join_request_approved?: boolean | null
          joined_at?: string | null
          last_ping_at?: string | null
          left_at?: string | null
          missed_check_ins?: number
          participant_type?: string
          presence_status?: string
          session_id?: string
          status?: string
          total_active_seconds?: number
          total_away_seconds?: number
          updated_at?: string
          user_id?: string
          video_enabled?: boolean | null
        }
        Relationships: []
      }
      live_streams: {
        Row: {
          created_at: string
          description: string | null
          ended_at: string | null
          hls_url: string | null
          id: string
          quality: string
          recorded_at: string | null
          recording_url: string | null
          rtmp_url: string | null
          started_at: string
          status: string
          stream_key: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          total_views: number | null
          updated_at: string
          user_id: string
          viewer_count: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          hls_url?: string | null
          id?: string
          quality?: string
          recorded_at?: string | null
          recording_url?: string | null
          rtmp_url?: string | null
          started_at?: string
          status?: string
          stream_key?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          total_views?: number | null
          updated_at?: string
          user_id: string
          viewer_count?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          hls_url?: string | null
          id?: string
          quality?: string
          recorded_at?: string | null
          recording_url?: string | null
          rtmp_url?: string | null
          started_at?: string
          status?: string
          stream_key?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          total_views?: number | null
          updated_at?: string
          user_id?: string
          viewer_count?: number | null
        }
        Relationships: []
      }
      marketplace_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          label: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          label: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          label?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      marketplace_subcategories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          slug: string
          sort_order: number
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          slug: string
          sort_order?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "marketplace_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_tags: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          label: string
          required_credential_type: string | null
          requires_verification: boolean
          slug: string
          sort_order: number
          tag_group: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          required_credential_type?: string | null
          requires_verification?: boolean
          slug: string
          sort_order?: number
          tag_group: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          required_credential_type?: string | null
          requires_verification?: boolean
          slug?: string
          sort_order?: number
          tag_group?: string
        }
        Relationships: []
      }
      media_moderation: {
        Row: {
          bucket_id: string | null
          created_at: string
          id: string
          minor_suspected: boolean
          model_version: string | null
          needs_review: boolean
          object_path: string | null
          reason: string | null
          review_action: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          scores: Json | null
          subject_ref: string | null
          subject_type: string
          uploader_user_id: string
          verdict: string
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string
          id?: string
          minor_suspected?: boolean
          model_version?: string | null
          needs_review?: boolean
          object_path?: string | null
          reason?: string | null
          review_action?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scores?: Json | null
          subject_ref?: string | null
          subject_type?: string
          uploader_user_id: string
          verdict: string
        }
        Update: {
          bucket_id?: string | null
          created_at?: string
          id?: string
          minor_suspected?: boolean
          model_version?: string | null
          needs_review?: boolean
          object_path?: string | null
          reason?: string | null
          review_action?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scores?: Json | null
          subject_ref?: string | null
          subject_type?: string
          uploader_user_id?: string
          verdict?: string
        }
        Relationships: []
      }
      memry_bookmarks: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memry_bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "memry_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      memry_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memry_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "memry_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      memry_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memry_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "memry_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      memry_posts: {
        Row: {
          caption: string | null
          comments_count: number
          content_category: string | null
          content_type: string
          created_at: string
          id: string
          likes_count: number
          media_url: string
          recipe_ingredients: string[] | null
          recipe_instructions: string | null
          recipe_title: string | null
          study_id: string | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          comments_count?: number
          content_category?: string | null
          content_type: string
          created_at?: string
          id?: string
          likes_count?: number
          media_url: string
          recipe_ingredients?: string[] | null
          recipe_instructions?: string | null
          recipe_title?: string | null
          study_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          comments_count?: number
          content_category?: string | null
          content_type?: string
          created_at?: string
          id?: string
          likes_count?: number
          media_url?: string
          recipe_ingredients?: string[] | null
          recipe_instructions?: string | null
          recipe_title?: string | null
          study_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memry_posts_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "s2g_library_items"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_pairings: {
        Row: {
          cadence: string
          created_at: string
          focus_area: string
          id: string
          match_reasoning: string | null
          match_score: number | null
          mentee_id: string
          mentee_timezone: string | null
          mentor_id: string
          mentor_timezone: string | null
          responded_at: string | null
          room_id: string | null
          status: string
          suggested_at: string
          updated_at: string
        }
        Insert: {
          cadence?: string
          created_at?: string
          focus_area: string
          id?: string
          match_reasoning?: string | null
          match_score?: number | null
          mentee_id: string
          mentee_timezone?: string | null
          mentor_id: string
          mentor_timezone?: string | null
          responded_at?: string | null
          room_id?: string | null
          status?: string
          suggested_at?: string
          updated_at?: string
        }
        Update: {
          cadence?: string
          created_at?: string
          focus_area?: string
          id?: string
          match_reasoning?: string | null
          match_score?: number | null
          mentee_id?: string
          mentee_timezone?: string | null
          mentor_id?: string
          mentor_timezone?: string | null
          responded_at?: string | null
          room_id?: string | null
          status?: string
          suggested_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_pairings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      message_streaks: {
        Row: {
          id: string
          last_message_date: string | null
          streak_days: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          last_message_date?: string | null
          streak_days?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          last_message_date?: string | null
          streak_days?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      moderation_word_lists: {
        Row: {
          category: string
          id: string
          is_active: boolean | null
          severity: string | null
          updated_at: string
          words: string[]
        }
        Insert: {
          category: string
          id?: string
          is_active?: boolean | null
          severity?: string | null
          updated_at?: string
          words?: string[]
        }
        Update: {
          category?: string
          id?: string
          is_active?: boolean | null
          severity?: string | null
          updated_at?: string
          words?: string[]
        }
        Relationships: []
      }
      moon_phase_gardening: {
        Row: {
          best_for: string | null
          created_at: string
          phase: string
          what_to_avoid: string | null
          what_to_do: string
        }
        Insert: {
          best_for?: string | null
          created_at?: string
          phase: string
          what_to_avoid?: string | null
          what_to_do: string
        }
        Update: {
          best_for?: string | null
          created_at?: string
          phase?: string
          what_to_avoid?: string | null
          what_to_do?: string
        }
        Relationships: []
      }
      music_purchases: {
        Row: {
          admin_amount: number | null
          amount: number
          artist_amount: number | null
          buyer_id: string
          created_at: string
          delivered_at: string | null
          id: string
          payment_reference: string | null
          payment_status: string
          platform_amount: number | null
          platform_fee: number
          sow2grow_fee: number
          total_amount: number
          track_id: string
          updated_at: string
        }
        Insert: {
          admin_amount?: number | null
          amount?: number
          artist_amount?: number | null
          buyer_id: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          payment_reference?: string | null
          payment_status?: string
          platform_amount?: number | null
          platform_fee?: number
          sow2grow_fee?: number
          total_amount: number
          track_id: string
          updated_at?: string
        }
        Update: {
          admin_amount?: number | null
          amount?: number
          artist_amount?: number | null
          buyer_id?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          payment_reference?: string | null
          payment_status?: string
          platform_amount?: number | null
          platform_fee?: number
          sow2grow_fee?: number
          total_amount?: number
          track_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      orchard_blessings: {
        Row: {
          created_at: string
          granted_by_seat_id: string
          granted_by_user_id: string
          id: string
          message: string | null
          orchard_id: string
        }
        Insert: {
          created_at?: string
          granted_by_seat_id: string
          granted_by_user_id: string
          id?: string
          message?: string | null
          orchard_id: string
        }
        Update: {
          created_at?: string
          granted_by_seat_id?: string
          granted_by_user_id?: string
          id?: string
          message?: string | null
          orchard_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orchard_blessings_granted_by_seat_id_fkey"
            columns: ["granted_by_seat_id"]
            isOneToOne: false
            referencedRelation: "elder_council_seats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orchard_blessings_orchard_id_fkey"
            columns: ["orchard_id"]
            isOneToOne: false
            referencedRelation: "orchards"
            referencedColumns: ["id"]
          },
        ]
      }
      orchard_events: {
        Row: {
          actor_id: string | null
          actor_role: string
          amount: number | null
          created_at: string
          event: string
          from_state: string | null
          holding_id: string | null
          id: string
          notes: string | null
          orchard_id: string
          to_state: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string
          amount?: number | null
          created_at?: string
          event: string
          from_state?: string | null
          holding_id?: string | null
          id?: string
          notes?: string | null
          orchard_id: string
          to_state?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: string
          amount?: number | null
          created_at?: string
          event?: string
          from_state?: string | null
          holding_id?: string | null
          id?: string
          notes?: string | null
          orchard_id?: string
          to_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orchard_events_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "orchard_holdings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orchard_events_orchard_id_fkey"
            columns: ["orchard_id"]
            isOneToOne: false
            referencedRelation: "orchards"
            referencedColumns: ["id"]
          },
        ]
      }
      orchard_holdings: {
        Row: {
          bestowal_id: string
          bestower_user_id: string
          created_at: string
          delivery_address: Json | null
          gross_amount: number
          id: string
          location: string
          orchard_id: string
          payer_address: string | null
          payer_source: string | null
          pocket_type: string | null
          pockets: number
          processor_fee: number
          rail: string
          rail_reference: string | null
          refund_id: string | null
          s2g_amount: number
          sower_amount: number
          status: string
          updated_at: string
        }
        Insert: {
          bestowal_id: string
          bestower_user_id: string
          created_at?: string
          delivery_address?: Json | null
          gross_amount: number
          id?: string
          location?: string
          orchard_id: string
          payer_address?: string | null
          payer_source?: string | null
          pocket_type?: string | null
          pockets: number
          processor_fee?: number
          rail: string
          rail_reference?: string | null
          refund_id?: string | null
          s2g_amount: number
          sower_amount: number
          status?: string
          updated_at?: string
        }
        Update: {
          bestowal_id?: string
          bestower_user_id?: string
          created_at?: string
          delivery_address?: Json | null
          gross_amount?: number
          id?: string
          location?: string
          orchard_id?: string
          payer_address?: string | null
          payer_source?: string | null
          pocket_type?: string | null
          pockets?: number
          processor_fee?: number
          rail?: string
          rail_reference?: string | null
          refund_id?: string | null
          s2g_amount?: number
          sower_amount?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orchard_holdings_bestowal_id_fkey"
            columns: ["bestowal_id"]
            isOneToOne: true
            referencedRelation: "bestowals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orchard_holdings_orchard_id_fkey"
            columns: ["orchard_id"]
            isOneToOne: false
            referencedRelation: "orchards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orchard_holdings_refund_fk"
            columns: ["refund_id"]
            isOneToOne: false
            referencedRelation: "orchard_refunds"
            referencedColumns: ["id"]
          },
        ]
      }
      orchard_likes: {
        Row: {
          created_at: string
          id: string
          orchard_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          orchard_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          orchard_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orchard_likes_orchard_id_fkey"
            columns: ["orchard_id"]
            isOneToOne: false
            referencedRelation: "orchards"
            referencedColumns: ["id"]
          },
        ]
      }
      orchard_payouts: {
        Row: {
          created_at: string
          orchard_id: string
          recipient_pubkey: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          orchard_id: string
          recipient_pubkey?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          orchard_id?: string
          recipient_pubkey?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orchard_payouts_orchard_id_fkey"
            columns: ["orchard_id"]
            isOneToOne: true
            referencedRelation: "orchards"
            referencedColumns: ["id"]
          },
        ]
      }
      orchard_refunds: {
        Row: {
          amount: number
          attempts: number
          bestower_user_id: string
          claimed_at: string | null
          confirmed_at: string | null
          created_at: string
          destination: string | null
          environment: string
          fee_cost: number
          holding_id: string
          id: string
          last_error: string | null
          orchard_id: string
          rail: string
          rail_reference: string | null
          sent_at: string | null
          status: string
          updated_at: string
          written_off_by: string | null
          written_off_reason: string | null
        }
        Insert: {
          amount: number
          attempts?: number
          bestower_user_id: string
          claimed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          destination?: string | null
          environment: string
          fee_cost?: number
          holding_id: string
          id?: string
          last_error?: string | null
          orchard_id: string
          rail: string
          rail_reference?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          written_off_by?: string | null
          written_off_reason?: string | null
        }
        Update: {
          amount?: number
          attempts?: number
          bestower_user_id?: string
          claimed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          destination?: string | null
          environment?: string
          fee_cost?: number
          holding_id?: string
          id?: string
          last_error?: string | null
          orchard_id?: string
          rail?: string
          rail_reference?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          written_off_by?: string | null
          written_off_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orchard_refunds_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: true
            referencedRelation: "orchard_holdings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orchard_refunds_orchard_id_fkey"
            columns: ["orchard_id"]
            isOneToOne: false
            referencedRelation: "orchards"
            referencedColumns: ["id"]
          },
        ]
      }
      orchard_release_payments: {
        Row: {
          amount: number
          attempts: number
          claimed_at: string | null
          created_at: string
          destination: string
          environment: string
          id: string
          label: string
          last_error: string | null
          orchard_id: string
          paid_at: string | null
          paid_by_gosat: string | null
          rail: string
          reference: string | null
          release_id: string | null
          status: string
          updated_at: string
          voided_by: string | null
          voided_reason: string | null
        }
        Insert: {
          amount: number
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          destination: string
          environment: string
          id?: string
          label: string
          last_error?: string | null
          orchard_id: string
          paid_at?: string | null
          paid_by_gosat?: string | null
          rail?: string
          reference?: string | null
          release_id?: string | null
          status?: string
          updated_at?: string
          voided_by?: string | null
          voided_reason?: string | null
        }
        Update: {
          amount?: number
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          destination?: string
          environment?: string
          id?: string
          label?: string
          last_error?: string | null
          orchard_id?: string
          paid_at?: string | null
          paid_by_gosat?: string | null
          rail?: string
          reference?: string | null
          release_id?: string | null
          status?: string
          updated_at?: string
          voided_by?: string | null
          voided_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orchard_release_payments_orchard_id_fkey"
            columns: ["orchard_id"]
            isOneToOne: false
            referencedRelation: "orchards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orchard_release_payments_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "orchard_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      orchard_releases: {
        Row: {
          environments: Json
          gift_units: number
          gross_total: number
          holdings_count: number
          id: string
          orchard_id: string
          pockets: number
          release_trigger: string
          released_at: string
          released_by: string | null
          s2g_total: number
          sower_total: number
          sower_user_id: string | null
        }
        Insert: {
          environments?: Json
          gift_units?: number
          gross_total: number
          holdings_count: number
          id?: string
          orchard_id: string
          pockets: number
          release_trigger: string
          released_at?: string
          released_by?: string | null
          s2g_total: number
          sower_total: number
          sower_user_id?: string | null
        }
        Update: {
          environments?: Json
          gift_units?: number
          gross_total?: number
          holdings_count?: number
          id?: string
          orchard_id?: string
          pockets?: number
          release_trigger?: string
          released_at?: string
          released_by?: string | null
          s2g_total?: number
          sower_total?: number
          sower_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orchard_releases_orchard_id_fkey"
            columns: ["orchard_id"]
            isOneToOne: true
            referencedRelation: "orchards"
            referencedColumns: ["id"]
          },
        ]
      }
      orchard_stock: {
        Row: {
          created_at: string
          id: string
          note: string | null
          orchard_id: string
          release_id: string | null
          sower_user_id: string
          units: number
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          orchard_id: string
          release_id?: string | null
          sower_user_id: string
          units: number
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          orchard_id?: string
          release_id?: string | null
          sower_user_id?: string
          units?: number
        }
        Relationships: [
          {
            foreignKeyName: "orchard_stock_orchard_id_fkey"
            columns: ["orchard_id"]
            isOneToOne: false
            referencedRelation: "orchards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orchard_stock_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "orchard_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      orchards: {
        Row: {
          allow_commission_marketing: boolean | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          category: string
          commission_rate: number | null
          community_impact: string | null
          company_id: string
          completion_rate: number | null
          courier_cost: number | null
          created_at: string
          currency: string
          description: string
          expected_completion: string | null
          features: string[] | null
          filled_pockets: number
          follower_count: number | null
          funded_at: string | null
          funding_state: string
          has_whisperer: boolean | null
          how_it_helps: string | null
          id: string
          images: string[] | null
          intended_pockets: number | null
          like_count: number | null
          location: string | null
          max_whisperers: number | null
          opened_by_gosat: string | null
          orchard_kind: string
          orchard_type: Database["public"]["Enums"]["orchard_type"]
          original_seed_value: number
          payment_processing_fee: number
          pocket_price: number
          product_type: string | null
          profile_id: string
          released_at: string | null
          seed_value: number
          status: Database["public"]["Enums"]["orchard_status"]
          supporters: number
          tithing_amount: number
          title: string
          total_pockets: number | null
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          video_url: string | null
          views: number
          whisperer_commission_percent: number | null
          whisperer_share_pct: number
          why_needed: string | null
        }
        Insert: {
          allow_commission_marketing?: boolean | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          category: string
          commission_rate?: number | null
          community_impact?: string | null
          company_id: string
          completion_rate?: number | null
          courier_cost?: number | null
          created_at?: string
          currency?: string
          description: string
          expected_completion?: string | null
          features?: string[] | null
          filled_pockets?: number
          follower_count?: number | null
          funded_at?: string | null
          funding_state?: string
          has_whisperer?: boolean | null
          how_it_helps?: string | null
          id?: string
          images?: string[] | null
          intended_pockets?: number | null
          like_count?: number | null
          location?: string | null
          max_whisperers?: number | null
          opened_by_gosat?: string | null
          orchard_kind?: string
          orchard_type?: Database["public"]["Enums"]["orchard_type"]
          original_seed_value: number
          payment_processing_fee?: number
          pocket_price?: number
          product_type?: string | null
          profile_id: string
          released_at?: string | null
          seed_value: number
          status?: Database["public"]["Enums"]["orchard_status"]
          supporters?: number
          tithing_amount?: number
          title: string
          total_pockets?: number | null
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          video_url?: string | null
          views?: number
          whisperer_commission_percent?: number | null
          whisperer_share_pct?: number
          why_needed?: string | null
        }
        Update: {
          allow_commission_marketing?: boolean | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          category?: string
          commission_rate?: number | null
          community_impact?: string | null
          company_id?: string
          completion_rate?: number | null
          courier_cost?: number | null
          created_at?: string
          currency?: string
          description?: string
          expected_completion?: string | null
          features?: string[] | null
          filled_pockets?: number
          follower_count?: number | null
          funded_at?: string | null
          funding_state?: string
          has_whisperer?: boolean | null
          how_it_helps?: string | null
          id?: string
          images?: string[] | null
          intended_pockets?: number | null
          like_count?: number | null
          location?: string | null
          max_whisperers?: number | null
          opened_by_gosat?: string | null
          orchard_kind?: string
          orchard_type?: Database["public"]["Enums"]["orchard_type"]
          original_seed_value?: number
          payment_processing_fee?: number
          pocket_price?: number
          product_type?: string | null
          profile_id?: string
          released_at?: string | null
          seed_value?: number
          status?: Database["public"]["Enums"]["orchard_status"]
          supporters?: number
          tithing_amount?: number
          title?: string
          total_pockets?: number | null
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          video_url?: string | null
          views?: number
          whisperer_commission_percent?: number | null
          whisperer_share_pct?: number
          why_needed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orchards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orchards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orchards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_payments: {
        Row: {
          amount: number
          block_time: string | null
          confirmation_status: string
          created_at: string
          id: string
          memo: string | null
          recipient_address: string
          sender_address: string
          token_mint: string | null
          token_symbol: string
          transaction_signature: string
          updated_at: string
        }
        Insert: {
          amount: number
          block_time?: string | null
          confirmation_status?: string
          created_at?: string
          id?: string
          memo?: string | null
          recipient_address: string
          sender_address: string
          token_mint?: string | null
          token_symbol: string
          transaction_signature: string
          updated_at?: string
        }
        Update: {
          amount?: number
          block_time?: string | null
          confirmation_status?: string
          created_at?: string
          id?: string
          memo?: string | null
          recipient_address?: string
          sender_address?: string
          token_mint?: string | null
          token_symbol?: string
          transaction_signature?: string
          updated_at?: string
        }
        Relationships: []
      }
      organization_wallets: {
        Row: {
          blockchain: string | null
          created_at: string
          id: string
          is_active: boolean
          merchant_id: string | null
          supported_tokens: string[]
          updated_at: string
          user_id: string | null
          wallet_address: string
          wallet_name: string
          wallet_type: string | null
        }
        Insert: {
          blockchain?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_id?: string | null
          supported_tokens?: string[]
          updated_at?: string
          user_id?: string | null
          wallet_address: string
          wallet_name?: string
          wallet_type?: string | null
        }
        Update: {
          blockchain?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_id?: string | null
          supported_tokens?: string[]
          updated_at?: string
          user_id?: string | null
          wallet_address?: string
          wallet_name?: string
          wallet_type?: string | null
        }
        Relationships: []
      }
      password_reset_requests: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          token: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          token?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          token?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payment_audit_log: {
        Row: {
          action: string
          amount: number
          bestowal_id: string | null
          created_at: string
          currency: string
          id: string
          ip_address: unknown
          metadata: Json | null
          payment_method: string
          transaction_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          amount: number
          bestowal_id?: string | null
          created_at?: string
          currency: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          payment_method: string
          transaction_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          amount?: number
          bestowal_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          payment_method?: string
          transaction_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_audit_log_bestowal_id_fkey"
            columns: ["bestowal_id"]
            isOneToOne: false
            referencedRelation: "bestowals"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_config: {
        Row: {
          bank_account_name_encrypted: string | null
          bank_account_number_encrypted: string | null
          bank_name: string
          bank_name_encrypted: string | null
          bank_swift_code_encrypted: string | null
          business_email_encrypted: string | null
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          bank_account_name_encrypted?: string | null
          bank_account_number_encrypted?: string | null
          bank_name: string
          bank_name_encrypted?: string | null
          bank_swift_code_encrypted?: string | null
          business_email_encrypted?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          bank_account_name_encrypted?: string | null
          bank_account_number_encrypted?: string | null
          bank_name?: string
          bank_name_encrypted?: string | null
          bank_swift_code_encrypted?: string | null
          business_email_encrypted?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_config_secure: {
        Row: {
          bank_account_name_encrypted: string
          bank_account_number_encrypted: string
          bank_name_encrypted: string
          bank_swift_code_encrypted: string
          business_email_encrypted: string
          created_at: string
          encryption_key_id: string
          id: string
          last_accessed: string | null
          updated_at: string
        }
        Insert: {
          bank_account_name_encrypted: string
          bank_account_number_encrypted: string
          bank_name_encrypted: string
          bank_swift_code_encrypted: string
          business_email_encrypted: string
          created_at?: string
          encryption_key_id?: string
          id?: string
          last_accessed?: string | null
          updated_at?: string
        }
        Update: {
          bank_account_name_encrypted?: string
          bank_account_number_encrypted?: string
          bank_name_encrypted?: string
          bank_swift_code_encrypted?: string
          business_email_encrypted?: string
          created_at?: string
          encryption_key_id?: string
          id?: string
          last_accessed?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_idempotency: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          idempotency_key: string
          result: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          idempotency_key: string
          result: Json
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key?: string
          result?: Json
          user_id?: string
        }
        Relationships: []
      }
      payment_invoices: {
        Row: {
          amount: number
          bestowal_id: string | null
          chat_message_id: string | null
          created_at: string
          currency: string
          id: string
          invoice_number: string
          invoice_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          bestowal_id?: string | null
          chat_message_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_number: string
          invoice_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bestowal_id?: string | null
          chat_message_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_number?: string
          invoice_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_invoices_bestowal_id_fkey"
            columns: ["bestowal_id"]
            isOneToOne: false
            referencedRelation: "bestowals"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_schedule_items: {
        Row: {
          amount: number
          created_at: string
          due_offset_days: number | null
          estimate_id: string
          fixed_amount: number | null
          id: string
          label: string
          percentage_of_total: number | null
          position: number
          status: string
          trigger_job_status: string | null
          trigger_type: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_offset_days?: number | null
          estimate_id: string
          fixed_amount?: number | null
          id?: string
          label: string
          percentage_of_total?: number | null
          position?: number
          status?: string
          trigger_job_status?: string | null
          trigger_type: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_offset_days?: number | null
          estimate_id?: string
          fixed_amount?: number | null
          id?: string
          label?: string
          percentage_of_total?: number | null
          position?: number
          status?: string
          trigger_job_status?: string | null
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_schedule_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          bestowal_id: string | null
          completed_at: string | null
          created_at: string
          currency: string
          id: string
          payment_method: string
          payment_provider_id: string | null
          provider_response: Json | null
          status: string
        }
        Insert: {
          amount: number
          bestowal_id?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_method: string
          payment_provider_id?: string | null
          provider_response?: Json | null
          status?: string
        }
        Update: {
          amount?: number
          bestowal_id?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string
          payment_provider_id?: string | null
          provider_response?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_bestowal_id_fkey"
            columns: ["bestowal_id"]
            isOneToOne: false
            referencedRelation: "bestowals"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_change_audit: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_address: string | null
          new_network: string | null
          new_tag: number | null
          new_wallet_type: string | null
          old_address: string | null
          old_network: string | null
          old_tag: number | null
          old_wallet_type: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_address?: string | null
          new_network?: string | null
          new_tag?: number | null
          new_wallet_type?: string | null
          old_address?: string | null
          old_network?: string | null
          old_tag?: number | null
          old_wallet_type?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_address?: string | null
          new_network?: string | null
          new_tag?: number | null
          new_wallet_type?: string | null
          old_address?: string | null
          old_network?: string | null
          old_tag?: number | null
          old_wallet_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount: number
          completed_at: string | null
          covered_rows: Json
          created_at: string
          currency: string
          error: string | null
          id: string
          paypal_batch_id: string | null
          paypal_item_id: string | null
          rail: string
          recipient_type: string
          recipient_user_id: string
          run_id: string
          solana_cluster: string | null
          solana_tx_signature: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          covered_rows?: Json
          created_at?: string
          currency?: string
          error?: string | null
          id?: string
          paypal_batch_id?: string | null
          paypal_item_id?: string | null
          rail?: string
          recipient_type: string
          recipient_user_id: string
          run_id: string
          solana_cluster?: string | null
          solana_tx_signature?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          covered_rows?: Json
          created_at?: string
          currency?: string
          error?: string | null
          id?: string
          paypal_batch_id?: string | null
          paypal_item_id?: string | null
          rail?: string
          recipient_type?: string
          recipient_user_id?: string
          run_id?: string
          solana_cluster?: string | null
          solana_tx_signature?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      paypal_reconcile_misses: {
        Row: {
          created_at: string
          id: string
          kind: string
          last_checked_at: string
          last_status_code: number | null
          miss_count: number
          record_id: string
          resolved_at: string | null
          resolved_reason: string | null
          table_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          last_checked_at?: string
          last_status_code?: number | null
          miss_count?: number
          record_id: string
          resolved_at?: string | null
          resolved_reason?: string | null
          table_name: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          last_checked_at?: string
          last_status_code?: number | null
          miss_count?: number
          record_id?: string
          resolved_at?: string | null
          resolved_reason?: string | null
          table_name?: string
        }
        Relationships: []
      }
      payroll_lines: {
        Row: {
          business_id: string
          created_at: string
          currency: string | null
          deductions: number
          employee_id: string | null
          employee_name: string
          employee_statutory: number
          employer_statutory: number
          gross: number
          id: string
          line_items: Json
          net: number
          paye: number | null
          payroll_run_id: string
          sdl: number | null
          uif_employee: number | null
          uif_employer: number | null
        }
        Insert: {
          business_id: string
          created_at?: string
          currency?: string | null
          deductions?: number
          employee_id?: string | null
          employee_name?: string
          employee_statutory?: number
          employer_statutory?: number
          gross?: number
          id?: string
          line_items?: Json
          net?: number
          paye?: number | null
          payroll_run_id: string
          sdl?: number | null
          uif_employee?: number | null
          uif_employer?: number | null
        }
        Update: {
          business_id?: string
          created_at?: string
          currency?: string | null
          deductions?: number
          employee_id?: string | null
          employee_name?: string
          employee_statutory?: number
          employer_statutory?: number
          gross?: number
          id?: string
          line_items?: Json
          net?: number
          paye?: number | null
          payroll_run_id?: string
          sdl?: number | null
          uif_employee?: number | null
          uif_employer?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_lines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_lines_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_lines_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          business_id: string
          created_at: string
          currency: string | null
          employer_fica: number
          expense_id: string | null
          id: string
          pay_date: string
          period_end: string
          period_start: string
          total_cost: number
          totals: Json
        }
        Insert: {
          business_id: string
          created_at?: string
          currency?: string | null
          employer_fica?: number
          expense_id?: string | null
          id?: string
          pay_date: string
          period_end: string
          period_start: string
          total_cost?: number
          totals?: Json
        }
        Update: {
          business_id?: string
          created_at?: string
          currency?: string | null
          employer_fica?: number
          expense_id?: string | null
          id?: string
          pay_date?: string
          period_end?: string
          period_start?: string
          total_cost?: number
          totals?: Json
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      paystack_disputes: {
        Row: {
          amount_zar: number | null
          created_at: string
          currency: string
          dispute_reference: string
          id: string
          raw_payload: Json | null
          reason: string | null
          resolved_at: string | null
          status: string
          transaction_reference: string
        }
        Insert: {
          amount_zar?: number | null
          created_at?: string
          currency?: string
          dispute_reference: string
          id?: string
          raw_payload?: Json | null
          reason?: string | null
          resolved_at?: string | null
          status?: string
          transaction_reference: string
        }
        Update: {
          amount_zar?: number | null
          created_at?: string
          currency?: string
          dispute_reference?: string
          id?: string
          raw_payload?: Json | null
          reason?: string | null
          resolved_at?: string | null
          status?: string
          transaction_reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "paystack_disputes_transaction_reference_fkey"
            columns: ["transaction_reference"]
            isOneToOne: false
            referencedRelation: "paystack_transactions"
            referencedColumns: ["reference"]
          },
        ]
      }
      paystack_transactions: {
        Row: {
          amount_usd: number
          amount_zar: number
          completed_at: string | null
          created_at: string
          environment: string
          fx_rate: number
          id: string
          kind: string
          raw_payload: Json | null
          record_id: string
          reference: string
          status: string
        }
        Insert: {
          amount_usd: number
          amount_zar: number
          completed_at?: string | null
          created_at?: string
          environment: string
          fx_rate: number
          id?: string
          kind: string
          raw_payload?: Json | null
          record_id: string
          reference: string
          status?: string
        }
        Update: {
          amount_usd?: number
          amount_zar?: number
          completed_at?: string | null
          created_at?: string
          environment?: string
          fx_rate?: number
          id?: string
          kind?: string
          raw_payload?: Json | null
          record_id?: string
          reference?: string
          status?: string
        }
        Relationships: []
      }
      pillow_seed_details: {
        Row: {
          amenities: string[]
          availability: boolean
          base_lat: number | null
          base_lng: number | null
          base_location: string | null
          created_at: string
          currency: string
          front_image_url: string | null
          gallery_urls: string[]
          interior_image_url: string | null
          operator_confirmed_at: string
          operator_confirmed_legal: boolean
          product_id: string
          rate_monthly: number | null
          rate_nightly: number | null
          rate_weekly: number | null
          sleeps: number | null
          stay_type: Database["public"]["Enums"]["pillow_stay_type"]
          updated_at: string
        }
        Insert: {
          amenities?: string[]
          availability?: boolean
          base_lat?: number | null
          base_lng?: number | null
          base_location?: string | null
          created_at?: string
          currency: string
          front_image_url?: string | null
          gallery_urls?: string[]
          interior_image_url?: string | null
          operator_confirmed_at?: string
          operator_confirmed_legal: boolean
          product_id: string
          rate_monthly?: number | null
          rate_nightly?: number | null
          rate_weekly?: number | null
          sleeps?: number | null
          stay_type: Database["public"]["Enums"]["pillow_stay_type"]
          updated_at?: string
        }
        Update: {
          amenities?: string[]
          availability?: boolean
          base_lat?: number | null
          base_lng?: number | null
          base_location?: string | null
          created_at?: string
          currency?: string
          front_image_url?: string | null
          gallery_urls?: string[]
          interior_image_url?: string | null
          operator_confirmed_at?: string
          operator_confirmed_legal?: boolean
          product_id?: string
          rate_monthly?: number | null
          rate_nightly?: number | null
          rate_weekly?: number | null
          sleeps?: number | null
          stay_type?: Database["public"]["Enums"]["pillow_stay_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pillow_seed_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pillow_units: {
        Row: {
          created_at: string
          id: string
          name: string
          product_id: string
          rate_monthly: number | null
          rate_nightly: number | null
          rate_weekly: number | null
          sleeps: number
          sort_order: number
          unit_type: Database["public"]["Enums"]["pillow_unit_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          product_id: string
          rate_monthly?: number | null
          rate_nightly?: number | null
          rate_weekly?: number | null
          sleeps?: number
          sort_order?: number
          unit_type?: Database["public"]["Enums"]["pillow_unit_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          product_id?: string
          rate_monthly?: number | null
          rate_nightly?: number | null
          rate_weekly?: number | null
          sleeps?: number
          sort_order?: number
          unit_type?: Database["public"]["Enums"]["pillow_unit_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pillow_units_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_item_purchases: {
        Row: {
          amount: number
          buyer_id: string
          created_at: string
          id: string
          item_id: string
          item_type: string
          payment_status: string
          room_id: string
        }
        Insert: {
          amount: number
          buyer_id: string
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          payment_status?: string
          room_id: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          payment_status?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "premium_item_purchases_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "premium_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_room_access: {
        Row: {
          access_granted_at: string
          created_at: string
          id: string
          payment_amount: number
          payment_status: string
          room_id: string
          user_id: string
        }
        Insert: {
          access_granted_at?: string
          created_at?: string
          id?: string
          payment_amount?: number
          payment_status?: string
          room_id: string
          user_id: string
        }
        Update: {
          access_granted_at?: string
          created_at?: string
          id?: string
          payment_amount?: number
          payment_status?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "premium_room_access_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "premium_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_rooms: {
        Row: {
          artwork: Json | null
          chat_room_id: string | null
          created_at: string
          creator_id: string
          description: string | null
          documents: Json | null
          id: string
          is_public: boolean
          max_participants: number
          music: Json | null
          price: number
          pricing_type: string
          room_type: string
          title: string
          updated_at: string
        }
        Insert: {
          artwork?: Json | null
          chat_room_id?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          documents?: Json | null
          id?: string
          is_public?: boolean
          max_participants?: number
          music?: Json | null
          price?: number
          pricing_type?: string
          room_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          artwork?: Json | null
          chat_room_id?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          documents?: Json | null
          id?: string
          is_public?: boolean
          max_participants?: number
          music?: Json | null
          price?: number
          pricing_type?: string
          room_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "premium_rooms_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_requests: {
        Row: {
          chat_room_id: string | null
          client_notes: string | null
          contact_phone: string | null
          created_at: string
          delivery_address: string | null
          fulfillment_mode: string | null
          id: string
          pharmacist_notes: string | null
          prescription_file_name: string | null
          prescription_file_path: string | null
          quoted_amount_usdc: number | null
          sower_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_room_id?: string | null
          client_notes?: string | null
          contact_phone?: string | null
          created_at?: string
          delivery_address?: string | null
          fulfillment_mode?: string | null
          id?: string
          pharmacist_notes?: string | null
          prescription_file_name?: string | null
          prescription_file_path?: string | null
          quoted_amount_usdc?: number | null
          sower_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_room_id?: string | null
          client_notes?: string | null
          contact_phone?: string | null
          created_at?: string
          delivery_address?: string | null
          fulfillment_mode?: string | null
          id?: string
          pharmacist_notes?: string | null
          prescription_file_name?: string | null
          prescription_file_path?: string | null
          quoted_amount_usdc?: number | null
          sower_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_requests_sower_id_fkey"
            columns: ["sower_id"]
            isOneToOne: false
            referencedRelation: "sowers"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_upload_tokens: {
        Row: {
          consumed: boolean
          created_at: string
          declared_size: number | null
          expires_at: string
          file_name: string | null
          id: string
          mime_type: string | null
          object_path: string
          sower_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          consumed?: boolean
          created_at?: string
          declared_size?: number | null
          expires_at?: string
          file_name?: string | null
          id?: string
          mime_type?: string | null
          object_path: string
          sower_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          consumed?: boolean
          created_at?: string
          declared_size?: number | null
          expires_at?: string
          file_name?: string | null
          id?: string
          mime_type?: string | null
          object_path?: string
          sower_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      processed_webhooks: {
        Row: {
          id: string
          payload_hash: string
          processed_at: string
          provider: string
          webhook_id: string
        }
        Insert: {
          id?: string
          payload_hash: string
          processed_at?: string
          provider: string
          webhook_id: string
        }
        Update: {
          id?: string
          payload_hash?: string
          processed_at?: string
          provider?: string
          webhook_id?: string
        }
        Relationships: []
      }
      product_bestowals: {
        Row: {
          amount: number
          auto_release_at: string | null
          bestower_id: string | null
          created_at: string | null
          delivered_at: string | null
          delivery_confirmed_at: string | null
          delivery_type: string
          dispute_reason: string | null
          grower_amount: number
          hold_reason: string | null
          id: string
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          payout_amount_xrp: number | null
          payout_fx_observed_at: string | null
          payout_fx_rate: number | null
          payout_fx_sources: Json | null
          payout_provider: string | null
          payout_reference: string | null
          payout_status: string
          product_id: string | null
          ref_link_id: string | null
          release_status: string | null
          released_at: string | null
          s2g_fee: number
          shipped_at: string | null
          sower_amount: number
          sower_id: string | null
          status: string | null
          whisperer_amount: number
          whisperer_id: string | null
        }
        Insert: {
          amount: number
          auto_release_at?: string | null
          bestower_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_confirmed_at?: string | null
          delivery_type?: string
          dispute_reason?: string | null
          grower_amount: number
          hold_reason?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payout_amount_xrp?: number | null
          payout_fx_observed_at?: string | null
          payout_fx_rate?: number | null
          payout_fx_sources?: Json | null
          payout_provider?: string | null
          payout_reference?: string | null
          payout_status?: string
          product_id?: string | null
          ref_link_id?: string | null
          release_status?: string | null
          released_at?: string | null
          s2g_fee: number
          shipped_at?: string | null
          sower_amount: number
          sower_id?: string | null
          status?: string | null
          whisperer_amount?: number
          whisperer_id?: string | null
        }
        Update: {
          amount?: number
          auto_release_at?: string | null
          bestower_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_confirmed_at?: string | null
          delivery_type?: string
          dispute_reason?: string | null
          grower_amount?: number
          hold_reason?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payout_amount_xrp?: number | null
          payout_fx_observed_at?: string | null
          payout_fx_rate?: number | null
          payout_fx_sources?: Json | null
          payout_provider?: string | null
          payout_reference?: string | null
          payout_status?: string
          product_id?: string | null
          ref_link_id?: string | null
          release_status?: string | null
          released_at?: string | null
          s2g_fee?: number
          shipped_at?: string | null
          sower_amount?: number
          sower_id?: string | null
          status?: string | null
          whisperer_amount?: number
          whisperer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_bestowals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_bestowals_sower_id_fkey"
            columns: ["sower_id"]
            isOneToOne: false
            referencedRelation: "sowers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_likes: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_likes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_whisperer_assignments: {
        Row: {
          book_id: string | null
          commission_percent: number
          created_at: string | null
          id: string
          invitation_id: string | null
          orchard_id: string | null
          product_id: string | null
          sower_id: string
          status: string | null
          total_bestowals: number | null
          total_earned: number | null
          updated_at: string | null
          whisperer_id: string
        }
        Insert: {
          book_id?: string | null
          commission_percent: number
          created_at?: string | null
          id?: string
          invitation_id?: string | null
          orchard_id?: string | null
          product_id?: string | null
          sower_id: string
          status?: string | null
          total_bestowals?: number | null
          total_earned?: number | null
          updated_at?: string | null
          whisperer_id: string
        }
        Update: {
          book_id?: string | null
          commission_percent?: number
          created_at?: string | null
          id?: string
          invitation_id?: string | null
          orchard_id?: string | null
          product_id?: string | null
          sower_id?: string
          status?: string | null
          total_bestowals?: number | null
          total_earned?: number | null
          updated_at?: string | null
          whisperer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_whisperer_assignments_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "sower_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_whisperer_assignments_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "whisperer_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_whisperer_assignments_orchard_id_fkey"
            columns: ["orchard_id"]
            isOneToOne: false
            referencedRelation: "orchards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_whisperer_assignments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_whisperer_assignments_whisperer_id_fkey"
            columns: ["whisperer_id"]
            isOneToOne: false
            referencedRelation: "whisperers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          artist_name: string | null
          bestowal_count: number | null
          bulk_upload_id: string | null
          category: string | null
          commission_fixed: number | null
          company_id: string
          cover_image_url: string | null
          created_at: string | null
          delivery_type: string | null
          description: string | null
          download_count: number | null
          duration: number | null
          file_url: string | null
          follower_count: number | null
          has_whisperer: boolean | null
          id: string
          image_urls: string[] | null
          is_dropship: boolean
          is_featured: boolean | null
          kind: string | null
          license_type: string | null
          like_count: number | null
          max_whisperers: number | null
          metadata: Json | null
          music_genre: string | null
          music_mood: string | null
          play_count: number | null
          preview_url: string | null
          price: number | null
          service_details: Json | null
          shipping_method: string | null
          sku: string | null
          slug: string | null
          sower_id: string | null
          status: string | null
          stock: number | null
          tags: string[] | null
          title: string
          type: string | null
          updated_at: string | null
          wandering_role: string | null
          whisperer_commission_percent: number | null
        }
        Insert: {
          artist_name?: string | null
          bestowal_count?: number | null
          bulk_upload_id?: string | null
          category?: string | null
          commission_fixed?: number | null
          company_id: string
          cover_image_url?: string | null
          created_at?: string | null
          delivery_type?: string | null
          description?: string | null
          download_count?: number | null
          duration?: number | null
          file_url?: string | null
          follower_count?: number | null
          has_whisperer?: boolean | null
          id?: string
          image_urls?: string[] | null
          is_dropship?: boolean
          is_featured?: boolean | null
          kind?: string | null
          license_type?: string | null
          like_count?: number | null
          max_whisperers?: number | null
          metadata?: Json | null
          music_genre?: string | null
          music_mood?: string | null
          play_count?: number | null
          preview_url?: string | null
          price?: number | null
          service_details?: Json | null
          shipping_method?: string | null
          sku?: string | null
          slug?: string | null
          sower_id?: string | null
          status?: string | null
          stock?: number | null
          tags?: string[] | null
          title: string
          type?: string | null
          updated_at?: string | null
          wandering_role?: string | null
          whisperer_commission_percent?: number | null
        }
        Update: {
          artist_name?: string | null
          bestowal_count?: number | null
          bulk_upload_id?: string | null
          category?: string | null
          commission_fixed?: number | null
          company_id?: string
          cover_image_url?: string | null
          created_at?: string | null
          delivery_type?: string | null
          description?: string | null
          download_count?: number | null
          duration?: number | null
          file_url?: string | null
          follower_count?: number | null
          has_whisperer?: boolean | null
          id?: string
          image_urls?: string[] | null
          is_dropship?: boolean
          is_featured?: boolean | null
          kind?: string | null
          license_type?: string | null
          like_count?: number | null
          max_whisperers?: number | null
          metadata?: Json | null
          music_genre?: string | null
          music_mood?: string | null
          play_count?: number | null
          preview_url?: string | null
          price?: number | null
          service_details?: Json | null
          shipping_method?: string | null
          sku?: string | null
          slug?: string | null
          sower_id?: string | null
          status?: string | null
          stock?: number | null
          tags?: string[] | null
          title?: string
          type?: string | null
          updated_at?: string | null
          wandering_role?: string | null
          whisperer_commission_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_sower_id_fkey"
            columns: ["sower_id"]
            isOneToOne: false
            referencedRelation: "sowers"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_access_logs: {
        Row: {
          access_reason: string | null
          access_type: string
          accessed_fields: string[] | null
          accessed_profile_id: string
          accessor_user_id: string
          created_at: string | null
          id: string
          ip_address: unknown
          session_info: Json | null
          user_agent: string | null
        }
        Insert: {
          access_reason?: string | null
          access_type: string
          accessed_fields?: string[] | null
          accessed_profile_id: string
          accessor_user_id: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          session_info?: Json | null
          user_agent?: string | null
        }
        Update: {
          access_reason?: string | null
          access_type?: string
          accessed_fields?: string[] | null
          accessed_profile_id?: string
          accessor_user_id?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          session_info?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bestowal_thank_you_message: string | null
          bio: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          disclaimer_accepted_at: string | null
          display_name: string | null
          email: string | null
          facebook_url: string | null
          failed_recovery_attempts: number
          first_name: string | null
          garden_settings: Json
          has_complete_billing_info: boolean | null
          id: string
          instagram_url: string | null
          is_chatapp_verified: boolean | null
          is_system: boolean
          is_test: boolean
          last_login: string | null
          last_name: string | null
          latitude: number | null
          linkedin_url: string | null
          location: string | null
          location_updated_at: string | null
          location_verified: boolean
          longitude: number | null
          membership_tier: string | null
          payout_address: string | null
          payout_details_updated_at: string | null
          payout_network: string | null
          payout_reminder_sent_at: string | null
          payout_setup_complete: boolean
          payout_tag: number | null
          payout_wallet_type: string | null
          phone: string | null
          pinterest_url: string | null
          preferred_currency: string | null
          preferred_language: string | null
          preferred_payout_method: string | null
          recovery_locked_until: string | null
          referred_by: string | null
          security_setup_complete: boolean
          show_birthday: boolean | null
          show_social_media: boolean | null
          solana_wallet_address: string | null
          suspended: boolean | null
          telegram_url: string | null
          tiktok_url: string | null
          timezone: string | null
          twitter_url: string | null
          updated_at: string
          user_id: string
          username: string | null
          verification_chat_id: string | null
          verification_expires_at: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at: string | null
          verifier_id: string | null
          video_credits: number
          website: string | null
          whatsapp_url: string | null
          youtube_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bestowal_thank_you_message?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          disclaimer_accepted_at?: string | null
          display_name?: string | null
          email?: string | null
          facebook_url?: string | null
          failed_recovery_attempts?: number
          first_name?: string | null
          garden_settings?: Json
          has_complete_billing_info?: boolean | null
          id?: string
          instagram_url?: string | null
          is_chatapp_verified?: boolean | null
          is_system?: boolean
          is_test?: boolean
          last_login?: string | null
          last_name?: string | null
          latitude?: number | null
          linkedin_url?: string | null
          location?: string | null
          location_updated_at?: string | null
          location_verified?: boolean
          longitude?: number | null
          membership_tier?: string | null
          payout_address?: string | null
          payout_details_updated_at?: string | null
          payout_network?: string | null
          payout_reminder_sent_at?: string | null
          payout_setup_complete?: boolean
          payout_tag?: number | null
          payout_wallet_type?: string | null
          phone?: string | null
          pinterest_url?: string | null
          preferred_currency?: string | null
          preferred_language?: string | null
          preferred_payout_method?: string | null
          recovery_locked_until?: string | null
          referred_by?: string | null
          security_setup_complete?: boolean
          show_birthday?: boolean | null
          show_social_media?: boolean | null
          solana_wallet_address?: string | null
          suspended?: boolean | null
          telegram_url?: string | null
          tiktok_url?: string | null
          timezone?: string | null
          twitter_url?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          verification_chat_id?: string | null
          verification_expires_at?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
          verifier_id?: string | null
          video_credits?: number
          website?: string | null
          whatsapp_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bestowal_thank_you_message?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          disclaimer_accepted_at?: string | null
          display_name?: string | null
          email?: string | null
          facebook_url?: string | null
          failed_recovery_attempts?: number
          first_name?: string | null
          garden_settings?: Json
          has_complete_billing_info?: boolean | null
          id?: string
          instagram_url?: string | null
          is_chatapp_verified?: boolean | null
          is_system?: boolean
          is_test?: boolean
          last_login?: string | null
          last_name?: string | null
          latitude?: number | null
          linkedin_url?: string | null
          location?: string | null
          location_updated_at?: string | null
          location_verified?: boolean
          longitude?: number | null
          membership_tier?: string | null
          payout_address?: string | null
          payout_details_updated_at?: string | null
          payout_network?: string | null
          payout_reminder_sent_at?: string | null
          payout_setup_complete?: boolean
          payout_tag?: number | null
          payout_wallet_type?: string | null
          phone?: string | null
          pinterest_url?: string | null
          preferred_currency?: string | null
          preferred_language?: string | null
          preferred_payout_method?: string | null
          recovery_locked_until?: string | null
          referred_by?: string | null
          security_setup_complete?: boolean
          show_birthday?: boolean | null
          show_social_media?: boolean | null
          solana_wallet_address?: string | null
          suspended?: boolean | null
          telegram_url?: string | null
          tiktok_url?: string | null
          timezone?: string | null
          twitter_url?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          verification_chat_id?: string | null
          verification_expires_at?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
          verifier_id?: string | null
          video_credits?: number
          website?: string | null
          whatsapp_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      provider_escrow_transactions: {
        Row: {
          action: string
          amount: number
          created_at: string
          from_wallet: string | null
          id: string
          notes: string | null
          order_id: string
          performed_by: string | null
          to_wallet: string | null
        }
        Insert: {
          action: string
          amount?: number
          created_at?: string
          from_wallet?: string | null
          id?: string
          notes?: string | null
          order_id: string
          performed_by?: string | null
          to_wallet?: string | null
        }
        Update: {
          action?: string
          amount?: number
          created_at?: string
          from_wallet?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          performed_by?: string | null
          to_wallet?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_escrow_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "provider_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_orders: {
        Row: {
          buyer_confirmed_at: string | null
          buyer_id: string
          courier_fee: number
          created_at: string
          delivery_address: string | null
          delivery_city: string | null
          delivery_country: string | null
          delivery_type: string | null
          dispute_opened_at: string | null
          dispute_reason: string | null
          dispute_resolved_at: string | null
          escrow_held_at: string | null
          escrow_released_at: string | null
          escrow_status: string
          id: string
          payment_method: string | null
          platform_commission: number
          product_id: string
          provider_confirmed_at: string | null
          provider_id: string
          quantity: number
          status: string
          total_amount: number
          tx_reference: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          buyer_confirmed_at?: string | null
          buyer_id: string
          courier_fee?: number
          created_at?: string
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_country?: string | null
          delivery_type?: string | null
          dispute_opened_at?: string | null
          dispute_reason?: string | null
          dispute_resolved_at?: string | null
          escrow_held_at?: string | null
          escrow_released_at?: string | null
          escrow_status?: string
          id?: string
          payment_method?: string | null
          platform_commission?: number
          product_id: string
          provider_confirmed_at?: string | null
          provider_id: string
          quantity?: number
          status?: string
          total_amount: number
          tx_reference?: string | null
          unit_price: number
          updated_at?: string
        }
        Update: {
          buyer_confirmed_at?: string | null
          buyer_id?: string
          courier_fee?: number
          created_at?: string
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_country?: string | null
          delivery_type?: string | null
          dispute_opened_at?: string | null
          dispute_reason?: string | null
          dispute_resolved_at?: string | null
          escrow_held_at?: string | null
          escrow_released_at?: string | null
          escrow_status?: string
          id?: string
          payment_method?: string | null
          platform_commission?: number
          product_id?: string
          provider_confirmed_at?: string | null
          provider_id?: string
          quantity?: number
          status?: string
          total_amount?: number
          tx_reference?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "provider_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_orders_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          photos: string[] | null
          price: number
          provider_id: string
          status: string
          stock: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          photos?: string[] | null
          price?: number
          provider_id: string
          status?: string
          stock?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          photos?: string[] | null
          price?: number
          provider_id?: string
          status?: string
          stock?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_products_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          address_line: string | null
          approved_at: string | null
          bio: string | null
          business_name: string
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          payout_details: Json | null
          phone: string | null
          photos: string[] | null
          status: string
          subtype: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line?: string | null
          approved_at?: string | null
          bio?: string | null
          business_name: string
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          payout_details?: Json | null
          phone?: string | null
          photos?: string[] | null
          status?: string
          subtype: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line?: string | null
          approved_at?: string | null
          bio?: string | null
          business_name?: string
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          payout_details?: Json | null
          phone?: string | null
          photos?: string[] | null
          status?: string
          subtype?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          display_name?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          display_name?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          subscription: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          subscription: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          subscription?: Json
          user_id?: string
        }
        Relationships: []
      }
      radio_automated_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          current_position_seconds: number | null
          current_track_id: string | null
          current_track_index: number | null
          error_message: string | null
          id: string
          listener_count: number | null
          playback_status: string
          playlist_id: string | null
          schedule_id: string
          session_id: string | null
          session_type: string
          started_at: string | null
          track_started_at: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_position_seconds?: number | null
          current_track_id?: string | null
          current_track_index?: number | null
          error_message?: string | null
          id?: string
          listener_count?: number | null
          playback_status?: string
          playlist_id?: string | null
          schedule_id: string
          session_id?: string | null
          session_type?: string
          started_at?: string | null
          track_started_at?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_position_seconds?: number | null
          current_track_id?: string | null
          current_track_index?: number | null
          error_message?: string | null
          id?: string
          listener_count?: number | null
          playback_status?: string
          playlist_id?: string | null
          schedule_id?: string
          session_id?: string | null
          session_type?: string
          started_at?: string | null
          track_started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_radio_automated_sessions_playlist_id"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "dj_playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_radio_automated_sessions_schedule_id"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "radio_schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_automated_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "radio_live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_broadcasts: {
        Row: {
          broadcaster_id: string
          broadcaster_profile_id: string | null
          circle_id: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          listener_count: number | null
          recording_url: string | null
          scheduled_at: string
          status: string | null
          stream_url: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          broadcaster_id: string
          broadcaster_profile_id?: string | null
          circle_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          listener_count?: number | null
          recording_url?: string | null
          scheduled_at: string
          status?: string | null
          stream_url?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          broadcaster_id?: string
          broadcaster_profile_id?: string | null
          circle_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          listener_count?: number | null
          recording_url?: string | null
          scheduled_at?: string
          status?: string | null
          stream_url?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "radio_broadcasts_broadcaster_profile_id_fkey"
            columns: ["broadcaster_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_broadcasts_broadcaster_profile_id_fkey"
            columns: ["broadcaster_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_broadcasts_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_call_queue: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          session_id: string
          status: string
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          session_id: string
          status?: string
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          session_id?: string
          status?: string
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_call_queue_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "radio_live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_co_host_invites: {
        Row: {
          co_host_dj_id: string
          co_host_notes: string | null
          co_host_user_id: string
          created_at: string
          host_dj_id: string
          id: string
          invitation_message: string | null
          responded_at: string | null
          schedule_id: string
          status: string
        }
        Insert: {
          co_host_dj_id: string
          co_host_notes?: string | null
          co_host_user_id: string
          created_at?: string
          host_dj_id: string
          id?: string
          invitation_message?: string | null
          responded_at?: string | null
          schedule_id: string
          status?: string
        }
        Update: {
          co_host_dj_id?: string
          co_host_notes?: string | null
          co_host_user_id?: string
          created_at?: string
          host_dj_id?: string
          id?: string
          invitation_message?: string | null
          responded_at?: string | null
          schedule_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_co_host_invites_co_host_dj_id_fkey"
            columns: ["co_host_dj_id"]
            isOneToOne: false
            referencedRelation: "radio_djs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_co_host_invites_host_dj_id_fkey"
            columns: ["host_dj_id"]
            isOneToOne: false
            referencedRelation: "radio_djs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_co_host_invites_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "radio_schedule"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_dj_badges: {
        Row: {
          badge_description: string | null
          badge_icon: string
          badge_name: string
          badge_type: string
          dj_id: string
          earned_at: string
          id: string
        }
        Insert: {
          badge_description?: string | null
          badge_icon?: string
          badge_name: string
          badge_type: string
          dj_id: string
          earned_at?: string
          id?: string
        }
        Update: {
          badge_description?: string | null
          badge_icon?: string
          badge_name?: string
          badge_type?: string
          dj_id?: string
          earned_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_dj_badges_dj_id_fkey"
            columns: ["dj_id"]
            isOneToOne: false
            referencedRelation: "radio_djs"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_djs: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          dj_name: string
          dj_role: Database["public"]["Enums"]["dj_role"]
          emergency_availability: boolean | null
          id: string
          is_active: boolean
          preferred_time_slots: string[] | null
          rating: number | null
          specialties: string[] | null
          timezone: string | null
          total_hours_hosted: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          dj_name: string
          dj_role?: Database["public"]["Enums"]["dj_role"]
          emergency_availability?: boolean | null
          id?: string
          is_active?: boolean
          preferred_time_slots?: string[] | null
          rating?: number | null
          specialties?: string[] | null
          timezone?: string | null
          total_hours_hosted?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          dj_name?: string
          dj_role?: Database["public"]["Enums"]["dj_role"]
          emergency_availability?: boolean | null
          id?: string
          is_active?: boolean
          preferred_time_slots?: string[] | null
          rating?: number | null
          specialties?: string[] | null
          timezone?: string | null
          total_hours_hosted?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      radio_feedback: {
        Row: {
          comment: string | null
          created_at: string
          feedback_type: string | null
          id: string
          is_anonymous: boolean | null
          listener_user_id: string | null
          rating: number | null
          schedule_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          feedback_type?: string | null
          id?: string
          is_anonymous?: boolean | null
          listener_user_id?: string | null
          rating?: number | null
          schedule_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          feedback_type?: string | null
          id?: string
          is_anonymous?: boolean | null
          listener_user_id?: string | null
          rating?: number | null
          schedule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "radio_feedback_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "radio_schedule"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_guest_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          joined_at: string | null
          left_at: string | null
          request_message: string | null
          session_id: string
          status: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          request_message?: string | null
          session_id: string
          status?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          request_message?: string | null
          session_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_guest_requests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "radio_live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_listener_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_listened_at: string
          longest_streak: number
          total_listen_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_listened_at?: string
          longest_streak?: number
          total_listen_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_listened_at?: string
          longest_streak?: number
          total_listen_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      radio_live_hosts: {
        Row: {
          audio_enabled: boolean
          created_at: string
          dj_id: string
          id: string
          is_active: boolean
          joined_at: string
          left_at: string | null
          role: string
          session_id: string
          user_id: string
          video_enabled: boolean
        }
        Insert: {
          audio_enabled?: boolean
          created_at?: string
          dj_id: string
          id?: string
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          role?: string
          session_id: string
          user_id: string
          video_enabled?: boolean
        }
        Update: {
          audio_enabled?: boolean
          created_at?: string
          dj_id?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          role?: string
          session_id?: string
          user_id?: string
          video_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "radio_live_hosts_dj_id_fkey"
            columns: ["dj_id"]
            isOneToOne: false
            referencedRelation: "radio_djs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_live_hosts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "radio_live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_live_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message_text: string
          message_type: string
          sender_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message_text: string
          message_type?: string
          sender_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message_text?: string
          message_type?: string
          sender_id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_live_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "radio_live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_live_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          most_clapped_segment: number | null
          peak_listeners: number | null
          schedule_id: string
          session_token: string
          started_at: string | null
          status: string
          total_bestow_amount: number | null
          total_reactions: number | null
          updated_at: string
          viewer_count: number
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          most_clapped_segment?: number | null
          peak_listeners?: number | null
          schedule_id: string
          session_token: string
          started_at?: string | null
          status?: string
          total_bestow_amount?: number | null
          total_reactions?: number | null
          updated_at?: string
          viewer_count?: number
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          most_clapped_segment?: number | null
          peak_listeners?: number | null
          schedule_id?: string
          session_token?: string
          started_at?: string | null
          status?: string
          total_bestow_amount?: number | null
          total_reactions?: number | null
          updated_at?: string
          viewer_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "radio_live_sessions_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "radio_schedule"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_message_responses: {
        Row: {
          created_at: string
          id: string
          message_id: string
          responder_id: string
          response_text: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          responder_id: string
          response_text: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          responder_id?: string
          response_text?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_message_responses_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "radio_live_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_message_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "radio_live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_play_xp_log: {
        Row: {
          awarded_date: string
          created_at: string
          id: string
          listener_id: string
          points_awarded: number
          track_id: string
          track_owner_id: string
        }
        Insert: {
          awarded_date?: string
          created_at?: string
          id?: string
          listener_id: string
          points_awarded?: number
          track_id: string
          track_owner_id: string
        }
        Update: {
          awarded_date?: string
          created_at?: string
          id?: string
          listener_id?: string
          points_awarded?: number
          track_id?: string
          track_owner_id?: string
        }
        Relationships: []
      }
      radio_prerecorded_sessions: {
        Row: {
          created_at: string
          description: string | null
          host_user_id: string
          id: string
          scheduled_at: string | null
          status: string
          title: string
          total_duration_seconds: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          host_user_id: string
          id?: string
          scheduled_at?: string | null
          status?: string
          title: string
          total_duration_seconds?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          host_user_id?: string
          id?: string
          scheduled_at?: string | null
          status?: string
          title?: string
          total_duration_seconds?: number
          updated_at?: string
        }
        Relationships: []
      }
      radio_prerecorded_slots: {
        Row: {
          asset_mime: string | null
          asset_name: string | null
          asset_url: string | null
          created_at: string
          duration_seconds: number
          id: string
          label: string | null
          music_track_id: string | null
          notes: string | null
          position: number
          session_id: string
          slot_type: string
          updated_at: string
        }
        Insert: {
          asset_mime?: string | null
          asset_name?: string | null
          asset_url?: string | null
          created_at?: string
          duration_seconds?: number
          id?: string
          label?: string | null
          music_track_id?: string | null
          notes?: string | null
          position: number
          session_id: string
          slot_type: string
          updated_at?: string
        }
        Update: {
          asset_mime?: string | null
          asset_name?: string | null
          asset_url?: string | null
          created_at?: string
          duration_seconds?: number
          id?: string
          label?: string | null
          music_track_id?: string | null
          notes?: string | null
          position?: number
          session_id?: string
          slot_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_prerecorded_slots_music_track_id_fkey"
            columns: ["music_track_id"]
            isOneToOne: false
            referencedRelation: "dj_music_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_prerecorded_slots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "radio_prerecorded_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          segment_index: number | null
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type: string
          segment_index?: number | null
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          segment_index?: number | null
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      radio_rundown_segments: {
        Row: {
          audio_path: string | null
          doc_path: string | null
          duration_seconds: number
          id: string
          image_path: string | null
          kind: string
          notes: string | null
          position: number
          slot_id: string
          track_product_id: string | null
          track_title_snapshot: string | null
        }
        Insert: {
          audio_path?: string | null
          doc_path?: string | null
          duration_seconds: number
          id?: string
          image_path?: string | null
          kind: string
          notes?: string | null
          position: number
          slot_id: string
          track_product_id?: string | null
          track_title_snapshot?: string | null
        }
        Update: {
          audio_path?: string | null
          doc_path?: string | null
          duration_seconds?: number
          id?: string
          image_path?: string | null
          kind?: string
          notes?: string | null
          position?: number
          slot_id?: string
          track_product_id?: string | null
          track_title_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "radio_rundown_segments_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "radio_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_rundown_segments_track_product_id_fkey"
            columns: ["track_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_schedule: {
        Row: {
          ai_backup_enabled: boolean | null
          approval_notes: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          bestow_count: number | null
          broadcast_mode: string
          created_at: string
          dj_id: string | null
          end_time: string
          hour_slot: number
          id: string
          is_free: boolean | null
          listener_count: number | null
          playlist_id: string | null
          playlist_url: string | null
          price: number | null
          pricing_type: string
          reaction_count: number | null
          requires_review: boolean | null
          show_id: string | null
          show_notes: string | null
          show_subject: string | null
          show_topic_description: string | null
          start_time: string
          status: string | null
          time_slot_date: string
          updated_at: string
        }
        Insert: {
          ai_backup_enabled?: boolean | null
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bestow_count?: number | null
          broadcast_mode?: string
          created_at?: string
          dj_id?: string | null
          end_time: string
          hour_slot: number
          id?: string
          is_free?: boolean | null
          listener_count?: number | null
          playlist_id?: string | null
          playlist_url?: string | null
          price?: number | null
          pricing_type?: string
          reaction_count?: number | null
          requires_review?: boolean | null
          show_id?: string | null
          show_notes?: string | null
          show_subject?: string | null
          show_topic_description?: string | null
          start_time: string
          status?: string | null
          time_slot_date: string
          updated_at?: string
        }
        Update: {
          ai_backup_enabled?: boolean | null
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bestow_count?: number | null
          broadcast_mode?: string
          created_at?: string
          dj_id?: string | null
          end_time?: string
          hour_slot?: number
          id?: string
          is_free?: boolean | null
          listener_count?: number | null
          playlist_id?: string | null
          playlist_url?: string | null
          price?: number | null
          pricing_type?: string
          reaction_count?: number | null
          requires_review?: boolean | null
          show_id?: string | null
          show_notes?: string | null
          show_subject?: string | null
          show_topic_description?: string | null
          start_time?: string
          status?: string | null
          time_slot_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_schedule_dj_id_fkey"
            columns: ["dj_id"]
            isOneToOne: false
            referencedRelation: "radio_djs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_schedule_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "dj_playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_schedule_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "radio_shows"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_seed_plays: {
        Row: {
          dj_id: string | null
          duration_seconds: number | null
          id: string
          played_at: string
          schedule_id: string | null
          seed_id: string | null
          session_id: string | null
          source: string
          sower_id: string | null
          track_id: string | null
        }
        Insert: {
          dj_id?: string | null
          duration_seconds?: number | null
          id?: string
          played_at?: string
          schedule_id?: string | null
          seed_id?: string | null
          session_id?: string | null
          source?: string
          sower_id?: string | null
          track_id?: string | null
        }
        Update: {
          dj_id?: string | null
          duration_seconds?: number | null
          id?: string
          played_at?: string
          schedule_id?: string | null
          seed_id?: string | null
          session_id?: string | null
          source?: string
          sower_id?: string | null
          track_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "radio_seed_plays_dj_id_fkey"
            columns: ["dj_id"]
            isOneToOne: false
            referencedRelation: "radio_djs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_seed_plays_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "radio_schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_seed_plays_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "radio_live_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_seed_plays_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "dj_music_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_seed_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          requester_id: string
          resolved_at: string | null
          seed_artist: string | null
          seed_cover_url: string | null
          seed_duration_seconds: number | null
          seed_file_url: string | null
          seed_id: string | null
          seed_title: string
          session_id: string | null
          status: string
          track_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          requester_id: string
          resolved_at?: string | null
          seed_artist?: string | null
          seed_cover_url?: string | null
          seed_duration_seconds?: number | null
          seed_file_url?: string | null
          seed_id?: string | null
          seed_title: string
          session_id?: string | null
          status?: string
          track_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          requester_id?: string
          resolved_at?: string | null
          seed_artist?: string | null
          seed_cover_url?: string | null
          seed_duration_seconds?: number | null
          seed_file_url?: string | null
          seed_id?: string | null
          seed_title?: string
          session_id?: string | null
          status?: string
          track_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "radio_seed_requests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "radio_live_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_seed_requests_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "dj_music_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_segment_templates: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          segments_json: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          segments_json: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          segments_json?: Json
        }
        Relationships: []
      }
      radio_show_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          mime_type: string | null
          schedule_id: string
          show_id: string
          updated_at: string
          upload_purpose: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          mime_type?: string | null
          schedule_id: string
          show_id: string
          updated_at?: string
          upload_purpose: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          mime_type?: string | null
          schedule_id?: string
          show_id?: string
          updated_at?: string
          upload_purpose?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      radio_shows: {
        Row: {
          category: Database["public"]["Enums"]["show_category"]
          created_at: string
          description: string | null
          dj_id: string | null
          estimated_listeners: number | null
          id: string
          is_live: boolean | null
          is_recurring: boolean | null
          recurring_pattern: Json | null
          show_image_url: string | null
          show_name: string
          subject: string | null
          tags: string[] | null
          topic_description: string | null
          total_episodes: number | null
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["show_category"]
          created_at?: string
          description?: string | null
          dj_id?: string | null
          estimated_listeners?: number | null
          id?: string
          is_live?: boolean | null
          is_recurring?: boolean | null
          recurring_pattern?: Json | null
          show_image_url?: string | null
          show_name: string
          subject?: string | null
          tags?: string[] | null
          topic_description?: string | null
          total_episodes?: number | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["show_category"]
          created_at?: string
          description?: string | null
          dj_id?: string | null
          estimated_listeners?: number | null
          id?: string
          is_live?: boolean | null
          is_recurring?: boolean | null
          recurring_pattern?: Json | null
          show_image_url?: string | null
          show_name?: string
          subject?: string | null
          tags?: string[] | null
          topic_description?: string | null
          total_episodes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_shows_dj_id_fkey"
            columns: ["dj_id"]
            isOneToOne: false
            referencedRelation: "radio_djs"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_slot_segments: {
        Row: {
          color: string | null
          created_at: string
          duration_minutes: number
          emoji_icon: string | null
          id: string
          mapped_document_name: string | null
          mapped_document_url: string | null
          mapped_track_id: string | null
          schedule_id: string | null
          segment_order: number
          segment_type: string
          title: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          duration_minutes?: number
          emoji_icon?: string | null
          id?: string
          mapped_document_name?: string | null
          mapped_document_url?: string | null
          mapped_track_id?: string | null
          schedule_id?: string | null
          segment_order?: number
          segment_type: string
          title?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          duration_minutes?: number
          emoji_icon?: string | null
          id?: string
          mapped_document_name?: string | null
          mapped_document_url?: string | null
          mapped_track_id?: string | null
          schedule_id?: string | null
          segment_order?: number
          segment_type?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "radio_slot_segments_mapped_track_id_fkey"
            columns: ["mapped_track_id"]
            isOneToOne: false
            referencedRelation: "dj_music_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_slot_segments_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "radio_schedule"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_slots: {
        Row: {
          ad_price: number | null
          aired_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          dj_user_id: string
          id: string
          mode: string
          reminder_sent_at: string | null
          scheduled_at: string | null
          scheduled_notice_sent_at: string | null
          starts_at: string
          status: string
          title: string | null
        }
        Insert: {
          ad_price?: number | null
          aired_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          dj_user_id: string
          id?: string
          mode: string
          reminder_sent_at?: string | null
          scheduled_at?: string | null
          scheduled_notice_sent_at?: string | null
          starts_at: string
          status?: string
          title?: string | null
        }
        Update: {
          ad_price?: number | null
          aired_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          dj_user_id?: string
          id?: string
          mode?: string
          reminder_sent_at?: string | null
          scheduled_at?: string | null
          scheduled_notice_sent_at?: string | null
          starts_at?: string
          status?: string
          title?: string | null
        }
        Relationships: []
      }
      radio_station_config: {
        Row: {
          ai_dj_enabled: boolean | null
          created_at: string
          current_show_id: string | null
          emergency_mode: boolean | null
          id: string
          is_live: boolean
          station_description: string | null
          station_name: string
          station_tagline: string | null
          updated_at: string
        }
        Insert: {
          ai_dj_enabled?: boolean | null
          created_at?: string
          current_show_id?: string | null
          emergency_mode?: boolean | null
          id?: string
          is_live?: boolean
          station_description?: string | null
          station_name?: string
          station_tagline?: string | null
          updated_at?: string
        }
        Update: {
          ai_dj_enabled?: boolean | null
          created_at?: string
          current_show_id?: string | null
          emergency_mode?: boolean | null
          id?: string
          is_live?: boolean
          station_description?: string | null
          station_name?: string
          station_tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      radio_stats: {
        Row: {
          audio_quality_score: number | null
          created_at: string
          date: string
          dj_id: string | null
          engagement_score: number | null
          hour_slot: number
          id: string
          peak_listeners: number | null
          show_id: string | null
          total_listeners: number | null
          updated_at: string | null
        }
        Insert: {
          audio_quality_score?: number | null
          created_at?: string
          date?: string
          dj_id?: string | null
          engagement_score?: number | null
          hour_slot: number
          id?: string
          peak_listeners?: number | null
          show_id?: string | null
          total_listeners?: number | null
          updated_at?: string | null
        }
        Update: {
          audio_quality_score?: number | null
          created_at?: string
          date?: string
          dj_id?: string | null
          engagement_score?: number | null
          hour_slot?: number
          id?: string
          peak_listeners?: number | null
          show_id?: string | null
          total_listeners?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "radio_stats_dj_id_fkey"
            columns: ["dj_id"]
            isOneToOne: false
            referencedRelation: "radio_djs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_stats_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "radio_shows"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action: string
          created_at: string | null
          id: string
          identifier: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          identifier: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          identifier?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          category: string | null
          created_at: string
          id: string
          image_url: string | null
          ingredients: string | null
          instructions: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          ingredients?: string | null
          instructions?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          ingredients?: string | null
          instructions?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      referral_circle: {
        Row: {
          id: string
          referred_at: string
          referred_user_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          id?: string
          referred_at?: string
          referred_user_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          id?: string
          referred_at?: string
          referred_user_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          commission_amount: number
          commission_rate: number
          created_at: string
          id: string
          orchard_id: string | null
          paid_at: string | null
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          id?: string
          orchard_id?: string | null
          paid_at?: string | null
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          id?: string
          orchard_id?: string | null
          paid_at?: string | null
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_orchard_id_fkey"
            columns: ["orchard_id"]
            isOneToOne: false
            referencedRelation: "orchards"
            referencedColumns: ["id"]
          },
        ]
      }
      registered_agents: {
        Row: {
          agent_name: string
          agent_type: string
          api_key_hash: string | null
          capabilities: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          endpoint_url: string | null
          id: string
          is_active: boolean | null
          rate_limit_per_minute: number | null
          updated_at: string
        }
        Insert: {
          agent_name: string
          agent_type?: string
          api_key_hash?: string | null
          capabilities?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          endpoint_url?: string | null
          id?: string
          is_active?: boolean | null
          rate_limit_per_minute?: number | null
          updated_at?: string
        }
        Update: {
          agent_name?: string
          agent_type?: string
          api_key_hash?: string | null
          capabilities?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          endpoint_url?: string | null
          id?: string
          is_active?: boolean | null
          rate_limit_per_minute?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registered_agents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "registered_agents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      revenue_ledger: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          direction: string
          environment: string
          id: string
          idempotency_key: string | null
          kind: string
          notes: string | null
          period: string | null
          rail: string
          recognised_at: string
          release_ref: string | null
          source_id: string | null
          source_table: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          direction: string
          environment: string
          id?: string
          idempotency_key?: string | null
          kind: string
          notes?: string | null
          period?: string | null
          rail?: string
          recognised_at?: string
          release_ref?: string | null
          source_id?: string | null
          source_table?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          direction?: string
          environment?: string
          id?: string
          idempotency_key?: string | null
          kind?: string
          notes?: string | null
          period?: string | null
          rail?: string
          recognised_at?: string
          release_ref?: string | null
          source_id?: string | null
          source_table?: string | null
        }
        Relationships: []
      }
      room_gifts: {
        Row: {
          amount: number
          created_at: string
          gift_type: string
          id: string
          message: string | null
          recipient_id: string
          room_id: string
          sender_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          gift_type: string
          id?: string
          message?: string | null
          recipient_id: string
          room_id: string
          sender_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          gift_type?: string
          id?: string
          message?: string | null
          recipient_id?: string
          room_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_gifts_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_members: {
        Row: {
          id: string
          is_active: boolean | null
          joined_at: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_monetization: {
        Row: {
          ad_slots: Json | null
          created_at: string | null
          enable_ads: boolean | null
          enable_paid_entry: boolean | null
          entry_fee: number | null
          id: string
          room_id: string
          updated_at: string | null
        }
        Insert: {
          ad_slots?: Json | null
          created_at?: string | null
          enable_ads?: boolean | null
          enable_paid_entry?: boolean | null
          entry_fee?: number | null
          id?: string
          room_id: string
          updated_at?: string | null
        }
        Update: {
          ad_slots?: Json | null
          created_at?: string | null
          enable_ads?: boolean | null
          enable_paid_entry?: boolean | null
          entry_fee?: number | null
          id?: string
          room_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_monetization_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: true
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_participants: {
        Row: {
          hand_raised_at: string | null
          id: string
          is_muted: boolean | null
          is_speaking: boolean | null
          joined_at: string
          left_at: string | null
          queue_position: number | null
          role: string
          room_id: string
          user_id: string
        }
        Insert: {
          hand_raised_at?: string | null
          id?: string
          is_muted?: boolean | null
          is_speaking?: boolean | null
          joined_at?: string
          left_at?: string | null
          queue_position?: number | null
          role: string
          room_id: string
          user_id: string
        }
        Update: {
          hand_raised_at?: string | null
          id?: string
          is_muted?: boolean | null
          is_speaking?: boolean | null
          joined_at?: string
          left_at?: string | null
          queue_position?: number | null
          role?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_playlists: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          is_active: boolean | null
          playlist_id: string
          room_id: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          is_active?: boolean | null
          playlist_id: string
          room_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          is_active?: boolean | null
          playlist_id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_playlists_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "dj_playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_playlists_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_recordings: {
        Row: {
          audio_url: string
          created_at: string
          duration_seconds: number | null
          id: string
          room_id: string
          transcript: string | null
          user_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          room_id: string
          transcript?: string | null
          user_id: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          room_id?: string
          transcript?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_recordings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          admins: string[] | null
          co_host_users: Json | null
          co_hosts: string[] | null
          created_at: string
          creator_id: string
          description: string | null
          entry_fee: number | null
          host_user: Json | null
          id: string
          invite_slots: Json | null
          is_active: boolean | null
          layout: string | null
          max_participants: number | null
          name: string
          session_type: string | null
          starting_guests: string[] | null
          type: string | null
          updated_at: string
        }
        Insert: {
          admins?: string[] | null
          co_host_users?: Json | null
          co_hosts?: string[] | null
          created_at?: string
          creator_id: string
          description?: string | null
          entry_fee?: number | null
          host_user?: Json | null
          id?: string
          invite_slots?: Json | null
          is_active?: boolean | null
          layout?: string | null
          max_participants?: number | null
          name: string
          session_type?: string | null
          starting_guests?: string[] | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          admins?: string[] | null
          co_host_users?: Json | null
          co_hosts?: string[] | null
          created_at?: string
          creator_id?: string
          description?: string | null
          entry_fee?: number | null
          host_user?: Json | null
          id?: string
          invite_slots?: Json | null
          is_active?: boolean | null
          layout?: string | null
          max_participants?: number | null
          name?: string
          session_type?: string | null
          starting_guests?: string[] | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      s2g_agent_free_access: {
        Row: {
          created_at: string
          granted_by: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      s2g_companion_entitlements: {
        Row: {
          companion_slug: string
          mode: string
          monthly_quota: number | null
          notes: string | null
          tier: string
        }
        Insert: {
          companion_slug: string
          mode: string
          monthly_quota?: number | null
          notes?: string | null
          tier: string
        }
        Update: {
          companion_slug?: string
          mode?: string
          monthly_quota?: number | null
          notes?: string | null
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "s2g_companion_entitlements_companion_slug_fkey"
            columns: ["companion_slug"]
            isOneToOne: false
            referencedRelation: "s2g_companions"
            referencedColumns: ["slug"]
          },
        ]
      }
      s2g_companion_runs: {
        Row: {
          action: string | null
          artifact_url: string | null
          companion_slug: string
          cost_usd_estimate: number | null
          created_at: string
          error: string | null
          id: string
          input_summary: string | null
          kind: string | null
          model: string | null
          output_summary: string | null
          replicate_prediction_id: string | null
          status: string
          tier_at_run: string | null
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
        }
        Insert: {
          action?: string | null
          artifact_url?: string | null
          companion_slug: string
          cost_usd_estimate?: number | null
          created_at?: string
          error?: string | null
          id?: string
          input_summary?: string | null
          kind?: string | null
          model?: string | null
          output_summary?: string | null
          replicate_prediction_id?: string | null
          status?: string
          tier_at_run?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
        }
        Update: {
          action?: string | null
          artifact_url?: string | null
          companion_slug?: string
          cost_usd_estimate?: number | null
          created_at?: string
          error?: string | null
          id?: string
          input_summary?: string | null
          kind?: string | null
          model?: string | null
          output_summary?: string | null
          replicate_prediction_id?: string | null
          status?: string
          tier_at_run?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
        }
        Relationships: []
      }
      s2g_companion_usage: {
        Row: {
          companion_slug: string
          count: number
          last_used_at: string
          period_yyyymm: string
          user_id: string
        }
        Insert: {
          companion_slug: string
          count?: number
          last_used_at?: string
          period_yyyymm: string
          user_id: string
        }
        Update: {
          companion_slug?: string
          count?: number
          last_used_at?: string
          period_yyyymm?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "s2g_companion_usage_companion_slug_fkey"
            columns: ["companion_slug"]
            isOneToOne: false
            referencedRelation: "s2g_companions"
            referencedColumns: ["slug"]
          },
        ]
      }
      s2g_companions: {
        Row: {
          category: string
          created_at: string
          default_model: string
          emoji: string
          is_active: boolean
          layer: string
          name: string
          slug: string
          sort_order: number
          summary: string
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          default_model?: string
          emoji: string
          is_active?: boolean
          layer?: string
          name: string
          slug: string
          sort_order?: number
          summary: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          default_model?: string
          emoji?: string
          is_active?: boolean
          layer?: string
          name?: string
          slug?: string
          sort_order?: number
          summary?: string
          title?: string
        }
        Relationships: []
      }
      s2g_library_item_access: {
        Row: {
          access_type: string | null
          accessed_at: string | null
          id: string
          library_item_id: string
          user_id: string
        }
        Insert: {
          access_type?: string | null
          accessed_at?: string | null
          id?: string
          library_item_id: string
          user_id: string
        }
        Update: {
          access_type?: string | null
          accessed_at?: string | null
          id?: string
          library_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "s2g_library_item_access_library_item_id_fkey"
            columns: ["library_item_id"]
            isOneToOne: false
            referencedRelation: "s2g_library_items"
            referencedColumns: ["id"]
          },
        ]
      }
      s2g_library_items: {
        Row: {
          additional_files: Json | null
          bestowal_count: number | null
          category: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          download_count: number | null
          file_size: number | null
          file_url: string
          id: string
          is_public: boolean | null
          parent_study_id: string | null
          preview_url: string | null
          price: number | null
          section_order: number | null
          section_title: string | null
          study_number: number | null
          tags: string[] | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          additional_files?: Json | null
          bestowal_count?: number | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          file_size?: number | null
          file_url: string
          id?: string
          is_public?: boolean | null
          parent_study_id?: string | null
          preview_url?: string | null
          price?: number | null
          section_order?: number | null
          section_title?: string | null
          study_number?: number | null
          tags?: string[] | null
          title: string
          type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          additional_files?: Json | null
          bestowal_count?: number | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          file_size?: number | null
          file_url?: string
          id?: string
          is_public?: boolean | null
          parent_study_id?: string | null
          preview_url?: string | null
          price?: number | null
          section_order?: number | null
          section_title?: string | null
          study_number?: number | null
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "s2g_library_items_parent_study_id_fkey"
            columns: ["parent_study_id"]
            isOneToOne: false
            referencedRelation: "s2g_library_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sacred_day_scriptures: {
        Row: {
          created_at: string
          day: number
          month: number
          note: string | null
          portal: string | null
          song: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          day: number
          month: number
          note?: string | null
          portal?: string | null
          song?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          day?: number
          month?: number
          note?: string | null
          portal?: string | null
          song?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sacred_moon_phases: {
        Row: {
          created_at: string
          day_of_year: number
          illumination_pct: number
          phase: string
          sample_gregorian_date: string | null
        }
        Insert: {
          created_at?: string
          day_of_year: number
          illumination_pct: number
          phase: string
          sample_gregorian_date?: string | null
        }
        Update: {
          created_at?: string
          day_of_year?: number
          illumination_pct?: number
          phase?: string
          sample_gregorian_date?: string | null
        }
        Relationships: []
      }
      seasonal_calendar_art: {
        Row: {
          created_at: string
          id: string
          image_url: string
          model: string
          prompt: string
          region_key: string
          scriptural_month: number
          season_label: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          model: string
          prompt: string
          region_key: string
          scriptural_month: number
          season_label: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          model?: string
          prompt?: string
          region_key?: string
          scriptural_month?: number
          season_label?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      seed_analytics_daily: {
        Row: {
          bestowals_amount: number
          bestowals_count: number
          calls: number
          clicks: number
          created_at: string
          id: string
          messages: number
          metric_date: string
          reach: number
          seed_id: string
          updated_at: string
          user_id: string
          views: number
        }
        Insert: {
          bestowals_amount?: number
          bestowals_count?: number
          calls?: number
          clicks?: number
          created_at?: string
          id?: string
          messages?: number
          metric_date: string
          reach?: number
          seed_id: string
          updated_at?: string
          user_id: string
          views?: number
        }
        Update: {
          bestowals_amount?: number
          bestowals_count?: number
          calls?: number
          clicks?: number
          created_at?: string
          id?: string
          messages?: number
          metric_date?: string
          reach?: number
          seed_id?: string
          updated_at?: string
          user_id?: string
          views?: number
        }
        Relationships: []
      }
      seed_story_overrides: {
        Row: {
          created_at: string
          id: string
          seed_id: string
          story_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          seed_id: string
          story_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          seed_id?: string
          story_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seed_submissions: {
        Row: {
          admin_notes: string | null
          content: string | null
          created_at: string
          description: string
          id: string
          reviewed_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          content?: string | null
          created_at?: string
          description: string
          id?: string
          reviewed_at?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          content?: string | null
          created_at?: string
          description?: string
          id?: string
          reviewed_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seeds: {
        Row: {
          additional_details: Json | null
          category: string
          created_at: string
          description: string
          gifter_id: string
          id: string
          images: string[] | null
          music_genre: string | null
          music_mood: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          additional_details?: Json | null
          category: string
          created_at?: string
          description: string
          gifter_id: string
          id?: string
          images?: string[] | null
          music_genre?: string | null
          music_mood?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          additional_details?: Json | null
          category?: string
          created_at?: string
          description?: string
          gifter_id?: string
          id?: string
          images?: string[] | null
          music_genre?: string | null
          music_mood?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seeds_gifter_id_fkey"
            columns: ["gifter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "seeds_gifter_id_fkey"
            columns: ["gifter_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      seller_credentials: {
        Row: {
          created_at: string
          credential_type: string
          expires_at: string | null
          file_url: string | null
          id: string
          notes: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_status"]
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credential_type: string
          expires_at?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credential_type?: string
          expires_at?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sentinel_avatar_watch: {
        Row: {
          avatar_hash: string | null
          avatar_length: number | null
          avatar_present: boolean
          checked_at: string
          user_id: string
        }
        Insert: {
          avatar_hash?: string | null
          avatar_length?: number | null
          avatar_present: boolean
          checked_at?: string
          user_id: string
        }
        Update: {
          avatar_hash?: string | null
          avatar_length?: number | null
          avatar_present?: boolean
          checked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sentinel_events: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          check_name: string
          created_at: string
          detail: Json | null
          first_seen: string
          id: string
          last_notified_at: string | null
          last_seen: string
          message: string
          resolved_at: string | null
          severity: string
          status: string
          subject: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          check_name: string
          created_at?: string
          detail?: Json | null
          first_seen?: string
          id?: string
          last_notified_at?: string | null
          last_seen?: string
          message: string
          resolved_at?: string | null
          severity: string
          status?: string
          subject?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          check_name?: string
          created_at?: string
          detail?: Json | null
          first_seen?: string
          id?: string
          last_notified_at?: string | null
          last_seen?: string
          message?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          subject?: string | null
        }
        Relationships: []
      }
      service_provider_availability: {
        Row: {
          available_date: string
          created_at: string
          id: string
          locations_available: string[] | null
          notes: string | null
          provider_id: string
          time_slots: string[] | null
        }
        Insert: {
          available_date: string
          created_at?: string
          id?: string
          locations_available?: string[] | null
          notes?: string | null
          provider_id: string
          time_slots?: string[] | null
        }
        Update: {
          available_date?: string
          created_at?: string
          id?: string
          locations_available?: string[] | null
          notes?: string | null
          provider_id?: string
          time_slots?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "service_provider_availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_providers: {
        Row: {
          city: string | null
          completed_jobs: number | null
          contact_email: string
          contact_phone: string
          country: string | null
          created_at: string
          custom_services: string[] | null
          description: string | null
          distance_unit: string | null
          earnings_balance: number | null
          full_name: string
          hourly_rate: number | null
          id: string
          no_income_confirmed: boolean
          portfolio_images: string[] | null
          rating: number | null
          service_areas: string[] | null
          service_radius: number | null
          services_offered: string[]
          skills: Json | null
          status: string
          stripe_connect_account_id: string | null
          updated_at: string
          user_id: string
          verification_status: string | null
        }
        Insert: {
          city?: string | null
          completed_jobs?: number | null
          contact_email: string
          contact_phone: string
          country?: string | null
          created_at?: string
          custom_services?: string[] | null
          description?: string | null
          distance_unit?: string | null
          earnings_balance?: number | null
          full_name: string
          hourly_rate?: number | null
          id?: string
          no_income_confirmed?: boolean
          portfolio_images?: string[] | null
          rating?: number | null
          service_areas?: string[] | null
          service_radius?: number | null
          services_offered?: string[]
          skills?: Json | null
          status?: string
          stripe_connect_account_id?: string | null
          updated_at?: string
          user_id: string
          verification_status?: string | null
        }
        Update: {
          city?: string | null
          completed_jobs?: number | null
          contact_email?: string
          contact_phone?: string
          country?: string | null
          created_at?: string
          custom_services?: string[] | null
          description?: string | null
          distance_unit?: string | null
          earnings_balance?: number | null
          full_name?: string
          hourly_rate?: number | null
          id?: string
          no_income_confirmed?: boolean
          portfolio_images?: string[] | null
          rating?: number | null
          service_areas?: string[] | null
          service_radius?: number | null
          services_offered?: string[]
          skills?: Json | null
          status?: string
          stripe_connect_account_id?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: string | null
        }
        Relationships: []
      }
      service_quote_requests: {
        Row: {
          created_at: string
          id: string
          job_description: string
          location: string
          notes: string | null
          preferred_date: string | null
          preferred_time: string | null
          provider_id: string
          requester_id: string
          service_needed: string
          status: string
          updated_at: string
          urgency: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          job_description: string
          location: string
          notes?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          provider_id: string
          requester_id: string
          service_needed: string
          status?: string
          updated_at?: string
          urgency?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          job_description?: string
          location?: string
          notes?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          provider_id?: string
          requester_id?: string
          service_needed?: string
          status?: string
          updated_at?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_quote_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_quotes: {
        Row: {
          created_at: string
          currency: string
          estimated_duration: string | null
          id: string
          message: string | null
          provider_id: string
          quote_amount: number
          request_id: string
          status: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          estimated_duration?: string | null
          id?: string
          message?: string | null
          provider_id: string
          quote_amount: number
          request_id: string
          status?: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          estimated_duration?: string | null
          id?: string
          message?: string | null
          provider_id?: string
          quote_amount?: number
          request_id?: string
          status?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_quotes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_zones: {
        Row: {
          active_drivers_count: number | null
          base_fare_per_km: number | null
          boundary_geojson: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          min_trip_minutes: number | null
          name: string
          surge_multiplier: number | null
          updated_at: string | null
        }
        Insert: {
          active_drivers_count?: number | null
          base_fare_per_km?: number | null
          boundary_geojson?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          min_trip_minutes?: number | null
          name: string
          surge_multiplier?: number | null
          updated_at?: string | null
        }
        Update: {
          active_drivers_count?: number | null
          base_fare_per_km?: number | null
          boundary_geojson?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          min_trip_minutes?: number | null
          name?: string
          surge_multiplier?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      session_documents: {
        Row: {
          created_at: string
          current_page: number | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          is_active: boolean | null
          session_id: string
          total_pages: number | null
          updated_at: string
          uploader_id: string
        }
        Insert: {
          created_at?: string
          current_page?: number | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          is_active?: boolean | null
          session_id: string
          total_pages?: number | null
          updated_at?: string
          uploader_id: string
        }
        Update: {
          created_at?: string
          current_page?: number | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          is_active?: boolean | null
          session_id?: string
          total_pages?: number | null
          updated_at?: string
          uploader_id?: string
        }
        Relationships: []
      }
      session_listeners: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          id: string
          is_active: boolean | null
          joined_at: string
          last_seen: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          joined_at?: string
          last_seen?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          joined_at?: string
          last_seen?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      settlement_consents: {
        Row: {
          accepted_at: string
          id: string
          ip: string | null
          user_id: string
          version: number
        }
        Insert: {
          accepted_at?: string
          id?: string
          ip?: string | null
          user_id: string
          version: number
        }
        Update: {
          accepted_at?: string
          id?: string
          ip?: string | null
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      signup_attempts: {
        Row: {
          created_at: string
          email: string | null
          error_code: string | null
          error_message: string | null
          first_name: string | null
          id: string
          ip_text: string | null
          last_name: string | null
          referral_code: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          error_code?: string | null
          error_message?: string | null
          first_name?: string | null
          id?: string
          ip_text?: string | null
          last_name?: string | null
          referral_code?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          error_code?: string | null
          error_message?: string | null
          first_name?: string | null
          id?: string
          ip_text?: string | null
          last_name?: string | null
          referral_code?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      skilldrop_host_applications: {
        Row: {
          created_at: string
          description: string | null
          experience_summary: string | null
          expertise_area: string
          full_name: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          experience_summary?: string | null
          expertise_area: string
          full_name: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          experience_summary?: string | null
          expertise_area?: string
          full_name?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      skilldrop_session_subscriptions: {
        Row: {
          amount: number
          cancelled_at: string | null
          created_at: string
          currency: string
          expires_at: string
          host_id: string
          id: string
          payment_method: string | null
          payment_reference: string | null
          session_id: string | null
          session_type: string
          started_at: string
          status: string
          subscriber_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          expires_at?: string
          host_id: string
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          session_id?: string | null
          session_type?: string
          started_at?: string
          status?: string
          subscriber_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          expires_at?: string
          host_id?: string
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          session_id?: string | null
          session_type?: string
          started_at?: string
          status?: string
          subscriber_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      skilldrop_sessions: {
        Row: {
          attendees_count: number | null
          chat_room_id: string | null
          circle_id: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          host_approved: boolean | null
          id: string
          is_gosat_session: boolean | null
          presenter_id: string
          presenter_profile_id: string | null
          pricing_type: string
          recording_url: string | null
          scheduled_at: string
          session_fee: number | null
          slides_url: string | null
          status: string | null
          title: string
          topic_id: string | null
          topic_question_id: string | null
          updated_at: string | null
        }
        Insert: {
          attendees_count?: number | null
          chat_room_id?: string | null
          circle_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          host_approved?: boolean | null
          id?: string
          is_gosat_session?: boolean | null
          presenter_id: string
          presenter_profile_id?: string | null
          pricing_type?: string
          recording_url?: string | null
          scheduled_at: string
          session_fee?: number | null
          slides_url?: string | null
          status?: string | null
          title: string
          topic_id?: string | null
          topic_question_id?: string | null
          updated_at?: string | null
        }
        Update: {
          attendees_count?: number | null
          chat_room_id?: string | null
          circle_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          host_approved?: boolean | null
          id?: string
          is_gosat_session?: boolean | null
          presenter_id?: string
          presenter_profile_id?: string | null
          pricing_type?: string
          recording_url?: string | null
          scheduled_at?: string
          session_fee?: number | null
          slides_url?: string | null
          status?: string | null
          title?: string
          topic_id?: string | null
          topic_question_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lecture_halls_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecture_halls_presenter_profile_id_fkey"
            columns: ["presenter_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecture_halls_presenter_profile_id_fkey"
            columns: ["presenter_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skilldrop_sessions_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      solana_payment_intents: {
        Row: {
          amount_usdc: number
          checked_at: string | null
          client_signature: string | null
          cluster: string
          created_at: string
          expires_at: string
          hot_wallet_address: string
          id: string
          order_id: string
          order_kind: string
          paid_at: string | null
          payer_address: string | null
          payer_source: string | null
          received_amount_usdc: number | null
          reference_pubkey: string
          signature: string | null
          status: string
        }
        Insert: {
          amount_usdc: number
          checked_at?: string | null
          client_signature?: string | null
          cluster?: string
          created_at?: string
          expires_at: string
          hot_wallet_address: string
          id?: string
          order_id: string
          order_kind: string
          paid_at?: string | null
          payer_address?: string | null
          payer_source?: string | null
          received_amount_usdc?: number | null
          reference_pubkey: string
          signature?: string | null
          status?: string
        }
        Update: {
          amount_usdc?: number
          checked_at?: string | null
          client_signature?: string | null
          cluster?: string
          created_at?: string
          expires_at?: string
          hot_wallet_address?: string
          id?: string
          order_id?: string
          order_kind?: string
          paid_at?: string | null
          payer_address?: string | null
          payer_source?: string | null
          received_amount_usdc?: number | null
          reference_pubkey?: string
          signature?: string | null
          status?: string
        }
        Relationships: []
      }
      song_votes: {
        Row: {
          created_at: string
          id: string
          song_id: string
          user_id: string
          week_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          song_id: string
          user_id: string
          week_id: string
        }
        Update: {
          created_at?: string
          id?: string
          song_id?: string
          user_id?: string
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "song_votes_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "dj_music_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      sower_balances: {
        Row: {
          available_balance: number | null
          created_at: string
          currency: string | null
          id: string
          last_payout_at: string | null
          pending_balance: number | null
          total_earned: number | null
          total_withdrawn: number | null
          updated_at: string
          user_id: string
          wallet_address: string | null
          wallet_type: string | null
        }
        Insert: {
          available_balance?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          last_payout_at?: string | null
          pending_balance?: number | null
          total_earned?: number | null
          total_withdrawn?: number | null
          updated_at?: string
          user_id: string
          wallet_address?: string | null
          wallet_type?: string | null
        }
        Update: {
          available_balance?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          last_payout_at?: string | null
          pending_balance?: number | null
          total_earned?: number | null
          total_withdrawn?: number | null
          updated_at?: string
          user_id?: string
          wallet_address?: string | null
          wallet_type?: string | null
        }
        Relationships: []
      }
      sower_books: {
        Row: {
          bestowal_value: number | null
          category: string | null
          cover_image_url: string | null
          created_at: string
          delivery_type: string | null
          description: string | null
          genre: string | null
          has_whisperer: boolean | null
          id: string
          image_urls: string[]
          is_available: boolean | null
          is_public: boolean | null
          isbn: string | null
          language: string | null
          max_whisperers: number | null
          page_count: number | null
          published_date: string | null
          publisher: string | null
          purchase_link: string | null
          sower_id: string
          status: string | null
          title: string
          updated_at: string
          user_id: string
          wandering_role: string | null
          whisperer_commission_percent: number | null
        }
        Insert: {
          bestowal_value?: number | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          delivery_type?: string | null
          description?: string | null
          genre?: string | null
          has_whisperer?: boolean | null
          id?: string
          image_urls?: string[]
          is_available?: boolean | null
          is_public?: boolean | null
          isbn?: string | null
          language?: string | null
          max_whisperers?: number | null
          page_count?: number | null
          published_date?: string | null
          publisher?: string | null
          purchase_link?: string | null
          sower_id: string
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
          wandering_role?: string | null
          whisperer_commission_percent?: number | null
        }
        Update: {
          bestowal_value?: number | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          delivery_type?: string | null
          description?: string | null
          genre?: string | null
          has_whisperer?: boolean | null
          id?: string
          image_urls?: string[]
          is_available?: boolean | null
          is_public?: boolean | null
          isbn?: string | null
          language?: string | null
          max_whisperers?: number | null
          page_count?: number | null
          published_date?: string | null
          publisher?: string | null
          purchase_link?: string | null
          sower_id?: string
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          wandering_role?: string | null
          whisperer_commission_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sower_books_sower_id_fkey"
            columns: ["sower_id"]
            isOneToOne: false
            referencedRelation: "sowers"
            referencedColumns: ["id"]
          },
        ]
      }
      sower_brands: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          logo_url: string | null
          name: string
          tagline: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          logo_url?: string | null
          name: string
          tagline?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          logo_url?: string | null
          name?: string
          tagline?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sower_payout_wallets: {
        Row: {
          created_at: string
          updated_at: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          updated_at?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          updated_at?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      sower_payouts: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          currency: string | null
          failure_reason: string | null
          id: string
          metadata: Json | null
          payout_batch_id: string | null
          payout_provider: string | null
          payout_reference: string | null
          processed_at: string | null
          requested_at: string
          status: string | null
          updated_at: string
          user_id: string
          wallet_address: string
          wallet_type: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          payout_batch_id?: string | null
          payout_provider?: string | null
          payout_reference?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: string | null
          updated_at?: string
          user_id: string
          wallet_address: string
          wallet_type?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          payout_batch_id?: string | null
          payout_provider?: string | null
          payout_reference?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: string | null
          updated_at?: string
          user_id?: string
          wallet_address?: string
          wallet_type?: string | null
        }
        Relationships: []
      }
      sower_stories: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_published: boolean | null
          media_urls: string[] | null
          published_at: string | null
          sower_id: string
          story_type: string | null
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_published?: boolean | null
          media_urls?: string[] | null
          published_at?: string | null
          sower_id: string
          story_type?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_published?: boolean | null
          media_urls?: string[] | null
          published_at?: string | null
          sower_id?: string
          story_type?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sower_stories_sower_id_fkey"
            columns: ["sower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sower_stories_sower_id_fkey"
            columns: ["sower_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      sowers: {
        Row: {
          banner_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string
          id: string
          is_verified: boolean | null
          logo_url: string | null
          seller_template: string | null
          slug: string | null
          tagline: string | null
          tier: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          is_verified?: boolean | null
          logo_url?: string | null
          seller_template?: string | null
          slug?: string | null
          tagline?: string | null
          tier?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          is_verified?: boolean | null
          logo_url?: string | null
          seller_template?: string | null
          slug?: string | null
          tagline?: string | null
          tier?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      stall_visits: {
        Row: {
          last_seen_at: string
          stall_user_id: string
          viewer_id: string
        }
        Insert: {
          last_seen_at?: string
          stall_user_id: string
          viewer_id: string
        }
        Update: {
          last_seen_at?: string
          stall_user_id?: string
          viewer_id?: string
        }
        Relationships: []
      }
      stalls: {
        Row: {
          categories: string[]
          category: string
          created_at: string
          enter_via_front: boolean
          front_image_path: string | null
          hotspots: Json | null
          id: string
          interior_image_path: string | null
          name: string
          published: boolean
          story: string | null
          story_pdf_path: string | null
          story_photo_path: string | null
          tagline: string | null
          tier: string
          tiles: Json
          updated_at: string
          user_id: string
          village: string | null
          welcome_audio_path: string | null
        }
        Insert: {
          categories: string[]
          category: string
          created_at?: string
          enter_via_front?: boolean
          front_image_path?: string | null
          hotspots?: Json | null
          id?: string
          interior_image_path?: string | null
          name: string
          published?: boolean
          story?: string | null
          story_pdf_path?: string | null
          story_photo_path?: string | null
          tagline?: string | null
          tier?: string
          tiles?: Json
          updated_at?: string
          user_id: string
          village?: string | null
          welcome_audio_path?: string | null
        }
        Update: {
          categories?: string[]
          category?: string
          created_at?: string
          enter_via_front?: boolean
          front_image_path?: string | null
          hotspots?: Json | null
          id?: string
          interior_image_path?: string | null
          name?: string
          published?: boolean
          story?: string | null
          story_pdf_path?: string | null
          story_photo_path?: string | null
          tagline?: string | null
          tier?: string
          tiles?: Json
          updated_at?: string
          user_id?: string
          village?: string | null
          welcome_audio_path?: string | null
        }
        Relationships: []
      }
      statutory_deductions: {
        Row: {
          applies: boolean
          business_id: string
          created_at: string
          employee_pct: number
          employer_pct: number
          id: string
          label: string
          sort_order: number
          tax_code: string | null
          updated_at: string
          wage_cap: number | null
        }
        Insert: {
          applies?: boolean
          business_id: string
          created_at?: string
          employee_pct?: number
          employer_pct?: number
          id?: string
          label: string
          sort_order?: number
          tax_code?: string | null
          updated_at?: string
          wage_cap?: number | null
        }
        Update: {
          applies?: boolean
          business_id?: string
          created_at?: string
          employee_pct?: number
          employer_pct?: number
          id?: string
          label?: string
          sort_order?: number
          tax_code?: string | null
          updated_at?: string
          wage_cap?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "statutory_deductions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stay_availability: {
        Row: {
          custom_price: number | null
          date: string
          id: string
          is_available: boolean | null
          notes: string | null
          unit_id: string
        }
        Insert: {
          custom_price?: number | null
          date: string
          id?: string
          is_available?: boolean | null
          notes?: string | null
          unit_id: string
        }
        Update: {
          custom_price?: number | null
          date?: string
          id?: string
          is_available?: boolean | null
          notes?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stay_availability_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "stay_units"
            referencedColumns: ["id"]
          },
        ]
      }
      stay_bookings: {
        Row: {
          check_in: string
          check_out: string
          created_at: string
          currency: string
          guest_email: string | null
          guest_id: string
          guest_name: string | null
          guest_phone: string | null
          guests_count: number
          id: string
          listing_id: string
          payment_reference: string | null
          payment_status: string | null
          sower_id: string
          sower_message: string | null
          special_requests: string | null
          status: string
          total_price: number
          unit_id: string
          updated_at: string
        }
        Insert: {
          check_in: string
          check_out: string
          created_at?: string
          currency?: string
          guest_email?: string | null
          guest_id: string
          guest_name?: string | null
          guest_phone?: string | null
          guests_count?: number
          id?: string
          listing_id: string
          payment_reference?: string | null
          payment_status?: string | null
          sower_id: string
          sower_message?: string | null
          special_requests?: string | null
          status?: string
          total_price: number
          unit_id: string
          updated_at?: string
        }
        Update: {
          check_in?: string
          check_out?: string
          created_at?: string
          currency?: string
          guest_email?: string | null
          guest_id?: string
          guest_name?: string | null
          guest_phone?: string | null
          guests_count?: number
          id?: string
          listing_id?: string
          payment_reference?: string | null
          payment_status?: string | null
          sower_id?: string
          sower_message?: string | null
          special_requests?: string | null
          status?: string
          total_price?: number
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stay_bookings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "stay_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stay_bookings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "stay_units"
            referencedColumns: ["id"]
          },
        ]
      }
      stay_listings: {
        Row: {
          activities: string[] | null
          address: string | null
          amenities: string[] | null
          avg_rating: number | null
          business_name: string
          cancellation_policy: string | null
          check_in_time: string | null
          check_out_time: string | null
          city: string | null
          country: string
          cover_photo: string | null
          created_at: string
          description: string | null
          farm_produce: string[] | null
          house_rules: string | null
          id: string
          is_featured: boolean | null
          latitude: number | null
          linked_orchard_id: string | null
          longitude: number | null
          pet_friendly: boolean | null
          photos: string[] | null
          property_type: string
          province: string | null
          short_description: string | null
          sower_id: string
          status: string
          total_reviews: number | null
          updated_at: string
        }
        Insert: {
          activities?: string[] | null
          address?: string | null
          amenities?: string[] | null
          avg_rating?: number | null
          business_name: string
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          city?: string | null
          country?: string
          cover_photo?: string | null
          created_at?: string
          description?: string | null
          farm_produce?: string[] | null
          house_rules?: string | null
          id?: string
          is_featured?: boolean | null
          latitude?: number | null
          linked_orchard_id?: string | null
          longitude?: number | null
          pet_friendly?: boolean | null
          photos?: string[] | null
          property_type?: string
          province?: string | null
          short_description?: string | null
          sower_id: string
          status?: string
          total_reviews?: number | null
          updated_at?: string
        }
        Update: {
          activities?: string[] | null
          address?: string | null
          amenities?: string[] | null
          avg_rating?: number | null
          business_name?: string
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          city?: string | null
          country?: string
          cover_photo?: string | null
          created_at?: string
          description?: string | null
          farm_produce?: string[] | null
          house_rules?: string | null
          id?: string
          is_featured?: boolean | null
          latitude?: number | null
          linked_orchard_id?: string | null
          longitude?: number | null
          pet_friendly?: boolean | null
          photos?: string[] | null
          property_type?: string
          province?: string | null
          short_description?: string | null
          sower_id?: string
          status?: string
          total_reviews?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      stay_reviews: {
        Row: {
          booking_id: string
          created_at: string
          host_response: string | null
          id: string
          listing_id: string
          rating: number
          review_text: string | null
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          host_response?: string | null
          id?: string
          listing_id: string
          rating: number
          review_text?: string | null
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          host_response?: string | null
          id?: string
          listing_id?: string
          rating?: number
          review_text?: string | null
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stay_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "stay_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stay_reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "stay_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      stay_seasonal_pricing: {
        Row: {
          created_at: string
          end_date: string
          id: string
          min_nights: number | null
          price_per_night: number
          season_name: string
          start_date: string
          unit_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          min_nights?: number | null
          price_per_night: number
          season_name: string
          start_date: string
          unit_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          min_nights?: number | null
          price_per_night?: number
          season_name?: string
          start_date?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stay_seasonal_pricing_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "stay_units"
            referencedColumns: ["id"]
          },
        ]
      }
      stay_units: {
        Row: {
          amenities: string[] | null
          bathrooms: number | null
          bedrooms: number | null
          beds_description: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean | null
          listing_id: string
          max_guests: number
          name: string
          photos: string[] | null
          price_per_night: number
          unit_type: string | null
          updated_at: string
          weekend_price: number | null
        }
        Insert: {
          amenities?: string[] | null
          bathrooms?: number | null
          bedrooms?: number | null
          beds_description?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          listing_id: string
          max_guests?: number
          name: string
          photos?: string[] | null
          price_per_night?: number
          unit_type?: string | null
          updated_at?: string
          weekend_price?: number | null
        }
        Update: {
          amenities?: string[] | null
          bathrooms?: number | null
          bedrooms?: number | null
          beds_description?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          listing_id?: string
          max_guests?: number
          name?: string
          photos?: string[] | null
          price_per_night?: number
          unit_type?: string | null
          updated_at?: string
          weekend_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stay_units_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "stay_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      stay_wishlists: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stay_wishlists_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "stay_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_analytics: {
        Row: {
          event_data: Json | null
          event_type: string
          id: string
          stream_id: string
          timestamp: string
          viewer_id: string | null
        }
        Insert: {
          event_data?: Json | null
          event_type: string
          id?: string
          stream_id: string
          timestamp?: string
          viewer_id?: string | null
        }
        Update: {
          event_data?: Json | null
          event_type?: string
          id?: string
          stream_id?: string
          timestamp?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stream_analytics_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_analytics_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "public_live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string
          metadata: Json | null
          stream_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json | null
          stream_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json | null
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_chat_messages_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_chat_messages_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "public_live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_recordings: {
        Row: {
          created_at: string
          duration_seconds: number | null
          file_path: string
          file_size: number | null
          format: string
          id: string
          processed_at: string | null
          quality: string
          status: string
          stream_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          file_path: string
          file_size?: number | null
          format?: string
          id?: string
          processed_at?: string | null
          quality: string
          status?: string
          stream_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          file_path?: string
          file_size?: number | null
          format?: string
          id?: string
          processed_at?: string | null
          quality?: string
          status?: string
          stream_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_recordings_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_recordings_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "public_live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_viewers: {
        Row: {
          id: string
          is_active: boolean
          joined_at: string
          last_seen: string
          quality_preference: string | null
          stream_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          joined_at?: string
          last_seen?: string
          quality_preference?: string | null
          stream_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_active?: boolean
          joined_at?: string
          last_seen?: string
          quality_preference?: string | null
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_viewers_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_viewers_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "public_live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      study_subscriptions: {
        Row: {
          amount: number
          auto_renew: boolean
          cancelled_at: string | null
          created_at: string
          currency: string
          expires_at: string
          id: string
          payment_method: string | null
          payment_reference: string | null
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          auto_renew?: boolean
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          expires_at: string
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          auto_renew?: boolean
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          expires_at?: string
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      supplier_quotes: {
        Row: {
          amount: number
          attached_document_path: string | null
          created_at: string
          currency: string
          id: string
          job_notes_id: string
          notes: string | null
          supplier_name: string
        }
        Insert: {
          amount: number
          attached_document_path?: string | null
          created_at?: string
          currency?: string
          id?: string
          job_notes_id: string
          notes?: string | null
          supplier_name: string
        }
        Update: {
          amount?: number
          attached_document_path?: string | null
          created_at?: string
          currency?: string
          id?: string
          job_notes_id?: string
          notes?: string | null
          supplier_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_quotes_job_notes_id_fkey"
            columns: ["job_notes_id"]
            isOneToOne: false
            referencedRelation: "job_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      topups: {
        Row: {
          amount: number
          created_at: string
          credited_at: string | null
          currency: string
          fee_amount: number
          id: string
          metadata: Json
          provider: string
          provider_order_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credited_at?: string | null
          currency?: string
          fee_amount?: number
          id?: string
          metadata?: Json
          provider: string
          provider_order_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credited_at?: string | null
          currency?: string
          fee_amount?: number
          id?: string
          metadata?: Json
          provider?: string
          provider_order_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      training_courses: {
        Row: {
          circle_id: string | null
          completion_certificate: boolean | null
          created_at: string | null
          description: string | null
          id: string
          instructor_id: string
          instructor_profile_id: string | null
          is_public: boolean | null
          price_usdt: number | null
          thumbnail_url: string | null
          title: string
          total_modules: number | null
          total_xp: number | null
          updated_at: string | null
        }
        Insert: {
          circle_id?: string | null
          completion_certificate?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          instructor_id: string
          instructor_profile_id?: string | null
          is_public?: boolean | null
          price_usdt?: number | null
          thumbnail_url?: string | null
          title: string
          total_modules?: number | null
          total_xp?: number | null
          updated_at?: string | null
        }
        Update: {
          circle_id?: string | null
          completion_certificate?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          instructor_id?: string
          instructor_profile_id?: string | null
          is_public?: boolean | null
          price_usdt?: number | null
          thumbnail_url?: string | null
          title?: string
          total_modules?: number | null
          total_xp?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_courses_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_courses_instructor_profile_id_fkey"
            columns: ["instructor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_courses_instructor_profile_id_fkey"
            columns: ["instructor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      training_modules: {
        Row: {
          content: string | null
          course_id: string
          created_at: string | null
          description: string | null
          id: string
          resources: Json | null
          sort_order: number | null
          title: string
          video_url: string | null
          xp_reward: number | null
        }
        Insert: {
          content?: string | null
          course_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          resources?: Json | null
          sort_order?: number | null
          title: string
          video_url?: string | null
          xp_reward?: number | null
        }
        Update: {
          content?: string | null
          course_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          resources?: Json | null
          sort_order?: number | null
          title?: string
          video_url?: string | null
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      training_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          course_id: string
          created_at: string | null
          id: string
          module_id: string | null
          progress_percent: number | null
          updated_at: string | null
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          module_id?: string | null
          progress_percent?: number | null
          updated_at?: string | null
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          module_id?: string | null
          progress_percent?: number | null
          updated_at?: string | null
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_movements: {
        Row: {
          amount_usd: number
          created_at: string
          created_by: string | null
          currency: string
          environment: string
          id: string
          kind: string
          notes: string
          occurred_at: string
          reference: string | null
          wallet: string
        }
        Insert: {
          amount_usd: number
          created_at?: string
          created_by?: string | null
          currency?: string
          environment?: string
          id?: string
          kind: string
          notes: string
          occurred_at?: string
          reference?: string | null
          wallet: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          environment?: string
          id?: string
          kind?: string
          notes?: string
          occurred_at?: string
          reference?: string | null
          wallet?: string
        }
        Relationships: []
      }
      treasury_sweeps: {
        Row: {
          amount_usdc: number
          balance_before_usdc: number
          ceiling_usd: number
          created_at: string
          error: string | null
          from_address: string
          id: string
          solana_cluster: string
          solana_tx_signature: string | null
          status: string
          to_address: string
          triggered_by: string
        }
        Insert: {
          amount_usdc: number
          balance_before_usdc: number
          ceiling_usd: number
          created_at?: string
          error?: string | null
          from_address: string
          id?: string
          solana_cluster: string
          solana_tx_signature?: string | null
          status: string
          to_address: string
          triggered_by: string
        }
        Update: {
          amount_usdc?: number
          balance_before_usdc?: number
          ceiling_usd?: number
          created_at?: string
          error?: string | null
          from_address?: string
          id?: string
          solana_cluster?: string
          solana_tx_signature?: string | null
          status?: string
          to_address?: string
          triggered_by?: string
        }
        Relationships: []
      }
      tribal_event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          reminder_sent: boolean
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          reminder_sent?: boolean
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          reminder_sent?: boolean
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tribal_event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "tribal_events"
            referencedColumns: ["id"]
          },
        ]
      }
      tribal_events: {
        Row: {
          capacity: number | null
          category: string | null
          circle_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          event_type: string
          host_id: string
          id: string
          is_auto_generated: boolean
          jitsi_room_id: string | null
          metadata: Json | null
          region: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          category?: string | null
          circle_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          event_type: string
          host_id: string
          id?: string
          is_auto_generated?: boolean
          jitsi_room_id?: string | null
          metadata?: Json | null
          region?: string | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          category?: string | null
          circle_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          event_type?: string
          host_id?: string
          id?: string
          is_auto_generated?: boolean
          jitsi_room_id?: string | null
          metadata?: Json | null
          region?: string | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tribal_events_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      tribal_hearts_answers: {
        Row: {
          answer: string
          created_at: string
          id: string
          question_key: string
          question_text: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          question_key: string
          question_text: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          question_key?: string
          question_text?: string
          user_id?: string
        }
        Relationships: []
      }
      tribal_hearts_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
          is_report: boolean
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
          is_report?: boolean
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
          is_report?: boolean
          reason?: string | null
        }
        Relationships: []
      }
      tribal_hearts_matches: {
        Row: {
          a_response: Database["public"]["Enums"]["hearts_response"]
          b_response: Database["public"]["Enums"]["hearts_response"]
          chat_room_id: string | null
          compatibility_score: number
          created_at: string
          id: string
          match_reasons: Json
          member_a_id: string
          member_b_id: string
          spark_message: string | null
          spark_voice_url: string | null
          status: Database["public"]["Enums"]["hearts_match_status"]
          updated_at: string
        }
        Insert: {
          a_response?: Database["public"]["Enums"]["hearts_response"]
          b_response?: Database["public"]["Enums"]["hearts_response"]
          chat_room_id?: string | null
          compatibility_score?: number
          created_at?: string
          id?: string
          match_reasons?: Json
          member_a_id: string
          member_b_id: string
          spark_message?: string | null
          spark_voice_url?: string | null
          status?: Database["public"]["Enums"]["hearts_match_status"]
          updated_at?: string
        }
        Update: {
          a_response?: Database["public"]["Enums"]["hearts_response"]
          b_response?: Database["public"]["Enums"]["hearts_response"]
          chat_room_id?: string | null
          compatibility_score?: number
          created_at?: string
          id?: string
          match_reasons?: Json
          member_a_id?: string
          member_b_id?: string
          spark_message?: string | null
          spark_voice_url?: string | null
          status?: Database["public"]["Enums"]["hearts_match_status"]
          updated_at?: string
        }
        Relationships: []
      }
      tribal_hearts_profiles: {
        Row: {
          about_seen_at: string | null
          age_verified: boolean
          bio: string | null
          birthdate: string
          created_at: string
          display_first_name: string | null
          distance_pref_km: number | null
          gender: Database["public"]["Enums"]["hearts_gender"]
          interests: string[]
          is_seed: boolean
          last_active_at: string
          lifestyle: Json
          location_country: string | null
          location_region: string | null
          photo_verified: boolean
          photos: string[]
          seeking: Database["public"]["Enums"]["hearts_gender"]
          seeking_intent: string
          status: Database["public"]["Enums"]["hearts_profile_status"]
          timezone: string | null
          updated_at: string
          user_id: string
          values_list: string[]
          voice_note_duration_sec: number | null
          voice_note_url: string | null
        }
        Insert: {
          about_seen_at?: string | null
          age_verified?: boolean
          bio?: string | null
          birthdate: string
          created_at?: string
          display_first_name?: string | null
          distance_pref_km?: number | null
          gender: Database["public"]["Enums"]["hearts_gender"]
          interests?: string[]
          is_seed?: boolean
          last_active_at?: string
          lifestyle?: Json
          location_country?: string | null
          location_region?: string | null
          photo_verified?: boolean
          photos?: string[]
          seeking: Database["public"]["Enums"]["hearts_gender"]
          seeking_intent?: string
          status?: Database["public"]["Enums"]["hearts_profile_status"]
          timezone?: string | null
          updated_at?: string
          user_id: string
          values_list?: string[]
          voice_note_duration_sec?: number | null
          voice_note_url?: string | null
        }
        Update: {
          about_seen_at?: string | null
          age_verified?: boolean
          bio?: string | null
          birthdate?: string
          created_at?: string
          display_first_name?: string | null
          distance_pref_km?: number | null
          gender?: Database["public"]["Enums"]["hearts_gender"]
          interests?: string[]
          is_seed?: boolean
          last_active_at?: string
          lifestyle?: Json
          location_country?: string | null
          location_region?: string | null
          photo_verified?: boolean
          photos?: string[]
          seeking?: Database["public"]["Enums"]["hearts_gender"]
          seeking_intent?: string
          status?: Database["public"]["Enums"]["hearts_profile_status"]
          timezone?: string | null
          updated_at?: string
          user_id?: string
          values_list?: string[]
          voice_note_duration_sec?: number | null
          voice_note_url?: string | null
        }
        Relationships: []
      }
      tribal_hearts_safety_flags: {
        Row: {
          category: string
          created_at: string
          details: Json
          flagged_user_id: string | null
          id: string
          message_id: string | null
          room_id: string | null
          severity: string
        }
        Insert: {
          category: string
          created_at?: string
          details?: Json
          flagged_user_id?: string | null
          id?: string
          message_id?: string | null
          room_id?: string | null
          severity?: string
        }
        Update: {
          category?: string
          created_at?: string
          details?: Json
          flagged_user_id?: string | null
          id?: string
          message_id?: string | null
          room_id?: string | null
          severity?: string
        }
        Relationships: []
      }
      tribal_matches: {
        Row: {
          confidence_score: number
          created_at: string
          expires_at: string
          id: string
          match_reason: string
          match_type: string
          member_a_id: string
          member_a_response: string | null
          member_b_id: string
          member_b_response: string | null
          metadata: Json
          seed_a_id: string | null
          seed_b_id: string | null
          status: string
          suggested_action: string | null
          updated_at: string
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          expires_at?: string
          id?: string
          match_reason: string
          match_type?: string
          member_a_id: string
          member_a_response?: string | null
          member_b_id: string
          member_b_response?: string | null
          metadata?: Json
          seed_a_id?: string | null
          seed_b_id?: string | null
          status?: string
          suggested_action?: string | null
          updated_at?: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          expires_at?: string
          id?: string
          match_reason?: string
          match_type?: string
          member_a_id?: string
          member_a_response?: string | null
          member_b_id?: string
          member_b_response?: string | null
          metadata?: Json
          seed_a_id?: string | null
          seed_b_id?: string | null
          status?: string
          suggested_action?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tribal_scores: {
        Row: {
          badges: string[]
          bestowals_given_count: number
          bestowals_received_count: number
          breakdown: Json
          created_at: string
          helpful_votes: number
          last_recomputed_at: string
          orchards_count: number
          reviews_avg_rating: number
          score: number
          tier: string
          tribe_size: number
          updated_at: string
          user_id: string
        }
        Insert: {
          badges?: string[]
          bestowals_given_count?: number
          bestowals_received_count?: number
          breakdown?: Json
          created_at?: string
          helpful_votes?: number
          last_recomputed_at?: string
          orchards_count?: number
          reviews_avg_rating?: number
          score?: number
          tier?: string
          tribe_size?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          badges?: string[]
          bestowals_given_count?: number
          bestowals_received_count?: number
          breakdown?: Json
          created_at?: string
          helpful_votes?: number
          last_recomputed_at?: string
          orchards_count?: number
          reviews_avg_rating?: number
          score?: number
          tier?: string
          tribe_size?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      typing: {
        Row: {
          id: string
          is_typing: boolean
          room_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          is_typing?: boolean
          room_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          is_typing?: boolean
          room_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      usdc_transactions: {
        Row: {
          amount: number
          bestowal_id: string | null
          confirmed_at: string | null
          created_at: string
          from_wallet: string | null
          id: string
          signature: string
          status: string
          to_wallet: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          bestowal_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          from_wallet?: string | null
          id?: string
          signature: string
          status?: string
          to_wallet?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          bestowal_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          from_wallet?: string | null
          id?: string
          signature?: string
          status?: string
          to_wallet?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usdc_transactions_bestowal_id_fkey"
            columns: ["bestowal_id"]
            isOneToOne: false
            referencedRelation: "bestowals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_type: string
          created_at: string
          description: string
          icon: string | null
          id: string
          points_awarded: number
          title: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_type: string
          created_at?: string
          description: string
          icon?: string | null
          id?: string
          points_awarded?: number
          title: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_type?: string
          created_at?: string
          description?: string
          icon?: string | null
          id?: string
          points_awarded?: number
          title?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_billing_info: {
        Row: {
          billing_address_line1_encrypted: string | null
          billing_address_line2_encrypted: string | null
          billing_city_encrypted: string | null
          billing_country_encrypted: string | null
          billing_email_encrypted: string | null
          billing_organization_encrypted: string | null
          billing_phone_encrypted: string | null
          billing_postal_code_encrypted: string | null
          billing_state_encrypted: string | null
          created_at: string
          encryption_key_id: string | null
          id: string
          last_accessed: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_address_line1_encrypted?: string | null
          billing_address_line2_encrypted?: string | null
          billing_city_encrypted?: string | null
          billing_country_encrypted?: string | null
          billing_email_encrypted?: string | null
          billing_organization_encrypted?: string | null
          billing_phone_encrypted?: string | null
          billing_postal_code_encrypted?: string | null
          billing_state_encrypted?: string | null
          created_at?: string
          encryption_key_id?: string | null
          id?: string
          last_accessed?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_address_line1_encrypted?: string | null
          billing_address_line2_encrypted?: string | null
          billing_city_encrypted?: string | null
          billing_country_encrypted?: string | null
          billing_email_encrypted?: string | null
          billing_organization_encrypted?: string | null
          billing_phone_encrypted?: string | null
          billing_postal_code_encrypted?: string | null
          billing_state_encrypted?: string | null
          created_at?: string
          encryption_key_id?: string | null
          id?: string
          last_accessed?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_circles: {
        Row: {
          circle_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          circle_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          circle_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_circles_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consent: {
        Row: {
          analytics: boolean
          id: string
          marketing_attribution: boolean
          precise_location: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          analytics?: boolean
          id?: string
          marketing_attribution?: boolean
          precise_location?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          analytics?: boolean
          id?: string
          marketing_attribution?: boolean
          precise_location?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_crops: {
        Row: {
          created_at: string | null
          crop_key: string
          id: string
          notes: string | null
          planted_date: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          crop_key: string
          id?: string
          notes?: string | null
          planted_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          crop_key?: string
          id?: string
          notes?: string | null
          planted_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_points: {
        Row: {
          created_at: string
          id: string
          level: number
          points_to_next_level: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: number
          points_to_next_level?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          points_to_next_level?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_referrals: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          total_clicks: number
          total_signups: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          total_clicks?: number
          total_signups?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          total_clicks?: number
          total_signups?: number
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_security_questions: {
        Row: {
          answer_1_hash: string
          answer_2_hash: string
          answer_3_hash: string
          created_at: string
          id: string
          question_1: string
          question_2: string
          question_3: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer_1_hash: string
          answer_2_hash: string
          answer_3_hash: string
          created_at?: string
          id?: string
          question_1: string
          question_2: string
          question_3: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer_1_hash?: string
          answer_2_hash?: string
          answer_3_hash?: string
          created_at?: string
          id?: string
          question_1?: string
          question_2?: string
          question_3?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          amount: number
          id: string
          payment_reference: string | null
          purchased_at: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          amount: number
          id?: string
          payment_reference?: string | null
          purchased_at?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          amount?: number
          id?: string
          payment_reference?: string | null
          purchased_at?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "radio_schedule"
            referencedColumns: ["id"]
          },
        ]
      }
      user_suspension_audit: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_suspended: boolean
          old_suspended: boolean
          user_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_suspended: boolean
          old_suspended: boolean
          user_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_suspended?: boolean
          old_suspended?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_verification_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          api_key: string | null
          api_secret: string | null
          created_at: string
          id: string
          is_active: boolean | null
          is_primary: boolean
          merchant_id: string | null
          network: string | null
          payout_currency: string | null
          paypal_payer_id: string | null
          updated_at: string
          user_id: string
          verification_method: string | null
          verified_at: string | null
          wallet_address: string
          wallet_type: string
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean
          merchant_id?: string | null
          network?: string | null
          payout_currency?: string | null
          paypal_payer_id?: string | null
          updated_at?: string
          user_id: string
          verification_method?: string | null
          verified_at?: string | null
          wallet_address: string
          wallet_type?: string
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean
          merchant_id?: string | null
          network?: string | null
          payout_currency?: string | null
          paypal_payer_id?: string | null
          updated_at?: string
          user_id?: string
          verification_method?: string | null
          verified_at?: string | null
          wallet_address?: string
          wallet_type?: string
        }
        Relationships: []
      }
      user_xp: {
        Row: {
          badges: string[] | null
          created_at: string | null
          current_level_xp: number | null
          id: string
          level: number | null
          next_level_xp: number | null
          total_xp: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          badges?: string[] | null
          created_at?: string | null
          current_level_xp?: number | null
          id?: string
          level?: number | null
          next_level_xp?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          badges?: string[] | null
          created_at?: string | null
          current_level_xp?: number | null
          id?: string
          level?: number | null
          next_level_xp?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      video_comments: {
        Row: {
          commenter_id: string
          commenter_profile_id: string | null
          content: string
          created_at: string
          id: string
          updated_at: string
          video_id: string
        }
        Insert: {
          commenter_id: string
          commenter_profile_id?: string | null
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          video_id: string
        }
        Update: {
          commenter_id?: string
          commenter_profile_id?: string | null
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_comments_commenter_profile_id_fkey"
            columns: ["commenter_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_comments_commenter_profile_id_fkey"
            columns: ["commenter_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "community_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_content: {
        Row: {
          ai_generated_description: string | null
          ai_generated_script: string | null
          created_at: string
          description: string | null
          duration: number | null
          file_size: number | null
          id: string
          platform_optimizations: Json | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          user_id: string
          video_url: string
        }
        Insert: {
          ai_generated_description?: string | null
          ai_generated_script?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          file_size?: number | null
          id?: string
          platform_optimizations?: Json | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          video_url: string
        }
        Update: {
          ai_generated_description?: string | null
          ai_generated_script?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          file_size?: number | null
          id?: string
          platform_optimizations?: Json | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string
        }
        Relationships: []
      }
      video_gifts: {
        Row: {
          amount: number
          created_at: string
          creator_amount: number
          giver_id: string
          id: string
          message: string | null
          payment_status: string
          platform_fee: number
          receiver_id: string
          sow2grow_fee: number
          transaction_hash: string | null
          updated_at: string
          video_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          creator_amount: number
          giver_id: string
          id?: string
          message?: string | null
          payment_status?: string
          platform_fee?: number
          receiver_id: string
          sow2grow_fee?: number
          transaction_hash?: string | null
          updated_at?: string
          video_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          creator_amount?: number
          giver_id?: string
          id?: string
          message?: string | null
          payment_status?: string
          platform_fee?: number
          receiver_id?: string
          sow2grow_fee?: number
          transaction_hash?: string | null
          updated_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_gifts_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "community_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_jobs: {
        Row: {
          comfyui_job_id: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          negative_prompt: string | null
          prompt_used: string | null
          retry_count: number
          source_id: string
          source_table: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
          video_url: string | null
          workflow_tier: string
        }
        Insert: {
          comfyui_job_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          negative_prompt?: string | null
          prompt_used?: string | null
          retry_count?: number
          source_id: string
          source_table: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          video_url?: string | null
          workflow_tier?: string
        }
        Update: {
          comfyui_job_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          negative_prompt?: string | null
          prompt_used?: string | null
          retry_count?: number
          source_id?: string
          source_table?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
          workflow_tier?: string
        }
        Relationships: []
      }
      video_likes: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "community_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_access_logs: {
        Row: {
          access_type: string
          accessed_by: string | null
          created_at: string
          id: string
          ip_address: unknown
          success: boolean | null
          user_id: string
          wallet_address: string
        }
        Insert: {
          access_type: string
          accessed_by?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          success?: boolean | null
          user_id: string
          wallet_address: string
        }
        Update: {
          access_type?: string
          accessed_by?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          success?: boolean | null
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      wallet_balances: {
        Row: {
          id: string
          last_updated: string
          updated_at: string | null
          usdc_balance: number
          user_id: string | null
          wallet_address: string
        }
        Insert: {
          id?: string
          last_updated?: string
          updated_at?: string | null
          usdc_balance?: number
          user_id?: string | null
          wallet_address: string
        }
        Update: {
          id?: string
          last_updated?: string
          updated_at?: string | null
          usdc_balance?: number
          user_id?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          binance_sub_account: string
          created_at: string | null
          id: string
          is_master: boolean | null
          type: string
          wallet_address: string
        }
        Insert: {
          binance_sub_account: string
          created_at?: string | null
          id?: string
          is_master?: boolean | null
          type: string
          wallet_address: string
        }
        Update: {
          binance_sub_account?: string
          created_at?: string | null
          id?: string
          is_master?: boolean | null
          type?: string
          wallet_address?: string
        }
        Relationships: []
      }
      wandering_roles: {
        Row: {
          accepted_terms_at: string | null
          base_town: string | null
          created_at: string
          declared_self_operated_at: string | null
          display_name: string | null
          gallery_urls: string[] | null
          id: string
          lat: number | null
          lng: number | null
          photo_url: string | null
          role: string
          status: string
          tagline: string | null
          testimonials: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_terms_at?: string | null
          base_town?: string | null
          created_at?: string
          declared_self_operated_at?: string | null
          display_name?: string | null
          gallery_urls?: string[] | null
          id?: string
          lat?: number | null
          lng?: number | null
          photo_url?: string | null
          role: string
          status?: string
          tagline?: string | null
          testimonials?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_terms_at?: string | null
          base_town?: string | null
          created_at?: string
          declared_self_operated_at?: string | null
          display_name?: string | null
          gallery_urls?: string[] | null
          id?: string
          lat?: number | null
          lng?: number | null
          photo_url?: string | null
          role?: string
          status?: string
          tagline?: string | null
          testimonials?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_playlists: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          rank_data: Json
          song_ids: string[]
          theme: string | null
          title: string
          total_voters: number
          total_votes: number
          week_id: string
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          rank_data?: Json
          song_ids: string[]
          theme?: string | null
          title: string
          total_voters?: number
          total_votes?: number
          week_id: string
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          rank_data?: Json
          song_ids?: string[]
          theme?: string | null
          title?: string
          total_voters?: number
          total_votes?: number
          week_id?: string
        }
        Relationships: []
      }
      wh_blocked_message_log: {
        Row: {
          created_at: string
          id: string
          matched_rule: string
          room_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          matched_rule: string
          room_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          matched_rule?: string
          room_id?: string
          user_id?: string
        }
        Relationships: []
      }
      wheel_seed_details: {
        Row: {
          availability: boolean
          base_lat: number | null
          base_lng: number | null
          base_location: string | null
          created_at: string
          currency: string
          driver_included: boolean
          operator_confirmed_at: string
          operator_confirmed_licensed: boolean
          product_id: string
          rate_daily: number | null
          rate_hourly: number | null
          rate_monthly: number | null
          rate_per_km: number | null
          rate_per_trip: number | null
          rate_weekly: number | null
          updated_at: string
          use_tags: string[]
          vehicle_type: Database["public"]["Enums"]["wheel_vehicle_type"]
        }
        Insert: {
          availability?: boolean
          base_lat?: number | null
          base_lng?: number | null
          base_location?: string | null
          created_at?: string
          currency: string
          driver_included?: boolean
          operator_confirmed_at?: string
          operator_confirmed_licensed: boolean
          product_id: string
          rate_daily?: number | null
          rate_hourly?: number | null
          rate_monthly?: number | null
          rate_per_km?: number | null
          rate_per_trip?: number | null
          rate_weekly?: number | null
          updated_at?: string
          use_tags?: string[]
          vehicle_type: Database["public"]["Enums"]["wheel_vehicle_type"]
        }
        Update: {
          availability?: boolean
          base_lat?: number | null
          base_lng?: number | null
          base_location?: string | null
          created_at?: string
          currency?: string
          driver_included?: boolean
          operator_confirmed_at?: string
          operator_confirmed_licensed?: boolean
          product_id?: string
          rate_daily?: number | null
          rate_hourly?: number | null
          rate_monthly?: number | null
          rate_per_km?: number | null
          rate_per_trip?: number | null
          rate_weekly?: number | null
          updated_at?: string
          use_tags?: string[]
          vehicle_type?: Database["public"]["Enums"]["wheel_vehicle_type"]
        }
        Relationships: [
          {
            foreignKeyName: "wheel_seed_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      whisperer_clicks: {
        Row: {
          book_id: string | null
          created_at: string
          id: string
          ip_hash: string | null
          live_session_id: string | null
          orchard_id: string | null
          product_id: string | null
          ref_link_id: string
          referrer_url: string | null
          user_agent: string | null
          user_id: string | null
          visitor_id: string | null
          whisperer_id: string
        }
        Insert: {
          book_id?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          live_session_id?: string | null
          orchard_id?: string | null
          product_id?: string | null
          ref_link_id: string
          referrer_url?: string | null
          user_agent?: string | null
          user_id?: string | null
          visitor_id?: string | null
          whisperer_id: string
        }
        Update: {
          book_id?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          live_session_id?: string | null
          orchard_id?: string | null
          product_id?: string | null
          ref_link_id?: string
          referrer_url?: string | null
          user_agent?: string | null
          user_id?: string | null
          visitor_id?: string | null
          whisperer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whisperer_clicks_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "sower_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisperer_clicks_orchard_id_fkey"
            columns: ["orchard_id"]
            isOneToOne: false
            referencedRelation: "orchards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisperer_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisperer_clicks_ref_link_id_fkey"
            columns: ["ref_link_id"]
            isOneToOne: false
            referencedRelation: "whisperer_referral_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisperer_clicks_whisperer_id_fkey"
            columns: ["whisperer_id"]
            isOneToOne: false
            referencedRelation: "whisperers"
            referencedColumns: ["id"]
          },
        ]
      }
      whisperer_conversions: {
        Row: {
          attribution_type: string
          bestowal_amount: number
          bestowal_id: string | null
          bestower_id: string
          book_id: string | null
          click_id: string | null
          commission_amount: number
          commission_percent: number
          created_at: string
          id: string
          live_session_id: string | null
          orchard_id: string | null
          product_id: string | null
          ref_link_id: string
          whisperer_id: string
        }
        Insert: {
          attribution_type?: string
          bestowal_amount?: number
          bestowal_id?: string | null
          bestower_id: string
          book_id?: string | null
          click_id?: string | null
          commission_amount?: number
          commission_percent?: number
          created_at?: string
          id?: string
          live_session_id?: string | null
          orchard_id?: string | null
          product_id?: string | null
          ref_link_id: string
          whisperer_id: string
        }
        Update: {
          attribution_type?: string
          bestowal_amount?: number
          bestowal_id?: string | null
          bestower_id?: string
          book_id?: string | null
          click_id?: string | null
          commission_amount?: number
          commission_percent?: number
          created_at?: string
          id?: string
          live_session_id?: string | null
          orchard_id?: string | null
          product_id?: string | null
          ref_link_id?: string
          whisperer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whisperer_conversions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "sower_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisperer_conversions_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: false
            referencedRelation: "whisperer_clicks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisperer_conversions_orchard_id_fkey"
            columns: ["orchard_id"]
            isOneToOne: false
            referencedRelation: "orchards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisperer_conversions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisperer_conversions_ref_link_id_fkey"
            columns: ["ref_link_id"]
            isOneToOne: false
            referencedRelation: "whisperer_referral_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisperer_conversions_whisperer_id_fkey"
            columns: ["whisperer_id"]
            isOneToOne: false
            referencedRelation: "whisperers"
            referencedColumns: ["id"]
          },
        ]
      }
      whisperer_earnings: {
        Row: {
          amount: number
          assignment_id: string | null
          bestowal_id: string
          commission_percent: number
          created_at: string | null
          id: string
          payout_amount_xrp: number | null
          payout_fx_observed_at: string | null
          payout_fx_rate: number | null
          payout_fx_sources: Json | null
          payout_provider: string | null
          payout_reference: string | null
          processed_at: string | null
          status: string | null
          whisperer_id: string
        }
        Insert: {
          amount: number
          assignment_id?: string | null
          bestowal_id: string
          commission_percent: number
          created_at?: string | null
          id?: string
          payout_amount_xrp?: number | null
          payout_fx_observed_at?: string | null
          payout_fx_rate?: number | null
          payout_fx_sources?: Json | null
          payout_provider?: string | null
          payout_reference?: string | null
          processed_at?: string | null
          status?: string | null
          whisperer_id: string
        }
        Update: {
          amount?: number
          assignment_id?: string | null
          bestowal_id?: string
          commission_percent?: number
          created_at?: string | null
          id?: string
          payout_amount_xrp?: number | null
          payout_fx_observed_at?: string | null
          payout_fx_rate?: number | null
          payout_fx_sources?: Json | null
          payout_provider?: string | null
          payout_reference?: string | null
          processed_at?: string | null
          status?: string | null
          whisperer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whisperer_earnings_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "product_whisperer_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisperer_earnings_whisperer_id_fkey"
            columns: ["whisperer_id"]
            isOneToOne: false
            referencedRelation: "whisperers"
            referencedColumns: ["id"]
          },
        ]
      }
      whisperer_invitations: {
        Row: {
          book_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          message: string | null
          orchard_id: string | null
          product_id: string | null
          proposed_commission_percent: number
          responded_at: string | null
          sower_id: string
          status: string
          updated_at: string
          whisperer_id: string
        }
        Insert: {
          book_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string | null
          orchard_id?: string | null
          product_id?: string | null
          proposed_commission_percent: number
          responded_at?: string | null
          sower_id: string
          status?: string
          updated_at?: string
          whisperer_id: string
        }
        Update: {
          book_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string | null
          orchard_id?: string | null
          product_id?: string | null
          proposed_commission_percent?: number
          responded_at?: string | null
          sower_id?: string
          status?: string
          updated_at?: string
          whisperer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whisperer_invitations_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "sower_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisperer_invitations_orchard_id_fkey"
            columns: ["orchard_id"]
            isOneToOne: false
            referencedRelation: "orchards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisperer_invitations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisperer_invitations_whisperer_id_fkey"
            columns: ["whisperer_id"]
            isOneToOne: false
            referencedRelation: "whisperers"
            referencedColumns: ["id"]
          },
        ]
      }
      whisperer_payout_wallets: {
        Row: {
          created_at: string
          updated_at: string
          user_id: string
          wallet_address: string
          wallet_type: string | null
        }
        Insert: {
          created_at?: string
          updated_at?: string
          user_id: string
          wallet_address: string
          wallet_type?: string | null
        }
        Update: {
          created_at?: string
          updated_at?: string
          user_id?: string
          wallet_address?: string
          wallet_type?: string | null
        }
        Relationships: []
      }
      whisperer_referral_links: {
        Row: {
          assignment_id: string
          book_id: string | null
          created_at: string
          id: string
          is_active: boolean
          live_session_id: string | null
          orchard_id: string | null
          product_id: string | null
          ref_code: string
          session_kind: string | null
          total_clicks: number
          total_conversions: number
          total_earned: number
          updated_at: string
          whisperer_id: string
        }
        Insert: {
          assignment_id: string
          book_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          live_session_id?: string | null
          orchard_id?: string | null
          product_id?: string | null
          ref_code: string
          session_kind?: string | null
          total_clicks?: number
          total_conversions?: number
          total_earned?: number
          updated_at?: string
          whisperer_id: string
        }
        Update: {
          assignment_id?: string
          book_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          live_session_id?: string | null
          orchard_id?: string | null
          product_id?: string | null
          ref_code?: string
          session_kind?: string | null
          total_clicks?: number
          total_conversions?: number
          total_earned?: number
          updated_at?: string
          whisperer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whisperer_referral_links_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "product_whisperer_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisperer_referral_links_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "sower_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisperer_referral_links_orchard_id_fkey"
            columns: ["orchard_id"]
            isOneToOne: false
            referencedRelation: "orchards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisperer_referral_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisperer_referral_links_whisperer_id_fkey"
            columns: ["whisperer_id"]
            isOneToOne: false
            referencedRelation: "whisperers"
            referencedColumns: ["id"]
          },
        ]
      }
      whisperers: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string
          headline: string | null
          id: string
          is_active: boolean | null
          is_listed: boolean
          is_verified: boolean | null
          languages: string[] | null
          location: string | null
          portfolio_media: Json
          portfolio_url: string | null
          profile_id: string | null
          rates: string | null
          social_links: Json | null
          specialties: string[] | null
          total_earnings: number | null
          total_products_promoted: number | null
          updated_at: string | null
          user_id: string
          years_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name: string
          headline?: string | null
          id?: string
          is_active?: boolean | null
          is_listed?: boolean
          is_verified?: boolean | null
          languages?: string[] | null
          location?: string | null
          portfolio_media?: Json
          portfolio_url?: string | null
          profile_id?: string | null
          rates?: string | null
          social_links?: Json | null
          specialties?: string[] | null
          total_earnings?: number | null
          total_products_promoted?: number | null
          updated_at?: string | null
          user_id: string
          years_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string
          headline?: string | null
          id?: string
          is_active?: boolean | null
          is_listed?: boolean
          is_verified?: boolean | null
          languages?: string[] | null
          location?: string | null
          portfolio_media?: Json
          portfolio_url?: string | null
          profile_id?: string | null
          rates?: string | null
          social_links?: Json | null
          specialties?: string[] | null
          total_earnings?: number | null
          total_products_promoted?: number | null
          updated_at?: string | null
          user_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "whisperers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whisperers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      xrp_quotes: {
        Row: {
          consumed_at: string | null
          created_at: string
          destination_address: string | null
          destination_tag: number | null
          expires_at: string
          id: string
          locked_at: string
          purpose: string
          rate_sources: Json
          reference: string | null
          status: string
          usd_amount: number
          user_id: string
          xrp_amount: number
          xrp_usd_rate: number
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          destination_address?: string | null
          destination_tag?: number | null
          expires_at: string
          id?: string
          locked_at?: string
          purpose?: string
          rate_sources?: Json
          reference?: string | null
          status?: string
          usd_amount: number
          user_id?: string
          xrp_amount: number
          xrp_usd_rate: number
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          destination_address?: string | null
          destination_tag?: number | null
          expires_at?: string
          id?: string
          locked_at?: string
          purpose?: string
          rate_sources?: Json
          reference?: string | null
          status?: string
          usd_amount?: number
          user_id?: string
          xrp_amount?: number
          xrp_usd_rate?: number
        }
        Relationships: []
      }
    }
    Views: {
      admin_pending_credentials_v: {
        Row: {
          avatar_url: string | null
          credential_type: string | null
          display_name: string | null
          expires_at: string | null
          file_url: string | null
          id: string | null
          notes: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_status"] | null
          submitted_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      balance_available_v: {
        Row: {
          available_balance: number | null
          user_id: string | null
        }
        Relationships: []
      }
      buyer_purchases_v: {
        Row: {
          buyer_id: string | null
          buyer_total: number | null
          item_id: string | null
          item_title: string | null
          paid_at: string | null
          processor_fee: number | null
          provider: string | null
          source: string | null
          source_id: string | null
          sower_id: string | null
          status: string | null
          subtotal: number | null
        }
        Relationships: []
      }
      orchard_parties_paid_v: {
        Row: {
          amount: number | null
          label: string | null
          orchard_id: string | null
          paid_at: string | null
          rail: string | null
        }
        Insert: {
          amount?: number | null
          label?: string | null
          orchard_id?: string | null
          paid_at?: string | null
          rail?: string | null
        }
        Update: {
          amount?: number | null
          label?: string | null
          orchard_id?: string | null
          paid_at?: string | null
          rail?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orchard_release_payments_orchard_id_fkey"
            columns: ["orchard_id"]
            isOneToOne: false
            referencedRelation: "orchards"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          bestowal_thank_you_message: string | null
          bio: string | null
          birthday_day: number | null
          birthday_month: number | null
          country: string | null
          created_at: string | null
          display_name: string | null
          facebook_url: string | null
          first_name: string | null
          id: string | null
          instagram_url: string | null
          is_chatapp_verified: boolean | null
          last_name: string | null
          linkedin_url: string | null
          location: string | null
          membership_tier: string | null
          pinterest_url: string | null
          show_birthday: boolean | null
          show_social_media: boolean | null
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string | null
          user_id: string | null
          username: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at: string | null
          website: string | null
          youtube_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bestowal_thank_you_message?: string | null
          bio?: string | null
          birthday_day?: never
          birthday_month?: never
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          facebook_url?: never
          first_name?: string | null
          id?: string | null
          instagram_url?: never
          is_chatapp_verified?: boolean | null
          last_name?: string | null
          linkedin_url?: never
          location?: string | null
          membership_tier?: string | null
          pinterest_url?: never
          show_birthday?: boolean | null
          show_social_media?: boolean | null
          tiktok_url?: never
          twitter_url?: never
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
          website?: string | null
          youtube_url?: never
        }
        Update: {
          avatar_url?: string | null
          bestowal_thank_you_message?: string | null
          bio?: string | null
          birthday_day?: never
          birthday_month?: never
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          facebook_url?: never
          first_name?: string | null
          id?: string | null
          instagram_url?: never
          is_chatapp_verified?: boolean | null
          last_name?: string | null
          linkedin_url?: never
          location?: string | null
          membership_tier?: string | null
          pinterest_url?: never
          show_birthday?: boolean | null
          show_social_media?: boolean | null
          tiktok_url?: never
          twitter_url?: never
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
          website?: string | null
          youtube_url?: never
        }
        Relationships: []
      }
      provider_rating_v: {
        Row: {
          is_new_provider: boolean | null
          provider_user_id: string | null
          public_average: number | null
          rating_count: number | null
          raw_average: number | null
        }
        Relationships: []
      }
      public_live_streams: {
        Row: {
          created_at: string | null
          description: string | null
          ended_at: string | null
          hls_url: string | null
          id: string | null
          quality: string | null
          recorded_at: string | null
          recording_url: string | null
          started_at: string | null
          status: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string | null
          user_id: string | null
          viewer_count: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          hls_url?: string | null
          id?: string | null
          quality?: string | null
          recorded_at?: string | null
          recording_url?: string | null
          started_at?: string | null
          status?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          user_id?: string | null
          viewer_count?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          hls_url?: string | null
          id?: string | null
          quality?: string | null
          recorded_at?: string | null
          recording_url?: string | null
          started_at?: string | null
          status?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          user_id?: string | null
          viewer_count?: number | null
        }
        Relationships: []
      }
      song_vote_counts: {
        Row: {
          song_id: string | null
          vote_count: number | null
          week_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "song_votes_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "dj_music_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      sower_earnings_v: {
        Row: {
          buyer_id: string | null
          gross: number | null
          item_id: string | null
          item_title: string | null
          paid_at: string | null
          provider: string | null
          s2g_fee: number | null
          source: string | null
          source_id: string | null
          sower_amount: number | null
          sower_id: string | null
          status: string | null
          whisperer_amount: number | null
          whisperer_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      abuse_severity_rank: { Args: { _severity: string }; Returns: number }
      add_room_participants: {
        Args: { _room_id: string; _user_ids: string[] }
        Returns: undefined
      }
      add_xp: {
        Args: { amount?: number; user_id_param: string }
        Returns: Json
      }
      add_xp_to_current_user: { Args: { amount?: number }; Returns: Json }
      admin_delete_room: { Args: { target_room_id: string }; Returns: boolean }
      approve_estimate: { Args: { _estimate_id: string }; Returns: Json }
      approve_join_request: { Args: { request_id: string }; Returns: boolean }
      approve_radio_schedule_slot: {
        Args: { approver_id_param: string; schedule_id_param: string }
        Returns: boolean
      }
      approve_radio_slot: {
        Args: { approval_notes_param?: string; schedule_id_param: string }
        Returns: boolean
      }
      award_achievement: {
        Args: {
          achievement_type_param: string
          description_param: string
          icon_param?: string
          points_param?: number
          title_param: string
          user_id_param: string
        }
        Returns: undefined
      }
      award_radio_play_xp:
        | { Args: { p_track_id: string }; Returns: boolean }
        | {
            Args: {
              p_listener_id: string
              p_points?: number
              p_track_id: string
              p_track_owner_id: string
            }
            Returns: boolean
          }
      booking_no_show_claimable: {
        Args: { p_booking_id: string }
        Returns: boolean
      }
      books_backfill_products: {
        Args: { _business_id: string }
        Returns: number
      }
      books_company_for_user: { Args: { _user_id: string }; Returns: string }
      browse_public_rooms: {
        Args: never
        Returns: {
          category: string
          id: string
          is_premium: boolean
          name: string
          participant_count: number
          premium_category: Database["public"]["Enums"]["premium_room_category"]
        }[]
      }
      calculate_booking_fees: { Args: { total_fare: number }; Returns: Json }
      calculate_music_purchase_total: {
        Args: { base_amount?: number }
        Returns: Json
      }
      can_access_user_data: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      can_access_verification_room: {
        Args: { p_room_id: string; p_user_id: string }
        Returns: boolean
      }
      can_join_session_early: {
        Args: { schedule_id_param: string }
        Returns: boolean
      }
      chat_room_member_counts: {
        Args: { _room_ids: string[] }
        Returns: {
          member_count: number
          room_id: string
        }[]
      }
      check_and_consume_companion_quota: {
        Args: { _slug: string; _user: string }
        Returns: Json
      }
      check_chat_rate_limit: {
        Args: { p_room_id: string; p_user_id: string }
        Returns: boolean
      }
      check_dj_badges: { Args: { p_dj_id: string }; Returns: undefined }
      check_payment_idempotency: {
        Args: { idempotency_key_param: string; user_id_param: string }
        Returns: Json
      }
      check_provider_availability: {
        Args: {
          p_date: string
          p_distance_km?: number
          p_duration_min?: number
          p_provider_id: string
        }
        Returns: Json
      }
      check_rate_limit_enhanced: {
        Args: {
          identifier: string
          limit_type?: string
          max_attempts?: number
          time_window_minutes?: number
        }
        Returns: boolean
      }
      check_webhook_processed: {
        Args: { provider_param: string; webhook_id_param: string }
        Returns: boolean
      }
      claim_customer_invite: { Args: { _token: string }; Returns: Json }
      claim_referral_code: { Args: { p_code: string }; Returns: Json }
      cleanup_expired_idempotency_keys: { Args: never; Returns: undefined }
      cleanup_inactive_voice_clones: { Args: never; Returns: number }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      clear_member_rate_limit: {
        Args: { _limit_type?: string; _user_id: string }
        Returns: number
      }
      confirm_delivery: { Args: { _bestowal_id: string }; Returns: Json }
      content_hidden_pending_minor_report: {
        Args: { _target_id: string; _target_type: string }
        Returns: boolean
      }
      create_job_note: {
        Args: {
          _business_id: string
          _date_needed: string
          _description: string
          _location: string
          _notes_to_supplier: string
          _title: string
        }
        Returns: {
          assigned_to_member_id: string | null
          business_id: string
          chat_channel_id: string | null
          created_at: string
          date_needed: string | null
          description: string | null
          id: string
          location: string | null
          notes_to_supplier: string | null
          sower_user_id: string
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "job_notes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_verification_room_for_user: {
        Args: { target_user_id: string }
        Returns: string
      }
      credit_balance_ledger: {
        Args: {
          _amount: number
          _created_by?: string
          _idempotency_key?: string
          _kind: string
          _notes?: string
          _reference_id?: string
          _reference_table?: string
          _user_id: string
        }
        Returns: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string | null
          kind: string
          notes: string | null
          reference_id: string | null
          reference_table: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "balance_ledger"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      credit_balance_ledger_from_topup: {
        Args: { _topup_id: string }
        Returns: boolean
      }
      credit_earning_for_bestowal: {
        Args: { _actor_id: string; _actor_role: string; _bestowal_id: string }
        Returns: undefined
      }
      credit_earning_for_gift_bestowal: {
        Args: { _actor_id: string; _bestowal_id: string }
        Returns: undefined
      }
      credit_sower_balance_from_topup: {
        Args: { _topup_id: string }
        Returns: boolean
      }
      current_council_seat_id: { Args: { _user_id: string }; Returns: string }
      debit_balance_ledger: {
        Args: {
          _amount: number
          _created_by?: string
          _idempotency_key?: string
          _kind: string
          _notes?: string
          _reference_id?: string
          _reference_table?: string
          _user_id: string
        }
        Returns: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string | null
          kind: string
          notes: string | null
          reference_id: string | null
          reference_table: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "balance_ledger"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decrypt_pii_data: { Args: { encrypted_data: string }; Returns: string }
      detect_abuse: {
        Args: { _content: string }
        Returns: {
          category: string
          hard_block: boolean
          rule: string
          severity: string
        }[]
      }
      encrypt_pii_data: { Args: { data_text: string }; Returns: string }
      encrypt_pii_data_secure: { Args: { data_text: string }; Returns: string }
      end_stream: { Args: { stream_id_param: string }; Returns: boolean }
      ensure_linux_family_agents: {
        Args: { _user_id: string }
        Returns: undefined
      }
      ensure_whisperer_ref_link: {
        Args: {
          _assignment_id: string
          _live_session_id?: string
          _session_kind?: string
        }
        Returns: {
          ref_code: string
          ref_link_id: string
        }[]
      }
      escrow_release_bestowal: {
        Args: {
          _actor_id: string
          _actor_role: string
          _bestowal_id: string
          _notes?: string
        }
        Returns: boolean
      }
      expire_bookings: { Args: never; Returns: Json }
      expire_stale_booking_requests: { Args: never; Returns: number }
      expire_stale_orders: { Args: never; Returns: Json }
      expire_stale_xrp_quotes: { Args: never; Returns: undefined }
      finalize_basket_order: {
        Args: { _basket_order_id: string; _environment?: string }
        Returns: Json
      }
      finalize_content_purchase: {
        Args: { _environment?: string; _purchase_id: string }
        Returns: undefined
      }
      finalize_invoice_payment: {
        Args: { _environment: string; _payment_id: string; _reference?: string }
        Returns: undefined
      }
      find_bestowal_receipt: {
        Args: { _product_bestowal_id: string }
        Returns: string
      }
      find_member_by_email: { Args: { _email: string }; Returns: string }
      fn_orchard_owner: { Args: { _orchard_id: string }; Returns: string }
      generate_estimate_invoices: {
        Args: { _estimate_id: string }
        Returns: Json
      }
      generate_invoice_number: { Args: never; Returns: string }
      generate_ref_code: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      get_active_whisperer_badge: {
        Args: { _seed_id: string }
        Returns: {
          commission_percent: number
          seed_id: string
        }[]
      }
      get_admin_profile_access_report: {
        Args: { days_back?: number }
        Returns: {
          accessor_display_name: string
          accessor_user_id: string
          last_access: string
          sensitive_field_accesses: number
          total_accesses: number
          unique_profiles_accessed: number
        }[]
      }
      get_ai_usage_today:
        | { Args: never; Returns: number }
        | { Args: { user_id_param?: string }; Returns: number }
      get_all_user_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          display_name: string
          first_name: string
          id: string
          last_name: string
          user_id: string
          username: string
        }[]
      }
      get_config_drift_signals: {
        Args: { expected_triggers: string[]; money_tables: string[] }
        Returns: Json
      }
      get_conversation_unread_counts: {
        Args: never
        Returns: {
          room_id: string
          unread_count: number
        }[]
      }
      get_cron_job_health: {
        Args: { job_names: string[] }
        Returns: {
          jobname: string
          last_start: string
          last_status: string
          schedule: string
        }[]
      }
      get_current_radio_show: { Args: never; Returns: Json }
      get_current_week_id: { Args: never; Returns: string }
      get_dj_track_file_url: { Args: { _track_id: string }; Returns: string }
      get_effective_tier: { Args: { _user: string }; Returns: string }
      get_gosat_insight_details: {
        Args: { _insight_id: string }
        Returns: Json
      }
      get_hearts_browse: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          age: number
          age_verified: boolean
          bio: string
          display_first_name: string
          gender: string
          interests: string[]
          last_active_at: string
          location_country: string
          location_region: string
          photo_verified: boolean
          photos: string[]
          seeking: string
          seeking_intent: string
          user_id: string
          values_list: string[]
          voice_note_duration_sec: number
          voice_note_url: string
        }[]
      }
      get_hearts_gender: { Args: { _user_id: string }; Returns: string }
      get_invite_preview: { Args: { _token: string }; Returns: Json }
      get_message_streak: { Args: { user_id_param: string }; Returns: number }
      get_my_account_scope: {
        Args: never
        Returns: {
          is_primary: boolean
          user_id: string
        }[]
      }
      get_my_dashboard_content: {
        Args: never
        Returns: {
          artist_name: string
          category: string
          cover_image_url: string
          created_at: string
          description: string
          file_url: string
          id: string
          image_urls: string[]
          images: string[]
          kind: string
          music_genre: string
          music_mood: string
          price: number
          service_details: Json
          source: string
          title: string
          video_url: string
        }[]
      }
      get_my_dashboard_profile: {
        Args: never
        Returns: {
          avatar_url: string
          country: string
          display_name: string
          first_name: string
          last_name: string
          latitude: number
          location: string
          location_verified: boolean
          longitude: number
          membership_tier: string
          preferred_currency: string
          timezone: string
          user_id: string
        }[]
      }
      get_my_dashboard_tribe_count: { Args: never; Returns: number }
      get_my_dj_track_wallet: { Args: { _track_id: string }; Returns: string }
      get_my_live_stream_credentials: {
        Args: { p_stream_id: string }
        Returns: {
          rtmp_url: string
          stream_key: string
        }[]
      }
      get_my_orchards_scoped: {
        Args: never
        Returns: {
          category: string
          created_at: string
          description: string
          id: string
          images: string[]
          orchard_type: string
          status: string
          title: string
          user_id: string
        }[]
      }
      get_my_sower_wallet: { Args: never; Returns: string }
      get_my_stream_credentials: {
        Args: { _stream_id: string }
        Returns: {
          rtmp_url: string
          stream_key: string
        }[]
      }
      get_my_tribe_members: {
        Args: never
        Returns: {
          avatar_url: string
          depth: number
          display_name: string
          referred_at: string
          referrer_id: string
          referrer_name: string
          status: string
          user_id: string
          username: string
        }[]
      }
      get_my_whisperer_wallet: { Args: never; Returns: string }
      get_nav_counts: {
        Args: never
        Returns: {
          my_listings: number
          my_tribe: number
          sleeping_seeds: number
          tribal_gardens: number
          wandering_hearts_female: number
          wandering_hearts_male: number
        }[]
      }
      get_or_create_community_room: { Args: never; Returns: string }
      get_or_create_direct_room: {
        Args: { user1_id: string; user2_id: string }
        Returns: string
      }
      get_or_create_gosat_room: { Args: never; Returns: string }
      get_or_create_live_session: {
        Args: { schedule_id_param: string }
        Returns: string
      }
      get_or_create_wandering_hearts_room: {
        Args: { user1_id: string; user2_id: string }
        Returns: string
      }
      get_payment_config_for_eft: { Args: never; Returns: Json }
      get_payment_config_secure: { Args: never; Returns: Json }
      get_payment_wallet_address: {
        Args: never
        Returns: {
          supported_tokens: string[]
          wallet_address: string
        }[]
      }
      get_product_file_url: { Args: { _product_id: string }; Returns: string }
      get_profile_admin_data: {
        Args: { access_reason: string; profile_user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          country: string
          created_at: string
          display_name: string
          first_name: string
          id: string
          last_name: string
          location: string
          timezone: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }[]
      }
      get_profile_admin_secure: {
        Args: {
          access_reason: string
          requested_fields?: string[]
          target_user_id: string
        }
        Returns: {
          avatar_url: string
          bio: string
          country: string
          created_at: string
          display_name: string
          first_name: string
          id: string
          last_name: string
          location: string
          phone: string
          timezone: string
          user_id: string
        }[]
      }
      get_public_dj_info: {
        Args: { dj_id_param?: string }
        Returns: {
          avatar_url: string
          bio: string
          dj_name: string
          id: string
          is_active: boolean
        }[]
      }
      get_public_estimate: { Args: { _token: string }; Returns: Json }
      get_public_invoice: { Args: { _token: string }; Returns: Json }
      get_public_profile: {
        Args: { profile_user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          created_at: string
          display_name: string
          facebook_url: string
          id: string
          instagram_url: string
          show_social_media: boolean
          tiktok_url: string
          twitter_url: string
          user_id: string
          verification_status: string
          website: string
          youtube_url: string
        }[]
      }
      get_public_profile_info: {
        Args: { target_user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          created_at: string
          display_name: string
          id: string
          user_id: string
        }[]
      }
      get_public_profile_safe: {
        Args: { target_user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          display_name: string
          facebook_url: string
          instagram_url: string
          show_social_media: boolean
          tiktok_url: string
          twitter_url: string
          website: string
          youtube_url: string
        }[]
      }
      get_radio_schedule_for_date: {
        Args: { target_date?: string }
        Returns: {
          category: Database["public"]["Enums"]["show_category"]
          dj_avatar: string
          dj_name: string
          hour_slot: number
          is_live: boolean
          schedule_id: string
          show_name: string
          status: string
        }[]
      }
      get_receipt: { Args: { _message_id: string }; Returns: Json }
      get_recent_gifts: {
        Args: { limit_param?: number; room_id_param: string }
        Returns: {
          amount: number
          created_at: string
          currency: string
          giver_avatar: string
          giver_name: string
          id: string
          message: string
          payment_status: string
          receiver_avatar: string
          receiver_name: string
        }[]
      }
      get_safe_profile_data: {
        Args: { target_user_id?: string }
        Returns: {
          avatar_url: string
          billing_address_masked: string
          billing_country: string
          billing_email_masked: string
          billing_phone_masked: string
          bio: string
          created_at: string
          display_name: string
          has_billing_info: boolean
          id: string
          preferred_currency: string
          user_id: string
        }[]
      }
      get_safe_profile_fields: { Args: never; Returns: string[] }
      get_security_questions_for_email: {
        Args: { p_email: string }
        Returns: {
          question_1: string
          question_2: string
          question_3: string
        }[]
      }
      get_security_questions_for_reset: {
        Args: { user_email: string }
        Returns: {
          question_1: string
          question_2: string
          question_3: string
        }[]
      }
      get_session_token_secure: {
        Args: { session_id_param: string }
        Returns: string
      }
      get_settlement_consent_version: { Args: never; Returns: number }
      get_song_vote_count: {
        Args: { song_id_param: string; week_id_param?: string }
        Returns: number
      }
      get_sower_wallet_public: { Args: { _user_id: string }; Returns: string }
      get_stall_owner_id_by_username: {
        Args: { _username: string }
        Returns: string
      }
      get_total_member_count: { Args: never; Returns: number }
      get_trending_streams: {
        Args: { limit_count?: number }
        Returns: {
          description: string
          id: string
          started_at: string
          tags: string[]
          thumbnail_url: string
          title: string
          total_views: number
          user_id: string
          viewer_count: number
        }[]
      }
      get_upcoming_tribal_events: {
        Args: { _limit?: number }
        Returns: {
          capacity: number | null
          category: string | null
          circle_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          event_type: string
          host_id: string
          id: string
          is_auto_generated: boolean
          jitsi_room_id: string | null
          metadata: Json | null
          region: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "tribal_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_billing_info: {
        Args: { target_user_id?: string }
        Returns: {
          billing_address_line1: string
          billing_address_line2: string
          billing_city: string
          billing_country: string
          billing_email: string
          billing_organization: string
          billing_phone: string
          billing_postal_code: string
          billing_state: string
        }[]
      }
      get_user_billing_info_secure: {
        Args: { target_user_id?: string }
        Returns: {
          billing_address_line1: string
          billing_address_line2: string
          billing_city: string
          billing_country: string
          billing_email: string
          billing_organization: string
          billing_phone: string
          billing_postal_code: string
          billing_state: string
        }[]
      }
      get_user_billing_summary: {
        Args: { target_user_id?: string }
        Returns: {
          billing_country: string
          has_billing_info: boolean
          masked_address: string
          masked_email: string
          masked_phone: string
        }[]
      }
      get_user_display_info: {
        Args: { target_user_id: string }
        Returns: {
          avatar_url: string
          display_name: string
        }[]
      }
      get_user_pii: {
        Args: { target_user_id: string }
        Returns: {
          email: string
          phone: string
        }[]
      }
      get_user_remaining_votes: {
        Args: { user_id_param?: string }
        Returns: number
      }
      get_users_pii: {
        Args: { user_ids: string[] }
        Returns: {
          email: string
          phone: string
          user_id: string
        }[]
      }
      get_vault_secret: { Args: { secret_name: string }; Returns: string }
      get_weekly_leaderboard: {
        Args: { limit_count?: number }
        Returns: {
          artist_name: string
          file_url: string
          rank: number
          song_id: string
          track_title: string
          vote_count: number
        }[]
      }
      gosat_resolve_escrow: {
        Args: { _action: string; _bestowal_id: string; _notes?: string }
        Returns: Json
      }
      grant_bootstrap_admin: {
        Args: { target_email: string }
        Returns: undefined
      }
      grant_user_role_admin: {
        Args: { target_role: string; target_user_id: string }
        Returns: Json
      }
      hand_reference_count: { Args: { _product_id: string }; Returns: number }
      has_accepted_settlement_consent: {
        Args: { _user_id?: string }
        Returns: boolean
      }
      has_free_agent_access: { Args: { _user_id: string }; Returns: boolean }
      has_invoicing_access: { Args: { _user_id: string }; Returns: boolean }
      has_premium_room_access: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_ai_usage:
        | { Args: never; Returns: undefined }
        | { Args: { user_id_param?: string }; Returns: number }
      increment_orchard_views: {
        Args: { orchard_uuid: string }
        Returns: undefined
      }
      increment_product_download_count: {
        Args: { product_uuid: string }
        Returns: undefined
      }
      increment_product_play_count: {
        Args: { product_uuid: string }
        Returns: undefined
      }
      increment_referral_clicks: {
        Args: { p_code: string }
        Returns: undefined
      }
      increment_video_views: {
        Args: { video_uuid: string }
        Returns: undefined
      }
      infer_invoice_kind: { Args: { _label: string }; Returns: string }
      insert_system_chat_message: {
        Args: {
          p_content: string
          p_message_type?: string
          p_room_id: string
          p_system_metadata?: Json
        }
        Returns: string
      }
      invoke_money_job: { Args: { _body?: Json; _fn: string }; Returns: number }
      is_active_ambassador: { Args: { _user_id: string }; Returns: boolean }
      is_active_participant: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_admin_or_gosat: { Args: { _user_id: string }; Returns: boolean }
      is_chat_room_participant: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_companion_promo_active: { Args: never; Returns: boolean }
      is_council_member: { Args: { _user_id: string }; Returns: boolean }
      is_live_room_participant: {
        Args: { _room: string; _user: string }
        Returns: boolean
      }
      is_marketplace_admin: { Args: { _uid: string }; Returns: boolean }
      is_member_of_chat: {
        Args: { _room_id: string; _user_id?: string }
        Returns: boolean
      }
      is_moderator_in_room: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_my_whisperer: { Args: { _whisperer_id: string }; Returns: boolean }
      is_participant_in_room: {
        Args: { p_room_id: string; p_user_id: string }
        Returns: boolean
      }
      is_room_creator: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_service_role: { Args: never; Returns: boolean }
      is_tribal_hearts_member: { Args: { _uid: string }; Returns: boolean }
      is_user_verified: { Args: { user_id_param?: string }; Returns: boolean }
      join_free_premium_room: { Args: { p_room_id: string }; Returns: string }
      join_live_room_as_self: {
        Args: { p_display_name?: string; p_room_id: string }
        Returns: undefined
      }
      kick_user_from_room: {
        Args: {
          kick_reason_param?: string
          room_id_param: string
          user_id_param: string
        }
        Returns: boolean
      }
      liability_snapshot: { Args: { _environment?: string }; Returns: Json }
      live_location_host: { Args: { p_url: string }; Returns: string }
      log_admin_action: {
        Args: {
          action_details?: Json
          action_type: string
          target_user_id?: string
        }
        Returns: undefined
      }
      log_authentication_attempt: {
        Args: {
          ip_address_param?: unknown
          success: boolean
          user_agent_param?: string
          user_email: string
        }
        Returns: undefined
      }
      log_payment_audit: {
        Args: {
          action_param: string
          amount_param: number
          bestowal_id_param?: string
          currency_param: string
          ip_address_param?: unknown
          metadata_param?: Json
          payment_method_param: string
          transaction_id_param?: string
          user_agent_param?: string
          user_id_param: string
        }
        Returns: string
      }
      log_security_event: {
        Args: { details?: Json; event_type: string; user_id_param?: string }
        Returns: undefined
      }
      log_security_event_enhanced: {
        Args: {
          event_details?: Json
          event_type: string
          ip_address_param?: unknown
          severity_level?: string
          target_user_id?: string
        }
        Returns: undefined
      }
      log_whisperer_click: {
        Args: {
          _live_session_id?: string
          _product_id?: string
          _ref_code: string
          _referrer_url?: string
          _visitor_id?: string
        }
        Returns: string
      }
      mark_delivery_progress: {
        Args: { _bestowal_id: string; _stage: string }
        Returns: Json
      }
      mark_job_progress: {
        Args: { _job_notes_id: string; _milestone: string }
        Returns: undefined
      }
      mark_webhook_processed: {
        Args: {
          payload_hash_param: string
          provider_param: string
          webhook_id_param: string
        }
        Returns: undefined
      }
      mask_address: { Args: { address: string }; Returns: string }
      mask_email: { Args: { email_address: string }; Returns: string }
      mask_phone: { Args: { phone_number: string }; Returns: string }
      media_is_allowed:
        | { Args: { _bucket: string; _path: string }; Returns: boolean }
        | {
            Args: { _bucket: string; _created_at?: string; _path: string }
            Returns: boolean
          }
      member_payout_rail: { Args: { _user_id: string }; Returns: string }
      migrate_billing_data_for_user: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      next_estimate_number: { Args: { _business_id: string }; Returns: string }
      next_invoice_number: { Args: { _business_id: string }; Returns: string }
      next_job_invoice_number: {
        Args: { _business_id: string }
        Returns: string
      }
      notify_member: {
        Args: {
          _action_url?: string
          _message: string
          _metadata?: Json
          _recipient: string
          _title: string
          _type: string
        }
        Returns: string
      }
      orchard_apply_holding: { Args: { _bestowal_id: string }; Returns: string }
      orchard_cancel: {
        Args: { _orchard_id: string; _reason: string }
        Returns: Json
      }
      orchard_funding_status: {
        Args: { _orchard_id: string }
        Returns: {
          funded: boolean
          funding_state: string
          held_total: number
          orchard_id: string
          pockets_held: number
          pockets_total: number
          released: boolean
          released_at: string
          target: number
        }[]
      }
      orchard_queue_refund_locked: {
        Args: {
          _actor: string
          _actor_role: string
          _holding_id: string
          _why: string
        }
        Returns: string
      }
      orchard_record_payer: {
        Args: {
          _actor?: string
          _address: string
          _detail: string
          _holding_id: string
          _source: string
        }
        Returns: Json
      }
      orchard_refund_claim: {
        Args: { _limit?: number; _orchard_id?: string }
        Returns: Json[]
      }
      orchard_refund_confirm: {
        Args: {
          _detail?: string
          _fee_cost?: number
          _rail_reference: string
          _refund_id: string
        }
        Returns: Json
      }
      orchard_refund_defer: {
        Args: { _reason: string; _refund_id: string }
        Returns: Json
      }
      orchard_refund_fail: {
        Args: { _error: string; _refund_id: string }
        Returns: Json
      }
      orchard_refund_needs_human: {
        Args: { _reason: string; _refund_id: string }
        Returns: Json
      }
      orchard_refund_retry: {
        Args: { _note?: string; _refund_id: string }
        Returns: Json
      }
      orchard_refund_sent: {
        Args: {
          _detail?: string
          _fee_cost?: number
          _rail_reference: string
          _refund_id: string
        }
        Returns: Json
      }
      orchard_refund_write_off: {
        Args: { _reason: string; _refund_id: string }
        Returns: Json
      }
      orchard_refunds_sent_today: {
        Args: { _environment: string }
        Returns: number
      }
      orchard_release: { Args: { _orchard_id: string }; Returns: Json }
      orchard_release_if_funded: {
        Args: { _orchard_id: string }
        Returns: Json
      }
      orchard_release_locked: {
        Args: { _actor: string; _orchard_id: string; _trigger: string }
        Returns: Json
      }
      orchard_release_uplift_locked: {
        Args: { _actor: string; _orchard_id: string }
        Returns: Json
      }
      orchard_set_payer_manual: {
        Args: { _address: string; _holding_id: string; _note: string }
        Returns: Json
      }
      orchard_settle_if_done_locked: {
        Args: { _orchard_id: string }
        Returns: boolean
      }
      orchard_uplift_fund_now: {
        Args: { _note: string; _orchard_id: string }
        Returns: Json
      }
      orchard_uplift_payment_defer: {
        Args: { _payment_id: string; _reason: string }
        Returns: Json
      }
      orchard_uplift_payment_fail: {
        Args: { _error: string; _payment_id: string }
        Returns: Json
      }
      orchard_uplift_payment_needs_human: {
        Args: { _payment_id: string; _reason: string }
        Returns: Json
      }
      orchard_uplift_payment_paid: {
        Args: { _detail?: string; _payment_id: string; _reference: string }
        Returns: Json
      }
      orchard_uplift_payment_void: {
        Args: { _payment_id: string; _reason: string }
        Returns: Json
      }
      orchard_uplift_payments_sent_today: {
        Args: { _environment: string }
        Returns: number
      }
      orchard_uplift_release: {
        Args: {
          _actor?: string
          _orchard_id: string
          _parties?: Json
          _retry_ids?: string[]
        }
        Returns: Json
      }
      owed_payout_balances: {
        Args: never
        Returns: {
          amount_usd: number
          covered_rows: Json
          recipient_type: string
          recipient_user_id: string
        }[]
      }
      owns_company: { Args: { _company_id: string }; Returns: boolean }
      payment_environment: {
        Args: { _order_id: string; _order_kind: string; _provider: string }
        Returns: string
      }
      post_job_chat_message: {
        Args: {
          _content: string
          _job_notes_id: string
          _message_type?: string
        }
        Returns: undefined
      }
      prescription_object_owner: { Args: { _path: string }; Returns: string }
      process_referral: {
        Args: { p_referral_code: string; p_referred_user_id: string }
        Returns: Json
      }
      prune_cron_history: { Args: { _keep?: string }; Returns: number }
      raise_delivery_issue: {
        Args: { _bestowal_id: string; _reason: string }
        Returns: Json
      }
      recompute_tribal_score: { Args: { _user_id: string }; Returns: number }
      record_revenue: {
        Args: {
          _amount: number
          _created_by?: string
          _currency?: string
          _environment: string
          _idempotency_key?: string
          _kind: string
          _notes?: string
          _rail?: string
          _recognised_at?: string
          _release_ref?: string
          _source_id?: string
          _source_table?: string
        }
        Returns: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          direction: string
          environment: string
          id: string
          idempotency_key: string | null
          kind: string
          notes: string | null
          period: string | null
          rail: string
          recognised_at: string
          release_ref: string | null
          source_id: string | null
          source_table: string | null
        }
        SetofOptions: {
          from: "*"
          to: "revenue_ledger"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_revenue_correction: {
        Args: {
          _amount: number
          _environment?: string
          _idempotency_key: string
          _notes: string
          _rail?: string
          _recognised_at?: string
        }
        Returns: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          direction: string
          environment: string
          id: string
          idempotency_key: string | null
          kind: string
          notes: string | null
          period: string | null
          rail: string
          recognised_at: string
          release_ref: string | null
          source_id: string | null
          source_table: string | null
        }
        SetofOptions: {
          from: "*"
          to: "revenue_ledger"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_treasury_movement: {
        Args: {
          _amount_usd: number
          _currency?: string
          _environment?: string
          _kind: string
          _notes: string
          _occurred_at?: string
          _reference?: string
          _wallet: string
        }
        Returns: {
          amount_usd: number
          created_at: string
          created_by: string | null
          currency: string
          environment: string
          id: string
          kind: string
          notes: string
          occurred_at: string
          reference: string | null
          wallet: string
        }
        SetofOptions: {
          from: "*"
          to: "treasury_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reject_estimate: {
        Args: { _estimate_id: string; _reason: string }
        Returns: undefined
      }
      reject_join_request: { Args: { request_id: string }; Returns: boolean }
      reject_radio_schedule_slot: {
        Args: { approver_id_param: string; schedule_id_param: string }
        Returns: boolean
      }
      reject_radio_slot: {
        Args: { rejection_reason: string; schedule_id_param: string }
        Returns: boolean
      }
      release_due_escrow: { Args: { _limit?: number }; Returns: Json }
      remove_sensitive_profile_data: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      reorder_radio_rundown: {
        Args: { p_ordered_ids: string[]; p_slot_id: string }
        Returns: undefined
      }
      reorder_hand_raise_queue: {
        Args: { call_session_id_param: string }
        Returns: undefined
      }
      resolve_active_whisperer: {
        Args: { _product_id: string; _whisperer_id: string }
        Returns: {
          assignment_id: string
          commission_percent: number
          whisperer_id: string
          whisperer_user_id: string
        }[]
      }
      resolve_whisperer_by_ref_code: {
        Args: {
          _buyer_id?: string
          _live_session_id?: string
          _product_id: string
          _ref_code?: string
          _source?: string
        }
        Returns: {
          assignment_id: string
          attribution_type: string
          commission_percent: number
          live_session_id: string
          ref_link_id: string
          whisperer_id: string
          whisperer_user_id: string
        }[]
      }
      respond_tribal_hearts_spark: {
        Args: { _accept: boolean; _match_id: string }
        Returns: Json
      }
      revenue_summary: {
        Args: { _environment?: string; _period?: string }
        Returns: Json
      }
      s2g_relationship_tier_for_score: {
        Args: { _marked_core: boolean; _sessions: number; _total: number }
        Returns: string
      }
      s2g_slugify: { Args: { _input: string }; Returns: string }
      search_user_profiles: {
        Args: { search_term: string }
        Returns: {
          avatar_url: string
          display_name: string
          first_name: string
          id: string
          last_name: string
          user_id: string
          username: string
        }[]
      }
      security_answer_check: {
        Args: { p_answer: string; p_hash: string }
        Returns: string
      }
      send_chat_message: {
        Args: {
          p_content?: string
          p_file_name?: string
          p_file_size?: number
          p_file_type?: Database["public"]["Enums"]["file_type"]
          p_file_url?: string
          p_message_type?: string
          p_room_id: string
        }
        Returns: {
          ai_generated: boolean | null
          content: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          embedding: string | null
          emotional_tone: string | null
          file_name: string | null
          file_size: number | null
          file_type: Database["public"]["Enums"]["file_type"] | null
          file_url: string | null
          id: string
          immutable_hash: string | null
          intent_tags: string[] | null
          is_edited: boolean
          message_type: string
          reply_to_id: string | null
          room_id: string
          sender_id: string | null
          sender_profile_id: string | null
          system_metadata: Json | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "chat_messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      send_estimate: {
        Args: { _estimate_id: string }
        Returns: {
          approval_expires_at: string | null
          approved_at: string | null
          approved_by_email: string | null
          business_id: string
          created_at: string
          currency_display: string
          customer_id: string
          id: string
          job_notes_id: string
          number: string
          public_token: string
          rejected_at: string | null
          rejected_reason: string | null
          sent_at: string | null
          status: string
          subtotal: number
          tax_total: number
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "estimates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      send_tribal_hearts_spark: {
        Args: { _message?: string; _recipient_id: string; _voice_url?: string }
        Returns: Json
      }
      send_wandering_hearts_message: {
        Args: {
          _content?: string
          _file_duration_sec?: number
          _file_url?: string
          _message_type?: string
          _room_id: string
        }
        Returns: Json
      }
      set_companion_promo_ends_at: {
        Args: { _ends_at: string }
        Returns: string
      }
      set_security_questions: {
        Args: {
          a1: string
          a2: string
          a3: string
          q1: string
          q2: string
          q3: string
        }
        Returns: undefined
      }
      sleeping_hands_near: {
        Args: {
          _categories?: string[]
          _languages?: string[]
          _lat: number
          _limit?: number
          _lng: number
          _min_years?: number
          _offset?: number
          _professional?: boolean
          _radius_m?: number
          _rate_periods?: string[]
        }
        Returns: {
          availability: boolean
          background_check_declared: boolean
          base_lat: number
          base_lng: number
          base_location: string
          cover_image_url: string
          created_at: string
          currency: string
          description: string
          distance_m: number
          front_image_url: string
          gallery_urls: string[]
          is_professional: boolean
          languages: string[]
          licence_number: string
          product_id: string
          qualification: string
          rate_daily: number
          rate_hourly: number
          rate_monthly: number
          rate_per_job: number
          rate_weekly: number
          reference_count: number
          service_category: string
          service_radius_m: number
          sower_id: string
          sower_name: string
          title: string
          work_sample_image_url: string
          years_experience: number
        }[]
      }
      sleeping_pillows_near: {
        Args: {
          _amenities?: string[]
          _lat: number
          _limit?: number
          _lng: number
          _min_sleeps?: number
          _offset?: number
          _radius_m?: number
          _rate_periods?: string[]
          _stay_types?: string[]
        }
        Returns: {
          amenities: string[]
          availability: boolean
          base_lat: number
          base_lng: number
          base_location: string
          cover_image_url: string
          created_at: string
          currency: string
          description: string
          distance_m: number
          from_rate: number
          front_image_url: string
          gallery_urls: string[]
          interior_image_url: string
          max_sleeps: number
          product_id: string
          rate_monthly: number
          rate_nightly: number
          rate_weekly: number
          sleeps: number
          sower_id: string
          sower_name: string
          stay_type: string
          title: string
          unit_count: number
          unit_types: string[]
        }[]
      }
      sleeping_services_near: {
        Args: {
          _kind: string
          _lat: number
          _limit?: number
          _lng: number
          _offset?: number
          _radius_m?: number
        }
        Returns: {
          base_location: string
          cover_image_url: string
          created_at: string
          description: string
          distance_m: number
          image_urls: string[]
          price: number
          product_id: string
          sower_id: string
          sower_name: string
          title: string
        }[]
      }
      sleeping_wheels_near: {
        Args: {
          _lat: number
          _limit?: number
          _lng: number
          _offset?: number
          _radius_m?: number
          _rate_periods?: string[]
          _use_tags?: string[]
          _vehicle_types?: string[]
        }
        Returns: {
          availability: boolean
          base_lat: number
          base_lng: number
          base_location: string
          cover_image_url: string
          created_at: string
          currency: string
          description: string
          distance_m: number
          image_urls: string[]
          product_id: string
          rate_daily: number
          rate_hourly: number
          rate_monthly: number
          rate_per_km: number
          rate_per_trip: number
          rate_weekly: number
          sower_id: string
          sower_name: string
          title: string
          use_tags: string[]
          vehicle_type: string
        }[]
      }
      source_row_created_at: {
        Args: { _source_id: string; _source_table: string }
        Returns: string
      }
      source_row_environment: {
        Args: { _source_id: string; _source_table: string }
        Returns: string
      }
      sower_owns_listing: {
        Args: {
          _book_id: string
          _orchard_id: string
          _product_id: string
          _user: string
        }
        Returns: boolean
      }
      stall_new_seed_counts: {
        Args: { viewer: string }
        Returns: {
          latest_created_at: string
          per_kind: Json
          stall_user_id: string
          total_count: number
        }[]
      }
      stall_visitor_count: { Args: { stall_owner: string }; Returns: number }
      store_payment_idempotency: {
        Args: {
          idempotency_key_param: string
          result_param: Json
          user_id_param: string
        }
        Returns: undefined
      }
      total_balance_ledger_liability: { Args: never; Returns: number }
      treasury_verdict: {
        Args: {
          _assets_usd: number
          _liabilities_usd: number
          _recorded_float_usd?: number
          _s2g_own_usd: number
          _tolerance_usd?: number
          _unrecorded_usd?: number
        }
        Returns: Json
      }
      update_document_page: {
        Args: { document_id_param: string; new_page: number }
        Returns: boolean
      }
      update_listener_streak: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      update_payment_config_secure: {
        Args: {
          p_bank_account_name: string
          p_bank_account_number: string
          p_bank_name: string
          p_bank_swift_code?: string
          p_business_email?: string
        }
        Returns: boolean
      }
      update_user_billing_info: {
        Args: {
          p_billing_address_line1?: string
          p_billing_address_line2?: string
          p_billing_city?: string
          p_billing_country?: string
          p_billing_email?: string
          p_billing_organization?: string
          p_billing_phone?: string
          p_billing_postal_code?: string
          p_billing_state?: string
          target_user_id: string
        }
        Returns: boolean
      }
      update_user_billing_info_secure: {
        Args: {
          p_billing_address_line1?: string
          p_billing_address_line2?: string
          p_billing_city?: string
          p_billing_country?: string
          p_billing_email?: string
          p_billing_organization?: string
          p_billing_phone?: string
          p_billing_postal_code?: string
          p_billing_state?: string
          target_user_id: string
        }
        Returns: boolean
      }
      update_viewer_count_secure: {
        Args: { new_count: number; session_id_param: string }
        Returns: boolean
      }
      update_wallet_balance_secure: {
        Args: {
          new_balance: number
          target_user_id: string
          target_wallet_address: string
        }
        Returns: boolean
      }
      upsert_vault_secret: {
        Args: {
          secret_description?: string
          secret_name: string
          secret_value: string
        }
        Returns: undefined
      }
      user_has_premium_room_access: {
        Args: { room_id_param: string; user_id_param: string }
        Returns: boolean
      }
      user_is_active_in_session: {
        Args: { _session_id: string }
        Returns: boolean
      }
      user_is_host_or_cohost: {
        Args: { _session_id: string }
        Returns: boolean
      }
      user_is_in_room: {
        Args: { check_room_id: string; check_user_id: string }
        Returns: boolean
      }
      user_wallet_credentials_status: {
        Args: never
        Returns: {
          has_api_key: boolean
          has_api_secret: boolean
          has_merchant_id: boolean
        }[]
      }
      validate_file_download_access: {
        Args: { p_file_url: string; p_room_id: string; p_user_id: string }
        Returns: boolean
      }
      verify_own_security_answer: {
        Args: { p_answer: string; p_question_index: number }
        Returns: boolean
      }
      verify_security_answers_and_issue_token: {
        Args: { p_a1: string; p_a2: string; p_a3: string; p_email: string }
        Returns: {
          locked: boolean
          message: string
          reason: string
          success: boolean
          token: string
        }[]
      }
      void_invoice: {
        Args: { _invoice_id: string; _reason?: string }
        Returns: {
          amount_due: number | null
          amount_paid: number
          business_id: string
          created_at: string
          currency_display: string
          customer_id: string
          due_at: string | null
          estimate_id: string
          id: string
          job_notes_id: string
          kind: string
          linked_schedule_item_id: string | null
          notes_to_customer: string | null
          number: string
          paid_at: string | null
          public_token: string
          sent_at: string | null
          status: string
          subtotal: number
          tax_total: number
          total: number
          updated_at: string
          void_reason: string | null
          voided_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wh_detect_contact_info: { Args: { _content: string }; Returns: string }
    }
    Enums: {
      ai_content_type:
        | "script"
        | "voice_over"
        | "marketing_tip"
        | "thumbnail"
        | "content_idea"
      app_role:
        | "user"
        | "gosat"
        | "admin"
        | "radio_admin"
        | "moderator"
        | "courier"
        | "provider"
      booking_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
      booking_type: "ride" | "delivery" | "service"
      chat_message_type:
        | "text"
        | "verification"
        | "acknowledgment"
        | "invoice"
        | "system"
        | "file"
      chat_room_type:
        | "direct"
        | "group"
        | "live_marketing"
        | "live_study"
        | "live_podcast"
        | "live_training"
        | "live_conference"
        | "wandering_hearts"
      chat_room_type_enum:
        | "direct"
        | "group"
        | "verification"
        | "system"
        | "payment"
      company_tier:
        | "homestead"
        | "grove"
        | "orchard"
        | "estate"
        | "harvest_works"
      dj_role: "dj" | "program_director" | "station_manager" | "ai_host"
      file_type: "image" | "video" | "document" | "audio"
      hand_service_category:
        | "plumber"
        | "electrician"
        | "mechanic"
        | "builder"
        | "painter"
        | "security"
        | "it_digital"
        | "accounting"
        | "tutoring"
        | "health_care"
        | "other_professional"
        | "domestic_work"
        | "au_pair_childcare"
        | "house_sitting"
        | "pet_sitting"
        | "gardening"
        | "cleaning"
        | "elder_care"
        | "driver"
        | "other_household"
      hearts_gender: "male" | "female"
      hearts_match_status: "pending" | "mutual" | "declined" | "expired"
      hearts_profile_status: "active" | "paused" | "hidden"
      hearts_response: "pending" | "accepted" | "passed"
      orchard_status: "draft" | "active" | "paused" | "completed" | "cancelled"
      orchard_type:
        | "standard"
        | "full_value"
        | "community"
        | "production"
        | "single_seed"
      payment_status:
        | "pending"
        | "authorized"
        | "captured"
        | "failed"
        | "refunded"
      pillow_stay_type:
        | "room_in_home"
        | "whole_place"
        | "guest_house"
        | "hotel_motel_room"
        | "farm_stay"
        | "bush_camp"
        | "other"
      pillow_unit_type:
        | "room"
        | "chalet"
        | "geodesic_dome"
        | "tent"
        | "safari_tent"
        | "cabin"
        | "cottage"
        | "apartment"
        | "other"
      premium_room_category:
        | "marketing"
        | "cooking_nutrition"
        | "diy_home"
        | "natural_health"
        | "business_training"
        | "podcasts_interviews"
        | "general_courses"
      show_category:
        | "music"
        | "talk"
        | "educational"
        | "community"
        | "news"
        | "comedy"
        | "spiritual"
        | "business"
        | "ai_generated"
        | "live_call_in"
      tracking_status:
        | "en_route_to_pickup"
        | "picking_up"
        | "in_transit"
        | "dropping_off"
        | "completed"
      transaction_type:
        | "payment"
        | "payout"
        | "refund"
        | "platform_fee"
        | "admin_fee"
        | "adjustment"
      verification_status:
        | "pending"
        | "verified"
        | "rejected"
        | "not_submitted"
        | "expired"
      wheel_vehicle_type:
        | "sedan"
        | "bakkie"
        | "truck"
        | "yellow_machine"
        | "farming_vehicle"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ai_content_type: [
        "script",
        "voice_over",
        "marketing_tip",
        "thumbnail",
        "content_idea",
      ],
      app_role: [
        "user",
        "gosat",
        "admin",
        "radio_admin",
        "moderator",
        "courier",
        "provider",
      ],
      booking_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      booking_type: ["ride", "delivery", "service"],
      chat_message_type: [
        "text",
        "verification",
        "acknowledgment",
        "invoice",
        "system",
        "file",
      ],
      chat_room_type: [
        "direct",
        "group",
        "live_marketing",
        "live_study",
        "live_podcast",
        "live_training",
        "live_conference",
        "wandering_hearts",
      ],
      chat_room_type_enum: [
        "direct",
        "group",
        "verification",
        "system",
        "payment",
      ],
      company_tier: [
        "homestead",
        "grove",
        "orchard",
        "estate",
        "harvest_works",
      ],
      dj_role: ["dj", "program_director", "station_manager", "ai_host"],
      file_type: ["image", "video", "document", "audio"],
      hand_service_category: [
        "plumber",
        "electrician",
        "mechanic",
        "builder",
        "painter",
        "security",
        "it_digital",
        "accounting",
        "tutoring",
        "health_care",
        "other_professional",
        "domestic_work",
        "au_pair_childcare",
        "house_sitting",
        "pet_sitting",
        "gardening",
        "cleaning",
        "elder_care",
        "driver",
        "other_household",
      ],
      hearts_gender: ["male", "female"],
      hearts_match_status: ["pending", "mutual", "declined", "expired"],
      hearts_profile_status: ["active", "paused", "hidden"],
      hearts_response: ["pending", "accepted", "passed"],
      orchard_status: ["draft", "active", "paused", "completed", "cancelled"],
      orchard_type: [
        "standard",
        "full_value",
        "community",
        "production",
        "single_seed",
      ],
      payment_status: [
        "pending",
        "authorized",
        "captured",
        "failed",
        "refunded",
      ],
      pillow_stay_type: [
        "room_in_home",
        "whole_place",
        "guest_house",
        "hotel_motel_room",
        "farm_stay",
        "bush_camp",
        "other",
      ],
      pillow_unit_type: [
        "room",
        "chalet",
        "geodesic_dome",
        "tent",
        "safari_tent",
        "cabin",
        "cottage",
        "apartment",
        "other",
      ],
      premium_room_category: [
        "marketing",
        "cooking_nutrition",
        "diy_home",
        "natural_health",
        "business_training",
        "podcasts_interviews",
        "general_courses",
      ],
      show_category: [
        "music",
        "talk",
        "educational",
        "community",
        "news",
        "comedy",
        "spiritual",
        "business",
        "ai_generated",
        "live_call_in",
      ],
      tracking_status: [
        "en_route_to_pickup",
        "picking_up",
        "in_transit",
        "dropping_off",
        "completed",
      ],
      transaction_type: [
        "payment",
        "payout",
        "refund",
        "platform_fee",
        "admin_fee",
        "adjustment",
      ],
      verification_status: [
        "pending",
        "verified",
        "rejected",
        "not_submitted",
        "expired",
      ],
      wheel_vehicle_type: [
        "sedan",
        "bakkie",
        "truck",
        "yellow_machine",
        "farming_vehicle",
        "other",
      ],
    },
  },
} as const

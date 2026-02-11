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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
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
      bestowals: {
        Row: {
          amount: number
          bestower_id: string
          bestower_profile_id: string | null
          blockchain_network: string | null
          created_at: string
          currency: string
          distributed_at: string | null
          distribution_data: Json | null
          distribution_mode: string | null
          hold_reason: string | null
          id: string
          message: string | null
          orchard_id: string
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          pocket_numbers: number[] | null
          pockets_count: number
          release_status: string | null
          released_at: string | null
          tx_signature: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bestower_id: string
          bestower_profile_id?: string | null
          blockchain_network?: string | null
          created_at?: string
          currency?: string
          distributed_at?: string | null
          distribution_data?: Json | null
          distribution_mode?: string | null
          hold_reason?: string | null
          id?: string
          message?: string | null
          orchard_id: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          pocket_numbers?: number[] | null
          pockets_count: number
          release_status?: string | null
          released_at?: string | null
          tx_signature?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bestower_id?: string
          bestower_profile_id?: string | null
          blockchain_network?: string | null
          created_at?: string
          currency?: string
          distributed_at?: string | null
          distribution_data?: Json | null
          distribution_mode?: string | null
          hold_reason?: string | null
          id?: string
          message?: string | null
          orchard_id?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          pocket_numbers?: number[] | null
          pockets_count?: number
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
      call_sessions: {
        Row: {
          accepted_at: string | null
          call_type: string
          caller_id: string
          created_at: string
          ended_at: string | null
          id: string
          receiver_id: string
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
          content: string | null
          created_at: string
          file_name: string | null
          file_size: number | null
          file_type: Database["public"]["Enums"]["file_type"] | null
          file_url: string | null
          id: string
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
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: Database["public"]["Enums"]["file_type"] | null
          file_url?: string | null
          id?: string
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
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: Database["public"]["Enums"]["file_type"] | null
          file_url?: string | null
          id?: string
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
      classroom_sessions: {
        Row: {
          circle_id: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          instructor_id: string
          instructor_profile_id: string | null
          max_participants: number | null
          recording_url: string | null
          scheduled_at: string
          status: string | null
          title: string
          updated_at: string | null
          whiteboard_data: Json | null
        }
        Insert: {
          circle_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          instructor_id: string
          instructor_profile_id?: string | null
          max_participants?: number | null
          recording_url?: string | null
          scheduled_at: string
          status?: string | null
          title: string
          updated_at?: string | null
          whiteboard_data?: Json | null
        }
        Update: {
          circle_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          instructor_id?: string
          instructor_profile_id?: string | null
          max_participants?: number | null
          recording_url?: string | null
          scheduled_at?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          whiteboard_data?: Json | null
        }
        Relationships: [
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
          city: string | null
          contact_email: string
          contact_phone: string
          country: string | null
          created_at: string
          delivery_radius_km: number | null
          distance_unit: string | null
          full_name: string
          id: string
          no_income_confirmed: boolean
          service_areas: string[] | null
          status: string
          updated_at: string
          user_id: string
          vehicle_description: string
          vehicle_images: string[] | null
          vehicle_type: string
        }
        Insert: {
          city?: string | null
          contact_email: string
          contact_phone: string
          country?: string | null
          created_at?: string
          delivery_radius_km?: number | null
          distance_unit?: string | null
          full_name: string
          id?: string
          no_income_confirmed?: boolean
          service_areas?: string[] | null
          status?: string
          updated_at?: string
          user_id: string
          vehicle_description: string
          vehicle_images?: string[] | null
          vehicle_type: string
        }
        Update: {
          city?: string | null
          contact_email?: string
          contact_phone?: string
          country?: string | null
          created_at?: string
          delivery_radius_km?: number | null
          distance_unit?: string | null
          full_name?: string
          id?: string
          no_income_confirmed?: boolean
          service_areas?: string[] | null
          status?: string
          updated_at?: string
          user_id?: string
          vehicle_description?: string
          vehicle_images?: string[] | null
          vehicle_type?: string
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
        }
        Insert: {
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
        }
        Update: {
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
        ]
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
      dj_music_tracks: {
        Row: {
          artist_name: string | null
          bpm: number | null
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
          preview_url: string | null
          price: number | null
          tags: string[] | null
          track_title: string
          track_type: string
          updated_at: string
          upload_date: string
          wallet_address: string | null
        }
        Insert: {
          artist_name?: string | null
          bpm?: number | null
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
          preview_url?: string | null
          price?: number | null
          tags?: string[] | null
          track_title: string
          track_type?: string
          updated_at?: string
          upload_date?: string
          wallet_address?: string | null
        }
        Update: {
          artist_name?: string | null
          bpm?: number | null
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
          preview_url?: string | null
          price?: number | null
          tags?: string[] | null
          track_title?: string
          track_type?: string
          updated_at?: string
          upload_date?: string
          wallet_address?: string | null
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
      journal_entries: {
        Row: {
          answered_prayers: Json | null
          content: string | null
          created_at: string
          feast: string | null
          gratitude: string | null
          gregorian_date: string
          id: string
          images: string[] | null
          is_shabbat: boolean | null
          is_tequvah: boolean | null
          mood: string | null
          part_of_yowm: number | null
          prayer_requests: Json | null
          recipes: Json | null
          tags: string[] | null
          updated_at: string
          user_id: string
          videos: string[] | null
          voice_notes: string[] | null
          watch: number | null
          yhwh_day: number
          yhwh_day_of_year: number | null
          yhwh_month: number
          yhwh_weekday: number | null
          yhwh_year: number
        }
        Insert: {
          answered_prayers?: Json | null
          content?: string | null
          created_at?: string
          feast?: string | null
          gratitude?: string | null
          gregorian_date: string
          id?: string
          images?: string[] | null
          is_shabbat?: boolean | null
          is_tequvah?: boolean | null
          mood?: string | null
          part_of_yowm?: number | null
          prayer_requests?: Json | null
          recipes?: Json | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
          videos?: string[] | null
          voice_notes?: string[] | null
          watch?: number | null
          yhwh_day: number
          yhwh_day_of_year?: number | null
          yhwh_month: number
          yhwh_weekday?: number | null
          yhwh_year: number
        }
        Update: {
          answered_prayers?: Json | null
          content?: string | null
          created_at?: string
          feast?: string | null
          gratitude?: string | null
          gregorian_date?: string
          id?: string
          images?: string[] | null
          is_shabbat?: boolean | null
          is_tequvah?: boolean | null
          mood?: string | null
          part_of_yowm?: number | null
          prayer_requests?: Json | null
          recipes?: Json | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          videos?: string[] | null
          voice_notes?: string[] | null
          watch?: number | null
          yhwh_day?: number
          yhwh_day_of_year?: number | null
          yhwh_month?: number
          yhwh_weekday?: number | null
          yhwh_year?: number
        }
        Relationships: []
      }
      lecture_halls: {
        Row: {
          attendees_count: number | null
          circle_id: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          presenter_id: string
          presenter_profile_id: string | null
          recording_url: string | null
          scheduled_at: string
          slides_url: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          attendees_count?: number | null
          circle_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          presenter_id: string
          presenter_profile_id?: string | null
          recording_url?: string | null
          scheduled_at: string
          slides_url?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          attendees_count?: number | null
          circle_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          presenter_id?: string
          presenter_profile_id?: string | null
          recording_url?: string | null
          scheduled_at?: string
          slides_url?: string | null
          status?: string | null
          title?: string
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
          file_name: string
          file_path: string
          file_size: number
          id: string
          media_type: string
          metadata: Json | null
          mime_type: string
          price_cents: number | null
          session_id: string
          updated_at: string
          uploader_id: string
          watermarked: boolean | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          media_type: string
          metadata?: Json | null
          mime_type: string
          price_cents?: number | null
          session_id: string
          updated_at?: string
          uploader_id: string
          watermarked?: boolean | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          media_type?: string
          metadata?: Json | null
          mime_type?: string
          price_cents?: number | null
          session_id?: string
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
          created_at: string
          id: string
          join_request_approved: boolean | null
          joined_at: string | null
          left_at: string | null
          participant_type: string
          session_id: string
          status: string
          updated_at: string
          user_id: string
          video_enabled: boolean | null
        }
        Insert: {
          audio_enabled?: boolean | null
          can_speak?: boolean | null
          created_at?: string
          id?: string
          join_request_approved?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          participant_type?: string
          session_id: string
          status?: string
          updated_at?: string
          user_id: string
          video_enabled?: boolean | null
        }
        Update: {
          audio_enabled?: boolean | null
          can_speak?: boolean | null
          created_at?: string
          id?: string
          join_request_approved?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          participant_type?: string
          session_id?: string
          status?: string
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
          content_type: string
          created_at: string
          id: string
          likes_count: number
          media_url: string
          recipe_ingredients: string[] | null
          recipe_instructions: string | null
          recipe_title: string | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          comments_count?: number
          content_type: string
          created_at?: string
          id?: string
          likes_count?: number
          media_url: string
          recipe_ingredients?: string[] | null
          recipe_instructions?: string | null
          recipe_title?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          comments_count?: number
          content_type?: string
          created_at?: string
          id?: string
          likes_count?: number
          media_url?: string
          recipe_ingredients?: string[] | null
          recipe_instructions?: string | null
          recipe_title?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      orchards: {
        Row: {
          allow_commission_marketing: boolean | null
          category: string
          commission_rate: number | null
          community_impact: string | null
          completion_rate: number | null
          courier_cost: number | null
          created_at: string
          currency: string
          description: string
          expected_completion: string | null
          features: string[] | null
          filled_pockets: number
          follower_count: number | null
          has_whisperer: boolean | null
          how_it_helps: string | null
          id: string
          images: string[] | null
          intended_pockets: number | null
          like_count: number | null
          location: string | null
          max_whisperers: number | null
          orchard_type: Database["public"]["Enums"]["orchard_type"]
          original_seed_value: number
          payment_processing_fee: number
          pocket_price: number
          product_type: string | null
          profile_id: string
          recipient_pubkey: string | null
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
          why_needed: string | null
        }
        Insert: {
          allow_commission_marketing?: boolean | null
          category: string
          commission_rate?: number | null
          community_impact?: string | null
          completion_rate?: number | null
          courier_cost?: number | null
          created_at?: string
          currency?: string
          description: string
          expected_completion?: string | null
          features?: string[] | null
          filled_pockets?: number
          follower_count?: number | null
          has_whisperer?: boolean | null
          how_it_helps?: string | null
          id?: string
          images?: string[] | null
          intended_pockets?: number | null
          like_count?: number | null
          location?: string | null
          max_whisperers?: number | null
          orchard_type?: Database["public"]["Enums"]["orchard_type"]
          original_seed_value: number
          payment_processing_fee?: number
          pocket_price?: number
          product_type?: string | null
          profile_id: string
          recipient_pubkey?: string | null
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
          why_needed?: string | null
        }
        Update: {
          allow_commission_marketing?: boolean | null
          category?: string
          commission_rate?: number | null
          community_impact?: string | null
          completion_rate?: number | null
          courier_cost?: number | null
          created_at?: string
          currency?: string
          description?: string
          expected_completion?: string | null
          features?: string[] | null
          filled_pockets?: number
          follower_count?: number | null
          has_whisperer?: boolean | null
          how_it_helps?: string | null
          id?: string
          images?: string[] | null
          intended_pockets?: number | null
          like_count?: number | null
          location?: string | null
          max_whisperers?: number | null
          orchard_type?: Database["public"]["Enums"]["orchard_type"]
          original_seed_value?: number
          payment_processing_fee?: number
          pocket_price?: number
          product_type?: string | null
          profile_id?: string
          recipient_pubkey?: string | null
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
          why_needed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orchards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          api_key: string | null
          api_secret: string | null
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
          api_key?: string | null
          api_secret?: string | null
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
          api_key?: string | null
          api_secret?: string | null
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
          password_hash: string
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          password_hash: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          password_hash?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
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
          bank_account_name: string
          bank_account_name_encrypted: string | null
          bank_account_number: string
          bank_account_number_encrypted: string | null
          bank_name: string
          bank_name_encrypted: string | null
          bank_swift_code: string | null
          bank_swift_code_encrypted: string | null
          business_email: string | null
          business_email_encrypted: string | null
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          bank_account_name: string
          bank_account_name_encrypted?: string | null
          bank_account_number: string
          bank_account_number_encrypted?: string | null
          bank_name: string
          bank_name_encrypted?: string | null
          bank_swift_code?: string | null
          bank_swift_code_encrypted?: string | null
          business_email?: string | null
          business_email_encrypted?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          bank_account_name?: string
          bank_account_name_encrypted?: string | null
          bank_account_number?: string
          bank_account_number_encrypted?: string | null
          bank_name?: string
          bank_name_encrypted?: string | null
          bank_swift_code?: string | null
          bank_swift_code_encrypted?: string | null
          business_email?: string | null
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
          created_at: string
          creator_id: string
          description: string | null
          documents: Json | null
          id: string
          is_public: boolean
          max_participants: number
          music: Json | null
          price: number
          room_type: string
          title: string
          updated_at: string
        }
        Insert: {
          artwork?: Json | null
          created_at?: string
          creator_id: string
          description?: string | null
          documents?: Json | null
          id?: string
          is_public?: boolean
          max_participants?: number
          music?: Json | null
          price?: number
          room_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          artwork?: Json | null
          created_at?: string
          creator_id?: string
          description?: string | null
          documents?: Json | null
          id?: string
          is_public?: boolean
          max_participants?: number
          music?: Json | null
          price?: number
          room_type?: string
          title?: string
          updated_at?: string
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
          bestower_id: string | null
          created_at: string | null
          delivery_confirmed_at: string | null
          grower_amount: number
          hold_reason: string | null
          id: string
          payment_method: string | null
          payment_reference: string | null
          product_id: string | null
          release_status: string | null
          released_at: string | null
          s2g_fee: number
          sower_amount: number
          sower_id: string | null
          status: string | null
        }
        Insert: {
          amount: number
          bestower_id?: string | null
          created_at?: string | null
          delivery_confirmed_at?: string | null
          grower_amount: number
          hold_reason?: string | null
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          product_id?: string | null
          release_status?: string | null
          released_at?: string | null
          s2g_fee: number
          sower_amount: number
          sower_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          bestower_id?: string | null
          created_at?: string | null
          delivery_confirmed_at?: string | null
          grower_amount?: number
          hold_reason?: string | null
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          product_id?: string | null
          release_status?: string | null
          released_at?: string | null
          s2g_fee?: number
          sower_amount?: number
          sower_id?: string | null
          status?: string | null
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
          bestowal_count: number | null
          category: string | null
          cover_image_url: string | null
          created_at: string | null
          delivery_type: string | null
          description: string | null
          download_count: number | null
          duration: number | null
          file_url: string
          follower_count: number | null
          has_whisperer: boolean | null
          id: string
          is_featured: boolean | null
          license_type: string | null
          like_count: number | null
          max_whisperers: number | null
          metadata: Json | null
          play_count: number | null
          price: number | null
          sower_id: string | null
          status: string | null
          tags: string[] | null
          title: string
          type: string | null
          updated_at: string | null
          whisperer_commission_percent: number | null
        }
        Insert: {
          bestowal_count?: number | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          delivery_type?: string | null
          description?: string | null
          download_count?: number | null
          duration?: number | null
          file_url: string
          follower_count?: number | null
          has_whisperer?: boolean | null
          id?: string
          is_featured?: boolean | null
          license_type?: string | null
          like_count?: number | null
          max_whisperers?: number | null
          metadata?: Json | null
          play_count?: number | null
          price?: number | null
          sower_id?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          type?: string | null
          updated_at?: string | null
          whisperer_commission_percent?: number | null
        }
        Update: {
          bestowal_count?: number | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          delivery_type?: string | null
          description?: string | null
          download_count?: number | null
          duration?: number | null
          file_url?: string
          follower_count?: number | null
          has_whisperer?: boolean | null
          id?: string
          is_featured?: boolean | null
          license_type?: string | null
          like_count?: number | null
          max_whisperers?: number | null
          metadata?: Json | null
          play_count?: number | null
          price?: number | null
          sower_id?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          type?: string | null
          updated_at?: string | null
          whisperer_commission_percent?: number | null
        }
        Relationships: [
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
          bio: string | null
          country: string | null
          created_at: string
          display_name: string | null
          email: string | null
          facebook_url: string | null
          first_name: string | null
          has_complete_billing_info: boolean | null
          id: string
          instagram_url: string | null
          is_chatapp_verified: boolean | null
          last_login: string | null
          last_name: string | null
          location: string | null
          phone: string | null
          preferred_currency: string | null
          show_social_media: boolean | null
          suspended: boolean | null
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
          website: string | null
          youtube_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          facebook_url?: string | null
          first_name?: string | null
          has_complete_billing_info?: boolean | null
          id?: string
          instagram_url?: string | null
          is_chatapp_verified?: boolean | null
          last_login?: string | null
          last_name?: string | null
          location?: string | null
          phone?: string | null
          preferred_currency?: string | null
          show_social_media?: boolean | null
          suspended?: boolean | null
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
          website?: string | null
          youtube_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          facebook_url?: string | null
          first_name?: string | null
          has_complete_billing_info?: boolean | null
          id?: string
          instagram_url?: string | null
          is_chatapp_verified?: boolean | null
          last_login?: string | null
          last_name?: string | null
          location?: string | null
          phone?: string | null
          preferred_currency?: string | null
          show_social_media?: boolean | null
          suspended?: boolean | null
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
          website?: string | null
          youtube_url?: string | null
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
          schedule_id: string
          session_token: string
          started_at: string | null
          status: string
          updated_at: string
          viewer_count: number
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          schedule_id: string
          session_token: string
          started_at?: string | null
          status?: string
          updated_at?: string
          viewer_count?: number
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          schedule_id?: string
          session_token?: string
          started_at?: string | null
          status?: string
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
      radio_schedule: {
        Row: {
          ai_backup_enabled: boolean | null
          approval_notes: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          dj_id: string | null
          end_time: string
          hour_slot: number
          id: string
          is_free: boolean | null
          listener_count: number | null
          playlist_url: string | null
          price: number | null
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
          created_at?: string
          dj_id?: string | null
          end_time: string
          hour_slot: number
          id?: string
          is_free?: boolean | null
          listener_count?: number | null
          playlist_url?: string | null
          price?: number | null
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
          created_at?: string
          dj_id?: string | null
          end_time?: string
          hour_slot?: number
          id?: string
          is_free?: boolean | null
          listener_count?: number | null
          playlist_url?: string | null
          price?: number | null
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
            foreignKeyName: "radio_schedule_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "radio_shows"
            referencedColumns: ["id"]
          },
        ]
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
          preview_url: string | null
          price: number | null
          tags: string[] | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
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
          preview_url?: string | null
          price?: number | null
          tags?: string[] | null
          title: string
          type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
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
          preview_url?: string | null
          price?: number | null
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string | null
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
        ]
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
          contact_email: string
          contact_phone: string
          country: string | null
          created_at: string
          custom_services: string[] | null
          description: string | null
          distance_unit: string | null
          full_name: string
          hourly_rate: number | null
          id: string
          no_income_confirmed: boolean
          portfolio_images: string[] | null
          service_areas: string[] | null
          service_radius: number | null
          services_offered: string[]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          contact_email: string
          contact_phone: string
          country?: string | null
          created_at?: string
          custom_services?: string[] | null
          description?: string | null
          distance_unit?: string | null
          full_name: string
          hourly_rate?: number | null
          id?: string
          no_income_confirmed?: boolean
          portfolio_images?: string[] | null
          service_areas?: string[] | null
          service_radius?: number | null
          services_offered?: string[]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          contact_email?: string
          contact_phone?: string
          country?: string | null
          created_at?: string
          custom_services?: string[] | null
          description?: string | null
          distance_unit?: string | null
          full_name?: string
          hourly_rate?: number | null
          id?: string
          no_income_confirmed?: boolean
          portfolio_images?: string[] | null
          service_areas?: string[] | null
          service_radius?: number | null
          services_offered?: string[]
          status?: string
          updated_at?: string
          user_id?: string
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
          whisperer_commission_percent: number | null
        }
        Insert: {
          bestowal_value?: number | null
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
          whisperer_commission_percent?: number | null
        }
        Update: {
          bestowal_value?: number | null
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
      sowers: {
        Row: {
          bio: string | null
          created_at: string | null
          display_name: string
          id: string
          is_verified: boolean | null
          logo_url: string | null
          updated_at: string | null
          user_id: string | null
          wallet_address: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          is_verified?: boolean | null
          logo_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          wallet_address?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          is_verified?: boolean | null
          logo_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          wallet_address?: string | null
        }
        Relationships: []
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
        ]
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
          updated_at: string
          user_id: string
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
          updated_at?: string
          user_id: string
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
          updated_at?: string
          user_id?: string
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
      whisperer_earnings: {
        Row: {
          amount: number
          assignment_id: string | null
          bestowal_id: string
          commission_percent: number
          created_at: string | null
          id: string
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
      whisperers: {
        Row: {
          bio: string | null
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          portfolio_url: string | null
          profile_id: string | null
          social_links: Json | null
          specialties: string[] | null
          total_earnings: number | null
          total_products_promoted: number | null
          updated_at: string | null
          user_id: string
          wallet_address: string | null
          wallet_type: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          portfolio_url?: string | null
          profile_id?: string | null
          social_links?: Json | null
          specialties?: string[] | null
          total_earnings?: number | null
          total_products_promoted?: number | null
          updated_at?: string | null
          user_id: string
          wallet_address?: string | null
          wallet_type?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          portfolio_url?: string | null
          profile_id?: string | null
          social_links?: Json | null
          specialties?: string[] | null
          total_earnings?: number | null
          total_products_promoted?: number | null
          updated_at?: string | null
          user_id?: string
          wallet_address?: string | null
          wallet_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whisperers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_xp: {
        Args: { amount?: number; user_id_param: string }
        Returns: Json
      }
      add_xp_to_current_user: { Args: { amount?: number }; Returns: Json }
      admin_delete_room: { Args: { target_room_id: string }; Returns: boolean }
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
      check_chat_rate_limit: {
        Args: { p_room_id: string; p_user_id: string }
        Returns: boolean
      }
      check_payment_idempotency: {
        Args: { idempotency_key_param: string; user_id_param: string }
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
      cleanup_expired_idempotency_keys: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      create_verification_room_for_user: {
        Args: { target_user_id: string }
        Returns: string
      }
      decrypt_pii_data: { Args: { encrypted_data: string }; Returns: string }
      encrypt_pii_data: { Args: { data_text: string }; Returns: string }
      encrypt_pii_data_secure: { Args: { data_text: string }; Returns: string }
      end_stream: { Args: { stream_id_param: string }; Returns: boolean }
      generate_invoice_number: { Args: never; Returns: string }
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
      get_current_radio_show: { Args: never; Returns: Json }
      get_current_week_id: { Args: never; Returns: string }
      get_message_streak: { Args: { user_id_param: string }; Returns: number }
      get_or_create_direct_room: {
        Args: { user1_id: string; user2_id: string }
        Returns: string
      }
      get_or_create_live_session: {
        Args: { schedule_id_param: string }
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
      get_song_vote_count: {
        Args: { song_id_param: string; week_id_param?: string }
        Returns: number
      }
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
      get_user_remaining_votes: {
        Args: { user_id_param?: string }
        Returns: number
      }
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
      grant_bootstrap_admin: {
        Args: { target_email: string }
        Returns: undefined
      }
      grant_user_role_admin: {
        Args: { target_role: string; target_user_id: string }
        Returns: Json
      }
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
      increment_video_views: {
        Args: { video_uuid: string }
        Returns: undefined
      }
      insert_system_chat_message: {
        Args: {
          p_content: string
          p_message_type?: string
          p_room_id: string
          p_system_metadata?: Json
        }
        Returns: string
      }
      is_active_participant: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_admin_or_gosat: { Args: { _user_id: string }; Returns: boolean }
      is_member_of_chat: {
        Args: { _room_id: string; _user_id?: string }
        Returns: boolean
      }
      is_moderator_in_room: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_room_creator: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_user_verified: { Args: { user_id_param?: string }; Returns: boolean }
      kick_user_from_room: {
        Args: {
          kick_reason_param?: string
          room_id_param: string
          user_id_param: string
        }
        Returns: boolean
      }
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
      migrate_billing_data_for_user: {
        Args: { target_user_id: string }
        Returns: boolean
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
      remove_sensitive_profile_data: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      reorder_hand_raise_queue: {
        Args: { call_session_id_param: string }
        Returns: undefined
      }
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
          content: string | null
          created_at: string
          file_name: string | null
          file_size: number | null
          file_type: Database["public"]["Enums"]["file_type"] | null
          file_url: string | null
          id: string
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
      store_payment_idempotency: {
        Args: {
          idempotency_key_param: string
          result_param: Json
          user_id_param: string
        }
        Returns: undefined
      }
      update_document_page: {
        Args: { document_id_param: string; new_page: number }
        Returns: boolean
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
      validate_file_download_access: {
        Args: { p_file_url: string; p_room_id: string; p_user_id: string }
        Returns: boolean
      }
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
      chat_room_type_enum:
        | "direct"
        | "group"
        | "verification"
        | "system"
        | "payment"
      dj_role: "dj" | "program_director" | "station_manager" | "ai_host"
      file_type: "image" | "video" | "document" | "audio"
      orchard_status: "draft" | "active" | "paused" | "completed" | "cancelled"
      orchard_type: "standard" | "full_value"
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
      verification_status: "pending" | "verified" | "rejected"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
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
      ],
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
      ],
      chat_room_type_enum: [
        "direct",
        "group",
        "verification",
        "system",
        "payment",
      ],
      dj_role: ["dj", "program_director", "station_manager", "ai_host"],
      file_type: ["image", "video", "document", "audio"],
      orchard_status: ["draft", "active", "paused", "completed", "cancelled"],
      orchard_type: ["standard", "full_value"],
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
      verification_status: ["pending", "verified", "rejected"],
    },
  },
} as const

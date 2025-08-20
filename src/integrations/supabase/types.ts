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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
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
      bestowals: {
        Row: {
          amount: number
          bestower_id: string
          bestower_profile_id: string | null
          created_at: string
          currency: string
          id: string
          message: string | null
          orchard_id: string
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          pocket_numbers: number[] | null
          pockets_count: number
          updated_at: string
        }
        Insert: {
          amount: number
          bestower_id: string
          bestower_profile_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          message?: string | null
          orchard_id: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          pocket_numbers?: number[] | null
          pockets_count: number
          updated_at?: string
        }
        Update: {
          amount?: number
          bestower_id?: string
          bestower_profile_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          message?: string | null
          orchard_id?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          pocket_numbers?: number[] | null
          pockets_count?: number
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
          ip_address: unknown | null
          success: boolean | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          access_type: string
          accessed_by?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          success?: boolean | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          access_type?: string
          accessed_by?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string
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
          sender_id: string
          sender_profile_id: string | null
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
          sender_id: string
          sender_profile_id?: string | null
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
          sender_id?: string
          sender_profile_id?: string | null
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
          profile_id: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          is_moderator?: boolean
          joined_at?: string
          profile_id?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_active?: boolean
          is_moderator?: boolean
          joined_at?: string
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
      chat_rooms: {
        Row: {
          access_description: string | null
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          is_premium: boolean | null
          max_participants: number | null
          name: string | null
          orchard_id: string | null
          premium_category:
            | Database["public"]["Enums"]["premium_room_category"]
            | null
          required_bestowal_amount: number | null
          room_type: Database["public"]["Enums"]["chat_room_type"]
          updated_at: string
        }
        Insert: {
          access_description?: string | null
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_premium?: boolean | null
          max_participants?: number | null
          name?: string | null
          orchard_id?: string | null
          premium_category?:
            | Database["public"]["Enums"]["premium_room_category"]
            | null
          required_bestowal_amount?: number | null
          room_type?: Database["public"]["Enums"]["chat_room_type"]
          updated_at?: string
        }
        Update: {
          access_description?: string | null
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_premium?: boolean | null
          max_participants?: number | null
          name?: string | null
          orchard_id?: string | null
          premium_category?:
            | Database["public"]["Enums"]["premium_room_category"]
            | null
          required_bestowal_amount?: number | null
          room_type?: Database["public"]["Enums"]["chat_room_type"]
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
      community_videos: {
        Row: {
          comment_count: number | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          file_size: number | null
          id: string
          like_count: number | null
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
            foreignKeyName: "community_videos_uploader_profile_id_fkey"
            columns: ["uploader_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orchards: {
        Row: {
          category: string
          community_impact: string | null
          completion_rate: number | null
          courier_cost: number | null
          created_at: string
          currency: string
          description: string
          expected_completion: string | null
          features: string[] | null
          filled_pockets: number
          how_it_helps: string | null
          id: string
          images: string[] | null
          location: string | null
          orchard_type: Database["public"]["Enums"]["orchard_type"]
          original_seed_value: number
          payment_processing_fee: number
          pocket_price: number
          profile_id: string
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
          why_needed: string | null
        }
        Insert: {
          category: string
          community_impact?: string | null
          completion_rate?: number | null
          courier_cost?: number | null
          created_at?: string
          currency?: string
          description: string
          expected_completion?: string | null
          features?: string[] | null
          filled_pockets?: number
          how_it_helps?: string | null
          id?: string
          images?: string[] | null
          location?: string | null
          orchard_type?: Database["public"]["Enums"]["orchard_type"]
          original_seed_value: number
          payment_processing_fee?: number
          pocket_price?: number
          profile_id: string
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
          why_needed?: string | null
        }
        Update: {
          category?: string
          community_impact?: string | null
          completion_rate?: number | null
          courier_cost?: number | null
          created_at?: string
          currency?: string
          description?: string
          expected_completion?: string | null
          features?: string[] | null
          filled_pockets?: number
          how_it_helps?: string | null
          id?: string
          images?: string[] | null
          location?: string | null
          orchard_type?: Database["public"]["Enums"]["orchard_type"]
          original_seed_value?: number
          payment_processing_fee?: number
          pocket_price?: number
          profile_id?: string
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
          created_at: string
          id: string
          is_active: boolean
          supported_tokens: string[]
          updated_at: string
          wallet_address: string
          wallet_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          supported_tokens?: string[]
          updated_at?: string
          wallet_address: string
          wallet_name?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          supported_tokens?: string[]
          updated_at?: string
          wallet_address?: string
          wallet_name?: string
        }
        Relationships: []
      }
      payment_config: {
        Row: {
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          bank_swift_code: string | null
          business_email: string | null
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          bank_swift_code?: string | null
          business_email?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          bank_account_name?: string
          bank_account_number?: string
          bank_name?: string
          bank_swift_code?: string | null
          business_email?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
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
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          first_name: string | null
          has_complete_billing_info: boolean | null
          id: string
          last_name: string | null
          location: string | null
          preferred_currency: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          has_complete_billing_info?: boolean | null
          id?: string
          last_name?: string | null
          location?: string | null
          preferred_currency?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          has_complete_billing_info?: boolean | null
          id?: string
          last_name?: string | null
          location?: string | null
          preferred_currency?: string | null
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
      user_notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
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
      user_wallets: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          is_primary: boolean
          updated_at: string
          user_id: string
          wallet_address: string
          wallet_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean
          updated_at?: string
          user_id: string
          wallet_address: string
          wallet_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean
          updated_at?: string
          user_id?: string
          wallet_address?: string
          wallet_type?: string
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
          ip_address: unknown | null
          success: boolean | null
          user_id: string
          wallet_address: string
        }
        Insert: {
          access_type: string
          accessed_by?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          success?: boolean | null
          user_id: string
          wallet_address: string
        }
        Update: {
          access_type?: string
          accessed_by?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      get_ai_usage_today: {
        Args: { user_id_param: string }
        Returns: number
      }
      get_or_create_direct_room: {
        Args: { user1_id: string; user2_id: string }
        Returns: string
      }
      get_payment_config_for_eft: {
        Args: Record<PropertyKey, never>
        Returns: Json
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_ai_usage: {
        Args: { user_id_param: string }
        Returns: number
      }
      increment_orchard_views: {
        Args: { orchard_uuid: string }
        Returns: undefined
      }
      increment_video_views: {
        Args: { video_uuid: string }
        Returns: undefined
      }
      is_admin_or_gosat: {
        Args: { _user_id: string }
        Returns: boolean
      }
      mask_address: {
        Args: { address: string }
        Returns: string
      }
      mask_email: {
        Args: { email_address: string }
        Returns: string
      }
      mask_phone: {
        Args: { phone_number: string }
        Returns: string
      }
      migrate_billing_data_for_user: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      remove_sensitive_profile_data: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      search_user_profiles: {
        Args: { search_term: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          user_id: string
        }[]
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
      user_is_in_room: {
        Args: { check_room_id: string; check_user_id: string }
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
      app_role: "user" | "gosat" | "admin"
      chat_room_type:
        | "direct"
        | "group"
        | "live_marketing"
        | "live_study"
        | "live_podcast"
        | "live_training"
        | "live_conference"
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
      app_role: ["user", "gosat", "admin"],
      chat_room_type: [
        "direct",
        "group",
        "live_marketing",
        "live_study",
        "live_podcast",
        "live_training",
        "live_conference",
      ],
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
      verification_status: ["pending", "verified", "rejected"],
    },
  },
} as const

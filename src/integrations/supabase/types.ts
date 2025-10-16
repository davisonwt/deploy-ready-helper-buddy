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
      bestowals: {
        Row: {
          amount: number
          bestower_id: string
          bestower_profile_id: string | null
          blockchain_network: string | null
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
          id?: string
          message?: string | null
          orchard_id: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          pocket_numbers?: number[] | null
          pockets_count: number
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
          id?: string
          message?: string | null
          orchard_id?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          pocket_numbers?: number[] | null
          pockets_count?: number
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
          ip_address: unknown | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_type: string
          accessed_by?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_type?: string
          accessed_by?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
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
          sender_id: string
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
          sender_id: string
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
          sender_id?: string
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
          how_it_helps: string | null
          id: string
          images: string[] | null
          intended_pockets: number | null
          location: string | null
          orchard_type: Database["public"]["Enums"]["orchard_type"]
          original_seed_value: number
          payment_processing_fee: number
          pocket_price: number
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
          how_it_helps?: string | null
          id?: string
          images?: string[] | null
          intended_pockets?: number | null
          location?: string | null
          orchard_type?: Database["public"]["Enums"]["orchard_type"]
          original_seed_value: number
          payment_processing_fee?: number
          pocket_price?: number
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
          how_it_helps?: string | null
          id?: string
          images?: string[] | null
          intended_pockets?: number | null
          location?: string | null
          orchard_type?: Database["public"]["Enums"]["orchard_type"]
          original_seed_value?: number
          payment_processing_fee?: number
          pocket_price?: number
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
          blockchain: string | null
          created_at: string
          id: string
          is_active: boolean
          supported_tokens: string[]
          updated_at: string
          wallet_address: string
          wallet_name: string
          wallet_type: string | null
        }
        Insert: {
          blockchain?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          supported_tokens?: string[]
          updated_at?: string
          wallet_address: string
          wallet_name?: string
          wallet_type?: string | null
        }
        Update: {
          blockchain?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          supported_tokens?: string[]
          updated_at?: string
          wallet_address?: string
          wallet_name?: string
          wallet_type?: string | null
        }
        Relationships: []
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
      profile_access_logs: {
        Row: {
          access_reason: string | null
          access_type: string
          accessed_fields: string[] | null
          accessed_profile_id: string
          accessor_user_id: string
          created_at: string | null
          id: string
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
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
          facebook_url: string | null
          first_name: string | null
          has_complete_billing_info: boolean | null
          id: string
          instagram_url: string | null
          last_name: string | null
          location: string | null
          phone: string | null
          preferred_currency: string | null
          show_social_media: boolean | null
          tiktok_url: string | null
          timezone: string | null
          twitter_url: string | null
          updated_at: string
          user_id: string
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
          facebook_url?: string | null
          first_name?: string | null
          has_complete_billing_info?: boolean | null
          id?: string
          instagram_url?: string | null
          last_name?: string | null
          location?: string | null
          phone?: string | null
          preferred_currency?: string | null
          show_social_media?: boolean | null
          tiktok_url?: string | null
          timezone?: string | null
          twitter_url?: string | null
          updated_at?: string
          user_id: string
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
          facebook_url?: string | null
          first_name?: string | null
          has_complete_billing_info?: boolean | null
          id?: string
          instagram_url?: string | null
          last_name?: string | null
          location?: string | null
          phone?: string | null
          preferred_currency?: string | null
          show_social_media?: boolean | null
          tiktok_url?: string | null
          timezone?: string | null
          twitter_url?: string | null
          updated_at?: string
          user_id?: string
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
      approve_join_request: {
        Args: { request_id: string }
        Returns: boolean
      }
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
        Args: Record<PropertyKey, never>
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
      can_join_session_early: {
        Args: { schedule_id_param: string }
        Returns: boolean
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
      cleanup_old_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      decrypt_pii_data: {
        Args: { encrypted_data: string }
        Returns: string
      }
      encrypt_pii_data: {
        Args: { data_text: string }
        Returns: string
      }
      encrypt_pii_data_secure: {
        Args: { data_text: string }
        Returns: string
      }
      end_stream: {
        Args: { stream_id_param: string }
        Returns: boolean
      }
      generate_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
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
      get_ai_usage_today: {
        Args: Record<PropertyKey, never> | { user_id_param?: string }
        Returns: number
      }
      get_current_radio_show: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_or_create_direct_room: {
        Args: { user1_id: string; user2_id: string }
        Returns: string
      }
      get_or_create_live_session: {
        Args: { schedule_id_param: string }
        Returns: string
      }
      get_payment_config_for_eft: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_payment_config_secure: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_payment_wallet_address: {
        Args: Record<PropertyKey, never>
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
      get_safe_profile_fields: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      get_session_token_secure: {
        Args: { session_id_param: string }
        Returns: string
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
      grant_bootstrap_admin: {
        Args: { target_email: string }
        Returns: undefined
      }
      grant_user_role_admin: {
        Args: { target_role: string; target_user_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_ai_usage: {
        Args: Record<PropertyKey, never> | { user_id_param?: string }
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
      is_active_participant: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_admin_or_gosat: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_room_creator: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_user_verified: {
        Args: { user_id_param?: string }
        Returns: boolean
      }
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
      reject_join_request: {
        Args: { request_id: string }
        Returns: boolean
      }
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
          id: string
          user_id: string
        }[]
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
    }
    Enums: {
      ai_content_type:
        | "script"
        | "voice_over"
        | "marketing_tip"
        | "thumbnail"
        | "content_idea"
      app_role: "user" | "gosat" | "admin" | "radio_admin" | "moderator"
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
      app_role: ["user", "gosat", "admin", "radio_admin", "moderator"],
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

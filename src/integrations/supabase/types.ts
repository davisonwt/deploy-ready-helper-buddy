export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
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
      orchards: {
        Row: {
          category: string
          community_impact: string | null
          completion_rate: number | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_orchard_views: {
        Args: { orchard_uuid: string }
        Returns: undefined
      }
    }
    Enums: {
      orchard_status: "draft" | "active" | "paused" | "completed" | "cancelled"
      orchard_type: "standard" | "full_value"
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
      orchard_status: ["draft", "active", "paused", "completed", "cancelled"],
      orchard_type: ["standard", "full_value"],
      verification_status: ["pending", "verified", "rejected"],
    },
  },
} as const

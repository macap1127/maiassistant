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
  public: {
    Tables: {
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          added_by: string
          assigned_to: string
          created_at: string
          date: string
          household_id: string
          id: string
          location: string | null
          notes: string | null
          source: string | null
          time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          added_by?: string
          assigned_to?: string
          created_at?: string
          date: string
          household_id: string
          id?: string
          location?: string | null
          notes?: string | null
          source?: string | null
          time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          added_by?: string
          assigned_to?: string
          created_at?: string
          date?: string
          household_id?: string
          id?: string
          location?: string | null
          notes?: string | null
          source?: string | null
          time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          avatar: string | null
          created_at: string
          household_id: string
          id: string
          name: string
          phone: string
          role: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          household_id: string
          id?: string
          name: string
          phone?: string
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar?: string | null
          created_at?: string
          household_id?: string
          id?: string
          name?: string
          phone?: string
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_items: {
        Row: {
          added_by: string
          category: string
          completed: boolean
          created_at: string
          household_id: string
          id: string
          name: string
          quantity: string
          store: string | null
          updated_at: string
        }
        Insert: {
          added_by?: string
          category?: string
          completed?: boolean
          created_at?: string
          household_id: string
          id?: string
          name: string
          quantity?: string
          store?: string | null
          updated_at?: string
        }
        Update: {
          added_by?: string
          category?: string
          completed?: boolean
          created_at?: string
          household_id?: string
          id?: string
          name?: string
          quantity?: string
          store?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string | null
          expires_at: string
          household_id: string
          id: string
          invite_code: string
          invited_by: string
          phone: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          household_id: string
          id?: string
          invite_code?: string
          invited_by: string
          phone?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          household_id?: string
          id?: string
          invite_code?: string
          invited_by?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string
          household_id: string
          id: string
          role: Database["public"]["Enums"]["household_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          role?: Database["public"]["Enums"]["household_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          role?: Database["public"]["Enums"]["household_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          access_locked: boolean
          ai_calendar_imports_period_start: string
          ai_calendar_imports_used: number
          assistant_language: string
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string
          has_used_trial: boolean
          id: string
          name: string
          owner_user_id: string
          primary_phone: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string
          subscription_tier: string
          trial_ends_at: string | null
          updated_at: string
          voice_seconds_limit: number
          voice_seconds_used: number
        }
        Insert: {
          access_locked?: boolean
          ai_calendar_imports_period_start?: string
          ai_calendar_imports_used?: number
          assistant_language?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          has_used_trial?: boolean
          id?: string
          name?: string
          owner_user_id: string
          primary_phone: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          subscription_tier?: string
          trial_ends_at?: string | null
          updated_at?: string
          voice_seconds_limit?: number
          voice_seconds_used?: number
        }
        Update: {
          access_locked?: boolean
          ai_calendar_imports_period_start?: string
          ai_calendar_imports_used?: number
          assistant_language?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          has_used_trial?: boolean
          id?: string
          name?: string
          owner_user_id?: string
          primary_phone?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          subscription_tier?: string
          trial_ends_at?: string | null
          updated_at?: string
          voice_seconds_limit?: number
          voice_seconds_used?: number
        }
        Relationships: []
      }
      internal_testers: {
        Row: {
          created_at: string
          email: string
          id: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      public_sms_optins: {
        Row: {
          consent: boolean
          created_at: string
          id: string
          phone: string
          user_agent: string | null
        }
        Insert: {
          consent?: boolean
          created_at?: string
          id?: string
          phone: string
          user_agent?: string | null
        }
        Update: {
          consent?: boolean
          created_at?: string
          id?: string
          phone?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      receipts: {
        Row: {
          added_by: string
          created_at: string
          currency: string
          household_id: string
          id: string
          image_path: string
          items_summary: string | null
          notes: string | null
          purchase_date: string | null
          store: string
          total: number | null
          updated_at: string
        }
        Insert: {
          added_by?: string
          created_at?: string
          currency?: string
          household_id: string
          id?: string
          image_path: string
          items_summary?: string | null
          notes?: string | null
          purchase_date?: string | null
          store?: string
          total?: number | null
          updated_at?: string
        }
        Update: {
          added_by?: string
          created_at?: string
          currency?: string
          household_id?: string
          id?: string
          image_path?: string
          items_summary?: string | null
          notes?: string | null
          purchase_date?: string | null
          store?: string
          total?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      sms_reminder_prefs: {
        Row: {
          created_at: string
          household_id: string
          last_sent_date: string | null
          opted_in: boolean
          phone: string
          send_time: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          last_sent_date?: string | null
          opted_in?: boolean
          phone?: string
          send_time?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          last_sent_date?: string | null
          opted_in?: boolean
          phone?: string
          send_time?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string
          completed: boolean
          created_at: string
          due_date: string | null
          household_id: string
          id: string
          time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string
          completed?: boolean
          created_at?: string
          due_date?: string | null
          household_id: string
          id?: string
          time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          completed?: boolean
          created_at?: string
          due_date?: string | null
          household_id?: string
          id?: string
          time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_usage_log: {
        Row: {
          conversation_id: string | null
          created_at: string
          ended_at: string
          household_id: string
          id: string
          seconds: number
          started_at: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          ended_at?: string
          household_id: string
          id?: string
          seconds: number
          started_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          ended_at?: string
          household_id?: string
          id?: string
          seconds?: number
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_usage_log_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { _code: string }; Returns: string }
      admin_active_users_today: { Args: never; Returns: Json }
      admin_tester_activity_today: { Args: never; Returns: Json }
      can_use_ai_calendar_import: {
        Args: { _household_id: string }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_invite_by_code: {
        Args: { _code: string }
        Returns: {
          accepted_at: string
          expires_at: string
          household_id: string
          household_name: string
        }[]
      }
      household_feature_allowed: {
        Args: { _feature: string; _household_id: string }
        Returns: boolean
      }
      household_has_access: {
        Args: { _household_id: string }
        Returns: boolean
      }
      household_has_valid_invite: {
        Args: { _household_id: string }
        Returns: boolean
      }
      household_tier: { Args: { _household_id: string }; Returns: string }
      increment_ai_calendar_usage: {
        Args: { _household_id: string }
        Returns: number
      }
      increment_voice_usage: {
        Args: { _household_id: string; _seconds: number }
        Returns: number
      }
      is_app_admin: { Args: never; Returns: boolean }
      is_household_member: {
        Args: { _household_id: string; _user_id: string }
        Returns: boolean
      }
      is_household_owner: {
        Args: { _household_id: string; _user_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      tier_member_limit: { Args: { _tier: string }; Returns: number }
      voice_seconds_remaining: {
        Args: { _household_id: string }
        Returns: number
      }
    }
    Enums: {
      household_role: "owner" | "member"
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
      household_role: ["owner", "member"],
    },
  },
} as const

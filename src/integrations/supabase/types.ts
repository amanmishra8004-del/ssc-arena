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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          at: string
          id: string
          kind: string
          username: string
        }
        Insert: {
          at?: string
          id?: string
          kind: string
          username: string
        }
        Update: {
          at?: string
          id?: string
          kind?: string
          username?: string
        }
        Relationships: []
      }
      app_secrets: {
        Row: {
          created_at: string
          name: string
          value: string
        }
        Insert: {
          created_at?: string
          name: string
          value: string
        }
        Update: {
          created_at?: string
          name?: string
          value?: string
        }
        Relationships: []
      }
      app_users: {
        Row: {
          created_at: string
          username: string
        }
        Insert: {
          created_at?: string
          username: string
        }
        Update: {
          created_at?: string
          username?: string
        }
        Relationships: []
      }
      ca_daily: {
        Row: {
          created_at: string
          day: string
          items: Json
        }
        Insert: {
          created_at?: string
          day: string
          items?: Json
        }
        Update: {
          created_at?: string
          day?: string
          items?: Json
        }
        Relationships: []
      }
      password_log: {
        Row: {
          changed_at: string
          id: string
          new_password: string
          old_password: string | null
          username: string
        }
        Insert: {
          changed_at?: string
          id?: string
          new_password: string
          old_password?: string | null
          username: string
        }
        Update: {
          changed_at?: string
          id?: string
          new_password?: string
          old_password?: string | null
          username?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          token: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          token: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          token?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          at: string
          id: string
          quiz_id: string
          score: number
          total: number
          username: string
        }
        Insert: {
          answers?: Json
          at?: string
          id?: string
          quiz_id: string
          score: number
          total: number
          username: string
        }
        Update: {
          answers?: Json
          at?: string
          id?: string
          quiz_id?: string
          score?: number
          total?: number
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          chapter: string | null
          created_at: string
          day: string | null
          hidden: boolean
          html: string | null
          id: string
          questions: Json
          title: string
        }
        Insert: {
          chapter?: string | null
          created_at?: string
          day?: string | null
          hidden?: boolean
          html?: string | null
          id?: string
          questions?: Json
          title: string
        }
        Update: {
          chapter?: string | null
          created_at?: string
          day?: string | null
          hidden?: boolean
          html?: string | null
          id?: string
          questions?: Json
          title?: string
        }
        Relationships: []
      }
      user_data: {
        Row: {
          data: Json
          updated_at: string
          username: string
        }
        Insert: {
          data?: Json
          updated_at?: string
          username: string
        }
        Update: {
          data?: Json
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      user_data_history: {
        Row: {
          data: Json
          id: string
          saved_at: string
          username: string
        }
        Insert: {
          data: Json
          id?: string
          saved_at?: string
          username: string
        }
        Update: {
          data?: Json
          id?: string
          saved_at?: string
          username?: string
        }
        Relationships: []
      }
      user_passwords: {
        Row: {
          password_hash: string
          updated_at: string
          username: string
        }
        Insert: {
          password_hash: string
          updated_at?: string
          username: string
        }
        Update: {
          password_hash?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          last_seen: string
          username: string
        }
        Insert: {
          last_seen?: string
          username: string
        }
        Update: {
          last_seen?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const

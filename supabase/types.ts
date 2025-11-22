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
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      test_responses: {
        Row: {
          correct_answer: string
          created_at: string | null
          id: string
          is_correct: boolean | null
          response_time_seconds: number | null
          test_id: string
          user_answer: string
          user_id: string
          word_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          response_time_seconds?: number | null
          test_id: string
          user_answer: string
          user_id: string
          word_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          response_time_seconds?: number | null
          test_id?: string
          user_answer?: string
          user_id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_responses_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "user_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_responses_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_words"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tests: {
        Row: {
          completed_at: string | null
          correct_answers: number | null
          created_at: string | null
          duration_seconds: number | null
          id: string
          score_percentage: number | null
          test_type: string
          total_questions: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          score_percentage?: number | null
          test_type: string
          total_questions?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          score_percentage?: number | null
          test_type?: string
          total_questions?: number | null
          user_id?: string
        }
        Relationships: []
      }
      vocabulary_words: {
        Row: {
          created_at: string | null
          definition: string
          english_translation: string
          hebrew_word: string
          id: string
          transliteration: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          definition: string
          english_translation: string
          hebrew_word: string
          id?: string
          transliteration?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          definition?: string
          english_translation?: string
          hebrew_word?: string
          id?: string
          transliteration?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      word_definitions: {
        Row: {
          created_at: string | null
          definition: string
          examples: Json | null
          forms: Json | null
          id: string
          notes: string | null
          short_english: string
          transliteration: string
          updated_at: string | null
          word: string
          word_with_vowels: string
        }
        Insert: {
          created_at?: string | null
          definition: string
          examples?: Json | null
          forms?: Json | null
          id?: string
          notes?: string | null
          short_english: string
          transliteration?: string
          updated_at?: string | null
          word: string
          word_with_vowels: string
        }
        Update: {
          created_at?: string | null
          definition?: string
          examples?: Json | null
          forms?: Json | null
          id?: string
          notes?: string | null
          short_english?: string
          transliteration?: string
          updated_at?: string | null
          word?: string
          word_with_vowels?: string
        }
        Relationships: []
      }
      word_statistics: {
        Row: {
          confidence_score: number | null
          consecutive_correct: number | null
          correct_count: number | null
          created_at: string | null
          id: string
          incorrect_count: number | null
          last_tested: string | null
          total_attempts: number | null
          updated_at: string | null
          user_id: string
          word_id: string
        }
        Insert: {
          confidence_score?: number | null
          consecutive_correct?: number | null
          correct_count?: number | null
          created_at?: string | null
          id?: string
          incorrect_count?: number | null
          last_tested?: string | null
          total_attempts?: number | null
          updated_at?: string | null
          user_id: string
          word_id: string
        }
        Update: {
          confidence_score?: number | null
          consecutive_correct?: number | null
          correct_count?: number | null
          created_at?: string | null
          id?: string
          incorrect_count?: number | null
          last_tested?: string | null
          total_attempts?: number | null
          updated_at?: string | null
          user_id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "word_statistics_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_words"
            referencedColumns: ["id"]
          },
        ]
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
    Enums: {},
  },
} as const

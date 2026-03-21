export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      ad_network_policies: {
        Row: {
          id: string;
          network_name: string;
          tier_name: string;
          strategy_name: string;
          strategy_description: string | null;
          display_cpm: number;
          video_cpm: number;
          display_fill_rate: number;
          video_fill_rate: number;
          refresh_interval_seconds: number;
          revenue_share_percent: number;
          min_monthly_pageviews: number;
          min_requirements_notes: string | null;
          source_url: string | null;
          cpm_source_url: string | null;
          ad_slots_per_page: number;
          viewability_rate: number;
          engagement_factor: number;
          policy_compliance_factor: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          network_name: string;
          tier_name: string;
          strategy_name: string;
          strategy_description?: string | null;
          display_cpm: number;
          video_cpm: number;
          display_fill_rate: number;
          video_fill_rate: number;
          refresh_interval_seconds: number;
          revenue_share_percent: number;
          min_monthly_pageviews?: number;
          min_requirements_notes?: string | null;
          source_url?: string | null;
          cpm_source_url?: string | null;
          ad_slots_per_page?: number;
          viewability_rate?: number;
          engagement_factor?: number;
          policy_compliance_factor?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          network_name?: string;
          tier_name?: string;
          strategy_name?: string;
          strategy_description?: string | null;
          display_cpm?: number;
          video_cpm?: number;
          display_fill_rate?: number;
          video_fill_rate?: number;
          refresh_interval_seconds?: number;
          revenue_share_percent?: number;
          min_monthly_pageviews?: number;
          min_requirements_notes?: string | null;
          source_url?: string | null;
          cpm_source_url?: string | null;
          ad_slots_per_page?: number;
          viewability_rate?: number;
          engagement_factor?: number;
          policy_compliance_factor?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bookmark_folders: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          parent_folder_id: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          parent_folder_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          parent_folder_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "bookmark_folders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookmark_folders_parent_folder_id_fkey";
            columns: ["parent_folder_id"];
            isOneToOne: false;
            referencedRelation: "bookmark_folders";
            referencedColumns: ["id"];
          },
        ];
      };
      bookmarks: {
        Row: {
          id: string;
          user_id: string;
          folder_id: string | null;
          name: string;
          hebrew_text: string;
          source: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          folder_id?: string | null;
          name: string;
          hebrew_text: string;
          source?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          folder_id?: string | null;
          name?: string;
          hebrew_text?: string;
          source?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "bookmarks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookmarks_folder_id_fkey";
            columns: ["folder_id"];
            isOneToOne: false;
            referencedRelation: "bookmark_folders";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_submissions: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          email: string;
          message_type: string;
          message: string;
          status: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          email: string;
          message_type: string;
          message: string;
          status?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          email?: string;
          message_type?: string;
          message?: string;
          status?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contact_submissions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      gemini_api_rate_limits: {
        Row: {
          id: string;
          user_id: string;
          request_type: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          request_type: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          request_type?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gemini_api_rate_limits_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      page_views_daily: {
        Row: {
          id: string;
          page: string;
          view_date: string;
          view_count: number;
          total_active_seconds: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          page: string;
          view_date: string;
          view_count?: number;
          total_active_seconds?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          page?: string;
          view_date?: string;
          view_count?: number;
          total_active_seconds?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      sefaria_cache: {
        Row: {
          id: string;
          reference: string;
          content: Json;
          cached_at: string | null;
          last_accessed: string | null;
          access_count: number | null;
          created_at: string | null;
          translation: string | null;
          version_title: string | null;
          version_source: string | null;
          license: string | null;
          short_version_title: string | null;
        };
        Insert: {
          id?: string;
          reference: string;
          content: Json;
          cached_at?: string | null;
          last_accessed?: string | null;
          access_count?: number | null;
          created_at?: string | null;
          translation?: string | null;
          version_title?: string | null;
          version_source?: string | null;
          license?: string | null;
          short_version_title?: string | null;
        };
        Update: {
          id?: string;
          reference?: string;
          content?: Json;
          cached_at?: string | null;
          last_accessed?: string | null;
          access_count?: number | null;
          created_at?: string | null;
          translation?: string | null;
          version_title?: string | null;
          version_source?: string | null;
          license?: string | null;
          short_version_title?: string | null;
        };
        Relationships: [];
      };
      test_responses: {
        Row: {
          id: string;
          test_id: string;
          user_id: string;
          word_id: string;
          user_answer: string;
          correct_answer: string;
          is_correct: boolean | null;
          response_time_seconds: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          test_id: string;
          user_id: string;
          word_id: string;
          user_answer: string;
          correct_answer: string;
          is_correct?: boolean | null;
          response_time_seconds?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          test_id?: string;
          user_id?: string;
          word_id?: string;
          user_answer?: string;
          correct_answer?: string;
          is_correct?: boolean | null;
          response_time_seconds?: number | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "test_responses_test_id_fkey";
            columns: ["test_id"];
            isOneToOne: false;
            referencedRelation: "user_tests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "test_responses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "test_responses_word_id_fkey";
            columns: ["word_id"];
            isOneToOne: false;
            referencedRelation: "vocabulary_words";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "test_responses_word_id_fkey";
            columns: ["word_id"];
            isOneToOne: false;
            referencedRelation: "vocabulary_with_stats";
            referencedColumns: ["id"];
          },
        ];
      };
      translation_cache: {
        Row: {
          id: string;
          content_hash: string;
          hebrew_text: string;
          translation: string;
          text_length: number;
          cached_at: string | null;
          last_accessed: string | null;
          access_count: number | null;
        };
        Insert: {
          id?: string;
          content_hash: string;
          hebrew_text: string;
          translation: string;
          text_length: number;
          cached_at?: string | null;
          last_accessed?: string | null;
          access_count?: number | null;
        };
        Update: {
          id?: string;
          content_hash?: string;
          hebrew_text?: string;
          translation?: string;
          text_length?: number;
          cached_at?: string | null;
          last_accessed?: string | null;
          access_count?: number | null;
        };
        Relationships: [];
      };
      url_extraction_cache: {
        Row: {
          id: string;
          url: string;
          extracted_text: string;
          cached_at: string | null;
          last_accessed: string | null;
          access_count: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          url: string;
          extracted_text: string;
          cached_at?: string | null;
          last_accessed?: string | null;
          access_count?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          url?: string;
          extracted_text?: string;
          cached_at?: string | null;
          last_accessed?: string | null;
          access_count?: number | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      user_tests: {
        Row: {
          id: string;
          user_id: string;
          test_type: string;
          total_questions: number | null;
          correct_answers: number | null;
          score_percentage: number | null;
          duration_seconds: number | null;
          completed_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          test_type: string;
          total_questions?: number | null;
          correct_answers?: number | null;
          score_percentage?: number | null;
          duration_seconds?: number | null;
          completed_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          test_type?: string;
          total_questions?: number | null;
          correct_answers?: number | null;
          score_percentage?: number | null;
          duration_seconds?: number | null;
          completed_at?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_tests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_word_definitions: {
        Row: {
          id: string;
          user_id: string;
          word: string;
          definition: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          word: string;
          definition: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          word?: string;
          definition?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_word_definitions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      vocabulary_words: {
        Row: {
          id: string;
          user_id: string;
          hebrew_word: string;
          english_translation: string;
          definition: string;
          transliteration: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          hebrew_word: string;
          english_translation: string;
          definition: string;
          transliteration?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          hebrew_word?: string;
          english_translation?: string;
          definition?: string;
          transliteration?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "vocabulary_words_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      word_definitions: {
        Row: {
          id: string;
          word: string;
          word_with_vowels: string;
          definition: string;
          transliteration: string;
          examples: Json | null;
          notes: string | null;
          forms: Json | null;
          short_english: string;
          created_at: string | null;
          updated_at: string | null;
          last_accessed: string | null;
          access_count: number | null;
        };
        Insert: {
          id?: string;
          word: string;
          word_with_vowels: string;
          definition: string;
          transliteration?: string;
          examples?: Json | null;
          notes?: string | null;
          forms?: Json | null;
          short_english: string;
          created_at?: string | null;
          updated_at?: string | null;
          last_accessed?: string | null;
          access_count?: number | null;
        };
        Update: {
          id?: string;
          word?: string;
          word_with_vowels?: string;
          definition?: string;
          transliteration?: string;
          examples?: Json | null;
          notes?: string | null;
          forms?: Json | null;
          short_english?: string;
          created_at?: string | null;
          updated_at?: string | null;
          last_accessed?: string | null;
          access_count?: number | null;
        };
        Relationships: [];
      };
      word_statistics: {
        Row: {
          id: string;
          user_id: string;
          word_id: string;
          correct_count: number | null;
          incorrect_count: number | null;
          total_attempts: number | null;
          consecutive_correct: number | null;
          last_tested: string | null;
          confidence_score: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          word_id: string;
          correct_count?: number | null;
          incorrect_count?: number | null;
          total_attempts?: number | null;
          consecutive_correct?: number | null;
          last_tested?: string | null;
          confidence_score?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          word_id?: string;
          correct_count?: number | null;
          incorrect_count?: number | null;
          total_attempts?: number | null;
          consecutive_correct?: number | null;
          last_tested?: string | null;
          confidence_score?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "word_statistics_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "word_statistics_word_id_fkey";
            columns: ["word_id"];
            isOneToOne: false;
            referencedRelation: "vocabulary_words";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "word_statistics_word_id_fkey";
            columns: ["word_id"];
            isOneToOne: false;
            referencedRelation: "vocabulary_with_stats";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      vocabulary_with_stats: {
        Row: {
          id: string | null;
          user_id: string | null;
          hebrew_word: string | null;
          english_translation: string | null;
          definition: string | null;
          transliteration: string | null;
          created_at: string | null;
          updated_at: string | null;
          stats_id: string | null;
          correct_count: number | null;
          incorrect_count: number | null;
          total_attempts: number | null;
          consecutive_correct: number | null;
          last_tested: string | null;
          confidence_score: number | null;
          stats_created_at: string | null;
          stats_updated_at: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      cleanup_gemini_api_rate_limits: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      cleanup_sefaria_cache: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      cleanup_translation_cache: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      cleanup_word_definitions_cache: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      delete_user_account: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      increment_translation_access: {
        Args: {
          cache_id: string;
        };
        Returns: undefined;
      };
      save_complete_test_results: {
        Args: {
          p_user_id: string;
          p_test_type: string;
          p_total_questions: number;
          p_correct_answers: number;
          p_score_percentage: number;
          p_duration_seconds: number;
          p_responses: Json;
          p_statistics: Json;
        };
        Returns: string;
      };
      select_test_words: {
        Args: {
          p_user_id: string;
          p_limit: number;
        };
        Returns: {
          id: string;
          user_id: string;
          hebrew_word: string;
          english_translation: string;
          definition: string;
          transliteration: string;
          created_at: string;
          updated_at: string;
          stats: Json;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

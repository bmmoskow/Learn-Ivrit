import { createClient, processLock } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Per-tab auth lock (same as supabase/client.ts) so a stuck/background tab can't
// block getSession() in another tab via the default cross-tab Web Lock.
// NOTE: this is a SECOND browser client for the same project (used by Admin /
// Contact). Collapsing it into the single supabase/client.ts instance is the
// right long-term cleanup, but that needs supabase/types.ts regenerated first
// (it's currently missing tables like admin_alerts / monthly_spend_tracking).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { lock: processLock },
});

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
};

export type VocabularyWord = {
  id: string;
  user_id: string;
  hebrew_word: string;
  english_translation: string;
  definition: string;
  transliteration: string | null;
  created_at: string;
  updated_at: string;
};

export type WordStatistics = {
  id: string;
  user_id: string;
  word_id: string;
  correct_count: number;
  incorrect_count: number;
  total_attempts: number;
  consecutive_correct: number;
  last_tested: string | null;
  confidence_score: number;
  created_at: string;
  updated_at: string;
};

export type UserTest = {
  id: string;
  user_id: string;
  test_type: string;
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  duration_seconds: number | null;
  completed_at: string;
  created_at: string;
};

export type TestResponse = {
  id: string;
  test_id: string;
  user_id: string;
  word_id: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  response_time_seconds: number | null;
  created_at: string;
};

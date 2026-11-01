import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/lib/supabase';
import { createTestUser, cleanupTestUser, TEST_USER_PASSWORD } from '@/test/testUser';

// REAL-backend RLS-isolation contract test for the test-taking tables
// (`word_statistics`, `user_tests`, `test_responses`). The VocabularyList suite
// already proves isolation for `vocabulary_words`; this is the same model
// applied to the remaining user-owned tables (priority 4): user A writes a row
// in each, then a brand-new user B must see NONE of them on an UNFILTERED read —
// RLS alone, with no user_id filter, is what hides them. These talk to the DB
// directly (the helper's `@/lib/supabase` client) because the property under
// test is the database policy, not any app hook.
describe('Test-taking tables RLS isolation (real backend)', () => {
  let userAId: string;
  let userAEmail: string;

  beforeEach(async () => {
    const userA = await createTestUser('rls-a');
    userAId = userA.userId;
    userAEmail = userA.email;
  });

  afterEach(async () => {
    await cleanupTestUser(userAId);
  });

  it("does not expose another user's word_statistics, user_tests, or test_responses", async () => {
    // As user A: a vocab word (FK target) + a row in each test-taking table.
    const { data: word, error: wordErr } = await supabase
      .from('vocabulary_words')
      .insert({
        user_id: userAId,
        hebrew_word: 'לֶחֶם',
        english_translation: 'bread',
        definition: 'bread',
      })
      .select()
      .single();
    expect(wordErr).toBeNull();
    const wordId = word!.id;

    const { data: test, error: testErr } = await supabase
      .from('user_tests')
      .insert({
        user_id: userAId,
        test_type: 'multiple_choice',
        total_questions: 1,
        correct_answers: 1,
        score_percentage: 100,
        duration_seconds: 5,
      })
      .select()
      .single();
    expect(testErr).toBeNull();
    const testId = test!.id;

    const { error: statsErr } = await supabase.from('word_statistics').insert({
      user_id: userAId,
      word_id: wordId,
      correct_count: 1,
      incorrect_count: 0,
      total_attempts: 1,
      consecutive_correct: 1,
      confidence_score: 80,
    });
    expect(statsErr).toBeNull();

    const { error: respErr } = await supabase.from('test_responses').insert({
      test_id: testId,
      user_id: userAId,
      word_id: wordId,
      user_answer: 'bread',
      correct_answer: 'bread',
      is_correct: true,
      response_time_seconds: 3,
    });
    expect(respErr).toBeNull();

    // Switch to a brand-new user B (own unique identity; now signed in as B).
    const userB = await createTestUser('rls-b');

    // As B, read each table WITHOUT a user_id filter — RLS alone must hide A's
    // rows. (Filtering by user_id would pass even with RLS off, so the
    // unfiltered read is what actually proves cross-user isolation.)
    const statsRead = await supabase.from('word_statistics').select('*');
    expect(statsRead.error).toBeNull();
    expect(statsRead.data).toEqual([]);

    const testsRead = await supabase.from('user_tests').select('*');
    expect(testsRead.error).toBeNull();
    expect(testsRead.data).toEqual([]);

    const responsesRead = await supabase.from('test_responses').select('*');
    expect(responsesRead.error).toBeNull();
    expect(responsesRead.data).toEqual([]);

    // Tear down B, then sign back in as A so afterEach can remove A's rows
    // (A's rows can't be deleted while signed in as B — RLS blocks it).
    await cleanupTestUser(userB.userId);
    await supabase.auth.signInWithPassword({ email: userAEmail, password: TEST_USER_PASSWORD });
  });
});

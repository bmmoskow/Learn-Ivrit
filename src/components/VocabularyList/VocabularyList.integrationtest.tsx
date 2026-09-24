import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { VocabularyList } from './VocabularyList';
import { supabase } from '@/lib/supabase';
import { AuthProvider } from '@/contexts/AuthContext/AuthContext';

describe('VocabularyList Integration Tests', () => {
  let testUserId: string;

  beforeEach(async () => {
    const testEmail = `test-vocab-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (error) {
      console.error('Setup error:', error);
      throw error;
    }

    testUserId = data.user?.id || '';
  });

  afterEach(async () => {
    try {
      if (testUserId) {
        await supabase.from('vocabulary_words').delete().eq('user_id', testUserId);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  it('should render vocabulary list', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <VocabularyList />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { name: /my vocabulary/i })).toBeInTheDocument();
  });

  it('should fetch vocabulary from Supabase', async () => {
    const testWord = {
      user_id: testUserId,
      hebrew_word: 'שָׁלוֹם',
      english_translation: 'peace',
      definition: 'A common greeting meaning peace, hello, or goodbye.',
    };

    const { error: insertError } = await supabase
      .from('vocabulary_words')
      .insert(testWord);

    expect(insertError).toBeNull();

    const { data, error } = await supabase
      .from('vocabulary_words')
      .select('*')
      .eq('user_id', testUserId);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.length).toBeGreaterThan(0);
    expect(data?.[0].hebrew_word).toBe('שָׁלוֹם');
  });

  it('should add vocabulary to Supabase', async () => {
    const newWord = {
      user_id: testUserId,
      hebrew_word: 'תּוֹרָה',
      english_translation: 'Torah, teaching',
      definition: 'The Torah; instruction or teaching.',
    };

    const { data, error } = await supabase
      .from('vocabulary_words')
      .insert(newWord)
      .select();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.[0].hebrew_word).toBe('תּוֹרָה');
  });

  it('should update vocabulary in Supabase', async () => {
    const testWord = {
      user_id: testUserId,
      hebrew_word: 'אֱלֹהִים',
      english_translation: 'God',
      definition: 'God; the divine.',
    };

    const { data: insertData, error: insertError } = await supabase
      .from('vocabulary_words')
      .insert(testWord)
      .select();

    expect(insertError).toBeNull();
    const wordId = insertData?.[0].id;

    const { error: updateError } = await supabase
      .from('vocabulary_words')
      .update({ english_translation: 'God, gods' })
      .eq('id', wordId);

    expect(updateError).toBeNull();

    const { data: updatedData } = await supabase
      .from('vocabulary_words')
      .select('*')
      .eq('id', wordId)
      .single();

    expect(updatedData?.english_translation).toBe('God, gods');
  });

  it('should delete vocabulary from Supabase', async () => {
    const testWord = {
      user_id: testUserId,
      hebrew_word: 'מֶלֶךְ',
      english_translation: 'king',
      definition: 'A king or monarch.',
    };

    const { data: insertData, error: insertError } = await supabase
      .from('vocabulary_words')
      .insert(testWord)
      .select();

    expect(insertError).toBeNull();
    const wordId = insertData?.[0].id;

    const { error: deleteError } = await supabase
      .from('vocabulary_words')
      .delete()
      .eq('id', wordId);

    expect(deleteError).toBeNull();

    const { data: deletedData } = await supabase
      .from('vocabulary_words')
      .select('*')
      .eq('id', wordId);

    expect(deletedData?.length).toBe(0);
  });

  it('should verify RLS policies are enforced', async () => {
    await supabase.auth.signOut();

    const { data } = await supabase
      .from('vocabulary_words')
      .select('*');

    expect(data).toEqual([]);
  });
});

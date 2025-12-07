import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext/AuthContext";
import { supabase } from "../../../supabase/client";
import { generateBasicHebrewForms } from "../../utils/hebrewForms";
import { requestDeduplicator, createRequestKey } from "../../utils/requestDeduplicator";
import {
  Definition,
  romanizeHebrew,
  mapCachedDataToDefinition,
  mapApiResponseToDefinition,
} from "./wordDefinitionPopupUtils";

export interface UseWordDefinitionPopupProps {
  word: string;
  onWordSaved: () => void;
}

export interface UseWordDefinitionPopupReturn {
  currentWord: string;
  definition: Definition | null;
  loading: boolean;
  saving: boolean;
  saved: boolean;
  error: string;
  isGuest: boolean;
  setCurrentWord: (word: string) => void;
  handleRefresh: () => void;
  saveToVocabulary: () => Promise<void>;
}

export function useWordDefinitionPopup({
  word,
  onWordSaved,
}: UseWordDefinitionPopupProps): UseWordDefinitionPopupReturn {
  const { user, isGuest } = useAuth();

  const [currentWord, setCurrentWord] = useState(word.trim());
  const [definition, setDefinition] = useState<Definition | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [forceRefresh, setForceRefresh] = useState(false);

  const checkIfSaved = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from("vocabulary_words")
      .select("id")
      .eq("user_id", user.id)
      .eq("hebrew_word", currentWord)
      .maybeSingle();

    setSaved(!!data);
  }, [user, currentWord]);

  const fetchDefinition = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const requestKey = createRequestKey("define-word", { word: currentWord, forceRefresh });

      const { data, shortEnglish } = await requestDeduplicator.dedupe(requestKey, async () => {
        let data;
        let shortEnglish = "No translation";

        if (!forceRefresh) {
          const { data: cachedData } = await supabase
            .from("word_definitions")
            .select(
              "word, word_with_vowels, definition, transliteration, examples, notes, forms, short_english, access_count"
            )
            .eq("word", currentWord)
            .maybeSingle();

          if (cachedData) {
            const mapped = mapCachedDataToDefinition(cachedData);
            data = mapped.data;
            shortEnglish = mapped.shortEnglish;

            supabase
              .from("word_definitions")
              .update({
                last_accessed: new Date().toISOString(),
                access_count: (cachedData.access_count || 0) + 1,
              })
              .eq("word", currentWord)
              .then(() => {});
          }
        }

        if (!data) {
          const apiUrl = `https://igqupnhtbulncgokwbhe.supabase.co/functions/v1/gemini-translate/define`;

          const {
            data: { session },
          } = await supabase.auth.getSession();

          const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              word: currentWord,
              targetLanguage: "Hebrew",
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 429) {
              throw new Error(errorData.error || "Rate limit exceeded. Please try again later.");
            }
            throw new Error(errorData.error || "Failed to fetch definition");
          }

          const apiData = await response.json();
          const mapped = mapApiResponseToDefinition(apiData);
          data = mapped.data;
          shortEnglish = mapped.shortEnglish;

          if (forceRefresh) {
            setForceRefresh(false);
          }
        }

        return { data, shortEnglish };
      });

      let relatedWords = (data.forms || []).map((form: any) => ({
        hebrew: form.hebrew,
        english: form.transliteration,
        relationship: form.relationship,
      }));

      if (relatedWords.length === 0) {
        const basicForms = generateBasicHebrewForms(
          data.wordWithVowels || currentWord,
          data.transliteration || romanizeHebrew(currentWord)
        );
        relatedWords = basicForms;
      }

      setDefinition({
        translation: currentWord,
        definition: data.definition || "No definition available",
        transliteration: data.transliteration || romanizeHebrew(currentWord),
        wordWithVowels: data.wordWithVowels || currentWord,
        examples: data.examples || [],
        notes: data.notes || "",
        relatedWords,
        shortEnglish,
      });
    } catch (err: any) {
      setError(err.message || "Failed to load definition");
      console.error("Definition error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentWord, forceRefresh]);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchDefinition(), checkIfSaved()]);
    };
    loadData();
  }, [fetchDefinition, checkIfSaved]);

  const handleRefresh = useCallback(() => {
    setForceRefresh(true);
  }, []);

  const saveToVocabulary = useCallback(async () => {
    if (!user || !definition || saved) return;

    setSaving(true);
    setError("");

    try {
      const { data: wordData, error: insertError } = await supabase
        .from("vocabulary_words")
        .insert({
          user_id: user.id,
          hebrew_word: currentWord,
          english_translation: definition.shortEnglish || definition.definition.split(".")[0].trim(),
          definition: definition.definition,
          transliteration: definition.transliteration,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      supabase
        .from("word_statistics")
        .insert({
          user_id: user.id,
          word_id: wordData.id,
          correct_count: 0,
          incorrect_count: 0,
          total_attempts: 0,
          consecutive_correct: 0,
          confidence_score: 0,
        })
        .then(() => {});

      setSaved(true);
      onWordSaved();
    } catch (err: any) {
      if (err.code === "23505") {
        setError("Word already in vocabulary");
        setSaved(true);
      } else {
        setError("Failed to save word");
        console.error("Save error:", err);
      }
    } finally {
      setSaving(false);
    }
  }, [user, definition, saved, currentWord, onWordSaved]);

  return {
    currentWord,
    definition,
    loading,
    saving,
    saved,
    error,
    isGuest,
    setCurrentWord,
    handleRefresh,
    saveToVocabulary,
  };
}

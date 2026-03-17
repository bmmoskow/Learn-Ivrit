import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../../contexts/AuthContext/AuthContext";
import { supabase } from "../../../../supabase/client";
import { generateBasicHebrewForms } from "../../../utils/hebrewForms/hebrewFormsUtils";
import { requestDeduplicator, createRequestKey } from "../../../utils/requestDeduplicator/requestDeduplicator";
import { notifyNewTransaction, clearLastTransaction } from "../../Admin/useLastTransaction";
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
  hasValidDefinition: boolean;
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
  const forceRefreshRef = useRef(false);

  const checkIfSaved = useCallback(
    async (wordToCheck?: string) => {
      if (!user) return;

      const checkWord = wordToCheck || currentWord;
      const { data } = await supabase
        .from("vocabulary_words")
        .select("id")
        .eq("user_id", user.id)
        .eq("hebrew_word", checkWord)
        .maybeSingle();

      setSaved(!!data);
    },
    [user, currentWord],
  );

  const fetchDefinition = useCallback(async () => {
    setLoading(true);
    setError("");
    clearLastTransaction();

    try {
      const isForceRefresh = forceRefreshRef.current;
      const requestKey = createRequestKey("define-word", { word: currentWord, forceRefresh: isForceRefresh });

      const { data, shortEnglish } = await requestDeduplicator.dedupe(requestKey, async () => {
        let data;
        let shortEnglish = "No translation";

        if (!isForceRefresh) {
          const { data: cachedData } = await supabase
            .from("word_definitions")
            .select(
              "word, word_with_vowels, definition, transliteration, examples, notes, forms, short_english, access_count",
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

            // Log cache hit to api_usage_logs
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase as any).from("api_usage_logs").insert({
               user_id: user?.id || "guest-user",
               request_type: "define",
               endpoint: "/define",
               prompt_tokens: 0,
               candidates_tokens: 0,
               thinking_tokens: 0,
               cache_hit: true,
               model: "cache",
             }).then(() => { notifyNewTransaction(); });
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

          forceRefreshRef.current = false;
          notifyNewTransaction();
        }

        return { data, shortEnglish };
      });

      const dataObj = data as {
        forms?: Array<{ hebrew: string; transliteration: string; relationship: string }>;
        wordWithVowels?: string;
        transliteration?: string;
        definition?: string;
        examples?: Array<{ hebrew: string; english: string }>;
        notes?: string;
      };

      let relatedWords: Array<{ hebrew: string; english: string; relationship: string }> = (dataObj.forms || []).map(
        (form) => ({
          hebrew: form.hebrew,
          english: form.transliteration,
          relationship: form.relationship,
        }),
      );

      if (relatedWords.length === 0) {
        const basicForms = generateBasicHebrewForms(
          dataObj.wordWithVowels || currentWord,
          dataObj.transliteration || romanizeHebrew(currentWord),
        );
        relatedWords = basicForms.map((form) => ({
          hebrew: form.hebrew,
          english: form.transliteration,
          relationship: form.relationship,
        }));
      }

      const newDefinition: Definition = {
        translation: currentWord,
        definition: dataObj.definition || "No definition available",
        transliteration: dataObj.transliteration || romanizeHebrew(currentWord),
        wordWithVowels: dataObj.wordWithVowels || currentWord,
        examples: dataObj.examples || [],
        notes: dataObj.notes || "",
        relatedWords,
        shortEnglish,
      };

      setDefinition(newDefinition);

      if (user) {
        checkIfSaved(newDefinition.wordWithVowels);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load definition");
      console.error("Definition error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentWord, user, checkIfSaved]);

  useEffect(() => {
    fetchDefinition();
  }, [fetchDefinition]);

  const handleRefresh = useCallback(() => {
    forceRefreshRef.current = true;
    fetchDefinition();
  }, [fetchDefinition]);

  const hasValidDefinition = !!(definition &&
    definition.definition &&
    definition.definition.trim() !== "" &&
    definition.shortEnglish !== "Translation unavailable");

  const saveToVocabulary = useCallback(async () => {
    if (!user || !definition || saved) return;

    // Prevent saving words with invalid definitions
    if (!hasValidDefinition) {
      setError("Cannot save word without a valid definition");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { data: wordData, error: insertError } = await supabase
        .from("vocabulary_words")
        .insert({
          user_id: user.id,
          hebrew_word: definition.wordWithVowels || currentWord,
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
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "23505") {
        setError("Word already in vocabulary");
        setSaved(true);
      } else {
        setError("Failed to save word");
        console.error("Save error:", err);
      }
    } finally {
      setSaving(false);
    }
  }, [user, definition, saved, hasValidDefinition, currentWord, onWordSaved]);

  return {
    currentWord,
    definition,
    loading,
    saving,
    saved,
    error,
    isGuest,
    hasValidDefinition,
    setCurrentWord,
    handleRefresh,
    saveToVocabulary,
  };
}

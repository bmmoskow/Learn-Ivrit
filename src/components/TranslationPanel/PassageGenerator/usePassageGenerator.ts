import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext/AuthContext";
import { supabase } from "../../../../supabase/client";
import { getAuthHeader } from "@/utils/auth/getAuthHeader";
import {
  AgeLevel,
  VocabularyWord,
  sortVocabularyByWeakness,
  buildPassagePrompt,
  validateTopic,
} from "./passageGeneratorUtils";

export interface UsePassageGeneratorState {
  ageLevel: AgeLevel;
  topic: string;
  isGenerating: boolean;
  generatedPassage: string | null;
  error: string | null;
  isOpen: boolean;
}

export interface UsePassageGeneratorActions {
  setAgeLevel: (level: AgeLevel) => void;
  setTopic: (topic: string) => void;
  generatePassage: () => Promise<void>;
  clearPassage: () => void;
  openGenerator: () => void;
  closeGenerator: () => void;
}

export type UsePassageGeneratorReturn = UsePassageGeneratorState & UsePassageGeneratorActions;

export function usePassageGenerator(
  onPassageGenerated: (passage: string) => void
): UsePassageGeneratorReturn {
  const { user, isGuest } = useAuth();
  const [ageLevel, setAgeLevel] = useState<AgeLevel>(12);
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPassage, setGeneratedPassage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openGenerator = useCallback(() => {
    setIsOpen(true);
    setError(null);
  }, []);

  const closeGenerator = useCallback(() => {
    setIsOpen(false);
    setError(null);
  }, []);

  const clearPassage = useCallback(() => {
    setGeneratedPassage(null);
    setError(null);
  }, []);

  const generatePassage = useCallback(async () => {
    if (!user && !isGuest) {
      setError("You must be logged in or use guest mode to generate passages");
      return;
    }

    // Validate topic
    const validation = validateTopic(topic);
    if (!validation.valid) {
      setError(validation.error || "Invalid topic");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedPassage(null);

    try {
      let sortedVocabulary: VocabularyWord[] = [];

      // Only fetch vocabulary for authenticated users
      if (user) {
        const { data: vocabData, error: vocabError } = await supabase
          .from("vocabulary_with_stats")
          .select("id, hebrew_word, english_translation, confidence_score, incorrect_count, total_attempts")
          .eq("user_id", user.id)
          .limit(100);

        if (vocabError) {
          console.error("Error fetching vocabulary:", vocabError);
          // Don't throw - guests won't have vocabulary, just proceed without it
        }

        if (vocabData && vocabData.length > 0) {
          const vocabulary: VocabularyWord[] = vocabData
            .filter((w): w is typeof w & { id: string; hebrew_word: string; english_translation: string } =>
              w.id !== null && w.hebrew_word !== null && w.english_translation !== null
            )
            .map((w) => ({
              id: w.id,
              hebrew_word: w.hebrew_word,
              english_translation: w.english_translation,
              confidence_score: w.confidence_score,
              incorrect_count: w.incorrect_count,
              total_attempts: w.total_attempts,
            }));

          sortedVocabulary = sortVocabularyByWeakness(vocabulary);
        }
      }

      // Build the prompt (works with empty vocabulary for guests)
      const prompt = buildPassagePrompt(ageLevel, topic, sortedVocabulary);

      const authHeader = await getAuthHeader();

      // Call the edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-hebrew-passage`,
        {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          throw new Error(errorData.error || "Rate limit exceeded. Please try again later.");
        }
        throw new Error(errorData.error || "Failed to generate passage");
      }

      const data = await response.json();
      const passage = data.passage;

      if (!passage) {
        throw new Error("No passage was generated");
      }

      setGeneratedPassage(passage);
      onPassageGenerated(passage);
      setIsOpen(false);
      setTopic("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate passage";
      setError(message);
      console.error("Passage generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  }, [user, isGuest, topic, ageLevel, onPassageGenerated]);

  return {
    ageLevel,
    topic,
    isGenerating,
    generatedPassage,
    error,
    isOpen,
    setAgeLevel,
    setTopic,
    generatePassage,
    clearPassage,
    openGenerator,
    closeGenerator,
  };
}

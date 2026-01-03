import { Tables } from "@/integrations/supabase/types";

export type AgeLevel = number | "adult" | "professional" | "academic";

export interface VocabularyWord {
  id: string;
  hebrew_word: string;
  english_translation: string;
  confidence_score: number | null;
  incorrect_count: number | null;
  total_attempts: number | null;
}

export interface SpecialAgeLevelOption {
  value: "adult" | "professional" | "academic";
  label: string;
  description: string;
}

export const MIN_AGE = 5;
export const MAX_NUMERIC_AGE = 22;

export const SPECIAL_AGE_LEVELS: SpecialAgeLevelOption[] = [
  { value: "adult", label: "Adult", description: "General adult content" },
  { value: "professional", label: "Professional", description: "Business/technical context" },
  { value: "academic", label: "Academic", description: "Scholarly, formal register" },
];

/**
 * Calculate a weakness score for sorting vocabulary.
 * Higher score = weaker word (should be prioritized).
 */
export function calculateWeaknessScore(word: VocabularyWord): number {
  const confidence = word.confidence_score ?? 0;
  const incorrectCount = word.incorrect_count ?? 0;
  const totalAttempts = word.total_attempts ?? 0;

  // Words never tested get highest priority (score of 100)
  if (totalAttempts === 0) {
    return 100;
  }

  // Calculate error rate (0-1)
  const errorRate = totalAttempts > 0 ? incorrectCount / totalAttempts : 0;

  // Combine factors: low confidence and high error rate = high weakness
  // Confidence is typically 0-100, so we invert it
  const weaknessScore = (100 - confidence) * 0.6 + errorRate * 100 * 0.4;

  return weaknessScore;
}

/**
 * Sort vocabulary by weakness (weakest first).
 */
export function sortVocabularyByWeakness(words: VocabularyWord[]): VocabularyWord[] {
  return [...words].sort((a, b) => calculateWeaknessScore(b) - calculateWeaknessScore(a));
}

/**
 * Get display label for age level.
 */
export function getAgeLevelLabel(ageLevel: AgeLevel): string {
  if (typeof ageLevel === "number") {
    return `Age ${ageLevel}`;
  }
  return SPECIAL_AGE_LEVELS.find((l) => l.value === ageLevel)?.label ?? String(ageLevel);
}

/**
 * Get the prompt-friendly age level description.
 */
export function getAgeLevelDescription(ageLevel: AgeLevel): string {
  if (typeof ageLevel === "number") {
    if (ageLevel <= 7) {
      return `a young child (age ${ageLevel}). Use very simple vocabulary, short sentences, and engaging topics like animals, colors, or family.`;
    }
    if (ageLevel <= 10) {
      return `a child (age ${ageLevel}). Use simple vocabulary, short sentences, and engaging topics like animals, family, or games.`;
    }
    if (ageLevel <= 13) {
      return `a pre-teen (age ${ageLevel}). Use moderate vocabulary with basic sentence structures and relatable topics.`;
    }
    if (ageLevel <= 16) {
      return `a teenager (age ${ageLevel}). Use moderate vocabulary complexity, relatable topics like school, friends, hobbies, or adventure.`;
    }
    if (ageLevel <= 19) {
      return `a late teen (age ${ageLevel}). Use more advanced vocabulary with complex grammatical structures and mature themes.`;
    }
    return `a young adult (age ${ageLevel}). Use sophisticated vocabulary suitable for young adults with varied topics.`;
  }

  switch (ageLevel) {
    case "adult":
      return "an adult learner. Use natural, full vocabulary with complex themes like news, philosophy, history, or daily life.";
    case "professional":
      return "a professional. Use formal vocabulary suitable for business, technical, or professional contexts.";
    case "academic":
      return "an academic reader. Use scholarly vocabulary with formal register, suitable for research or academic discourse.";
    default:
      return "an adult learner.";
  }
}

/**
 * Build the AI prompt for generating a Hebrew passage.
 */
export function buildPassagePrompt(
  ageLevel: AgeLevel,
  topic: string,
  vocabulary: VocabularyWord[]
): string {
  const ageLevelDesc = getAgeLevelDescription(ageLevel);
  const vocabList = vocabulary
    .slice(0, 30) // Limit to top 30 weakest words
    .map((w) => `${w.hebrew_word} (${w.english_translation})`)
    .join(", ");

  return `Write a Hebrew passage appropriate for ${ageLevelDesc}

Topic: ${topic}

Priority vocabulary (ordered by learning need, weakest first):
${vocabList}

Instructions:
1. Write a natural, coherent Hebrew passage of 100-200 words
2. Use the priority vocabulary words where they fit naturally
3. Include variations of the vocabulary words where appropriate:
   - Different conjugations (tense, gender, number)
   - Words from the same root (שורש)
   - Common derivations
   - With prefixes (ב, ל, ו, ה, מ, כ, ש)
   - With possessive suffixes (י, ך, ו, ה, נו, כם, הם, etc.)
4. Prioritize words earlier in the list, but do not force words that don't belong
5. Add full nikud (vowel points) to ALL Hebrew words
6. Write something coherent, engaging, and educational
7. Do NOT use any markdown formatting (no asterisks, no bold, no italics) - output plain Hebrew text only

Respond with ONLY the Hebrew passage, nothing else.`;
}

/**
 * Validate the topic input.
 */
export function validateTopic(topic: string): { valid: boolean; error?: string } {
  const trimmed = topic.trim();

  if (!trimmed) {
    return { valid: false, error: "Please enter a topic description" };
  }

  if (trimmed.length < 10) {
    return { valid: false, error: "Please provide more detail about the topic (at least 10 characters)" };
  }

  if (trimmed.length > 500) {
    return { valid: false, error: "Topic description is too long (max 500 characters)" };
  }

  return { valid: true };
}

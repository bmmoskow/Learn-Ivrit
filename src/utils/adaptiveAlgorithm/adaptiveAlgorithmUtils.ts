/**
 * Pure utility functions for adaptive learning algorithm.
 *
 * IMPORTANT: This file contains pure functions without external dependencies.
 * Keeping pure functions here allows unit testing without mocking.
 */

import { Tables } from "../../../supabase/types";

type VocabularyWord = Tables<"vocabulary_words">;
type WordStatistics = Tables<"word_statistics">;

export type WordWithStats = VocabularyWord & {
  statistics?: WordStatistics;
};

export interface WeightedWord {
  word: WordWithStats;
  weight: number;
}

export function calculateWeight(word: WordWithStats): number {
  if (!word.statistics || word.statistics.total_attempts === 0) {
    return 100;
  }

  const stats = word.statistics;

  const errorRate = (stats.total_attempts ?? 0) > 0 ? (stats.incorrect_count ?? 0) / (stats.total_attempts ?? 1) : 0;

  const isMastered = (stats.consecutive_correct ?? 0) >= 5;
  if (isMastered) {
    return 10;
  }

  const baseWeight = 100;
  const errorMultiplier = 1 + errorRate * 4;

  let recencyMultiplier = 1;
  if (stats.last_tested) {
    const daysSinceTest = (Date.now() - new Date(stats.last_tested).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceTest > 7) {
      recencyMultiplier = 1.5;
    } else if (daysSinceTest > 3) {
      recencyMultiplier = 1.2;
    }
  }

  const confidencePenalty = (100 - (stats.confidence_score ?? 0)) / 100;

  return baseWeight * errorMultiplier * recencyMultiplier * (1 + confidencePenalty);
}

export function createWeightedWords(words: WordWithStats[]): WeightedWord[] {
  return words.map((word) => ({
    word,
    weight: calculateWeight(word),
  }));
}

export function sortWeightedWordsByWeight(weightedWords: WeightedWord[]): WeightedWord[] {
  return [...weightedWords].sort((a, b) => b.weight - a.weight);
}

export function calculateTotalWeight(weightedWords: WeightedWord[]): number {
  return weightedWords.reduce((sum, w) => sum + w.weight, 0);
}

export function selectWeightedWordByRandom(
  weightedWords: WeightedWord[],
  totalWeight: number,
  randomValue: number
): number {
  const random = randomValue * totalWeight;
  let cumulative = 0;

  for (let j = 0; j < weightedWords.length; j++) {
    cumulative += weightedWords[j].weight;
    if (random <= cumulative) {
      return j;
    }
  }

  return 0;
}

export function selectTestWords(
  words: WordWithStats[],
  count: number,
  randomGenerator: () => number = Math.random
): WordWithStats[] {
  if (words.length === 0) return [];
  if (words.length <= count) return words;

  let weightedWords = createWeightedWords(words);
  weightedWords = sortWeightedWordsByWeight(weightedWords);

  const selected: WordWithStats[] = [];
  let totalWeight = calculateTotalWeight(weightedWords);

  for (let i = 0; i < count; i++) {
    if (weightedWords.length === 0) break;

    const selectedIndex = selectWeightedWordByRandom(weightedWords, totalWeight, randomGenerator());
    const { word } = weightedWords[selectedIndex];
    selected.push(word);

    weightedWords.splice(selectedIndex, 1);
    totalWeight = calculateTotalWeight(weightedWords);
  }

  return selected;
}

export function calculateConfidenceScore(stats: {
  correct_count: number;
  incorrect_count: number;
  total_attempts: number;
  consecutive_correct: number;
}): number {
  if (stats.total_attempts === 0) return 0;

  const correctRate = stats.correct_count / stats.total_attempts;

  let score = correctRate * 100;

  if (stats.consecutive_correct >= 5) {
    score = Math.min(100, score + 20);
  } else if (stats.consecutive_correct >= 3) {
    score = Math.min(100, score + 10);
  }

  if (stats.total_attempts < 5) {
    score *= 0.8;
  }

  return Math.max(0, Math.min(100, score));
}

export function shuffleArray<T>(array: T[], randomGenerator: () => number = Math.random): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(randomGenerator() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

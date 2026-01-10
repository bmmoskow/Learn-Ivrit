import type { Tables } from "../../../supabase/types";

export type VocabularyWord = Tables<"vocabulary_words">;
export type WordStatistics = Tables<"word_statistics">;

export interface VocabWithStats extends VocabularyWord {
  statistics?: WordStatistics;
}

export type SortBy = "date" | "alphabetical" | "performance";

export interface NewWordForm {
  hebrew_word: string;
  english_translation: string;
  definition: string;
  transliteration: string;
}

export interface EditForm {
  hebrew_word: string;
  english_translation: string;
  definition: string;
}

export const ITEMS_PER_PAGE = 50;

export function createGuestVocabWord(word: { hebrew: string; english: string }, index: number): VocabWithStats {
  const now = new Date().toISOString();
  return {
    id: `guest-${index}`,
    user_id: "guest",
    hebrew_word: word.hebrew,
    english_translation: word.english,
    definition: word.english,
    transliteration: null,
    created_at: now,
    updated_at: now,
    statistics: {
      id: `guest-stats-${index}`,
      user_id: "guest",
      word_id: `guest-${index}`,
      correct_count: 0,
      incorrect_count: 0,
      total_attempts: 0,
      consecutive_correct: 0,
      last_tested: null,
      confidence_score: 0,
      created_at: now,
      updated_at: now,
    },
  };
}

export const getPerformanceColor = (score: number): string => {
  if (score >= 80) return "bg-green-50 text-green-700 border-green-200";
  if (score >= 60) return "bg-yellow-50 text-yellow-700 border-yellow-200";
  return "bg-red-50 text-red-700 border-red-200";
};

export const getPerformanceIcon = (score: number): string => {
  if (score >= 80) return "🎯";
  if (score >= 60) return "📈";
  return "📉";
};

export const calculateTotalPages = (totalCount: number, itemsPerPage: number): number => {
  return Math.ceil(totalCount / itemsPerPage);
};

export const calculatePaginationRange = (currentPage: number, itemsPerPage: number): { from: number; to: number } => {
  const from = (currentPage - 1) * itemsPerPage;
  const to = from + itemsPerPage - 1;
  return { from, to };
};

export const calculateDisplayRange = (
  currentPage: number,
  itemsPerPage: number,
  totalCount: number,
): { start: number; end: number } => {
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalCount);
  return { start, end };
};

export const calculatePageNumbers = (currentPage: number, totalPages: number, maxVisible: number = 5): number[] => {
  const pages: number[] = [];
  const numPages = Math.min(maxVisible, totalPages);

  for (let i = 0; i < numPages; i++) {
    let pageNum: number;
    if (totalPages <= maxVisible) {
      pageNum = i + 1;
    } else if (currentPage <= 3) {
      pageNum = i + 1;
    } else if (currentPage >= totalPages - 2) {
      pageNum = totalPages - maxVisible + 1 + i;
    } else {
      pageNum = currentPage - 2 + i;
    }
    pages.push(pageNum);
  }

  return pages;
};

export const createEmptyNewWordForm = (): NewWordForm => ({
  hebrew_word: "",
  english_translation: "",
  definition: "",
  transliteration: "",
});

export const createEditFormFromWord = (word: VocabWithStats): EditForm => ({
  hebrew_word: word.hebrew_word,
  english_translation: word.english_translation,
  definition: word.definition || "",
});

export const isValidNewWord = (form: NewWordForm): boolean => {
  return form.hebrew_word.trim() !== "" && form.english_translation.trim() !== "";
};

export const mapViewRowToVocabWithStats = (row: {
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
}): VocabWithStats => ({
  id: row.id!,
  user_id: row.user_id!,
  hebrew_word: row.hebrew_word!,
  english_translation: row.english_translation!,
  definition: row.definition!,
  transliteration: row.transliteration,
  created_at: row.created_at,
  updated_at: row.updated_at,
  statistics: row.stats_id
    ? {
        id: row.stats_id,
        user_id: row.user_id!,
        word_id: row.id!,
        correct_count: row.correct_count,
        incorrect_count: row.incorrect_count,
        total_attempts: row.total_attempts,
        consecutive_correct: row.consecutive_correct,
        last_tested: row.last_tested,
        confidence_score: row.confidence_score,
        created_at: row.stats_created_at,
        updated_at: row.stats_updated_at,
      }
    : undefined,
});

export const mapWordsWithStats = (words: VocabularyWord[], statsMap: Map<string, WordStatistics>): VocabWithStats[] => {
  return words.map((word) => ({
    ...word,
    statistics: statsMap.get(word.id),
  }));
};

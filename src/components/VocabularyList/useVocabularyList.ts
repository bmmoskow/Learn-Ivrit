import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext/AuthContext";
import { supabase } from "../../../supabase/client";
import { defaultVocabulary } from "../../data/defaultVocabulary";
import {
  VocabWithStats,
  SortBy,
  NewWordForm,
  EditForm,
  ITEMS_PER_PAGE,
  createEmptyNewWordForm,
  createEditFormFromWord,
  isValidNewWord,
  calculatePaginationRange,
  mapViewRowToVocabWithStats,
  mapWordsWithStats,
  createGuestVocabWord,
} from "./vocabularyListUtils";

export interface UseVocabularyListReturn {
  // State
  words: VocabWithStats[];
  loading: boolean;
  searchQuery: string;
  sortBy: SortBy;
  editingId: string | null;
  editForm: EditForm;
  showAddForm: boolean;
  newWord: NewWordForm;
  currentPage: number;
  totalCount: number;
  totalPages: number;
  isGuest: boolean;

  // Actions
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: SortBy) => void;
  setShowAddForm: (show: boolean) => void;
  setNewWord: (word: NewWordForm) => void;
  setEditForm: (form: EditForm) => void;
  setCurrentPage: (page: number) => void;
  addWord: () => Promise<void>;
  startEdit: (word: VocabWithStats) => void;
  saveEdit: () => Promise<void>;
  cancelEdit: () => void;
  deleteWord: (id: string) => Promise<void>;
  loadVocabulary: () => Promise<void>;
}

export function useVocabularyList(): UseVocabularyListReturn {
  const { user, isGuest } = useAuth();
  const [words, setWords] = useState<VocabWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ hebrew_word: "", english_translation: "", definition: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWord, setNewWord] = useState<NewWordForm>(createEmptyNewWordForm());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to first page when sort/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, debouncedSearchQuery]);

  const loadVocabulary = useCallback(async () => {
    if (isGuest) {
      // Load default vocabulary for guests
      const guestWords: VocabWithStats[] = defaultVocabulary.map((word, index) => createGuestVocabWord(word, index));
      setWords(guestWords);
      setTotalCount(guestWords.length);
      setLoading(false);
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const { from, to } = calculatePaginationRange(currentPage, ITEMS_PER_PAGE);

      if (sortBy === "performance") {
        let query = supabase.from("vocabulary_with_stats").select("*", { count: "exact" }).eq("user_id", user.id);

        if (debouncedSearchQuery) {
          query = query.or(
            `hebrew_word.ilike.%${debouncedSearchQuery}%,english_translation.ilike.%${debouncedSearchQuery}%`,
          );
        }

        query = query
          .order("confidence_score", {
            ascending: true,
            nullsFirst: false,
          })
          .range(from, to);

        const { data: vocabData, error: vocabError, count } = await query;

        if (vocabError) throw vocabError;

        setTotalCount(count || 0);
        const wordsWithStats = vocabData.map(mapViewRowToVocabWithStats);
        setWords(wordsWithStats);
      } else {
        let query = supabase
          .from("vocabulary_words")
          .select(
            "id, hebrew_word, english_translation, definition, transliteration, created_at, updated_at, user_id",
            { count: "exact" },
          )
          .eq("user_id", user.id);

        if (debouncedSearchQuery) {
          query = query.or(
            `hebrew_word.ilike.%${debouncedSearchQuery}%,english_translation.ilike.%${debouncedSearchQuery}%`,
          );
        }

        if (sortBy === "date") {
          query = query.order("created_at", { ascending: false });
        } else if (sortBy === "alphabetical") {
          query = query.order("hebrew_word", { ascending: true });
        }

        query = query.range(from, to);

        const { data: vocabData, error: vocabError, count } = await query;

        if (vocabError) throw vocabError;

        setTotalCount(count || 0);

        const wordIds = vocabData.map((w) => w.id);

        const { data: statsData } = await supabase
          .from("word_statistics")
          .select(
            "id, user_id, word_id, correct_count, incorrect_count, total_attempts, consecutive_correct, last_tested, confidence_score, created_at, updated_at",
          )
          .in("word_id", wordIds);

        const statsMap = new Map(statsData?.map((s) => [s.word_id, s]) || []);
        const wordsWithStats = mapWordsWithStats(vocabData, statsMap);
        setWords(wordsWithStats);
      }
    } catch (err) {
      console.error("Error loading vocabulary:", err);
    } finally {
      setLoading(false);
    }
  }, [user, isGuest, sortBy, currentPage, debouncedSearchQuery]);

  // Load vocabulary when dependencies change
  useEffect(() => {
    loadVocabulary();
  }, [loadVocabulary]);

  const addWord = useCallback(async () => {
    if (!user || !isValidNewWord(newWord)) return;

    try {
      const { error } = await supabase.from("vocabulary_words").insert([
        {
          user_id: user.id,
          hebrew_word: newWord.hebrew_word,
          english_translation: newWord.english_translation,
          definition: newWord.definition,
          transliteration: newWord.transliteration,
        },
      ]);

      if (error) throw error;

      setNewWord(createEmptyNewWordForm());
      setShowAddForm(false);
      loadVocabulary();
    } catch (err) {
      console.error("Error adding word:", err);
    }
  }, [user, newWord, loadVocabulary]);

  const startEdit = useCallback((word: VocabWithStats) => {
    setEditingId(word.id);
    setEditForm(createEditFormFromWord(word));
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId) return;

    try {
      const { error } = await supabase
        .from("vocabulary_words")
        .update({
          hebrew_word: editForm.hebrew_word,
          english_translation: editForm.english_translation,
          definition: editForm.definition,
        })
        .eq("id", editingId);

      if (error) throw error;

      setEditingId(null);
      loadVocabulary();
    } catch (err) {
      console.error("Error updating word:", err);
    }
  }, [editingId, editForm, loadVocabulary]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const deleteWord = useCallback(
    async (id: string) => {
      if (!confirm("Are you sure you want to delete this word?")) return;

      try {
        const { error } = await supabase.from("vocabulary_words").delete().eq("id", id);

        if (error) throw error;

        loadVocabulary();
      } catch (err) {
        console.error("Error deleting word:", err);
      }
    },
    [loadVocabulary],
  );

  return {
    // State
    words,
    loading,
    searchQuery,
    sortBy,
    editingId,
    editForm,
    showAddForm,
    newWord,
    currentPage,
    totalCount,
    totalPages,
    isGuest: isGuest ?? false,

    // Actions
    setSearchQuery,
    setSortBy,
    setShowAddForm,
    setNewWord,
    setEditForm,
    setCurrentPage,
    addWord,
    startEdit,
    saveEdit,
    cancelEdit,
    deleteWord,
    loadVocabulary,
  };
}

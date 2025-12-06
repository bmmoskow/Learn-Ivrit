import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext/AuthContext";
import { supabase } from "../../supabase/client";
import type { Tables } from "../../supabase/types";
import { Edit2, Trash2, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";

type VocabularyWord = Tables<"vocabulary_words">;
type WordStatistics = Tables<"word_statistics">;

interface VocabWithStats extends VocabularyWord {
  statistics?: WordStatistics;
}

export function VocabularyList() {
  const { user, isGuest } = useAuth();
  const [words, setWords] = useState<VocabWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "alphabetical" | "performance">("date");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ hebrew_word: "", english_translation: "", definition: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWord, setNewWord] = useState({
    hebrew_word: "",
    english_translation: "",
    definition: "",
    transliteration: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  const itemsPerPage = 50;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadVocabulary();
  }, [user, sortBy, currentPage, debouncedSearchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, debouncedSearchQuery]);

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return "bg-green-50 text-green-700 border-green-200";
    if (score >= 60) return "bg-yellow-50 text-yellow-700 border-yellow-200";
    return "bg-red-50 text-red-700 border-red-200";
  };

  const getPerformanceIcon = (score: number) => {
    if (score >= 80) return "🎯";
    if (score >= 60) return "📈";
    return "📉";
  };

  const loadVocabulary = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

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

        const wordsWithStats = vocabData.map((row) => ({
          id: row.id,
          user_id: row.user_id,
          hebrew_word: row.hebrew_word,
          english_translation: row.english_translation,
          definition: row.definition,
          transliteration: row.transliteration,
          created_at: row.created_at,
          updated_at: row.updated_at,
          statistics: row.stats_id
            ? {
                id: row.stats_id,
                user_id: row.user_id,
                word_id: row.id,
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
        }));

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

        const wordsWithStats = vocabData.map((word) => ({
          ...word,
          statistics: statsMap.get(word.id),
        }));

        setWords(wordsWithStats);
      }
    } catch (err) {
      console.error("Error loading vocabulary:", err);
    } finally {
      setLoading(false);
    }
  };

  const paginatedWords = words;

  const addWord = async () => {
    if (!user || !newWord.hebrew_word || !newWord.english_translation) return;

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

      setNewWord({ hebrew_word: "", english_translation: "", definition: "", transliteration: "" });
      setShowAddForm(false);
      loadVocabulary();
    } catch (err) {
      console.error("Error adding word:", err);
    }
  };

  const startEdit = (word: VocabWithStats) => {
    setEditingId(word.id);
    setEditForm({
      hebrew_word: word.hebrew_word,
      english_translation: word.english_translation,
      definition: word.definition || "",
    });
  };

  const saveEdit = async () => {
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
  };

  const deleteWord = async (id: string) => {
    if (!confirm("Are you sure you want to delete this word?")) return;

    try {
      const { error } = await supabase.from("vocabulary_words").delete().eq("id", id);

      if (error) throw error;

      loadVocabulary();
    } catch (err) {
      console.error("Error deleting word:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-600">Loading vocabulary...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Vocabulary</h2>
        {!isGuest && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Add Word
          </button>
        )}
      </div>

      {showAddForm && !isGuest && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hebrew Word</label>
              <input
                type="text"
                value={newWord.hebrew_word}
                onChange={(e) => setNewWord({ ...newWord, hebrew_word: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-right"
                dir="rtl"
                placeholder="דבר"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">English Translation</label>
              <input
                type="text"
                value={newWord.english_translation}
                onChange={(e) => setNewWord({ ...newWord, english_translation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="word"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transliteration (optional)</label>
              <input
                type="text"
                value={newWord.transliteration}
                onChange={(e) => setNewWord({ ...newWord, transliteration: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="davar"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Definition (optional)</label>
              <input
                type="text"
                value={newWord.definition}
                onChange={(e) => setNewWord({ ...newWord, definition: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="A spoken unit of language"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addWord}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Add Word
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search vocabulary..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy("date")}
            className={`px-4 py-2 rounded-lg transition ${
              sortBy === "date" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Date Added
          </button>
          <button
            onClick={() => setSortBy("alphabetical")}
            className={`px-4 py-2 rounded-lg transition ${
              sortBy === "alphabetical" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Alphabetical
          </button>
          {!isGuest && (
            <button
              onClick={() => setSortBy("performance")}
              className={`px-4 py-2 rounded-lg transition ${
                sortBy === "performance" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Performance
            </button>
          )}
        </div>
      </div>

      {paginatedWords.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchQuery ? "No words match your search" : "No vocabulary words yet. Add some to get started!"}
        </div>
      ) : (
        <div>
          <div className="bg-gray-50 border-b border-gray-200 flex items-center font-semibold text-gray-700">
            <div
              className="px-4 py-3 text-right text-sm font-semibold text-gray-700 flex-shrink-0"
              style={{ width: "200px" }}
            >
              Hebrew
            </div>
            <div className="px-4 py-3 text-sm font-semibold text-gray-700 flex-shrink-0" style={{ width: "180px" }}>
              English
            </div>
            {!isGuest && (
              <div className="px-4 py-3 text-sm font-semibold text-gray-700 flex-1 min-w-[200px]">Definition</div>
            )}
            {!isGuest && (
              <>
                <div
                  className="text-center px-4 py-3 text-sm font-semibold text-gray-700 flex-shrink-0"
                  style={{ width: "120px" }}
                >
                  Stats
                </div>
                <div
                  className="text-center px-4 py-3 text-sm font-semibold text-gray-700 flex-shrink-0"
                  style={{ width: "140px" }}
                >
                  Performance
                </div>
              </>
            )}
            {!isGuest && (
              <div
                className="text-center px-4 py-3 text-sm font-semibold text-gray-700 flex-shrink-0"
                style={{ width: "120px" }}
              >
                Actions
              </div>
            )}
          </div>

          <div>
            {paginatedWords.map((word) => (
              <div key={word.id} className="border-b border-gray-100 hover:bg-gray-50 transition flex items-center">
                {editingId === word.id ? (
                  <>
                    <div className="px-4 py-4 flex-shrink-0" style={{ width: "200px" }}>
                      <input
                        type="text"
                        value={editForm.hebrew_word}
                        onChange={(e) => setEditForm({ ...editForm, hebrew_word: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                        dir="rtl"
                      />
                    </div>
                    <div className="px-4 py-4 flex-shrink-0" style={{ width: "180px" }}>
                      <input
                        type="text"
                        value={editForm.english_translation}
                        onChange={(e) => setEditForm({ ...editForm, english_translation: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    </div>
                    <div className="px-4 py-4 flex-1 min-w-[200px]">
                      <input
                        type="text"
                        value={editForm.definition}
                        onChange={(e) => setEditForm({ ...editForm, definition: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    </div>
                    <div className="px-4 py-4 text-center flex-shrink-0" style={{ width: "380px" }}>
                      <button
                        onClick={saveEdit}
                        className="px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mr-2"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="px-4 py-4 text-right flex-shrink-0" style={{ width: "200px" }}>
                      <div className="font-semibold text-lg" dir="rtl">
                        {word.hebrew_word}
                      </div>
                      {word.transliteration && <div className="text-sm text-gray-500">{word.transliteration}</div>}
                    </div>
                    <div className="px-4 py-4 flex-shrink-0" style={{ width: "180px" }}>
                      <div className="font-medium text-gray-900">{word.english_translation}</div>
                    </div>
                    {!isGuest && (
                      <div className="px-4 py-4 flex-1 min-w-[200px]">
                        <div className="text-sm text-gray-600 truncate">{word.definition}</div>
                      </div>
                    )}
                    {!isGuest && (
                      <>
                        <div className="px-4 py-4 text-center flex-shrink-0" style={{ width: "120px" }}>
                          {word.statistics && word.statistics.total_attempts > 0 ? (
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">
                                {word.statistics.correct_count}/{word.statistics.total_attempts}
                              </div>
                              <div className="text-xs text-gray-500">{word.statistics.consecutive_correct} streak</div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Not tested</span>
                          )}
                        </div>
                        <div className="px-4 py-4 text-center flex-shrink-0" style={{ width: "140px" }}>
                          {word.statistics && word.statistics.total_attempts > 0 ? (
                            <div className="flex items-center justify-center gap-2">
                              {getPerformanceIcon(word.statistics.confidence_score)}
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold border ${getPerformanceColor(word.statistics.confidence_score)}`}
                              >
                                {Math.round(word.statistics.confidence_score)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </div>
                      </>
                    )}
                    {!isGuest && (
                      <div className="px-4 py-4 text-center flex-shrink-0" style={{ width: "120px" }}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => startEdit(word)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit word"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteWord(word.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete word"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} of{" "}
            {totalCount} words
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[2.5rem] px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentPage === pageNum ? "bg-blue-600 text-white" : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../supabase/client';
import type { Tables } from '../../supabase/types';
import { Loader2, Search, Trash2, Edit2, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { defaultVocabulary } from '../data/defaultVocabulary';

type VocabularyWord = Tables<'vocabulary_words'>;
type WordStatistics = Tables<'word_statistics'>;

type VocabWithStats = VocabularyWord & {
  statistics?: WordStatistics;
};

export function VocabularyList() {
  const { user, isGuest } = useAuth();
  const [words, setWords] = useState<VocabWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'alphabetical' | 'performance'>('date');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    hebrew_word: '',
    english_translation: '',
    definition: '',
    transliteration: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    loadVocabulary();
  }, [user, isGuest, sortBy]);

  const loadVocabulary = async () => {
    if (isGuest) {
      const guestWords: VocabWithStats[] = defaultVocabulary.map((word, index) => ({
        id: `guest-${index}`,
        user_id: 'guest',
        hebrew_word: word.hebrew,
        english_translation: word.english,
        definition: word.english,
        transliteration: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      setWords(sortWords(guestWords));
      setLoading(false);
      return;
    }

    if (!user) return;

    setLoading(true);

    try {
      const { data: vocabData, error: vocabError } = await supabase
        .from('vocabulary_words')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (vocabError) throw vocabError;

      const { data: statsData, error: statsError } = await supabase
        .from('word_statistics')
        .select('*')
        .eq('user_id', user.id)
        .limit(1000);

      if (statsError) throw statsError;

      const wordsWithStats = vocabData.map(word => {
        const stats = statsData.find(s => s.word_id === word.id);
        return { ...word, statistics: stats };
      });

      const sorted = sortWords(wordsWithStats);
      setWords(sorted);
    } catch (err) {
      console.error('Error loading vocabulary:', err);
    } finally {
      setLoading(false);
    }
  };

  const sortWords = (wordsToSort: VocabWithStats[]) => {
    const sorted = [...wordsToSort];

    switch (sortBy) {
      case 'alphabetical':
        return sorted.sort((a, b) => a.hebrew_word.localeCompare(b.hebrew_word));
      case 'performance':
        return sorted.sort((a, b) => {
          const aScore = a.statistics?.confidence_score || 0;
          const bScore = b.statistics?.confidence_score || 0;
          return aScore - bScore;
        });
      case 'date':
      default:
        return sorted.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
  };

  const filteredWords = words.filter(word =>
    word.hebrew_word.toLowerCase().includes(searchQuery.toLowerCase()) ||
    word.english_translation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredWords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedWords = filteredWords.slice(startIndex, endIndex);

  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy]);

  const deleteWord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this word?')) return;

    const { error } = await supabase
      .from('vocabulary_words')
      .delete()
      .eq('id', id);

    if (!error) {
      setWords(words.filter(w => w.id !== id));
    }
  };

  const startEdit = (word: VocabWithStats) => {
    setEditingId(word.id);
    setEditForm({
      hebrew_word: word.hebrew_word,
      english_translation: word.english_translation,
      definition: word.definition,
      transliteration: word.transliteration || ''
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;

    const { error } = await supabase
      .from('vocabulary_words')
      .update(editForm)
      .eq('id', editingId);

    if (!error) {
      setWords(words.map(w =>
        w.id === editingId ? { ...w, ...editForm } : w
      ));
      setEditingId(null);
    }
  };

  const getPerformanceIcon = (score: number) => {
    if (score >= 70) return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (score >= 40) return <Minus className="w-5 h-5 text-yellow-600" />;
    return <TrendingDown className="w-5 h-5 text-red-600" />;
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 70) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">My Vocabulary</h2>
              <p className="text-gray-600 mt-1">{words.length} words in your collection</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search words..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full sm:w-64"
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="date">Sort by Date</option>
                <option value="alphabetical">Sort Alphabetically</option>
                <option value="performance">Sort by Performance</option>
              </select>
            </div>
          </div>

          {filteredWords.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                {searchQuery
                  ? 'No words match your search'
                  : 'No words in your vocabulary yet. Start by translating some Hebrew text!'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Hebrew</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">English</th>
                    {!isGuest && (
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Definition</th>
                    )}
                    {!isGuest && (
                      <>
                        <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Stats</th>
                        <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Performance</th>
                      </>
                    )}
                    {!isGuest && (
                      <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedWords.map((word) => (
                    <tr key={word.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      {editingId === word.id ? (
                        <>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={editForm.hebrew_word}
                              onChange={(e) => setEditForm({ ...editForm, hebrew_word: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                              dir="rtl"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={editForm.english_translation}
                              onChange={(e) => setEditForm({ ...editForm, english_translation: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={editForm.definition}
                              onChange={(e) => setEditForm({ ...editForm, definition: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          </td>
                          <td colSpan={3} className="px-4 py-4 text-center">
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
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-4 text-right">
                            <div className="font-semibold text-lg" dir="rtl">{word.hebrew_word}</div>
                            {word.transliteration && (
                              <div className="text-sm text-gray-500">{word.transliteration}</div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-medium text-gray-900">{word.english_translation}</div>
                          </td>
                          {!isGuest && (
                            <td className="px-4 py-4">
                              <div className="text-sm text-gray-600 max-w-md">{word.definition}</div>
                            </td>
                          )}
                          {!isGuest && (
                            <>
                              <td className="px-4 py-4 text-center">
                                {word.statistics && word.statistics.total_attempts > 0 ? (
                                  <div className="text-sm">
                                    <div className="font-medium text-gray-900">
                                      {word.statistics.correct_count}/{word.statistics.total_attempts}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {word.statistics.consecutive_correct} streak
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-400">Not tested</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-center">
                                {word.statistics && word.statistics.total_attempts > 0 ? (
                                  <div className="flex items-center justify-center gap-2">
                                    {getPerformanceIcon(word.statistics.confidence_score)}
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getPerformanceColor(word.statistics.confidence_score)}`}>
                                      {Math.round(word.statistics.confidence_score)}%
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-400">-</span>
                                )}
                              </td>
                            </>
                          )}
                          {!isGuest && (
                            <td className="px-4 py-4 text-center">
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
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredWords.length)} of {filteredWords.length} words
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-medium text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
          )}
        </div>
      </div>
    </div>
  );
}

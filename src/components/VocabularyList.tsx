import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../supabase/client';
import type { Tables } from '../../supabase/types';
import { Loader2, Search, Trash2, Edit2, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { defaultVocabulary } from '../data/defaultVocabulary';
import * as ReactWindow from 'react-window';
const { FixedSizeList } = ReactWindow as any;

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
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    loadVocabulary();
  }, [user, isGuest, sortBy, currentPage]);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const availableHeight = window.innerHeight - rect.top - 100;
        setContainerHeight(Math.max(400, availableHeight));
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

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
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from('vocabulary_words')
        .select(`
          id,
          user_id,
          hebrew_word,
          english_translation,
          definition,
          transliteration,
          created_at,
          updated_at,
          word_statistics (
            id,
            user_id,
            word_id,
            correct_count,
            incorrect_count,
            total_attempts,
            consecutive_correct,
            last_tested,
            confidence_score,
            created_at,
            updated_at
          )
        `, { count: 'exact' })
        .eq('user_id', user.id);

      if (sortBy === 'date') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'alphabetical') {
        query = query.order('hebrew_word', { ascending: true });
      } else if (sortBy === 'performance') {
        query = query.order('confidence_score', {
          ascending: true,
          referencedTable: 'word_statistics',
          nullsFirst: false
        });
      }

      query = query.range(from, to);

      const { data: vocabData, error: vocabError, count } = await query;

      if (vocabError) throw vocabError;

      setTotalCount(count || 0);

      const wordsWithStats = vocabData.map(word => {
        const stats = Array.isArray(word.word_statistics)
          ? word.word_statistics[0]
          : word.word_statistics;
        return {
          ...word,
          statistics: stats,
          word_statistics: undefined
        };
      });

      setWords(wordsWithStats);
    } catch (err) {
      console.error('Error loading vocabulary:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredWords = words.filter(word =>
    word.hebrew_word.toLowerCase().includes(searchQuery.toLowerCase()) ||
    word.english_translation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const paginatedWords = filteredWords;

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
            <div ref={containerRef}>
              <div className="overflow-x-auto">
                <div className="min-w-full">
                  <div className="border-b border-gray-200 bg-gray-50 flex">
                    <div className="text-right px-4 py-3 text-sm font-semibold text-gray-700 flex-shrink-0" style={{width: '200px'}}>Hebrew</div>
                    <div className="text-left px-4 py-3 text-sm font-semibold text-gray-700 flex-shrink-0" style={{width: '180px'}}>English</div>
                    {!isGuest && (
                      <div className="text-left px-4 py-3 text-sm font-semibold text-gray-700 flex-1 min-w-[200px]">Definition</div>
                    )}
                    {!isGuest && (
                      <>
                        <div className="text-center px-4 py-3 text-sm font-semibold text-gray-700 flex-shrink-0" style={{width: '120px'}}>Stats</div>
                        <div className="text-center px-4 py-3 text-sm font-semibold text-gray-700 flex-shrink-0" style={{width: '140px'}}>Performance</div>
                      </>
                    )}
                    {!isGuest && (
                      <div className="text-center px-4 py-3 text-sm font-semibold text-gray-700 flex-shrink-0" style={{width: '120px'}}>Actions</div>
                    )}
                  </div>

                  <FixedSizeList
                    height={containerHeight}
                    itemCount={paginatedWords.length}
                    itemSize={editingId ? 100 : 80}
                    width="100%"
                  >
                    {({ index, style }) => {
                      const word = paginatedWords[index];
                      return (
                        <div key={word.id} style={style} className="border-b border-gray-100 hover:bg-gray-50 transition flex items-center">
                          {editingId === word.id ? (
                            <>
                              <div className="px-4 py-4 flex-shrink-0" style={{width: '200px'}}>
                                <input
                                  type="text"
                                  value={editForm.hebrew_word}
                                  onChange={(e) => setEditForm({ ...editForm, hebrew_word: e.target.value })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                                  dir="rtl"
                                />
                              </div>
                              <div className="px-4 py-4 flex-shrink-0" style={{width: '180px'}}>
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
                              <div className="px-4 py-4 text-center flex-shrink-0" style={{width: '380px'}}>
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
                              <div className="px-4 py-4 text-right flex-shrink-0" style={{width: '200px'}}>
                                <div className="font-semibold text-lg" dir="rtl">{word.hebrew_word}</div>
                                {word.transliteration && (
                                  <div className="text-sm text-gray-500">{word.transliteration}</div>
                                )}
                              </div>
                              <div className="px-4 py-4 flex-shrink-0" style={{width: '180px'}}>
                                <div className="font-medium text-gray-900">{word.english_translation}</div>
                              </div>
                              {!isGuest && (
                                <div className="px-4 py-4 flex-1 min-w-[200px]">
                                  <div className="text-sm text-gray-600 truncate">{word.definition}</div>
                                </div>
                              )}
                              {!isGuest && (
                                <>
                                  <div className="px-4 py-4 text-center flex-shrink-0" style={{width: '120px'}}>
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
                                  </div>
                                  <div className="px-4 py-4 text-center flex-shrink-0" style={{width: '140px'}}>
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
                                  </div>
                                </>
                              )}
                              {!isGuest && (
                                <div className="px-4 py-4 text-center flex-shrink-0" style={{width: '120px'}}>
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
                      );
                    }}
                  </FixedSizeList>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} words
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

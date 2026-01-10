import { Edit2, Trash2, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import {
  VocabWithStats,
  SortBy,
  NewWordForm,
  EditForm,
  ITEMS_PER_PAGE,
  getPerformanceColor,
  getPerformanceIcon,
  calculateDisplayRange,
  calculatePageNumbers,
} from "./vocabularyListUtils";

interface VocabularyListUIProps {
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
  onSearchQueryChange: (query: string) => void;
  onSortByChange: (sort: SortBy) => void;
  onShowAddFormChange: (show: boolean) => void;
  onNewWordChange: (word: NewWordForm) => void;
  onEditFormChange: (form: EditForm) => void;
  onCurrentPageChange: (page: number) => void;
  onAddWord: () => void;
  onStartEdit: (word: VocabWithStats) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDeleteWord: (id: string) => void;
}

export function VocabularyListUI({
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
  isGuest,
  onSearchQueryChange,
  onSortByChange,
  onShowAddFormChange,
  onNewWordChange,
  onEditFormChange,
  onCurrentPageChange,
  onAddWord,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDeleteWord,
}: VocabularyListUIProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-600">Loading vocabulary...</div>
      </div>
    );
  }

  const { start, end } = calculateDisplayRange(currentPage, ITEMS_PER_PAGE, totalCount);
  const pageNumbers = calculatePageNumbers(currentPage, totalPages);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Vocabulary</h2>
        {!isGuest && (
          <button
            onClick={() => onShowAddFormChange(!showAddForm)}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm sm:text-base"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Add Word</span>
            <span className="xs:hidden">Add</span>
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && !isGuest && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hebrew Word</label>
              <input
                type="text"
                value={newWord.hebrew_word}
                onChange={(e) => onNewWordChange({ ...newWord, hebrew_word: e.target.value })}
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
                onChange={(e) => onNewWordChange({ ...newWord, english_translation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="word"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transliteration (optional)</label>
              <input
                type="text"
                value={newWord.transliteration}
                onChange={(e) => onNewWordChange({ ...newWord, transliteration: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="davar"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Definition (optional)</label>
              <input
                type="text"
                value={newWord.definition}
                onChange={(e) => onNewWordChange({ ...newWord, definition: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="A spoken unit of language"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onAddWord}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Add Word
            </button>
            <button
              onClick={() => onShowAddFormChange(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search and Sort */}
      <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          />
        </div>
        <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
          <button
            onClick={() => onSortByChange("date")}
            className={`px-3 sm:px-4 py-2 rounded-lg transition text-sm ${
              sortBy === "date" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Date Added
          </button>
          <button
            onClick={() => onSortByChange("alphabetical")}
            className={`px-3 sm:px-4 py-2 rounded-lg transition text-sm ${
              sortBy === "alphabetical" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Alphabetical
          </button>
          {!isGuest && (
            <button
              onClick={() => onSortByChange("performance")}
              className={`px-3 sm:px-4 py-2 rounded-lg transition text-sm ${
                sortBy === "performance" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Performance
            </button>
          )}
        </div>
      </div>

      {/* Word List */}
      {words.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchQuery ? "No words match your search" : "No vocabulary words yet. Add some to get started!"}
        </div>
      ) : (
        <div className="overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-50 border-b border-gray-200 flex items-center font-semibold text-gray-700">
            <div className="px-2 sm:px-4 py-2 sm:py-3 text-right text-sm font-semibold text-gray-700 flex-1 min-w-0">
              Hebrew
            </div>
            <div className="px-2 sm:px-4 py-2 sm:py-3 text-sm font-semibold text-gray-700 flex-1 min-w-0">
              English
            </div>
            {!isGuest && (
              <>
                <div
                  className="hidden sm:block text-center px-4 py-3 text-sm font-semibold text-gray-700 flex-shrink-0"
                  style={{ width: "120px" }}
                >
                  Stats
                </div>
                <div
                  className="hidden sm:block text-center px-4 py-3 text-sm font-semibold text-gray-700 flex-shrink-0"
                  style={{ width: "140px" }}
                >
                  Performance
                </div>
              </>
            )}
            {!isGuest && (
              <div className="text-center px-1 py-2 sm:px-4 sm:py-3 text-sm font-semibold text-gray-700 flex-shrink-0 w-14 sm:w-[120px]">
                <span className="sm:hidden">⚙</span>
                <span className="hidden sm:inline">Actions</span>
              </div>
            )}
          </div>

          {/* Table Body */}
          <div>
            {words.map((word) => (
              <div key={word.id} className="border-b border-gray-100 hover:bg-gray-50 transition flex items-center">
                {editingId === word.id ? (
                  <EditRow
                    editForm={editForm}
                    onEditFormChange={onEditFormChange}
                    onSaveEdit={onSaveEdit}
                    onCancelEdit={onCancelEdit}
                  />
                ) : (
                  <DisplayRow word={word} isGuest={isGuest} onStartEdit={onStartEdit} onDeleteWord={onDeleteWord} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {start}-{end} of {totalCount} words
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onCurrentPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1">
              {pageNumbers.map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => onCurrentPageChange(pageNum)}
                  className={`min-w-[2.5rem] px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === pageNum ? "bg-blue-600 text-white" : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              onClick={() => onCurrentPageChange(Math.min(totalPages, currentPage + 1))}
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

// Sub-components for cleaner code
interface EditRowProps {
  editForm: EditForm;
  onEditFormChange: (form: EditForm) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

function EditRow({ editForm, onEditFormChange, onSaveEdit, onCancelEdit }: EditRowProps) {
  return (
    <>
      <div className="px-2 sm:px-4 py-2 sm:py-4 flex-1 min-w-0">
        <input
          type="text"
          value={editForm.hebrew_word}
          onChange={(e) => onEditFormChange({ ...editForm, hebrew_word: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded text-right text-sm"
          dir="rtl"
        />
      </div>
      <div className="px-2 sm:px-4 py-2 sm:py-4 flex-1 min-w-0">
        <input
          type="text"
          value={editForm.english_translation}
          onChange={(e) => onEditFormChange({ ...editForm, english_translation: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
        />
      </div>
      <div className="px-1 sm:px-4 py-2 sm:py-4 text-center flex-shrink-0 w-14 sm:w-[120px]">
        <div className="flex items-center justify-center gap-0 sm:gap-1">
          <button onClick={onSaveEdit} className="p-1.5 sm:px-4 sm:py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
            <span className="sm:hidden">✓</span>
            <span className="hidden sm:inline">Save</span>
          </button>
          <button onClick={onCancelEdit} className="p-1.5 sm:px-4 sm:py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm">
            <span className="sm:hidden">✕</span>
            <span className="hidden sm:inline">Cancel</span>
          </button>
        </div>
      </div>
    </>
  );
}

interface DisplayRowProps {
  word: VocabWithStats;
  isGuest: boolean;
  onStartEdit: (word: VocabWithStats) => void;
  onDeleteWord: (id: string) => void;
}

function DisplayRow({ word, isGuest, onStartEdit, onDeleteWord }: DisplayRowProps) {
  return (
    <>
      <div className="px-2 sm:px-4 py-2 sm:py-4 text-right flex-1 min-w-0 overflow-hidden">
        <div className="font-semibold text-base sm:text-lg truncate" dir="rtl">
          {word.hebrew_word}
        </div>
        {word.transliteration && <div className="text-xs sm:text-sm text-gray-500 truncate">{word.transliteration}</div>}
      </div>
      <div className="px-2 sm:px-4 py-2 sm:py-4 flex-1 min-w-0 overflow-hidden">
        <div className="font-medium text-gray-900 text-sm sm:text-base truncate">{word.english_translation}</div>
      </div>
      {!isGuest && (
        <>
          <div className="hidden sm:block px-4 py-4 text-center flex-shrink-0" style={{ width: "120px" }}>
            {word.statistics && word.statistics.total_attempts && word.statistics.total_attempts > 0 ? (
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
          <div className="hidden sm:block px-4 py-4 text-center flex-shrink-0" style={{ width: "140px" }}>
            {word.statistics && word.statistics.total_attempts && word.statistics.total_attempts > 0 ? (
              <div className="flex items-center justify-center gap-2">
                {getPerformanceIcon(word.statistics.confidence_score ?? 0)}
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold border ${getPerformanceColor(word.statistics.confidence_score ?? 0)}`}
                >
                  {Math.round(word.statistics.confidence_score ?? 0)}%
                </span>
              </div>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )}
          </div>
        </>
      )}
      {!isGuest && (
        <div className="px-1 sm:px-4 py-2 sm:py-4 text-center flex-shrink-0 w-14 sm:w-[120px]">
          <div className="flex items-center justify-center gap-0 sm:gap-2">
            <button
              onClick={() => onStartEdit(word)}
              className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
              title="Edit word"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDeleteWord(word.id)}
              className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Delete word"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

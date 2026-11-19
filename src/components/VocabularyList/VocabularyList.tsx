import { useState } from "react";
import { useVocabularyList } from "./useVocabularyList";
import { VocabularyListUI } from "./VocabularyListUI";
import { FlashcardReview } from "./FlashcardReview/FlashcardReview";

export function VocabularyList() {
  const {
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
  } = useVocabularyList();

  // Flashcard review is a focused, full-panel practice overlay launched from the
  // list header. It drills the user's weakest words adaptively and independently
  // of the list's current search/sort, so it lives in its own open/close state
  // here rather than being tangled into the list's filters.
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  return (
    <>
      <VocabularyListUI
        words={words}
        loading={loading}
        searchQuery={searchQuery}
        sortBy={sortBy}
        editingId={editingId}
        editForm={editForm}
        showAddForm={showAddForm}
        newWord={newWord}
        currentPage={currentPage}
        totalCount={totalCount}
        totalPages={totalPages}
        isGuest={isGuest}
        onSearchQueryChange={setSearchQuery}
        onSortByChange={setSortBy}
        onShowAddFormChange={setShowAddForm}
        onNewWordChange={setNewWord}
        onEditFormChange={setEditForm}
        onCurrentPageChange={setCurrentPage}
        onAddWord={addWord}
        onStartEdit={startEdit}
        onSaveEdit={saveEdit}
        onCancelEdit={cancelEdit}
        onDeleteWord={deleteWord}
        onStartReview={() => setIsReviewOpen(true)}
      />
      {isReviewOpen && <FlashcardReview onExit={() => setIsReviewOpen(false)} />}
    </>
  );
}

import { useVocabularyList } from "./useVocabularyList";
import { VocabularyListUI } from "./VocabularyListUI";

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

  return (
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
    />
  );
}

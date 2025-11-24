st && (
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

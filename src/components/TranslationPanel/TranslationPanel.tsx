import { useAuth } from "../../contexts/AuthContext/AuthContext";
import { WordDefinitionPopup } from "../WordDefinitionPopup";
import { BookmarkManager } from "../BookmarkManager";
import { SaveBookmarkDialog } from "../SaveBookmarkDialog";
import { useTranslationPanel } from "./useTranslationPanel";
import { TranslationPanelUI } from "./TranslationPanelUI";

export function TranslationPanel() {
  const { isGuest } = useAuth();
  const hook = useTranslationPanel();

  return (
    <>
      <TranslationPanelUI
        hebrewText={hook.hebrewText}
        translating={hook.translating}
        error={hook.error}
        savedWords={hook.savedWords}
        urlInput={hook.urlInput}
        showUrlInput={hook.showUrlInput}
        loadingUrl={hook.loadingUrl}
        selectedBook={hook.selectedBook}
        selectedChapter={hook.selectedChapter}
        showBibleInput={hook.showBibleInput}
        loadingBible={hook.loadingBible}
        bibleLoaded={hook.bibleLoaded}
        currentBibleRef={hook.currentBibleRef}
        processingImage={hook.processingImage}
        isGuest={isGuest}
        syncedParagraphs={hook.syncedParagraphs}
        setHebrewText={hook.setHebrewText}
        setUrlInput={hook.setUrlInput}
        setShowUrlInput={hook.setShowUrlInput}
        setSelectedBook={hook.setSelectedBook}
        setSelectedChapter={hook.setSelectedChapter}
        setShowBibleInput={hook.setShowBibleInput}
        setShowBookmarkManager={hook.setShowBookmarkManager}
        setShowSaveBookmark={hook.setShowSaveBookmark}
        loadFromUrl={hook.loadFromUrl}
        loadFromBible={hook.loadFromBible}
        navigateChapter={hook.navigateChapter}
        canNavigatePrev={hook.canNavigatePrev}
        canNavigateNext={hook.canNavigateNext}
        handleWordClick={hook.handleWordClick}
        handleCopy={hook.handleCopy}
        handleFileSelect={hook.handleFileSelect}
        clearAll={hook.clearAll}
        triggerFileInput={hook.triggerFileInput}
        fileInputRef={hook.fileInputRef}
      />

      {hook.selectedWord && (
        <WordDefinitionPopup
          word={hook.selectedWord.word}
          sentence={hook.selectedWord.sentence}
          position={hook.selectedWord.position}
          onClose={() => hook.setSelectedWord(null)}
          onWordSaved={hook.loadSavedWords}
        />
      )}

      {hook.showBookmarkManager && (
        <BookmarkManager
          onLoadBookmark={hook.handleLoadBookmark}
          onClose={() => hook.setShowBookmarkManager(false)}
        />
      )}

      {hook.showSaveBookmark && (
        <SaveBookmarkDialog
          hebrewText={hook.hebrewText}
          source={hook.currentSource}
          onClose={() => hook.setShowSaveBookmark(false)}
          onSaved={() => {}}
        />
      )}
    </>
  );
}

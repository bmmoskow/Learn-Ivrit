import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext/AuthContext";
import { WordDefinitionPopup } from "./WordDefinitionPopup/WordDefinitionPopup";
import { BookmarkManager } from "./BookmarkManager/BookmarkManager";
import { SaveBookmarkDialog } from "./SaveBookmarkDialog/SaveBookmarkDialog";
import { PassageGenerator } from "./PassageGenerator/PassageGenerator";
import { useTranslationPanel } from "./useTranslationPanel";
import { TranslationPanelUI } from "./TranslationPanelUI";

export function TranslationPanel() {
  const { isGuest } = useAuth();
  const hook = useTranslationPanel();
  const [showPassageGenerator, setShowPassageGenerator] = useState(false);

  const handlePassageGenerated = (passage: string) => {
    hook.setHebrewText(passage);
    setShowPassageGenerator(false);
  };

  return (
    <>
      <TranslationPanelUI
        hebrewText={hook.hebrewText}
        sourceText={hook.sourceText}
        translatedText={hook.translatedText}
        translationDirection={hook.translationDirection}
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
        setSourceText={hook.setSourceText}
        setUrlInput={hook.setUrlInput}
        setShowUrlInput={hook.setShowUrlInput}
        setSelectedBook={hook.setSelectedBook}
        setSelectedChapter={hook.setSelectedChapter}
        setShowBibleInput={hook.setShowBibleInput}
        setShowBookmarkManager={hook.setShowBookmarkManager}
        setShowSaveBookmark={hook.setShowSaveBookmark}
        setShowPassageGenerator={setShowPassageGenerator}
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
        <BookmarkManager onLoadBookmark={hook.handleLoadBookmark} onClose={() => hook.setShowBookmarkManager(false)} />
      )}

      {hook.showSaveBookmark && (
        <SaveBookmarkDialog
          hebrewText={hook.hebrewText}
          source={hook.currentSource}
          onClose={() => hook.setShowSaveBookmark(false)}
          onSaved={() => {}}
        />
      )}

      <PassageGenerator
        isOpen={showPassageGenerator}
        onClose={() => setShowPassageGenerator(false)}
        onPassageGenerated={handlePassageGenerated}
      />
    </>
  );
}
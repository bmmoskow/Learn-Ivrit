import { useState } from "react";
import {
  Languages,
  BookPlus,
  Loader2,
  ArrowRightLeft,
} from "lucide-react";
import { SyncedParagraph, TranslationDirection } from "./translationPanelUtils";
import { BibleInput } from "./BibleInput/BibleInput";
import { UrlInput } from "./UrlInput/UrlInput";
import { TextInputDialog } from "./TextInputDialog/TextInputDialog";
import { SyncedTextDisplay } from "./SyncedTextDisplay/SyncedTextDisplay";
import { Toolbar } from "./Toolbar/Toolbar";
import { BibleNavigationBar } from "./BibleNavigationBar/BibleNavigationBar";
import { InputLauncher } from "./InputLauncher/InputLauncher";

interface TranslationPanelUIProps {
  // State
  hebrewText: string;
  sourceText: string;
  translatedText: string;
  translationDirection: TranslationDirection;
  translating: boolean;
  error: string;
  savedWords: Set<string>;
  urlInput: string;
  showUrlInput: boolean;
  loadingUrl: boolean;
  selectedBook: string;
  selectedChapter: number;
  showBibleInput: boolean;
  loadingBible: boolean;
  bibleLoaded: boolean;
  currentBibleRef: { book: string; chapter: number } | null;
  processingImage: boolean;
  isGuest: boolean;
  syncedParagraphs: SyncedParagraph[] | null;

  // Setters
  setSourceText: (text: string) => void;
  setUrlInput: (url: string) => void;
  setShowUrlInput: (show: boolean) => void;
  setSelectedBook: (book: string) => void;
  setSelectedChapter: (chapter: number) => void;
  setShowBibleInput: (show: boolean) => void;
  setShowBookmarkManager: (show: boolean) => void;
  setShowSaveBookmark: (show: boolean) => void;
  setShowPassageGenerator: (show: boolean) => void;

  // Actions
  loadFromUrl: () => void;
  loadFromBible: () => void;
  navigateChapter: (direction: "prev" | "next") => void;
  canNavigatePrev: () => boolean;
  canNavigateNext: () => boolean;
  handleWordClick: (e: React.MouseEvent<HTMLSpanElement>) => void;
  handleCopy: (text: string) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  clearAll: () => void;
  triggerFileInput: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export function TranslationPanelUI({
  sourceText,
  translationDirection,
  translating,
  error,
  savedWords,
  urlInput,
  showUrlInput,
  loadingUrl,
  selectedBook,
  selectedChapter,
  showBibleInput,
  loadingBible,
  bibleLoaded,
  currentBibleRef,
  processingImage,
  isGuest,
  syncedParagraphs,
  setSourceText,
  setUrlInput,
  setShowUrlInput,
  setSelectedBook,
  setSelectedChapter,
  setShowBibleInput,
  setShowBookmarkManager,
  setShowSaveBookmark,
  setShowPassageGenerator,
  loadFromUrl,
  loadFromBible,
  navigateChapter,
  canNavigatePrev,
  canNavigateNext,
  handleWordClick,
  handleCopy,
  handleFileSelect,
  clearAll,
  triggerFileInput,
  fileInputRef,
}: TranslationPanelUIProps) {
  const [showTextInput, setShowTextInput] = useState(false);
  const isHebrewToEnglish = translationDirection === "hebrew-to-english";

  // Hidden file input is always rendered
  const fileInput = (
    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
  );

  // Empty state: show launcher grid
  if (!sourceText && !showUrlInput && !showBibleInput && !processingImage) {
    return (
      <div className="flex-1 flex flex-col p-4 sm:p-6">
        {fileInput}
        <InputLauncher
          isGuest={isGuest}
          onPasteType={() => setShowTextInput(true)}
          onUploadImage={triggerFileInput}
          onLoadUrl={() => setShowUrlInput(true)}
          onLoadBible={() => setShowBibleInput(true)}
          onGenerateAI={() => setShowPassageGenerator(true)}
          onLoadBookmark={() => setShowBookmarkManager(true)}
        />
        <TextInputDialog
          open={showTextInput}
          onOpenChange={setShowTextInput}
          onSubmit={(text) => setSourceText(text)}
        />
      </div>
    );
  }

  // Inline input states (URL input, Bible input) before text is loaded
  if (!sourceText && (showUrlInput || showBibleInput)) {
    return (
      <div className="flex-1 flex flex-col p-4 sm:p-6">
        {fileInput}
        <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col flex-1">
          <div className="flex-1 min-h-[400px] border-2 border-gray-200 rounded-lg p-4">
            {showBibleInput ? (
              <BibleInput
                selectedBook={selectedBook}
                selectedChapter={selectedChapter}
                loadingBible={loadingBible}
                setSelectedBook={setSelectedBook}
                setSelectedChapter={setSelectedChapter}
                setShowBibleInput={setShowBibleInput}
                loadFromBible={loadFromBible}
              />
            ) : (
              <UrlInput
                urlInput={urlInput}
                loadingUrl={loadingUrl}
                error={error}
                setUrlInput={setUrlInput}
                setShowUrlInput={setShowUrlInput}
                loadFromUrl={loadFromUrl}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Translation view: text loaded
  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6">
      {fileInput}
      <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2 shrink-0">
              <Languages className="w-5 h-5 text-blue-600" />
              <span className="hidden xs:inline">Translation Panel</span>
              <span className="xs:hidden">Translate</span>
            </h2>
            {sourceText && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
                <ArrowRightLeft className="w-4 h-4" />
                <span>{isHebrewToEnglish ? "Hebrew → English" : "English → Hebrew"}</span>
              </div>
            )}
          </div>
          <Toolbar
            sourceText={sourceText}
            processingImage={processingImage}
            isGuest={isGuest}
            setShowBookmarkManager={setShowBookmarkManager}
            setShowSaveBookmark={setShowSaveBookmark}
            handleCopy={handleCopy}
            handleFileSelect={handleFileSelect}
            clearAll={clearAll}
            triggerFileInput={triggerFileInput}
            fileInputRef={fileInputRef}
          />
        </div>

        {bibleLoaded && currentBibleRef && (
          <BibleNavigationBar
            currentBibleRef={currentBibleRef}
            navigateChapter={navigateChapter}
            canNavigatePrev={canNavigatePrev}
            canNavigateNext={canNavigateNext}
          />
        )}

        {sourceText && !isGuest && !bibleLoaded && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 flex items-center gap-2">
              <BookPlus className="w-4 h-4" />
              Click on Hebrew words to see definitions and add them to your vocabulary list
            </p>
          </div>
        )}
        {sourceText && isGuest && !bibleLoaded && (
          <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <BookPlus className="w-4 h-4" />
              Click on Hebrew words to see definitions (sign in to save words)
            </p>
          </div>
        )}

        <div className="flex-1 min-h-[500px] border-2 border-gray-200 rounded-lg p-4 focus-within:border-blue-500 transition">
          <SyncedTextDisplay
            sourceText={sourceText}
            translationDirection={translationDirection}
            translating={translating}
            savedWords={savedWords}
            syncedParagraphs={syncedParagraphs}
            handleWordClick={handleWordClick}
          />
        </div>

        {processingImage && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Extracting Hebrew text from image...
            </p>
          </div>
        )}

        {translating && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Translating...
            </p>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}
      </div>

      <TextInputDialog
        open={showTextInput}
        onOpenChange={setShowTextInput}
        onSubmit={(text) => setSourceText(text)}
      />
    </div>
  );
}

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

  return (
    <div className="flex-1 flex flex-col p-6">
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
          {sourceText ? (
            <SyncedTextDisplay
              sourceText={sourceText}
              translationDirection={translationDirection}
              translating={translating}
              savedWords={savedWords}
              syncedParagraphs={syncedParagraphs}
              handleWordClick={handleWordClick}
            />
          ) : showBibleInput ? (
            <BibleInput
              selectedBook={selectedBook}
              selectedChapter={selectedChapter}
              loadingBible={loadingBible}
              setSelectedBook={setSelectedBook}
              setSelectedChapter={setSelectedChapter}
              setShowBibleInput={setShowBibleInput}
              loadFromBible={loadFromBible}
            />
          ) : showUrlInput ? (
            <UrlInput
              urlInput={urlInput}
              loadingUrl={loadingUrl}
              setUrlInput={setUrlInput}
              setShowUrlInput={setShowUrlInput}
              loadFromUrl={loadFromUrl}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="text-center text-gray-400 text-sm leading-relaxed max-w-md">
                <span
                  className="text-indigo-600 underline cursor-pointer"
                  onClick={() => setShowTextInput(true)}
                >
                  Paste or type Hebrew or English
                </span>
                ,{" "}
                <span
                  className="text-green-600 underline cursor-pointer"
                  onClick={triggerFileInput}
                >
                  upload image
                </span>
                ,{" "}
                <span
                  className="text-blue-600 underline cursor-pointer"
                  onClick={() => setShowUrlInput(true)}
                >
                  load from URL
                </span>
                ,{" "}
                <span
                  className="text-purple-600 underline cursor-pointer"
                  onClick={() => setShowBibleInput(true)}
                >
                  load from Bible
                </span>
                , or{" "}
                <span
                  className="text-amber-600 underline cursor-pointer"
                  onClick={() => setShowPassageGenerator(true)}
                >
                  generate with AI
                </span>
              </div>
            </div>
          )}
        </div>

        {!sourceText && !showUrlInput && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setSourceText("שלום עולם")}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Try "שלום עולם"
              </button>
              <button
                onClick={() => setSourceText("Hello world")}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Try "Hello world"
              </button>
            </div>
          </div>
        )}

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

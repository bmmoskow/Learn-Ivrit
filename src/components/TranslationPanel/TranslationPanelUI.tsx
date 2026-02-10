import { useState } from "react";
import {
  Languages,
  Copy,
  X,
  Loader2,
  BookPlus,
  ChevronLeft,
  ChevronRight,
  Book,
  Upload,
  Bookmark,
  BookmarkPlus,
  ArrowRightLeft,
} from "lucide-react";
import { BIBLE_BOOKS } from "../../data/bibleBooks";
import { SyncedParagraph, TranslationDirection } from "./translationPanelUtils";
import { BibleInput } from "./BibleInput/BibleInput";
import { UrlInput } from "./UrlInput/UrlInput";
import { TextInputDialog } from "./TextInputDialog/TextInputDialog";

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

  const handleTextInputSubmit = (text: string) => {
    setSourceText(text);
  };

  const isHebrewToEnglish = translationDirection === "hebrew-to-english";
  const renderSyncedText = () => {
    // If we have sourceText but no syncedParagraphs yet (translation pending), render a pending state
    if (!syncedParagraphs) {
      // Show source text immediately with translation placeholder
      const sourceIsHebrew = isHebrewToEnglish;
      return (
        <div className="grid grid-cols-2 gap-6">
          <div
            className={`prose max-w-none ${sourceIsHebrew ? "text-right" : ""}`}
            dir={sourceIsHebrew ? "rtl" : "ltr"}
          >
            <p className="whitespace-pre-wrap">{sourceText}</p>
          </div>
          <div
            className={`prose max-w-none ${!sourceIsHebrew ? "text-right" : ""}`}
            dir={!sourceIsHebrew ? "rtl" : "ltr"}
          >
            <p className="whitespace-pre-wrap">
              <span className="text-gray-400">
                {translating ? "Translating..." : "Translation will appear here..."}
              </span>
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {syncedParagraphs.map(({ hebrew, english, index: paraIndex }) => {
          // For Hebrew→English: Hebrew is source (left), English is translation (right)
          // For English→Hebrew: English is source (left), Hebrew is translation (right)
          const leftText = isHebrewToEnglish ? hebrew : english;
          const rightText = isHebrewToEnglish ? english : hebrew;
          const leftIsHebrew = isHebrewToEnglish;
          const rightIsHebrew = !isHebrewToEnglish;

          const renderClickableHebrew = (text: string, isTranslation: boolean) => {
            if (!text.trim()) {
              if (!isTranslation) return <p className="whitespace-pre-wrap" />;

              return (
                <p className="whitespace-pre-wrap">
                  <span className="text-gray-400">
                    {translating ? "Translating..." : "Translation will appear here..."}
                  </span>
                </p>
              );
            }

            const words = text.split(/(\s+|\n)/);
            return (
              <p className="whitespace-pre-wrap">
                {words.map((word, index) => {
                  if (word === "\n") return <br key={index} />;

                  const trimmedWord = word.trim();
                  if (!trimmedWord) return <span key={index}>{word}</span>;

                  const isSaved = savedWords.has(trimmedWord);

                  return (
                    <span
                      key={index}
                      onClick={handleWordClick}
                      className={`cursor-pointer hover:bg-blue-100 px-0.5 rounded transition ${
                        isSaved ? "bg-green-50 border-b-2 border-green-400" : ""
                      }`}
                    >
                      {word}
                    </span>
                  );
                })}
              </p>
            );
          };

          const renderPlainText = (text: string, isTranslation: boolean) => (
            <p className="whitespace-pre-wrap">
              {translating && isTranslation ? (
                <span className="text-gray-400">Translating...</span>
              ) : text ? (
                text
              ) : isTranslation ? (
                <span className="text-gray-400">Translation will appear here...</span>
              ) : null}
            </p>
          );

          return (
            <div key={paraIndex} className="grid grid-cols-2 gap-6">
              {/* Left side */}
              <div
                className="text-xl leading-relaxed"
                dir={leftIsHebrew ? "rtl" : "ltr"}
                lang={leftIsHebrew ? "he" : "en"}
              >
                {leftIsHebrew ? renderClickableHebrew(leftText, false) : renderPlainText(leftText, false)}
              </div>

              {/* Right side */}
              <div
                className="text-xl leading-relaxed"
                dir={rightIsHebrew ? "rtl" : "ltr"}
                lang={rightIsHebrew ? "he" : "en"}
              >
                {rightIsHebrew ? renderClickableHebrew(rightText, true) : renderPlainText(rightText, true)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

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
          <div className="flex items-center gap-1 sm:gap-2">
            {!isGuest && (
              <>
                <button
                  onClick={() => setShowBookmarkManager(true)}
                  className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                  title="Bookmarks"
                >
                  <Bookmark className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowSaveBookmark(true)}
                  disabled={!sourceText}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Save bookmark"
                >
                  <BookmarkPlus className="w-5 h-5" />
                </button>
              </>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            <button
              onClick={triggerFileInput}
              disabled={processingImage}
              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
              title="Upload image with Hebrew text"
            >
              {processingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            </button>
            <button
              onClick={() => handleCopy(sourceText)}
              disabled={!sourceText}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
              title="Copy source text"
            >
              <Copy className="w-5 h-5" />
            </button>
            <button
              onClick={clearAll}
              disabled={!sourceText}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
              title="Clear all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {bibleLoaded && currentBibleRef && (
          <div className="mb-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Book className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-gray-800">
                  {BIBLE_BOOKS.find((b) => b.name === currentBibleRef.book)?.hebrewName} {currentBibleRef.chapter} /{" "}
                  {BIBLE_BOOKS.find((b) => b.name === currentBibleRef.book)?.name} {currentBibleRef.chapter}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateChapter("prev")}
                  disabled={!canNavigatePrev()}
                  className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Previous chapter"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigateChapter("next")}
                  disabled={!canNavigateNext()}
                  className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Next chapter"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
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
            renderSyncedText()
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
        onSubmit={handleTextInputSubmit}
      />
    </div>
  );
}

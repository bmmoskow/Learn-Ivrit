import {
  Languages,
  Copy,
  X,
  Loader2,
  BookPlus,
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
  Book,
  Upload,
  Bookmark,
  BookmarkPlus,
  Sparkles,
} from "lucide-react";
import { BIBLE_BOOKS } from "../../data/bibleBooks";
import { SyncedParagraph } from "./translationPanelUtils";

interface TranslationPanelUIProps {
  // State
  hebrewText: string;
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
  setHebrewText: (text: string) => void;
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
  hebrewText,
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
  setHebrewText,
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
  const renderSyncedText = () => {
    if (!syncedParagraphs) return null;

    return (
      <div className="space-y-6">
        {syncedParagraphs.map(({ hebrew, english, index: paraIndex }) => {
          const words = hebrew.split(/(\s+|\n)/);

          return (
            <div key={paraIndex} className="grid grid-cols-2 gap-6">
              {/* Hebrew side */}
              <div className="text-xl leading-relaxed" dir="rtl" lang="he">
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
              </div>

              {/* English side */}
              <div className="text-xl leading-relaxed">
                <p className="whitespace-pre-wrap">
                  {translating ? (
                    <span className="text-gray-400">Translating...</span>
                  ) : english ? (
                    english
                  ) : (
                    <span className="text-gray-400">Translation will appear here...</span>
                  )}
                </p>
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Languages className="w-5 h-5 text-blue-600" />
              Translation Panel
            </h2>
          </div>
          <div className="flex gap-2">
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
                  disabled={!hebrewText}
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
              onClick={() => handleCopy(hebrewText)}
              disabled={!hebrewText}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
              title="Copy Hebrew text"
            >
              <Copy className="w-5 h-5" />
            </button>
            <button
              onClick={clearAll}
              disabled={!hebrewText}
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

        {hebrewText && !isGuest && !bibleLoaded && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 flex items-center gap-2">
              <BookPlus className="w-4 h-4" />
              Click on Hebrew words to see definitions and add them to your vocabulary list
            </p>
          </div>
        )}
        {hebrewText && isGuest && !bibleLoaded && (
          <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <BookPlus className="w-4 h-4" />
              Click on Hebrew words to see definitions (sign in to save words)
            </p>
          </div>
        )}

        <div className="flex-1 min-h-[500px] border-2 border-gray-200 rounded-lg p-4 focus-within:border-blue-500 transition">
          {hebrewText ? (
            renderSyncedText()
          ) : showBibleInput ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-full max-w-md space-y-3">
                <div className="flex flex-col gap-3">
                  <select
                    value={selectedBook}
                    onChange={(e) => setSelectedBook(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select Book</option>
                    {BIBLE_BOOKS.map((book) => (
                      <option key={book.name} value={book.name}>
                        {book.hebrewName} ({book.name})
                      </option>
                    ))}
                  </select>
                  {selectedBook && (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max={BIBLE_BOOKS.find((b) => b.name === selectedBook)?.chapters || 1}
                        value={selectedChapter}
                        onChange={(e) => setSelectedChapter(Number(e.target.value))}
                        placeholder="Chapter"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        onClick={() => loadFromBible()}
                        disabled={!selectedBook || !selectedChapter || loadingBible}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {loadingBible ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <Book className="w-4 h-4" />
                            Load
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowBibleInput(false);
                    setSelectedBook("");
                    setSelectedChapter(1);
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : showUrlInput ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-full max-w-md space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && loadFromUrl()}
                    placeholder="Enter URL (e.g., https://www.ynet.co.il/...)"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={loadFromUrl}
                    disabled={!urlInput.trim() || loadingUrl}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loadingUrl ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <LinkIcon className="w-4 h-4" />
                        Load
                      </>
                    )}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowUrlInput(false);
                    setUrlInput("");
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="relative h-full">
              <textarea
                value={hebrewText}
                onChange={(e) => setHebrewText(e.target.value)}
                placeholder=""
                className="w-full h-full resize-none outline-none text-xl"
                dir="rtl"
                lang="he"
              />
              <div className="absolute top-2 left-2 text-gray-400 pointer-events-none text-sm leading-relaxed">
                Paste Hebrew text here,{" "}
                <span
                  className="text-green-600 underline cursor-pointer pointer-events-auto"
                  onClick={triggerFileInput}
                >
                  upload image
                </span>
                ,{" "}
                <span
                  className="text-blue-600 underline cursor-pointer pointer-events-auto"
                  onClick={() => setShowUrlInput(true)}
                >
                  load from URL
                </span>
                ,{" "}
                <span
                  className="text-purple-600 underline cursor-pointer pointer-events-auto"
                  onClick={() => setShowBibleInput(true)}
                >
                  load from Bible
                </span>
                {!isGuest && (
                  <>
                    , or{" "}
                    <span
                      className="text-amber-600 underline cursor-pointer pointer-events-auto"
                      onClick={() => setShowPassageGenerator(true)}
                    >
                      generate with AI
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {!hebrewText && !showUrlInput && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setHebrewText("שלום עולם")}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Try "שלום עולם"
              </button>
              <button
                onClick={() => setHebrewText("אני לומד עברית")}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Try "אני לומד עברית"
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
    </div>
  );
}

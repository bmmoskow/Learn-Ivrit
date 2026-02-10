import { Loader2, Book } from "lucide-react";
import { BIBLE_BOOKS } from "../../../data/bibleBooks";

interface BibleInputProps {
  selectedBook: string;
  selectedChapter: number;
  loadingBible: boolean;
  setSelectedBook: (book: string) => void;
  setSelectedChapter: (chapter: number) => void;
  setShowBibleInput: (show: boolean) => void;
  loadFromBible: () => void;
}

export function BibleInput({
  selectedBook,
  selectedChapter,
  loadingBible,
  setSelectedBook,
  setSelectedChapter,
  setShowBibleInput,
  loadFromBible,
}: BibleInputProps) {
  return (
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
  );
}

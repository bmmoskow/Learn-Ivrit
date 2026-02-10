import { Book, ChevronLeft, ChevronRight } from "lucide-react";
import { BIBLE_BOOKS } from "../../../data/bibleBooks";

interface BibleNavigationBarProps {
  currentBibleRef: { book: string; chapter: number };
  navigateChapter: (direction: "prev" | "next") => void;
  canNavigatePrev: () => boolean;
  canNavigateNext: () => boolean;
}

export function BibleNavigationBar({
  currentBibleRef,
  navigateChapter,
  canNavigatePrev,
  canNavigateNext,
}: BibleNavigationBarProps) {
  return (
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
  );
}

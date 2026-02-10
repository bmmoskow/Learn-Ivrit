import {
  Copy,
  X,
  Loader2,
  Upload,
  Bookmark,
  BookmarkPlus,
} from "lucide-react";

interface ToolbarProps {
  sourceText: string;
  processingImage: boolean;
  isGuest: boolean;
  setShowBookmarkManager: (show: boolean) => void;
  setShowSaveBookmark: (show: boolean) => void;
  handleCopy: (text: string) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  clearAll: () => void;
  triggerFileInput: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export function Toolbar({
  sourceText,
  processingImage,
  isGuest,
  setShowBookmarkManager,
  setShowSaveBookmark,
  handleCopy,
  handleFileSelect,
  clearAll,
  triggerFileInput,
  fileInputRef,
}: ToolbarProps) {
  return (
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
  );
}

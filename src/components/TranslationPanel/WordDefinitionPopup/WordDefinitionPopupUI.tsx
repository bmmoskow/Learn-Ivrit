import { X, Loader2, BookmarkPlus, Check, RefreshCw } from "lucide-react";
import { Definition, RelatedWord, calculatePopupPosition } from "./wordDefinitionPopupUtils";

interface WordDefinitionPopupUIProps {
  currentWord: string;
  definition: Definition | null;
  loading: boolean;
  saving: boolean;
  saved: boolean;
  error: string;
  isGuest: boolean;
  hasValidDefinition: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onRefresh: () => void;
  onWordClick: (word: string) => void;
  onSave: () => void;
}

export function WordDefinitionPopupUI({
  currentWord,
  definition,
  loading,
  saving,
  saved,
  error,
  isGuest,
  hasValidDefinition,
  position,
  onClose,
  onRefresh,
  onWordClick,
  onSave,
}: WordDefinitionPopupUIProps) {
  const { left, top, maxHeight } = calculatePopupPosition(position, window.innerWidth, window.innerHeight);

  const popupStyle = {
    position: "fixed" as const,
    left,
    top,
    transform: "translateX(-50%)",
    maxHeight: `${maxHeight}px`,
    zIndex: 1000,
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-20 z-[999]" onClick={onClose} />
      <div style={popupStyle} className="bg-white rounded-lg shadow-2xl border border-gray-200 w-80 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              {definition && <p className="text-blue-100 text-sm italic">{definition.transliteration}</p>}
              <h3 className="text-2xl font-bold" dir="rtl">
                {definition?.wordWithVowels || currentWord}
              </h3>
            </div>
            {definition && definition.shortEnglish && (
              <div className="mt-2 flex flex-wrap gap-x-1 gap-y-0.5">
                {definition.shortEnglish.split(";").map((translation, idx, arr) => (
                  <span key={idx} className="text-white text-base font-medium">
                    {translation.trim()}
                    {idx < arr.length - 1 && <span className="text-blue-200 mx-1">•</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="text-white hover:bg-blue-500 rounded-lg p-1 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh definition"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={onClose} className="text-white hover:bg-blue-500 rounded-lg p-1 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {!loading && definition && definition.relatedWords && definition.relatedWords.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Related Words</p>
            <div className="space-y-1.5">
              {definition.relatedWords.map((relatedWord: RelatedWord, idx: number) => (
                <button
                  key={idx}
                  onClick={() => onWordClick(relatedWord.hebrew)}
                  className="w-full text-left p-2 bg-gray-50 hover:bg-blue-50 rounded-lg transition group border border-gray-200 hover:border-blue-300"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <span className="text-base font-medium text-gray-900 group-hover:text-blue-700" dir="rtl">
                        {relatedWord.hebrew}
                      </span>
                      <span className="text-sm text-gray-600 ml-2">{relatedWord.english}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{relatedWord.relationship}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="p-4 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        )}

        {error && !definition && !loading && (
          <div className="p-4 text-center">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {definition && !loading && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            {isGuest && (
              <p className="text-sm text-gray-600 text-center mb-2">
                Sign up for an account to save words to your vocabulary
              </p>
            )}
            {!hasValidDefinition && !isGuest && (
              <p className="text-sm text-amber-600 text-center mb-2">
                Cannot save word without a valid definition
              </p>
            )}
            <button
              onClick={onSave}
              disabled={saving || saved || isGuest || !hasValidDefinition}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <Check className="w-5 h-5" />
                  Saved to Vocabulary
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-5 h-5" />
                  Add to Vocabulary
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

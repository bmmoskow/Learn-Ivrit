import { SyncedParagraph, TranslationDirection } from "../translationPanelUtils";

interface SyncedTextDisplayProps {
  sourceText: string;
  translationDirection: TranslationDirection;
  translating: boolean;
  savedWords: Set<string>;
  syncedParagraphs: SyncedParagraph[] | null;
  handleWordClick: (e: React.MouseEvent<HTMLSpanElement>) => void;
}

export function SyncedTextDisplay({
  sourceText,
  translationDirection,
  translating,
  savedWords,
  syncedParagraphs,
  handleWordClick,
}: SyncedTextDisplayProps) {
  const isHebrewToEnglish = translationDirection === "hebrew-to-english";

  if (!syncedParagraphs) {
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
      {text ? (
        text
      ) : isTranslation ? (
        <span className="text-gray-400">
          {translating ? "Translating..." : "Translation will appear here..."}
        </span>
      ) : null}
    </p>
  );

  return (
    <div className="space-y-6">
      {syncedParagraphs.map(({ hebrew, english, index: paraIndex }) => {
        const leftText = isHebrewToEnglish ? hebrew : english;
        const rightText = isHebrewToEnglish ? english : hebrew;
        const leftIsHebrew = isHebrewToEnglish;
        const rightIsHebrew = !isHebrewToEnglish;

        return (
          <div key={paraIndex} className="grid grid-cols-2 gap-6">
            <div
              className="text-xl leading-relaxed"
              dir={leftIsHebrew ? "rtl" : "ltr"}
              lang={leftIsHebrew ? "he" : "en"}
            >
              {leftIsHebrew ? renderClickableHebrew(leftText, false) : renderPlainText(leftText, false)}
            </div>
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
}

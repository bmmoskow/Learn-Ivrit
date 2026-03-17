import { Loader2, Link as LinkIcon, Info } from "lucide-react";

interface UrlInputProps {
  urlInput: string;
  loadingUrl: boolean;
  setUrlInput: (url: string) => void;
  setShowUrlInput: (show: boolean) => void;
  loadFromUrl: () => void;
}

export function UrlInput({
  urlInput,
  loadingUrl,
  setUrlInput,
  setShowUrlInput,
  loadFromUrl,
}: UrlInputProps) {
  return (
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
            disabled={!urlInput.trim() || loadingUrl || !/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}/i.test(urlInput.trim())}
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
        <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Text extraction may not work for all websites. Sites with paywalls, heavy JavaScript, or non-standard layouts may produce incomplete or missing results.</span>
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
  );
}

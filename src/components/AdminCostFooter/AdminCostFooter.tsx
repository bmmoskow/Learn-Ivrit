import { useAdminRole } from "../hooks/useAdminRole";
import { useLastTransaction } from "./Admin/useLastTransaction";

function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function formatType(type: string): string {
  const labels: Record<string, string> = {
    translate: "Translation",
    define: "Definition",
    ocr: "OCR",
    passage_generation: "Passage",
  };
  return labels[type] || type;
}

/**
 * A small footer banner visible only to admins showing the cost of the
 * most recent API transaction in real-time.
 */
export function AdminCostFooter() {
  const { isAdmin, loading } = useAdminRole();
  const { lastTx } = useLastTransaction();

  if (loading || !isAdmin) return null;

  return (
    <div className="bg-amber-50 border-t border-amber-200 px-4 py-2 text-xs text-amber-800 flex items-center justify-between">
      {lastTx ? (
        <span>
          💰 {formatType(lastTx.request_type)}
          {lastTx.call_count > 1 && (
            <span className="ml-1 text-amber-600">({lastTx.call_count} calls)</span>
          )}
          {lastTx.cache_hit ? (
            <span className="ml-1 text-green-700 font-medium">(cache hit — $0)</span>
          ) : (
            <>
              {": "}
              <span className="font-medium">${lastTx.cost.toFixed(4)}</span>
              <span className="ml-2 text-amber-600">
                ({formatTokens(lastTx.prompt_tokens + lastTx.candidates_tokens + lastTx.thinking_tokens)} tokens)
              </span>
            </>
          )}
        </span>
      ) : (
        <span>💰 No recent API calls</span>
      )}
      <a href="/admin" className="underline font-medium hover:text-amber-900 ml-4 shrink-0">
        Usage dashboard →
      </a>
    </div>
  );
}

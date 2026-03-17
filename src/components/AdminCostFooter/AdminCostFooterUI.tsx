import type { LastTransaction } from "../Admin/useLastTransaction";
import { formatTokens, formatType } from "./adminCostFooterUtils";

export interface AdminCostFooterUIProps {
  lastTx: LastTransaction | null;
}

export function AdminCostFooterUI({ lastTx }: AdminCostFooterUIProps) {
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

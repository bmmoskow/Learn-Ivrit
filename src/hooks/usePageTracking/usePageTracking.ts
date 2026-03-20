import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../../../supabase/client";

const FLUSH_INTERVAL_MS = 60_000; // flush every 60s of active time

/**
 * Tracks active time on each page and logs anonymous aggregates
 * to page_views_daily via the log_page_view RPC function.
 *
 * Uses visibilitychange to pause/resume tracking when the tab is hidden.
 * Flushes accumulated seconds periodically and on page navigation.
 */
export function usePageTracking() {
  const location = useLocation();
  const activeSecondsRef = useRef(0);
  const lastTickRef = useRef<number>(Date.now());
  const isVisibleRef = useRef(!document.hidden);
  const currentPageRef = useRef(location.pathname);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Flush accumulated seconds to Supabase
  const flush = (page: string) => {
    const seconds = Math.round(activeSecondsRef.current);
    if (seconds <= 0) return;

    activeSecondsRef.current = 0;

    // Fire-and-forget RPC call
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc("log_page_view", {
      p_page: page,
      p_active_seconds: seconds,
    }).then(({ error }: { error: unknown }) => {
      if (error) console.error("Failed to log page view:", error);
    });
  };

  // Tick: accumulate active time
  const tick = () => {
    if (!isVisibleRef.current) return;
    const now = Date.now();
    const elapsed = (now - lastTickRef.current) / 1000;
    activeSecondsRef.current += elapsed;
    lastTickRef.current = now;
  };

  useEffect(() => {
    // Page changed — flush previous page's time, reset for new page
    const prevPage = currentPageRef.current;
    if (prevPage !== location.pathname) {
      tick(); // capture any remaining time
      flush(prevPage);
    }
    currentPageRef.current = location.pathname;
    lastTickRef.current = Date.now();
    activeSecondsRef.current = 0;
  }, [location.pathname]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab became hidden — accumulate time and pause
        tick();
        isVisibleRef.current = false;
      } else {
        // Tab became visible — restart tick timer
        isVisibleRef.current = true;
        lastTickRef.current = Date.now();
      }
    };

    const handleBeforeUnload = () => {
      tick();
      flush(currentPageRef.current);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    // Periodic flush
    intervalRef.current = setInterval(() => {
      tick();
      flush(currentPageRef.current);
    }, FLUSH_INTERVAL_MS);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
      if (intervalRef.current) clearInterval(intervalRef.current);

      // Final flush on unmount
      tick();
      flush(currentPageRef.current);
    };
  }, []);
}

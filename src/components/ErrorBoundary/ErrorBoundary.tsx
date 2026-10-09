import { Component, ErrorInfo, ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

/**
 * App-wide error boundary. Catches render-time exceptions anywhere in the tree
 * and shows a recovery screen instead of a blank page. The "Reset app data"
 * action clears localStorage, which recovers users whose stored state (e.g. a
 * corrupt persisted session) wedges the app.
 *
 * Note: error boundaries do NOT catch errors thrown in async callbacks or event
 * handlers — the async session restore is guarded separately in AuthContext.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Caught render error:", error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    // Clear per-user cached state that can wedge the app, then reload fresh.
    try {
      localStorage.clear();
    } catch {
      // storage unavailable — reload anyway
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
          <p className="mt-2 text-gray-600">
            The app ran into an unexpected error. Reloading usually fixes it. If it keeps
            happening, resetting the app&apos;s stored data will clear anything stale.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Reset app data &amp; reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}

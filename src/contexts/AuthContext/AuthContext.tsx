/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, AuthError } from "@supabase/supabase-js";
import { supabase } from "../../../supabase/client";
import { retryWithBackoff } from "../../utils/retryWithBackoff/retryWithBackoff";

type AuthContextType = {
  user: User | null;
  isGuest: boolean;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null; data?: { user: User | null } }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInAsGuest: () => void;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// If Supabase auth initialization hasn't settled within this window, stop
// waiting and continue logged-out. A HANGING restore (e.g. an invalid stored
// token whose refresh never resolves) would otherwise leave the app spinning
// forever — a rejecting restore is handled by the catch below, but a promise
// that never settles slips past it.
const AUTH_INIT_TIMEOUT_MS = 8000;

/**
 * Remove any persisted Supabase auth token from localStorage. Used to recover
 * from a corrupt or unrefreshable stored session so a returning user isn't left
 * stuck on the loading screen — the app falls back to logged-out instead.
 */
function clearStoredSupabaseAuth() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("sb-") && key.includes("-auth-token"))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // storage unavailable — nothing to clear
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for guest mode in localStorage FIRST (before Supabase config check).
    // Reading localStorage can throw (privacy mode / disabled storage); never let
    // that wedge startup.
    let guestMode: string | null = null;
    try {
      guestMode = localStorage.getItem("guestMode");
    } catch {
      // storage unavailable — fall through to normal auth
    }
    if (guestMode === "true") {
      setIsGuest(true);
      setLoading(false);
      return;
    }

    // Check if Supabase is properly configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    // This app uses the anon key for the browser client
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn("Supabase not configured - authentication will not work, but guest mode is available");
      setLoading(false);
      return;
    }

    // Safety net against a HANGING auth init (not just a rejecting one): if
    // neither getSession nor the auth listener settles in time, stop waiting so
    // the user is never stuck on the spinner.
    let settled = false;
    const resolveAuth = () => {
      settled = true;
      setLoading(false);
    };
    const safetyTimer = setTimeout(() => {
      if (settled) return;
      // Last-resort guard. Do NOT clear the stored token here: a hang can occur
      // on a perfectly valid session (e.g. the cross-tab lock contention this
      // guards against), and nuking it would log the user out for no reason.
      // Just stop the spinner; a reload recovers a valid session. (A token that
      // makes restore REJECT is still cleared in the catch below.)
      console.error(
        `[AuthContext] Auth init did not settle within ${AUTH_INIT_TIMEOUT_MS}ms; continuing without a restored session (stored token left intact).`,
      );
      resolveAuth();
    }, AUTH_INIT_TIMEOUT_MS);

    // IMPORTANT: Set up auth listener BEFORE getSession to avoid race conditions
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        console.log("[AuthContext] onAuthStateChange - event:", event, "session:", !!session, "user:", !!session?.user);
        setUser(session?.user ?? null);
        resolveAuth();

        // PASSWORD_RECOVERY events are handled via OTP code entry on the login screen.
        // No redirect needed.

        if (event === "SIGNED_IN" && session?.user) {
          const { error } = await supabase.from("profiles").upsert(
            {
              id: session.user.id,
              email: session.user.email!,
              full_name: session.user.user_metadata?.full_name || null,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "id",
            },
          );

          if (error) {
            console.error("Error upserting profile:", error);
          }
        }
      })();
    });

    // Get initial session after listener is set up.
    // A corrupt or unrefreshable stored session must NOT wedge the app on the
    // loading screen: with no catch, a rejected getSession() leaves loading=true
    // forever (a permanent spinner). Clear the bad token and continue logged-out.
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) throw error;
        setUser(session?.user ?? null);
      })
      .catch((err) => {
        console.error(
          "[AuthContext] Could not restore session; clearing stored auth and continuing logged-out:",
          err,
        );
        clearStoredSupabaseAuth();
        setUser(null);
      })
      .finally(() => resolveAuth());

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, _fullName?: string) => {
    const { data, error } = await retryWithBackoff(() =>
      supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: _fullName || null } },
      })
    );

    return { error, data: { user: data?.user ?? null } };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await retryWithBackoff(() => supabase.auth.signInWithPassword({ email, password }));

    if (!error && data.session) {
      setUser(data.session.user);
    }

    return { error };
  };
  const signInAsGuest = () => {
    localStorage.setItem("guestMode", "true");
    setIsGuest(true);
    setUser(null);
  };

  const signOut = async () => {
    if (isGuest) {
      localStorage.removeItem("guestMode");
      setIsGuest(false);
    } else {
      await supabase.auth.signOut();
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await retryWithBackoff(() =>
      supabase.auth.resetPasswordForEmail(email)
    );
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, isGuest, loading, signUp, signIn, signInAsGuest, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

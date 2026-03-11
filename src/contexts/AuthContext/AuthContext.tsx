/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, AuthError } from "@supabase/supabase-js";
import { supabase } from "../../../supabase/client";
import { retryWithBackoff } from "../../utils/retryWithBackoff/retryWithBackoff";

type AuthContextType = {
  user: User | null;
  isGuest: boolean;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInAsGuest: () => void;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for guest mode in localStorage FIRST (before Supabase config check)
    const guestMode = localStorage.getItem("guestMode");
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

    // IMPORTANT: Set up auth listener BEFORE getSession to avoid race conditions
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        console.log("[AuthContext] onAuthStateChange - event:", event, "session:", !!session, "user:", !!session?.user);
        setUser(session?.user ?? null);
        setLoading(false);

        // PASSWORD_RECOVERY events are handled via OTP code entry on the login screen.
        // No redirect needed.

        if (event === "SIGNED_IN" && session?.user) {
          const { error } = await supabase.from("profiles").upsert(
            {
              id: session.user.id,
              email: session.user.email!,
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

    // Get initial session after listener is set up
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await retryWithBackoff(() => supabase.auth.signUp({ email, password }));

    if (!error && data.user) {
      // Profile creation also retries on 5xx
      await retryWithBackoff(async () => {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user!.id,
          email: data.user!.email!,
          full_name: fullName || null,
        });

        if (profileError) {
          console.error("Error creating profile:", profileError);
        }
      });
    }

    return { error };
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
      supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
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

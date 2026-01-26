import { supabase } from "../../../supabase/client";

/**
 * Gets the authorization header for API requests.
 * Returns the user's session token if authenticated, otherwise falls back to the anon key for guest access.
 * This centralizes the auth header logic used across translation, OCR, URL extraction, and passage generation.
 */
export async function getAuthHeader(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    return `Bearer ${session.access_token}`;
  }

  // Guest mode - use anon key
  return `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
}

/**
 * Gets just the auth token (without "Bearer " prefix) for API requests.
 */
export async function getAuthToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
}

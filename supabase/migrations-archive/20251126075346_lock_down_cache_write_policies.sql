/*
  # Lock Down Cache Table Write Access

  ## Summary
  Restrict write access to cache tables so only the service role (edge functions) can insert/update data.
  This prevents authenticated users from polluting the shared cache with fake or malicious data.

  ## Changes Made

  1. **word_definitions table**
     - DROP existing policy allowing authenticated users to insert
     - DROP existing policy allowing authenticated users to update
     - DROP existing policy allowing authenticated users to delete
     - CREATE new INSERT policy for service_role only
     - CREATE new UPDATE policy for service_role only
     - Keep SELECT policy for authenticated users (shared reading is intentional)

  2. **translation_cache table**
     - DROP existing policies allowing authenticated users to insert/update
     - CREATE new INSERT policy for service_role only
     - CREATE new UPDATE policy for service_role only
     - Keep SELECT policy for authenticated users (shared reading is intentional)

  ## Security Impact
  - Prevents cache poisoning attacks
  - Prevents users from inserting fake translations/definitions
  - Maintains shared read access for performance benefits
  - Only edge functions can write to cache (as intended)

  ## Notes
  - Edge functions already use service_role key, so no code changes needed
  - Users can still read all cached data (this is intentional for performance)
*/

-- ============================================================
-- word_definitions table - Lock down write access
-- ============================================================

-- Drop existing policies that allow authenticated users to write
DROP POLICY IF EXISTS "Authenticated users can insert word definitions" ON word_definitions;
DROP POLICY IF EXISTS "Authenticated users can update word definitions" ON word_definitions;
DROP POLICY IF EXISTS "Users can update their own word definitions" ON word_definitions;
DROP POLICY IF EXISTS "Authenticated users can delete word definitions" ON word_definitions;

-- Create service_role-only policies
CREATE POLICY "Service role can insert word definitions"
  ON word_definitions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update word definitions"
  ON word_definitions
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- translation_cache table - Lock down write access
-- ============================================================

-- Drop existing policies that allow authenticated users to write
DROP POLICY IF EXISTS "Authenticated users can insert translation cache" ON translation_cache;
DROP POLICY IF EXISTS "Authenticated users can update translation cache" ON translation_cache;

-- Create service_role-only policies
CREATE POLICY "Service role can insert translation cache"
  ON translation_cache
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update translation cache"
  ON translation_cache
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

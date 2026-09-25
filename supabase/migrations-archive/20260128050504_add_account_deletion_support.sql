/*
  # Add Account Deletion Support

  ## Overview
  Adds support for user account deletion with proper cascade handling and a secure deletion function.

  ## 1. Schema Changes

  ### Fix Missing Foreign Key Constraints
  - Add ON DELETE CASCADE to bookmark_folders.user_id
  - Add ON DELETE CASCADE to bookmarks.user_id

  These were missing in the original bookmark creation migration.

  ## 2. New Functions

  ### `delete_user_account()`
  - Secure function for users to delete their own accounts
  - Validates that user is authenticated
  - Deletes from auth.users, which cascades to all related tables:
    * profiles
    * vocabulary_words
    * word_statistics
    * user_tests
    * test_responses
    * bookmark_folders
    * bookmarks
  - Returns success status

  ## 3. Security
  - Function is SECURITY DEFINER (runs with elevated privileges)
  - Validates user authentication before deletion
  - Only allows users to delete their own account
  - RLS policies automatically apply during cascade deletes

  ## 4. Important Notes
  - This is a destructive operation and cannot be undone
  - All user data is permanently deleted
  - Cache tables (translation_cache, sefaria_cache, etc.) will be cleaned up by their expiration policies
  - Backups may retain data for disaster recovery purposes per privacy policy
*/

-- First, add the missing foreign key constraints to bookmarks tables
-- We need to drop and recreate the tables with proper foreign keys

-- Add foreign key constraint to bookmark_folders
DO $$
BEGIN
  -- Check if the constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bookmark_folders_user_id_fkey'
    AND table_name = 'bookmark_folders'
  ) THEN
    ALTER TABLE public.bookmark_folders
    ADD CONSTRAINT bookmark_folders_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint to bookmarks
DO $$
BEGIN
  -- Check if the constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bookmarks_user_id_fkey'
    AND table_name = 'bookmarks'
  ) THEN
    ALTER TABLE public.bookmarks
    ADD CONSTRAINT bookmarks_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Create a secure function for users to delete their own accounts
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get the current user's ID
  current_user_id := auth.uid();

  -- Verify user is authenticated
  IF current_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Delete the user from auth.users
  -- This will cascade delete all related data in other tables
  DELETE FROM auth.users WHERE id = current_user_id;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'Account successfully deleted'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
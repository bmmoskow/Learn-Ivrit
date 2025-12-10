-- Remove english_translation column from bookmarks table
-- Translations will be fetched from cache or re-generated on load
ALTER TABLE public.bookmarks DROP COLUMN IF EXISTS english_translation;

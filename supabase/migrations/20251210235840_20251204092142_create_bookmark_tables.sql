-- Create bookmark_folders table
CREATE TABLE IF NOT EXISTS public.bookmark_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  parent_folder_id UUID REFERENCES public.bookmark_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, parent_folder_id, name)
);

-- Create bookmarks table
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  folder_id UUID REFERENCES public.bookmark_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hebrew_text TEXT NOT NULL,
  english_translation TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, folder_id, name)
);

-- Enable RLS
ALTER TABLE public.bookmark_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS policies for bookmark_folders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'bookmark_folders' 
    AND policyname = 'Users can view own folders'
  ) THEN
    CREATE POLICY "Users can view own folders"
    ON public.bookmark_folders FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'bookmark_folders' 
    AND policyname = 'Users can create own folders'
  ) THEN
    CREATE POLICY "Users can create own folders"
    ON public.bookmark_folders FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'bookmark_folders' 
    AND policyname = 'Users can update own folders'
  ) THEN
    CREATE POLICY "Users can update own folders"
    ON public.bookmark_folders FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'bookmark_folders' 
    AND policyname = 'Users can delete own folders'
  ) THEN
    CREATE POLICY "Users can delete own folders"
    ON public.bookmark_folders FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- RLS policies for bookmarks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'bookmarks' 
    AND policyname = 'Users can view own bookmarks'
  ) THEN
    CREATE POLICY "Users can view own bookmarks"
    ON public.bookmarks FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'bookmarks' 
    AND policyname = 'Users can create own bookmarks'
  ) THEN
    CREATE POLICY "Users can create own bookmarks"
    ON public.bookmarks FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'bookmarks' 
    AND policyname = 'Users can update own bookmarks'
  ) THEN
    CREATE POLICY "Users can update own bookmarks"
    ON public.bookmarks FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'bookmarks' 
    AND policyname = 'Users can delete own bookmarks'
  ) THEN
    CREATE POLICY "Users can delete own bookmarks"
    ON public.bookmarks FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Trigger for updated_at on bookmark_folders
DROP TRIGGER IF EXISTS update_bookmark_folders_updated_at ON public.bookmark_folders;
CREATE TRIGGER update_bookmark_folders_updated_at
BEFORE UPDATE ON public.bookmark_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on bookmarks
DROP TRIGGER IF EXISTS update_bookmarks_updated_at ON public.bookmarks;
CREATE TRIGGER update_bookmarks_updated_at
BEFORE UPDATE ON public.bookmarks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
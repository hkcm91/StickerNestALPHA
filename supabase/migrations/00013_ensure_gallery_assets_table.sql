-- Ensure gallery_assets exists even if older duplicate-version migrations were skipped.

CREATE TABLE IF NOT EXISTS public.gallery_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  thumbnail_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_assets_owner_id
  ON public.gallery_assets(owner_id);

CREATE INDEX IF NOT EXISTS idx_gallery_assets_storage_path
  ON public.gallery_assets(storage_path);

CREATE INDEX IF NOT EXISTS idx_gallery_assets_tags
  ON public.gallery_assets USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_gallery_assets_created_at
  ON public.gallery_assets(owner_id, created_at DESC);

ALTER TABLE public.gallery_assets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'gallery_assets'
      AND policyname = 'Users can read own gallery assets'
  ) THEN
    CREATE POLICY "Users can read own gallery assets"
      ON public.gallery_assets
      FOR SELECT
      USING (auth.uid() = owner_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'gallery_assets'
      AND policyname = 'Users can insert own gallery assets'
  ) THEN
    CREATE POLICY "Users can insert own gallery assets"
      ON public.gallery_assets
      FOR INSERT
      WITH CHECK (auth.uid() = owner_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'gallery_assets'
      AND policyname = 'Users can update own gallery assets'
  ) THEN
    CREATE POLICY "Users can update own gallery assets"
      ON public.gallery_assets
      FOR UPDATE
      USING (auth.uid() = owner_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'gallery_assets'
      AND policyname = 'Users can delete own gallery assets'
  ) THEN
    CREATE POLICY "Users can delete own gallery assets"
      ON public.gallery_assets
      FOR DELETE
      USING (auth.uid() = owner_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_gallery_assets_updated_at'
  ) THEN
    CREATE TRIGGER update_gallery_assets_updated_at
      BEFORE UPDATE ON public.gallery_assets
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END;
$$;

COMMENT ON TABLE public.gallery_assets
  IS 'User-uploaded gallery assets metadata. Files are stored in Supabase Storage.';

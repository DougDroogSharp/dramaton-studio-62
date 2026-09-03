-- Add user_id column to games table (nullable initially for existing data)
ALTER TABLE public.games 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing policies
DROP POLICY IF EXISTS "Games are publicly readable" ON public.games;
DROP POLICY IF EXISTS "Anyone can create games" ON public.games;
DROP POLICY IF EXISTS "Anyone can update games" ON public.games;

DROP POLICY IF EXISTS "Game versions are publicly readable" ON public.game_versions;
DROP POLICY IF EXISTS "Anyone can create game versions" ON public.game_versions;
DROP POLICY IF EXISTS "Anyone can update game versions" ON public.game_versions;

-- New RLS policies for games
CREATE POLICY "Anyone can read games" ON public.games
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create games" ON public.games
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update their games" ON public.games
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete their games" ON public.games
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- New RLS policies for game_versions (via game ownership)
CREATE POLICY "Anyone can read game versions" ON public.game_versions
  FOR SELECT USING (true);

CREATE POLICY "Owners can create versions" ON public.game_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.games 
      WHERE games.id = game_versions.game_id 
      AND games.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update versions" ON public.game_versions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.games 
      WHERE games.id = game_versions.game_id 
      AND games.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete versions" ON public.game_versions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.games 
      WHERE games.id = game_versions.game_id 
      AND games.user_id = auth.uid()
    )
  );
-- Allow authenticated users (via their session JWT) to update their own analyses rows.
-- This makes /api/analyze work even without SUPABASE_SERVICE_ROLE_KEY on Vercel.

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update own analyses" ON analyses;

CREATE POLICY "Users can update own analyses" ON analyses
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT UPDATE ON analyses TO authenticated;


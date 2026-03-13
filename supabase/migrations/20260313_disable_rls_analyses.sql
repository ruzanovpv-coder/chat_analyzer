-- Disable RLS for analyses table
-- Service role key handles authorization in application code
ALTER TABLE analyses DISABLE ROW LEVEL SECURITY;

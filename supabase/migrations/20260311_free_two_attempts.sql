-- Make the app fully free: 2 generations per user, full results by default.

ALTER TABLE public.users
  ALTER COLUMN generations_limit SET DEFAULT 2;

UPDATE public.users
SET generations_limit = 2
WHERE generations_limit IS NULL OR generations_limit < 2;

UPDATE public.analyses
SET is_paid = true
WHERE is_paid IS DISTINCT FROM true;


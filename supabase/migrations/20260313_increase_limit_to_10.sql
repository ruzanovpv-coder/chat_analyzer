-- Increase free generations limit to 10

ALTER TABLE public.users
  ALTER COLUMN generations_limit SET DEFAULT 10;

UPDATE public.users
SET generations_limit = 10
WHERE generations_limit < 10;

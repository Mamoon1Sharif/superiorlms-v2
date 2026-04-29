ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS sequence integer;

-- Backfill existing courses with a sequence based on creation order
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM public.courses
)
UPDATE public.courses c SET sequence = o.rn
FROM ordered o WHERE c.id = o.id AND c.sequence IS NULL;

-- Function to auto-assign next sequence on insert if not provided
CREATE OR REPLACE FUNCTION public.set_course_sequence()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.sequence IS NULL THEN
    SELECT COALESCE(MAX(sequence), 0) + 1 INTO NEW.sequence FROM public.courses;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_course_sequence ON public.courses;
CREATE TRIGGER trg_set_course_sequence
BEFORE INSERT ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.set_course_sequence();
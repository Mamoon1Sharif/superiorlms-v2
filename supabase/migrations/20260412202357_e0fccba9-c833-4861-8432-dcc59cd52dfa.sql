
-- Create regions table
CREATE TABLE public.regions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read regions" ON public.regions FOR SELECT USING (true);
CREATE POLICY "Public insert regions" ON public.regions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update regions" ON public.regions FOR UPDATE USING (true);
CREATE POLICY "Public delete regions" ON public.regions FOR DELETE USING (true);

-- Add region_id to campuses
ALTER TABLE public.campuses ADD COLUMN region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL;

-- Create classes table
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  campus_id UUID NOT NULL REFERENCES public.campuses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read classes" ON public.classes FOR SELECT USING (true);
CREATE POLICY "Public insert classes" ON public.classes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update classes" ON public.classes FOR UPDATE USING (true);
CREATE POLICY "Public delete classes" ON public.classes FOR DELETE USING (true);

-- Add fields to students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

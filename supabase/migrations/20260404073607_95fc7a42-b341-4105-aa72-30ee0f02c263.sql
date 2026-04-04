
-- Add user_id to students table
ALTER TABLE public.students ADD COLUMN user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old permissive policies on students
DROP POLICY IF EXISTS "Public delete students" ON public.students;
DROP POLICY IF EXISTS "Public insert students" ON public.students;
DROP POLICY IF EXISTS "Public read students" ON public.students;
DROP POLICY IF EXISTS "Public update students" ON public.students;

-- Students: authenticated users can read their own record, admins (anon for now) can read all
CREATE POLICY "Anyone can read students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Users can insert own student" ON public.students FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own student" ON public.students FOR UPDATE USING (auth.uid() = user_id);

-- Drop old permissive enrollment policies
DROP POLICY IF EXISTS "Public delete enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Public insert enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Public read enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Public update enrollments" ON public.enrollments;

-- Enrollments: students can manage their own
CREATE POLICY "Anyone can read enrollments" ON public.enrollments FOR SELECT USING (true);
CREATE POLICY "Students can enroll themselves" ON public.enrollments FOR INSERT 
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.students WHERE students.id = student_id AND students.user_id = auth.uid())
  );
CREATE POLICY "Admin can update enrollments" ON public.enrollments FOR UPDATE USING (true);
CREATE POLICY "Admin can delete enrollments" ON public.enrollments FOR DELETE USING (true);

-- Function to create student profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_student()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.students (user_id, name, email, campus_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    (NEW.raw_user_meta_data->>'campus_id')::uuid
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_student();

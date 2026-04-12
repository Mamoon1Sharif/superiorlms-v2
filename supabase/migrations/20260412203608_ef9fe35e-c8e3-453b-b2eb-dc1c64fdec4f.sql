
-- Add max file size setting to assignment_details
ALTER TABLE public.assignment_details ADD COLUMN max_file_size_mb integer NOT NULL DEFAULT 10;

-- Add file fields to assignment_submissions
ALTER TABLE public.assignment_submissions ADD COLUMN file_url text;
ALTER TABLE public.assignment_submissions ADD COLUMN file_name text;

-- Create storage bucket for assignment files
INSERT INTO storage.buckets (id, name, public) VALUES ('assignment-files', 'assignment-files', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload assignment files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'assignment-files');

CREATE POLICY "Anyone can view assignment files"
ON storage.objects FOR SELECT
USING (bucket_id = 'assignment-files');

CREATE POLICY "Users can update their own assignment files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'assignment-files');

CREATE POLICY "Users can delete their own assignment files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'assignment-files');

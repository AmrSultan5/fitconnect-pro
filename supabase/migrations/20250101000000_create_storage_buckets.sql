-- Create storage buckets for Phase 1

-- 1. Create progress-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'progress-photos',
  'progress-photos',
  false,
  10485760, -- 10MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create plan-pdfs bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'plan-pdfs',
  'plan-pdfs',
  false,
  10485760, -- 10MB in bytes
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for progress-photos bucket
-- Folder structure: progress-photos/{clientId}/{yyyy-mm-dd}/{filename}

-- Clients can upload their own photos
CREATE POLICY "Clients can upload their own progress photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'progress-photos' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Clients can read their own photos
CREATE POLICY "Clients can read their own progress photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'progress-photos' AND
  (
    auth.uid()::text = (string_to_array(name, '/'))[1] OR
    public.is_coach_of_client(
      auth.uid(),
      (string_to_array(name, '/'))[1]::uuid
    )
  )
);

-- Clients can delete their own photos
CREATE POLICY "Clients can delete their own progress photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'progress-photos' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- RLS Policies for plan-pdfs bucket
-- Folder structure: plan-pdfs/{coachId}/{clientId}/{planType}/{version}/{filename}

-- Coaches can upload PDFs for their clients
CREATE POLICY "Coaches can upload plan PDFs for their clients"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'plan-pdfs' AND
  auth.uid()::text = (string_to_array(name, '/'))[1] AND
  public.is_coach_of_client(
    auth.uid(),
    (string_to_array(name, '/'))[2]::uuid
  )
);

-- Coaches can read their own uploads
CREATE POLICY "Coaches can read their own plan PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'plan-pdfs' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Clients can read assigned plan PDFs
CREATE POLICY "Clients can read assigned plan PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'plan-pdfs' AND
  auth.uid()::text = (string_to_array(name, '/'))[2] AND
  EXISTS (
    SELECT 1
    FROM public.workout_plans
    WHERE pdf_url LIKE '%' || name || '%'
      AND client_id = auth.uid()
      AND is_active = true
    UNION ALL
    SELECT 1
    FROM public.diet_plans
    WHERE pdf_url LIKE '%' || name || '%'
      AND client_id = auth.uid()
      AND is_active = true
  )
);

-- Coaches can delete their own uploads
CREATE POLICY "Coaches can delete their own plan PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'plan-pdfs' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);


-- Create Storage Bucket for Puzzle Photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('puzzle-photos', 'puzzle-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to photos
CREATE POLICY "Public read access to puzzle photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'puzzle-photos');

-- Allow authenticated inserts (API service role)
CREATE POLICY "Service role can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'puzzle-photos');

-- Allow authenticated updates
CREATE POLICY "Service role can update photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'puzzle-photos');

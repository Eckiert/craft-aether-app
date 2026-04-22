
INSERT INTO storage.buckets (id, name, public)
VALUES ('quote-photos', 'quote-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can view their own quote photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'quote-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own quote photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'quote-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own quote photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'quote-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own quote photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'quote-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

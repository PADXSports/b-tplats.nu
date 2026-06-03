-- Allow wizard uploads before login (anon + authenticated)
DROP POLICY IF EXISTS "Anyone can upload listing images" ON storage.objects;
CREATE POLICY "Anyone can upload listing images"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'listing-images');

DROP POLICY IF EXISTS "Anyone can read listing images" ON storage.objects;
CREATE POLICY "Anyone can read listing images"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'listing-images');

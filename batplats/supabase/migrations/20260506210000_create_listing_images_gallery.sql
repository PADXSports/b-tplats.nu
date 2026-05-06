-- Multi-image gallery support for listings

CREATE TABLE IF NOT EXISTS listing_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id bigint REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view listing images"
  ON listing_images FOR SELECT
  USING (true);

CREATE POLICY "Hosts can insert their listing images"
  ON listing_images FOR INSERT
  WITH CHECK (
    listing_id IN (
      SELECT l.id FROM listings l
      WHERE l.owner_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can delete their listing images"
  ON listing_images FOR DELETE
  USING (
    listing_id IN (
      SELECT l.id FROM listings l
      WHERE l.owner_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can update their listing images"
  ON listing_images FOR UPDATE
  USING (
    listing_id IN (
      SELECT l.id FROM listings l
      WHERE l.owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_listing_images_listing_id ON listing_images(listing_id);

INSERT INTO listing_images (listing_id, image_url, display_order)
SELECT id, image_url, 0
FROM listings
WHERE image_url IS NOT NULL
  AND image_url <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM listing_images li
    WHERE li.listing_id = listings.id
      AND li.display_order = 0
  );

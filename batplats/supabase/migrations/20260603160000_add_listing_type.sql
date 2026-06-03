-- Marina vs private sublet listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS listing_type text DEFAULT 'marina';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listings_listing_type_check'
  ) THEN
    ALTER TABLE listings
      ADD CONSTRAINT listings_listing_type_check
      CHECK (listing_type IN ('marina', 'private'));
  END IF;
END $$;

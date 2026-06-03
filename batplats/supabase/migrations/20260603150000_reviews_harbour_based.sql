-- Reviews are tied to harbours (hosts), not individual listings.
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS harbour_id uuid REFERENCES harbours(id) ON DELETE CASCADE;
ALTER TABLE reviews DROP COLUMN IF EXISTS listing_id;

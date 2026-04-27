CREATE INDEX IF NOT EXISTS idx_listings_owner_id ON listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_listing_id ON bookings(listing_id);
CREATE INDEX IF NOT EXISTS idx_bookings_renter_id ON bookings(renter_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_email text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

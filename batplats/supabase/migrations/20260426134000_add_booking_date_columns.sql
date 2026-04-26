alter table if exists public.bookings
  add column if not exists start_date date,
  add column if not exists end_date date;

create index if not exists bookings_listing_status_dates_idx
  on public.bookings (listing_id, status, start_date, end_date);

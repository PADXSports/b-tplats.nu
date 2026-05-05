alter table public.harbours
add column if not exists zip_code text,
add column if not exists area text;

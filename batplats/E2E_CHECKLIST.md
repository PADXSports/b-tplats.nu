# Båtplats.nu E2E Checklist

## Global
- [ ] Test mobile viewport (iPhone/Android width) on all routes below.
- [ ] Confirm no silent failures: UI error state appears when Supabase/network fails.
- [ ] Confirm no stray debug logs in browser console (except error logs).

## `/`
- [ ] Hero renders and search controls work (location, length, date).
- [ ] Google map renders (not white/blank), markers clickable, info windows open.
- [ ] Stats bar shows non-broken values (harbours/listings/bookings).
- [ ] Featured listings load and each card opens listing detail.

## `/search`
- [ ] Filters from query string apply correctly.
- [ ] `Visa karta` toggles by mount/unmount and map renders after repeated toggles.
- [ ] Listing cards render and link to `/listings/[id]`.

## `/listings/[id]`
- [ ] Coordinates are not shown anywhere in the UI.
- [ ] Logged-out click on `Book this berth` redirects to `/login`.
- [ ] Booking modal validates required dates and start/end ordering.
- [ ] Successful booking request writes to `bookings` and shows success message.

## Auth
- [ ] `/signup` creates account + `profiles.role = renter`, redirects to `/dashboard/renter`.
- [ ] `/hamnar/registrera` creates account + `profiles.role = host`, redirects to `/dashboard/host`.
- [ ] `/login` routes host to `/dashboard/host`, renter to `/dashboard/renter`.
- [ ] If profile row is missing at login, row is auto-created with `role = renter`.

## Navbar
- [ ] Logged-out sees `Logga in` and `För hamnar`.
- [ ] Logged-in renter sees email + `Min profil` (`/dashboard/renter`) + `Logga ut`.
- [ ] Logged-in host sees email + `Dashboard` (`/dashboard/host`) + `Logga ut`.

## `/dashboard/renter`
- [ ] Page loads bookings joined with listing + harbour info.
- [ ] Badge colors: `confirmed` green, `pending` yellow, `cancelled/declined` red tone.
- [ ] `Avboka` only shown for pending and updates status in Supabase.
- [ ] Mobile layout is readable and action button spans full width.

## `/dashboard/host`
- [ ] Loading never gets stuck on `Laddar dashboard...`.
- [ ] If session missing, route redirects to `/login?redirect=/dashboard/host`.
- [ ] If profile row is missing, it is auto-created with `role = host`.
- [ ] If init fails, visible message shows `Något gick fel – försök igen`.
- [ ] Hero style matches site theme (navy top area, teal accents).
- [ ] Tabs work: `Översikt`, `Mina Annonser`, `Bokningar`, `Profil`.
- [ ] `Översikt` shows listings count + pending bookings + earnings placeholder.
- [ ] `Mina Annonser` shows listings where `owner_id = user.id`.
- [ ] `Bokningar` shows renter name + dates; `Acceptera`/`Avböj` update status.
- [ ] `Profil` updates host name/contact profile data.
- [ ] Mobile tab bar scrolls horizontally and cards/actions remain usable.

## `/for-hamnar`
- [ ] Logged-in host is redirected to `/dashboard/host`.
- [ ] Logged-out user sees marketing content + both CTAs.

## `/om-oss`
- [ ] Carl photo loads from `/carl-lagerberg.jpg` (via `next/image`).
- [ ] No homepage-only sections are duplicated.

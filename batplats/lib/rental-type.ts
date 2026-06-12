import { isBookedBookingStatus } from "@/lib/booking-status";
import { normalizeYmd, rangesOverlap } from "@/lib/date-range";

export type RentalType = "season" | "flexible";

export function normalizeRentalType(value: unknown): RentalType {
  return value === "flexible" ? "flexible" : "season";
}

export function formatSeasonRangeLong(start: string | null, end: string | null): string {
  const startYmd = normalizeYmd(start);
  const endYmd = normalizeYmd(end);
  if (!startYmd || !endYmd) return "Säsong ej angiven";

  const startDate = new Date(startYmd);
  const endDate = new Date(endYmd);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${startYmd} – ${endYmd}`;
  }

  const startLabel = startDate.toLocaleDateString("sv-SE", { day: "numeric", month: "long" });
  const endLabel = endDate.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

type BookingPeriod = {
  listing_id?: string | number;
  start_date: string | null;
  end_date: string | null;
  status?: string | null;
};

type ListingForDateSearch = {
  id: string | number;
  rental_type?: string | null;
  season_start: string | null;
  season_end: string | null;
};

export function isSeasonPeriodBooked(
  seasonStart: string | null,
  seasonEnd: string | null,
  bookings: BookingPeriod[],
): boolean {
  const seasonStartYmd = normalizeYmd(seasonStart);
  const seasonEndYmd = normalizeYmd(seasonEnd);
  if (!seasonStartYmd || !seasonEndYmd) return false;

  return bookings.some((booking) => {
    if (booking.status != null && !isBookedBookingStatus(booking.status)) return false;
    const bookingStart = normalizeYmd(booking.start_date);
    const bookingEnd = normalizeYmd(booking.end_date);
    if (!bookingStart || !bookingEnd) return false;
    return rangesOverlap(seasonStartYmd, seasonEndYmd, bookingStart, bookingEnd);
  });
}

export function listingMatchesDateSearch(
  listing: ListingForDateSearch,
  searchStart: string,
  searchEnd: string,
  bookingsForListing: BookingPeriod[],
): boolean {
  const rentalType = normalizeRentalType(listing.rental_type);
  const seasonStart = normalizeYmd(listing.season_start);
  const seasonEnd = normalizeYmd(listing.season_end);
  const queryStart = normalizeYmd(searchStart);
  const queryEnd = normalizeYmd(searchEnd);

  if (!seasonStart || !seasonEnd || !queryStart || !queryEnd) return false;
  if (queryStart < seasonStart || queryEnd > seasonEnd) return false;

  const activeBookings = bookingsForListing.filter(
    (booking) => booking.status == null || isBookedBookingStatus(booking.status),
  );

  if (rentalType === "season") {
    return !isSeasonPeriodBooked(seasonStart, seasonEnd, activeBookings);
  }

  return !activeBookings.some((booking) => {
    const bookingStart = normalizeYmd(booking.start_date);
    const bookingEnd = normalizeYmd(booking.end_date);
    if (!bookingStart || !bookingEnd) return false;
    return rangesOverlap(queryStart, queryEnd, bookingStart, bookingEnd);
  });
}

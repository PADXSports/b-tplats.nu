/** Statuses that count as an active/paid booking (Stripe webhook + host approval). */
export const BOOKED_BOOKING_STATUSES = ["confirmed", "paid"] as const;

export type BookedBookingStatus = (typeof BOOKED_BOOKING_STATUSES)[number];

export function isBookedBookingStatus(status: string | null | undefined): boolean {
  const normalized = (status ?? "").trim().toLowerCase();
  return BOOKED_BOOKING_STATUSES.includes(normalized as BookedBookingStatus);
}

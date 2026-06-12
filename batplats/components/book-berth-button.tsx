"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import DateRangePicker from "@/components/DateRangePicker";
import { BOOKED_BOOKING_STATUSES } from "@/lib/booking-status";
import { createClient } from "@/lib/supabase/client";
import {
  expandRangeToSet,
  formatDateSv,
  hasValidDateRange as isValidDateRange,
  meetsMinBookingMonths,
  normalizeYmd,
  rangesOverlap,
} from "@/lib/date-range";
import { formatSeasonRangeLong, isSeasonPeriodBooked, normalizeRentalType } from "@/lib/rental-type";

const DATE_CLASH_MESSAGE = "Dessa datum är redan bokade. Välj andra datum.";
const MIN_RANGE_MESSAGE = "Minsta bokningslängd är en månad.";

type BookBerthButtonProps = {
  listingId: string | number;
  listingTitle: string;
  harbourName: string;
  pricePerSeason: number;
  isAvailable?: boolean;
  className?: string;
  bookedRanges?: BookingRange[];
  rentalType?: string | null;
  seasonStart?: string | null;
  seasonEnd?: string | null;
  seasonBooked?: boolean;
};

type BookingRange = { start_date: string | null; end_date: string | null };

export default function BookBerthButton({
  listingId,
  listingTitle,
  harbourName,
  pricePerSeason,
  isAvailable = true,
  className,
  bookedRanges,
  rentalType,
  seasonStart,
  seasonEnd,
  seasonBooked: seasonBookedProp,
}: BookBerthButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const resolvedRentalType = normalizeRentalType(rentalType);
  const isSeasonListing = resolvedRentalType === "season";
  const seasonStartYmd = normalizeYmd(seasonStart);
  const seasonEndYmd = normalizeYmd(seasonEnd);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [boatName, setBoatName] = useState("");
  const [boatLength, setBoatLength] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedRanges, setConfirmedRanges] = useState<BookingRange[]>(bookedRanges ?? []);

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? null);
    };

    void loadSession();
  }, [supabase]);

  useEffect(() => {
    if (bookedRanges) {
      setConfirmedRanges(bookedRanges);
      return;
    }
    let cancelled = false;
    const loadBookings = async () => {
      const { data: bookedPeriods, error: fetchError } = await supabase
        .from("bookings")
        .select("start_date, end_date, status")
        .eq("listing_id", listingId)
        .in("status", [...BOOKED_BOOKING_STATUSES]);
      if (!cancelled && !fetchError) {
        setConfirmedRanges((bookedPeriods ?? []) as BookingRange[]);
      }
    };
    void loadBookings();
    return () => {
      cancelled = true;
    };
  }, [bookedRanges, listingId, supabase]);

  const bookedDates = useMemo(() => {
    const set = new Set<string>();
    confirmedRanges.forEach((booking) => {
      const s = normalizeYmd(booking.start_date);
      const e = normalizeYmd(booking.end_date);
      if (!s || !e) return;
      expandRangeToSet(s, e, set);
    });
    return set;
  }, [confirmedRanges]);

  const seasonBooked = useMemo(() => {
    if (seasonBookedProp != null) return seasonBookedProp;
    if (!isSeasonListing || !seasonStartYmd || !seasonEndYmd) return false;
    return isSeasonPeriodBooked(seasonStartYmd, seasonEndYmd, confirmedRanges);
  }, [seasonBookedProp, isSeasonListing, seasonStartYmd, seasonEndYmd, confirmedRanges]);

  const canBook = isAvailable && !(isSeasonListing && seasonBooked);

  const isLoggedIn = Boolean(userEmail);
  const redirectPath = `/listings/${listingId}`;

  const resetFlow = () => {
    setStep(1);
    setError(null);
    setIsSubmitting(false);
    setStartDate("");
    setEndDate("");
    setFirstName("");
    setLastName("");
    setGuestEmail("");
    setPhone("");
    setBoatName("");
    setBoatLength("");
  };

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const hasValidDateRange = isValidDateRange(startDate, endDate);

  const hasDateConflict = useMemo(() => {
    if (!startDate || !endDate || !hasValidDateRange) return false;
    return confirmedRanges.some((b) => {
      const s = normalizeYmd(b.start_date);
      const e = normalizeYmd(b.end_date);
      return Boolean(s && e && rangesOverlap(startDate, endDate, s, e));
    });
  }, [startDate, endDate, hasValidDateRange, confirmedRanges]);

  const hasMinRange = useMemo(() => {
    if (isSeasonListing) return true;
    if (!startDate || !endDate || !hasValidDateRange) return false;
    return meetsMinBookingMonths(startDate, endDate, 1);
  }, [isSeasonListing, startDate, endDate, hasValidDateRange]);

  const handleBook = async () => {
    if (!canBook) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const returnPath = pathname || redirectPath;
      router.push(`/login?redirect=${encodeURIComponent(returnPath)}`);
      return;
    }

    resetFlow();
    if (isSeasonListing && seasonStartYmd && seasonEndYmd) {
      setStartDate(seasonStartYmd);
      setEndDate(seasonEndYmd);
    }
    setIsOpen(true);
  };

  const handleContinueFromDates = () => {
    setError(null);
    if (isSeasonListing) {
      if (!seasonStartYmd || !seasonEndYmd) {
        setError("Säsongen är inte korrekt angiven för denna plats");
        return;
      }
      if (seasonBooked) {
        setError("Platsen är redan bokad för säsongen");
        return;
      }
      setStartDate(seasonStartYmd);
      setEndDate(seasonEndYmd);
      setStep(2);
      return;
    }

    if (!startDate || !endDate) {
      setError("Välj både start- och slutdatum");
      return;
    }
    if (!hasValidDateRange) {
      setError("Slutdatum måste vara efter startdatum");
      return;
    }
    if (!hasMinRange) {
      setError(MIN_RANGE_MESSAGE);
      return;
    }
    if (hasDateConflict) {
      setError(DATE_CLASH_MESSAGE);
      return;
    }
    setStep(2);
  };

  const handleContinueFromBooker = () => {
    setError(null);
    if (!isLoggedIn) {
      if (!firstName.trim() || !lastName.trim() || !guestEmail.trim() || !phone.trim()) {
        setError("Fyll i förnamn, efternamn, e-post och telefon");
        return;
      }
      if (!isValidEmail(guestEmail.trim())) {
        setError("Ange en giltig e-postadress");
        return;
      }
    }

    if (boatLength.trim() && Number.isNaN(Number(boatLength))) {
      setError("Båtlängd måste vara ett nummer i meter");
      return;
    }

    if (hasDateConflict) {
      setError(DATE_CLASH_MESSAGE);
      return;
    }

    if (!isSeasonListing && !hasMinRange) {
      setError(MIN_RANGE_MESSAGE);
      return;
    }

    setStep(3);
  };

  const submitBooking = async () => {
    setIsSubmitting(true);
    setError(null);

    if (!hasValidDateRange) {
      setError("Kontrollera att datumen är korrekta");
      setIsSubmitting(false);
      return;
    }

    if (hasDateConflict) {
      setError(DATE_CLASH_MESSAGE);
      setIsSubmitting(false);
      return;
    }

    if (!isSeasonListing && !hasMinRange) {
      setError(MIN_RANGE_MESSAGE);
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: String(listingId),
          startDate,
          endDate,
          guestEmail: isLoggedIn ? undefined : guestEmail.trim(),
          firstName: isLoggedIn ? undefined : firstName.trim(),
          lastName: isLoggedIn ? undefined : lastName.trim(),
          phone: isLoggedIn ? undefined : phone.trim(),
          boatName: boatName.trim() || undefined,
          boatLength: boatLength.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        setError(payload.error ?? "Kunde inte starta betalning");
        setIsSubmitting(false);
        return;
      }

      window.location.href = payload.url;
    } catch (submitError) {
      console.error(submitError);
      setError("Något gick fel vid betalning. Försök igen.");
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    resetFlow();
  };

  const formatDate = formatDateSv;
  const seasonLabel = formatSeasonRangeLong(seasonStart ?? null, seasonEnd ?? null);

  const buttonLabel = !isAvailable
    ? "Bokad"
    : isSeasonListing && seasonBooked
      ? "Bokad för säsongen"
      : "Boka båtplats";

  return (
    <>
      <button
        onClick={() => void handleBook()}
        disabled={!canBook}
        className={
          className ??
          "rounded-lg bg-[#0d9488] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#14b8a6]"
        }
      >
        {buttonLabel}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#0f1f3d]/60 p-0 md:items-center md:p-4">
          <div
            className="h-[100dvh] w-screen max-w-none overflow-y-auto rounded-none border-0 bg-white p-4 shadow-[0_10px_25px_rgba(0,0,0,0.15)] md:max-h-[min(90vh,720px)] md:w-full md:max-w-xl md:rounded-xl md:border md:border-[#dce3ee] md:p-6"
            style={{ animation: "slideUpMobile 220ms ease-out" }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.5px] text-[#0d9488] md:text-[0.75rem]">
                  Steg {step} av 3
                </p>
                <h3 className="mt-1 text-lg font-extrabold text-[#0f1f3d] md:text-xl">Boka båtplats</h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 py-1 text-lg text-[#8a96a8] transition active:bg-[#ebe6dc] active:text-[#0f1f3d]"
              >
                ✕
              </button>
            </div>

            <form className="space-y-4">
              {step === 1 ? (
                <>
                  {isSeasonListing ? (
                    <div className="rounded-lg border border-[#dce3ee] bg-[#f5f0e8] p-4">
                      <p className="text-sm font-semibold text-[#0f1f3d]">Säsong</p>
                      <p className="mt-1 text-base text-[#0a1628]">{seasonLabel}</p>
                      <p className="mt-2 text-sm text-[#8a96a8]">
                        Du bokar hela säsongen. Priset gäller för hela perioden.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-[#8a96a8]">
                        Välj in- och utcheckningsdatum inom säsongen. Minst en månad. Grå dagar är upptagna.
                      </p>

                      <DateRangePicker
                        variant="inline"
                        startDate={startDate}
                        endDate={endDate}
                        onStartDateChange={setStartDate}
                        onEndDateChange={setEndDate}
                        bookedDates={bookedDates}
                        seasonStart={seasonStart}
                        seasonEnd={seasonEnd}
                        minBookingMonths={1}
                        onDateError={setError}
                        dateClashMessage={DATE_CLASH_MESSAGE}
                        minRangeMessage={MIN_RANGE_MESSAGE}
                      />
                    </>
                  )}

                  {hasDateConflict ? <p className="text-sm text-[#d64c3b]">{DATE_CLASH_MESSAGE}</p> : null}
                  <div className="sticky bottom-0 z-10 -mx-4 bg-white px-4 pb-2 pt-3 shadow-[0_-8px_20px_rgba(15,23,42,0.12)] md:static md:m-0 md:bg-transparent md:p-0 md:shadow-none">
                    <button
                      type="button"
                      onClick={handleContinueFromDates}
                      disabled={hasDateConflict || (!isSeasonListing && Boolean(startDate && endDate && !hasMinRange))}
                      className="w-full rounded-lg bg-[#0d9488] px-4 py-3 text-sm font-semibold text-white transition active:bg-[#14b8a6] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Fortsätt
                    </button>
                  </div>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  {isLoggedIn ? (
                    <div className="space-y-3 rounded-lg border border-[#dce3ee] bg-[#f5f0e8] p-4">
                      <p className="text-sm font-semibold text-[#0f1f3d]">Du bokar som {userEmail}</p>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-[#0f1f3d]">Båtnamn (valfritt)</label>
                        <input
                          type="text"
                          value={boatName}
                          onChange={(event) => setBoatName(event.target.value)}
                          className="w-full rounded-lg border border-[#c5d0de] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-[#0f1f3d]">
                          Båtlängd i meter (valfritt)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={boatLength}
                          onChange={(event) => setBoatLength(event.target.value)}
                          className="w-full rounded-lg border border-[#c5d0de] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 rounded-lg border border-[#dce3ee] p-4">
                        <h4 className="font-semibold text-[#0f1f3d]">Logga in eller skapa konto</h4>
                        <p className="text-sm text-[#8a96a8]">Enklare att hantera dina bokningar</p>
                        <div className="flex gap-2">
                          <Link
                            href={`/login?redirect=${encodeURIComponent(pathname || redirectPath)}`}
                            className="rounded-lg bg-[#0f1f3d] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d2252]"
                          >
                            Logga in
                          </Link>
                          <Link
                            href={`/signup?redirect=${encodeURIComponent(pathname || redirectPath)}`}
                            className="rounded-lg border border-[#0f1f3d] px-4 py-2 text-sm font-semibold text-[#0f1f3d] transition hover:bg-[#f5f0e8]"
                          >
                            Skapa konto
                          </Link>
                        </div>
                      </div>

                      <div className="space-y-3 rounded-lg border border-[#dce3ee] bg-[#f5f0e8] p-4">
                        <h4 className="font-semibold text-[#0f1f3d]">Fortsätt som gäst</h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-sm font-semibold text-[#0f1f3d]">Förnamn</label>
                            <input
                              type="text"
                              value={firstName}
                              onChange={(event) => setFirstName(event.target.value)}
                              className="w-full rounded-lg border border-[#c5d0de] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-semibold text-[#0f1f3d]">Efternamn</label>
                            <input
                              type="text"
                              value={lastName}
                              onChange={(event) => setLastName(event.target.value)}
                              className="w-full rounded-lg border border-[#c5d0de] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-[#0f1f3d]">E-post</label>
                          <input
                            type="email"
                            value={guestEmail}
                            onChange={(event) => setGuestEmail(event.target.value)}
                            className="w-full rounded-lg border border-[#c5d0de] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-[#0f1f3d]">Telefon</label>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            className="w-full rounded-lg border border-[#c5d0de] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-[#0f1f3d]">Båtnamn (valfritt)</label>
                          <input
                            type="text"
                            value={boatName}
                            onChange={(event) => setBoatName(event.target.value)}
                            className="w-full rounded-lg border border-[#c5d0de] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-[#0f1f3d]">
                            Båtlängd i meter (valfritt)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={boatLength}
                            onChange={(event) => setBoatLength(event.target.value)}
                            className="w-full rounded-lg border border-[#c5d0de] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="sticky bottom-0 z-10 -mx-4 bg-white px-4 pb-2 pt-3 shadow-[0_-8px_20px_rgba(15,23,42,0.12)] md:static md:m-0 md:bg-transparent md:p-0 md:shadow-none">
                    <button
                      type="button"
                      onClick={handleContinueFromBooker}
                      disabled={hasDateConflict}
                      className="w-full rounded-lg bg-[#0d9488] px-4 py-3 text-sm font-semibold text-white transition active:bg-[#14b8a6] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Fortsätt till betalning
                    </button>
                  </div>
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <div className="rounded-lg border border-[#dce3ee] bg-[#f5f0e8] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                      Prissammanfattning
                    </p>
                    <p className="mt-1 text-base font-bold text-[#0f1f3d]">{listingTitle}</p>
                    <p className="text-sm text-[#6b7a8f]">{harbourName}</p>
                    <p className="mt-3 text-sm text-[#0f1f3d]">
                      {formatDate(startDate)} - {formatDate(endDate)}
                    </p>
                    <p className="mt-3 text-lg font-extrabold text-[#0f1f3d]">
                      {pricePerSeason.toLocaleString("sv-SE")} SEK
                    </p>
                    <p className="text-sm text-[#8a96a8]">per säsong</p>
                  </div>
                  {hasDateConflict ? <p className="text-sm text-[#d64c3b]">{DATE_CLASH_MESSAGE}</p> : null}
                  <div className="sticky bottom-0 z-10 -mx-4 bg-white px-4 pb-2 pt-3 shadow-[0_-8px_20px_rgba(15,23,42,0.12)] md:static md:m-0 md:bg-transparent md:p-0 md:shadow-none">
                    <button
                      type="button"
                      disabled={isSubmitting || hasDateConflict}
                      onClick={() => void submitBooking()}
                      className="w-full rounded-lg bg-[#0d9488] px-4 py-3 text-sm font-semibold text-white transition active:bg-[#14b8a6] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? "Skickar..." : "Gå till betalning"}
                    </button>
                  </div>
                </>
              ) : null}

              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep(step === 3 ? 2 : 1);
                  }}
                  className="w-full rounded-lg border border-[#c5d0de] px-4 py-2.5 text-sm font-semibold text-[#0f1f3d] transition hover:bg-[#f5f0e8]"
                >
                  Tillbaka
                </button>
              ) : null}

              {error ? <p className="text-sm text-[#d64c3b]">{error}</p> : null}
            </form>
          </div>
        </div>
      ) : null}
      <style jsx>{`
        @keyframes slideUpMobile {
          from {
            transform: translateY(100%);
            opacity: 0.85;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}

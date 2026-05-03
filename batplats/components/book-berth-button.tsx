"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

const DATE_CLASH_MESSAGE = "Dessa datum är redan bokade. Välj andra datum.";

type BookBerthButtonProps = {
  listingId: string | number;
  listingTitle: string;
  harbourName: string;
  pricePerSeason: number;
  isAvailable?: boolean;
  className?: string;
  bookedRanges?: BookingRange[];
};

function normalizeYmd(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

function ymdFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayYmd(): string {
  return ymdFromDate(new Date());
}

function expandRangeToSet(startYmd: string, endYmd: string, out: Set<string>) {
  const [ys, ms, ds] = startYmd.split("-").map(Number);
  const [ye, me, de] = endYmd.split("-").map(Number);
  if (!ys || !ms || !ds || !ye || !me || !de) return;
  let cur = new Date(ys, ms - 1, ds);
  const end = new Date(ye, me - 1, de);
  while (cur <= end) {
    out.add(ymdFromDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
}

function rangeIncludesBookedDay(startYmd: string, endYmd: string, booked: Set<string>): boolean {
  const [ys, ms, ds] = startYmd.split("-").map(Number);
  const [ye, me, de] = endYmd.split("-").map(Number);
  if (!ys || !ms || !ds || !ye || !me || !de) return true;
  let cur = new Date(ys, ms - 1, ds);
  const end = new Date(ye, me - 1, de);
  while (cur <= end) {
    if (booked.has(ymdFromDate(cur))) return true;
    cur.setDate(cur.getDate() + 1);
  }
  return false;
}

function getCalendarCells(viewYear: number, viewMonth: number): { ymd: string; day: number; inMonth: boolean }[] {
  const first = new Date(viewYear, viewMonth, 1);
  const startPad = (first.getDay() + 6) % 7;
  const cells: { ymd: string; day: number; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(viewYear, viewMonth, 1 - startPad + i);
    cells.push({
      ymd: ymdFromDate(d),
      day: d.getDate(),
      inMonth: d.getMonth() === viewMonth,
    });
  }
  return cells;
}

type BookingRange = { start_date: string | null; end_date: string | null };

export default function BookBerthButton({
  listingId,
  listingTitle,
  harbourName,
  pricePerSeason,
  isAvailable = true,
  className,
  bookedRanges,
}: BookBerthButtonProps) {
  const supabase = useMemo(() => createClient(), []);
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
  const now = new Date();
  const [calendarView, setCalendarView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [bookedTooltipYmd, setBookedTooltipYmd] = useState<string | null>(null);

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
        .select("start_date, end_date")
        .eq("listing_id", listingId)
        .eq("status", "confirmed");
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
    setBookedTooltipYmd(null);
    const n = new Date();
    setCalendarView({ y: n.getFullYear(), m: n.getMonth() });
  };

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const hasValidDateRange =
    Boolean(startDate) && Boolean(endDate) && new Date(endDate).getTime() > new Date(startDate).getTime();

  const hasDateConflict = useMemo(() => {
    if (!startDate || !endDate || !hasValidDateRange) return false;
    return confirmedRanges.some((b) => {
      const s = normalizeYmd(b.start_date);
      const e = normalizeYmd(b.end_date);
      return Boolean(s && e && startDate <= e && s <= endDate);
    });
  }, [startDate, endDate, hasValidDateRange, confirmedRanges]);

  const calendarCells = useMemo(
    () => getCalendarCells(calendarView.y, calendarView.m),
    [calendarView.y, calendarView.m],
  );

  const monthTitle = useMemo(() => {
    const d = new Date(calendarView.y, calendarView.m, 1);
    return d.toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
  }, [calendarView.y, calendarView.m]);

  const handleDayClick = useCallback(
    (ymd: string) => {
      setError(null);
      setBookedTooltipYmd(null);

      if (!startDate || (startDate && endDate)) {
        setStartDate(ymd);
        setEndDate("");
        return;
      }

      if (ymd < startDate) {
        setStartDate(ymd);
        setEndDate("");
        return;
      }

      if (rangeIncludesBookedDay(startDate, ymd, bookedDates)) {
        setError(DATE_CLASH_MESSAGE);
        return;
      }

      setEndDate(ymd);
    },
    [startDate, endDate, bookedDates],
  );

  const showBookedTooltip = useCallback((ymd: string) => {
    setBookedTooltipYmd(ymd);
    window.setTimeout(() => setBookedTooltipYmd(null), 2000);
  }, []);

  const handleBook = () => {
    if (!isAvailable) return;
    resetFlow();
    setIsOpen(true);
  };

  const handleContinueFromDates = () => {
    setError(null);
    if (!startDate || !endDate) {
      setError("Välj både start- och slutdatum");
      return;
    }
    if (!hasValidDateRange) {
      setError("Slutdatum måste vara efter startdatum");
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

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("sv-SE");
  };

  const shiftMonth = (delta: number) => {
    setCalendarView(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const today = todayYmd();
  const weekdayLabels = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

  return (
    <>
      <button
        onClick={handleBook}
        disabled={!isAvailable}
        className={
          className ??
          "rounded-lg bg-[#0d9488] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#14b8a8]"
        }
      >
        {isAvailable ? "Boka båtplats" : "Bokad"}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#0a2342]/60 p-0 md:items-center md:p-4">
          <div
            className="h-[100dvh] w-screen max-w-none overflow-y-auto rounded-none border-0 bg-white p-4 shadow-[0_10px_25px_rgba(0,0,0,0.15)] md:max-h-[min(90vh,720px)] md:w-full md:max-w-xl md:rounded-xl md:border md:border-[#e2e8f0] md:p-6"
            style={{ animation: "slideUpMobile 220ms ease-out" }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.5px] text-[#0d9488] md:text-[0.75rem]">
                  Steg {step} av 3
                </p>
                <h3 className="mt-1 text-lg font-extrabold text-[#0a2342] md:text-xl">Boka båtplats</h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 py-1 text-lg text-[#64748b] transition active:bg-[#f1f5f9] active:text-[#0a2342]"
              >
                ✕
              </button>
            </div>

            <form className="space-y-4">
              {step === 1 ? (
                <>
                  <p className="text-sm text-[#64748b]">
                    Välj in- och utcheckningsdatum. Grå dagar är redan bokade.
                  </p>

                  <div className="relative rounded-xl border border-[#e2e8f0] bg-white p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => shiftMonth(-1)}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-base font-semibold text-[#0a2342] transition active:bg-[#f8fafc] md:min-h-9 md:min-w-9 md:text-sm"
                        aria-label="Föregående månad"
                      >
                        ←
                      </button>
                      <span className="text-center text-xl font-bold capitalize text-[#0a2342] md:text-sm">
                        {monthTitle}
                      </span>
                      <button
                        type="button"
                        onClick={() => shiftMonth(1)}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-base font-semibold text-[#0a2342] transition active:bg-[#f8fafc] md:min-h-9 md:min-w-9 md:text-sm"
                        aria-label="Nästa månad"
                      >
                        →
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-[#64748b]">
                      {weekdayLabels.map((w) => (
                        <div key={w} className="py-1">
                          {w}
                        </div>
                      ))}
                    </div>

                    <div className="mt-1 grid grid-cols-7 gap-2 md:gap-1">
                      {calendarCells.map(({ ymd, day, inMonth }) => {
                        const isBooked = bookedDates.has(ymd);
                        const isToday = ymd === today;
                        const hasRange = Boolean(startDate && endDate && startDate < endDate);
                        const isRangeFill =
                          hasRange && ymd >= startDate && ymd <= endDate && !(ymd === startDate || ymd === endDate);
                        const isEndpoint =
                          (startDate && ymd === startDate) || (endDate && ymd === endDate && hasValidDateRange);

                        let cellClass =
                          "relative flex min-h-11 items-center justify-center rounded-lg text-base font-medium transition md:min-h-9 md:text-sm ";

                        if (!inMonth) {
                          cellClass += "text-[#cbd5e1] ";
                        } else if (isBooked) {
                          cellClass +=
                            "cursor-not-allowed bg-[#f1f5f9] text-[#94a3b8] line-through decoration-[#94a3b8] ";
                        } else if (isEndpoint) {
                          cellClass += "bg-[#0d9488] text-white shadow-sm ";
                        } else if (isRangeFill) {
                          cellClass += "bg-[#ccfbf1] text-[#0a2342] ";
                        } else {
                          cellClass += "cursor-pointer bg-white text-[#0a2342] hover:bg-[#0d9488]/15 ";
                        }

                        if (isToday && !isBooked && inMonth) {
                          cellClass += "ring-2 ring-[#0d9488] ring-offset-1 ";
                        }

                        if (!inMonth) {
                          return (
                            <div key={ymd} className="flex min-h-11 items-center justify-center text-base text-[#cbd5e1] md:min-h-9 md:text-sm">
                              {day}
                            </div>
                          );
                        }

                        return (
                          <div key={ymd} className="relative">
                            <button
                              type="button"
                              title={isBooked ? "Redan bokad" : undefined}
                              onClick={() => {
                                if (isBooked) {
                                  showBookedTooltip(ymd);
                                  return;
                                }
                                handleDayClick(ymd);
                              }}
                              className={cellClass + "w-full"}
                            >
                              {day}
                            </button>
                            {bookedTooltipYmd === ymd ? (
                              <span className="absolute -bottom-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-[#0a2342] px-2 py-0.5 text-[0.7rem] text-white shadow">
                                Redan bokad
                              </span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#e2e8f0] pt-3 text-xs text-[#64748b]">
                      <span>⬜ Tillgänglig</span>
                      <span>🟩 Vald</span>
                      <span className="inline-flex items-center gap-1">
                        ⬜
                        <span>Bokad (grå)</span>
                      </span>
                    </div>
                  </div>

                  {(startDate || endDate) && (
                    <p className="text-sm text-[#0a2342]">
                      <span className="font-semibold">Vald period: </span>
                      {startDate ? formatDate(startDate) : "—"} — {endDate ? formatDate(endDate) : "—"}
                    </p>
                  )}

                  {hasDateConflict ? <p className="text-sm text-[#be123c]">{DATE_CLASH_MESSAGE}</p> : null}
                  <div className="sticky bottom-0 z-10 -mx-4 bg-white px-4 pb-2 pt-3 shadow-[0_-8px_20px_rgba(15,23,42,0.12)] md:static md:m-0 md:bg-transparent md:p-0 md:shadow-none">
                    <button
                      type="button"
                      onClick={handleContinueFromDates}
                      disabled={hasDateConflict}
                      className="w-full rounded-lg bg-[#0d9488] px-4 py-3 text-sm font-semibold text-white transition active:bg-[#14b8a8] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Fortsätt
                    </button>
                  </div>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  {isLoggedIn ? (
                    <div className="space-y-3 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
                      <p className="text-sm font-semibold text-[#0a2342]">Du bokar som {userEmail}</p>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-[#0a2342]">Båtnamn (valfritt)</label>
                        <input
                          type="text"
                          value={boatName}
                          onChange={(event) => setBoatName(event.target.value)}
                          className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-[#0a2342]">
                          Båtlängd i meter (valfritt)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={boatLength}
                          onChange={(event) => setBoatLength(event.target.value)}
                          className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 rounded-lg border border-[#e2e8f0] p-4">
                        <h4 className="font-semibold text-[#0a2342]">Logga in eller skapa konto</h4>
                        <p className="text-sm text-[#64748b]">Enklare att hantera dina bokningar</p>
                        <div className="flex gap-2">
                          <Link
                            href={`/login?redirect=${encodeURIComponent(redirectPath)}`}
                            className="rounded-lg bg-[#0a2342] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d3060]"
                          >
                            Logga in
                          </Link>
                          <Link
                            href={`/signup?redirect=${encodeURIComponent(redirectPath)}`}
                            className="rounded-lg border border-[#0a2342] px-4 py-2 text-sm font-semibold text-[#0a2342] transition hover:bg-[#f8fafc]"
                          >
                            Skapa konto
                          </Link>
                        </div>
                      </div>

                      <div className="space-y-3 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
                        <h4 className="font-semibold text-[#0a2342]">Fortsätt som gäst</h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-sm font-semibold text-[#0a2342]">Förnamn</label>
                            <input
                              type="text"
                              value={firstName}
                              onChange={(event) => setFirstName(event.target.value)}
                              className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-semibold text-[#0a2342]">Efternamn</label>
                            <input
                              type="text"
                              value={lastName}
                              onChange={(event) => setLastName(event.target.value)}
                              className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-[#0a2342]">E-post</label>
                          <input
                            type="email"
                            value={guestEmail}
                            onChange={(event) => setGuestEmail(event.target.value)}
                            className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-[#0a2342]">Telefon</label>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-[#0a2342]">Båtnamn (valfritt)</label>
                          <input
                            type="text"
                            value={boatName}
                            onChange={(event) => setBoatName(event.target.value)}
                            className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-[#0a2342]">
                            Båtlängd i meter (valfritt)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={boatLength}
                            onChange={(event) => setBoatLength(event.target.value)}
                            className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
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
                      className="w-full rounded-lg bg-[#0d9488] px-4 py-3 text-sm font-semibold text-white transition active:bg-[#14b8a8] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Fortsätt till betalning
                    </button>
                  </div>
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                      Prissammanfattning
                    </p>
                    <p className="mt-1 text-base font-bold text-[#0a2342]">{listingTitle}</p>
                    <p className="text-sm text-[#475569]">{harbourName}</p>
                    <p className="mt-3 text-sm text-[#0a2342]">
                      {formatDate(startDate)} - {formatDate(endDate)}
                    </p>
                    <p className="mt-3 text-lg font-extrabold text-[#0a2342]">
                      {pricePerSeason.toLocaleString("sv-SE")} SEK
                    </p>
                    <p className="text-sm text-[#64748b]">per säsong</p>
                  </div>
                  {hasDateConflict ? <p className="text-sm text-[#be123c]">{DATE_CLASH_MESSAGE}</p> : null}
                  <div className="sticky bottom-0 z-10 -mx-4 bg-white px-4 pb-2 pt-3 shadow-[0_-8px_20px_rgba(15,23,42,0.12)] md:static md:m-0 md:bg-transparent md:p-0 md:shadow-none">
                    <button
                      type="button"
                      disabled={isSubmitting || hasDateConflict}
                      onClick={() => void submitBooking()}
                      className="w-full rounded-lg bg-[#0d9488] px-4 py-3 text-sm font-semibold text-white transition active:bg-[#14b8a8] disabled:cursor-not-allowed disabled:opacity-60"
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
                  className="w-full rounded-lg border border-[#cbd5e1] px-4 py-2.5 text-sm font-semibold text-[#0a2342] transition hover:bg-[#f8fafc]"
                >
                  Tillbaka
                </button>
              ) : null}

              {error ? <p className="text-sm text-[#be123c]">{error}</p> : null}
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

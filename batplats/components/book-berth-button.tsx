"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

type BookBerthButtonProps = {
  listingId: string | number;
  isAvailable?: boolean;
  className?: string;
};

export default function BookBerthButton({
  listingId,
  isAvailable = true,
  className,
}: BookBerthButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [showAuthChoice, setShowAuthChoice] = useState(false);
  const [isGuestBooking, setIsGuestBooking] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const handledKey = `open-booking-handled-${listingId}`;
    if (searchParams.get("openBooking") === "1" && !sessionStorage.getItem(handledKey)) {
      sessionStorage.setItem(handledKey, "1");
      setTimeout(() => {
        setIsOpen(true);
        setShowAuthChoice(false);
        setIsGuestBooking(false);
      }, 0);
      router.replace(`/listings/${listingId}`);
    }
  }, [listingId, router, searchParams]);

  const handleBook = async () => {
    if (!isAvailable) {
      return;
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setShowAuthChoice(true);
        return;
      }

      setError(null);
      setSuccessMessage(null);
      setIsOpen(true);
    } catch (authError) {
      console.error(authError);
      setShowAuthChoice(true);
      setError(null);
    }
  };

  const goToLogin = () => {
    router.push(`/login?redirect=${encodeURIComponent(`/listings/${listingId}`)}`);
  };

  const continueAsGuest = () => {
    setShowAuthChoice(false);
    setIsGuestBooking(true);
    setError(null);
    setSuccessMessage(null);
    setIsOpen(true);
  };

  const submitBooking = async (status: "pending" | "confirmed") => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    if (!startDate || !endDate) {
      setError("Välj både start- och slutdatum");
      setIsSubmitting(false);
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError("Slutdatum måste vara efter startdatum");
      setIsSubmitting(false);
      return;
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError && !isGuestBooking) {
        throw userError;
      }

      const renterId = user?.id ?? null;
      if (!renterId && !isGuestBooking) {
        setIsSubmitting(false);
        setIsOpen(false);
        setShowAuthChoice(true);
        return;
      }
      if (isGuestBooking && !guestEmail.trim()) {
        setError("Ange e-post för gästbokning");
        setIsSubmitting(false);
        return;
      }

      const basePayload = {
        listing_id: listingId,
        renter_id: renterId,
        guest_email: isGuestBooking ? guestEmail.trim() : null,
        status,
        message: message.trim() || null,
      };

      const { data: overlappingConfirmedBooking, error: overlapError } = await supabase
        .from("bookings")
        .select("id")
        .eq("listing_id", listingId)
        .eq("status", "confirmed")
        .lte("start_date", endDate)
        .gte("end_date", startDate)
        .limit(1)
        .maybeSingle();

      if (overlapError) {
        setError(overlapError.message);
        setIsSubmitting(false);
        return;
      }

      if (overlappingConfirmedBooking) {
        setError("Denna båtplats är redan bokad för de valda datumen. Välj andra datum.");
        setIsSubmitting(false);
        return;
      }

      const { error: insertWithDatesError } = await supabase.from("bookings").insert({
        ...basePayload,
        start_date: startDate,
        end_date: endDate,
      });

      if (insertWithDatesError) {
        setError(insertWithDatesError.message);
        setIsSubmitting(false);
        return;
      }

      if (status === "confirmed") {
        const { error: listingUpdateError } = await supabase
          .from("listings")
          .update({ is_available: false })
          .eq("id", listingId);

        if (listingUpdateError) {
          setError(listingUpdateError.message);
          setIsSubmitting(false);
          return;
        }
      }

      setSuccessMessage(
        status === "confirmed"
          ? "Grattis! Din båtplats är bokad."
          : "Din bokningsförfrågan har skickats!",
      );
      setStartDate("");
      setEndDate("");
      setMessage("");
      setGuestEmail("");
      setIsSubmitting(false);

      if (status === "confirmed") {
        setTimeout(() => {
          setIsOpen(false);
          router.refresh();
        }, 900);
      }
    } catch (submitError) {
      console.error(submitError);
      setError("Kunde inte verifiera inloggning just nu.");
      setShowAuthChoice(true);
      setIsSubmitting(false);
    }
  };

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

      {showAuthChoice ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0a2342]/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_10px_25px_rgba(0,0,0,0.15)]">
            <h3 className="text-lg font-extrabold text-[#0a2342]">Boka båtplats</h3>
            <p className="mt-2 text-sm text-[#64748b]">
              Välj hur du vill fortsätta.
            </p>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={goToLogin}
                className="rounded-lg bg-[#0d9488] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#14b8a8]"
              >
                Logga in
              </button>
              <button
                type="button"
                onClick={continueAsGuest}
                className="rounded-lg border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm font-semibold text-[#0a2342] transition hover:border-[#0d9488] hover:text-[#0d9488]"
              >
                Fortsätt som gäst
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0a2342]/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_10px_25px_rgba(0,0,0,0.15)]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.75rem] font-bold uppercase tracking-[0.5px] text-[#0d9488]">
                  Bokningsförfrågan
                </p>
                <h3 className="mt-1 text-xl font-extrabold text-[#0a2342]">Boka båtplats</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md px-2 py-1 text-sm text-[#64748b] transition hover:bg-[#f1f5f9] hover:text-[#0a2342]"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                void submitBooking("pending");
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0a2342]">
                    Startdatum
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    required
                    className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0a2342]">
                    Slutdatum
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    required
                    className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[#0a2342]">
                  Meddelande (valfritt)
                </label>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                />
              </div>
              {isGuestBooking ? (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0a2342]">
                    Gäst e-post
                  </label>
                  <input
                    type="email"
                    required
                    value={guestEmail}
                    onChange={(event) => setGuestEmail(event.target.value)}
                    className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                  />
                </div>
              ) : null}

              {error ? <p className="text-sm text-[#be123c]">{error}</p> : null}
              {successMessage ? <p className="text-sm text-[#15803d]">{successMessage}</p> : null}

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-[#0d9488] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#14b8a8] disabled:opacity-60"
                >
                  {isSubmitting ? "Skickar..." : "Skicka bokningsförfrågan"}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void submitBooking("confirmed")}
                  className="w-full rounded-lg bg-[#0a2342] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d3060] disabled:opacity-60"
                >
                  {isSubmitting ? "Bokar..." : "Boka direkt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

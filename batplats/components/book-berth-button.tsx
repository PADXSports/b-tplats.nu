"use client";

import { useState } from "react";

type BookBerthButtonProps = {
  listingId: string | number;
  pricePerSeason: number;
  isAvailable?: boolean;
  className?: string;
};

export default function BookBerthButton({
  listingId,
  pricePerSeason,
  isAvailable = true,
  className,
}: BookBerthButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBook = () => {
    if (!isAvailable) return;
    setError(null);
    setIsOpen(true);
  };

  const submitBooking = async () => {
    setIsSubmitting(true);
    setError(null);

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
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: String(listingId),
          startDate,
          endDate,
          guestEmail: guestEmail.trim() || undefined,
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0a2342]/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_10px_25px_rgba(0,0,0,0.15)]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.75rem] font-bold uppercase tracking-[0.5px] text-[#0d9488]">
                  Stripe Checkout
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

            <form className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0a2342]">Startdatum</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    required
                    className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0a2342]">Slutdatum</label>
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
                  E-post för kvitto (valfritt)
                </label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(event) => setGuestEmail(event.target.value)}
                  className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                />
              </div>

              <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                  Prissammanfattning
                </p>
                <p className="mt-1 text-lg font-extrabold text-[#0a2342]">
                  {pricePerSeason.toLocaleString("sv-SE")} SEK
                </p>
                <p className="text-sm text-[#64748b]">per säsong</p>
              </div>

              {error ? <p className="text-sm text-[#be123c]">{error}</p> : null}

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void submitBooking()}
                className="w-full rounded-lg bg-[#0d9488] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#14b8a8] disabled:opacity-60"
              >
                {isSubmitting ? "Skickar..." : "Gå till betalning"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

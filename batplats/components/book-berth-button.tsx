"use client";

import Link from "next/link";
import { useState } from "react";
import { useEffect, useMemo } from "react";

import { createClient } from "@/lib/supabase/client";

type BookBerthButtonProps = {
  listingId: string | number;
  listingTitle: string;
  harbourName: string;
  pricePerSeason: number;
  isAvailable?: boolean;
  className?: string;
};

export default function BookBerthButton({
  listingId,
  listingTitle,
  harbourName,
  pricePerSeason,
  isAvailable = true,
  className,
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

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? null);
    };

    void loadSession();
  }, [supabase]);

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
  const hasValidDateRange =
    Boolean(startDate) && Boolean(endDate) && new Date(endDate).getTime() > new Date(startDate).getTime();

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
                  Steg {step} av 3
                </p>
                <h3 className="mt-1 text-xl font-extrabold text-[#0a2342]">Boka båtplats</h3>
              </div>
              <button
                onClick={closeModal}
                className="rounded-md px-2 py-1 text-sm text-[#64748b] transition hover:bg-[#f1f5f9] hover:text-[#0a2342]"
              >
                ✕
              </button>
            </div>

            <form className="space-y-4">
              {step === 1 ? (
                <>
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
                  <button
                    type="button"
                    onClick={handleContinueFromDates}
                    className="w-full rounded-lg bg-[#0d9488] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#14b8a8]"
                  >
                    Fortsätt
                  </button>
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

                  <button
                    type="button"
                    onClick={handleContinueFromBooker}
                    className="w-full rounded-lg bg-[#0d9488] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#14b8a8]"
                  >
                    Fortsätt till betalning
                  </button>
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
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void submitBooking()}
                    className="w-full rounded-lg bg-[#0d9488] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#14b8a8] disabled:opacity-60"
                  >
                    {isSubmitting ? "Skickar..." : "Gå till betalning"}
                  </button>
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
    </>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AuthNavbar from "@/components/auth-navbar";
import BerthMap from "@/components/BerthMap";
import Footer from "@/components/footer";
import LandingHeroWave from "@/components/landing-hero-wave";
import RevealOnView from "@/components/reveal-on-view";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_LISTING_IMAGE =
  "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=600&h=300&fit=crop";

export default function Home() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [location, setLocation] = useState("");
  const [boatLength, setBoatLength] = useState("");
  const [date, setDate] = useState("");
  const [featuredListings, setFeaturedListings] = useState<
    {
      id: number | string;
      marina: string;
      title: string;
      city: string;
      specs: string[];
      price: string;
      imageSrc: string;
    }[]
  >([]);
  const [stats, setStats] = useState({
    marinas: "0",
    listings: "0",
    cities: "0",
    bookings: "0",
  });

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location.trim()) params.set("location", location.trim());
    if (boatLength) params.set("boatLength", boatLength);
    if (date) params.set("date", date);
    const queryString = params.toString();
    router.push(queryString ? `/search?${queryString}` : "/search");
  };

  useEffect(() => {
    const loadHomepageData = async () => {
      try {
        const [listingsResult, availableResult, bookingsResult, featured] = await Promise.all([
          supabase.from("listings").select("harbour_name, city"),
          supabase.from("listings").select("*", { count: "exact", head: true }),
          supabase.from("bookings").select("*", { count: "exact", head: true }),
          supabase
            .from("listings")
            .select("id, title, price_per_season, max_boat_length, max_boat_width, harbours(name, city)")
            .limit(3),
        ]);

        if (listingsResult.error) console.error(listingsResult.error);
        if (availableResult.error) console.error(availableResult.error);
        if (bookingsResult.error) console.error(bookingsResult.error);

        const uniqueHarbours = new Set(
          listingsResult.data?.map((listing) => listing.harbour_name).filter(Boolean),
        ).size;

        const uniqueCities = new Set(
          listingsResult.data?.map((listing) => listing.city).filter(Boolean),
        ).size;

        const availableCount = availableResult.count || 0;
        const bookingsCount = bookingsResult.count || 0;

        if (featured.error) {
          console.error(featured.error);
        } else if (featured.data) {
          setFeaturedListings(
            featured.data.map((listing) => {
              const harbour = Array.isArray(listing.harbours)
                ? listing.harbours[0]
                : listing.harbours;

              return {
                id: listing.id,
                marina: harbour?.name ?? "Hamn",
                title: listing.title,
                city: harbour?.city ?? "Okänd stad",
                specs: [
                  listing.max_boat_length ? `${listing.max_boat_length} m längd` : "Längd ej angiven",
                  listing.max_boat_width ? `${listing.max_boat_width} m bredd` : "Bredd ej angiven",
                ],
                price: listing.price_per_season.toLocaleString("sv-SE"),
                imageSrc: DEFAULT_LISTING_IMAGE,
              };
            }),
          );
        }

        setStats({
          marinas: uniqueHarbours.toLocaleString("sv-SE"),
          listings: availableCount.toLocaleString("sv-SE"),
          cities: uniqueCities.toLocaleString("sv-SE"),
          bookings: bookingsCount.toLocaleString("sv-SE"),
        });
      } catch (loadError) {
        console.error(loadError);
      }
    };

    void loadHomepageData();
  }, [supabase]);

  const marinas = [
    {
      name: "Goteborg Maritim",
      spots: "18 platser tillgängliga",
      imageSrc: "https://picsum.photos/seed/dock12/600/400",
    },
    {
      name: "Stockholms Segelsallskap",
      spots: "14 platser tillgängliga",
      imageSrc: "https://picsum.photos/seed/dock34/600/400",
    },
    {
      name: "Bockholmen Marin",
      spots: "6 platser tillgängliga",
      imageSrc: "/Bockholmen/IMG_1603-2048x1536.jpeg",
    },
    {
      name: "Nynäshamn Hamn",
      spots: "10 platser tillgängliga",
      imageSrc: "/Bockholmen/IMG_1601-1536x1152.jpeg",
    },
  ];

  const testimonials = [
    {
      quote:
        "Hittade en perfekt plats i Nacka på tio minuter. Hamnen svarade direkt och jag hade bekräftad bokning samma dag. Otroligt smidigt.",
      name: "Magnus Karlsson",
      meta: "Båtägare, Täby · Bayliner 285",
      initials: "MK",
      avatarBg: "bg-[#0d9488]",
    },
    {
      quote:
        "Äntligen ett modernt alternativ till de gamla väntelistorna. Plats på Sandhamn — något jag aldrig trodde jag skulle hitta så lätt.",
      name: "Sara Lindström",
      meta: "Båtägare, Lidingö · Hallberg-Rassy 29",
      initials: "SL",
      avatarBg: "bg-[#1a3260]",
    },
    {
      quote:
        "Som hamnägare har Båtplats fyllt alla våra platser inför säsongen. Administrationen är minimal och betalningarna sköter sig själva.",
      name: "Erik Persson",
      meta: "Hamnägare · Vasahamnen, Lidingö",
      initials: "EP",
      avatarBg: "bg-[#2a4a85]",
    },
  ];

  return (
    <main className="min-h-screen bg-[#fafcff] text-[#0f1f3d]">
      <AuthNavbar currentPage="home" />

      {/* Hero — landing design (wave canvas, glow, full-width search) */}
      <section className="relative flex min-h-[min(100vh,920px)] flex-col justify-center overflow-hidden bg-[#0f1f3d] px-4 pb-28 pt-28 sm:px-6 sm:pb-24 sm:pt-32 md:px-12">
        <LandingHeroWave />
        <div
          className="pointer-events-none absolute left-1/2 top-[-20%] h-[600px] w-[800px] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(13,148,136,0.18)_0%,transparent_70%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute right-[-200px] top-0 h-full w-[500px] bg-[linear-gradient(135deg,transparent_40%,rgba(20,184,166,0.04)_60%,transparent_80%)]"
          aria-hidden
        />

        <div className="relative z-[2] mx-auto w-full max-w-[760px] text-center">
          <div className="mb-5 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#14b8a6]">
            <span className="h-px w-6 bg-[#0d9488]/60" />
            Säsong 2026 — Öppet för bokning
            <span className="h-px w-6 bg-[#0d9488]/60" />
          </div>
          <h1 className="text-[clamp(2.5rem,7vw,5.5rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-white">
            Din plats
            <br />
            på <span className="text-[#14b8a6]">vattnet</span>
          </h1>
          <p className="mx-auto mb-10 mt-6 max-w-[520px] text-base font-normal leading-relaxed text-white/60 sm:text-lg">
            Sveriges enklaste sätt att hyra säsongsplats för båt. Hundratals bryggor i Stockholms skärgård — hitta,
            boka och betala direkt via båtplats.nu.
          </p>

          <div
            id="search-hero"
            className="mx-auto w-full max-w-[700px] rounded-[2.25rem] bg-white p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.3)] ring-1 ring-white/10 sm:p-1.5"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0 sm:pr-1">
              <label className="search-field group flex flex-1 cursor-text flex-col rounded-[2rem] px-4 py-2.5 transition-colors hover:bg-[#f5f0e8] sm:px-5 sm:py-2.5">
                <span className="text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[#0f1f3d]">
                  Område
                </span>
                <input
                  type="text"
                  placeholder="Stockholm & skärgård"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-0.5 w-full bg-transparent text-sm text-[#4a5568] outline-none placeholder:text-[#8a96a8]"
                />
              </label>
              <div className="hidden w-px shrink-0 self-center bg-[#dce3ee] sm:block sm:h-9" />
              <label className="group relative flex flex-1 cursor-pointer flex-col rounded-[2rem] px-4 py-2.5 transition-colors hover:bg-[#f5f0e8] sm:px-5 sm:py-2.5">
                <span className="text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[#0f1f3d]">
                  Båtlängd
                </span>
                <select
                  value={boatLength}
                  onChange={(e) => setBoatLength(e.target.value)}
                  className="mt-0.5 w-full cursor-pointer appearance-none bg-transparent text-sm text-[#4a5568] outline-none"
                >
                  <option value="">Valfri storlek</option>
                  <option value="8">Upp till 8m</option>
                  <option value="12">8m – 12m</option>
                  <option value="16">12m – 16m</option>
                  <option value="17">16m+</option>
                </select>
              </label>
              <div className="hidden w-px shrink-0 self-center bg-[#dce3ee] sm:block sm:h-9" />
              <label className="flex flex-1 cursor-text flex-col rounded-[2rem] px-4 py-2.5 transition-colors hover:bg-[#f5f0e8] sm:px-5 sm:py-2.5">
                <span className="text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[#0f1f3d]">
                  Tillgänglig från
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-0.5 w-full bg-transparent text-sm text-[#4a5568] outline-none"
                />
              </label>
              <button
                type="button"
                onClick={handleSearch}
                className="mt-1 inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#0d9488] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_4px_20px_rgba(13,148,136,0.35)] transition hover:scale-[1.02] hover:bg-[#14b8a6] sm:mt-0 sm:ml-1 sm:self-center"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.8" />
                  <line x1="11" y1="11" x2="14" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Sök platser
              </button>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[13px] text-white/50 sm:gap-x-7">
            <div className="flex items-center gap-2">
              <strong className="font-semibold text-white/85">{stats.listings}+</strong>
              tillgängliga platser
            </div>
            <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />
            <div className="flex items-center gap-2">
              <strong className="font-semibold text-white/85">{stats.marinas}+</strong>
              partnerhamnar
            </div>
            <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />
            <div className="flex items-center gap-2">
              <strong className="font-semibold text-white/85">{stats.bookings}+</strong>
              bokningar
            </div>
            <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />
            <div className="flex items-center gap-2">
              Bokning på <strong className="font-semibold text-white/85">några minuter</strong>
            </div>
          </div>
        </div>

        <svg
          className="absolute bottom-0 left-0 right-0 h-16 w-full text-[#f5f0e8] sm:h-20"
          viewBox="0 0 1440 80"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M0 40Q360 10 720 40Q1080 70 1440 40L1440 80L0 80Z"
            fill="currentColor"
          />
        </svg>
      </section>

      {/* Beta — CTA banner style */}
      <section className="relative overflow-hidden bg-[#0d9488] px-4 py-14 sm:px-6 md:px-12 md:py-20">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]"
          viewBox="0 0 1440 200"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
        >
          <path
            d="M0 60Q360 20 720 60Q1080 100 1440 60"
            stroke="white"
            strokeWidth="80"
            fill="none"
          />
        </svg>
        <div className="relative z-[1] mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <h2 className="text-[clamp(1.5rem,4vw,3rem)] font-extrabold leading-tight tracking-[-0.04em] text-white">
              Redo för beta?
            </h2>
            <p className="mt-2 max-w-xl text-base text-white/75">
              Anmäl dig till betan och få exklusiv tidig tillgång till nya funktioner och platser.
            </p>
          </div>
          <Link
            href="/beta"
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-white px-8 py-4 text-base font-semibold text-[#0d9488] shadow-none transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
          >
            Anmäl intresse →
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-24 bg-[#f5f0e8] px-4 py-16 sm:px-6 md:px-12 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-12 grid gap-10 md:mb-16 md:grid-cols-2 md:gap-20 lg:items-center">
            <div>
              <RevealOnView>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d9488]">
                  Hur det fungerar
                </p>
              </RevealOnView>
              <RevealOnView delayClass="delay-75">
                <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-extrabold leading-tight tracking-[-0.035em] text-[#0f1f3d]">
                  Säsongsplats på
                  <br />
                  några minuter
                </h2>
              </RevealOnView>
            </div>
            <RevealOnView delayClass="delay-150">
              <p className="text-[17px] leading-relaxed text-[#4a5568]">
                Ingen lång väntelista, inga telefonsamtal. Hitta en ledig plats, välj din säsong och betala säkert direkt
                via Båtplats.
              </p>
            </RevealOnView>
          </div>

          <div className="grid gap-8 md:grid-cols-3 md:gap-8">
            {[
              {
                num: "01",
                title: "Sök & filtrera",
                desc: "Ange ditt område, båtlängd och önskad säsong. Se lediga platser på karta eller lista med full information om mått, faciliteter och pris.",
                icon: (
                  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
                    <circle cx="12" cy="12" r="7" stroke="#0d9488" strokeWidth="1.8" />
                    <line x1="17" y1="17" x2="22" y2="22" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                ),
              },
              {
                num: "02",
                title: "Välj & boka",
                desc: "Välj din plats och säsong. Hamnen bekräftar inom kort — ofta direkt. Du ser status och besked i din profil.",
                icon: (
                  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
                    <rect x="3" y="5" width="20" height="16" rx="3" stroke="#0d9488" strokeWidth="1.8" />
                    <line x1="3" y1="10" x2="23" y2="10" stroke="#0d9488" strokeWidth="1.8" />
                    <line x1="9" y1="3" x2="9" y2="7" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" />
                    <line x1="17" y1="3" x2="17" y2="7" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" />
                    <rect x="9" y="14" width="4" height="4" rx="1" fill="#0d9488" />
                  </svg>
                ),
              },
              {
                num: "03",
                title: "Förtöj & njut",
                desc: "Få information om platsen direkt efter bekräftad bokning. Allt du behöver — kontakt, villkor och översikt — samlat på ett ställe.",
                icon: (
                  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
                    <path
                      d="M6 18Q10 14 13 18Q16 22 20 18L19 21Q13 25 7 21Z"
                      stroke="#0d9488"
                      strokeWidth="1.8"
                      fill="none"
                      strokeLinejoin="round"
                    />
                    <line x1="13" y1="18" x2="13" y2="10" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M13 10L18 14" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                ),
              },
            ].map((step, i) => (
              <RevealOnView key={step.title} delayClass={i === 1 ? "delay-75" : i === 2 ? "delay-150" : ""}>
                <div>
                  <div className="mb-4 flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#0d9488]">
                    {step.num}
                    <span className="h-px flex-1 bg-[#0d9488]/20" />
                  </div>
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[14px] bg-white shadow-[0_2px_12px_rgba(15,31,61,0.08)]">
                    {step.icon}
                  </div>
                  <h3 className="mb-2 text-lg font-bold tracking-[-0.02em] text-[#0f1f3d]">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-[#4a5568]">{step.desc}</p>
                </div>
              </RevealOnView>
            ))}
          </div>
        </div>
      </section>

      {/* Stats — live data */}
      <section className="bg-[#0f1f3d] px-4 py-14 sm:px-6 md:px-12 md:py-16">
        <div className="mx-auto grid max-w-[1200px] gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {[
            [stats.marinas, "Partnerhamnar", "/kajplatser"],
            [stats.listings, "Tillgängliga båtplatser", "/kajplatser"],
            [stats.cities, "Städer", "/kajplatser"],
            [stats.bookings, "Bokningar gjorda", "/dashboard/renter"],
          ].map(([value, label, href]) => (
            <Link key={label} href={href} className="block text-center transition hover:opacity-90">
              <p className="text-[clamp(2rem,4vw,3.5rem)] font-extrabold leading-none tracking-[-0.04em] text-white">
                {value}
                <em className="not-italic text-[#14b8a6]">+</em>
              </p>
              <p className="mt-2 text-[13px] text-white/50">{label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Map */}
      <section className="scroll-mt-24 bg-[#fafcff] px-4 py-16 sm:px-6 md:px-12 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <RevealOnView>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d9488]">Karta</p>
            <h2 className="mb-8 text-[clamp(1.75rem,4vw,3rem)] font-extrabold leading-tight tracking-[-0.035em] text-[#0f1f3d]">
              Utforska båtplatser på karta
            </h2>
          </RevealOnView>
          <BerthMap height="480px" />
        </div>
      </section>

      {/* Featured listings */}
      <section id="listings" className="scroll-mt-24 bg-[#fafcff] px-4 pb-16 sm:px-6 md:px-12 md:pb-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <RevealOnView>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d9488]">Utvalda platser</p>
              </RevealOnView>
              <RevealOnView delayClass="delay-75">
                <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-extrabold leading-tight tracking-[-0.035em] text-[#0f1f3d]">
                  Populära bryggor
                  <br />
                  nära Stockholm
                </h2>
              </RevealOnView>
            </div>
            <RevealOnView>
              <Link
                href="/kajplatser"
                className="inline-flex items-center gap-1.5 rounded-lg border-[1.5px] border-[#e0f5f4] bg-transparent px-5 py-2.5 text-sm font-medium text-[#0d9488] transition hover:border-[#0d9488] hover:bg-[#e0f5f4]"
              >
                Se alla platser
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path
                    d="M3 7h8M8 4l3 3-3 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </RevealOnView>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredListings.map((item, idx) => (
              <RevealOnView key={item.id} delayClass={idx === 1 ? "delay-75" : idx === 2 ? "delay-150" : ""}>
                <Link
                  href={`/listings/${item.id}`}
                  className="group block overflow-hidden rounded-[22px] border border-[#dce3ee] bg-white transition duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_20px_60px_rgba(15,31,61,0.14)]"
                >
                  <div className="relative h-[200px] overflow-hidden">
                    <Image
                      src={item.imageSrc}
                      alt={`${item.title} — ${item.marina}`}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-white [clip-path:polygon(0_60%,100%_20%,100%_100%,0_100%)]"
                      aria-hidden
                    />
                    <span className="absolute right-3.5 top-3.5 rounded-full bg-[rgba(45,158,107,0.9)] px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                      Tillgänglig
                    </span>
                  </div>
                  <div className="px-5 pb-6 pt-1">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#0d9488]">{item.marina}</p>
                    <h3 className="mb-2.5 text-lg font-bold tracking-[-0.02em] text-[#0f1f3d]">{item.title}</h3>
                    <div className="mb-4 flex flex-wrap gap-3 text-[13px] text-[#4a5568]">
                      <span className="inline-flex items-center gap-1.5">
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
                          <path
                            d="M6.5 1C4.3 1 2.5 2.8 2.5 5C2.5 8 6.5 12 6.5 12C6.5 12 10.5 8 10.5 5C10.5 2.8 8.7 1 6.5 1Z"
                            stroke="#8a96a8"
                            strokeWidth="1.3"
                            fill="none"
                          />
                          <circle cx="6.5" cy="5" r="1.5" stroke="#8a96a8" strokeWidth="1.3" />
                        </svg>
                        {item.city}
                      </span>
                      {item.specs.map((s) => (
                        <span key={s}>{s}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-[#dce3ee] pt-3.5">
                      <p className="text-[22px] font-extrabold tracking-[-0.03em] text-[#0f1f3d]">
                        {item.price}{" "}
                        <span className="text-[13px] font-normal text-[#4a5568]">kr/säsong</span>
                      </p>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0d9488] text-white transition group-hover:scale-110 group-hover:bg-[#14b8a6]">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                          <path
                            d="M3 7h8M8 4l3 3-3 3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
              </RevealOnView>
            ))}
          </div>
        </div>
      </section>

      {/* Marinas */}
      <section className="bg-[#f5f0e8] px-4 py-16 sm:px-6 md:px-12 md:py-24">
        <div className="mx-auto max-w-[1200px] text-center">
          <RevealOnView>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d9488]">Hamnar</p>
            <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-extrabold tracking-[-0.035em] text-[#0f1f3d]">
              Utforska hamnar
            </h2>
            <p className="mx-auto mt-3 max-w-[560px] text-base text-[#8a96a8]">
              Utforska hamnar och båtplatser över hela landet — med tydliga priser och enkel bokning via båtplats.nu.
            </p>
          </RevealOnView>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {marinas.map((marina, i) => (
              <RevealOnView key={marina.name} delayClass={i === 1 ? "delay-75" : i === 2 ? "delay-150" : i === 3 ? "delay-200" : ""}>
                <Link
                  href="/kajplatser"
                  className="block rounded-xl border border-[#dce3ee] bg-white p-6 text-center transition hover:-translate-y-1 hover:border-[#0d9488] hover:shadow-lg"
                >
                  <div className="relative mx-auto mb-3 h-16 w-16 overflow-hidden rounded-full border-2 border-[#dce3ee] bg-[#ebe6dc]">
                    <Image
                      src={marina.imageSrc}
                      alt={marina.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <h3 className="text-[0.95rem] font-bold">{marina.name}</h3>
                  <p className="mt-1 text-[0.82rem] text-[#8a96a8]">{marina.spots}</p>
                </Link>
              </RevealOnView>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-[#f5f0e8] px-4 pb-16 sm:px-6 md:px-12 md:pb-24">
        <div className="mx-auto max-w-[1200px]">
          <RevealOnView>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d9488]">Vad båtägare säger</p>
            <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-extrabold leading-tight tracking-[-0.035em] text-[#0f1f3d]">
              Tusentals nöjda
              <br />
              båtplatssökare
            </h2>
          </RevealOnView>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <RevealOnView key={t.name} delayClass={i === 1 ? "delay-75" : i === 2 ? "delay-150" : ""}>
                <article className="h-full rounded-[22px] border border-[#dce3ee] bg-white p-8">
                  <div className="mb-4 flex gap-0.5 text-sm text-amber-500">
                    {"★★★★★".split("").map((s, j) => (
                      <span key={j}>{s}</span>
                    ))}
                  </div>
                  <p className="mb-5 text-[15px] italic leading-relaxed text-[#4a5568]">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white ${t.avatarBg}`}
                    >
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0f1f3d]">{t.name}</p>
                      <p className="text-xs text-[#8a96a8]">{t.meta}</p>
                    </div>
                  </div>
                </article>
              </RevealOnView>
            ))}
          </div>
        </div>
      </section>

      {/* Harbour owners */}
      <section id="harbour-owners" className="relative scroll-mt-24 overflow-hidden bg-[#0f1f3d] px-4 py-16 sm:px-6 md:px-12 md:py-24">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]"
          viewBox="0 0 1440 600"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
        >
          <path d="M0 200Q360 140 720 200Q1080 260 1440 200" stroke="white" strokeWidth="60" fill="none" />
          <path d="M0 350Q360 290 720 350Q1080 410 1440 350" stroke="white" strokeWidth="30" fill="none" />
        </svg>
        <div className="relative mx-auto max-w-[1200px]">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <RevealOnView>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#14b8a6]">För hamnägare</p>
              <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-extrabold leading-[1.05] tracking-[-0.04em] text-white">
                Fyll varje
                <br />
                bryggplats
              </h2>
              <p className="mt-5 text-[17px] leading-relaxed text-white/60">
                Anslut din hamn till Båtplats och nå båtägare som letar säsongsplats. Du bestämmer pris, villkor och
                tillgänglighet — vi sköter resten.
              </p>
              <ul className="mt-8 space-y-3.5 text-[15px] text-white/80">
                {[
                  "Gratis att lista — du betalar bara vid bokad plats",
                  "Smidiga betalningsflöden",
                  "Verifiering och tydliga avtal",
                  "Översikt över bokningar i realtid",
                ].map((line) => (
                  <li key={line} className="flex items-center gap-3">
                    <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-[rgba(13,148,136,0.4)] bg-[rgba(13,148,136,0.2)]">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                        <path
                          d="M2 6L5 9L10 3"
                          stroke="#14b8a6"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
              <Link
                href="/for-hamnar"
                className="mt-10 inline-flex items-center gap-2 rounded-lg bg-white px-7 py-3.5 text-[15px] font-semibold text-[#0f1f3d] transition hover:-translate-y-0.5 hover:bg-[#f5f0e8]"
              >
                Läs mer för hamnar
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path
                    d="M3 8h10M9 5l3 3-3 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </RevealOnView>

            <RevealOnView delayClass="delay-150">
              <div className="rounded-[22px] border border-white/10 bg-white/[0.06] p-7 backdrop-blur-md">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-lg font-bold text-white">Vasahamnen, Lidingö</span>
                  <span className="rounded-full border border-[rgba(13,148,136,0.3)] bg-[rgba(13,148,136,0.15)] px-2.5 py-1 text-[11px] font-semibold text-[#14b8a6]">
                    ● Aktiv
                  </span>
                </div>
                <div className="mb-6 grid grid-cols-3 gap-4">
                  {[
                    ["24", "Totalt platser"],
                    ["21", "Bokade"],
                    ["87%", "Beläggning"],
                  ].map(([val, lab]) => (
                    <div key={lab} className="rounded-lg bg-white/[0.04] p-3.5">
                      <div className="text-[22px] font-bold tracking-[-0.03em] text-white">{val}</div>
                      <div className="text-[11px] text-white/40">{lab}</div>
                    </div>
                  ))}
                </div>
                <p className="mb-2.5 text-[11px] uppercase tracking-[0.06em] text-white/40">Bokningar per månad</p>
                <div className="mb-6 flex h-12 items-end gap-1.5">
                  {[24, 40, 48, 44, 28].map((h, j) => (
                    <div key={j} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full rounded-sm bg-[#0d9488]"
                        style={{
                          height: `${h}px`,
                          opacity: j === 2 ? 1 : 0.35 + j * 0.08,
                        }}
                      />
                      <span className="text-[9px] text-white/30">{["Maj", "Jun", "Jul", "Aug", "Sep"][j]}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[rgba(13,148,136,0.25)] bg-[rgba(13,148,136,0.12)] px-4 py-3.5">
                  <span className="text-sm text-white/60">Intäkt denna säsong</span>
                  <span className="text-2xl font-extrabold tracking-[-0.03em] text-[#14b8a6]">84 600 kr</span>
                </div>
              </div>
            </RevealOnView>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative overflow-hidden bg-[#0d9488] px-4 py-14 sm:px-6 md:px-12 md:py-20">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]"
          viewBox="0 0 1440 200"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
        >
          <path
            d="M0 60Q360 20 720 60Q1080 100 1440 60"
            stroke="white"
            strokeWidth="80"
            fill="none"
          />
        </svg>
        <div className="relative z-[1] mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-extrabold leading-tight tracking-[-0.04em] text-white">
              Redo att hitta
              <br />
              din plats?
            </h2>
            <p className="mt-2 max-w-lg text-base text-white/75">
              Sök bland {stats.listings}+ platser — gratis att söka, boka när du hittat rätt.
            </p>
          </div>
          <Link
            href="/kajplatser"
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-white px-8 py-4 text-base font-semibold text-[#0d9488] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
          >
            Hitta min båtplats →
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AuthNavbar from "@/components/auth-navbar";
import BerthMap from "@/components/BerthMap";
import Footer from "@/components/footer";
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

    if (location.trim()) {
      params.set("location", location.trim());
    }

    if (boatLength) {
      params.set("boatLength", boatLength);
    }

    if (date) {
      params.set("date", date);
    }

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
                  listing.max_boat_length ? `${listing.max_boat_length}m längd` : "Längd ej angiven",
                  listing.max_boat_width ? `${listing.max_boat_width}m bredd` : "Bredd ej angiven",
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

  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#0f1f3d]">
      <AuthNavbar currentPage="home" />

      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f1f3d] via-[#0d2252] to-[#0d9488] px-6 pb-24 pt-[108px] md:pb-28">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
        <div className="relative mx-auto max-w-[1280px]">
          <div className="mx-auto max-w-[760px] text-center">
            <h1 className="text-[3.25rem] font-extrabold leading-[1.08] tracking-[-0.04em] text-white max-md:text-[2.2rem]">
              Hitta din perfekta <span className="text-[#14b8a6]">båtplats</span>
            </h1>
            <p className="mb-11 mt-5 text-base leading-relaxed text-white/80 md:text-[1.05rem]">
              Hundratals kajplatser i Stockholm. Kort vistelse eller hel säsong — allt på ett ställe.
            </p>
          </div>

          <div className="mx-auto flex max-w-[920px] flex-wrap gap-2 rounded-xl border border-[#dce3ee]/80 bg-white p-2.5 shadow-[0_8px_24px_rgba(15,31,61,0.14),0_1px_4px_rgba(15,31,61,0.08)]">
            <div className="flex min-w-[140px] flex-1 flex-col px-3 py-2">
              <label className="mb-0.5 text-[0.72rem] font-semibold uppercase tracking-[0.5px] text-[#8a96a8]">
                Plats
              </label>
              <input
                type="text"
                placeholder="T.ex. Göteborg eller Nynäshamn"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="w-full bg-transparent text-[0.9rem] text-[#0f1f3d] outline-none"
              />
            </div>
            <div className="my-2 hidden w-px self-stretch bg-[#dce3ee] md:block" />
            <div className="flex min-w-[140px] flex-1 flex-col px-3 py-2">
              <label className="mb-0.5 text-[0.72rem] font-semibold uppercase tracking-[0.5px] text-[#8a96a8]">
                Båtlängd
              </label>
              <select
                value={boatLength}
                onChange={(event) => setBoatLength(event.target.value)}
                className="w-full bg-transparent text-[0.9rem] text-[#0f1f3d] outline-none"
              >
                <option value="">Valfri storlek</option>
                <option value="8">Upp till 8m</option>
                <option value="12">8m – 12m</option>
                <option value="16">12m – 16m</option>
                <option value="17">16m+</option>
              </select>
            </div>
            <div className="my-2 hidden w-px self-stretch bg-[#dce3ee] md:block" />
            <div className="flex min-w-[140px] flex-1 flex-col px-3 py-2">
              <label className="mb-0.5 text-[0.72rem] font-semibold uppercase tracking-[0.5px] text-[#8a96a8]">
                Tillgänglig från
              </label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full bg-transparent text-[0.9rem] text-[#0f1f3d] outline-none"
              />
            </div>
            <button
              onClick={handleSearch}
              className="rounded-xl bg-[#0d9488] px-7 py-3 text-base font-semibold text-white shadow-[0_8px_18px_rgba(13,148,136,0.28)] transition hover:-translate-y-0.5 hover:bg-[#14b8a6] hover:shadow-[0_12px_24px_rgba(20,184,166,0.32)]"
            >
              Sök
            </button>
          </div>
        </div>
      </section>

      <section className="relative bg-gradient-to-r from-[#0d9488] via-[#14b8a6] to-[#14b8a6] px-6 py-8 text-white">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-[0.78rem] font-bold uppercase tracking-[1px] text-white/80">🚀 Lansering snart!</p>
            <h2 className="mt-1 text-[1.5rem] font-extrabold leading-tight sm:text-[1.8rem]">
              Anmäl dig till betan och få exklusiv tidig tillgång
            </h2>
          </div>
          <Link
            href="/beta"
            className="inline-flex rounded-lg border border-white/25 bg-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/25 hover:shadow-lg"
          >
            Anmäl intresse →
          </Link>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#0d2252] px-6 pb-9 pt-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#14b8a6]/30 via-[#14b8a6]/10 to-transparent" />
        <div className="mx-auto grid max-w-[1280px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [stats.marinas, "Partnerhamnar", "/kajplatser"],
            [stats.listings, "Tillgängliga båtplatser", "/kajplatser"],
            [stats.cities, "Städer", "/kajplatser"],
            [stats.bookings, "Bokningar gjorda", "/dashboard/renter"],
          ].map(([value, label, href]) => (
            <Link
              key={label}
              href={href}
              className="block cursor-pointer rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-center backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/[0.08] hover:shadow-[0_12px_28px_rgba(0,0,0,0.22)]"
            >
              <p className="text-[2rem] font-black text-white">{value}</p>
              <p className="mt-1 text-[0.82rem] text-white/70">{label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-6 pb-20 pt-16">
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-5">
            <p className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#0d9488]">KARTA</p>
            <h2 className="mt-1 text-[2rem] font-extrabold leading-tight text-[#0f1f3d]">
              Utforska båtplatser på karta
            </h2>
          </div>
          <BerthMap height="480px" />
        </div>
      </section>

      <section id="for-marinas" className="px-6 py-20">
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2.5 text-[0.8rem] font-bold uppercase tracking-[1px] text-[#0d9488]">
                Båtplats.nu
              </p>
              <h2 className="text-[2rem] font-extrabold leading-tight">
                Utvalda båtplatser
              </h2>
            </div>
            <Link
              href="/kajplatser"
              className="inline-flex rounded-lg border-2 border-[#0d9488] px-5 py-2.5 text-[0.9rem] font-semibold text-[#0d9488] transition hover:bg-[#0d9488] hover:text-white"
            >
              Visa alla båtplatser
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredListings.map((item) => (
              <Link
                key={item.id}
                href={`/listings/${item.id}`}
                className="block cursor-pointer overflow-hidden rounded-xl border border-[#dce3ee] bg-white shadow-[0_1px_4px_rgba(15,31,61,0.08),0_1px_2px_rgba(15,31,61,0.05)] transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <article>
                  <div className="relative h-[200px] bg-[#ebe6dc]">
                    <Image
                      src={item.imageSrc}
                      alt={`${item.title} at ${item.marina}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                  <div className="p-4">
                    <p className="mb-1 text-[0.78rem] font-semibold uppercase tracking-[0.5px] text-[#0d9488]">
                      {item.marina}
                    </p>
                    <h3 className="mb-1 text-base font-bold">{item.title}</h3>
                    <p className="mb-3 text-[0.83rem] text-[#8a96a8]">{item.city}</p>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {item.specs.map((spec) => (
                        <span
                          key={spec}
                          className="rounded-full border border-[#dce3ee] bg-[#ebe6dc] px-2.5 py-1 text-[0.76rem] text-[#8a96a8]"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-[#dce3ee] pt-3">
                      <p className="text-[1.1rem] font-extrabold text-[#0f1f3d]">
                        {item.price} SEK
                        <span className="ml-0.5 text-xs font-normal text-[#8a96a8]">
                          /månad
                        </span>
                      </p>
                      <span className="rounded-full bg-[#dff5ea] px-2.5 py-1 text-[0.74rem] font-semibold text-[#2d9e6b]">
                        Tillgänglig
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#ebe6dc] px-6 py-20">
        <div className="mx-auto max-w-[1280px] text-center">
          <p className="mb-2.5 text-[0.8rem] font-bold uppercase tracking-[1px] text-[#0d9488]">
            Hamnar
          </p>
          <h2 className="text-[2rem] font-extrabold">Utforska hamnar</h2>
          <p className="mx-auto mt-3 max-w-[560px] text-base text-[#8a96a8]">
            Utforska hamnar och båtplatser över hela landet — med tydliga priser
            och enkel bokning via båtplats.nu.
          </p>

          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {marinas.map((marina) => (
              <Link
                key={marina.name}
                href="/kajplatser"
                className="block cursor-pointer rounded-xl border border-[#dce3ee] bg-white p-6 text-center transition hover:-translate-y-0.5 hover:border-[#0d9488] hover:shadow-lg"
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
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-[1280px]">
          <div className="text-center">
            <p className="mb-2.5 text-[0.8rem] font-bold uppercase tracking-[1px] text-[#0d9488]">
              Så fungerar det
            </p>
            <h2 className="text-[2rem] font-extrabold">Enkelt. Snabbt. Tryggt.</h2>
          </div>
          <div className="relative mt-12 grid gap-10 md:grid-cols-3">
            <div className="pointer-events-none absolute left-[calc(16.67%+40px)] right-[calc(16.67%+40px)] top-8 hidden h-0.5 bg-gradient-to-r from-[#0d9488] to-[#14b8a6] md:block" />
            {[
              [
                "1",
                "Lista din plats",
                "Hamnar skapar en annons med bilder, mått och pris på bara några minuter.",
              ],
              [
                "2",
                "Hitta din kajplats",
                "Båtägare söker och filtrerar efter storlek, plats och pris.",
              ],
              [
                "3",
                "Boka & bekräfta",
                "Skicka en förfrågan direkt till hamnen och bekräfta din plats smidigt.",
              ],
            ].map(([step, title, copy]) => (
              <article key={title} className="relative z-10 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#0d9488] text-[1.4rem] font-black text-white shadow-[0_4px_12px_rgba(13,148,136,0.3)]">
                  {step}
                </div>
                <h3 className="mb-2 text-[1.1rem] font-bold">{title}</h3>
                <p className="text-[0.9rem] leading-relaxed text-[#8a96a8]">
                  {copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

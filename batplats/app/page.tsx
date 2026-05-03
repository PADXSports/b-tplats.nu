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
    <main className="min-h-screen bg-[#f8fafc] text-[#1e293b]">
      <AuthNavbar currentPage="home" />

      <section className="relative overflow-hidden bg-gradient-to-br from-[#0a2342] via-[#0d3060] to-[#0a4a6b] px-6 pb-20 pt-[100px]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
        <div className="relative mx-auto max-w-[1280px]">
          <div className="mx-auto max-w-[680px] text-center">
            <h1 className="text-[3rem] font-black leading-[1.1] tracking-[-0.5px] text-white max-md:text-[2rem]">
              Hitta din perfekta{" "}
              <span className="text-[#14b8a8]">båtplats</span> — hela Sverige på{" "}
              <span className="text-[#14b8a8]">båtplats.nu</span>
            </h1>
            <p className="mb-9 mt-4 text-[1.15rem] leading-relaxed text-white/80">
              Hundratals kajplatser och gästhamnar från Göteborg till Stockholm.
              Kort vistelse eller hel säsong — allt på ett ställe.
            </p>
          </div>

          <div className="mx-auto flex max-w-[900px] flex-wrap gap-2 rounded-xl bg-white p-2 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
            <div className="flex min-w-[140px] flex-1 flex-col px-3 py-[6px]">
              <label className="mb-0.5 text-[0.72rem] font-semibold uppercase tracking-[0.5px] text-[#64748b]">
                Plats
              </label>
              <input
                type="text"
                placeholder="Stad eller hamn..."
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="w-full bg-transparent text-[0.9rem] text-[#1e293b] outline-none"
              />
            </div>
            <div className="my-2 hidden w-px bg-[#e2e8f0] md:block" />
            <div className="flex min-w-[140px] flex-1 flex-col px-3 py-[6px]">
              <label className="mb-0.5 text-[0.72rem] font-semibold uppercase tracking-[0.5px] text-[#64748b]">
                Båtlängd
              </label>
              <select
                value={boatLength}
                onChange={(event) => setBoatLength(event.target.value)}
                className="w-full bg-transparent text-[0.9rem] text-[#1e293b] outline-none"
              >
                <option value="">Valfri storlek</option>
                <option value="8">Upp till 8m</option>
                <option value="12">8m – 12m</option>
                <option value="16">12m – 16m</option>
                <option value="17">16m+</option>
              </select>
            </div>
            <div className="my-2 hidden w-px bg-[#e2e8f0] md:block" />
            <div className="flex min-w-[140px] flex-1 flex-col px-3 py-[6px]">
              <label className="mb-0.5 text-[0.72rem] font-semibold uppercase tracking-[0.5px] text-[#64748b]">
                Tillgänglig från
              </label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full bg-transparent text-[0.9rem] text-[#1e293b] outline-none"
              />
            </div>
            <button
              onClick={handleSearch}
              className="rounded-lg bg-[#0d9488] px-7 py-3 text-base font-semibold text-white transition hover:bg-[#14b8a8]"
            >
              Sök
            </button>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0d2d54] px-6 py-7">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-14">
          {[
            [stats.marinas, "Partnerhamnar", "/kajplatser"],
            [stats.listings, "Tillgängliga båtplatser", "/kajplatser"],
            [stats.cities, "Städer", "/kajplatser"],
            [stats.bookings, "Bokningar gjorda", "/dashboard/renter"],
          ].map(([value, label, href]) => (
            <Link
              key={label}
              href={href}
              className="block cursor-pointer rounded-xl px-3 py-2 text-center transition hover:bg-white/5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
            >
              <p className="text-[2rem] font-black text-white">{value}</p>
              <p className="mt-0.5 text-[0.83rem] text-white/60">{label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-6 pb-20 pt-16">
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-5">
            <p className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#0d9488]">KARTA</p>
            <h2 className="mt-1 text-[2rem] font-extrabold leading-tight text-[#0a2342]">
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
                className="block cursor-pointer overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)] transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <article>
                  <div className="relative h-[200px] bg-[#f1f5f9]">
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
                    <p className="mb-3 text-[0.83rem] text-[#64748b]">{item.city}</p>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {item.specs.map((spec) => (
                        <span
                          key={spec}
                          className="rounded-full border border-[#e2e8f0] bg-[#f1f5f9] px-2.5 py-1 text-[0.76rem] text-[#64748b]"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-[#e2e8f0] pt-3">
                      <p className="text-[1.1rem] font-extrabold text-[#0a2342]">
                        {item.price} SEK
                        <span className="ml-0.5 text-xs font-normal text-[#64748b]">
                          /månad
                        </span>
                      </p>
                      <span className="rounded-full bg-[#dcfce7] px-2.5 py-1 text-[0.74rem] font-semibold text-[#15803d]">
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

      <section className="bg-[#f1f5f9] px-6 py-20">
        <div className="mx-auto max-w-[1280px] text-center">
          <p className="mb-2.5 text-[0.8rem] font-bold uppercase tracking-[1px] text-[#0d9488]">
            Hamnar
          </p>
          <h2 className="text-[2rem] font-extrabold">Utforska hamnar</h2>
          <p className="mx-auto mt-3 max-w-[560px] text-base text-[#64748b]">
            Utforska hamnar och båtplatser över hela landet — med tydliga priser
            och enkel bokning via båtplats.nu.
          </p>

          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {marinas.map((marina) => (
              <Link
                key={marina.name}
                href="/kajplatser"
                className="block cursor-pointer rounded-xl border border-[#e2e8f0] bg-white p-6 text-center transition hover:-translate-y-0.5 hover:border-[#0d9488] hover:shadow-lg"
              >
                <div className="relative mx-auto mb-3 h-16 w-16 overflow-hidden rounded-full border-2 border-[#e2e8f0] bg-[#f1f5f9]">
                  <Image
                    src={marina.imageSrc}
                    alt={marina.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <h3 className="text-[0.95rem] font-bold">{marina.name}</h3>
                <p className="mt-1 text-[0.82rem] text-[#64748b]">{marina.spots}</p>
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
            <div className="pointer-events-none absolute left-[calc(16.67%+40px)] right-[calc(16.67%+40px)] top-8 hidden h-0.5 bg-gradient-to-r from-[#0d9488] to-[#14b8a8] md:block" />
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
                <p className="text-[0.9rem] leading-relaxed text-[#64748b]">
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

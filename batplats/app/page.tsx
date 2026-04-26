"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthNavbar from "@/components/auth-navbar";
import BerthMap from "@/components/BerthMap";
import { mockBerths } from "@/lib/mock-berths";

export default function Home() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [boatLength, setBoatLength] = useState("");
  const [date, setDate] = useState("");

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

  const featuredListings = mockBerths.slice(0, 3).map((berth) => ({
    marina: berth.marinaName,
    title: berth.name,
    city: berth.city,
    specs: berth.specs,
    price: berth.pricePerMonth.toLocaleString("sv-SE"),
    imageSrc: berth.imageSrc,
  }));

  const marinas = [
    {
      name: "Goteborg Maritim",
      spots: "18 berths available",
      imageSrc: "https://picsum.photos/seed/dock12/600/400",
    },
    {
      name: "Stockholms Segelsallskap",
      spots: "14 berths available",
      imageSrc: "https://picsum.photos/seed/dock34/600/400",
    },
    {
      name: "Bockholmen Marin",
      spots: "6 berths available",
      imageSrc: "/Bockholmen/IMG_1603-2048x1536.jpeg",
    },
    {
      name: "Nynäshamn Hamn",
      spots: "10 berths available",
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
                Location
              </label>
              <input
                type="text"
                placeholder="City or marina…"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="w-full bg-transparent text-[0.9rem] text-[#1e293b] outline-none"
              />
            </div>
            <div className="my-2 hidden w-px bg-[#e2e8f0] md:block" />
            <div className="flex min-w-[140px] flex-1 flex-col px-3 py-[6px]">
              <label className="mb-0.5 text-[0.72rem] font-semibold uppercase tracking-[0.5px] text-[#64748b]">
                Boat Length
              </label>
              <select
                value={boatLength}
                onChange={(event) => setBoatLength(event.target.value)}
                className="w-full bg-transparent text-[0.9rem] text-[#1e293b] outline-none"
              >
                <option value="">Any size</option>
                <option value="8">Up to 8m</option>
                <option value="12">8m – 12m</option>
                <option value="16">12m – 16m</option>
                <option value="17">16m+</option>
              </select>
            </div>
            <div className="my-2 hidden w-px bg-[#e2e8f0] md:block" />
            <div className="flex min-w-[140px] flex-1 flex-col px-3 py-[6px]">
              <label className="mb-0.5 text-[0.72rem] font-semibold uppercase tracking-[0.5px] text-[#64748b]">
                Available From
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
              Search
            </button>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0d2d54] px-6 py-7">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-14">
          {[
            ["4", "Partner Marinas"],
            ["48", "Available Berths"],
            ["3", "Countries"],
            ["1,200+", "Bookings Made"],
          ].map(([value, label]) => (
            <div key={label} className="text-center">
              <p className="text-[2rem] font-black text-white">{value}</p>
              <p className="mt-0.5 text-[0.83rem] text-white/60">{label}</p>
            </div>
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
            <button className="rounded-lg border-2 border-[#0d9488] px-5 py-2.5 text-[0.9rem] font-semibold text-[#0d9488] transition hover:bg-[#0d9488] hover:text-white">
              View all listings
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredListings.map((item) => (
              <article
                key={item.title}
                className="cursor-pointer overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_15px_rgba(0,0,0,0.08),0_4px_6px_rgba(0,0,0,0.05)]"
              >
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
                        /month
                      </span>
                    </p>
                    <span className="rounded-full bg-[#dcfce7] px-2.5 py-1 text-[0.74rem] font-semibold text-[#15803d]">
                      Available
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f1f5f9] px-6 py-20">
        <div className="mx-auto max-w-[1280px] text-center">
          <p className="mb-2.5 text-[0.8rem] font-bold uppercase tracking-[1px] text-[#0d9488]">
            Marinas
          </p>
          <h2 className="text-[2rem] font-extrabold">Browse by Marina</h2>
          <p className="mx-auto mt-3 max-w-[560px] text-base text-[#64748b]">
            Utforska hamnar och båtplatser över hela landet — med tydliga priser
            och enkel bokning via båtplats.nu.
          </p>

          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {marinas.map((marina) => (
              <div
                key={marina.name}
                className="cursor-pointer rounded-xl border border-[#e2e8f0] bg-white p-6 text-center transition hover:-translate-y-0.5 hover:border-[#0d9488] hover:shadow-[0_4px_6px_rgba(0,0,0,0.07),0_2px_4px_rgba(0,0,0,0.05)]"
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
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-[1280px]">
          <div className="text-center">
            <p className="mb-2.5 text-[0.8rem] font-bold uppercase tracking-[1px] text-[#0d9488]">
              How it works
            </p>
            <h2 className="text-[2rem] font-extrabold">Simple. Fast. Reliable.</h2>
          </div>
          <div className="relative mt-12 grid gap-10 md:grid-cols-3">
            <div className="pointer-events-none absolute left-[calc(16.67%+40px)] right-[calc(16.67%+40px)] top-8 hidden h-0.5 bg-gradient-to-r from-[#0d9488] to-[#14b8a8] md:block" />
            {[
              [
                "1",
                "List your spot",
                "Harbours create a free listing with photos, dimensions, amenities, and pricing in minutes.",
              ],
              [
                "2",
                "Find your dock",
                "Boat owners browse and filter listings by size, location, amenities, and price.",
              ],
              [
                "3",
                "Book & confirm",
                "Send an inquiry directly to the marina. Confirm your berth and set sail with confidence.",
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

      <footer className="bg-[#0a2342] px-6 pb-6 pt-12 text-white/70">
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-10 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <p className="text-xl font-bold text-white">Båtplats.nu</p>
              <p className="mt-3 text-[0.88rem] leading-relaxed text-white/50">
                Sveriges självklara mötesplats för båtägare och hamnar. Hitta,
                jämför och boka båtplats — alltid via båtplats.nu.
              </p>
            </div>
            <div>
              <h4 className="mb-3.5 text-[0.85rem] font-bold uppercase tracking-[0.5px] text-white/90">
                Platform
              </h4>
              <div className="space-y-2 text-[0.87rem] text-white/55">
                <p>Browse Listings</p>
                <p>List your spot</p>
                <p>Pricing</p>
                <p>Map view</p>
              </div>
            </div>
            <div>
              <h4 className="mb-3.5 text-[0.85rem] font-bold uppercase tracking-[0.5px] text-white/90">
                Company
              </h4>
              <div className="space-y-2 text-[0.87rem] text-white/55">
                <p>About us</p>
                <p>Blog</p>
                <p>Press</p>
                <p>Careers</p>
              </div>
            </div>
            <div>
              <h4 className="mb-3.5 text-[0.85rem] font-bold uppercase tracking-[0.5px] text-white/90">
                Support
              </h4>
              <div className="space-y-2 text-[0.87rem] text-white/55">
                <p>Help centre</p>
                <p>kontakt@båtplats.nu</p>
                <p>Privacy policy</p>
                <p>Terms of service</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-[0.82rem]">
            <span>© 2026 Båtplats.nu · båtplats.nu</span>
            <span>Made with ♥ in STOCKHOLM, Sweden</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

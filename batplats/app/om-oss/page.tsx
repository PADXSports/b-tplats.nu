"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";

import AuthNavbar from "@/components/auth-navbar";
import Footer from "@/components/footer";
import LandingHeroWave from "@/components/landing-hero-wave";
import { createClient } from "@/lib/supabase/client";

type PlatformStats = {
  marinas: string;
  listings: string;
  cities: string;
};

const VALUES = [
  {
    title: "Enkelhet",
    description:
      "Tydlig information, snabba flöden och mindre administration för både båtägare och hamnägare.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <path
          d="M6 14h16M14 6v16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect x="4" y="4" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    title: "Trygghet",
    description:
      "Verifierade profiler, transparenta villkor och säkra betalningsflöden ger trygghet i varje bokning.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <path
          d="M14 4l8 3v7c0 5.25-3.5 9.75-8 11-4.5-1.25-8-5.75-8-11V7l8-3z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M10 14l2.5 2.5L18 11"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Gemenskap",
    description:
      "Vi bygger broar mellan hamnar och båtägare och stärker den svenska båtlivsgemenskapen.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <circle cx="10" cy="11" r="3.5" stroke="currentColor" strokeWidth="2" />
        <circle cx="18" cy="11" r="3.5" stroke="currentColor" strokeWidth="2" />
        <path
          d="M4 22c0-3.5 2.5-6 6-6s6 2.5 6 6M16 22c0-2.5 1.5-4.5 4-5.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
] as const;

async function loadPlatformStats(
  supabase: ReturnType<typeof createClient>,
): Promise<PlatformStats> {
  const [listingsResult, availableResult] = await Promise.all([
    supabase
      .from("listings")
      .select("harbour_name, city, owner_id, harbours!inner(owner_id)")
      .not("owner_id", "is", null)
      .not("harbours.owner_id", "is", null),
    supabase
      .from("listings")
      .select("id, harbours!inner(owner_id)", { count: "exact", head: true })
      .eq("is_available", true)
      .not("owner_id", "is", null)
      .not("harbours.owner_id", "is", null),
  ]);

  if (listingsResult.error) console.error(listingsResult.error);
  if (availableResult.error) console.error(availableResult.error);

  const uniqueHarbours = new Set(
    listingsResult.data?.map((listing) => listing.harbour_name).filter(Boolean),
  ).size;

  const uniqueCities = new Set(listingsResult.data?.map((listing) => listing.city).filter(Boolean)).size;

  const availableCount = availableResult.count ?? 0;

  return {
    marinas: uniqueHarbours.toLocaleString("sv-SE"),
    listings: availableCount.toLocaleString("sv-SE"),
    cities: uniqueCities.toLocaleString("sv-SE"),
  };
}

function OmOssContent() {
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState<PlatformStats>({
    marinas: "0",
    listings: "0",
    cities: "0",
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const nextStats = await loadPlatformStats(supabase);
        setStats(nextStats);
      } catch (error) {
        console.error("Failed to load platform stats:", error);
      }
    };

    void fetchStats();
  }, [supabase]);

  const statItems = [
    { value: stats.marinas, label: "Partnerhamnar", showPlus: true },
    { value: stats.listings, label: "Tillgängliga platser", showPlus: true },
    { value: stats.cities, label: "Städer", showPlus: true },
    { value: "Direkt", label: "Direktbokning", showPlus: false },
  ] as const;

  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#0a1628]">
      <AuthNavbar currentPage="home" />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0a1628] px-4 pb-20 pt-28 sm:px-6 sm:pb-24 sm:pt-32 md:px-12">
        <LandingHeroWave />
        <div
          className="pointer-events-none absolute left-1/2 top-[-20%] h-[500px] w-[700px] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(13,148,136,0.2)_0%,transparent_70%)]"
          aria-hidden
        />
        <div className="relative z-[2] mx-auto w-full max-w-[760px] text-center text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#14b8a6]">Om oss</p>
          <h1 className="mt-4 text-[clamp(2rem,5vw,3.25rem)] font-extrabold leading-tight tracking-[-0.04em]">
            Vi kopplar ihop hamnar och båtägare
          </h1>
          <p className="mx-auto mt-5 max-w-[640px] text-base leading-relaxed text-white/70 sm:text-lg">
            Båtplats.nu är byggt av seglare som vill göra det enkelt att hitta och lista båtplatser i Sverige.
          </p>
        </div>
        <svg
          className="absolute bottom-0 left-0 right-0 h-16 w-full text-[#f5f0e8] sm:h-20"
          viewBox="0 0 1440 80"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d="M0 40Q360 10 720 40Q1080 70 1440 40L1440 80L0 80Z" fill="currentColor" />
        </svg>
      </section>

      {/* Story */}
      <section className="px-4 py-14 sm:px-6 md:px-12 md:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-10 md:grid-cols-2 md:gap-16 lg:gap-20">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d9488]">Vilka vi är</p>
            <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold leading-tight tracking-[-0.035em] text-[#0a1628]">
              En digital marknadsplats för båtplatser
            </h2>
          </div>
          <div className="text-[17px] leading-relaxed text-[#4a5568]">
            <p>
              Vi hjälper hamnägare att fylla lediga platser och ger båtägare en tydlig väg till rätt kajplats. Med
              bättre överblick, snabbare kommunikation och modern bokningshantering sparar båda sidor tid och får en
              tryggare upplevelse.
            </p>
            <p className="mt-4">
              Båtplats.nu grundades av seglare som tröttnat på väntelistor och telefonsamtal.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-[#e8e0d4] bg-[#f5f0e8] px-4 py-14 sm:px-6 md:px-12 md:py-24">
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
          {statItems.map(({ value, label, showPlus }) => (
            <div key={label} className="text-center">
              <p className="text-[clamp(2rem,4vw,3.25rem)] font-extrabold leading-none tracking-[-0.04em] text-[#0a1628]">
                {value}
                {showPlus ? <span className="text-[#0d9488]">+</span> : null}
              </p>
              <p className="mt-2 text-[13px] text-[#8a96a8]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="bg-white px-4 py-14 sm:px-6 md:px-12 md:py-24">
        <div className="mx-auto max-w-[800px] text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d9488]">Vår mission</p>
          <h2 className="mt-4 text-[clamp(1.75rem,4vw,3rem)] font-extrabold leading-tight tracking-[-0.035em] text-[#0a1628]">
            Att göra båtplatser lika enkla att boka som ett hotell
          </h2>
          <p className="mx-auto mt-6 max-w-[640px] text-[18px] leading-relaxed text-[#4a5568] md:text-[19px]">
            Vi vill minska friktionen i hela processen, från att upptäcka en hamn till att slutföra en bokning. Genom
            transparent information, säkra flöden och enkel administration hjälper vi fler att komma ut på vattnet.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="px-4 py-14 sm:px-6 md:px-12 md:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-6 md:grid-cols-3 md:gap-8">
          {VALUES.map(({ title, description, icon }) => (
            <div
              key={title}
              className="rounded-2xl border border-[#dce3ee] bg-white p-8 shadow-[0_4px_16px_rgba(10,22,40,0.06)]"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(13,148,136,0.1)] text-[#0d9488]">
                {icon}
              </div>
              <h3 className="text-lg font-bold text-[#0a1628]">{title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[#4a5568]">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="bg-white px-4 py-14 sm:px-6 md:px-12 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d9488]">Team</p>
          <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold tracking-[-0.035em] text-[#0a1628]">
            Teamet bakom Båtplats.nu
          </h2>

          <div className="mt-10 overflow-hidden rounded-2xl border border-[#dce3ee] bg-[#fafcff] shadow-[0_4px_16px_rgba(10,22,40,0.06)] md:flex md:items-center">
            <div className="relative mx-auto h-[220px] w-full shrink-0 md:mx-0 md:h-[280px] md:w-[280px]">
              <Image
                src="/carl-lagerberg.jpg"
                alt="Carl Lagerberg"
                fill
                sizes="(max-width: 768px) 100vw, 280px"
                className="object-cover"
                style={{ objectPosition: "center 22%" }}
              />
            </div>
            <div className="p-8 md:p-10">
              <p className="text-xl font-bold text-[#0a1628]">Carl Lagerberg</p>
              <p className="mt-1 text-sm font-semibold text-[#0d9488]">Grundare & VD</p>
              <p className="mt-4 max-w-[520px] text-[16px] leading-relaxed text-[#4a5568]">
                Carl grundade Båtplats.nu med visionen att förenkla livet för båtägare och hamnägare i Sverige.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="px-4 py-14 sm:px-6 md:px-12 md:py-24">
        <div className="mx-auto max-w-[1200px] rounded-2xl bg-gradient-to-br from-[#0a1628] via-[#0d1f3d] to-[#0d2252] px-8 py-12 text-white md:px-14 md:py-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#14b8a6]">Kontakt</p>
          <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-tight tracking-[-0.035em]">
            Hör av dig till oss
          </h2>
          <p className="mt-4 max-w-[560px] text-[16px] leading-relaxed text-white/75">
            Har du frågor om plattformen, partnerskap eller hur du kommer igång som hamnägare?
          </p>
          <a
            href="mailto:kontakt@batplats.nu"
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-[#0d9488] px-7 py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#0f766e]"
          >
            Maila oss
          </a>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-14 sm:px-6 md:px-12 md:py-24">
        <div className="mx-auto max-w-[720px] text-center">
          <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold tracking-[-0.035em] text-[#0a1628]">
            Redo att komma ut på vattnet?
          </h2>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/kajplatser"
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#0d9488] px-8 py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#0f766e] sm:w-auto"
            >
              Sök båtplatser
            </Link>
            <Link
              href="/hyr-ut"
              className="inline-flex w-full items-center justify-center rounded-xl border-2 border-[#0a1628] bg-transparent px-8 py-3.5 text-[15px] font-semibold text-[#0a1628] transition hover:bg-[#0a1628] hover:text-white sm:w-auto"
            >
              Hyr ut din plats
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default function OmOssPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f5f0e8] text-[#0a1628]">
          <p className="text-sm font-medium text-[#8a96a8]">Laddar...</p>
        </main>
      }
    >
      <OmOssContent />
    </Suspense>
  );
}

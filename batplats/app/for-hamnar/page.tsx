"use client";

import Link from "next/link";
import {
  BadgeCheck,
  Check,
  CreditCard,
  LayoutDashboard,
  TrendingUp,
} from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AuthNavbar from "@/components/auth-navbar";
import Footer from "@/components/footer";
import LandingHeroWave from "@/components/landing-hero-wave";
import { createClient } from "@/lib/supabase/client";

type PlatformStats = {
  marinas: string;
  listings: string;
  cities: string;
};

const MARINA_BENEFITS = [
  {
    icon: TrendingUp,
    title: "Ökad beläggning",
    description: "Nå båtägare som aktivt söker plats i ert område och fyll lediga bryggplatser snabbare.",
  },
  {
    icon: LayoutDashboard,
    title: "Allt i ett dashboard",
    description: "Hantera platser, bokningar och intäkter på ett ställe — utan kalkylark och e-posttrådar.",
  },
  {
    icon: CreditCard,
    title: "Automatiska betalningar",
    description: "Säker betalning via Stripe med utbetalning direkt till hamnens konto efter bokning.",
  },
  {
    icon: BadgeCheck,
    title: "Ingen fast kostnad",
    description: "Betala endast vid bekräftad bokning. Inga månadsavgifter eller startkostnader.",
  },
] as const;

const PROCESS_STEPS = [
  {
    step: "01",
    title: "Registrera er hamn",
    copy: "Skapa ert hamnkonto, lägg in grunduppgifter och bjud in kollegor som ska administrera platserna.",
  },
  {
    step: "02",
    title: "Lista era platser",
    copy: "Publicera lediga platser med mått, pris, bilder och tillgänglighet — synliga för båtägare direkt.",
  },
  {
    step: "03",
    title: "Ta emot bokningar och få betalt",
    copy: "Båtägare bokar online. Ni får notis, ser allt i dashboardet och får utbetalning automatiskt.",
  },
] as const;

const DASHBOARD_BULLETS = [
  "Hantera flera platser och bryggor i samma vy",
  "Godkänn och följ bokningar i realtid",
  "Följ intäkter och beläggning per säsong",
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

function TealIconBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(13,148,136,0.10)] text-[#0d9488]">
      {children}
    </div>
  );
}

function HostDashboardMockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1f3d] shadow-[0_24px_48px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#f87171]" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-[#4ade80]" aria-hidden />
        <span className="mx-auto text-[11px] text-white/40">dashboard.batplats.nu</span>
      </div>
      <div className="bg-[#f5f0e8] p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8a96a8]">Översikt</p>
            <p className="text-base font-bold text-[#0a1628]">Nynäshamns Gästhamn</p>
          </div>
          <span className="rounded-full bg-[rgba(13,148,136,0.12)] px-2.5 py-1 text-[10px] font-semibold text-[#0d9488]">
            Aktiv
          </span>
        </div>
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            ["48", "Platser"],
            ["41", "Bokade"],
            ["85%", "Beläggning"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-lg border border-[#dce3ee] bg-white p-2.5">
              <p className="text-lg font-bold text-[#0a1628]">{value}</p>
              <p className="text-[10px] text-[#8a96a8]">{label}</p>
            </div>
          ))}
        </div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#8a96a8]">Bokningar per månad</p>
        <div className="mb-4 flex h-10 items-end gap-1">
          {[30, 48, 56, 44, 32].map((height, index) => (
            <div key={index} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-sm bg-[#0d9488]"
                style={{ height: `${height * 0.55}px`, opacity: index === 2 ? 1 : 0.45 + index * 0.1 }}
              />
              <span className="text-[8px] text-[#8a96a8]">{["Maj", "Jun", "Jul", "Aug", "Sep"][index]}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-lg border border-[#dce3ee] bg-white px-3 py-2.5">
          <span className="text-xs text-[#4a5568]">Intäkt denna säsong</span>
          <span className="text-sm font-bold text-[#0d9488]">126 400 kr</span>
        </div>
      </div>
    </div>
  );
}

function ForHamnarContent() {
  const router = useRouter();
  const supabase = useMemo(() => {
    if (typeof window === "undefined") return null;
    return createClient();
  }, []);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [stats, setStats] = useState<PlatformStats>({
    marinas: "0",
    listings: "0",
    cities: "0",
  });

  useEffect(() => {
    if (!supabase) {
      setCheckingAuth(false);
      return;
    }
    let mounted = true;

    const checkRole = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user?.id) {
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.role === "host" || profile?.role === "owner") {
          router.replace("/dashboard/host");
        }
      } finally {
        if (mounted) {
          setCheckingAuth(false);
        }
      }
    };

    void checkRole();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  useEffect(() => {
    if (!supabase) return;

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

  const partnerHarbourLabel =
    Number(stats.marinas.replace(/\s/g, "")) > 0
      ? `${stats.marinas}+ partnerhamnar`
      : "Växande nätverk över hela Sverige";

  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#0a1628]">
      <AuthNavbar currentPage="home" />
      {checkingAuth ? (
        <div className="fixed right-4 top-20 z-40 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#c5d0de] border-t-[#0d9488]" />
        </div>
      ) : null}

      <section className="relative overflow-hidden bg-[#0a1628] px-4 pb-20 pt-28 sm:px-6 sm:pb-24 sm:pt-32 md:px-12">
        <LandingHeroWave />
        <div
          className="pointer-events-none absolute left-1/2 top-[-20%] h-[500px] w-[700px] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(13,148,136,0.18)_0%,transparent_70%)]"
          aria-hidden
        />
        <div className="relative z-[2] mx-auto w-full max-w-[800px] text-center text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#14b8a6]">
            För marinor & hamnar
          </p>
          <h1 className="mt-4 text-[clamp(2rem,5vw,3.25rem)] font-extrabold leading-tight tracking-[-0.04em]">
            Fyll era lediga platser — utan administration
          </h1>
          <p className="mx-auto mt-5 max-w-[640px] text-base leading-relaxed text-white/70 sm:text-lg">
            Båtplats.nu ger er hamn en digital bokningskanal. Lista era platser, ta emot bokningar och få betalt
            automatiskt.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/hamnar/registrera"
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#0d9488] px-8 py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#0f766e] sm:w-auto"
            >
              Registrera din hamn
            </Link>
            <Link
              href="/hamnar/logga-in"
              className="inline-flex w-full items-center justify-center rounded-xl bg-white px-8 py-3.5 text-[15px] font-semibold text-[#0a1628] transition hover:bg-[#f5f0e8] sm:w-auto"
            >
              Logga in som hamnägare
            </Link>
          </div>
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

      <section className="px-4 py-14 sm:px-6 md:px-12 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d9488]">Fördelar</p>
            <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold tracking-[-0.035em] text-[#0a1628]">
              Byggt för professionella hamnar
            </h2>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {MARINA_BENEFITS.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-2xl border border-[#dce3ee] bg-white p-8 shadow-[0_4px_16px_rgba(10,22,40,0.06)]"
              >
                <TealIconBox>
                  <Icon className="h-6 w-6" aria-hidden />
                </TealIconBox>
                <h3 className="mt-5 text-lg font-bold text-[#0a1628]">{title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[#4a5568]">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0a1628] px-4 py-14 text-white sm:px-6 md:px-12 md:py-24">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#14b8a6]">Dashboard</p>
            <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold leading-tight tracking-[-0.035em]">
              Ert kontrollrum
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-white/65">
              En översikt designad för hamnoperatörer — se beläggning, bokningar och intäkter utan att lämna
              plattformen.
            </p>
            <ul className="mt-8 space-y-4">
              {DASHBOARD_BULLETS.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(13,148,136,0.15)] text-[#14b8a6]">
                    <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                  </span>
                  <span className="pt-0.5 text-[15px] leading-relaxed text-white/80">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
          <HostDashboardMockup />
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 md:px-12 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d9488]">Process</p>
            <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold tracking-[-0.035em] text-[#0a1628]">
              Kom igång på tre steg
            </h2>
          </div>
          <div className="relative mt-10 grid gap-6 md:grid-cols-3 md:gap-8">
            <div
              className="pointer-events-none absolute left-[20%] right-[20%] top-[22px] hidden border-t-2 border-dashed border-[#0d9488]/35 md:block"
              aria-hidden
            />
            {PROCESS_STEPS.map(({ step, title, copy }) => (
              <article
                key={title}
                className="relative rounded-2xl border border-[#dce3ee] bg-white p-8 shadow-[0_4px_16px_rgba(10,22,40,0.06)]"
              >
                <div className="relative z-[1] mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#0d9488] text-xs font-bold text-white">
                  {step}
                </div>
                <h3 className="text-lg font-bold text-[#0a1628]">{title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[#4a5568]">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-4 sm:px-6 md:px-12">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid gap-4 rounded-2xl border border-[#dce3ee] bg-white p-4 shadow-[0_4px_16px_rgba(10,22,40,0.06)] md:grid-cols-3 md:p-6">
            <div className="rounded-xl bg-[#f5f0e8] px-4 py-4 text-center">
              <p className="text-sm font-semibold text-[#0a1628]">{partnerHarbourLabel}</p>
              <p className="mt-1 text-xs text-[#8a96a8]">
                {Number(stats.marinas.replace(/\s/g, "")) > 0
                  ? "Anslutna hamnar på plattformen"
                  : "Vi växer säsong för säsong"}
              </p>
            </div>
            <div className="rounded-xl bg-[#f5f0e8] px-4 py-4 text-center">
              <p className="text-sm font-semibold text-[#0a1628]">Säkra betalningar</p>
              <p className="mt-1 text-xs text-[#8a96a8]">Trygga flöden via Stripe för hamn och båtägare</p>
            </div>
            <div className="rounded-xl bg-[#f5f0e8] px-4 py-4 text-center">
              <p className="text-sm font-semibold text-[#0a1628]">Support alla dagar</p>
              <p className="mt-1 text-xs text-[#8a96a8]">Snabb hjälp när ni behöver den</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 md:px-12 md:py-24">
        <div className="mx-auto max-w-[1200px] rounded-2xl bg-gradient-to-br from-[#0a1628] via-[#0d1f3d] to-[#0d2252] px-8 py-12 text-center text-white md:px-14 md:py-16">
          <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-tight tracking-[-0.035em]">
            Redo att digitalisera er hamn?
          </h2>
          <Link
            href="/hamnar/registrera"
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-[#0d9488] px-8 py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#0f766e]"
          >
            Registrera din hamn
          </Link>
          <p className="mt-4 text-sm text-white/55">Det tar mindre än 10 minuter</p>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default function ForHamnarPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f5f0e8] text-[#0a1628]">
          <p className="text-sm font-medium text-[#8a96a8]">Laddar...</p>
        </main>
      }
    >
      <ForHamnarContent />
    </Suspense>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AuthNavbar from "@/components/auth-navbar";
import Footer from "@/components/footer";
import { createClient } from "@/lib/supabase/client";

export default function ForHamnarPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
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

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#1e293b]">
      <AuthNavbar currentPage="home" />
      {checkingAuth ? (
        <div className="fixed right-4 top-20 z-40 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#cbd5e1] border-t-[#0d9488]" />
        </div>
      ) : null}

      <section className="bg-gradient-to-br from-[#0a2342] via-[#0d3060] to-[#0a4a6b] px-6 py-24 text-white">
        <div className="mx-auto w-full max-w-[980px] text-center">
          <p className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#14b8a8]">
            För hamnägare
          </p>
          <h1 className="mt-3 text-[3rem] font-black leading-tight tracking-[-0.5px] max-md:text-[2rem]">
            Är du hamnägare?
          </h1>
          <p className="mx-auto mt-4 max-w-[680px] text-[1.1rem] leading-relaxed text-white/85">
            Lista dina båtplatser på Sveriges ledande plattform
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/hamnar/logga-in"
              className="rounded-lg border-2 border-[#14b8a8] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#14b8a8]"
            >
              Logga in som hamnägare
            </Link>
            <Link
              href="/hamnar/registrera"
              className="rounded-lg bg-[#0d9488] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#14b8a8]"
            >
              Registrera din hamn
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto w-full max-w-[1280px]">
          <div className="text-center">
            <p className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#0d9488]">
              Fördelar
            </p>
            <h2 className="mt-2 text-[2rem] font-extrabold text-[#0a2342]">
              Varför välja Båtplats.nu?
            </h2>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <article className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#ccfbf1] text-lg">
                ⛵
              </div>
              <h3 className="text-lg font-bold text-[#0a2342]">Nå fler båtägare</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#64748b]">
                Syns där aktiva båtägare söker varje dag. Fyll lediga platser snabbare med högre
                beläggning över säsongen.
              </p>
            </article>

            <article className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#ccfbf1] text-lg">
                📋
              </div>
              <h3 className="text-lg font-bold text-[#0a2342]">Enkel hantering</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#64748b]">
                Hantera förfrågningar, bokningar och tillgänglighet på ett ställe. Mindre admin,
                tydligare överblick och snabbare svar.
              </p>
            </article>

            <article className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#ccfbf1] text-lg">
                🔒
              </div>
              <h3 className="text-lg font-bold text-[#0a2342]">Säkra betalningar</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#64748b]">
                Trygga flöden för både hamnägare och hyresgäst. Minska osäkerhet och bygg förtroende
                i varje bokning.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-[#f1f5f9] px-6 py-16">
        <div className="mx-auto w-full max-w-[1280px]">
          <div className="text-center">
            <p className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#0d9488]">
              Process
            </p>
            <h2 className="mt-2 text-[2rem] font-extrabold text-[#0a2342]">Så här fungerar det</h2>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              ["1", "Lista dina platser", "Lägg upp kajplatser med bilder, mått och priser på några minuter."],
              ["2", "Ta emot bokningar", "Få förfrågningar eller direktbokningar från verifierade båtägare."],
              ["3", "Få betalt", "Bekräfta bokningar och hantera betalningsflödet tryggt och smidigt."],
            ].map(([step, title, copy]) => (
              <article
                key={title}
                className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0d9488] text-sm font-bold text-white">
                  {step}
                </div>
                <h3 className="text-lg font-bold text-[#0a2342]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#64748b]">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto w-full max-w-[980px] rounded-2xl bg-gradient-to-r from-[#0a2342] to-[#0d3060] p-8 text-center text-white shadow-[0_10px_30px_rgba(10,35,66,0.25)]">
          <h2 className="text-[1.9rem] font-extrabold leading-tight max-md:text-[1.5rem]">
            Redo att lista din hamn?
          </h2>
          <p className="mx-auto mt-3 max-w-[620px] text-sm leading-relaxed text-white/85">
            Skapa ett hamnägarkonto och börja publicera dina platser redan idag.
          </p>
          <div className="mt-6">
            <Link
              href="/hamnar/registrera"
              className="inline-flex rounded-lg bg-[#0d9488] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#14b8a8]"
            >
              Registrera din hamn
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="mx-auto w-full max-w-[980px]">
          <div className="grid gap-3 rounded-xl border border-[#e2e8f0] bg-white p-4 text-center shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)] md:grid-cols-3">
            <div className="rounded-lg bg-[#f8fafc] px-4 py-3">
              <p className="text-sm font-semibold text-[#0a2342]">+120 hamnar anslutna</p>
              <p className="mt-1 text-xs text-[#64748b]">Växande nätverk över hela Sverige</p>
            </div>
            <div className="rounded-lg bg-[#f8fafc] px-4 py-3">
              <p className="text-sm font-semibold text-[#0a2342]">Säkra betalningar</p>
              <p className="mt-1 text-xs text-[#64748b]">Trygga flöden för både hamn och båtägare</p>
            </div>
            <div className="rounded-lg bg-[#f8fafc] px-4 py-3">
              <p className="text-sm font-semibold text-[#0a2342]">Support alla dagar</p>
              <p className="mt-1 text-xs text-[#64748b]">Snabb hjälp när du behöver den</p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

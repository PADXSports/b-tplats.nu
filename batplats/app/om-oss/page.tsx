import Image from "next/image";

import AuthNavbar from "@/components/auth-navbar";
import Footer from "@/components/footer";

export default function OmOssPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#1e293b]">
      <AuthNavbar currentPage="home" />

      <section className="bg-gradient-to-br from-[#0a2342] via-[#0d3060] to-[#0a4a6b] px-6 py-20 text-white">
        <div className="mx-auto w-full max-w-[980px] text-center">
          <p className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#14b8a8]">
            Om oss
          </p>
          <h1 className="mt-3 text-[2.8rem] font-black leading-tight tracking-[-0.5px] max-md:text-[2rem]">
            Vi kopplar ihop hamnar och båtägare
          </h1>
          <p className="mx-auto mt-4 max-w-[720px] text-[1.05rem] leading-relaxed text-white/85">
            Båtplats.nu är byggt av seglare som vill göra det enkelt att hitta och lista
            båtplatser i Sverige.
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto w-full max-w-[980px] rounded-xl border border-[#e2e8f0] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
          <p className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#0d9488]">
            Vilka vi är
          </p>
          <h2 className="mt-2 text-[1.8rem] font-extrabold text-[#0a2342]">
            En digital marknadsplats för båtplatser
          </h2>
          <p className="mt-4 text-[0.98rem] leading-relaxed text-[#475569]">
            Vi hjälper hamnägare att fylla lediga platser och ger båtägare en tydlig väg till
            rätt kajplats. Med bättre överblick, snabbare kommunikation och modern bokningshantering
            sparar båda sidor tid och får en tryggare upplevelse.
          </p>
        </div>
      </section>

      <section className="bg-[#f1f5f9] px-6 py-16">
        <div className="mx-auto w-full max-w-[980px] rounded-xl border border-[#e2e8f0] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
          <p className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#0d9488]">
            Vår mission
          </p>
          <h2 className="mt-2 text-[1.8rem] font-extrabold text-[#0a2342]">
            Att göra båtplatser lika enkla att boka som ett hotell
          </h2>
          <p className="mt-4 text-[0.98rem] leading-relaxed text-[#475569]">
            Vi vill minska friktionen i hela processen - från att upptäcka en hamn till att slutföra
            en bokning. Genom transparent information, säkra flöden och enkel administration hjälper
            vi fler att komma ut på vattnet.
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto w-full max-w-[980px] rounded-xl bg-gradient-to-r from-[#0a2342] to-[#0d3060] p-8 text-white shadow-[0_10px_30px_rgba(10,35,66,0.25)]">
          <p className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#14b8a8]">
            Kontakt
          </p>
          <h2 className="mt-2 text-[1.8rem] font-extrabold">Hör av dig till oss</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/85">
            Har du frågor om plattformen, partnerskap eller hur du kommer igång som hamnägare?
          </p>
          <p className="mt-4 text-sm">
            E-post:{" "}
            <a href="mailto:kontakt@båtplats.nu" className="font-semibold text-[#5eead4] hover:underline">
              kontakt@båtplats.nu
            </a>
          </p>
        </div>
      </section>

      <section className="bg-[#f1f5f9] px-6 py-16">
        <div className="mx-auto w-full max-w-[980px]">
          <div className="text-center">
            <p className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#0d9488]">Team</p>
            <h2 className="mt-2 text-[1.9rem] font-extrabold text-[#0a2342]">
              Teamet bakom Båtplats.nu
            </h2>
          </div>

          <div className="mx-auto mt-8 max-w-[420px] rounded-xl border border-[#e2e8f0] bg-white p-7 text-center shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
            <div
              className="relative mx-auto mb-[18px] h-[160px] w-[160px] overflow-hidden rounded-full"
              style={{
                border: "4px solid rgba(13, 148, 136, 0.35)",
                boxShadow: "0 10px 24px rgba(0,0,0,0.16)",
              }}
            >
              <Image
                src="/carl-lagerberg.jpg"
                alt="Carl Lagerberg"
                fill
                sizes="160px"
                className="object-cover"
                style={{ objectPosition: "center 22%" }}
              />
            </div>
            <p className="text-[1.05rem] font-bold text-[#0a2342]">Carl Lagerberg</p>
            <p className="mb-2.5 text-[0.85rem] font-semibold text-[#0d9488]">Grundare & VD</p>
            <p className="text-[0.9rem] leading-relaxed text-[#64748b]">
              Carl grundade Båtplats.nu med visionen att förenkla livet för båtägare och hamnägare
              i Sverige.
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

"use client";

import Link from "next/link";

const linkClass = "text-[0.87rem] text-white/60 transition hover:text-white";

export default function Footer() {
  return (
    <footer className="bg-[#0f172a] px-6 pb-6 pt-12 text-white/70">
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-10 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <p className="text-xl font-bold text-white">Båtplats.nu</p>
            <p className="mt-3 text-[0.88rem] leading-relaxed text-white/50">
              Sveriges självklara mötesplats för båtägare och hamnar. Hitta, jämför och boka
              båtplats — alltid via båtplats.nu.
            </p>
          </div>

          <div>
            <h4 className="mb-3.5 text-[0.85rem] font-bold uppercase tracking-[0.5px] text-white/90">
              Plattform
            </h4>
            <div className="space-y-2">
              <Link href="/kajplatser" className={linkClass}>
                Sök båtplatser
              </Link>
              <br />
              <Link href="/hamnar/registrera" className={linkClass}>
                Lista din plats
              </Link>
              <br />
              <Link href="/kajplatser?view=map" className={linkClass}>
                Kartvyn
              </Link>
              <br />
              <Link href="/for-hamnar" className={linkClass}>
                Priser
              </Link>
            </div>
          </div>

          <div>
            <h4 className="mb-3.5 text-[0.85rem] font-bold uppercase tracking-[0.5px] text-white/90">
              Företaget
            </h4>
            <div className="space-y-2">
              <Link href="/om-oss" className={linkClass}>
                Om oss
              </Link>
              <br />
              <Link href="/for-hamnar" className={linkClass}>
                För hamnar
              </Link>
              <br />
              <a href="mailto:kontakt@batplats.nu" className={linkClass}>
                Kontakt
              </a>
              <br />
              <Link href="/om-oss" className={linkClass}>
                Press
              </Link>
            </div>
          </div>

          <div>
            <h4 className="mb-3.5 text-[0.85rem] font-bold uppercase tracking-[0.5px] text-white/90">
              Support
            </h4>
            <div className="space-y-2">
              <Link href="/om-oss" className={linkClass}>
                Hjälpcenter
              </Link>
              <br />
              <a href="mailto:kontakt@batplats.nu" className={linkClass}>
                kontakt@batplats.nu
              </a>
              <br />
              <Link href="/om-oss#integritet" className={linkClass}>
                Integritetspolicy
              </Link>
              <br />
              <Link href="/om-oss#villkor" className={linkClass}>
                Användarvillkor
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-[0.82rem]">
          <span>© 2026 Båtplats.nu · batplats.nu</span>
          <span>Made with ♥ in Stockholm, Sweden</span>
        </div>
      </div>
    </footer>
  );
}

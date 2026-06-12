"use client";

import { Suspense } from "react";

import AuthNavbar from "@/components/auth-navbar";
import Footer from "@/components/footer";

function AnvandarvillkorContent() {
  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#0a1628]">
      <AuthNavbar currentPage="home" />

      <section className="px-4 py-14 sm:px-6 md:px-12 md:py-24">
        <div className="mx-auto max-w-[720px]">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d9488]">Juridiskt</p>
          <h1 className="mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-tight tracking-[-0.03em] text-[#0a1628]">
            Användarvillkor
          </h1>
          <p className="mt-6 text-[17px] leading-relaxed text-[#4a5568]">
            Genom att använda Båtplats.nu godkänner du våra villkor för plattformen. Vid tvister gäller svensk lag.
            Vid frågor, kontakta{" "}
            <a href="mailto:kontakt@batplats.nu" className="font-semibold text-[#0d9488] hover:underline">
              kontakt@batplats.nu
            </a>
            .
          </p>
          <p className="mt-4 text-[17px] leading-relaxed text-[#4a5568]">
            Båtplats.nu fungerar som en marknadsplats mellan båtägare och hamnägare. Vi ansvarar inte för avtal som
            ingås mellan parter, men tillhandahåller verktyg för bokning, kommunikation och betalning.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default function AnvandarvillkorPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f5f0e8] text-[#0a1628]">
          <p className="text-sm font-medium text-[#8a96a8]">Laddar...</p>
        </main>
      }
    >
      <AnvandarvillkorContent />
    </Suspense>
  );
}

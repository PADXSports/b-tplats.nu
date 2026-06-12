"use client";

import { Suspense } from "react";

import AuthNavbar from "@/components/auth-navbar";
import Footer from "@/components/footer";

function IntegritetspolicyContent() {
  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#0a1628]">
      <AuthNavbar currentPage="home" />

      <section className="px-4 py-14 sm:px-6 md:px-12 md:py-24">
        <div className="mx-auto max-w-[720px]">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d9488]">Juridiskt</p>
          <h1 className="mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-tight tracking-[-0.03em] text-[#0a1628]">
            Integritetspolicy
          </h1>
          <p className="mt-6 text-[17px] leading-relaxed text-[#4a5568]">
            Vi behandlar personuppgifter enligt gällande dataskyddsregler. Kontakta oss på{" "}
            <a href="mailto:kontakt@batplats.nu" className="font-semibold text-[#0d9488] hover:underline">
              kontakt@batplats.nu
            </a>{" "}
            för frågor om hur vi hanterar dina uppgifter.
          </p>
          <p className="mt-4 text-[17px] leading-relaxed text-[#4a5568]">
            Vi samlar endast in den information som behövs för att tillhandahålla tjänsten, hantera bokningar och
            kommunicera med dig som användare eller hamnägare. Uppgifter delas inte med tredje part utöver det som
            krävs för betalning och drift av plattformen.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default function IntegritetspolicyPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f5f0e8] text-[#0a1628]">
          <p className="text-sm font-medium text-[#8a96a8]">Laddar...</p>
        </main>
      }
    >
      <IntegritetspolicyContent />
    </Suspense>
  );
}

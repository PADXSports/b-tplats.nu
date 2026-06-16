"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";

type AuthNavbarProps = {
  currentPage?: "home" | "search" | "listing" | "dashboard" | "profile";
};

export default function AuthNavbar({ currentPage = "home" }: AuthNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);
  const mobileCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const email = user?.email ?? "";

  const handleLogout = async () => {
    const client = createClient();
    await client.auth.signOut();
    setIsMobileMenuOpen(false);
    setShowLoginDropdown(false);
    router.push("/");
    router.refresh();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowLoginDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setShowLoginDropdown(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    mobileCloseButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobileMenuOpen]);

  const isSearchActive =
    currentPage === "search" || pathname?.startsWith("/search") || pathname?.startsWith("/kajplatser");
  const loginHref =
    pathname && pathname !== "/"
      ? `/login?redirect=${encodeURIComponent(pathname)}`
      : "/login";
  const userDashboardHref = "/dashboard/renter";

  const guestLoginDropdown = (
    <div className="relative ml-2" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setShowLoginDropdown(!showLoginDropdown)}
        className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        style={{ background: "#0d9488" }}
        aria-expanded={showLoginDropdown}
        aria-haspopup="true"
      >
        Logga in
        <svg
          className={`h-4 w-4 transition-transform ${showLoginDropdown ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showLoginDropdown ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Vem är du?</p>
          </div>

          <Link
            href={loginHref}
            onClick={() => setShowLoginDropdown(false)}
            className="group flex items-center gap-4 px-4 py-4 transition hover:bg-gray-50"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-teal-50 transition group-hover:bg-teal-100">
              <svg className="h-5 w-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#0a1628" }}>
                Jag söker en båtplats
              </p>
              <p className="text-xs text-gray-500">Logga in som båtägare</p>
            </div>
            <svg
              className="ml-auto h-4 w-4 text-gray-300 transition group-hover:text-teal-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <Link
            href="/hyr-ut?skip=1"
            onClick={() => setShowLoginDropdown(false)}
            className="group flex items-center gap-4 border-t border-gray-50 px-4 py-4 transition hover:bg-gray-50"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 transition group-hover:bg-blue-100">
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#0a1628" }}>
                Jag hyr ut min plats
              </p>
              <p className="text-xs text-gray-500">Privatperson med en ledig plats</p>
            </div>
            <svg
              className="ml-auto h-4 w-4 text-gray-300 transition group-hover:text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <Link
            href="/hamnar/logga-in"
            onClick={() => setShowLoginDropdown(false)}
            className="group flex items-center gap-4 border-t border-gray-50 px-4 py-4 transition hover:bg-gray-50"
          >
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition group-hover:bg-gray-100"
              style={{ background: "#f0f4f8" }}
            >
              <svg className="h-5 w-5" style={{ color: "#0a1628" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#0a1628" }}>
                Jag är hamnägare
              </p>
              <p className="text-xs text-gray-500">Marina eller båtklubb</p>
            </div>
            <svg
              className="ml-auto h-4 w-4 text-gray-300 transition group-hover:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-center text-xs text-gray-400">
              Nytt på Båtplats.nu?{" "}
              <Link
                href="/signup"
                className="font-medium text-teal-600 hover:underline"
                onClick={() => setShowLoginDropdown(false)}
              >
                Skapa gratis konto
              </Link>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );

  const userAccountDropdown = user ? (
    <div className="relative ml-2" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setShowLoginDropdown(!showLoginDropdown)}
        className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 transition hover:bg-gray-50"
        aria-expanded={showLoginDropdown}
        aria-haspopup="true"
      >
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ background: "#0d9488" }}
        >
          {user.email?.charAt(0).toUpperCase()}
        </div>
        <span className="hidden text-sm font-medium text-[#0a1628] sm:block">
          {user.email?.split("@")[0]}
        </span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${showLoginDropdown ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showLoginDropdown ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold" style={{ color: "#0a1628" }}>
              {user.email?.split("@")[0]}
            </p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>

          <Link
            href="/kajplatser"
            onClick={() => setShowLoginDropdown(false)}
            className="flex items-center gap-3 px-4 py-3 transition hover:bg-gray-50"
          >
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="text-sm text-gray-700">🔍 Hitta båtplats</span>
          </Link>

          <Link
            href={userDashboardHref}
            onClick={() => setShowLoginDropdown(false)}
            className="flex items-center gap-3 px-4 py-3 transition hover:bg-gray-50"
          >
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2m0-4V7a2 2 0 00-2-2h-2m-6 7h6m-6 4h6m-6-8h3"
              />
            </svg>
            <span className="text-sm text-gray-700">📋 Mina bokningar</span>
          </Link>

          <div className="border-t border-gray-100" />

          <Link
            href="/mitt-konto"
            onClick={() => setShowLoginDropdown(false)}
            className="flex items-center gap-3 px-4 py-3 transition hover:bg-gray-50"
          >
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className="text-sm text-gray-700">⚓ Mina annonser</span>
          </Link>

          <Link
            href="/hyr-ut"
            onClick={() => setShowLoginDropdown(false)}
            className="flex items-center gap-3 px-4 py-3 transition hover:bg-gray-50"
          >
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm text-gray-700">➕ Lägg till plats</span>
          </Link>

          <div className="border-t border-gray-100" />

          <Link
            href="/profil"
            onClick={() => setShowLoginDropdown(false)}
            className="flex items-center gap-3 px-4 py-3 transition hover:bg-gray-50"
          >
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5.121 17.804A10.937 10.937 0 0112 15c2.533 0 4.865.861 6.879 2.304M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-sm text-gray-700">👤 Min profil</span>
          </Link>

          <div className="border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                void handleLogout();
                setShowLoginDropdown(false);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-red-50"
            >
              <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="text-sm text-red-600">🚪 Logga ut</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  ) : null;

  const authSlot = loading ? (
    <div className="ml-2 flex w-36 items-center justify-end">
      <div className="h-10 w-24 animate-pulse rounded-full bg-white/10" aria-hidden />
    </div>
  ) : user ? (
    userAccountDropdown
  ) : (
    guestLoginDropdown
  );

  return (
    <nav className="sticky top-0 z-50 border-b border-[#0d2252]/40 bg-[#0f1f3d] shadow-[0_1px_4px_rgba(15,31,61,0.18)]">
      <div className="mx-auto flex min-h-16 w-full max-w-[1280px] flex-wrap items-center gap-3 px-4 py-2 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-white transition hover:opacity-90"
          >
            <img src="/logo.svg" alt="Båtplats.nu" className="h-8" />
          </Link>
        </div>

        <button
          type="button"
          aria-label="Öppna meny"
          onClick={() => setIsMobileMenuOpen(true)}
          className="ml-auto inline-flex h-12 min-h-12 items-center justify-center rounded-lg px-4 text-2xl text-white transition active:bg-white/10 md:hidden"
        >
          ☰
        </button>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <div className="flex items-center gap-1">
                <Link
                  href="/"
                  className="rounded-lg px-3.5 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  Hem
                </Link>
                <Link
                  href="/kajplatser"
                  className={`rounded-lg px-3.5 py-2 text-sm font-medium transition hover:bg-white/10 ${
                    isSearchActive ? "text-white" : "text-white/80 hover:text-white"
                  }`}
                >
                  Båtplatser
                </Link>
                <Link
                  href="/om-oss"
                  className="rounded-lg px-3.5 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  Om oss
                </Link>
              </div>
              {authSlot}
            </>
          ) : (
            <>
              <Link
                href="/"
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Hem
              </Link>
              <Link
                href="/kajplatser"
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition hover:bg-white/10 ${
                  isSearchActive ? "text-white" : "text-white/80 hover:text-white"
                }`}
              >
                Båtplatser
              </Link>
              <Link
                href="/for-hamnar"
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                För hamnar
              </Link>
              <Link
                href="/om-oss"
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Om oss
              </Link>
              <Link
                href="/hyr-ut"
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-[#14b8a6] transition hover:bg-white/10 hover:text-[#5eead4]"
              >
                Hyr ut din plats
              </Link>

              {authSlot}
            </>
          )}
        </div>

      </div>

      {isMobileMenuOpen ? (
        <>
          <button
            type="button"
            aria-label="Stäng meny"
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
          />
          <div className="fixed right-0 top-0 z-[60] h-screen w-full max-w-[360px] bg-[#0f1f3d] p-4 text-white shadow-2xl md:hidden">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-white/80">Meny</span>
              <button
                ref={mobileCloseButtonRef}
                type="button"
                aria-label="Stäng meny"
                onClick={() => setIsMobileMenuOpen(false)}
                className="inline-flex h-12 min-h-12 items-center justify-center rounded-lg px-4 text-2xl transition active:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="mb-5 rounded-xl border border-white/15 bg-white/5 p-3">
              {loading && !user ? (
                <div className="h-12 w-full animate-pulse rounded-lg bg-white/20" aria-hidden />
              ) : user ? (
                <>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ background: "#0d9488" }}
                    >
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{user.email?.split("@")[0]}</p>
                      <p className="truncate text-xs text-white/60">{user.email}</p>
                    </div>
                  </div>
                  <Link
                    href={userDashboardHref}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-white/20 px-4 py-3 text-sm font-medium text-white transition active:bg-white/10"
                  >
                    Min sida
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#0d9488] px-4 py-3 text-sm font-semibold text-white transition active:bg-[#14b8a6]"
                  >
                    Logga ut
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Vem är du?</p>
                  <Link
                    href={loginHref}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-white/10 px-4 py-3 text-sm font-medium text-white transition active:bg-white/15"
                  >
                    Jag söker en båtplats
                  </Link>
                  <Link
                    href="/hyr-ut?skip=1"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-white/10 px-4 py-3 text-sm font-medium text-white transition active:bg-white/15"
                  >
                    Jag hyr ut min plats
                  </Link>
                  <Link
                    href="/hamnar/logga-in"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-white/10 px-4 py-3 text-sm font-medium text-white transition active:bg-white/15"
                  >
                    Jag är hamnägare
                  </Link>
                  <p className="pt-1 text-center text-xs text-white/50">
                    Nytt här?{" "}
                    <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)} className="text-[#5eead4] hover:underline">
                      Skapa konto
                    </Link>
                  </p>
                </div>
              )}
            </div>

            <nav className="space-y-1">
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex min-h-12 items-center rounded-lg px-3 text-base font-medium transition active:bg-white/10"
              >
                Hem
              </Link>
              <Link
                href="/kajplatser"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex min-h-12 items-center rounded-lg px-3 text-base font-medium transition active:bg-white/10"
              >
                Båtplatser
              </Link>
              {!user ? (
                <Link
                  href="/for-hamnar"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex min-h-12 items-center rounded-lg px-3 text-base font-medium transition active:bg-white/10"
                >
                  För hamnar
                </Link>
              ) : null}
              <Link
                href="/om-oss"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex min-h-12 items-center rounded-lg px-3 text-base font-medium transition active:bg-white/10"
              >
                Om oss
              </Link>
              <Link
                href="/hyr-ut"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex min-h-12 items-center rounded-lg px-3 text-base font-medium text-[#14b8a6] transition active:bg-white/10"
              >
                Hyr ut din plats
              </Link>
              {user ? (
                <>
                  <Link
                    href="/dashboard/renter"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex min-h-12 items-center rounded-lg px-3 text-base font-medium text-[#14b8a6] transition active:bg-white/10"
                  >
                    Mina bokningar
                  </Link>
                  <Link
                    href="/mitt-konto"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex min-h-12 items-center rounded-lg px-3 text-base font-medium text-[#14b8a6] transition active:bg-white/10"
                  >
                    Mina annonser
                  </Link>
                </>
              ) : null}
            </nav>
          </div>
        </>
      ) : null}
    </nav>
  );
}

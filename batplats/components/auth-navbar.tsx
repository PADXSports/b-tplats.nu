"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type AuthNavbarProps = {
  currentPage?: "home" | "search" | "listing" | "dashboard" | "profile";
};

export default function AuthNavbar({ currentPage = "home" }: AuthNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const [email, setEmail] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("userEmail") || "";
    }
    return "";
  });
  const [role, setRole] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("userRole") || "";
    }
    return "";
  });

  useEffect(() => {
    let mounted = true;

    const syncFromServer = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userRole");
        if (mounted) {
          setEmail("");
          setRole("");
        }
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) {
        console.error(profileError);
      }

      const profileRole = profile?.role ?? "renter";
      localStorage.setItem("userEmail", user.email ?? "");
      localStorage.setItem("userRole", profileRole);

      if (mounted) {
        setEmail(user.email ?? "");
        setRole(profileRole);
      }
    };

    void syncFromServer();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === "SIGNED_OUT") {
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userRole");
        if (mounted) {
          setEmail("");
          setRole("");
        }
        return;
      }
      void syncFromServer();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    const client = createClient();
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    await client.auth.signOut();
    setIsMobileMenuOpen(false);
    router.push("/");
    router.refresh();
  };

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
  const isProfileActive = currentPage === "profile" || pathname?.startsWith("/profile");
  const activeHostTab =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null;
  const isHost = (role === "host" || role === "owner") && Boolean(email);
  const isRenter = role === "renter" && Boolean(email);

  return (
    <nav className="sticky top-0 z-50 border-b border-[#0d2252]/40 bg-[#0f1f3d] shadow-[0_1px_4px_rgba(15,31,61,0.18)]">
      <div className="mx-auto flex min-h-16 w-full max-w-[1280px] flex-wrap items-center gap-3 px-4 py-2 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-white transition hover:opacity-90"
          >
            <div
              className="flex h-9 w-9 items-center justify-center gap-0.5 rounded-md bg-[#0d2252]/50 ring-1 ring-[#0d9488]/30"
              aria-hidden
            >
              <span className="h-5 w-1 rounded-sm bg-[#0d9488]" />
              <span className="h-5 w-1 rounded-sm bg-[#0d9488]/50" />
            </div>
            <span className="text-lg font-extrabold tracking-[-0.04em] sm:text-xl">Båtplats.nu</span>
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

        <div className="ml-auto hidden items-center gap-2 transition-opacity duration-200 md:flex">
          {isHost ? (
            <>
              <div className="flex items-center gap-1">
                <Link
                  href="/dashboard/host"
                  className={`rounded-lg px-3.5 py-2 text-sm font-medium transition hover:bg-white/10 ${
                    pathname?.startsWith("/dashboard/host") && !activeHostTab
                      ? "text-white"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  Översikt
                </Link>
                <Link
                  href="/dashboard/host?tab=annonser"
                  className={`rounded-lg px-3.5 py-2 text-sm font-medium transition hover:bg-white/10 ${
                    activeHostTab === "annonser" ? "text-white" : "text-white/80 hover:text-white"
                  }`}
                >
                  Mina Annonser
                </Link>
                <Link
                  href="/dashboard/host?tab=bokningar"
                  className={`rounded-lg px-3.5 py-2 text-sm font-medium transition hover:bg-white/10 ${
                    activeHostTab === "bokningar" ? "text-white" : "text-white/80 hover:text-white"
                  }`}
                >
                  Bokningar
                </Link>
              </div>
              <div className="ml-2 flex items-center gap-2">
                <span className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white">
                  {email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg bg-[#0d9488] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#14b8a6]"
                >
                  Logga ut
                </button>
              </div>
            </>
          ) : isRenter ? (
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
                  Kajplatser
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
              </div>
              <div className="ml-2 flex items-center gap-2">
                <Link
                  href="/dashboard/renter"
                  className={`rounded-lg px-3.5 py-2 text-sm font-medium transition hover:bg-white/10 ${
                    pathname?.startsWith("/dashboard/renter")
                      ? "text-white"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  Min profil
                </Link>
                <span className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white">
                  {email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg bg-[#0d9488] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#14b8a6]"
                >
                  Logga ut
                </button>
              </div>
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
                Kajplatser
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

              {email ? (
                <div className="ml-2 flex items-center gap-2">
                  {isRenter ? (
                    <>
                      <span className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white">
                        {email}
                      </span>
                      <Link
                        href="/dashboard/renter"
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                          isProfileActive
                            ? "bg-white/20 text-white"
                            : "bg-white/10 text-white hover:bg-white/20"
                        }`}
                      >
                        Min profil
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="rounded-lg bg-[#0d9488] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#14b8a6]"
                      >
                        Logga ut
                      </button>
                    </>
                  ) : null}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="ml-2 rounded-lg bg-[#0d9488] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#14b8a6]"
                >
                  Logga in
                </Link>
              )}
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
              {email ? (
                <>
                  <p className="truncate text-sm font-medium text-white">{email}</p>
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#0d9488] px-4 py-3 text-sm font-semibold text-white transition active:bg-[#14b8a6]"
                  >
                    Logga ut
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#0d9488] px-4 py-3 text-sm font-semibold text-white transition active:bg-[#14b8a6]"
                >
                  Logga in
                </Link>
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
                Kajplatser
              </Link>
              <Link
                href="/for-hamnar"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex min-h-12 items-center rounded-lg px-3 text-base font-medium transition active:bg-white/10"
              >
                För hamnar
              </Link>
              <Link
                href="/om-oss"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex min-h-12 items-center rounded-lg px-3 text-base font-medium transition active:bg-white/10"
              >
                Om oss
              </Link>
              {isHost ? (
                <Link
                  href="/dashboard/host"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex min-h-12 items-center rounded-lg px-3 text-base font-medium text-[#14b8a6] transition active:bg-white/10"
                >
                  Host dashboard
                </Link>
              ) : null}
              {isRenter ? (
                <Link
                  href="/dashboard/renter"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex min-h-12 items-center rounded-lg px-3 text-base font-medium text-[#14b8a6] transition active:bg-white/10"
                >
                  Min profil
                </Link>
              ) : null}
            </nav>
          </div>
        </>
      ) : null}
    </nav>
  );
}

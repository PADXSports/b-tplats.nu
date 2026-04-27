"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type AuthNavbarProps = {
  currentPage?: "home" | "search" | "listing" | "dashboard" | "profile";
};

export default function AuthNavbar({ currentPage = "home" }: AuthNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<"renter" | "host" | null>(() => {
    if (typeof window === "undefined") return null;
    const cachedRole = localStorage.getItem("userRole");
    return cachedRole === "host" || cachedRole === "renter" ? cachedRole : null;
  });

  useEffect(() => {
    let mounted = true;
    const normalizeRole = (value: string | null | undefined): "host" | "renter" =>
      value === "owner" || value === "host" ? "host" : "renter";

    const loadSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (mounted) {
        setEmail(user?.email ?? null);
      }

      if (user?.id) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        if (profileError) {
          console.error(profileError);
        }
        const nextRole = normalizeRole(profile?.role);
        localStorage.setItem("userRole", nextRole);
        if (mounted) {
          setRole(nextRole);
        }
      } else if (mounted) {
        localStorage.removeItem("userRole");
        setRole(null);
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setEmail(session?.user?.email ?? null);
      if (session?.user?.id) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();
        if (profileError) {
          console.error(profileError);
        }
        const nextRole = normalizeRole(profile?.role);
        localStorage.setItem("userRole", nextRole);
        setRole(nextRole);
      } else {
        localStorage.removeItem("userRole");
        setRole(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const isSearchActive =
    currentPage === "search" || pathname?.startsWith("/search") || pathname?.startsWith("/kajplatser");
  const isProfileActive = currentPage === "profile" || pathname?.startsWith("/profile");
  const activeHostTab =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null;
  const isHost = role === "host" && Boolean(email);
  const isRenter = role === "renter" && Boolean(email);

  return (
    <nav className="sticky top-0 z-50 bg-[#0a2342] shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
      <div className="mx-auto flex min-h-16 w-full max-w-[1280px] flex-wrap items-center gap-3 px-4 py-2 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0d9488] text-sm">
              ⚓
            </div>
            <span className="text-xl tracking-[-0.3px]">Båtplats.nu</span>
          </Link>
        </div>

        <div className="ml-auto hidden items-center gap-2 md:flex">
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
                  className="rounded-lg bg-[#0d9488] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#14b8a8]"
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
                  className="rounded-lg bg-[#0d9488] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#14b8a8]"
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
                        className="rounded-lg bg-[#0d9488] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#14b8a8]"
                      >
                        Logga ut
                      </button>
                    </>
                  ) : null}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="ml-2 rounded-lg bg-[#0d9488] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#14b8a8]"
                >
                  Logga in
                </Link>
              )}
            </>
          )}
        </div>

        {(isHost || isRenter) ? (
          <div className="ml-auto flex items-center gap-2 md:hidden">
            <span className="max-w-[140px] truncate rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white">
              {email}
            </span>
            {isRenter ? (
              <Link
                href="/dashboard/renter"
                className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white"
              >
                Min profil
              </Link>
            ) : null}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg bg-[#0d9488] px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#14b8a8]"
            >
              Logga ut
            </button>
          </div>
        ) : null}
      </div>
    </nav>
  );
}

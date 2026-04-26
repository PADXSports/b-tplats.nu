"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createSupabaseClient } from "@/lib/supabase-client";

type AuthNavbarProps = {
  currentPage?: "home" | "search" | "listing" | "dashboard" | "profile";
};

export default function AuthNavbar({ currentPage = "home" }: AuthNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<"renter" | "owner" | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setEmail(session?.user?.email ?? null);
      }

      if (session?.user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();
        if (mounted) {
          setRole(profile?.role === "owner" ? "owner" : "renter");
        }
      } else if (mounted) {
        setRole(null);
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setEmail(session?.user?.email ?? null);
      if (session?.user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();
        setRole(profile?.role === "owner" ? "owner" : "renter");
      } else {
        setRole(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const isSearchActive = currentPage === "search" || pathname?.startsWith("/search");
  const isDashboardActive = currentPage === "dashboard" || pathname?.startsWith("/dashboard");
  const isProfileActive = currentPage === "profile" || pathname?.startsWith("/profile");

  return (
    <nav className="sticky top-0 z-50 bg-[#0a2342] shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-6 px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0d9488] text-sm">
            ⚓
          </div>
          <span className="text-xl tracking-[-0.3px]">Båtplats.nu</span>
        </Link>

        <div className="ml-auto hidden items-center gap-1 md:flex">
          <Link
            href="/"
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Hem
          </Link>
          <Link
            href="/search"
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
              {role === "owner" ? (
                <Link
                  href="/dashboard"
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    isDashboardActive
                      ? "bg-white/20 text-white"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/profile"
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    isProfileActive
                      ? "bg-white/20 text-white"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  Min profil
                </Link>
              )}
              <span className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white">
                {email}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-lg bg-[#0d9488] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#14b8a8]"
              >
                Logga ut
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="ml-2 rounded-lg bg-[#0d9488] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#14b8a8]"
            >
              Logga in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

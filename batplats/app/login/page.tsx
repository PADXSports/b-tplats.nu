"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";

import { AuthOAuthDivider, GoogleOAuthButton } from "@/components/google-oauth-button";
import { RenterAuthBrandingPanel } from "@/components/renter-auth-panel";
import { createClient } from "@/lib/supabase/client";

const NAVY = "#0a1628";
const TEAL = "#0d9488";

const inputClass =
  "w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 transition bg-white text-gray-900 placeholder-gray-400";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [roleMismatch, setRoleMismatch] = useState<"host" | null>(null);

  const oauthRedirectPath = useMemo(() => {
    const redirectTo = searchParams.get("redirect") ?? searchParams.get("redirect_to");
    if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
      return redirectTo;
    }
    return undefined;
  }, [searchParams]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setRoleMismatch(null);
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError("Inloggning tog för lång tid, försök igen");
    }, 5000);

    try {
      const supabase = createClient();
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (loginError) {
        setError(loginError.message);
        return;
      }

      const user = data.user;
      if (!user) {
        setError("Ingen användare returnerades från inloggningen.");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
        return;
      }

      const normalizedRole: string =
        profileData?.role === "host" || profileData?.role === "owner" ? "host" : "renter";

      const redirectTo =
        searchParams.get("redirect") ?? searchParams.get("redirect_to");
      const safeRedirect =
        redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
          ? redirectTo
          : null;

      if (normalizedRole === "host") {
        const { data: privateListing } = await supabase
          .from("listings")
          .select("id")
          .eq("owner_id", user.id)
          .eq("listing_type", "private")
          .maybeSingle();

        if (!privateListing) {
          await supabase.auth.signOut();
          localStorage.removeItem("userEmail");
          localStorage.removeItem("userRole");
          setRoleMismatch("host");
          setError("Du är registrerad som hamnägare. Vänligen logga in via hamnägarsidan.");
          return;
        }

        localStorage.setItem("userEmail", user.email ?? "");
        localStorage.setItem("userRole", "host");
        router.push(safeRedirect ?? "/mitt-konto");
        router.refresh();
        return;
      }

      localStorage.setItem("userEmail", user.email ?? "");
      localStorage.setItem("userRole", normalizedRole);

      if (safeRedirect) {
        router.push(safeRedirect);
      } else {
        router.push("/dashboard/renter");
      }
      router.refresh();
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <RenterAuthBrandingPanel
        headline="Hitta din perfekta båtplats"
        subtitle="Boka säsongsplats direkt från hamnar och privatpersoner i hela Sverige."
      />

      <div className="flex flex-1 flex-col justify-center bg-white px-6 py-12 lg:px-16">
        <Link href="/" className="mb-8 text-xl font-bold lg:hidden" style={{ color: NAVY }}>
          Båtplats.nu
        </Link>

        <div className="mx-auto w-full max-w-md">
          <h2 className="mb-2 text-2xl font-bold" style={{ color: NAVY }}>
            Logga in
          </h2>
          <p className="mb-8 text-gray-500">
            Välkommen tillbaka! Logga in för att hantera dina bokningar.
          </p>

          <GoogleOAuthButton newUserRole="renter" redirectPath={oauthRedirectPath} />
          <div className="my-5">
            <AuthOAuthDivider />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">E-post</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="din@email.se"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Lösenord</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                placeholder="Ditt lösenord"
                className={inputClass}
              />
            </div>

            {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
            {roleMismatch === "host" ? (
              <Link
                href="/hamnar/logga-in"
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl border-2 border-teal-500 px-4 py-2.5 text-sm font-semibold text-teal-600 transition hover:bg-teal-50"
              >
                Gå till hamnägarsidan
              </Link>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-xl py-4 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: TEAL }}
            >
              {loading ? "Loggar in..." : "Logga in →"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Inget konto?{" "}
            <Link href="/signup" className="font-medium text-teal-600 hover:underline">
              Skapa konto
            </Link>
          </p>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-xs text-gray-400">Är du hamnägare?</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <Link
            href="/hamnar/logga-in"
            className="block w-full rounded-xl border-2 border-gray-200 py-3 text-center text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            Logga in som hamnägare
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white text-gray-600">
          <p className="text-sm font-medium">Laddar inloggning...</p>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

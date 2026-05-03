"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

import Footer from "@/components/footer";
import { AuthOAuthDivider, GoogleOAuthButton } from "@/components/google-oauth-button";
import { createClient } from "@/lib/supabase/client";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
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

      const normalizedRole = profileData?.role === "host" || profileData?.role === "owner" ? "host" : "renter";
      localStorage.setItem("userEmail", user.email ?? "");
      localStorage.setItem("userRole", normalizedRole);
      const redirectToPath = searchParams.get("redirect_to");
      const redirectPath = searchParams.get("redirect");
      if (redirectToPath) {
        router.push(redirectToPath);
      } else if (redirectPath) {
        router.push(redirectPath);
      } else {
        router.push(normalizedRole === "host" ? "/dashboard/host" : "/dashboard/renter");
      }
      router.refresh();
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#0f1f3d]">
      <section className="bg-gradient-to-br from-[#0f1f3d] via-[#0d2252] to-[#0d9488] px-6 py-16 text-white">
        <div className="mx-auto w-full max-w-[520px]">
          <Link
            href="/"
            className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-[14px] py-[6px] text-[0.85rem] font-medium text-white transition hover:bg-white/20"
          >
            ← Startsidan
          </Link>
          <p className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#14b8a6]">
            Logga in som båtägare
          </p>
          <h1 className="mt-2 text-[2rem] font-extrabold">Logga in</h1>
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mx-auto w-full max-w-[520px] rounded-xl border border-[#dce3ee] bg-white p-6 shadow-[0_1px_4px_rgba(15,31,61,0.08),0_1px_2px_rgba(15,31,61,0.05)]">
          <GoogleOAuthButton newUserRole="renter" />
          <div className="my-4">
            <AuthOAuthDivider />
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#0f1f3d]">E-post</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-lg border border-[#c5d0de] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[#0f1f3d]">Lösenord</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full rounded-lg border border-[#c5d0de] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
              />
            </div>

            {error ? <p className="text-sm text-[#d64c3b]">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#0d9488] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#14b8a6] disabled:opacity-60"
            >
              {loading ? "Loggar in..." : "Logga in"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[#8a96a8]">
            Inget konto?{" "}
            <Link href="/signup" className="font-semibold text-[#0d9488] hover:underline">
              Skapa konto
            </Link>
          </p>

          <div className="my-5 border-t border-[#dce3ee]" />

          <p className="text-center text-sm text-[#8a96a8]">Är du hamnägare?</p>
          <Link
            href="/hamnar/logga-in"
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg border-2 border-[#0d9488] px-4 py-2.5 text-sm font-semibold text-[#0d9488] transition hover:bg-[#0d9488] hover:text-white"
          >
            Logga in som hamnägare
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f5f0e8] text-[#0f1f3d]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#c5d0de] border-t-[#0d9488]" />
            <p className="text-sm font-medium text-[#8a96a8]">Laddar inloggning...</p>
          </div>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

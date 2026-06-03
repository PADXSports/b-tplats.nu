"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { AuthOAuthDivider, GoogleOAuthButton } from "@/components/google-oauth-button";
import { RenterAuthBrandingPanel } from "@/components/renter-auth-panel";
import { createClient } from "@/lib/supabase/client";

const NAVY = "#0a1628";
const TEAL = "#0d9488";

const inputClass =
  "w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 transition bg-white text-gray-900 placeholder-gray-400";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError("Registreringen tog för lång tid, försök igen");
    }, 5000);

    try {
      const supabase = createClient();
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (signupError) {
        setError(signupError.message);
        return;
      }

      const userId = data.user?.id;
      if (userId) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: userId,
          role: "renter",
          full_name: name,
        });

        if (profileError) {
          setError(profileError.message);
          return;
        }
      }

      router.push("/dashboard/renter");
      router.refresh();
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <RenterAuthBrandingPanel
        headline="Kom igång gratis idag"
        subtitle="Boka säsongsplats direkt från hamnar och privatpersoner i hela Sverige."
      />

      <div className="flex flex-1 flex-col justify-center bg-white px-6 py-12 lg:px-16">
        <Link href="/" className="mb-8 text-xl font-bold lg:hidden" style={{ color: NAVY }}>
          Båtplats.nu
        </Link>

        <div className="mx-auto w-full max-w-md">
          <h2 className="mb-2 text-2xl font-bold" style={{ color: NAVY }}>
            Skapa ett gratis konto
          </h2>
          <p className="mb-8 text-gray-500">Kom igång på under en minut.</p>

          <GoogleOAuthButton newUserRole="renter" />
          <div className="my-5">
            <AuthOAuthDivider />
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Namn</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                placeholder="Ditt namn"
                className={inputClass}
              />
            </div>

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
                minLength={6}
                placeholder="Minst 6 tecken"
                className={inputClass}
              />
            </div>

            {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-xl py-4 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: TEAL }}
            >
              {loading ? "Skapar konto..." : "Skapa konto →"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Har du redan ett konto?{" "}
            <Link href="/login" className="font-medium text-teal-600 hover:underline">
              Logga in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

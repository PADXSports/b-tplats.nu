"use client";

import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import AuthNavbar from "@/components/auth-navbar";
import { createClient } from "@/lib/supabase/client";

type ProfileForm = {
  full_name: string;
  phone: string;
  company_name: string;
  org_number: string;
  profile_photo_url: string;
  bank_name: string;
  account_number: string;
  iban: string;
  bic_swift: string;
  swish_number: string;
  vat_registered: boolean;
  vat_number: string;
  public_display_name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  notify_email_bookings: boolean;
  notify_email_confirmations: boolean;
  notify_email_cancellations: boolean;
  notify_email_monthly_summary: boolean;
  notify_sms: boolean;
};

const initialForm: ProfileForm = {
  full_name: "",
  phone: "",
  company_name: "",
  org_number: "",
  profile_photo_url: "",
  bank_name: "",
  account_number: "",
  iban: "",
  bic_swift: "",
  swish_number: "",
  vat_registered: false,
  vat_number: "",
  public_display_name: "",
  contact_email: "",
  contact_phone: "",
  address: "",
  notify_email_bookings: true,
  notify_email_confirmations: true,
  notify_email_cancellations: true,
  notify_email_monthly_summary: true,
  notify_sms: false,
};

const emailLooksValid = (value: string) => value.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const phoneLooksValid = (value: string) => value.trim() === "" || /^[+\d][\d\s-]{5,}$/.test(value.trim());
const accountLooksValid = (value: string) => value.trim() === "" || /^[\d\s-]{6,}$/.test(value.trim());

export default function HostProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login?redirect=/dashboard/host/profil");
        return;
      }
      setUserId(user.id);
      setEmail(user.email ?? "");

      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) {
        console.error(error);
      }
      if (data) {
        setForm({
          full_name: data.full_name ?? "",
          phone: data.phone ?? "",
          company_name: data.company_name ?? "",
          org_number: data.org_number ?? "",
          profile_photo_url: data.profile_photo_url ?? "",
          bank_name: data.bank_name ?? "",
          account_number: data.account_number ?? "",
          iban: data.iban ?? "",
          bic_swift: data.bic_swift ?? "",
          swish_number: data.swish_number ?? "",
          vat_registered: Boolean(data.vat_registered),
          vat_number: data.vat_number ?? "",
          public_display_name: data.public_display_name ?? "",
          contact_email: data.contact_email ?? "",
          contact_phone: data.contact_phone ?? "",
          address: data.address ?? "",
          notify_email_bookings: data.notify_email_bookings ?? true,
          notify_email_confirmations: data.notify_email_confirmations ?? true,
          notify_email_cancellations: data.notify_email_cancellations ?? true,
          notify_email_monthly_summary: data.notify_email_monthly_summary ?? true,
          notify_sms: data.notify_sms ?? false,
        });
      }
      setLoading(false);
    };
    void load();
  }, [router, supabase]);

  const setField = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const uploadProfilePhoto = async (file: File, ownerId: string) => {
    const ext = file.name.split(".").pop() ?? "jpg";
    const fileName = `profile-${ownerId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("listing-images").upload(fileName, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("listing-images").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const saveProfile = async () => {
    if (!userId || saving) return;
    if (!phoneLooksValid(form.phone) || !phoneLooksValid(form.contact_phone) || !phoneLooksValid(form.swish_number)) {
      alert("Ogiltigt telefonnummerformat.");
      return;
    }
    if (!emailLooksValid(form.contact_email)) {
      alert("Ogiltig e-postadress för kontaktuppgifter.");
      return;
    }
    if (!accountLooksValid(form.account_number)) {
      alert("Ogiltigt kontonummer.");
      return;
    }

    setSaving(true);
    try {
      let photoUrl = form.profile_photo_url || null;
      if (profilePhotoFile) {
        photoUrl = await uploadProfilePhoto(profilePhotoFile, userId);
      }

      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        role: "host",
        full_name: form.full_name || null,
        phone: form.phone || null,
        company_name: form.company_name || null,
        org_number: form.org_number || null,
        profile_photo_url: photoUrl,
        bank_name: form.bank_name || null,
        account_number: form.account_number || null,
        iban: form.iban || null,
        bic_swift: form.bic_swift || null,
        swish_number: form.swish_number || null,
        vat_registered: form.vat_registered,
        vat_number: form.vat_number || null,
        public_display_name: form.public_display_name || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        address: form.address || null,
        notify_email_bookings: form.notify_email_bookings,
        notify_email_confirmations: form.notify_email_confirmations,
        notify_email_cancellations: form.notify_email_cancellations,
        notify_email_monthly_summary: form.notify_email_monthly_summary,
        notify_sms: form.notify_sms,
      });
      if (error) throw error;
      setToast("Profil uppdaterad!");
      setTimeout(() => setToast(null), 2500);
      if (photoUrl) setField("profile_photo_url", photoUrl);
      setProfilePhotoFile(null);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Kunde inte spara profil.");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      alert("Lösenordet måste vara minst 8 tecken.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Lösenorden matchar inte.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      alert(error.message);
      return;
    }
    setShowPasswordModal(false);
    setNewPassword("");
    setConfirmPassword("");
    setToast("Lösenord uppdaterat!");
    setTimeout(() => setToast(null), 2500);
  };

  const deleteAccount = async () => {
    const confirmed = window.confirm("Är du säker på att du vill ta bort kontot? Detta kan inte ångras.");
    if (!confirmed) return;
    alert("Kontoborttagning kräver manuell hantering. Kontakta support så hjälper vi dig.");
  };

  if (loading) {
    return <main className="min-h-screen bg-[#0d2252]" />;
  }

  return (
    <main className="min-h-screen bg-[#0d2252] text-white">
      <AuthNavbar currentPage="dashboard" />
      <section className="mx-auto w-full max-w-[1280px] space-y-6 px-4 py-8 sm:px-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#14b8a6]">Inställningar</p>
          <h1 className="text-2xl font-extrabold">Profil</h1>
        </header>

        {toast ? (
          <div className="rounded-xl border border-[#99f6e4] bg-[#0f2b60] p-3 text-sm text-[#5eead4]">{toast}</div>
        ) : null}

        <section className="rounded-xl bg-[#123068] p-5">
          <h2 className="text-lg font-bold">Personlig information</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} placeholder="Fullständigt namn" className="rounded-lg border border-white/20 bg-[#0d2252] px-3 py-2 text-sm" />
            <input value={email} readOnly className="rounded-lg border border-white/20 bg-[#0c1f49] px-3 py-2 text-sm text-white/75" />
            <input value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="Telefonnummer" className="rounded-lg border border-white/20 bg-[#0d2252] px-3 py-2 text-sm" />
            <input value={form.company_name} onChange={(e) => setField("company_name", e.target.value)} placeholder="Företagsnamn (valfritt)" className="rounded-lg border border-white/20 bg-[#0d2252] px-3 py-2 text-sm" />
            <input value={form.org_number} onChange={(e) => setField("org_number", e.target.value)} placeholder="Organisationsnummer (valfritt)" className="rounded-lg border border-white/20 bg-[#0d2252] px-3 py-2 text-sm" />
            <div className="rounded-lg border border-white/20 bg-[#0d2252] p-3">
              <p className="mb-2 text-xs font-semibold uppercase text-white/70">Profilfoto</p>
              <input type="file" accept="image/*" onChange={(e) => setProfilePhotoFile(e.target.files?.[0] ?? null)} className="text-sm" />
              {form.profile_photo_url ? (
                <div className="relative mt-3 h-16 w-16 overflow-hidden rounded-full border border-white/20">
                  <Image src={form.profile_photo_url} alt="Profilbild" fill className="object-cover" sizes="64px" />
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-[#123068] p-5">
          <h2 className="text-lg font-bold">Betalningsuppgifter</h2>
          <p className="mt-1 text-sm text-white/75">Betalningar från bokningar överförs till detta konto.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input value={form.bank_name} onChange={(e) => setField("bank_name", e.target.value)} placeholder="Banknamn" className="rounded-lg border border-white/20 bg-[#0d2252] px-3 py-2 text-sm" />
            <input value={form.account_number} onChange={(e) => setField("account_number", e.target.value)} placeholder="Kontonummer (clearing + konto)" className="rounded-lg border border-white/20 bg-[#0d2252] px-3 py-2 text-sm" />
            <input value={form.iban} onChange={(e) => setField("iban", e.target.value)} placeholder="IBAN" className="rounded-lg border border-white/20 bg-[#0d2252] px-3 py-2 text-sm" />
            <input value={form.bic_swift} onChange={(e) => setField("bic_swift", e.target.value)} placeholder="BIC/SWIFT" className="rounded-lg border border-white/20 bg-[#0d2252] px-3 py-2 text-sm" />
            <input value={form.swish_number} onChange={(e) => setField("swish_number", e.target.value)} placeholder="Swish-nummer" className="rounded-lg border border-white/20 bg-[#0d2252] px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 rounded-lg border border-white/20 bg-[#0d2252] px-3 py-2 text-sm">
              <input type="checkbox" checked={form.vat_registered} onChange={(e) => setField("vat_registered", e.target.checked)} />
              Momsregistrerad
            </label>
            <input value={form.vat_number} onChange={(e) => setField("vat_number", e.target.value)} placeholder="Momsnummer" className="rounded-lg border border-white/20 bg-[#0d2252] px-3 py-2 text-sm sm:col-span-2" />
          </div>
        </section>

        <section className="rounded-xl bg-[#123068] p-5">
          <h2 className="text-lg font-bold">Kontaktinformation</h2>
          <p className="mt-1 text-sm text-white/75">Denna information visas för hyresgäster som bokar.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input value={form.public_display_name} onChange={(e) => setField("public_display_name", e.target.value)} placeholder="Publikt visningsnamn" className="rounded-lg border border-white/20 bg-[#0d2252] px-3 py-2 text-sm" />
            <input value={form.contact_email} onChange={(e) => setField("contact_email", e.target.value)} placeholder="Kontakt e-post" className="rounded-lg border border-white/20 bg-[#0d2252] px-3 py-2 text-sm" />
            <input value={form.contact_phone} onChange={(e) => setField("contact_phone", e.target.value)} placeholder="Kontakt telefon" className="rounded-lg border border-white/20 bg-[#0d2252] px-3 py-2 text-sm" />
            <input value={form.address} onChange={(e) => setField("address", e.target.value)} placeholder="Adress (valfritt)" className="rounded-lg border border-white/20 bg-[#0d2252] px-3 py-2 text-sm" />
          </div>
        </section>

        <section className="rounded-xl bg-[#123068] p-5">
          <h2 className="text-lg font-bold">Notifikationer</h2>
          <div className="mt-4 grid gap-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.notify_email_bookings} onChange={(e) => setField("notify_email_bookings", e.target.checked)} /> Nya bokningsförfrågningar</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.notify_email_confirmations} onChange={(e) => setField("notify_email_confirmations", e.target.checked)} /> Bokningsbekräftelser</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.notify_email_cancellations} onChange={(e) => setField("notify_email_cancellations", e.target.checked)} /> Bokningsavbokningar</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.notify_email_monthly_summary} onChange={(e) => setField("notify_email_monthly_summary", e.target.checked)} /> Månadsrapport (intäkter)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.notify_sms} onChange={(e) => setField("notify_sms", e.target.checked)} /> SMS-notiser (om telefon finns)</label>
          </div>
        </section>

        <section className="rounded-xl bg-[#123068] p-5">
          <h2 className="text-lg font-bold">Kontoinställningar</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => setShowPasswordModal(true)} className="rounded-lg border border-[#14b8a6]/70 px-4 py-2 text-sm font-semibold text-[#5eead4]">Byt lösenord</button>
            <button disabled className="rounded-lg border border-white/30 px-4 py-2 text-sm text-white/60">Tvåfaktorsautentisering (kommer snart)</button>
            <button disabled className="rounded-lg border border-white/30 px-4 py-2 text-sm text-white/60">Språk: Svenska</button>
          </div>
          <button onClick={() => void deleteAccount()} className="mt-6 rounded-lg border border-red-300/60 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200">
            Ta bort konto
          </button>
        </section>

        <div className="flex justify-end">
          <button onClick={() => void saveProfile()} disabled={saving} className="rounded-lg bg-[#14b8a6] px-5 py-2.5 text-sm font-semibold text-[#0b1b3f] disabled:opacity-70">
            {saving ? "Sparar..." : "Spara profil"}
          </button>
        </div>
      </section>

      {showPasswordModal ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 text-[#0f1f3d]">
            <h3 className="text-lg font-bold">Byt lösenord</h3>
            <div className="mt-4 grid gap-3">
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nytt lösenord" className="rounded-lg border px-3 py-2 text-sm" />
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Bekräfta lösenord" className="rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowPasswordModal(false)} className="rounded-lg border px-3 py-2 text-sm">Avbryt</button>
              <button onClick={() => void changePassword()} className="rounded-lg bg-[#14b8a6] px-3 py-2 text-sm font-semibold text-[#0b1b3f]">Spara</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}


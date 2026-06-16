'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Building2,
  Check,
  ChevronDown,
  Images,
  LayoutDashboard,
  Ruler,
  Sailboat,
  Users,
  Wallet,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import AuthNavbar from '@/components/auth-navbar';
import DateRangePicker from '@/components/DateRangePicker';
import Footer from '@/components/footer';
import LandingHeroWave from '@/components/landing-hero-wave';
import RentalTypeChoice from '@/components/RentalTypeChoice';
import { loadGoogleMaps } from '@/lib/google-maps-loader';
import { createClient } from '@/lib/supabase/client';
import type { RentalType } from '@/lib/rental-type';

type WizardData = {
  spotName: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  city: string;
  max_boat_length: number | null;
  max_boat_width: number | null;
  description: string;
  amenities: string[];
  images: File[];
  imageUrls: string[];
  price_per_season: number | null;
  rental_type: RentalType;
  season_start: string;
  season_end: string;
};

type WizardDataUpdate = Partial<WizardData>;

const AMENITY_OPTIONS = [
  { id: 'el', label: 'El' },
  { id: 'vatten', label: 'Vatten' },
  { id: 'wifi', label: 'WiFi' },
  { id: 'toalett', label: 'Toalett' },
  { id: 'dusch', label: 'Dusch' },
  { id: 'parkering', label: 'Parkering' },
  { id: 'bransle', label: 'Bränsle' },
  { id: 'service', label: 'Service' },
] as const;

const LANDING_BENEFITS = [
  {
    icon: Users,
    title: 'Nå fler båtägare',
    description:
      'Tusentals båtägare söker platser på Båtplats.nu varje säsong. Din plats syns direkt för rätt målgrupp.',
  },
  {
    icon: Wallet,
    title: 'Tjäna på din plats',
    description:
      'Har du en plats som står tom delar av säsongen? Hyr ut den och få betalt direkt via säker betalning.',
  },
  {
    icon: LayoutDashboard,
    title: 'Enkel hantering',
    description:
      'Hantera bokningar, kommunicera med hyresgäster och håll koll på intäkter, allt på ett ställe.',
  },
] as const;

const PROCESS_STEPS = [
  {
    step: '01',
    title: 'Skapa din annons',
    copy: 'Marina eller privatperson: skapa en annons på några minuter med bilder, mått och pris.',
  },
  {
    step: '02',
    title: 'Ta emot bokningar',
    copy: 'Båtägare hittar din plats och bokar direkt. Du får notis och kan hantera allt i din dashboard.',
  },
  {
    step: '03',
    title: 'Få betalt',
    copy: 'Betalning hanteras säkert via Båtplats.nu. Pengarna betalas ut direkt till ditt konto.',
  },
] as const;

const FAQ_ITEMS = [
  {
    question: 'Vem kan lista en plats?',
    answer:
      'Både hamnägare med flera platser och privatpersoner med en egen båtplats kan lista på Båtplats.nu. Välj det alternativ som passar dig bäst när du kommer igång.',
  },
  {
    question: 'Hur får jag betalt?',
    answer:
      'Betalning sker säkert via plattformen när en båtägare bokar din plats. Utbetalning sker till ditt bankkonto efter en bekräftad bokning.',
  },
  {
    question: 'Kan jag pausa min annons?',
    answer:
      'Ja. Du kan när som helst markera platsen som otillgänglig i din dashboard utan att ta bort annonsen.',
  },
  {
    question: 'Vad händer om en bokning avbokas?',
    answer:
      'Avbokningsregler framgår vid bokning. Vid avbokning hanteras ersättning och återbetalning enligt de villkor som gäller för respektive bokning.',
  },
  {
    question: 'Behöver jag ett företag för att hyra ut?',
    answer:
      'Nej. Privatpersoner kan hyra ut sin egen plats. Driver du en marina eller båtklubb registrerar du dig som hamnägare.',
  },
] as const;

function TealIconBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(13,148,136,0.10)] text-[#0d9488]">
      {children}
    </div>
  );
}

function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {FAQ_ITEMS.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={item.question} className="overflow-hidden rounded-2xl border border-[#dce3ee] bg-white">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              aria-expanded={isOpen}
            >
              <span className="font-semibold text-[#0a1628]">{item.question}</span>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-[#0d9488] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
            >
              <div className="overflow-hidden">
                <p className="px-6 pb-5 text-[15px] leading-relaxed text-[#4a5568]">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type HyrUtLandingProps = {
  onStartPrivate: () => void;
};

function HyrUtLanding({ onStartPrivate }: HyrUtLandingProps) {
  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#0a1628]">
      <AuthNavbar currentPage="home" />

      <section className="relative overflow-hidden bg-[#0a1628] px-4 pb-20 pt-28 sm:px-6 sm:pb-24 sm:pt-32 md:px-12">
        <LandingHeroWave />
        <div
          className="pointer-events-none absolute left-1/2 top-[-20%] h-[500px] w-[700px] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(13,148,136,0.18)_0%,transparent_70%)]"
          aria-hidden
        />
        <div className="relative z-[2] mx-auto w-full max-w-[760px] text-center text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#14b8a6]">
            För hamnar & privatpersoner
          </p>
          <h1 className="mt-4 text-[clamp(2rem,5vw,3.25rem)] font-extrabold leading-tight tracking-[-0.04em]">
            Hyr ut din båtplats
          </h1>
          <p className="mx-auto mt-5 max-w-[640px] text-base leading-relaxed text-white/70 sm:text-lg">
            Oavsett om du driver en marina eller har en privat plats du inte använder, lista den på Båtplats.nu och nå
            tusentals båtägare.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/for-hamnar"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0d9488] px-8 py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#0f766e] sm:w-auto"
            >
              <Building2 className="h-5 w-5" aria-hidden />
              Jag driver en marina
            </Link>
            <button
              type="button"
              onClick={onStartPrivate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 text-[15px] font-semibold text-[#0a1628] transition hover:bg-[#f5f0e8] sm:w-auto"
            >
              <Sailboat className="h-5 w-5" aria-hidden />
              Jag har en privat plats
            </button>
          </div>
          <div className="mt-5">
            <Link
              href="/hamnar/logga-in"
              className="text-sm font-medium text-white/70 underline-offset-2 transition hover:text-white hover:underline"
            >
              Logga in som hamnägare
            </Link>
          </div>
        </div>
        <svg
          className="absolute bottom-0 left-0 right-0 h-16 w-full text-[#f5f0e8] sm:h-20"
          viewBox="0 0 1440 80"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d="M0 40Q360 10 720 40Q1080 70 1440 40L1440 80L0 80Z" fill="currentColor" />
        </svg>
      </section>

      <section className="px-4 py-14 sm:px-6 md:px-12 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d9488]">Fördelar</p>
            <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold tracking-[-0.035em] text-[#0a1628]">
              Varför välja Båtplats.nu?
            </h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3 md:gap-8">
            {LANDING_BENEFITS.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-2xl border border-[#dce3ee] bg-white p-8 shadow-[0_4px_16px_rgba(10,22,40,0.06)]"
              >
                <TealIconBox>
                  <Icon className="h-6 w-6" aria-hidden />
                </TealIconBox>
                <h3 className="mt-5 text-lg font-bold text-[#0a1628]">{title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[#4a5568]">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:px-6 md:px-12 md:py-24">
        <div className="mx-auto max-w-[720px] text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d9488]">Pris</p>
          <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold tracking-[-0.035em] text-[#0a1628]">
            Vad kostar det?
          </h2>
          <div className="mt-8 rounded-2xl border border-[#dce3ee] bg-[#fafcff] px-8 py-10 shadow-[0_4px_16px_rgba(10,22,40,0.06)]">
            <p className="text-[18px] leading-relaxed text-[#0a1628]">
              Det är gratis att lista din plats. Vi tar endast en serviceavgift när du får en bekräftad bokning.
            </p>
            <ul className="mt-8 space-y-4 text-left">
              {[
                'Inga månadsavgifter eller startkostnader',
                'Utbetalning direkt till ditt bankkonto efter bokning',
              ].map((point) => (
                <li key={point} className="flex items-start gap-3 text-[15px] text-[#4a5568]">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(13,148,136,0.10)] text-[#0d9488]">
                    <Check className="h-4 w-4" aria-hidden />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 md:px-12 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d9488]">Process</p>
            <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold tracking-[-0.035em] text-[#0a1628]">
              Så här fungerar det
            </h2>
          </div>
          <div className="relative mt-10 grid gap-6 md:grid-cols-3 md:gap-8">
            <div
              className="pointer-events-none absolute left-[20%] right-[20%] top-[22px] hidden border-t-2 border-dashed border-[#0d9488]/35 md:block"
              aria-hidden
            />
            {PROCESS_STEPS.map(({ step, title, copy }) => (
              <article
                key={title}
                className="relative rounded-2xl border border-[#dce3ee] bg-white p-8 shadow-[0_4px_16px_rgba(10,22,40,0.06)]"
              >
                <div className="relative z-[1] mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#0d9488] text-xs font-bold text-white">
                  {step}
                </div>
                <h3 className="text-lg font-bold text-[#0a1628]">{title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[#4a5568]">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:px-6 md:px-12 md:py-24">
        <div className="mx-auto max-w-[800px]">
          <div className="mb-10 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d9488]">Frågor & svar</p>
            <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold tracking-[-0.035em] text-[#0a1628]">
              Vanliga frågor
            </h2>
          </div>
          <FaqAccordion />
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 md:px-12 md:py-24">
        <div className="mx-auto max-w-[1200px] rounded-2xl bg-gradient-to-br from-[#0a1628] via-[#0d1f3d] to-[#0d2252] px-8 py-12 text-center text-white md:px-14 md:py-16">
          <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-tight tracking-[-0.035em]">
            Redo att lista din plats?
          </h2>
          <p className="mx-auto mt-4 max-w-[560px] text-[16px] leading-relaxed text-white/75">
            Det tar mindre än 5 minuter att komma igång.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/for-hamnar"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0d9488] px-8 py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#0f766e] sm:w-auto"
            >
              <Building2 className="h-5 w-5" aria-hidden />
              Jag driver en marina
            </Link>
            <button
              type="button"
              onClick={onStartPrivate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-transparent px-8 py-3.5 text-[15px] font-semibold text-white transition hover:bg-white/10 sm:w-auto"
            >
              <Sailboat className="h-5 w-5" aria-hidden />
              Jag har en privat plats
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

const STEP_COPY: Record<number, { title: string; subtext: string }> = {
  1: { title: 'Vad hyr du ut?', subtext: 'Välj det som stämmer bäst för dig' },
  2: { title: 'Namn & plats', subtext: 'Döp din plats och ange var båtplatsen finns' },
  3: { title: 'Berätta om platsen', subtext: 'Hjälp båtägare förstå vad din plats erbjuder' },
  4: { title: 'Bilder & pris', subtext: 'Bra bilder ökar chansen att få bokningar' },
  5: { title: 'Granska & publicera', subtext: 'Kontrollera att allt ser bra ut innan du publicerar' },
};

const totalSteps = 5;
const NAVY = '#0a1628';
const TEAL = '#0d9488';

const inputClass =
  'w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-0 bg-white text-gray-900 placeholder-gray-400 transition';

const WIZARD_DRAFT_KEY = 'batplats.hyrut.draft';
const OAUTH_PENDING_KEY = 'batplats.hyrut.oauth.pending';
const LEGACY_WIZARD_KEY = 'wizardData';
const OAUTH_WIZARD_KEY = 'hyrut_wizard_data';

function getPricePeriodLabel(rentalType: RentalType): string {
  if (rentalType === 'season') return '/ säsong';
  if (rentalType === 'flexible') return '/ period';
  return '/ period';
}

function resolveWizardPrice(
  wizardData: WizardData & {
    price?: number | string | null;
    pricePerSeason?: number | string | null;
    amount?: number | string | null;
  },
): number {
  const candidates = [
    wizardData.price_per_season,
    wizardData.price,
    wizardData.pricePerSeason,
    wizardData.amount,
  ];
  for (const candidate of candidates) {
    const parsed = Number.parseFloat(String(candidate ?? ""));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

function normalizeWizardData(input: Partial<WizardData> & Record<string, unknown>): Partial<WizardData> {
  const priceCandidate = resolveWizardPrice(input as WizardData & {
    price?: number | string | null;
    pricePerSeason?: number | string | null;
    amount?: number | string | null;
  });
  return {
    ...input,
    price_per_season: priceCandidate > 0 ? priceCandidate : null,
  };
}

type StoredWizardData = Partial<WizardData> & {
  savedAt?: number;
  step?: number;
};

function hasWizardRealData(input: Partial<WizardData> & Record<string, unknown>): boolean {
  const resolvedPrice = resolveWizardPrice(input as WizardData & {
    price?: number | string | null;
    pricePerSeason?: number | string | null;
    amount?: number | string | null;
  });
  return Boolean(
    resolvedPrice > 0 ||
      String(input.address ?? "").trim() ||
      String(input.description ?? "").trim() ||
      (Array.isArray(input.imageUrls) && input.imageUrls.length > 0) ||
      input.max_boat_length != null ||
      input.max_boat_width != null ||
      input.latitude != null ||
      input.longitude != null,
  );
}

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width={18} height={18} aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.597 32.09 29.11 35 24 35c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C33.941 4.846 29.196 3 24 3 12.954 3 4 11.954 4 23s8.954 20 20 20 20-8.954 20-20c0-1.341-.132-2.633-.379-3.923z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C33.941 4.846 29.196 3 24 3 16.318 3 9.656 7.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 43c5.114 0 9.86-1.951 13.409-5.151l-6.191-5.238C29.211 35.091 26.715 36 24 36c-5.114 0-9.602-2.91-11.854-7.133l-6.521 5.019C9.505 39.556 16.227 43 24 43z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.132-2.633-.379-3.923z"
      />
    </svg>
  );
}

function HyrUtContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState(() => (searchParams.get('skip') === '1' ? 2 : 1));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [sessionAuthLoading, setSessionAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [authData, setAuthData] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const publishTriggeredRef = useRef(false);
  const [data, setData] = useState<WizardData>({
    spotName: '',
    address: '',
    latitude: null,
    longitude: null,
    city: '',
    max_boat_length: null,
    max_boat_width: null,
    description: '',
    amenities: [],
    images: [],
    imageUrls: [],
    price_per_season: null,
    rental_type: 'season',
    season_start: '2026-05-01',
    season_end: '2026-09-30',
  });

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const stepMeta = STEP_COPY[step];
  const shouldAutoPublishFromGoogle = searchParams.get('google') === '1';
  const shouldAutoPublishFromQuery = searchParams.get('publish') === 'true';

  const persistDraft = useCallback((nextData: WizardData) => {
    if (typeof window === 'undefined') return;
    if (!hasWizardRealData(nextData)) return;
    const resolvedPrice = resolveWizardPrice(nextData as WizardData & {
      price?: number | string | null;
      pricePerSeason?: number | string | null;
      amount?: number | string | null;
    });
    const draftToStore: Omit<WizardData, 'images'> = {
      ...nextData,
      price_per_season: resolvedPrice > 0 ? resolvedPrice : null,
      images: [],
    };
    window.localStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(draftToStore));
    window.localStorage.setItem(
      LEGACY_WIZARD_KEY,
      JSON.stringify({
        ...draftToStore,
        price: resolvedPrice > 0 ? resolvedPrice : null,
      }),
    );
    window.localStorage.setItem(
      OAUTH_WIZARD_KEY,
      JSON.stringify({
        ...draftToStore,
        price: resolvedPrice > 0 ? resolvedPrice : null,
        savedAt: Date.now(),
        step,
      }),
    );
  }, [step]);

  const updateWizardData = useCallback(
    (patch: WizardDataUpdate) => {
      setData((prev) => {
        const next = { ...prev, ...patch };
        if (hasWizardRealData(next)) {
          persistDraft(next);
          console.log('Saved to localStorage:', next);
        }
        return next;
      });
    },
    [persistDraft],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedDraft =
      window.localStorage.getItem(WIZARD_DRAFT_KEY) ?? window.localStorage.getItem(LEGACY_WIZARD_KEY);
    if (!savedDraft) return;
    try {
      const parsed = JSON.parse(savedDraft) as Partial<WizardData> & Record<string, unknown>;
      const normalized = normalizeWizardData(parsed);
      setData((prev) => ({ ...prev, ...normalized, images: prev.images }));
      if (normalized.address) setAddressInput(normalized.address);
    } catch {
      // Ignore invalid localStorage payload
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(OAUTH_WIZARD_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as StoredWizardData & Record<string, unknown>;
      if (typeof parsed.savedAt === 'number' && Date.now() - parsed.savedAt > 10 * 60 * 1000) {
        window.localStorage.removeItem(OAUTH_WIZARD_KEY);
        return;
      }
      if (!hasWizardRealData(parsed)) {
        window.localStorage.removeItem(OAUTH_WIZARD_KEY);
        return;
      }
      const normalized = normalizeWizardData(parsed);
      console.log('Restored wizard data from localStorage:', normalized);
      setData((prev) => ({ ...prev, ...normalized, images: prev.images }));
      if (normalized.address) setAddressInput(normalized.address);
      if (typeof parsed.step === 'number' && parsed.step >= 2 && parsed.step <= totalSteps) {
        setStep(parsed.step);
      }
    } catch (restoreError) {
      console.error('Failed to restore wizard data:', restoreError);
    }
  }, []);

  useEffect(() => {
    console.log('wizardData updated:', data);
  }, [data]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setSessionAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const searchAddress = async () => {
    if (!addressInput.trim()) return;
    setSearching(true);

    try {
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(addressInput.trim())}`);
      const result = (await response.json()) as {
        lat?: number;
        lng?: number;
        city?: string;
        formatted_address?: string;
        error?: string;
      };

      if (result.lat != null && result.lng != null) {
        const resolvedAddress = result.formatted_address ?? addressInput.trim();
        updateWizardData({
          address: resolvedAddress,
          latitude: result.lat ?? null,
          longitude: result.lng ?? null,
          city: result.city || '',
        });
        setAddressInput(resolvedAddress);
        setError('');
      } else {
        setError(result.error ?? 'Plats kunde inte hittas');
      }
    } catch (geocodeError) {
      console.error('Geocoding error:', geocodeError);
      setError('Kunde inte söka adress. Försök igen.');
    }

    setSearching(false);
  };

  const uploadImages = async (files: File[]) => {
    const supabase = createClient();
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setUploading(true);
    setError('');
    const newUrls: string[] = [];
    const uploadedFiles: File[] = [];

    for (const file of imageFiles) {
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
      const filePath = `private-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      console.log('Uploading file:', filePath);

      const { error: uploadError } = await supabase.storage.from('listing-images').upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (uploadError) {
        console.error('Upload error:', uploadError);
      } else {
        const { data: urlData } = supabase.storage.from('listing-images').getPublicUrl(filePath);
        console.log('Uploaded URL:', urlData.publicUrl);
        newUrls.push(urlData.publicUrl);
        uploadedFiles.push(file);
      }
    }

    if (uploadedFiles.length === 0) {
      setError('Kunde inte ladda upp bilder. Kontrollera filformat och försök igen.');
    } else if (uploadedFiles.length < imageFiles.length) {
      setError('Några bilder kunde inte laddas upp. De som lyckades har sparats.');
    }

    setData((prev) => {
      const next = {
        ...prev,
        images: [...prev.images, ...uploadedFiles],
        imageUrls: [...prev.imageUrls, ...newUrls],
      };
      persistDraft(next);
      return next;
    });
    setUploading(false);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    await uploadImages(Array.from(event.target.files));
    event.target.value = '';
  };

  const openFilePicker = () => {
    if (!uploading) fileInputRef.current?.click();
  };

  const handleImageDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (uploading) return;
    void uploadImages(Array.from(event.dataTransfer.files));
  };

  const removeImage = (index: number) => {
    setData((prev) => {
      const next = {
        ...prev,
        imageUrls: prev.imageUrls.filter((_, i) => i !== index),
        images: prev.images.filter((_, i) => i !== index),
      };
      persistDraft(next);
      return next;
    });
  };

  const toggleAmenity = (amenityId: string) => {
    setData((prev) => {
      const next = {
        ...prev,
        amenities: prev.amenities.includes(amenityId)
          ? prev.amenities.filter((a) => a !== amenityId)
          : [...prev.amenities, amenityId],
      };
      persistDraft(next);
      return next;
    });
  };

  const buildDescription = () => {
    const amenityLabels = data.amenities
      .map((id) => AMENITY_OPTIONS.find((a) => a.id === id)?.label ?? id)
      .join(', ');
    const base = data.description.trim();
    if (!amenityLabels) return base || null;
    if (!base) return `Faciliteter: ${amenityLabels}`;
    return `${base}\n\nFaciliteter: ${amenityLabels}`;
  };

  const handlePublish = useCallback(
    async (publishUser?: User) => {
      setLoading(true);
      setError('');

      try {
        const {
          data: { user: sessionUser },
        } = await supabase.auth.getUser();
        const userToUse = publishUser ?? sessionUser ?? user;

        if (!userToUse?.id) {
          throw new Error('Ingen inloggad användare hittades. Logga in igen och försök på nytt.');
        }

        const normalizedPrice = resolveWizardPrice(data as WizardData & {
          price?: number | string | null;
          pricePerSeason?: number | string | null;
          amount?: number | string | null;
        });
        const normalizedLength =
          data.max_boat_length != null ? Number.parseFloat(String(data.max_boat_length)) : null;
        const normalizedWidth =
          data.max_boat_width != null ? Number.parseFloat(String(data.max_boat_width)) : null;
        const normalizedLat = data.latitude != null ? Number(data.latitude) : null;
        const normalizedLng = data.longitude != null ? Number(data.longitude) : null;
        const normalizedAddress = data.address?.trim() || addressInput.trim();
        const inferredCity =
          data.city?.trim() ||
          normalizedAddress
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean)
            .slice(-2)[0] ||
          'Sverige';
        const listingTitle =
          data.spotName?.trim() || normalizedAddress.split(',')[0]?.trim() || 'Privat båtplats';
        const listingDescription = buildDescription();
        const listingTypeLabel = data.rental_type === 'season' ? 'Säsongsplats' : 'Korttid';

        if (!listingTitle.trim()) {
          throw new Error('Titel saknas.');
        }
        console.log('Price value:', data.price_per_season, 'type:', typeof data.price_per_season);
        if (!normalizedPrice || Number.isNaN(normalizedPrice) || normalizedPrice <= 0) {
          throw new Error('Pris saknas eller är ogiltigt.');
        }
        if (!normalizedLat || !normalizedLng || Number.isNaN(normalizedLat) || Number.isNaN(normalizedLng)) {
          throw new Error('Plats saknas. Sök adress och placera nålen innan publicering.');
        }
        if (!normalizedAddress) {
          throw new Error('Adress saknas. Ange en adress i plats-steget.');
        }
        if (!data.imageUrls.length) {
          throw new Error('Minst en bild måste laddas upp innan publicering.');
        }

        console.log('=== PUBLISHING LISTING ===');
        console.log('User:', userToUse.id, userToUse.email);
        console.log('Wizard data:', JSON.stringify(data, null, 2));
        console.log('Submitting listing with data:', {
          title: listingTitle,
          description: listingDescription,
          price: normalizedPrice,
          city: inferredCity,
          address: normalizedAddress,
          lat: normalizedLat,
          lng: normalizedLng,
          max_boat_length: normalizedLength,
          max_boat_width: normalizedWidth,
          listing_type: listingTypeLabel,
          images: data.imageUrls,
        });

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', userToUse.id)
          .maybeSingle();
        if (profileError) throw profileError;

        const displayName =
          (userToUse.user_metadata?.full_name as string | undefined) ??
          (userToUse.user_metadata?.name as string | undefined) ??
          (authData.name || userToUse.email || 'Privat uthyrare');

        if (!profile) {
          const { error: upsertProfileError } = await supabase.from('profiles').upsert({
            id: userToUse.id,
            role: 'host',
            full_name: displayName,
          });
          if (upsertProfileError) throw upsertProfileError;
        } else if (profile.role !== 'host' && profile.role !== 'owner') {
          const { error: updateProfileError } = await supabase
            .from('profiles')
            .update({ role: 'host' })
            .eq('id', userToUse.id);
          if (updateProfileError) throw updateProfileError;
        }

        const harbourInsertPayload = {
          name: `Privat plats · ${inferredCity}`,
          city: inferredCity,
          address: normalizedAddress,
          lat: normalizedLat,
          lng: normalizedLng,
          owner_id: userToUse.id,
          description: listingDescription,
          is_active: true,
        };

        let harbourId: number | string | null = null;
        const harbourInsertResult = await supabase
          .from('harbours')
          .insert(harbourInsertPayload)
          .select('id')
          .single();
        if (harbourInsertResult.error) {
          console.error('=== SUPABASE ERROR ===');
          console.error('Message:', harbourInsertResult.error.message);
          console.error('Code:', harbourInsertResult.error.code);
          console.error('Details:', harbourInsertResult.error.details);
          console.error('Hint:', harbourInsertResult.error.hint);
          throw harbourInsertResult.error;
        }
        harbourId = harbourInsertResult.data.id;

        const listingPayload = {
          title: listingTitle,
          harbour_id: harbourId,
          harbour_name: `Privat plats · ${inferredCity}`,
          owner_id: userToUse.id,
          price_per_season: normalizedPrice,
          max_boat_length: Number.isFinite(normalizedLength ?? NaN) ? normalizedLength : null,
          max_boat_width: Number.isFinite(normalizedWidth ?? NaN) ? normalizedWidth : null,
          description: listingDescription,
          rental_type: data.rental_type,
          season_start: data.season_start,
          season_end: data.season_end,
          lat: normalizedLat,
          lng: normalizedLng,
          city: inferredCity,
          image_url: data.imageUrls[0] || null,
          is_available: true,
          listing_type: 'private',
        };

        const { data: listingInsertData, error: listingInsertError } = await supabase
          .from('listings')
          .insert(listingPayload)
          .select('id')
          .single();

        if (listingInsertError) {
          console.error('=== SUPABASE ERROR ===');
          console.error('Message:', listingInsertError.message);
          console.error('Code:', listingInsertError.code);
          console.error('Details:', listingInsertError.details);
          console.error('Hint:', listingInsertError.hint);
          throw listingInsertError;
        }

        const listingId = listingInsertData.id;
        const imageRows = data.imageUrls.map((url, index) => ({
          listing_id: listingId,
          image_url: url,
          display_order: index,
        }));
        if (imageRows.length > 0) {
          const { error: imageInsertError } = await supabase.from('listing_images').insert(imageRows);
          if (imageInsertError) {
            console.error('=== SUPABASE ERROR ===');
            console.error('Message:', imageInsertError.message);
            console.error('Code:', imageInsertError.code);
            console.error('Details:', imageInsertError.details);
            console.error('Hint:', imageInsertError.hint);
            throw imageInsertError;
          }
        }

        console.log('=== SUCCESS ===', listingInsertData);

        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(WIZARD_DRAFT_KEY);
          window.localStorage.removeItem(LEGACY_WIZARD_KEY);
          window.localStorage.removeItem(OAUTH_WIZARD_KEY);
          window.localStorage.removeItem(OAUTH_PENDING_KEY);
        }
        router.push('/mitt-konto?published=true');
      } catch (err) {
        console.error('=== CAUGHT ERROR ===', err);
        const message =
          err && typeof err === 'object'
            ? // Supabase errors include message/details/hint
              (err as { message?: string; details?: string; hint?: string }).message ||
              (err as { message?: string; details?: string; hint?: string }).details ||
              (err as { message?: string; details?: string; hint?: string }).hint ||
              'Okänt fel'
            : 'Okänt fel';
        setError(`Fel: ${message}`);
      } finally {
        setLoading(false);
      }
    },
    [addressInput, authData.name, data, router, supabase, user],
  );

  const handleAuth = async () => {
    setAuthSubmitting(true);
    setAuthError('');

    if (authMode === 'signup') {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: authData.email,
        password: authData.password,
        options: {
          data: { full_name: authData.name },
        },
      });

      if (signUpError) {
        setAuthError(signUpError.message);
        setAuthSubmitting(false);
        return;
      }

      if (signUpData.user) {
        await supabase.from('profiles').upsert({
          id: signUpData.user.id,
          role: 'host',
          full_name: authData.name || signUpData.user.email,
        });
        setUser(signUpData.user);
        await handlePublish(signUpData.user);
      }
    } else {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: authData.email,
        password: authData.password,
      });

      if (signInError) {
        setAuthError('Fel e-post eller lösenord');
        setAuthSubmitting(false);
        return;
      }

      if (signInData.user) {
        setUser(signInData.user);
        await handlePublish(signInData.user);
      }
    }

    setAuthSubmitting(false);
  };

  const handleGoogleOAuth = async () => {
    if (typeof window !== 'undefined') {
      const dataToSave = {
        ...data,
        savedAt: Date.now(),
        step,
      };
      console.log('=== WIZARD STATE AT SAVE TIME ===');
      console.log('price:', data.price_per_season);
      console.log('address:', data.address);
        console.log('title:', data.spotName || data.address?.split(',')[0] || 'Privat båtplats');
      console.log('images:', data.imageUrls?.length ?? 0);
      console.log('max_boat_length:', data.max_boat_length);
      if (hasWizardRealData(dataToSave)) {
        window.localStorage.setItem(OAUTH_WIZARD_KEY, JSON.stringify(dataToSave));
        console.log('=== SAVING BEFORE OAUTH ===', dataToSave);
      } else {
        console.warn('Skipping OAuth draft save because wizard data is still empty');
      }
      window.localStorage.setItem(OAUTH_PENDING_KEY, '1');
    }

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/hyr-ut?publish=true` },
    });
    if (oauthError) {
      setAuthError('Google-inloggning misslyckades. Försök igen.');
    }
  };

  useEffect(() => {
    if (!shouldAutoPublishFromGoogle || !user || publishTriggeredRef.current) return;
    if (typeof window !== 'undefined' && window.localStorage.getItem(OAUTH_PENDING_KEY) !== '1') return;

    publishTriggeredRef.current = true;
    setStep(5);
    void handlePublish(user).finally(() => {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(OAUTH_PENDING_KEY);
      }
    });
  }, [handlePublish, shouldAutoPublishFromGoogle, user]);

  useEffect(() => {
    if (!shouldAutoPublishFromQuery || publishTriggeredRef.current) return;
    void supabase.auth.getUser().then(({ data: { user: oauthUser } }) => {
      if (!oauthUser || publishTriggeredRef.current) return;
      console.log('User authenticated after OAuth, auto-publishing...');
      publishTriggeredRef.current = true;
      window.setTimeout(() => {
        void handlePublish(oauthUser);
      }, 500);
    });
  }, [handlePublish, shouldAutoPublishFromQuery, supabase]);

  useEffect(() => {
    if (step !== 2 || data.latitude == null || data.longitude == null || !mapContainerRef.current) return;

    let cancelled = false;
    void loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapContainerRef.current || !window.google?.maps) return;

        const googleMaps = window.google.maps;
        if (!mapRef.current) {
          mapRef.current = new googleMaps.Map(mapContainerRef.current, {
            center: { lat: data.latitude as number, lng: data.longitude as number },
            zoom: 16,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });
        } else {
          mapRef.current.setCenter({ lat: data.latitude as number, lng: data.longitude as number });
        }

        if (markerRef.current) {
          markerRef.current.setMap(null);
        }

        const marker = new googleMaps.Marker({
          position: { lat: data.latitude as number, lng: data.longitude as number },
          map: mapRef.current,
          draggable: true,
          title: 'Dra för att justera position',
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0d9488"><path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>',
            )}`,
            scaledSize: new googleMaps.Size(36, 36),
            anchor: new googleMaps.Point(18, 36),
          },
        });

        marker.addListener('dragend', (event: any) => {
          const newLat = event?.latLng?.lat();
          const newLng = event?.latLng?.lng();
          if (typeof newLat !== 'number' || typeof newLng !== 'number') return;

          updateWizardData({
            latitude: newLat,
            longitude: newLng,
          });

          const geocoder = new googleMaps.Geocoder();
          geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results: any, status: string) => {
            if (status === 'OK' && results?.[0]) {
              const formatted = results[0].formatted_address as string;
              const cityCandidate =
                results[0]?.address_components?.find((c: any) =>
                  Array.isArray(c.types) && c.types.includes('locality'),
                )?.long_name ?? '';
              updateWizardData({ address: formatted, city: cityCandidate });
              setAddressInput(formatted);
            }
          });
        });

        markerRef.current = marker;
      })
      .catch(() => {
        // Keep wizard usable without map JS
      });

    return () => {
      cancelled = true;
    };
  }, [data.latitude, data.longitude, step]);

  const isStepInvalid = () => {
    if (step === 2) {
      return (
        data.latitude == null ||
        data.longitude == null ||
        !Number.isFinite(data.latitude) ||
        !Number.isFinite(data.longitude) ||
        data.latitude === 0 ||
        data.longitude === 0
      );
    }
    if (step === 3) return !data.max_boat_length || !data.max_boat_width;
    if (step === 4) return resolveWizardPrice(data as WizardData & { price?: number | string | null }) <= 0 || data.imageUrls.length === 0;
    return false;
  };

  const goNext = () => {
    setError('');
    persistDraft(data);
    if (step === 2 && isStepInvalid()) {
      setError('Välj en giltig plats på kartan innan du fortsätter.');
      return;
    }
    if (step === 2) {
      console.log('Saved location to wizardData:', {
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
      });
    }
    if (step === 3) {
      console.log('Saved dimensions to wizardData:', {
        max_boat_length: data.max_boat_length,
        max_boat_width: data.max_boat_width,
      });
    }
    if (step === 4 && data.imageUrls.length === 0) {
      setError('Ladda upp minst en bild innan du fortsätter.');
      return;
    }
    if (step === 4) {
      const currentPrice = resolveWizardPrice(data as WizardData & { price?: number | string | null });
      if (currentPrice <= 0) {
        setError('Ange ett giltigt pris innan du fortsätter.');
        return;
      }
      updateWizardData({ price_per_season: currentPrice });
      console.log('Saved price to wizardData:', currentPrice);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          WIZARD_DRAFT_KEY,
          JSON.stringify({ ...data, price_per_season: currentPrice, price: currentPrice, images: [] }),
        );
      }
    }
    setStep(step + 1);
  };

  const startPrivateWizard = () => {
    setError('');
    setStep(2);
  };

  if (step === 1) {
    return <HyrUtLanding onStartPrivate={startPrivateWizard} />;
  }

  const StepHeading = () => (
    <div className={`mb-10 ${step === 1 ? 'text-center' : ''}`}>
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-600">
        STEG {step} AV {totalSteps}
      </p>
      <h2 className="mb-3 text-4xl font-bold" style={{ color: NAVY }}>
        {stepMeta.title}
      </h2>
      <p className="text-lg text-gray-500">{stepMeta.subtext}</p>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#f5f0e8' }}>
      <nav
        style={{ background: NAVY }}
        className="flex items-center justify-between px-6 py-4"
      >
        <Link href="/" className="text-xl font-bold text-white">
          Båtplats.nu
        </Link>
        {step > 1 ? (
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-sm text-gray-400 transition hover:text-white"
          >
            Spara & avsluta
          </button>
        ) : (
          <span className="w-24" aria-hidden />
        )}
      </nav>

      <div className="h-1 w-full bg-gray-200">
        <div
          className="h-1 transition-all duration-500"
          style={{
            width: `${(step / totalSteps) * 100}%`,
            background: TEAL,
          }}
        />
      </div>

      <div className="mx-auto max-w-2xl px-4 py-12">
        {step > 1 && step !== 5 ? <StepHeading /> : null}

        {step === 2 ? (
          <div>
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">Vad heter din plats?</label>
              <input
                type="text"
                value={data.spotName}
                onChange={(e) => updateWizardData({ spotName: e.target.value.slice(0, 60) })}
                placeholder="T.ex. Bryggan vid Strandvägen, Min kajplats i Nacka"
                maxLength={60}
                className={inputClass}
              />
              <p className="mt-2 text-sm text-gray-500">
                Välj ett namn som hjälper båtägare att hitta din plats
              </p>
              <p className="mt-1 text-xs text-gray-400">{data.spotName.length}/60 tecken</p>
            </div>

            <div className="mb-6 flex gap-3">
              <input
                type="text"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void searchAddress();
                }}
                placeholder="T.ex. Djurgårdsbrunnsviken, Stockholm"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => void searchAddress()}
                disabled={searching}
                className="shrink-0 rounded-xl px-6 py-3.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: TEAL }}
              >
                {searching ? 'Söker...' : 'Sök'}
              </button>
            </div>

            {error && step === 2 ? (
              <p className="mb-4 text-sm text-red-600">{error}</p>
            ) : null}

            {data.latitude != null && data.longitude != null && mapsApiKey ? (
              <>
                <div
                  ref={mapContainerRef}
                  className="mb-3 overflow-hidden rounded-xl border-2 border-gray-200 shadow-[0_6px_20px_rgba(10,22,40,0.08)]"
                  style={{ height: '320px' }}
                />
                <p className="mb-4 text-sm text-[#0d9488]">📍 Dra nålen för att justera till rätt brygga</p>
              </>
            ) : null}

            {data.latitude != null ? (
              <div className="flex items-center gap-2 text-sm font-medium text-teal-600">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                Plats hittad: {data.address}
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Max båtlängd (meter)</label>
                <input
                  type="number"
                  value={data.max_boat_length ?? ''}
                  onChange={(e) =>
                    updateWizardData({
                      max_boat_length: e.target.value ? Number.parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="T.ex. 10"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Max båtbredd (meter)</label>
                <input
                  type="number"
                  value={data.max_boat_width ?? ''}
                  onChange={(e) =>
                    updateWizardData({
                      max_boat_width: e.target.value ? Number.parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="T.ex. 4"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">Beskrivning</label>
              <textarea
                value={data.description}
                onChange={(e) => updateWizardData({ description: e.target.value })}
                placeholder="Beskriv din plats: läge, omgivning, vad som ingår..."
                rows={4}
                className={`${inputClass} resize-none`}
              />
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-gray-700">
                Faciliteter (välj alla som finns)
              </label>
              <div className="flex flex-wrap gap-3">
                {AMENITY_OPTIONS.map((amenity) => (
                  <button
                    key={amenity.id}
                    type="button"
                    onClick={() => toggleAmenity(amenity.id)}
                    className={`rounded-full border-2 px-5 py-2.5 text-sm font-medium transition-all ${
                      data.amenities.includes(amenity.id)
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {amenity.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div>
            <div className="mb-8">
              <label className="mb-3 block text-sm font-medium text-gray-700">Bilder på platsen</label>

              <div
                role="button"
                tabIndex={0}
                onClick={openFilePicker}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openFilePicker();
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleImageDrop}
                className={`group mb-4 block w-full rounded-2xl border-2 border-dashed border-teal-300 p-12 text-center transition-all ${
                  uploading ? 'cursor-wait opacity-70' : 'cursor-pointer hover:border-teal-400 hover:bg-teal-50/50'
                }`}
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 transition group-hover:bg-teal-100">
                  <svg
                    className="h-8 w-8 text-teal-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="font-semibold text-teal-700">
                  {uploading ? 'Laddar upp...' : 'Ladda upp bilder på din plats'}
                </p>
                <p className="mt-1 text-sm text-gray-400">PNG, JPG upp till 10MB · Minst 1 bild krävs</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => void handleImageUpload(e)}
                className="hidden"
                disabled={uploading}
                aria-hidden
                tabIndex={-1}
              />

              {error && step === 4 ? (
                <p className="mb-4 text-sm text-red-600">{error}</p>
              ) : null}

              {data.imageUrls.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {data.imageUrls.map((url, index) => (
                    <div key={url} className="group relative aspect-square">
                      <Image src={url} alt={`Bild ${index + 1}`} fill className="rounded-xl object-cover" sizes="200px" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-sm text-white opacity-0 transition group-hover:opacity-100"
                      >
                        ×
                      </button>
                      {index === 0 ? (
                        <span
                          className="absolute bottom-2 left-2 rounded-lg px-2 py-1 text-xs font-medium text-white"
                          style={{ background: TEAL }}
                        >
                          Huvudbild
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">Pris per säsong (SEK)</label>
              <div className="relative">
                <input
                  type="number"
                  value={data.price_per_season ?? ''}
                  onChange={(e) =>
                    updateWizardData({
                      price_per_season: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="T.ex. 8000"
                  className={`${inputClass} pr-16`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">SEK</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">Genomsnittspriset på Båtplats.nu är 7 500 kr per säsong</p>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">Uthyrningstyp</label>
              <RentalTypeChoice
                value={data.rental_type}
                onChange={(rental_type) => updateWizardData({ rental_type })}
              />
            </div>

            <div className="rounded-xl border border-[#dce3ee] bg-white p-4 shadow-[0_8px_24px_rgba(10,22,40,0.06)]">
              <label className="mb-2 block text-sm font-medium text-[#0a1628]">Tillgänglig period</label>
              <DateRangePicker
                variant="inline"
                startDate={data.season_start}
                endDate={data.season_end}
                onStartDateChange={(value) => updateWizardData({ season_start: value })}
                onEndDateChange={(value) => updateWizardData({ season_end: value })}
                showLegend={false}
              />
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div>
            <h2 className="mb-2 text-3xl font-bold" style={{ color: NAVY }}>
              Din annons är redo!
            </h2>
            <p className="mb-8 text-gray-500">
              {user
                ? 'Granska din annons och publicera när du är nöjd'
                : 'Granska din annons och skapa ett konto för att publicera'}
            </p>

            <div className="mb-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {data.imageUrls[0] ? (
                <div className="relative h-56 w-full">
                  <Image src={data.imageUrls[0]} alt="Preview" fill className="object-cover" sizes="640px" />
                  <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-teal-700 backdrop-blur">
                    <Sailboat className="h-3.5 w-3.5" aria-hidden />
                    Privat uthyrning
                  </div>
                  {data.imageUrls.length > 1 ? (
                    <div className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                      <Images className="h-3.5 w-3.5" aria-hidden />
                      {data.imageUrls.length} bilder
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="p-5">
                <h3 className="mb-1 text-lg font-bold" style={{ color: NAVY }}>
                  {data.spotName || data.address?.split(',')[0] || 'Privat båtplats'}
                </h3>
                <p className="mb-3 text-sm text-gray-500">{data.address}</p>

                <div className="mb-3 flex flex-wrap gap-3 border-b border-gray-100 pb-3 text-sm text-gray-600">
                  {data.max_boat_length ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Ruler className="h-4 w-4 text-[#0d9488]" aria-hidden />
                      Max {data.max_boat_length}m längd
                    </span>
                  ) : null}
                  {data.max_boat_width ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Ruler className="h-4 w-4 rotate-90 text-[#0d9488]" aria-hidden />
                      {data.max_boat_width}m bredd
                    </span>
                  ) : null}
                </div>

                {data.description ? (
                  <p className="mb-3 text-sm text-gray-700">{data.description}</p>
                ) : null}

                {data.amenities.length > 0 ? (
                  <div className="mb-3 flex flex-wrap gap-2 border-b border-gray-100 pb-3">
                    {data.amenities.map((amenityId) => (
                      <span key={amenityId} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                        {AMENITY_OPTIONS.find((a) => a.id === amenityId)?.label ?? amenityId}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xl font-bold" style={{ color: NAVY }}>
                      {data.price_per_season?.toLocaleString('sv-SE')} kr
                    </span>
                    <span className="text-sm text-gray-500"> {getPricePeriodLabel(data.rental_type)}</span>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden />
                    Tillgänglig
                  </span>
                </div>
              </div>
            </div>

            {sessionAuthLoading ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-gray-500">
                Kontrollerar inloggning...
              </div>
            ) : !user ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100">
                    <svg
                      className="h-5 w-5 text-teal-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: NAVY }}>
                      Skapa ett gratis konto för att publicera
                    </p>
                    <p className="text-sm text-gray-500">Det tar bara 30 sekunder</p>
                  </div>
                </div>

                <div className="mb-5 flex rounded-xl border border-gray-200 p-1">
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                      authMode === 'signup' ? 'bg-teal-600 text-white' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Skapa konto
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                      authMode === 'login' ? 'bg-teal-600 text-white' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Logga in
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => void handleGoogleOAuth()}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#e2e8f0] bg-white px-4 py-3 text-sm font-semibold text-[#0a1628] transition hover:bg-[#f8fafc]"
                >
                  <GoogleIcon />
                  Fortsätt med Google
                </button>

                <div className="my-4 flex items-center gap-3 text-[#8a96a8]">
                  <div className="h-px flex-1 bg-[#e2e8f0]" />
                  <span className="text-sm">eller</span>
                  <div className="h-px flex-1 bg-[#e2e8f0]" />
                </div>

                <div className="space-y-3">
                  {authMode === 'signup' ? (
                    <input
                      type="text"
                      placeholder="Ditt namn"
                      value={authData.name}
                      onChange={(e) => setAuthData((prev) => ({ ...prev, name: e.target.value }))}
                      className={inputClass}
                    />
                  ) : null}
                  <input
                    type="email"
                    placeholder="E-postadress"
                    value={authData.email}
                    onChange={(e) => setAuthData((prev) => ({ ...prev, email: e.target.value }))}
                    className={inputClass}
                  />
                  <input
                    type="password"
                    placeholder="Lösenord (minst 8 tecken)"
                    value={authData.password}
                    onChange={(e) => setAuthData((prev) => ({ ...prev, password: e.target.value }))}
                    className={inputClass}
                  />
                </div>

                {authError ? <p className="mt-3 text-sm text-red-500">{authError}</p> : null}
                {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}

                <button
                  type="button"
                  onClick={() => void handleAuth()}
                  disabled={
                    authSubmitting ||
                    loading ||
                    !authData.email ||
                    !authData.password ||
                    (authMode === 'signup' && !authData.name)
                  }
                  className="mt-4 w-full rounded-xl py-4 font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                  style={{ background: TEAL }}
                >
                  {authSubmitting || loading
                    ? 'Skapar konto & publicerar...'
                    : authMode === 'signup'
                      ? 'Skapa konto & publicera annons'
                      : 'Logga in & publicera annons'}
                </button>

                <p className="mt-3 text-center text-xs text-gray-400">
                  Genom att skapa ett konto godkänner du våra{' '}
                  <Link href="/anvandarvillkor" className="underline">
                    användarvillkor
                  </Link>
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-teal-200 bg-teal-50 p-6 text-center">
                <p className="mb-4 font-medium text-teal-700">✓ Inloggad som {user.email}</p>
                {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
                <button
                  type="button"
                  onClick={() => void handlePublish(user)}
                  disabled={loading}
                  className="rounded-xl px-10 py-4 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: TEAL }}
                >
                  {loading ? 'Publicerar...' : 'Publicera annons'}
                </button>
              </div>
            )}
          </div>
        ) : null}

        {step > 1 ? (
          <div className="mt-12 flex items-center justify-between border-t border-gray-200 pt-8">
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-2 px-5 py-3 font-medium text-gray-600 transition hover:text-gray-900"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Tillbaka
            </button>

            {step < totalSteps ? (
              <button
                type="button"
                onClick={goNext}
                disabled={isStepInvalid()}
                className="flex items-center gap-2 rounded-xl px-8 py-3.5 font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: TEAL }}
              >
                Nästa steg
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <div />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function HyrUtPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center" style={{ background: '#f5f0e8' }}>
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
        </div>
      }
    >
      <HyrUtContent />
    </Suspense>
  );
}

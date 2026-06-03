import Link from 'next/link';

const NAVY = '#0a1628';

const RENTER_BENEFITS = [
  { icon: '🔍', text: 'Sök bland hundratals båtplatser' },
  { icon: '📅', text: 'Boka direkt — ingen väntelista' },
  { icon: '🔒', text: 'Säker betalning via Stripe' },
  { icon: '⭐', text: 'Läs omdömen från andra båtägare' },
] as const;

type RenterAuthBrandingPanelProps = {
  headline: string;
  subtitle: string;
};

export function RenterAuthBrandingPanel({ headline, subtitle }: RenterAuthBrandingPanelProps) {
  return (
    <div
      className="hidden flex-col justify-between p-12 lg:flex lg:w-5/12"
      style={{ background: NAVY }}
    >
      <Link href="/" className="text-xl font-bold text-white">
        Båtplats.nu
      </Link>

      <div>
        <h1 className="mb-4 text-4xl font-bold leading-tight text-white">{headline}</h1>
        <p className="mb-10 text-lg text-gray-400">{subtitle}</p>

        <div className="space-y-5">
          {RENTER_BENEFITS.map((item, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl">
                {item.icon}
              </div>
              <p className="text-gray-300">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white/5 p-5">
        <p className="mb-3 text-sm italic text-gray-300">
          &ldquo;Hittade en perfekt plats på 5 minuter. Enkelt och smidigt!&rdquo;
        </p>
        <p className="text-sm font-medium text-teal-400">— Nöjd båtägare</p>
      </div>
    </div>
  );
}

'use client';

import type { User } from '@supabase/supabase-js';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

import {
  DASHBOARD_CREAM,
  DASHBOARD_NAVY,
  DASHBOARD_TEAL,
  IconCalendar,
  IconChat,
  IconCheckCircle,
  IconClipboardCheck,
  IconClock,
  IconCurrency,
  IconEdit,
  IconEye,
  IconHome,
  IconInbox,
  IconLink,
  IconPause,
  IconPlay,
  IconPlus,
  IconRuler,
  IconSave,
  IconUser,
  dashboardCardClass,
  StatIconBox,
} from '@/components/dashboard-icons';
import { createClient } from '@/lib/supabase/client';

const inputClass =
  'w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 transition bg-white text-gray-900';

type Listing = {
  id: string;
  title: string;
  city: string;
  price_per_season: number;
  season_start: string;
  season_end: string;
  is_available: boolean;
  image_url: string | null;
  max_boat_length: number | null;
  max_boat_width: number | null;
  description: string | null;
};

type Booking = {
  id: string;
  listing_id: string;
  renter_id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  message?: string | null;
  renter_name: string;
  renter_email: string;
};

type TabId = 'oversikt' | 'bokningar' | 'annons';

function MittKontoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [listing, setListing] = useState<Listing | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('oversikt');
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [nextBooking, setNextBooking] = useState<Booking | null>(null);
  const [showPublishedBanner, setShowPublishedBanner] = useState(false);
  const [editPrice, setEditPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSeasonStart, setEditSeasonStart] = useState('');
  const [editSeasonEnd, setEditSeasonEnd] = useState('');
  const [savingListing, setSavingListing] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (searchParams.get('published') === 'true') {
      setShowPublishedBanner(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push('/login?redirect=/mitt-konto');
        return;
      }

      setUser(session.user);

      const { data: listingsData } = await supabase
        .from('listings')
        .select('*')
        .eq('owner_id', session.user.id)
        .eq('listing_type', 'private')
        .order('created_at', { ascending: false });

      if (!listingsData || listingsData.length === 0) {
        router.push('/hyr-ut');
        return;
      }

      const listingRows = listingsData as Listing[];
      const primaryListing = listingRows[0];
      setListings(listingRows);
      setListing(primaryListing);
      setSelectedListingId(primaryListing.id);
      setEditPrice(String(primaryListing.price_per_season ?? ''));
      setEditDescription(primaryListing.description ?? '');
      setEditSeasonStart(primaryListing.season_start ?? '');
      setEditSeasonEnd(primaryListing.season_end ?? '');

      const allListingIds = listingRows.map((l) => l.id);
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*')
        .in('listing_id', allListingIds)
        .order('created_at', { ascending: false });

      if (bookingsData && bookingsData.length > 0) {
        const renterIds = bookingsData.map((b) => b.renter_id).filter(Boolean);
        const { data: profiles } =
          renterIds.length > 0
            ? await supabase.from('profiles').select('id, full_name').in('id', renterIds)
            : { data: [] as { id: string; full_name: string | null }[] };

        const bookingsWithNames: Booking[] = bookingsData.map((b) => ({
          ...b,
          renter_name: profiles?.find((p) => p.id === b.renter_id)?.full_name || 'Okänd',
          renter_email: '',
        }));

        setBookings(bookingsWithNames);

        const earnings = bookingsWithNames
          .filter((b) => b.status === 'confirmed')
          .reduce((sum, b) => {
            const matchedListing = listingRows.find((l) => l.id === b.listing_id);
            return sum + (matchedListing?.price_per_season || 0);
          }, 0);
        setTotalEarnings(earnings);

        const upcoming = bookingsWithNames
          .filter(
            (b) => b.status === 'confirmed' && b.start_date && new Date(b.start_date) >= new Date(),
          )
          .sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime());

        setNextBooking(upcoming[0] || null);
      }

      setLoading(false);
    };

    void init();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const toggleAvailability = async (listingId: string, currentStatus: boolean) => {
    const { data } = await supabase
      .from('listings')
      .update({ is_available: !currentStatus })
      .eq('id', listingId)
      .select()
      .single();

    if (data) {
      const updated = data as Listing;
      setListings((prev) => prev.map((l) => (l.id === listingId ? updated : l)));
      if (listing?.id === listingId) setListing(updated);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    await supabase.from('bookings').update({ status }).eq('id', bookingId);

    setBookings((prev) => {
      const next = prev.map((b) => (b.id === bookingId ? { ...b, status } : b));
      setTotalEarnings(
        next
          .filter((b) => b.status === 'confirmed')
          .reduce((sum, b) => {
            const matchedListing = listings.find((l) => l.id === b.listing_id);
            return sum + (matchedListing?.price_per_season || 0);
          }, 0),
      );
      return next;
    });
  };

  const copyListingLink = async (listingId: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/listings/${listingId}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const loadListingIntoEditor = (target: Listing) => {
    setSelectedListingId(target.id);
    setListing(target);
    setEditPrice(String(target.price_per_season ?? ''));
    setEditDescription(target.description ?? '');
    setEditSeasonStart(target.season_start ?? '');
    setEditSeasonEnd(target.season_end ?? '');
  };

  const saveListingEdits = async () => {
    const targetId = selectedListingId ?? listing?.id;
    const targetListing = listings.find((l) => l.id === targetId) ?? listing;
    if (!targetId || !targetListing) return;
    setSavingListing(true);

    const { data, error } = await supabase
      .from('listings')
      .update({
        price_per_season: Number(editPrice) || targetListing.price_per_season,
        description: editDescription,
        season_start: editSeasonStart,
        season_end: editSeasonEnd,
      })
      .eq('id', targetId)
      .select()
      .single();

    if (!error && data) {
      const updated = data as Listing;
      setListings((prev) => prev.map((l) => (l.id === targetId ? updated : l)));
      if (listing?.id === targetId) setListing(updated);
    }

    setSavingListing(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: DASHBOARD_CREAM }}>
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          <p className="text-gray-500">Laddar din sida...</p>
        </div>
      </div>
    );
  }

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const availableCount = listings.filter((l) => l.is_available).length;

  return (
    <div className="min-h-screen" style={{ background: DASHBOARD_CREAM }}>
      <nav className="sticky top-0 z-10 border-b border-gray-100 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="text-xl font-bold" style={{ color: DASHBOARD_NAVY }}>
            Båtplats.nu
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-gray-500 sm:block">{user?.email}</span>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm transition hover:bg-gray-50"
            >
              Logga ut
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {showPublishedBanner ? (
          <div className="mb-6 rounded-2xl border border-teal-200 bg-teal-50 px-5 py-4">
            <p className="font-semibold text-teal-800">Din annons är publicerad!</p>
            <p className="mt-1 text-sm text-teal-700">
              Dela länken under översikten för att nå fler båtägare.
            </p>
            <button
              type="button"
              onClick={() => setShowPublishedBanner(false)}
              className="mt-2 text-sm font-medium text-teal-600 hover:underline"
            >
              Stäng
            </button>
          </div>
        ) : null}

        <div className="mb-8">
          <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-teal-600">
            {listings.length > 1 ? 'PRIVAT VÄRD · MINA BÅTPLATSER' : 'PRIVAT VÄRD · MIN BÅTPLATS'}
          </p>
          <h1 className="text-3xl font-bold" style={{ color: DASHBOARD_NAVY }}>
            {listings.length > 1
              ? `${listings.length} privata platser`
              : listing?.title || 'Din båtplats'}
          </h1>
          <p className="mt-1 text-gray-500">
            {listings.length > 1
              ? `${availableCount} tillgängliga · ${listings.map((l) => l.city).filter(Boolean).join(', ')}`
              : listing?.city}
          </p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              label: 'Intjänat',
              value: `${totalEarnings.toLocaleString('sv-SE')} kr`,
              icon: <IconCurrency />,
            },
            {
              label: 'Bokningar',
              value: bookings.filter((b) => b.status === 'confirmed').length,
              icon: <IconClipboardCheck />,
            },
            {
              label: 'Väntar svar',
              value: pendingCount,
              icon: <IconClock />,
            },
            {
              label: 'Status',
              value:
                listings.length > 1
                  ? `${availableCount}/${listings.length} aktiva`
                  : listing?.is_available
                    ? 'Tillgänglig'
                    : 'Pausad',
              icon: (
                <IconCheckCircle
                  className={availableCount > 0 ? 'h-5 w-5 text-green-500' : 'h-5 w-5 text-red-500'}
                />
              ),
            },
          ].map((stat) => (
            <div key={stat.label} className={`${dashboardCardClass} p-5`}>
              <StatIconBox>{stat.icon}</StatIconBox>
              <p className="mb-1 text-2xl font-bold" style={{ color: DASHBOARD_NAVY }}>
                {stat.value}
              </p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {nextBooking ? (
          <div
            className="mb-8 rounded-2xl p-6 text-white"
            style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d3b5e 100%)' }}
          >
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-teal-400">
              NÄSTA BOKNING
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-2xl font-bold">{nextBooking.renter_name}</p>
                <p className="text-gray-300">
                  {nextBooking.start_date &&
                    new Date(nextBooking.start_date).toLocaleDateString('sv-SE', {
                      day: 'numeric',
                      month: 'long',
                    })}
                  {nextBooking.end_date &&
                    ` → ${new Date(nextBooking.end_date).toLocaleDateString('sv-SE', {
                      day: 'numeric',
                      month: 'long',
                    })}`}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                <IconUser />
              </div>
            </div>
          </div>
        ) : null}

        <div className="mb-6 flex gap-1 rounded-xl bg-gray-200/60 p-1">
          {[
            { id: 'oversikt' as const, label: 'Översikt', icon: <IconHome /> },
            {
              id: 'bokningar' as const,
              label: `Bokningar${bookings.length > 0 ? ` (${bookings.length})` : ''}`,
              icon: <IconCalendar />,
            },
            { id: 'annons' as const, label: 'Annons', icon: <IconEdit /> },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'oversikt' ? (
          <div className="space-y-4">
            <Link
              href="/hyr-ut"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-teal-300 py-4 font-medium text-teal-600 transition hover:bg-teal-50"
            >
              <IconPlus className="text-teal-600" />
              Lägg till en till plats
            </Link>

            {listings.map((item) => (
              <div key={item.id} className={`${dashboardCardClass} overflow-hidden`}>
                {item.image_url ? (
                  <div className="relative h-48 w-full">
                    <Image
                      src={item.image_url}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 896px) 100vw, 896px"
                    />
                  </div>
                ) : null}
                <div className="p-5">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: DASHBOARD_NAVY }}>
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-500">{item.city}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        item.is_available
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {item.is_available ? '● Tillgänglig' : '● Pausad'}
                    </span>
                  </div>

                  <div className="mb-4 flex flex-wrap gap-4 text-sm text-gray-600">
                    {item.max_boat_length ? (
                      <span className="inline-flex items-center gap-1">
                        <IconRuler />
                        Max {item.max_boat_length}m
                      </span>
                    ) : null}
                    {item.max_boat_width ? <span>{item.max_boat_width}m bredd</span> : null}
                    <span className="inline-flex items-center gap-1">
                      <IconCurrency className="h-4 w-4" />
                      {item.price_per_season?.toLocaleString('sv-SE')} kr/säsong
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4">
                    <button
                      type="button"
                      onClick={() => void toggleAvailability(item.id, item.is_available)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-medium transition ${
                        item.is_available
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'border-green-200 text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {item.is_available ? <IconPause /> : <IconPlay />}
                      {item.is_available ? 'Pausa' : 'Aktivera'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        loadListingIntoEditor(item);
                        setActiveTab('annons');
                      }}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                    >
                      <IconEdit />
                      Redigera
                    </button>
                    <Link
                      href={`/listings/${item.id}`}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-teal-200 py-2.5 text-sm font-medium text-teal-600 transition hover:bg-teal-50"
                      target="_blank"
                    >
                      <IconEye />
                      Se annons
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {pendingCount > 0 ? (
              <div className="rounded-2xl border-2 border-yellow-200 bg-yellow-50 p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-100">
                    <IconClock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-yellow-800">
                      {pendingCount} bokningsförfrågan väntar på svar
                    </p>
                    <p className="text-sm text-yellow-600">
                      Svara inom 24 timmar för bäst konvertering
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('bokningar')}
                  className="w-full rounded-xl bg-yellow-500 py-2.5 text-sm font-medium text-white transition hover:bg-yellow-600"
                >
                  Hantera förfrågningar →
                </button>
              </div>
            ) : null}

            {bookings.length === 0 ? (
              <div className={`${dashboardCardClass} p-8 text-center`}>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                  <IconCalendar className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="mb-2 text-lg font-bold" style={{ color: DASHBOARD_NAVY }}>
                  Inga bokningar än
                </h3>
                <p className="mb-4 text-sm text-gray-500">
                  Dina annonser är live! Dela länkarna för att få fler bokningar.
                </p>
                {listings.length === 1 && listings[0] ? (
                  <button
                    type="button"
                    onClick={() => void copyListingLink(listings[0].id)}
                    className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                    style={{ background: DASHBOARD_TEAL }}
                  >
                    <IconLink className="text-white" />
                    {linkCopied ? 'Länk kopierad!' : 'Kopiera annonsens länk'}
                  </button>
                ) : (
                  <p className="text-sm text-gray-500">Öppna varje annons och dela länken därifrån.</p>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'bokningar' ? (
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className={`${dashboardCardClass} p-8 text-center`}>
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                  <IconInbox />
                </div>
                <p className="text-gray-500">Inga bokningar ännu</p>
              </div>
            ) : (
              bookings.map((booking) => (
                <div key={booking.id} className={`${dashboardCardClass} p-5`}>
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-700">
                        {booking.renter_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-semibold" style={{ color: DASHBOARD_NAVY }}>
                          {booking.renter_name}
                        </p>
                        {listings.length > 1 ? (
                          <p className="text-xs text-teal-600">
                            {listings.find((l) => l.id === booking.listing_id)?.title ?? 'Annons'}
                          </p>
                        ) : null}
                        <p className="text-sm text-gray-500">
                          {booking.start_date
                            ? `${new Date(booking.start_date).toLocaleDateString('sv-SE')} → ${new Date(
                                booking.end_date || '',
                              ).toLocaleDateString('sv-SE')}`
                            : 'Datum ej angivet'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        booking.status === 'confirmed'
                          ? 'bg-green-100 text-green-700'
                          : booking.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {booking.status === 'confirmed'
                        ? 'Bekräftad'
                        : booking.status === 'pending'
                          ? 'Väntar'
                          : 'Nekad'}
                    </span>
                  </div>

                  {booking.message ? (
                    <div className="mb-3 flex gap-2 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                      <IconChat className="mt-0.5 shrink-0" />
                      <span>&quot;{booking.message}&quot;</span>
                    </div>
                  ) : null}

                  {booking.status === 'pending' ? (
                    <div className="mt-3 flex gap-3">
                      <button
                        type="button"
                        onClick={() => void updateBookingStatus(booking.id, 'confirmed')}
                        className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                        style={{ background: DASHBOARD_TEAL }}
                      >
                        Acceptera
                      </button>
                      <button
                        type="button"
                        onClick={() => void updateBookingStatus(booking.id, 'declined')}
                        className="flex-1 rounded-xl border-2 border-red-200 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                      >
                        Neka
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        ) : null}

        {activeTab === 'annons' ? (
          <div className={`${dashboardCardClass} p-6`}>
            <h3 className="mb-6 text-lg font-bold" style={{ color: DASHBOARD_NAVY }}>
              Redigera din annons
            </h3>

            {listings.length > 1 ? (
              <div className="mb-5">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Välj plats</label>
                <select
                  value={selectedListingId ?? ''}
                  onChange={(e) => {
                    const target = listings.find((l) => l.id === e.target.value);
                    if (target) loadListingIntoEditor(target);
                  }}
                  className={inputClass}
                >
                  {listings.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} · {item.city}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Pris per säsong (SEK)
                </label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Beskrivning</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className={`${inputClass} resize-none`}
                  placeholder="Beskriv din plats..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Tillgänglig från
                  </label>
                  <input
                    type="date"
                    value={editSeasonStart}
                    onChange={(e) => setEditSeasonStart(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Tillgänglig till
                  </label>
                  <input
                    type="date"
                    value={editSeasonEnd}
                    onChange={(e) => setEditSeasonEnd(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex gap-3 border-t border-gray-100 pt-4">
                <Link
                  href={`/listings/${selectedListingId ?? listing?.id}`}
                  target="_blank"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-gray-200 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                >
                  <IconEye />
                  Förhandsgranska
                </Link>
                <button
                  type="button"
                  disabled={savingListing}
                  onClick={() => void saveListingEdits()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: DASHBOARD_TEAL }}
                >
                  <IconSave className="text-white" />
                  {savingListing ? 'Sparar...' : 'Spara ändringar'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function MittKontoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center" style={{ background: DASHBOARD_CREAM }}>
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
        </div>
      }
    >
      <MittKontoContent />
    </Suspense>
  );
}

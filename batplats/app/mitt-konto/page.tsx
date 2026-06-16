'use client';

import type { User } from '@supabase/supabase-js';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';

import AuthNavbar from '@/components/auth-navbar';
import {
  IconCalendar,
  IconChat,
  IconClock,
  IconEdit,
  IconEye,
  IconInbox,
  IconLink,
  IconPause,
  IconPlay,
  IconPlus,
  IconUser,
} from '@/components/dashboard-icons';
import { loadGoogleMaps } from '@/lib/google-maps-loader';
import { createClient } from '@/lib/supabase/client';

const inputClass =
  'w-full rounded-lg border border-[#e8e8e8] bg-white px-4 py-3 text-[15px] text-[#222222] transition focus:border-[#222222] focus:outline-none';
const DASHBOARD_BG = '#f7f7f7';
const CARD_CLASS = 'rounded-2xl border border-[#e8e8e8] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]';
const STAT_CARD_CLASS = 'rounded-xl border border-[#e8e8e8] bg-white p-5';
const ACTION_BTN_CLASS =
  'inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition';

type Listing = {
  id: string;
  title: string;
  city: string;
  price_per_season: number;
  rental_type?: string | null;
  season_start: string;
  season_end: string;
  is_available: boolean;
  image_url: string | null;
  max_boat_length: number | null;
  max_boat_width: number | null;
  description: string | null;
  lat?: number | null;
  lng?: number | null;
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
type RenterSummary = { activeCount: number };

function getPriceUnitLabel(listing: Listing): string {
  const rentalType = String(listing.rental_type ?? '').toLowerCase();
  if (rentalType === 'short_term') return 'kr/natt';
  if (rentalType === 'flexible') return 'kr/period';
  if (rentalType === 'seasonal' || rentalType === 'season') return 'kr/säsong';
  return 'kr/säsong';
}

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
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSeasonStart, setEditSeasonStart] = useState('');
  const [editSeasonEnd, setEditSeasonEnd] = useState('');
  const [editLat, setEditLat] = useState<number | null>(null);
  const [editLng, setEditLng] = useState<number | null>(null);
  const [savingListing, setSavingListing] = useState(false);
  const [deletingListingId, setDeletingListingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [renterSummary, setRenterSummary] = useState<RenterSummary>({ activeCount: 0 });
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const mapMarkerRef = useRef<any>(null);

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

      const listingRows = (listingsData ?? []) as Listing[];
      setListings(listingRows);
      const primaryListing = listingRows[0] ?? null;
      setListing(primaryListing);
      setSelectedListingId(primaryListing?.id ?? null);
      setEditPrice(String(primaryListing?.price_per_season ?? ''));
      setEditTitle(primaryListing?.title ?? '');
      setEditDescription(primaryListing?.description ?? '');
      setEditSeasonStart(primaryListing?.season_start ?? '');
      setEditSeasonEnd(primaryListing?.season_end ?? '');
      setEditLat(primaryListing?.lat ?? null);
      setEditLng(primaryListing?.lng ?? null);

      if (listingRows.length > 0) {
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
      }

      const { data: renterBookings } = await supabase
        .from('bookings')
        .select('id, status, end_date')
        .eq('renter_id', session.user.id);

      const activeRenterBookings = ((renterBookings ?? []) as Array<{ status: string; end_date: string | null }>)
        .filter((booking) => booking.status === 'pending' || booking.status === 'confirmed')
        .filter((booking) => {
          if (!booking.end_date) return true;
          return new Date(booking.end_date) >= new Date();
        });
      setRenterSummary({ activeCount: activeRenterBookings.length });

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
    setEditTitle(target.title ?? '');
    setEditDescription(target.description ?? '');
    setEditSeasonStart(target.season_start ?? '');
    setEditSeasonEnd(target.season_end ?? '');
    setEditLat(target.lat ?? null);
    setEditLng(target.lng ?? null);
  };

  const extractListingImagePath = (imageUrl: string): string | null => {
    const marker = '/listing-images/';
    const idx = imageUrl.indexOf(marker);
    if (idx === -1) return null;
    const path = imageUrl.slice(idx + marker.length);
    return path ? decodeURIComponent(path) : null;
  };

  const handleDelete = async (listingId: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna annons?')) return;
    setDeletingListingId(listingId);
    setSuccessMessage('');
    try {
      const { data: imageRows, error: imageRowsError } = await supabase
        .from('listing_images')
        .select('id, image_url')
        .eq('listing_id', listingId);
      if (imageRowsError) throw imageRowsError;

      const paths = ((imageRows ?? []) as Array<{ image_url: string | null }>)
        .map((row) => (row.image_url ? extractListingImagePath(row.image_url) : null))
        .filter((path): path is string => Boolean(path));

      if (paths.length > 0) {
        await supabase.storage.from('listing-images').remove(paths);
      }

      await supabase.from('listing_images').delete().eq('listing_id', listingId);

      const { error: deleteError } = await supabase.from('listings').delete().eq('id', listingId);
      if (deleteError) throw deleteError;

      setListings((prev) => prev.filter((item) => item.id !== listingId));
      if (listing?.id === listingId) {
        const next = listings.find((item) => item.id !== listingId) ?? null;
        setListing(next);
        if (next) {
          loadListingIntoEditor(next);
        }
      }

      setSuccessMessage('Annonsen har tagits bort');
    } catch (deleteError) {
      console.error('Delete listing error:', deleteError);
      alert('Kunde inte ta bort annonsen. Försök igen.');
    } finally {
      setDeletingListingId(null);
    }
  };

  const saveListingEdits = async () => {
    const targetId = selectedListingId ?? listing?.id;
    const targetListing = listings.find((l) => l.id === targetId) ?? listing;
    if (!targetId || !targetListing) return;
    setSavingListing(true);

    const { data, error } = await supabase
      .from('listings')
      .update({
        title: editTitle || targetListing.title,
        price_per_season: Number(editPrice) || targetListing.price_per_season,
        description: editDescription,
        season_start: editSeasonStart,
        season_end: editSeasonEnd,
        lat: editLat,
        lng: editLng,
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

  useEffect(() => {
    if (activeTab !== 'annons' || editLat == null || editLng == null || !mapContainerRef.current) return;
    let cancelled = false;

    void loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapContainerRef.current || !window.google?.maps) return;
        const googleMaps = window.google.maps;
        const center = { lat: editLat, lng: editLng };

        if (!mapRef.current) {
          mapRef.current = new googleMaps.Map(mapContainerRef.current, {
            center,
            zoom: 16,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });
        } else {
          mapRef.current.setCenter(center);
        }

        if (mapMarkerRef.current) {
          mapMarkerRef.current.setMap(null);
        }

        const marker = new googleMaps.Marker({
          position: center,
          map: mapRef.current,
          draggable: true,
          title: 'Dra för att justera position',
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0d9488"><path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>',
            )}`,
            scaledSize: new googleMaps.Size(34, 34),
            anchor: new googleMaps.Point(17, 34),
          },
        });

        marker.addListener('dragend', (event: any) => {
          const lat = event?.latLng?.lat?.();
          const lng = event?.latLng?.lng?.();
          if (typeof lat === 'number' && typeof lng === 'number') {
            setEditLat(lat);
            setEditLng(lng);
          }
        });

        mapMarkerRef.current = marker;
      })
      .catch((mapError) => {
        console.error('Map load error:', mapError);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, editLat, editLng]);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: DASHBOARD_BG }}>
        <AuthNavbar currentPage="dashboard" />
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
            <p className="text-[#717171]">Laddar din sida...</p>
          </div>
        </div>
      </div>
    );
  }

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const availableCount = listings.filter((l) => l.is_available).length;

  return (
    <div className="min-h-screen" style={{ background: DASHBOARD_BG }}>
      <AuthNavbar currentPage="dashboard" />

      <header className="border-b border-[#e8e8e8] bg-white">
        <div className="mx-auto max-w-[900px] px-6 pb-6 pt-10">
          <h1 className="text-[26px] font-bold text-[#222222]">Mina annonser</h1>
          <p className="mt-1 text-[15px] text-[#717171]">
            {availableCount} aktiva annonser
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[900px] px-6 py-6">
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
        {successMessage ? (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-green-700">
            {successMessage}
          </div>
        ) : null}

        <div className="my-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              label: 'Intjänat',
              value: `${totalEarnings.toLocaleString('sv-SE')} kr`,
            },
            {
              label: 'Bokningar',
              value: bookings.filter((b) => b.status === 'confirmed').length,
            },
            {
              label: 'Väntar svar',
              value: pendingCount,
            },
            {
              label: 'Status',
              value:
                listings.length > 1
                  ? `${availableCount}/${listings.length} aktiva`
                  : listing?.is_available
                    ? 'Tillgänglig'
                    : 'Pausad',
            },
          ].map((stat) => (
            <div key={stat.label} className={STAT_CARD_CLASS}>
              <p className="text-[22px] font-bold text-[#222222]">{stat.value}</p>
              <p className="mt-1 text-[13px] text-[#717171]">{stat.label}</p>
            </div>
          ))}
        </div>

        {nextBooking ? (
          <div className={`mb-8 p-6 ${CARD_CLASS}`}>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#717171]">
              NÄSTA BOKNING
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-2xl font-bold text-[#222222]">{nextBooking.renter_name}</p>
                <p className="text-[#717171]">
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
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f7f7f7] text-[#0d9488]">
                <IconUser />
              </div>
            </div>
          </div>
        ) : null}

        <div className="mb-7 flex gap-6 border-b border-[#e8e8e8]">
          {[
            { id: 'oversikt' as const, label: 'Översikt' },
            {
              id: 'bokningar' as const,
              label: `Bokningar${bookings.length > 0 ? ` (${bookings.length})` : ''}`,
            },
            { id: 'annons' as const, label: 'Annons' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`cursor-pointer border-b-2 py-3 text-[15px] transition-all ${
                activeTab === tab.id
                  ? 'border-[#222222] font-semibold text-[#222222]'
                  : 'border-transparent font-medium text-[#717171] hover:text-[#222222]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'oversikt' ? (
          <div className="space-y-4">
            <Link
              href="/hyr-ut"
              className="mb-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#0d9488] bg-white p-5 text-center text-[15px] font-semibold text-[#0d9488] transition hover:bg-teal-50"
            >
              <IconPlus className="h-5 w-5 text-[#0d9488]" />
              Lägg till en till plats
            </Link>

            {listings.map((item) => {
              const details: string[] = [];
              if (item.max_boat_length) details.push(`Max ${item.max_boat_length}m`);
              if (item.max_boat_width) details.push(`${item.max_boat_width}m bredd`);
              details.push(
                `${item.price_per_season?.toLocaleString('sv-SE')} ${getPriceUnitLabel(item)}`,
              );

              return (
                <div key={item.id} className={`${CARD_CLASS} overflow-hidden`}>
                  {item.image_url ? (
                    <div className="relative h-[220px] w-full">
                      <Image
                        src={item.image_url}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="900px"
                      />
                    </div>
                  ) : null}
                  <div className="px-6 py-5">
                    <div className="mb-1 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-[#222222]">{item.title}</h3>
                        <p className="text-sm text-[#717171]">{item.city}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                          item.is_available
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {item.is_available ? 'Tillgänglig' : 'Pausad'}
                      </span>
                    </div>

                    <p className="mb-4 text-sm text-[#717171]">{details.join(' · ')}</p>

                    <div className="flex flex-wrap gap-2 border-t border-[#e8e8e8] pt-4">
                      <button
                        type="button"
                        onClick={() => void toggleAvailability(item.id, item.is_available)}
                        className={`${ACTION_BTN_CLASS} ${
                          item.is_available
                            ? 'border-red-300 text-red-600 hover:bg-red-50'
                            : 'border-green-300 text-green-600 hover:bg-green-50'
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
                        className={`${ACTION_BTN_CLASS} border-[#e8e8e8] text-[#717171] hover:bg-gray-50`}
                      >
                        <IconEdit />
                        Redigera
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(item.id)}
                        disabled={deletingListingId === item.id}
                        className={`${ACTION_BTN_CLASS} border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50`}
                      >
                        Ta bort
                      </button>
                      <Link
                        href={`/listings/${item.id}`}
                        className={`${ACTION_BTN_CLASS} border-[#0d9488] text-[#0d9488] hover:bg-teal-50`}
                        target="_blank"
                      >
                        <IconEye />
                        Se annons
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

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
              <div className="mt-4 rounded-2xl border border-[#e8e8e8] bg-[#f7f7f7] px-6 py-10 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                  <IconCalendar className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-[#222222]">
                  Inga bokningar än
                </h3>
                <p className="mb-4 text-sm text-gray-500">
                  Din annons är live! Dela länken för att nå fler båtägare.
                </p>
                {listings.length === 1 && listings[0] ? (
                  <div className="mx-auto max-w-sm">
                    <button
                      type="button"
                      onClick={() => void copyListingLink(listings[0].id)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#dce3ee] bg-white px-4 py-2.5 text-sm font-medium text-[#222222] transition hover:bg-gray-50"
                    >
                      <IconLink className="h-4 w-4 text-[#0d9488]" />
                      {linkCopied ? '✓ Länk kopierad!' : '🔗 Kopiera annonsens länk'}
                    </button>
                    <div className="mt-3 flex items-center justify-center gap-4 text-sm">
                      <a
                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                          `${typeof window !== 'undefined' ? window.location.origin : ''}/listings/${listings[0].id}`,
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-[#1877F2] hover:underline"
                      >
                        Dela på Facebook
                      </a>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(
                          `Kolla min båtplats: ${
                            typeof window !== 'undefined' ? window.location.origin : ''
                          }/listings/${listings[0].id}`,
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-[#16a34a] hover:underline"
                      >
                        Dela på WhatsApp
                      </a>
                    </div>
                  </div>
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
              <div className={`${CARD_CLASS} p-8 text-center`}>
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                  <IconInbox />
                </div>
                <p className="text-gray-500">Inga bokningar ännu</p>
              </div>
            ) : (
              bookings.map((booking) => (
                <div key={booking.id} className={`${CARD_CLASS} p-5`}>
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-700">
                        {booking.renter_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-[#222222]">
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
                        style={{ background: '#0d9488' }}
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
          <div className={`${CARD_CLASS} p-6`}>
            <h3 className="mb-6 text-lg font-bold text-[#222222]">
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
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Namn på platsen</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={inputClass}
                  maxLength={60}
                />
              </div>

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

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Justera position på kartan</label>
                <p className="mb-2 text-sm text-[#0d9488]">📍 Dra nålen för att markera rätt brygga</p>
                {editLat != null && editLng != null ? (
                  <div
                    ref={mapContainerRef}
                    className="overflow-hidden rounded-xl border border-[#dce3ee]"
                    style={{ height: '300px' }}
                  />
                ) : (
                  <p className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                    Ingen position sparad för denna annons ännu.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                <Link
                  href={`/listings/${selectedListingId ?? listing?.id}`}
                  target="_blank"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-[#d1d5db] bg-white px-4 py-3 text-sm font-medium text-[#374151] transition hover:bg-gray-50"
                >
                  👁 Förhandsgranska
                </Link>
                <button
                  type="button"
                  disabled={savingListing}
                  onClick={() => void saveListingEdits()}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-[#0d9488] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#0f766e] disabled:opacity-50"
                >
                  {savingListing ? 'Sparar...' : '💾 Spara ändringar'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <section className="mt-4 flex flex-col gap-4 rounded-2xl border border-[#e8e8e8] bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
          {renterSummary.activeCount > 0 ? (
            <>
              <div>
                <h3 className="text-base font-semibold text-[#222222]">🔍 Dina bokningar som hyresgäst</h3>
                <p className="mt-1 text-sm text-[#717171]">
                  Du har {renterSummary.activeCount} aktiva bokningar
                </p>
              </div>
              <Link
                href="/dashboard/renter"
                className="shrink-0 rounded-lg bg-[#0d9488] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f766e]"
              >
                Se mina bokningar →
              </Link>
            </>
          ) : (
            <>
              <div>
                <h3 className="text-base font-semibold text-[#222222]">🔍 Letar du efter en båtplats?</h3>
                <p className="mt-1 text-sm text-[#717171]">
                  Hitta och boka bland hundratals platser i Sverige
                </p>
              </div>
              <Link
                href="/kajplatser"
                className="shrink-0 rounded-lg bg-[#0d9488] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f766e]"
              >
                Sök båtplatser →
              </Link>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default function MittKontoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen" style={{ background: DASHBOARD_BG }}>
          <AuthNavbar currentPage="dashboard" />
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          </div>
        </div>
      }
    >
      <MittKontoContent />
    </Suspense>
  );
}

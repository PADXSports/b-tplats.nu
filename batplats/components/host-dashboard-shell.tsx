'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  DASHBOARD_CREAM,
  DASHBOARD_NAVY,
  dashboardCardClass,
} from '@/components/dashboard-icons';
import Logo from '@/components/Logo';
import { createClient } from '@/lib/supabase/client';

export const HOST_INPUT_CLASS =
  'w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 transition bg-white text-gray-900 placeholder-gray-400';

export const hostCardClass = dashboardCardClass;

export const HOST_LABEL_CLASS = 'mb-2 block text-sm font-semibold text-gray-700';

export const HOST_PRIMARY_BTN =
  'rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50';

export const HOST_SECONDARY_BTN =
  'rounded-xl border-2 border-gray-200 px-6 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50';

export const HOST_DANGER_BTN =
  'rounded-xl border-2 border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50';

export const HOST_LOADING_FALLBACK = (
  <main
    className="flex min-h-screen items-center justify-center"
    style={{ background: DASHBOARD_CREAM }}
  >
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
  </main>
);

export type HostNavKey = 'overview' | 'hamnar' | 'listings' | 'bookings' | 'profil';

const NAV_ITEMS: { key: HostNavKey; label: string; href: string }[] = [
  { key: 'overview', label: 'Översikt', href: '/dashboard/host' },
  { key: 'hamnar', label: 'Mina Hamnar', href: '/dashboard/host/hamnar' },
  { key: 'listings', label: 'Annonser', href: '/dashboard/host/listings' },
  { key: 'bookings', label: 'Bokningar', href: '/dashboard/host/bokningar' },
];

type HostDashboardShellProps = {
  children: React.ReactNode;
  activeNav: HostNavKey;
  pageTitle: string;
  eyebrow?: string;
  headerAction?: React.ReactNode;
};

export function HostDashboardShell({
  children,
  activeNav,
  pageTitle,
  eyebrow = 'HAMNÄGARE DASHBOARD',
  headerAction,
}: HostDashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? null);
    };
    void loadUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const isNavActive = (item: (typeof NAV_ITEMS)[number]) => {
    if (activeNav === item.key) return true;
    if (item.key === 'listings' && pathname?.startsWith('/dashboard/host/listings')) return true;
    if (item.key === 'hamnar' && pathname?.startsWith('/dashboard/host/hamnar')) return true;
    if (item.key === 'bookings' && pathname?.startsWith('/dashboard/host/bokningar')) return true;
    if (item.key === 'overview' && pathname === '/dashboard/host') return true;
    return false;
  };

  return (
    <div className="min-h-screen" style={{ background: DASHBOARD_CREAM }}>
      <nav className="sticky top-0 z-10 border-b border-gray-100 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="transition hover:opacity-90">
              <Logo />
            </Link>
            <div className="hidden gap-1 md:flex">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    isNavActive(item)
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:block">{userEmail}</span>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm transition hover:bg-gray-50"
              style={{ color: DASHBOARD_NAVY }}
            >
              Logga ut
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-teal-600">{eyebrow}</p>
            <h1 className="text-3xl font-bold" style={{ color: DASHBOARD_NAVY }}>
              {pageTitle}
            </h1>
          </div>
          {headerAction}
        </div>
        {children}
      </div>
    </div>
  );
}

export function HostToast({
  toast,
}: {
  toast: { type: 'success' | 'error'; message: string } | null;
}) {
  if (!toast) return null;
  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
        toast.type === 'success'
          ? 'border-green-200 bg-green-50 text-green-800'
          : 'border-red-200 bg-red-50 text-red-800'
      }`}
    >
      {toast.message}
    </div>
  );
}

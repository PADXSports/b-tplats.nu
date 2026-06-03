'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ListingPublishedBannerContent() {
  const searchParams = useSearchParams();
  const published = searchParams.get('published');

  if (!published) return null;

  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#99f6e4] bg-[#f0fdfa] px-6 py-4">
      <span className="text-2xl" aria-hidden>
        🎉
      </span>
      <div>
        <p className="font-semibold text-[#115e59]">Din annons är publicerad!</p>
        <p className="text-sm text-[#0d9488]">Båtägare kan nu hitta och boka din plats.</p>
      </div>
    </div>
  );
}

export default function ListingPublishedBanner() {
  return (
    <Suspense fallback={null}>
      <ListingPublishedBannerContent />
    </Suspense>
  );
}

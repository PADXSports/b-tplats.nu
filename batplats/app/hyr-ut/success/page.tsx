'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function HyrUtSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().finally(() => {
      router.replace('/hyr-ut?google=1');
    });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f0e8]">
      <p className="text-sm text-[#4a5568]">Slutför inloggning...</p>
    </div>
  );
}

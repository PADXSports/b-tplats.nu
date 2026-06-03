'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/client';

type AuthContextType = {
  user: User | null;
  role: string | null;
  isPrivateHost: boolean;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isPrivateHost: false,
  loading: true,
});

function syncLocalAuth(user: User | null, role: string | null, isPrivateHost: boolean) {
  if (typeof window === 'undefined') return;

  if (user) {
    localStorage.setItem('userEmail', user.email ?? '');
    localStorage.setItem('userRole', role ?? 'renter');
    localStorage.setItem('isPrivateHost', isPrivateHost ? 'true' : 'false');
  } else {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('isPrivateHost');
  }
}

function readCachedAuth() {
  if (typeof window === 'undefined') {
    return { role: null as string | null, isPrivateHost: false };
  }
  return {
    role: localStorage.getItem('userRole'),
    isPrivateHost: localStorage.getItem('isPrivateHost') === 'true',
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isPrivateHost, setIsPrivateHost] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    const fetchUserData = async (sessionUser: User) => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', sessionUser.id)
        .maybeSingle();

      if (error) {
        console.error(error);
      }

      const userRole = profile?.role ?? 'renter';
      setRole(userRole);

      let privateHost = false;
      if (userRole === 'host' || userRole === 'owner') {
        const { data: privateListing } = await supabase
          .from('listings')
          .select('id')
          .eq('owner_id', sessionUser.id)
          .eq('listing_type', 'private')
          .limit(1)
          .maybeSingle();

        privateHost = Boolean(privateListing);
      }

      setIsPrivateHost(privateHost);
      syncLocalAuth(sessionUser, userRole, privateHost);
    };

    const applySession = async (sessionUser: User | null) => {
      if (!mounted) return;

      setUser(sessionUser);

      if (sessionUser) {
        const cached = readCachedAuth();
        if (cached.role) setRole(cached.role);
        if (cached.isPrivateHost) setIsPrivateHost(cached.isPrivateHost);
        setLoading(false);
        await fetchUserData(sessionUser);
      } else {
        setRole(null);
        setIsPrivateHost(false);
        syncLocalAuth(null, null, false);
        setLoading(false);
      }
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      void applySession(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, isPrivateHost, loading }}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserProfile, UserRole } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) setProfile(data);
  }

  async function seedDefaults(userId: string) {
    // Check if user has exclusion rules — if not, seed defaults
    const { count } = await supabase
      .from('exclusion_rules')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (count === 0) {
      // Seed default exclusion rules for new user
      const defaultRules = [
        { keyword: 'AUTOPAY', reason: 'Credit card autopayment' },
        { keyword: 'PAYMENT THANK YOU', reason: 'Credit card payment' },
        { keyword: 'AUTOMATIC PAYMENT', reason: 'Credit card autopayment' },
        { keyword: 'PAYMENT TO CHASE', reason: 'Credit card payment' },
        { keyword: 'FID BKG SVC LLC', reason: 'Investment transfer (Fidelity)' },
        { keyword: 'MSPBNA', reason: 'Investment transfer (Morgan Stanley)' },
        { keyword: 'ROBINHOOD', reason: 'Investment transfer' },
        { keyword: 'TREASURY DIRECT', reason: 'Investment transfer' },
        { keyword: 'XOOM', reason: 'International transfer' },
        { keyword: 'DOMESTIC WIRE', reason: 'Wire transfer' },
        { keyword: 'RECURRING TRANSFER', reason: 'Internal transfer' },
        { keyword: 'ONLINE TRANSFER FROM CHK', reason: 'Internal transfer' },
      ];

      await supabase.from('exclusion_rules').insert(
        defaultRules.map(r => ({ ...r, user_id: userId }))
      );
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        seedDefaults(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
          seedDefaults(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const role: UserRole = profile?.role ?? 'user';

  return (
    <AuthContext.Provider value={{ user, session, profile, role, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}

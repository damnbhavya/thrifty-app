import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Profile {
  id: string;
  name: string | null;
  monthly_income: number;
  global_budget: number;
  expo_push_token: string | null;
  has_completed_onboarding: boolean;
  created_at: string;
}

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  hasCompletedOnboarding: boolean;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        // Profile might not exist yet (user signed up before migration)
        // In that case, try to create one
        if (error.code === 'PGRST116') {
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              name: user.user_metadata?.name || null,
            })
            .select()
            .single();

          if (!insertError && newProfile) {
            setProfile(newProfile as Profile);
          }
        } else {
          console.error('Error fetching profile:', error.message);
        }
      } else {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.error('Error in fetchProfile:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (data: Partial<Profile>): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...data });

      if (error) {
        return { error: new Error(error.message) };
      }

      // Update local state
      setProfile((prev) => prev ? { ...prev, ...data } : null);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const refreshProfile = async () => {
    setLoading(true);
    await fetchProfile();
  };

  const hasCompletedOnboarding = profile?.has_completed_onboarding ?? false;

  return (
    <ProfileContext.Provider
      value={{ profile, loading, hasCompletedOnboarding, updateProfile, refreshProfile }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}

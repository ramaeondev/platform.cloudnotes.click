import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { ProfileModel } from '../lib/types.ts';

interface DatabaseProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  is_initial_setup_completed: boolean | null;
  updated_at: string | null;
  created_at: string | null;
}

export const useProfile = () => {
  const { user } = useAuth();

  return useQuery<ProfileModel>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('No user logged in');
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('No profile data found');
      }

      // First cast to unknown, then to DatabaseProfile to avoid type errors
      const dbProfile = data as unknown as DatabaseProfile;

      // Map the database response to our ProfileModel
      const profile: ProfileModel = {
        id: dbProfile.id,
        first_name: dbProfile.first_name,
        last_name: dbProfile.last_name,
        username: dbProfile.username,
        email: dbProfile.email,
        avatar_url: dbProfile.avatar_url,
        is_initial_setup_completed: dbProfile.is_initial_setup_completed ?? false,
        updated_at: dbProfile.updated_at,
        created_at: dbProfile.created_at
      };

      return profile;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    gcTime: 10 * 60 * 1000, // Keep data in cache for 10 minutes
  });
};
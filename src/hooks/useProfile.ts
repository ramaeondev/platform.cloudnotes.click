import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { ProfileModel } from '../lib/types.ts';

// Define the shape of the RPC function result
interface ProfileWithNewsletterStatus {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  is_initial_setup_completed: boolean | null;
  updated_at: string | null;
  created_at: string | null;
  newsletter_subscribed: boolean | null;
}

export const useProfile = () => {
  const { user } = useAuth();

  return useQuery<ProfileModel>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('No user logged in');
      }

      // Use the RPC function to get profile with newsletter status
      const { data, error } = await supabase
        .rpc('get_profile_with_newsletter_status', {
          profile_id: user.id
        });

      if (error) {
        console.error('Profile fetch error:', error);
        throw error;
      }

      if (!data) {
        console.error('No profile data found');
        throw new Error('No profile data found');
      }

      console.log('Raw profile data from DB:', {
        full_data: data,
        last_name: data.last_name,
        username: data.username,
        newsletter_subscribed: data.newsletter_subscribed
      });

      // Map the database response directly to ProfileModel
      const profile: ProfileModel = {
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        username: data.username,
        email: data.email,
        avatar_url: data.avatar_url,
        is_initial_setup_completed: data.is_initial_setup_completed,
        updated_at: data.updated_at,
        created_at: data.created_at,
        newsletter_subscribed: data.newsletter_subscribed || false
      };

      console.log('Mapped profile data:', {
        profile_object: profile,
        last_name: profile.last_name,
        username: profile.username,
        newsletter_subscribed: profile.newsletter_subscribed
      });

      return profile;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
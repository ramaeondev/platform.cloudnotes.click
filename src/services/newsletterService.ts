import { supabase } from '../integrations/supabase/client.ts';
import { SUPABASE_URL } from '../lib/env.ts';

/**
 * Toggle the newsletter subscription status for a user
 * @param email The email address to toggle subscription for
 * @param isSubscribed Boolean indicating whether to subscribe or unsubscribe
 * @returns A promise resolving to the result of the operation
 */
export const toggleNewsletterSubscription = async (
  email: string,
  isSubscribed: boolean
): Promise<{ success: boolean; message?: string; error?: string; newsletter_subscribed?: boolean }> => {
  try {
    // Get the current session
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.access_token) {
      throw new Error('No access token available');
    }

    // Call the dedicated newsletter toggle edge function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/profile-newsletter-toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        email,
        subscribed: isSubscribed
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to toggle newsletter subscription');
    }

    const result = await response.json();
    return {
      success: result.success,
      message: result.message,
      newsletter_subscribed: result.subscribed
    };
  } catch (error) {
    console.error('Error toggling newsletter subscription:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
};

/**
 * Check if a user is subscribed to the newsletter
 * @param email The email address to check
 * @returns A promise resolving to a boolean indicating if the user is subscribed
 */
export const getNewsletterSubscriptionStatus = async (
  email: string
): Promise<boolean> => {
  try {
    // Get the current session
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.access_token) {
      throw new Error('No access token available');
    }

    // Call the edge function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/profile-operations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: 'get_newsletter_status',
        email,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch newsletter subscription status');
    }

    const result = await response.json();
    return result.newsletter_subscribed || false;
  } catch (error) {
    console.error('Error checking newsletter subscription:', error);
    return false;
  }
}; 
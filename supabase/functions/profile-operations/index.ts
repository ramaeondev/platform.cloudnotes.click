import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient, PostgrestError } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

interface ApiError extends Error {
  message: string;
}

console.log("Hello from Profile Operations!");

interface ProfileRequest {
  action?: string; // 'get', 'update', 'toggle_newsletter', 'deactivate_account', or 'delete_account'
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  is_initial_setup_completed?: boolean;
  newsletter_subscribed?: boolean;
}

interface ProfileResponse {
  id?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  avatar_url?: string;
  is_initial_setup_completed?: boolean;
  updated_at?: string;
  created_at?: string;
  newsletter_subscribed?: boolean;
  message?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[profile-operations] Request received:', req.method);

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const body: ProfileRequest = await req.json();
    const { 
      action = 'update', 
      id, 
      email,
      first_name, 
      last_name, 
      username, 
      is_initial_setup_completed,
      newsletter_subscribed
    } = body;

    // Validate required fields
    if (!id && !email) {
      throw new Error('Either user ID or email is required');
    }

    let profileResponse: ProfileResponse = {};

    // Handle different actions
    let profile: ProfileResponse;
    
    switch (action) {
      case 'get':
        profileResponse = await getProfile(supabaseClient, id, email);
        break;
        
      case 'update':
        profileResponse = await updateProfile(
          supabaseClient, 
          id, 
          email,
          { 
            first_name, 
            last_name, 
            username, 
            is_initial_setup_completed 
          },
          newsletter_subscribed
        );
        break;
        
      case 'get_newsletter_status':
        profile = await getProfile(supabaseClient, id, email);
        profileResponse = {
          newsletter_subscribed: profile.newsletter_subscribed || false
        };
        break;
        
      case 'toggle_newsletter':
        if (newsletter_subscribed === undefined) {
          throw new Error('newsletter_subscribed is required for toggle_newsletter action');
        }
        profileResponse = await toggleNewsletterSubscription(
          supabaseClient,
          id,
          email,
          newsletter_subscribed
        );
        break;
        
      case 'deactivate_account':
        if (!id) {
          throw new Error('User ID is required for account deactivation');
        }
        profileResponse = await deactivateAccount(supabaseClient, id);
        break;
        
      case 'delete_account':
        if (!id) {
          throw new Error('User ID is required for account deletion');
        }
        profileResponse = await deleteAccount(supabaseClient, id);
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify(profileResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const apiError = error as ApiError;
    console.error('[profile-operations] Error:', apiError);
    return new Response(
      JSON.stringify({ error: apiError.message || 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

// Get a user's profile data including newsletter subscription status
async function getProfile(
  supabase: SupabaseClient,
  id?: string,
  email?: string
): Promise<ProfileResponse> {
  let query = supabase.from('profiles').select('*');
  
  if (id) {
    query = query.eq('id', id);
  } else if (email) {
    query = query.eq('email', email);
  }
  
  const { data: profile, error } = await query.single();
  
  if (error) {
    console.error('[profile-operations] Error fetching profile:', error);
    throw error;
  }
  
  if (!profile) {
    throw new Error('Profile not found');
  }
  
  // Get newsletter subscription status
  const { data: subscription, error: subError } = await supabase
    .from('newsletter_subscribers')
    .select('subscribed_at')
    .eq('email', profile.email)
    .single();
  
  // Profile exists, but no newsletter subscription record or error means not subscribed
  const isSubscribed = !subError && subscription && !!subscription.subscribed_at;
  
  return {
    ...profile,
    newsletter_subscribed: isSubscribed
  };
}

// Update a user's profile with optional newsletter subscription update
async function updateProfile(
  supabase: SupabaseClient,
  id?: string,
  email?: string,
  profileData?: {
    first_name?: string;
    last_name?: string;
    username?: string;
    is_initial_setup_completed?: boolean;
  },
  newsletterSubscribed?: boolean
): Promise<ProfileResponse> {
  // First, get user information to ensure we have both ID and email
  let userId = id;
  let userEmail = email;
  
  if (!userId || !userEmail) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email')
      .eq(userId ? 'id' : 'email', userId || userEmail)
      .single();
      
    if (error) {
      console.error('[profile-operations] Error fetching user data:', error);
      throw error;
    }
    
    userId = profile.id;
    userEmail = profile.email;
  }
  
  // Update profile
  if (profileData && Object.keys(profileData).length > 0) {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
      
    if (error) {
      console.error('[profile-operations] Error updating profile:', error);
      throw error;
    }
  }
  
  // Update newsletter subscription if specified
  if (newsletterSubscribed !== undefined && userEmail) {
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('newsletter_subscribers')
      .upsert({
        email: userEmail,
        subscribed_at: newsletterSubscribed ? now : null,
        unsubscribed_at: newsletterSubscribed ? null : now
      }, {
        onConflict: 'email'
      });
      
    if (error) {
      console.error('[profile-operations] Error updating newsletter subscription:', error);
      throw error;
    }
  }
  
  console.log('[profile-operations] Profile updated successfully');
  
  // Return updated profile
  return getProfile(supabase, userId);
}

// Toggle newsletter subscription status without changing other profile data
async function toggleNewsletterSubscription(
  supabase: SupabaseClient,
  id?: string,
  email?: string,
  subscribed: boolean = false
): Promise<ProfileResponse> {
  // Need to get the email if only ID is provided
  let userEmail = email;
  
  if (!userEmail && id) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('[profile-operations] Error fetching email:', error);
      throw error;
    }
    
    userEmail = profile.email;
  }
  
  if (!userEmail) {
    throw new Error('Email is required for newsletter subscription');
  }
  
  const now = new Date().toISOString();
  
  // Update newsletter subscription
  const { error } = await supabase
    .from('newsletter_subscribers')
    .upsert({
      email: userEmail,
      subscribed_at: subscribed ? now : null,
      unsubscribed_at: subscribed ? null : now
    }, {
      onConflict: 'email'
    });
    
  if (error) {
    console.error('[profile-operations] Error toggling newsletter subscription:', error);
    throw error;
  }
  
  console.log(`[profile-operations] Newsletter subscription ${subscribed ? 'enabled' : 'disabled'} for ${userEmail}`);
  
  return {
    message: `Successfully ${subscribed ? 'subscribed to' : 'unsubscribed from'} the newsletter`,
    newsletter_subscribed: subscribed
  };
}

// Deactivate a user account by setting their status to disabled
async function deactivateAccount(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileResponse> {
  try {
    // Update the user's metadata
    const { error: metadataError } = await supabase.auth.admin.updateUserById(
      userId,
      { 
        user_metadata: { status: 'disabled' },
        app_metadata: { deactivated: true }
      }
    );
    
    if (metadataError) {
      console.error('[profile-operations] Error updating user metadata:', metadataError);
      throw metadataError;
    }
    
    // Directly ban the user using SQL query (this works even when the TypeScript API has type issues)
    const { error: banError } = await supabase.rpc('admin_ban_user', {
      uid: userId,
      ban_duration: '100 years' // Effectively permanent unless reactivated
    });
    
    if (banError) {
      console.error('[profile-operations] Error banning user account:', banError);
      throw banError;
    }
    
    console.log(`[profile-operations] Account deactivated for user ${userId}`);
    
    return {
      message: 'Account successfully deactivated'
    };
  } catch (error) {
    console.error('[profile-operations] Error in deactivateAccount:', error);
    throw error;
  }
}

// Mark a user account for deletion and schedule it
async function deleteAccount(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileResponse> {
  try {
    // Get user profile to store relevant info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError) {
      console.error('[profile-operations] Error fetching profile for deletion:', profileError);
      throw profileError;
    }
    
    // Mark the account for deletion using metadata
    const { error: metadataError } = await supabase.auth.admin.updateUserById(
      userId,
      { 
        user_metadata: { 
          status: 'pending_deletion',
          scheduled_deletion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() 
        },
        app_metadata: { 
          scheduled_for_deletion: true,
          deletion_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      }
    );
    
    if (metadataError) {
      console.error('[profile-operations] Error updating user metadata:', metadataError);
      throw metadataError;
    }
    
    // Directly ban the user using SQL query (this works even when the TypeScript API has type issues)
    const { error: banError } = await supabase.rpc('admin_ban_user', {
      uid: userId,
      ban_duration: '100 years' // Effectively permanent until deleted
    });
    
    if (banError) {
      console.error('[profile-operations] Error banning user account:', banError);
      throw banError;
    }
    
    // Store the deletion request in a separate table for processing
    const { error: deleteRequestError } = await supabase
      .from('account_deletion_requests')
      .insert({
        user_id: userId,
        email: profile.email,
        requested_at: new Date().toISOString(),
        scheduled_deletion_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
      
    if (deleteRequestError) {
      // Log error but continue - the user metadata should be enough
      console.error('[profile-operations] Error storing deletion request:', deleteRequestError);
    }
    
    console.log(`[profile-operations] Account marked for deletion for user ${userId}`);
    
    return {
      message: 'Account successfully marked for deletion'
    };
  } catch (error) {
    console.error('[profile-operations] Error in deleteAccount:', error);
    throw error;
  }
}
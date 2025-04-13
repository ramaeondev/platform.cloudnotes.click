import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient, PostgrestError } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

console.log("Hello from Profile Operations!");

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
    const body = await req.json();
    const { id, first_name, last_name, username, is_initial_setup_completed } = body;

    if (!id) {
      throw new Error('User ID is required');
    }

    // Update profile in the database
    const { error } = await supabaseClient
      .from('profiles')
      .update({
        first_name,
        last_name,
        username,
        is_initial_setup_completed,
      })
      .eq('id', id);

    if (error) {
      console.error('[profile-operations] Error updating profile:', error);
      throw new Error(error.message);
    }

    console.log('[profile-operations] Profile updated successfully');
    return new Response(
      JSON.stringify({ message: 'Profile updated successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[profile-operations] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
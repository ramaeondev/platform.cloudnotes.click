
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { email } = await req.json();
    
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    console.log(`Adding email to newsletter subscribers: ${email}`);

    // Check if email already exists
    const { data: existingSubscriber, error: queryError } = await supabaseClient
      .from('newsletter_subscribers')
      .select('*')
      .eq('email', email)
      .single();
    
    if (queryError && queryError.code !== 'PGRST116') { // PGRST116 means no rows returned
      console.error('Error querying subscriber:', queryError);
      throw queryError;
    }
    
    let result;
    
    // If subscriber exists but was unsubscribed, update the record
    if (existingSubscriber) {
      if (existingSubscriber.unsubscribed_at) {
        const { data, error } = await supabaseClient
          .from('newsletter_subscribers')
          .update({ 
            subscribed_at: new Date().toISOString(),
            unsubscribed_at: null 
          })
          .eq('email', email)
          .select();
        
        if (error) throw error;
        result = { resubscribed: true, data };
      } else {
        // Already subscribed
        result = { alreadySubscribed: true, data: existingSubscriber };
      }
    } else {
      // New subscriber
      const { data, error } = await supabaseClient
        .from('newsletter_subscribers')
        .insert([{ email }])
        .select();
      
      if (error) throw error;
      result = { newSubscription: true, data };
    }
    
    return new Response(
      JSON.stringify({ success: true, ...result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred while subscribing to the newsletter' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

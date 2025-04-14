import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Profile Newsletter Toggle service is running!')

interface NewsletterError extends Error {
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body
    const { email, subscribed } = await req.json()
    
    if (!email) {
      throw new Error('Email is required')
    }

    if (typeof subscribed !== 'boolean') {
      throw new Error('Subscription status must be a boolean')
    }

    const now = new Date().toISOString()

    // Update newsletter subscription
    const { data, error } = await supabaseClient
      .from('newsletter_subscribers')
      .upsert({
        email,
        subscribed_at: subscribed ? now : null,
        unsubscribed_at: subscribed ? null : now
      }, {
        onConflict: 'email'
      })

    if (error) throw error

    // Log the operation for audit purposes
    console.log(`Newsletter subscription ${subscribed ? 'enabled' : 'disabled'} for ${email}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully ${subscribed ? 'subscribed to' : 'unsubscribed from'} the newsletter`,
        subscribed
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    const newsletterError = error as NewsletterError;
    console.error('Error in profile-newsletter-toggle:', newsletterError.message)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: newsletterError.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
}) 
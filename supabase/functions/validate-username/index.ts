import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ValidationRequest {
  username: string;
  userId?: string;
}

interface ValidationError extends Error {
  code?: string;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body
    const { username, userId } = await req.json() as ValidationRequest

    // Validation rules
    if (!username) {
      throw new Error('Username is required')
    }

    // Username format validation
    const usernameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/
    if (!usernameRegex.test(username)) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Username can only contain letters, numbers, and the characters _ . -'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Length validation
    if (username.length < 3 || username.length > 30) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Username must be between 3 and 30 characters'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Reserved usernames check
    const reservedUsernames = [
      'admin', 'root', 'system', 'moderator', 'support',
      'administrator', 'mod', 'staff', 'help', 'info',
      'contact', 'security', 'api', 'test', 'demo'
    ]
    if (reservedUsernames.includes(username.toLowerCase())) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'This username is reserved'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Check if username exists
    let query = supabaseClient
      .from('profiles')
      .select('username')
      .eq('username', username)

    // If userId is provided, exclude the current user from the check
    if (userId) {
      query = query.neq('id', userId)
    }

    const { data, error } = await query.single()

    if (error && error.code === 'PGRST116') {
      // No matching username found - this is good
      return new Response(
        JSON.stringify({
          valid: true,
          message: 'Username is available'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } else if (data) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Username is already taken'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    throw error || new Error('Unknown error occurred')

  } catch (error) {
    console.error('Error:', error)
    const validationError = error as ValidationError
    return new Response(
      JSON.stringify({
        valid: false,
        error: validationError.message || 'An unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 
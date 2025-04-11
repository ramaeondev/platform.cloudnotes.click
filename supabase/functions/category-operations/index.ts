// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'

interface Category {
  id: string
  name: string
  color: string
  is_system: boolean
  user_id: string
}

console.log("Hello from Functions!")

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

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')?.split(' ')[1]
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Get the user from the auth header
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader)
    if (userError || !user) {
      throw new Error('Invalid user')
    }

    const { operation } = await req.json()

    switch (operation) {
      case 'getAll': {
        // Get all categories with note counts for the user
        const { data, error } = await supabaseClient
          .from('categories')
          .select(`
            id,
            name,
            color,
            is_system,
            notes:notes(count)
          `)
          .eq('user_id', user.id)
          .order('name')

        if (error) throw error

        return new Response(
          JSON.stringify({
            categories: data.map(category => ({
              id: category.id,
              name: category.name,
              color: category.color,
              isSystem: category.is_system,
              notesCount: category.notes?.[0]?.count || 0
            }))
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }

      case 'create': {
        const { name } = await req.json()
        
        // Call the generate-category-color function to get a unique color
        const colorResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-category-color`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authHeader}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_id: user.id })
          }
        )

        if (!colorResponse.ok) {
          throw new Error('Failed to generate unique color')
        }

        const { color } = await colorResponse.json()

        // Create the category
        const { data, error } = await supabaseClient
          .from('categories')
          .insert({
            name,
            color,
            user_id: user.id,
            is_system: false
          })
          .select()
          .single()

        if (error) throw error

        return new Response(
          JSON.stringify({ category: data }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }

      case 'update': {
        const { id, name } = await req.json()

        // Check if the category belongs to the user and is not a system category
        const { data: existing, error: fetchError } = await supabaseClient
          .from('categories')
          .select('is_system')
          .eq('id', id)
          .eq('user_id', user.id)
          .single()

        if (fetchError) throw fetchError
        if (!existing) throw new Error('Category not found')
        if (existing.is_system) throw new Error('Cannot modify system category')

        // Update the category
        const { data, error } = await supabaseClient
          .from('categories')
          .update({ name })
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single()

        if (error) throw error

        return new Response(
          JSON.stringify({ category: data }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }

      case 'delete': {
        const { id } = await req.json()

        // Check if the category belongs to the user and is not a system category
        const { data: existing, error: fetchError } = await supabaseClient
          .from('categories')
          .select('is_system')
          .eq('id', id)
          .eq('user_id', user.id)
          .single()

        if (fetchError) throw fetchError
        if (!existing) throw new Error('Category not found')
        if (existing.is_system) throw new Error('Cannot delete system category')

        // Delete the category
        const { error } = await supabaseClient
          .from('categories')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id)

        if (error) throw error

        return new Response(
          JSON.stringify({ success: true }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }

      default:
        throw new Error('Invalid operation')
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/category-operations' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

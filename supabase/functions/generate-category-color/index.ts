// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'

interface HSL {
  h: number // hue (0-360)
  s: number // saturation (0-100)
  l: number // lightness (0-100)
}

function hslToHex({ h, s, l }: HSL): string {
  s /= 100
  l /= 100

  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }

  return `#${f(0)}${f(8)}${f(4)}`
}

function generateRandomHSL(existingHues: number[] = []): HSL {
  // Find a unique hue that's not too close to existing ones
  let hue: number
  do {
    hue = Math.floor(Math.random() * 360)
  } while (existingHues.some(h => Math.abs(h - hue) < 30))

  return {
    h: hue,
    s: 70 + Math.random() * 20, // 70-90% saturation for vibrant colors
    l: 45 + Math.random() * 10  // 45-55% lightness for good contrast
  }
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

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')?.split(' ')[1]
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Get the user from the auth header
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader)
    if (userError || !user) {
      throw new Error('Invalid user')
    }

    // Get existing category colors for the user
    const { data: existingCategories, error: categoriesError } = await supabaseClient
      .from('categories')
      .select('color')
      .eq('user_id', user.id)

    if (categoriesError) {
      throw categoriesError
    }

    // Extract existing hues from hex colors
    const existingHues = existingCategories
      .map(cat => cat.color)
      .filter((color): color is string => typeof color === 'string')
      .map(color => {
        // Convert hex to RGB
        const r = parseInt(color.slice(1, 3), 16) / 255
        const g = parseInt(color.slice(3, 5), 16) / 255
        const b = parseInt(color.slice(5, 7), 16) / 255

        // Convert RGB to HSL (only need hue)
        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        const d = max - min

        let h = 0
        if (d === 0) h = 0
        else if (max === r) h = 60 * ((g - b) / d % 6)
        else if (max === g) h = 60 * ((b - r) / d + 2)
        else if (max === b) h = 60 * ((r - g) / d + 4)

        return (h + 360) % 360
      })

    // Generate a new unique color
    const newHSL = generateRandomHSL(existingHues)
    const newColor = hslToHex(newHSL)

    return new Response(
      JSON.stringify({ color: newColor }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/generate-category-color' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

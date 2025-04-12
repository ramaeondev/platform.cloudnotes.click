// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient, PostgrestError } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'

interface Category {
  id: string
  name: string
  color: string
  is_system: boolean
  user_id: string
  sequence: number
  notes?: Array<{ count: number }>
}

interface HSL {
  h: number // hue (0-360)
  s: number // saturation (0-100)
  l: number // lightness (0-100)
}

interface CategoryResponse {
  id: string;
  name: string;
  color: string;
  is_system: boolean;
  notes: Array<{ count: number }>;
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
  let hue: number;
  let attempts = 0;
  const maxAttempts = 20;
  const minHueDiff = 30;

  console.log('Generating random HSL color. Existing hues:', existingHues);

  do {
    hue = Math.floor(Math.random() * 360);
    attempts++;
    
    // After max attempts, gradually reduce the minimum hue difference
    const currentMinDiff = Math.max(5, minHueDiff * (1 - attempts / maxAttempts));
    
    console.log(`Attempt ${attempts}: Generated hue ${hue}, minimum difference: ${currentMinDiff}`);
    
    // Check if this hue is unique enough
    const tooClose = existingHues.some(h => {
      const diff = Math.abs(h - hue);
      const isTooClose = diff < currentMinDiff;
      if (isTooClose) {
        console.log(`  Too close to existing hue ${h} (difference: ${diff})`);
      }
      return isTooClose;
    });

    if (!tooClose) {
      console.log(`Found acceptable hue: ${hue} after ${attempts} attempts`);
      break;
    }
  } while (attempts < maxAttempts);

  const result = {
    h: hue,
    s: 70 + Math.random() * 20, // 70-90% saturation for vibrant colors
    l: 45 + Math.random() * 10  // 45-55% lightness for good contrast
  };

  console.log('Generated final HSL color:', result);
  return result;
}

async function generateUniqueColor(supabaseClient: SupabaseClient, userId: string): Promise<string> {
  // Get existing category colors for the user
  const { data: existingCategories, error: categoriesError } = await supabaseClient
    .from('categories')
    .select('color')
    .eq('user_id', userId);

  if (categoriesError) {
    console.error('Error fetching existing categories:', categoriesError);
    throw categoriesError;
  }

  // Extract existing hues from hex colors
  const existingHues = existingCategories
    .map((cat: { color: string }) => cat.color)
    .filter((color: string): color is string => typeof color === 'string')
    .map((color: string) => {
      console.log('Processing color:', color);
      // Convert hex to RGB
      const r = parseInt(color.slice(1, 3), 16) / 255;
      const g = parseInt(color.slice(3, 5), 16) / 255;
      const b = parseInt(color.slice(5, 7), 16) / 255;

      // Convert RGB to HSL (only need hue)
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;

      let h = 0;
      if (d === 0) h = 0;
      else if (max === r) h = 60 * ((g - b) / d % 6);
      else if (max === g) h = 60 * ((b - r) / d + 2);
      else if (max === b) h = 60 * ((r - g) / d + 4);

      const hue = (h + 360) % 360;
      console.log(`Converted ${color} to hue: ${hue}`);
      return hue;
    });

  // Generate a new unique color
  const newHSL = generateRandomHSL(existingHues);
  const newColor = hslToHex(newHSL);
  console.log('Generated new color:', newColor);
  
  return newColor;
}

console.log("Hello from Functions!")

export async function serve(req: Request): Promise<Response> {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[category-operations] Request received:', req.method);
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')?.split(' ')[1]
    if (!authHeader) {
      console.error('[category-operations] No authorization header');
      throw new Error('No authorization header')
    }

    // Get the user from the auth header
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader)
    if (userError || !user) {
      console.error('[category-operations] Invalid user:', userError);
      throw new Error('Invalid user')
    }
    console.log('[category-operations] User authenticated:', user.id);

    // Parse request body once
    const body = await req.json()
    const { operation, name, id, sequence } = body
    console.log('[category-operations] Operation requested:', operation);

    switch (operation) {
      case 'getAll': {
        console.log('[category-operations] Fetching categories for user:', user.id);
        // Get all categories with note counts for the user, ordered by sequence
        const { data, error } = await supabaseClient
          .from('categories')
          .select('*, notes(count)')
          .eq('user_id', user.id)
          .order('sequence')
          .returns<Category[]>();

        if (error) {
          const pgError = error as PostgrestError;
          console.error('[category-operations] Error fetching categories:', pgError);
          throw new Error(pgError.message);
        }

        console.log('[category-operations] Categories fetched:', data?.length);
        return new Response(
          JSON.stringify({
            categories: data.map(category => ({
              id: category.id,
              name: category.name,
              color: category.color,
              isSystem: category.is_system,
              sequence: category.sequence,
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
        if (!name) throw new Error('Name is required')
        console.log('Creating new category with name:', name);
        
        // Get max sequence number for user
        const { data: maxSeq } = await supabaseClient
          .from('categories')
          .select('sequence')
          .eq('user_id', user.id)
          .order('sequence', { ascending: false })
          .limit(1)
          .single();

        const nextSequence = (maxSeq?.sequence || 0) + 1;
        const color = await generateUniqueColor(supabaseClient, user.id);
        
        // Create category with next sequence number
        const { data, error } = await supabaseClient
          .from('categories')
          .insert({
            name,
            color,
            user_id: user.id,
            is_system: false,
            sequence: nextSequence
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating category:', error);
          throw error;
        }

        console.log('Successfully created category:', data);
        return new Response(
          JSON.stringify({ category: data }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }

      case 'updateSequence': {
        if (!id || typeof sequence !== 'number') {
          throw new Error('Category ID and sequence are required')
        }

        // Use the new stored procedure
        const { error } = await supabaseClient.rpc('update_category_sequence', {
          p_category_id: id,
          p_new_sequence: sequence,
          p_user_id: user.id
        });

        if (error) {
          console.error('[category-operations] Error updating sequence:', error);
          throw error;
        }

        return new Response(
          JSON.stringify({ success: true }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }

      case 'update': {
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
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/category-operations' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

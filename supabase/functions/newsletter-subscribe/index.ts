// supabase/functions/subscribe/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withCors } from "../_shared/cors.ts";

serve(withCors(async (req) => {
  const body = await req.json();
  const email = body?.email?.toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: "Invalid or missing email" }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error } = await supabase
    .from("newsletter_subscribers")
    .upsert({
      email,
      subscribed_at: new Date().toISOString(),
      unsubscribed_at: null,
    }, { onConflict: "email" });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true, email }), { status: 200 });
}));

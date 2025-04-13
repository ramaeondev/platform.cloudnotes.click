import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3";

// Response helper with CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ErrorResponse = {
  message: string;
  details?: Record<string, unknown>;
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") // Needed for DB inserts
);

const s3 = new S3Client({
  region: Deno.env.get("AWS_REGION"),
  credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID"),
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY"),
  },
});

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ message: "Method not allowed" } as ErrorResponse),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jwt) {
    return new Response(
      JSON.stringify({ message: "Unauthorized - No JWT provided" } as ErrorResponse),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: user, error } = await supabase.auth.getUser(jwt);
  if (error || !user) {
    return new Response(
      JSON.stringify({ 
        message: "Invalid token",
        details: error?.message
      } as ErrorResponse),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userId = user.id;
  const folderPath = `users/${userId}/`;

  // OPTIONAL: Check if folder entry already exists in Supabase
  const { data: existing } = await supabase
    .from("folders")
    .select("id")
    .eq("user_id", userId)
    .eq("is_root", true)
    .maybeSingle();

  if (existing) {
    return new Response(
      JSON.stringify({ message: "Folder already exists" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Create a placeholder object in S3 to simulate folder
    const putCmd = new PutObjectCommand({
      Bucket: Deno.env.get("AWS_BUCKET_NAME"),
      Key: `${folderPath}.keep`,
      Body: "",
    });

    await s3.send(putCmd);

    return new Response(
      JSON.stringify({ 
        message: "Folder created successfully",
        path: folderPath
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Error creating S3 folder:', error);
    return new Response(
      JSON.stringify({ 
        message: "Failed to create S3 folder",
        details: error
      } as ErrorResponse),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }


});


// supabase/functions/create-newuser-folder/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { S3Client, PutObjectCommand, ListObjectsV2Command } 
  from "https://deno.land/x/aws_sdk@v3.32.0-1/client-s3/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  // Add CORS headers to response
  const headers = {
    ...corsHeaders,
    "Content-Type": "application/json"
  };

  console.log("Environment variables:", {
    bucket: Deno.env.get("S3_BUCKET") || "NULL",
    region: Deno.env.get("AWS_REGION") || "NULL",
    hasAccessKey: !!Deno.env.get("AWS_ACCESS_KEY_ID"),
    hasSecretKey: !!Deno.env.get("AWS_SECRET_ACCESS_KEY")
  });

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { 
        status: 405,
        headers
      }
    );
  }

  try {
    const body = await req.json();
    const uuid = body?.uuid;

    if (!uuid) {
      return new Response(
        JSON.stringify({ error: "UUID is required" }),
        { 
          status: 400,
          headers
        }
      );
    }

    const bucket = Deno.env.get("S3_BUCKET");
    const region = Deno.env.get("AWS_REGION");
    const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");

    // Check for required environment variables
    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
      console.error("Missing required environment variables:", {
        bucket: !!bucket,
        region: !!region,
        accessKeyId: !!accessKeyId,
        secretAccessKey: !!secretAccessKey
      });
      
      return new Response(
        JSON.stringify({ error: "Missing required environment variables" }),
        {
          status: 500,
          headers
        }
      );
    }

    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const folderKey = `${uuid}/`;
    console.log("Creating folder with key:", folderKey);

    // Check if folder already exists
    const check = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: folderKey,
      MaxKeys: 1,
    });

    console.log("Checking if folder exists...");
    const result = await s3Client.send(check);
    console.log("Check result:", result);

    if (result.Contents && result.Contents.length > 0) {
      console.log("Folder already exists");
      return new Response(
        JSON.stringify({ message: "Folder already exists", folder: folderKey }),
        {
          status: 200,
          headers
        }
      );
    }

    // Upload empty object to simulate folder
    const createFolder = new PutObjectCommand({
      Bucket: bucket,
      Key: folderKey,
      Body: "",
    });

    console.log("Creating folder...");
    const createResult = await s3Client.send(createFolder);
    console.log("Create result:", createResult);

    return new Response(
      JSON.stringify({ success: true, message: "Folder created", folder: folderKey }),
      {
        status: 201,
        headers
      }
    );
  } catch (error: any) {
    console.error("S3 folder creation error:", error);

    return new Response(
      JSON.stringify({ error: "Failed to create folder", details: error.message }),
      {
        status: 500,
        headers
      }
    );
  }
});

// supabase/functions/create-newuser-folder/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// Try this import instead
import { S3Client, PutObjectCommand, ListObjectsV2Command } 
  from "https://deno.land/x/aws_sdk@v3.32.0-1/client-s3/mod.ts";
import { withCors } from "../_shared/cors.ts";
// Near the beginning of your function, add:
console.log("Environment variables:", {
  bucket: Deno.env.get("S3_BUCKET") || "NULL",
  region: Deno.env.get("AWS_REGION") || "NULL",
  hasAccessKey: !!Deno.env.get("AWS_ACCESS_KEY_ID"),
  hasSecretKey: !!Deno.env.get("AWS_SECRET_ACCESS_KEY")
});

serve(withCors(async (req) => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { 
        status: 405,
        headers: { "Content-Type": "application/json" }
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
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const bucket = Deno.env.get("S3_BUCKET");
    const region = Deno.env.get("AWS_REGION");
    const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");

    // Check for required environment variables
    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
      return new Response(
        JSON.stringify({ error: "Missing required environment variables" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
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

    // Check if folder already exists
    const check = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: folderKey,
      MaxKeys: 1,
    });

    const result = await s3Client.send(check);

    if (result.Contents && result.Contents.length > 0) {
      return new Response(
        JSON.stringify({ message: "Folder already exists", folder: folderKey }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Upload empty object to simulate folder
    const createFolder = new PutObjectCommand({
      Bucket: bucket,
      Key: folderKey,
      Body: "",
    });

    await s3Client.send(createFolder);

    return new Response(
      JSON.stringify({ success: true, message: "Folder created", folder: folderKey }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("S3 folder creation error:", error);

    return new Response(
      JSON.stringify({ error: "Failed to create folder", details: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}));
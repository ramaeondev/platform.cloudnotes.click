// supabase/functions/create-newuser-folder/index.ts

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command
} from "https://esm.sh/@aws-sdk/client-s3@3.418.0";

interface RequestBody {
  uuid: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    const { uuid } = await req.json() as RequestBody;

    if (!uuid) {
      return new Response(JSON.stringify({ error: "UUID is required" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const bucket = Deno.env.get("S3_BUCKET")!;
    const region = Deno.env.get("AWS_REGION")!;
    const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID")!;
    const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY")!;

    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
      return new Response(
        JSON.stringify({ error: "Missing required environment variables" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
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
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
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
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("S3 folder creation error:", error);

    return new Response(
      JSON.stringify({ error: "Failed to create folder", details: error.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

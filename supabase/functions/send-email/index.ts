import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: corsHeaders });
  }

  console.log("send-email function started");

  let payload: EmailRequest;

  try {
    payload = await req.json();
  } catch (err) {
    console.error("Invalid JSON:", err);
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      headers: corsHeaders,
      status: 400,
    });
  }

  const { to, subject, html, text, type } = payload;

  if (!to || !subject || !html) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      headers: corsHeaders,
      status: 400,
    });
  }
  
  const fromEmail = Deno.env.get("EMAIL_FROM") || "noreply@cloudnotes.click";
  const fromName = Deno.env.get("EMAIL_FROM_NAME") || "Cloud Notes";
  
  try {
    // Get Brevo API key from environment variable
    const apiKey = Deno.env.get("BREVO_API_KEY");
    
    if (!apiKey) {
      throw new Error("BREVO_API_KEY environment variable is not set");
    }
    
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        sender: {
          name: fromName,
          email: fromEmail
        },
        to: [
          {
            email: to
          }
        ],
        subject: subject,
        htmlContent: html,
        textContent: text || html.replace(/<[^>]*>/g, "")
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorText;
      } catch {
        errorMessage = errorText;
      }
      
      throw new Error(`Brevo API error: ${errorMessage}`);
    }
    
    const responseData = await response.json();
    console.log(`Email sent to ${to} (${type || "generic"}), message ID: ${responseData.messageId}`);
    
    return new Response(JSON.stringify({ 
      success: true,
      messageId: responseData.messageId 
    }), {
      headers: corsHeaders,
      status: 200,
    });
  } catch (error) {
    console.error("Email Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: corsHeaders,
      status: 500,
    });
  }
});
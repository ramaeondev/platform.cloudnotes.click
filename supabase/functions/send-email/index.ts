
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configure SMTP client
const smtp = new SMTPClient({
  connection: {
    hostname: Deno.env.get("SMTP_HOST") || "smtp-relay.brevo.com",
    port: parseInt(Deno.env.get("SMTP_PORT") || "587"),
    tls: false,
    auth: {
      username: Deno.env.get("SMTP_USER") || "87f9a3001@smtp-brevo.com",
      password: Deno.env.get("SMTP_PASSWORD") || "ZjN5wPUX14sn2y6v",
    },
  },
});

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type: "welcome" | "reset" | "magic_link" | "email_change" | "invite";
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html, text, type } = await req.json() as EmailRequest;
    
    console.log(`Sending ${type} email to: ${to}`);

    const fromEmail = Deno.env.get("EMAIL_FROM") || "noreply@cloudnotes.click";

    await smtp.send({
      from: fromEmail,
      to: to,
      subject: subject,
      html: html,
      text: text || html.replace(/<[^>]*>/g, ""), // Strip HTML if no text version provided
    });

    console.log(`Email sent successfully to: ${to}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

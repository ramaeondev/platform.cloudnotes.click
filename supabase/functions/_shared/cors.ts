// supabase/functions/_shared/cors.ts

export function withCors(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const response = await handler(req);

    const headers = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));

    return new Response(response.body, {
      ...response,
      headers,
    });
  };
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // or your domain
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

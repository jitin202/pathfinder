// Cloudflare Worker — backend for Pathfinder's AI Career Guide.
// Proxies chat requests to Gemini so the API key never touches the browser
// (and never ends up in this file, since it gets pushed to GitHub).
//
// Setup:
//   1. wrangler secret put GEMINI_API_KEY
//      (or: Cloudflare dashboard -> Workers & Pages -> this worker ->
//       Settings -> Variables and Secrets -> add GEMINI_API_KEY as "Secret")
//   2. Deploy. Paste the resulting *.workers.dev URL into Pathfinder's
//      AI Career Guide settings (gear icon in the chat panel).

export default {
  async fetch(request, env, ctx) {
    // 1. CORS headers — lets the Pathfinder frontend (or any origin) call this worker
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // 2. Handle the browser's CORS preflight request
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Anything that isn't a chat POST gets a clean JSON response instead of
    // crashing on `request.json()` with no body (this is what caused the
    // "Unexpected end of JSON input" error when previewing the worker URL
    // directly in a browser tab, which sends a GET request).
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Use POST" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      // 3. Read the chat message + history sent by the frontend
      const { message, history } = await request.json();

      if (!message || typeof message !== "string") {
        return new Response(JSON.stringify({ error: "Missing 'message' string" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 4. Turn the chat history into Gemini's expected "contents" format
      const contents = [];
      if (Array.isArray(history)) {
        for (const turn of history) {
          contents.push({
            role: turn.role === "assistant" ? "model" : "user",
            parts: [{ text: turn.content }],
          });
        }
      }
      contents.push({ role: "user", parts: [{ text: message }] });

      // 5. Call Gemini. GEMINI_API_KEY comes from an encrypted Worker
      //    secret — see the setup note at the top of this file.
      const model = env.GEMINI_MODEL || "gemini-2.0-flash";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

      const geminiRes = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [
              {
                text: "You are Pathfinder's AI Career Guide. Help users explore traditional and rare/obscure career paths based on their interests. Be concise, warm, and specific.",
              },
            ],
          },
        }),
      });

      const data = await geminiRes.json();

      if (!geminiRes.ok) {
        return new Response(JSON.stringify({ error: data.error?.message || "Gemini API error" }), {
          status: geminiRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const reply =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, I couldn't generate a response.";

      // 6. Send the reply back in the { reply } shape Pathfinder's frontend expects
      return new Response(JSON.stringify({ reply }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }
  },
};

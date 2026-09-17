// Cloudflare Worker — free alternative to Firebase Cloud Functions.
// This proxies chat requests to Gemini so your API key stays secret.
// No credit card needed for Cloudflare's free tier.

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Use POST" }), { status: 405 });
    }

    try {
      const { message, history } = await request.json();

      if (!message || typeof message !== "string") {
        return new Response(JSON.stringify({ error: "Missing 'message' string" }), {
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      }

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

      const model = "gemini-2.0-flash";
      // env.GEMINI_API_KEY is set as a secret via `wrangler secret put GEMINI_API_KEY`
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
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      }

      const reply =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, I couldn't generate a response.";

      return new Response(JSON.stringify({ reply }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }
  },
};

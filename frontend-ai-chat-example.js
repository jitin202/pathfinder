// Frontend example — call this from your chatbot UI component.
//
// This talks to the Cloudflare Worker in cloudflare-worker-gemini-proxy.js,
// which is what Pathfinder's AI Career Guide actually uses as its backend
// (not a Firebase Cloud Function). Deploy the worker first — Cloudflare
// gives you a URL that looks like:
//   https://your-worker-name.your-subdomain.workers.dev

const WORKER_URL = "https://YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev";
// Example: "https://bitter-moon-6e03.jaat70802.workers.dev"

async function askAI(message, history = []) {
  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Something went wrong");
    }

    return data.reply;
  } catch (err) {
    console.error("AI request failed:", err);
    return "Sorry, something went wrong talking to the AI guide. Please try again.";
  }
}

// --- Example usage in a React chatbot component ---
//
// const [messages, setMessages] = useState([]);
//
// async function handleSend(userInput) {
//   const newHistory = [...messages, { role: "user", content: userInput }];
//   setMessages(newHistory);
//
//   const reply = await askAI(userInput, messages);
//
//   setMessages([...newHistory, { role: "assistant", content: reply }]);
// }
//
// --- Note on Pathfinder's actual implementation (index.html) ---
//
// Rather than hardcoding WORKER_URL, Pathfinder lets each visitor paste
// their own deployed worker URL into a settings modal (opened from the
// gear icon in the AI Career Guide panel), and stores it in
// localStorage under the key "pathfinder_proxy_url". That way the page
// stays static/serverless and nobody's API key or worker URL is baked
// into the shipped HTML/JS.

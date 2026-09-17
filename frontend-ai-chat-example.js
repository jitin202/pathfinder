// Frontend example — call this from your chatbot UI component.
// Replace YOUR_PROJECT_ID and YOUR_REGION with your actual Firebase project details.
// After deploying, Firebase gives you the exact URL — use that instead.

const FUNCTION_URL = "https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/askAI";
// Example: "https://us-central1-backend-for-hackathon.cloudfunctions.net/askAI"

async function askAI(message, history = []) {
  try {
    const response = await fetch(FUNCTION_URL, {
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

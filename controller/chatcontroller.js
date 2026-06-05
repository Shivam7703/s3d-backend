const transporter = require("../config/mailer");
const { genAI, SYSTEM_PROMPT } = require("../config/gemini");

/* ── In-memory session store ── */
const sessions = new Map();

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      id: sessionId,
      history: [],
      collectedData: { name: null, phone: null, email: null, requirement: null },
      lastEmailHash: null,   // duplicate email rokne ke liye
      createdAt: Date.now(),
    });
  }
  return sessions.get(sessionId);
}

// 2 ghante baad purane sessions clean karo
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.createdAt > 2 * 60 * 60 * 1000) sessions.delete(id);
  }
}, 30 * 60 * 1000);

/* ── Lead email — sirf tab bhejo jab naya data aaye ── */
async function sendLeadEmail(sess) {
  const { collectedData, id, history } = sess;

  // Phone ya email dono mein se kuch na ho to mat bhejo
  if (!collectedData.phone && !collectedData.email) return;

  // Duplicate check — same data pe dobara mat bhejo
  const currentHash = JSON.stringify(collectedData);
  if (sess.lastEmailHash === currentHash) return;
  sess.lastEmailHash = currentHash;

  // Sirf user ke messages ki summary
  const chatSummary = history
    .filter(m => m.role === "user")
    .map(m => m.parts[0].text)
    .join(" | ");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:20px 24px;">
        <h1 style="color:white;margin:0;font-size:18px;">🔔 New Lead — S3D Web Solutions</h1>
        <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:12px;">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>
      </div>
      <div style="padding:20px 24px;background:#fff;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr style="background:#f5f3ff;">
            <td style="padding:10px 14px;font-weight:600;color:#6d28d9;width:35%;">👤 Name</td>
            <td style="padding:10px 14px;color:#111827;">${collectedData.name || "—"}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;font-weight:600;color:#1d4ed8;">📞 Phone</td>
            <td style="padding:10px 14px;color:#111827;">${collectedData.phone || "—"}</td>
          </tr>
          <tr style="background:#f5f3ff;">
            <td style="padding:10px 14px;font-weight:600;color:#6d28d9;">✉️ Email</td>
            <td style="padding:10px 14px;color:#111827;">${collectedData.email || "—"}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;font-weight:600;color:#1d4ed8;">💼 Requirement</td>
            <td style="padding:10px 14px;color:#111827;">${collectedData.requirement || "—"}</td>
          </tr>
        </table>
        <div style="margin-top:16px;padding:14px;background:#f9fafb;border-left:3px solid #7c3aed;border-radius:4px;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6d28d9;">💬 Chat Summary (Client Messages)</p>
          <p style="margin:0;font-size:13px;color:#374151;line-height:1.6;">${chatSummary || "No messages"}</p>
        </div>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.Email_user,
      to: process.env.Email_user,
      subject: `🔔 New Lead: ${collectedData.name || "Unknown"} | ${collectedData.phone || collectedData.email}`,
      html,
    });
    console.log(`✅ Lead email sent for session ${id}`);
  } catch (err) {
    console.error("❌ Lead email failed:", err.message);
  }
}

/* ── DATA marker parser ── */
function parseAndUpdateData(sess, rawReply) {
  const match = rawReply.match(/\[DATA:(\{[\s\S]*?\})\]/);
  const cleanReply = rawReply.replace(/\[DATA:\{[\s\S]*?\}\]/g, "").replace(/\[DATA:[^\]]*\]/g, "").trim();

  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      const prev = sess.collectedData;
      let updated = false;

      if (parsed.name        && !prev.name)        { prev.name        = parsed.name;        }
      if (parsed.requirement && !prev.requirement) { prev.requirement = parsed.requirement; }

      // sirf tab email bhejo jab phone ya email naya mile
      const gotPhone = parsed.phone && !prev.phone;
      const gotEmail = parsed.email && !prev.email;

      if (gotPhone) prev.phone = parsed.phone;
      if (gotEmail) prev.email = parsed.email;

      if (gotPhone || gotEmail) sendLeadEmail(sess);
    } catch (e) {
      console.warn("Data parse warning:", e.message);
    }
  }

  return cleanReply;
}

/* ── Gemini with fallback models ── */
// 2.5 pehle try karo, 429/503 pe 1.5 pe fallback
const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash-lite"];

function shouldFallback(err) {
  const msg = err.message || "";
  return (
    msg.includes("503") ||
    msg.includes("429") ||
    msg.includes("overloaded") ||
    msg.includes("high demand") ||
    msg.includes("quota") ||
    msg.includes("Too Many Requests") ||
    msg.includes("rate limit")
  );
}

async function callGeminiWithFallback(history, message) {
  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_PROMPT,
      });
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(message);
      console.log(`✅ Gemini response from: ${modelName}`);
      return result.response.text();
    } catch (err) {
      if (shouldFallback(err)) {
        console.warn(`⚠️ ${modelName} unavailable (${err.message.match(/\d{3}/)?.[0] || "err"}), trying next...`);
        continue;
      }
      throw err; // real error (auth, bad request etc) — rethrow
    }
  }
  throw new Error("All Gemini models are currently unavailable. Please try again in a moment.");
}

/* ── Main controller ── */
const sendChatMessage = async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ success: false, message: "Message should not be empty" });
  }
  if (!sessionId) {
    return res.status(400).json({ success: false, message: "Session ID is required" });
  }

  const sess = getSession(sessionId);

  try {
    sess.history.push({ role: "user", parts: [{ text: message }] });

    const rawReply = await callGeminiWithFallback(
      sess.history.slice(0, -1),  // history without current message
      message
    );

    const cleanReply = parseAndUpdateData(sess, rawReply);
    sess.history.push({ role: "model", parts: [{ text: cleanReply }] });

    return res.status(200).json({ success: true, reply: cleanReply, sessionId });

  } catch (err) {
    // Failed hone pe user message history se hatao
    if (sess.history.at(-1)?.role === "user") sess.history.pop();
    console.error("Gemini Error:", err.message);
    return res.status(503).json({ success: false, message: "AI is busy right now. Please try again in a moment! 🙏" });
  }
};

module.exports = { sendChatMessage };
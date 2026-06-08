const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mailRoutes = require("./routes/mailroutes");
const chatRoutes = require("./routes/chatroutes");
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// api routes
app.use('/api', mailRoutes);
app.use("/api", chatRoutes);

// server listen
app.listen(port, async () => {
  console.log(`server running on ${port}`);

  // 🔍 ENVIRONMENT VARIABLES CHECK (Sirf debug karne ke liye)
  const emailUser = process.env.EMAIL_USER; // Aapke config file ke hisab se 'EMAIL_USER' (E bada)
  const emailPass = process.env.EMAIL_PASS; // Aapke config file ke hisab se 'EMAIL_PASS' (E bada)

  console.log("--- Environment Variables Check ---");
  console.log(`Email User: ${emailUser ? emailUser : "❌ NOT FOUND (Undefined)"}`);
console.log("Resend Key:", process.env.RESEND_API_KEY);

  // Keep-alive ping — Render free tier ko jaag ta rakhega
  const BACKEND_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
  setInterval(async () => {
    try {
      await fetch(BACKEND_URL);
      console.log("Keep-alive ping sent");
    } catch (e) {
      console.log("Keep-alive failed:", e.message);
    }
  }, 14 * 60 * 1000);
});
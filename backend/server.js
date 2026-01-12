import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import http from "http";
import { WebSocketServer } from "ws";
import mongoose from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";
import User from "./models/User.js";

dotenv.config();
const PORT = process.env.PORT || 5000;

console.log("🔥 Resume Analyzer Server starting...");

// ========================
// MongoDB
// ========================
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// ========================
// Express App
// ========================
const app = express();
app.use(cors());
app.use(express.json());
import authRoutes from "./routes/auth.js";
app.use("/api/auth", authRoutes);


// HTTP server for WS
const server = http.createServer(app);

// ========================
// DASHBOARD DATA (GLOBAL)
// ========================
let dashboardData = {
  resumes: 0,
  interviews: 0,
  courses: 0,
  skills: 0,
  activities: [],
};

// ==========================================
// HELPER: Add activity to global memory
// ==========================================
function addActivity(action, icon, color, userEmail = null) {
  const entry = {
    action,
    time: new Date().toLocaleString(),
    icon,
    color,
    user: userEmail,
  };

  dashboardData.activities.unshift(entry);
  if (dashboardData.activities.length > 20) dashboardData.activities.pop();

  return entry;
}

// ==========================================
// HELPER: Broadcast dashboard to all clients
// ==========================================
function broadcastAll(wss) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(
        JSON.stringify({
          type: "dashboard_update",
          payload: dashboardData,
        })
      );
    }
  });
}

// ========================
// WebSocket Server
// ========================
const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  console.log("🟢 WS client connected");

  // Send global dashboard to new client
  socket.send(
    JSON.stringify({
      type: "dashboard_update",
      payload: dashboardData,
    })
  );

  socket.on("message", async (msg) => {
    try {
      const data = JSON.parse(msg);

      // 1️⃣ Join event → Send user-specific stats
      if (data.type === "join") {
        const userEmail = data.user;

        if (userEmail) {
          const userDoc = await User.findOne({ email: userEmail });
          if (userDoc) {
            socket.send(
              JSON.stringify({
                type: "user_stats",
                payload: userDoc.stats,
              })
            );
          }
        }
        return;
      }

      // 2️⃣ Activity event (from frontend)
      if (data.type === "activity") {
  const { action, icon, iconName, color, user } = data.payload;

  // Normalize icons (frontend sometimes sends iconName, sometimes icon)
  const finalIcon = icon || iconName || "Activity";

  // Create activity entry
  const entry = addActivity(action, finalIcon, color, user);

  // Save in user document (MongoDB)
  if (user) {
    await User.updateOne(
      { email: user },
      {
        $push: {
          "stats.activities": { $each: [entry], $position: 0 }
        }
      }
    );
  }

  // Send activity to ALL connected clients (LIVE update)
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: "activity", payload: entry }));
    }
  });

  // Also send updated dashboard
  broadcastAll(wss);

  return;
}




      // 3️⃣ Increment event
      if (data.type === "increment") {
  const { key, amount, user } = data.payload;

  // Update global (you may keep this or remove)
  if (dashboardData[key] !== undefined) {
    dashboardData[key] += amount;
  }

  // Update user stats
  let updatedUser = null;
  if (user) {
    updatedUser = await User.findOneAndUpdate(
      { email: user },
      { $inc: { [`stats.${key}`]: amount } },
      { new: true }
    );
  }

  // Send updated stats ONLY to this user
  socket.send(
    JSON.stringify({
      type: "user_stats",
      payload: updatedUser?.stats || {}
    })
  );

  // Broadcast only global activity (optional)
  broadcastAll(wss);

  return;
}

    } catch (err) {
      console.error("❌ WS message error:", err);
    }
  });

  socket.on("close", () => console.log("🔴 WS client disconnected"));
});

// ========================
// File Upload
// ========================
const upload = multer({ storage: multer.memoryStorage() });

// ========================
// Gemini Setup
// ========================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// =============================================
// GEMINI — Extract Text from PDF/DOCX
// =============================================
async function extractTextWithGemini(buffer, mimeType) {
  const resp = await model.generateContent([
    {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType,
      },
    },
    {
      text: "Extract ALL text from the document. Return ONLY raw text, no explanation.",
    },
  ]);

  return resp.response.text();
}

// =============================================
// GEMINI — Resume Analysis
// =============================================
async function analyzeResumeText(text) {
  const prompt = `
Analyze the resume below and return STRICT JSON only.

Resume:
${text}

Return EXACT JSON:
{
  "score": number,
  "strengths": [],
  "weaknesses": [],
  "improvements": [],
  "missing_elements": [],
  "formatting_issues": [],
  "keywords": [],
  "job_fit_suggestion": ""
}
`;

  const resp = await model.generateContent(prompt);
  let raw = resp.response.text().replace(/```json|```/g, "").trim();

  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");

  raw = raw.slice(first, last + 1);
  return JSON.parse(raw);
}

// =============================
// API — Resume Analyzer
// =============================
app.post("/api/analyze", upload.single("resume"), async (req, res) => {
  try {
    const file = req.file;
    const userEmail = req.headers["x-user-email"] || null;

    if (!file) return res.status(400).json({ message: "No file uploaded" });

    console.log("📥 File received:", file.originalname);

    // 1️⃣ Extract text using Gemini
    const rawText = await extractTextWithGemini(file.buffer, file.mimetype);

    const cleanText = rawText
      .replace(/\s+/g, " ")
      .replace(/[\u0000-\u001F]+/g, "")
      .trim();

    if (!cleanText || cleanText.length < 20) {
      return res.status(400).json({ message: "Text extraction failed" });
    }

    // 2️⃣ AI analysis
    const analysis = await analyzeResumeText(cleanText);

    // 3️⃣ Log activity
    const activity = addActivity(
      "Analyzed Resume",
      "Upload",
      "text-blue-400",
      userEmail
    );

    dashboardData.resumes += 1;
    wss.clients.forEach((client) => {
  if (client.readyState === 1) {
    client.send(JSON.stringify({
      type: "dashboard_update",
      payload: dashboardData
    }));
  }
});


    // Save to user stats
    if (userEmail) {
      await User.updateOne(
        { email: userEmail },
        {
          $inc: { "stats.resumes": 1 },
          $push: { "stats.activities": { $each: [activity], $position: 0 } },
        }
      );
    }

    broadcastAll(wss);

    res.status(200).json({ analysis });
  } catch (err) {
    console.error("❌ ANALYSIS ERROR:", err);
    res.status(500).json({
      message: "AI analysis failed",
      error: err.message,
    });
  }
});

// ========================
// Start
// ========================
server.listen(PORT, () =>
  console.log(`🚀 Backend + WS running on port ${PORT}`)
);

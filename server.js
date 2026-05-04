// ═══════════════════════════════════════════════════════════
//  NEXUS AI STUDIO — Backend Server
//  Node.js + Express | Secure | Rate-Limited | Multi-Model
// ═══════════════════════════════════════════════════════════

import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "path";

import { fileURLToPath } from "url";

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// ── Security: body size limit ───────────────────────────────
app.use(express.json({ limit: "12kb" }));
app.use(express.urlencoded({ extended: false }));

// ── CORS: allow local + LAN requests (for Android WebView) ──
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    callback(null, true);
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-api-key"],
  credentials: false,
}));

app.options('*', cors());

// ── Rate limiting ───────────────────────────────────────────
// Global limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min window
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment." },
});

// Stricter limiter for chat endpoint
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 min window
  max: 15,
  message: { error: "Chat rate limit hit. Max 15 messages per minute." },
});

app.use(globalLimiter);

// ── Allowed models ──────────────────────────────────────────
const ALLOWED_MODELS = new Set([
  "google/gemini-2.0-flash-001",
  "google/gemini-flash-1.5",
  "deepseek/deepseek-chat",
  "mistralai/mistral-7b-instruct",
  "meta-llama/llama-3-8b-instruct",
  "anthropic/claude-3-haiku",
]);

// ── Frontend auth key ───────────────────────────────────────
const FRONTEND_KEY = process.env.FRONTEND_KEY || "nexus-client-key";

// ── Auth middleware ─────────────────────────────────────────
function requireKey(req, res, next) {
  if (req.headers["x-api-key"] !== FRONTEND_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ── Serve the WebView HTML directly ────────────────────────
// This lets you open http://YOUR_IP:8080 on Android to use the app
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  const indexPath = path.join(__dirname, "public", "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) res.json({ message: "Nexus AI Backend running ✅" });
  });
});

// ── Health check ────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    version: "1.0.0",
    models: [...ALLOWED_MODELS],
    timestamp: new Date().toISOString(),
  });
});

// ── Models list ──────────────────────────────────────────────
app.get("/api/models", requireKey, (req, res) => {
  res.json({ models: [...ALLOWED_MODELS] });
});

// ── Main Chat endpoint ──────────────────────────────────────
app.post("/api/chat", requireKey, chatLimiter, async (req, res) => {
  try {
    const { model, messages, systemPrompt, temperature, maxTokens } = req.body;

    // Validate
    if (!model || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Invalid request: model and messages are required." });
    }
    if (!ALLOWED_MODELS.has(model)) {
      return res.status(403).json({ error: `Model '${model}' is not allowed.` });
    }

    // Sanitize messages
    const cleanMessages = messages
      .filter(m => m.role && m.content && typeof m.content === "string")
      .map(m => ({ role: m.role, content: m.content.substring(0, 8000) }))
      .slice(-20); // Max 20 turns context

    // Build full messages array with optional system prompt
    const fullMessages = systemPrompt
      ? [{ role: "system", content: String(systemPrompt).substring(0, 2000) }, ...cleanMessages]
      : cleanMessages;

    // Call OpenRouter
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_REFERER || "https://nexus-ai-studio.app",
        "X-Title": "Nexus AI Studio",
      },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        max_tokens: Math.min(Number(maxTokens) || 2000, 4000),
        temperature: Math.min(Math.max(Number(temperature) || 0.7, 0), 1),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[OpenRouter Error]", data);
      return res.status(502).json({
        error: data?.error?.message || "Upstream AI service error",
      });
    }

    // Return clean response
    return res.json({
      choices: data.choices,
      model: data.model,
      usage: data.usage,
    });

  } catch (err) {
    console.error("[Server Error]", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Code generation endpoint (builder) ─────────────────────
app.post("/api/generate", requireKey, chatLimiter, async (req, res) => {
  try {
    const { prompt, language, model } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt required" });

    const targetModel = ALLOWED_MODELS.has(model)
      ? model
      : "google/gemini-2.0-flash-001";

    const systemPrompt = `You are an expert ${language || "software"} developer.
Return ONLY clean, production-ready code.
Include brief inline comments explaining key parts.
Do NOT include markdown code fences, explanations, or preambles outside of code comments.
Detect the programming language from the request automatically.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_REFERER || "https://nexus-ai-studio.app",
        "X-Title": "Nexus AI Studio",
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt.substring(0, 3000) },
        ],
        max_tokens: 3000,
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: data?.error?.message || "Error" });

    let code = data.choices?.[0]?.message?.content || "";
    // Strip any markdown fences just in case
    code = code.replace(/```[\w]*\n?/g, "").replace(/```/g, "").trim();

    return res.json({ code, model: data.model });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── 404 handler ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Global error handler ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[Unhandled Error]", err.message);
  res.status(500).json({ error: "Server error" });
});

// ── Start ───────────────────────────────────────────────────
// Change this line at the bottom:
const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Server running on port ${PORT}`);
});
╔══════════════════════════════════════════╗
║       NEXUS AI STUDIO — Backend          ║
╠══════════════════════════════════════════╣
║  Status  : ✅ Running                    ║
║  Port    : ${PORT}                           ║
║  Host    : ${HOST} (LAN accessible)    ║
╠══════════════════════════════════════════╣
║  Endpoints:                              ║
║  GET  /api/health    — status check      ║
║  GET  /api/models    — list models       ║
║  POST /api/chat      — AI conversation   ║
║  POST /api/generate  — code generation   ║
╚══════════════════════════════════════════╝

  Open on Android: http://YOUR_LAN_IP:${PORT}
  Find your IP with: ipconfig / ifconfig
  `);
});
OST /api/chat      — AI conversation   ║
║  POST /api/generate  — code generation   ║
╚══════════════════════════════════════════╝

  Open on Android: http://YOUR_LAN_IP:${PORT}
  Find your IP with: ipconfig / ifconfig
  `);
});

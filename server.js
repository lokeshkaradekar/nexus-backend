import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));

// Open CORS for WebView + browser
app.use(cors());
app.options("*", cors());

// Rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: "Too many requests" },
});
app.use(limiter);

// ── Auth middleware ─────────────────────────────────────────
const FRONTEND_KEY = process.env.FRONTEND_KEY || "nexus-client-key";

function auth(req, res, next) {
  if (req.headers["x-api-key"] !== FRONTEND_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ── Allowed models ──────────────────────────────────────────
const ALLOWED_MODELS = [
  "google/gemini-2.0-flash-001",
  "google/gemini-flash-1.5",
  "deepseek/deepseek-chat",
  "mistralai/mistral-7b-instruct",
  "meta-llama/llama-3-8b-instruct",
];

// ── Routes ──────────────────────────────────────────────────

// Health check — no auth needed
app.get("/api/health", (req, res) => {
  res.json({ status: "online", version: "1.0.0" });
});

// Models list
app.get("/api/models", auth, (req, res) => {
  res.json({ models: ALLOWED_MODELS });
});

// Chat
app.post("/api/chat", auth, async (req, res) => {
  try {
    const { model, messages, systemPrompt } = req.body;

    if (!model || !Array.isArray(messages)) {
      return res.status(400).json({ error: "model and messages required" });
    }

    if (!ALLOWED_MODELS.includes(model)) {
      return res.status(403).json({ error: "Model not allowed" });
    }

    const fullMessages = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : messages;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://nexus-ai-studio.app",
        "X-Title": "Nexus AI Studio",
      },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[OpenRouter Error]", data);
      return res.status(502).json({ error: data?.error?.message || "AI error" });
    }

    return res.json(data);

  } catch (err) {
    console.error("[Chat Error]", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Code generate
app.post("/api/generate", auth, async (req, res) => {
  try {
    const { prompt, model } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt required" });

    const useModel = ALLOWED_MODELS.includes(model)
      ? model
      : "google/gemini-2.0-flash-001";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://nexus-ai-studio.app",
        "X-Title": "Nexus AI Studio",
      },
      body: JSON.stringify({
        model: useModel,
        messages: [
          {
            role: "system",
            content: "Return ONLY clean code with inline comments. No markdown fences.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 3000,
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: data?.error?.message });

    let code = data.choices?.[0]?.message?.content || "";
    code = code.replace(/```[\w]*\n?/g, "").replace(/```/g, "").trim();

    return res.json({ code });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Nexus AI Backend running on port ${PORT}`);
});
 20 turns context

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

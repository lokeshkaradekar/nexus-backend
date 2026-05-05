# 🔺 NEXUS AI STUDIO

<div align="center">

![Nexus AI Studio](https://img.shields.io/badge/NEXUS-AI%20STUDIO-FF6B1A?style=for-the-badge&logo=android&logoColor=white)
![Version](https://img.shields.io/badge/VERSION-1.0.0-00FF9C?style=for-the-badge)
![Platform](https://img.shields.io/badge/PLATFORM-ANDROID-00D4FF?style=for-the-badge&logo=android)
![Backend](https://img.shields.io/badge/BACKEND-RAILWAY-9D4EDD?style=for-the-badge)

**Your all-in-one AI-powered Android studio.**  
Chat with AI, build apps, generate code, and monitor your device — all from one app.

[⬇️ Download APK](#-download) • [🚀 Features](#-features) • [⚙️ Setup](#-setup) • [🔧 Troubleshooting](#-troubleshooting)

</div>

---

## ⬇️ Download

| Version | Date | Size | Link |
|---------|------|------|------|
| v1.0.0 | May 2026 | ~5MB | [📥 Download APK](../../releases/latest) |

> **Install tip:** Enable "Install from unknown sources" in Android Settings → Security before installing.

---

## ✨ Features

| Tab | Feature |
|-----|---------|
| 💬 **Chat** | Multi-model AI chat — Gemini 2.0, DeepSeek, Mistral |
| 🧰 **Tools** | 10+ AI tools — Android builder, debugger, security audit |
| 🏗️ **Build** | Generate Android XML, Java, React, Node.js, Python code |
| 📱 **Device** | Live battery, RAM, CPU, temperature, storage monitor |
| ⚙️ **Config** | Set backend URL, API key, theme preferences |

---

## 📱 Screenshots

> Coming soon — contribute screenshots via Pull Request!

---

## ⚙️ Setup

### Option A — Just use the APK (Recommended)
1. Download the APK from the link above
2. Install on your Android device
3. Open the app — it connects to the live backend automatically
4. Start chatting! ✅

### Option B — Run your own backend
If you want to host your own backend:

```bash
# 1. Clone this repo
git clone https://github.com/lokeshkaradekar/nexus-backend.git
cd nexus-backend

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# Edit .env and add your OpenRouter API key

# 4. Start server
node server.js
```

Get a free API key at [openrouter.ai](https://openrouter.ai)

---

## 🌐 Network Requirements

The app needs internet to talk to the AI backend.

### If the app shows "Failed to fetch":

**Fix 1 — Set Private DNS (Recommended)**
1. Go to **Settings** on your Android phone
2. Search for **"Private DNS"**
3. Select **"Private DNS provider hostname"**
4. Type: `dns.google`
5. Tap **Save**
6. Reopen the app ✅

> This uses Google's DNS which reliably resolves cloud server domains.

**Fix 2 — Try mobile data**
- Switch from WiFi to mobile data and try again
- Some WiFi networks block cloud service domains

**Fix 3 — Check Config tab**
- Open app → **CONFIG** tab ⚙️
- Set Backend URL to:
  ```
  https://nexus-backend-production-ee01.up.railway.app
  ```
- Set Client Key to:
  ```
  nexus-client-key
  ```
- Tap **💾 Save Settings**

---

## 🔧 Troubleshooting

| Problem | Fix |
|---------|-----|
| App won't install | Enable "Unknown sources" in Settings → Security |
| "Failed to fetch" | Set Private DNS to `dns.google` (see above) |
| White screen on open | Wait 3-5 seconds for WebView to load |
| AI not responding | Check internet connection, try Config tab |
| Slow responses | Normal — AI models take 3-10 seconds |
| App crashes | Clear app data, reinstall APK |

---

## 🤖 AI Models Available

| Model | Best For |
|-------|----------|
| **Gemini 2.0 Flash** | Fast, general purpose, code generation |
| **DeepSeek Chat** | Deep reasoning, complex problems |
| **Mistral 7B** | Lightweight, quick responses |

---

## 🏗️ Tech Stack

```
Frontend  →  HTML + CSS + JavaScript (WebView)
Backend   →  Node.js + Express
AI        →  OpenRouter API
Hosting   →  Railway.app
Android   →  Sketchware + WebView
```

---

## 🔒 Privacy & Security

- ✅ No user data stored on servers
- ✅ API key never exposed to frontend
- ✅ Rate limiting prevents abuse
- ✅ All AI requests go through secure backend
- ✅ HTTPS encrypted connections

---

## 📡 Backend API

The backend is open for developers:

```
GET  /api/health    — Check server status
GET  /api/models    — List available AI models  
POST /api/chat      — Send AI chat message
POST /api/generate  — Generate code
```

All endpoints except `/api/health` require header:
```
x-api-key: nexus-client-key
```

---

## 🤝 Contributing

1. Fork this repo
2. Make your changes
3. Submit a Pull Request

Ideas welcome — new tools, UI improvements, bug fixes!

---

## 📄 License

MIT License — free to use, modify and distribute.

---

<div align="center">

**Built with ❤️ using Sketchware + Node.js + OpenRouter**

⭐ Star this repo if you find it useful!

</div>

# 🌐 CN Console

**Version:** 1.1.0  
**Last Updated:** Tuesday Dec 23, 2025

---

## Trustee Quick Start (Plain English)

- **Open it**: Start **Quick Server**, then open the URL shown as **`Main:`** in the terminal. CN Console is usually at **`/`** (root) or **`/cn-console`**.
- **Note**: This repo is a **mirror**. The main version lives in **[ContributionNetwork](https://github.com/marvelousempire/ContributionNetwork)** under `console/`.

## What Is This?

**CN Console** is the main control center for the Contribution Network.

Think of it as a dashboard that shows you everything available in "The Briefcase" — our collection of apps, tools, and documents. From here, you can see all the apps, open them, check their status, and manage the whole system.

> **Note:** This repo (`cn-console`) is a mirror. The main version lives inside the [ContributionNetwork](https://github.com/marvelousempire/ContributionNetwork) repo at `console/`.

---

## What Can It Do?

| Tab | What It Does |
|-----|--------------|
| 🏠 **Overview** | See the whole Contribution Network at a glance |
| 📚 **Library** | Browse all apps, tools, and documents in The Briefcase |
| 🤖 **AI** | Chat with AI using Open WebUI (local, private AI) |
| 🖥️ **Consoles** | See and open all available consoles |
| ⚙️ **Settings** | Change how the console works for you |

---

## 🤖 AI Chat (Built In)

CN Console has a built-in AI chat that uses [Open WebUI](https://github.com/open-webui/open-webui):

- **Private** — Runs on your own computer, not the cloud
- **Smart** — Uses Ollama to run AI models like Llama 3.2
- **Easy** — Just click the AI tab to start chatting

### How to Set Up AI

Run this command to install everything:
```bash
node slices/slice-runner.js run slices/flows/setup-open-webui.yaml
```

---

## How to Use It

### Option 1: Open Through Quick Server

If you have Quick Server running:
```
http://localhost:8001/cn-console
```

### Option 2: Open the File Directly

Double-click `index.html` to open in your browser (some features need a server).

---

## 🛂 Passport (Identity Card)

CN Console has a "passport" file that tells the system who it is:

**Passport:** `passport-cn-console.json`

```json
{
  "udin": "CONSOLE-CN-20251223120000",
  "name": "CN Console",
  "type": "console"
}
```

This lets CN Console:
- Run on its own as a full app
- Load inside other apps as a part (called a "cartridge")
- Update easily without breaking anything

---

## Related Apps

- [Quick Server](https://github.com/marvelousempire/quick-server) — The platform that hosts CN Console
- [Actions Console](https://github.com/marvelousempire/actions-console) — Run automated tasks
- [Open WebUI](https://github.com/open-webui/open-webui) — The AI chat interface
- [Contribution Network](https://github.com/marvelousempire/ContributionNetwork) — The master registry

---

**In Good Faith With Clean Hands**

*CN Console v1.1.0*

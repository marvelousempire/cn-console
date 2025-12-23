# CN Console

> **Canonical home (do updates here):** `ContributionNetwork/console/` inside the `ContributionNetwork` repo.  
> This `cn-console` repo is **legacy** and should be treated as a historical mirror to avoid drift.

**Version:** 1.1.0  
**Last Updated:** Tuesday Dec 23, 2025

CN Console is a SundayApp-based console for managing **The Briefcase** — the complete ecosystem containing all Consoles, Cartridges, Apps, Pages, Components, Handbooks, and Frameworks.

Inside The Briefcase exists an **Operating System called "Contribution Network"** (CN) that orchestrates and manages all contributions. This console provides the interface for managing that Operating System.

---

## 🤖 AI Tab (Open WebUI Integration)

The **AI Tab** embeds [Open WebUI](https://github.com/open-webui/open-webui) — a full-featured ChatGPT-like interface for local AI:

- **Ollama Integration** — Chat with llama3.2 and other local models
- **Full-Screen Mode** — Open in new tab for distraction-free AI chat
- **Status Indicator** — Shows connection status to Open WebUI
- **Auto-Detection** — Dynamically connects to Open WebUI on port 3000

### Requirements
- Open WebUI Docker container running on port 3000
- Ollama with at least one model installed

Deploy with one command via [Actions Console](https://github.com/marvelousempire/actions-console):
```bash
node slices/slice-runner.js run slices/flows/setup-open-webui.yaml
```

---

## 📚 The Briefcase Library

The CN Console includes **The Briefcase Library** — a comprehensive modal (similar to Elementor Library) that shows a full arsenal of everything available in The Briefcase. Access it via the **📚 Library** FAB button (bottom-left).

The Library displays:
- All Consoles
- All Cartridges  
- All Apps
- All Pages
- All Components
- All Handbooks
- All Frameworks
- Everything in TheBriefcase.App

See [THE-BRIEFCASE.md](./docs/THE-BRIEFCASE.md) for complete documentation.

---

## 🔗 Related Projects

- [Quick Server](https://github.com/marvelousempire/quick-server) — Main platform hosting CN Console
- [Actions Console](https://github.com/marvelousempire/actions-console) — Slice Flow automation
- [Open WebUI](https://github.com/open-webui/open-webui) — AI interface embedded in AI tab
- [Contribution Network](https://github.com/marvelousempire/ContributionNetwork) — Registry of all contributions

---

## 🛂 Passport System

CN Console uses the **Passport System** for universal identity and loading. Its passport file enables it to be:

- Run as a **standalone Console**
- Loaded as a **Cartridge** in other consoles (like Quick Server)
- **Hot-swapped** between versions

**Passport File:** `passport-cn-console.json`

```json
{
  "udin": "CONSOLE-CN-20251223120000",
  "name": "CN Console",
  "type": "console",
  "framework": "sundayapp",
  "source": "./console"
}
```

See [ContributionNetwork/docs/PASSPORT-SYSTEM.md](https://github.com/marvelousempire/ContributionNetwork/docs/PASSPORT-SYSTEM.md) for full documentation.

---

## Hosting / API expectations

Some UI elements are designed to integrate with Quick Server's host APIs:

- **Version modal add-on**: uses `GET /api/git/version` and `GET /api/git/log` (and will fall back if those endpoints don't exist).
- **AI Tab**: connects to Open WebUI on port 3000 (same hostname as CN Console).

If you open this console as static files (without Quick Server), those endpoints won't exist, and version UI will fall back.

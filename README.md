# CN Console

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

## Hosting / API expectations

Some UI elements are designed to integrate with Quick Server's host APIs:

- **Version modal add-on**: uses `GET /api/git/version` and `GET /api/git/log` (and will fall back if those endpoints don't exist).
- **AI Tab**: connects to Open WebUI on port 3000 (same hostname as CN Console).

If you open this console as static files (without Quick Server), those endpoints won't exist, and version UI will fall back.

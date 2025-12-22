# CN Console

CN Console is a SundayApp-based console for managing **The Briefcase** — the complete ecosystem containing all Consoles, Cartridges, Apps, Pages, Components, Handbooks, and Frameworks.

Inside The Briefcase exists an **Operating System called "Contribution Network"** (CN) that orchestrates and manages all contributions. This console provides the interface for managing that Operating System.

## The Briefcase Library

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

## Hosting / API expectations

Some UI elements are designed to integrate with Quick Server’s host APIs:

- **Version modal add-on**: uses `GET /api/git/version` and `GET /api/git/log` (and will fall back if those endpoints don’t exist).

If you open this console as static files (without Quick Server), those endpoints won’t exist, and version UI will fall back.

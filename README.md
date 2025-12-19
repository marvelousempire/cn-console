# CN Console

CN Console is a SundayApp-based console intended to be hosted by **Quick Server**.

## Hosting / API expectations

Some UI elements are designed to integrate with Quick Server’s host APIs:

- **Version modal add-on**: uses `GET /api/git/version` and `GET /api/git/log` (and will fall back if those endpoints don’t exist).

If you open this console as static files (without Quick Server), those endpoints won’t exist, and version UI will fall back.

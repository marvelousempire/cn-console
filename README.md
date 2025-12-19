# CN Console

CN Console is a SundayApp-based console intended to be hosted by **Quick Server**.

## Hosting / API expectations

Some UI elements are designed to integrate with Quick Server’s host APIs:

- **Header version pill**: calls `GET /api/git/version` to display the running host version/commit.
- **Settings → Version modal**: uses `GET /api/git/version` and `GET /api/git/log` for vitals/changelog.

If you open this console as static files (without Quick Server), those endpoints won’t exist, and the version UI will fall back (e.g. showing `v0`).

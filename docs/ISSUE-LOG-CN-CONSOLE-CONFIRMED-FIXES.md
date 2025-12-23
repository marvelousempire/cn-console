# CN Console Issue Log

**Created:** Monday Dec 22, 2025  
**Last Updated:** Monday Dec 22, 2025

This document tracks issues encountered in the CN Console and their resolutions for future reference.

> **See Also:** Quick Server maintains its own issue log at `quick-server/docs/ISSUE-LOG-QUICK-SERVER-CONFIRMED-FIXES.md` for server-side issues.

---

## Issue #001: Console Startup Failure - Block Scoping Bug

**Date Discovered:** Monday Dec 22, 2025  
**Date Resolved:** Monday Dec 22, 2025  
**Severity:** Critical  
**Status:** ✅ Resolved  
**Confirmed By:** User

### Symptoms

- CN Console failed to start
- Error displayed: "CN Console failed to start - A startup error occurred"
- Browser console showed error at `cn-boot.js:442` (or similar line number)
- Error: `Sunday.init(config)` failed because `config` was undefined

### Root Cause

**JavaScript Block Scoping Issue**

The variables `config` and `AuthGuard` were declared using `const` inside a try-catch block:

```javascript
// ❌ WRONG - Variables only exist inside this block
try {
  const { default: config } = await import('./../app.config.js');
  const { AuthGuard } = await import('/sundayapp/core/auth-guard.js');
} catch (importError) {
  throw importError;
}

// ❌ config and AuthGuard are UNDEFINED here due to block scoping!
await Sunday.init(config);  // ReferenceError: config is not defined
```

In JavaScript, `const` and `let` have **block scope**, meaning they only exist within the `{}` block where they're declared. Unlike `var` which has function scope, these variables disappear after the try-catch block ends.

### Solution

Hoist variable declarations to function scope:

```javascript
// ✅ CORRECT - Variables declared at function scope
let config, AuthGuard;

try {
  const configModule = await import('./../app.config.js');
  config = configModule.default;  // Assign to function-scoped variable
  
  const authGuardModule = await import('/sundayapp/core/auth-guard.js');
  AuthGuard = authGuardModule.AuthGuard;  // Assign to function-scoped variable
} catch (importError) {
  throw importError;
}

// ✅ config and AuthGuard are available here
await Sunday.init(config);  // Works correctly
```

### Files Changed

| File | Change |
|------|--------|
| `js/cn-boot.js` | Hoisted `config` and `AuthGuard` declarations to function scope |
| `index.html` | Updated cache-buster from `v=20251222a` to `v=20251222b` |

### Prevention Guidelines

1. **Always declare variables at function scope** if they need to be used after a try-catch block
2. **Use `let` instead of `const`** for variables that will be assigned inside a block but used outside
3. **Test module imports** by verifying the imported values are in scope where they're used
4. **Remember the scoping rules:**
   - `var` = function scope
   - `let` / `const` = block scope
   - ES6 module imports with destructuring inside blocks = block scope

### Related Commit

See `GIT-COMMITS.md` for the full commit message.

---

## Issue #002: AI Tab Does Nothing - Multiple Issues

**Date Discovered:** Monday Dec 22, 2025  
**Date Resolved:** Tuesday Dec 23, 2025  
**Severity:** High  
**Status:** 🔄 Pending Confirmation  
**Confirmed By:** Pending

### Symptoms

- Clicking the AI tab in CN Console showed nothing or a broken iframe
- After rewrite to standalone chat, interface "shows up but does not do anything"
- User reported: "AI Tab is junk and does not work"

### Root Cause

**Multiple Issues Found:**

1. **Iframe Embedding Broken** - Complex cartridges with own JavaScript don't work in iframes

2. **Wrong API Endpoints** - After rewrite, code was calling:
   - `/api/ollama/status` ❌ (doesn't exist)
   - `/api/ollama/models` ❌ (doesn't exist)
   
   Correct endpoints are:
   - `/api/ai/status` ✅ (returns Ollama status AND models)
   - `/api/ai/chat` ✅ (chat endpoint - this was correct)

3. **API Requires Auth** - The `/api/ai/*`, `/api/ollama/*`, and `/api/rag/*` endpoints were NOT in Quick Server's `PUBLIC_API_PREFIXES` list, causing:
   ```json
   {"error":"Authorization required"}
   ```

4. **Wrong Response Parsing** - Response format is `{ success: true, content: "..." }` but code looked for `data.response`

### Solution

**Two-Part Fix Across Both Repositories:**

**Quick Server (`server/index.js`):**
```javascript
// Added to PUBLIC_API_PREFIXES:
'/api/ai',      // AI chat endpoints
'/api/ollama',  // Ollama status/models  
'/api/rag',     // RAG context endpoints
```

**CN Console (`html/ai.html`):**
```javascript
// ❌ WRONG
const res = await fetch('/api/ollama/status');
addMessage(data.response || data.content, 'assistant');

// ✅ CORRECT
const res = await fetch('/api/ai/status');
if (data.success && data.content) {
  addMessage(data.content, 'assistant');
}
```

### Files Changed

| File | Change |
|------|--------|
| `html/ai.html` | Complete rewrite + correct API endpoints |
| `app.config.js` | Updated cache-buster to v=20251222e |
| `quick-server/server/index.js` | Added AI endpoints to PUBLIC_API_PREFIXES |

### Prevention Guidelines

1. **Verify endpoints exist** before wiring UI - test with curl first
2. **Check authentication** - use browser DevTools Network tab to catch 401s
3. **Test functionality** not just loading - actually send a message
4. **Document public vs authenticated** endpoints clearly

### Final Solution: Open WebUI Integration

User requested a full-featured AI interface like [Open WebUI](https://github.com/open-webui/open-webui). Deployed Open WebUI Docker container:

```bash
docker run -d \
  -p 3000:8080 \
  --add-host=host.docker.internal:host-gateway \
  -v open-webui:/app/backend/data \
  --name open-webui \
  --restart always \
  ghcr.io/open-webui/open-webui:main
```

Updated AI tab to embed Open WebUI in an iframe with:
- Dynamic host detection (uses same hostname, port 3000)
- Loading state with spinner
- Fallback UI if Open WebUI is offline
- Status indicator (Connected/Offline)
- Full Screen button to open in new tab
- Refresh button

### Related Commits

```
quick-server: fix: add AI/Ollama/RAG endpoints to public API list (114c6bc4)
cn-console: fix: AI tab now uses correct API endpoints (802ff91)
cn-console: feat: AI tab now embeds Open WebUI (5abf1d0)
```

---

## Template for New Issues

```markdown
## Issue #XXX: [Brief Title]

**Date Discovered:** [Date]  
**Date Resolved:** [Date or "Pending"]  
**Severity:** [Critical/High/Medium/Low]  
**Status:** [✅ Resolved / 🔄 In Progress / ❌ Not Started]

### Symptoms

[What the user sees / experiences]

### Root Cause

[Technical explanation of why it happened]

### Solution

[How it was fixed]

### Files Changed

| File | Change |
|------|--------|
| `file.js` | Description of change |

### Prevention Guidelines

[How to prevent this in the future]
```

---


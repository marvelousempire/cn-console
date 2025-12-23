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

## Issue #002: AI Tab Does Nothing - Iframe Embed Broken

**Date Discovered:** Monday Dec 22, 2025  
**Date Resolved:** Monday Dec 22, 2025  
**Severity:** High  
**Status:** 🔄 Pending Confirmation  
**Confirmed By:** Pending

### Symptoms

- Clicking the AI tab in CN Console showed nothing or a broken iframe
- AI Console cartridge not loading or not functional when embedded
- User reported: "AI Tab is junk and does not work"

### Root Cause

**Iframe Embedding Doesn't Work for Complex Cartridges**

The initial attempt to fix this by changing the iframe path still didn't work because:
1. Complex cartridges with their own JavaScript modules don't work well in iframes
2. The cartridge expected to be the main page, not embedded
3. Authentication and API calls had cross-origin issues in iframe context

### Solution

**Complete Rewrite** - Replaced the broken iframe embed with a functional standalone AI chat page:

```html
<!-- ❌ WRONG - Iframe embed doesn't work for complex cartridges -->
<iframe src="/cartridges/ai-console/index.html"></iframe>

<!-- ✅ CORRECT - Standalone functional chat interface -->
<div class="sunday-card">
  <!-- Full chat interface with direct API calls -->
</div>
```

The new AI page includes:
- Direct connection to `/api/ai/chat` and `/api/ollama` endpoints
- Working chat interface with message history
- Ollama connection status indicator
- Dynamic model loading from available models
- RAG context toggle
- Quick action buttons for common questions
- Link to full AI Console for advanced features

### Files Changed

| File | Change |
|------|--------|
| `html/ai.html` | Complete rewrite from iframe to functional chat interface |
| `app.config.js` | Updated cache-buster |

### Prevention Guidelines

1. **Don't use iframes** for complex cartridges with their own JavaScript
2. **Create standalone pages** that directly integrate with APIs
3. **Test functionality** not just loading - ensure features actually work
4. **Link to full consoles** for advanced features instead of embedding

### Related Commits

```
fix: AI tab now loads AI Console cartridge from correct path (initial attempt)
fix: replace broken AI iframe with functional chat interface (complete fix)
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


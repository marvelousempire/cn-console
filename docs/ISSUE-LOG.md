# CN Console Issue Log

**Created:** Monday Dec 22, 2025  
**Last Updated:** Monday Dec 22, 2025

This document tracks issues encountered in the CN Console and their resolutions for future reference.

> **See Also:** Quick Server maintains its own issue log at `quick-server/docs/ISSUE-LOG.md` for server-side issues.

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


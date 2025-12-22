# Architecture Overhaul Plan: Cartridge = Console

**Created:** 2025-01-22
**Last Updated:** 2025-01-22

## Recommendation: **PROCEED WITH THE OVERHAUL**

This aligns perfectly with DRY philosophy and makes The Briefcase more powerful.

## Step 1: Update Type Definitions (Today)

**Change:** Rename `cartridge` type to `console-cartridge` in the registry

**Files to update:**
- `cn-registry.json` - change all `type: "cartridge"` → `type: "console-cartridge"`
- `contributionTypes` - update descriptions
- Documentation - reflect new unified concept

## Step 2: Update Registry Structure (Today)

**Add dual-mode support to all Cartridge-type contributions:**

```json
{
  "id": "crypto-reader",
  "type": "console-cartridge",
  "runtime": {
    "consoleId": "crypto-reader",
    "mountPath": "/crypto-reader",           // Standalone path
    "cartridgePath": "/cartridges/crypto-reader",  // Cartridge path
    "hosts": ["crypto-reader.thebriefcase.app"]     // Standalone subdomain
  }
}
```

**Benefits:**
- Every Cartridge can now also be a Console
- One codebase, multiple deployment modes
- Consistent pattern across all contributions

## Step 3: Update Cartridge Codebases (This Week)

**Add auto-detection to existing Cartridges:**

```javascript
// In each cartridge's main.js
function isStandaloneMode() {
  return window.location.hostname === 'crypto-reader.thebriefcase.app' ||
         window.location.pathname.startsWith('/crypto-reader');
}

// Render as modal or full page based on mode
if (isStandaloneMode()) {
  // Render as standalone console
  renderStandalone();
} else {
  // Render as embedded cartridge
  renderEmbedded();
}
```

## Step 4: Update Documentation (This Week)

- Update README.md and architecture docs
- Add installation guides for both modes
- Update contribution templates
- Add examples of dual-mode Cartridges

## Step 5: Test and Deploy (This Week)

- Deploy Briefcase Library as standalone Console
- Test all Cartridges in both modes
- Update The Briefcase Library to show Console subdomains
- Verify all links work correctly

## Implementation Priority

### High Priority (Start Now)
1. **Crypto Reader** - Simple, good candidate
2. **Bank Reader** - Already has data processing
3. **LLM Reader** - Popular, standalone use case

### Medium Priority (Next Week)
1. **LearnMappers** - Already has console UI
2. **Briefcase Library** - Already done! ✅
3. **WordPress cartridge** - Could be standalone

### Low Priority (Future)
1. **Theme Switcher** - Utility, probably stays embedded
2. **Modal System** - Infrastructure, probably stays embedded

## Benefits We'll See Immediately

✅ **DRY**: One codebase, multiple modes  
✅ **Flexibility**: Deploy standalone OR embedded  
✅ **Simplicity**: One concept instead of multiple types  
✅ **Consistency**: Same pattern everywhere  
✅ **Discoverability**: Everything in The Briefcase Library  

## Risk Assessment

**Low Risk:**
- Backward compatible (existing Cartridges still work)
- Gradual migration (one by one)
- Can rollback any individual Cartridge

**Benefits Outweigh Risks:**
- More flexible architecture
- Better user experience
- Cleaner codebase

## Final Recommendation

**YES - Let's do this overhaul!**

Start with the registry changes today, then migrate the highest-value Cartridges this week. The Briefcase Library proves this works perfectly.

**Next Step:** Should I start by updating the registry structure to make all Cartridges Console-Cartridges?


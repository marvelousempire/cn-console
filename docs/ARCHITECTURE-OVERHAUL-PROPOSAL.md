# Architecture Overhaul Proposal: Cartridge = Console

**Created:** 2025-01-22  
**Last Updated:** 2025-01-22

## The DRY Philosophy

**Don't Repeat Yourself** — One codebase, multiple deployment modes.

## Current Architecture (Before)

### Separate Concepts
- **Cartridge**: Plug-in module that goes INTO a Console
- **Console**: Platform that HOSTS Cartridges
- **Console Cartridge**: Special cartridge type for Consoles
- **Utility Cartridge**: Settings pages for Hive Console

### Problems
- Duplication: Same functionality might exist as both Cartridge and Console
- Complexity: Multiple types to understand and maintain
- Rigidity: Cartridges can't easily become standalone
- Inconsistency: Different deployment patterns

## Proposed Architecture (After)

### Unified Concept: **Console-Cartridge**

**Every Cartridge IS a Console** — they're the same thing, just deployed differently.

### Core Principle

```
Cartridge = Console
├── Standalone Mode: Runs as its own Console (subdomain)
└── Embedded Mode: Installed as Cartridge in another Console
```

### Benefits

1. **DRY**: One codebase, two deployment modes
2. **Flexibility**: Deploy standalone OR embedded (or both)
3. **Simplicity**: One concept instead of multiple types
4. **Consistency**: Same deployment pattern everywhere
5. **Discoverability**: Everything can be found in The Briefcase Library

## Implementation

### Registry Structure

Every contribution that can be a Cartridge should have:

```json
{
  "id": "example-contribution",
  "type": "console-cartridge",  // Unified type
  "runtime": {
    "consoleId": "example",
    "mountPath": "/example",           // Standalone path
    "cartridgePath": "/cartridges/example",  // Cartridge path
    "hosts": ["example.thebriefcase.app"]     // Standalone subdomain
  }
}
```

### Deployment Modes

#### Mode 1: Standalone Console
- Deploy at `example.thebriefcase.app`
- Full console interface
- Independent operation

#### Mode 2: Embedded Cartridge
- Install in any console at `/cartridges/example`
- Embedded UI component
- Shares host console context

#### Mode 3: Both
- Can run standalone AND be embedded
- Same codebase, different contexts

## Migration Path

### Phase 1: Update Type System
- Rename `cartridge` → `console-cartridge`
- Rename `console-cartridge` → `console-cartridge` (already exists)
- Keep `utility-cartridge` for Hive Console (special case)

### Phase 2: Update Registry
- Add `cartridgePath` to all Console contributions
- Add `consoleId` and `hosts` to all Cartridge contributions
- Ensure every Cartridge can also be a Console

### Phase 3: Update Documentation
- Update contribution type descriptions
- Update architecture diagrams
- Update installation guides

### Phase 4: Update Code
- Ensure all Cartridges can detect standalone vs embedded mode
- Update routing logic
- Update deployment scripts

## Examples

### Example 1: LLM Reader
**Current**: Cartridge only  
**After**: Console-Cartridge
- Standalone: `llm-reader.thebriefcase.app`
- Embedded: `/cartridges/llm-reader` in any console

### Example 2: Briefcase Library
**Current**: Console (we just added it)  
**After**: Console-Cartridge (already supports both!)
- Standalone: `library.thebriefcase.app`
- Embedded: `/cartridges/briefcase-library` in any console

### Example 3: Crypto Reader
**Current**: Cartridge only  
**After**: Console-Cartridge
- Standalone: `crypto-reader.thebriefcase.app`
- Embedded: `/cartridges/crypto-reader` in any console

## Special Cases

### Utility Cartridges (Hive Console)
- Keep as `utility-cartridge` type
- These are settings pages, not full consoles
- Exception to the rule (by design)

### Framework Contributions
- Remain as `framework` type
- These host Console-Cartridges
- Not themselves Console-Cartridges

## Benefits Summary

✅ **DRY**: One codebase, multiple modes  
✅ **Flexibility**: Deploy how you want  
✅ **Simplicity**: One concept to understand  
✅ **Consistency**: Same pattern everywhere  
✅ **Discoverability**: Everything in The Briefcase Library  
✅ **Reusability**: Install anywhere, run anywhere  

## Questions to Consider

1. Should we rename `cartridge` type to `console-cartridge`?
2. Should we keep `console-cartridge` as a separate type or merge?
3. How do we handle existing Cartridges that aren't ready to be Consoles?
4. Should we add a migration flag: `canBeConsole: true`?
5. Do we need a transition period or can we do this all at once?

## Recommendation

**Yes, let's do this overhaul!** It aligns perfectly with DRY philosophy and makes the architecture more flexible and consistent.

### Implementation Strategy

1. **Add `canBeConsole` flag** to existing Cartridges
2. **Update type system** to support dual-mode
3. **Migrate existing Cartridges** one by one
4. **Update documentation** as we go
5. **Make it the default** for all new contributions

This would make The Briefcase even more powerful and flexible!


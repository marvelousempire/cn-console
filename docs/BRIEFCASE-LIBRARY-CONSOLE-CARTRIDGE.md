# The Briefcase Library — Console & Cartridge Documentation

**Created:** 2025-01-22  
**Last Updated:** 2025-01-22

## Overview

The Briefcase Library is registered as a **Console Contribution** in the CN registry and can also be installed as a **Cartridge** in any console. This dual-mode architecture provides maximum flexibility and reusability.

## Modes of Operation

### 1. Standalone Console Mode

**URL:** `https://library.thebriefcase.app`

The Briefcase Library can run as its own standalone console:
- Full console interface
- Library modal as the main feature
- Independent deployment
- Own subdomain

**Use Cases:**
- Dedicated library access point
- Standalone library service
- Independent console instance

### 2. Cartridge Mode (Installable)

**Path:** `/cartridges/briefcase-library`

The Briefcase Library can be installed as a cartridge in any console:
- Embedded in host console
- Accessible via FAB button or direct call
- Reusable across different consoles
- Shares host console's authentication and context

**Use Cases:**
- Add library to existing consoles
- Embed in custom console implementations
- Share library functionality across multiple consoles

## Installation

### As a Standalone Console

1. Deploy to `library.thebriefcase.app` subdomain
2. Configure routing in network settings
3. Set up as independent console instance

### As a Cartridge

1. **Copy Files:**
   ```bash
   cp -r js/cn-library.js /path/to/console/cartridges/briefcase-library/js/
   cp -r css/briefcase-library.css /path/to/console/cartridges/briefcase-library/css/
   ```

2. **Import in Host Console:**
   ```javascript
   import { openBriefcaseLibrary } from '/cartridges/briefcase-library/js/cn-library.js';
   ```

3. **Add FAB Button:**
   ```javascript
   const libraryFab = new FAB({
     position: 'bottom-left',
     icon: '📚',
     onClick: () => openBriefcaseLibrary()
   });
   ```

4. **Include CSS:**
   ```html
   <link rel="stylesheet" href="/cartridges/briefcase-library/css/briefcase-library.css">
   ```

## Auto-Detection

The library automatically detects its mode:

- **Standalone:** If hostname is `library.thebriefcase.app` or path is `/briefcase-library`
- **Cartridge:** If embedded in another console (default)

In standalone mode, the library renders directly in the main content area. In cartridge mode, it renders as a modal overlay.

## API Integration

The library integrates with:

- **CN Registry:** `/api/cn/contributions` - Fetches all contributions
- **Sunday Registry:** `/sundayapp/registry/sunday-registry.json` - Merges Sunday data
- **Network Settings:** `/api/cn/network-settings` - Gets TLD for subdomain links

## Features Available in Both Modes

- ✅ Comprehensive contribution view
- ✅ Search and filter
- ✅ Type color-coded badges
- ✅ Active/inactive counts
- ✅ Open Console buttons (subdomain links)
- ✅ Live links (repository, docs, instances)
- ✅ Responsive design
- ✅ 3-column grid layout

## Registry Entry

The Briefcase Library is registered in `cn-registry.json` as:

```json
{
  "id": "briefcase-library",
  "name": "The Briefcase Library",
  "type": "console",
  "emoji": "📚",
  "tagline": "Console Contribution — Complete Arsenal of All Contributions",
  "runtime": {
    "consoleId": "briefcase-library",
    "mountPath": "/briefcase-library",
    "hosts": ["library.thebriefcase.app"],
    "cartridgePath": "/cartridges/briefcase-library"
  }
}
```

## Benefits of Dual-Mode Architecture

1. **Flexibility:** Use as standalone or embedded
2. **Reusability:** Install in multiple consoles
3. **Consistency:** Same codebase, different contexts
4. **Discoverability:** Appears in The Briefcase Library itself
5. **Modularity:** Can be updated independently

## Future Enhancements

- Standalone console UI (beyond just the library modal)
- Cartridge configuration options
- Multi-console sync
- Library analytics
- Contribution submission workflow


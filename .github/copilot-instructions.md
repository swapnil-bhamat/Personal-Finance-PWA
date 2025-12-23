# AI Coding Agent Instructions - Personal Finance PWA

## Project Overview

A Progressive Web Application (PWA) for personal finance management. Core strengths: IndexedDB local-first architecture with Google Drive sync, comprehensive undo/redo system, AI-powered financial analysis, and offline-first design.

**Tech Stack:** React 19, TypeScript, Vite, Dexie.js, Google Gemini AI, Bootstrap 5, Recharts

---

## Architecture Overview

### Data Layer (Dexie.js + IndexedDB)

- **`src/services/db.ts`**: Database singleton using Dexie ORM
- **`src/services/dbMigrations.ts`**: Schema versioning (current: v8). Always increment `CURRENT_DB_VERSION` for schema changes
- **Core Tables** in `src/types/db.types.ts`:
  - Financial: `accounts`, `income`, `cashFlow`, `assetsHoldings`, `liabilities`
  - Configuration: `holders`, `assetClasses`, `assetSubClasses`, `goals`, `sipTypes`, `buckets`
  - Projections: `assetsProjection`, `liabilitiesProjection`

### State Management Pattern

- **`useLiveQuery()`** from `dexie-react-hooks`: Real-time reactive queries (NOT Redux)
- Example: `useLiveQuery(() => db.assetsHoldings.toArray())` auto-updates on DB changes
- **Context APIs** for auth/bio-lock/theme (not for data state)
- **No URL query params** for persistent state—use DB

### Undo/Redo System

- **`src/services/historyService.ts`**: Session-based undo/redo (localStorage-backed stacks, max 20 items)
- DB hooks in `db.ts` automatically track `add`, `update`, `delete` operations
- **Use `useUndoRedo()` hook** in components needing undo controls
- Operations batched automatically (50ms debounce)

### Cloud Sync

- **`src/services/googleDrive.ts`**: OAuth2 token management and Drive API calls
- **`src/services/driveSync.ts`**: Periodic sync (30s interval) with smart change detection
- **`src/services/authContext.ts`**: Auth state + sync lifecycle management
- Sync is **read-only by default** on login; must enable in Settings

### AI Integration

- **`src/services/aiService.ts`**: Google Gemini API integration
- System instruction sets read-only by default; user enables write permissions in Settings
- **Dynamic model selection**: Fetches available models from API using user's key
- Financial data passed as JSON context to chat
- No function calling enabled—text-only responses

---

## Key Developer Patterns

### 1. Page Component Template

**Location:** `src/pages/`  
Naming: `PascalCasePageName.tsx`

```tsx
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../services/db";
import BasePage from "../components/BasePage";

export default function AssetsHoldingsPage() {
  const holdings = useLiveQuery(() => db.assetsHoldings.toArray()) ?? [];

  return (
    <BasePage title="Assets & Holdings">{/* Use holdings data */}</BasePage>
  );
}
```

### 2. Database Query Pattern

- **Always initialize with nullish coalescing**: `useLiveQuery(...) ?? []`
- **For multiple queries**, nest async calls:

```tsx
const data = useLiveQuery(async () => {
  const holdings = await db.assetsHoldings.toArray();
  const classes = await db.assetClasses.toArray();
  return { holdings, classes };
}) || { holdings: [], classes: [] };
```

### 3. Form Modal Pattern

- **`src/components/FormModal.tsx`**: Reusable modal for add/edit with validation
- Always return objects matching table schema from `src/types/db.types.ts`
- Use `db.table(name).add(obj)` for new, `db.table(name).update(id, changes)` for updates

### 4. Type Imports

```tsx
// ✅ DO: Import types from db.ts (re-exports from db.types.ts)
import type { AssetHolding, Goal } from "../services/db";

// ❌ DON'T: Direct db.types imports (breaks re-export contract)
```

---

## Build & Development Commands

```bash
npm run dev          # Vite dev server (port 4444)
npm run build        # TypeScript + Vite build (must pass lint)
npm run lint         # ESLint (strict: no warnings allowed)
npm run test         # Vitest (JSDOM environment)
npm run test:ui      # Vitest UI (http://localhost:51204)
npm run coverage     # Coverage report in /coverage
npm run serve        # Preview production build
npm run dev:netlify  # Netlify dev environment
```

**Pre-commit:** `npm run lint` must pass (enforced via eslint rules)

---

## Critical Integration Points

### Database Initialization

- Auto-runs schema migrations on version mismatch
- History service initialized in `db.ts` constructor
- **Never skip migrations**—backward compatibility required

### Drive Sync Flow

1. User logs in via Google OAuth → `authContext.ts`
2. `setupDriveSync()` called → periodic sync starts
3. On data change → `syncToDrive()` uploads entire backup
4. On app start → `initializeFromDrive()` restores if remote version newer

### Chat Widget

- **`src/components/Chat/ChatWidget.tsx`**: Embedded chat UI
- Passes entire DB state as context to AI via JSON serialization
- Supports image rendering from AI responses

### Offline-First PWA

- Service Worker in `public/service-worker.js`
- `registerServiceWorker.ts` handles registration
- Works fully offline; Cloud Backup/Sync optional

---

## Common Tasks & Examples

### Adding a New Data Table

1. Add type to `src/types/db.types.ts` (extend `BaseRecord`)
2. Increment `CURRENT_DB_VERSION` in `dbMigrations.ts`
3. Add to `db.version(VERSION).stores(...)` with indices
4. Add `.upgrade()` migration if needed
5. Test: `npm run test`

### Creating a New Page

1. Create `src/pages/NewFeaturePage.tsx`
2. Use `useLiveQuery()` for DB access
3. Wrap with `<BasePage title="...">` from `src/components/BasePage.tsx`
4. Add route to `src/App.tsx` routes array
5. Add menu item to `src/components/Layout.tsx` menuItems

### Modifying AI Permissions

- Edit `getSystemInstruction()` in `src/services/aiService.ts`
- Permission flags: `{ read, write, update, delete }`
- Write/update/delete are off by default; user enables in Settings

---

## Testing Notes

- **Setup:** `src/test/setup.ts` configures JSDOM, mocks, React utilities
- **Mocks:** `src/test/mocks/` (if needed for external APIs)
- **Config:** `vitest.config.ts` (jsdom environment, CSS enabled)
- Tests not critical—focus on integration via manual testing + end-to-end scenarios

---

## Common Pitfalls

1. **Forgetting `??` in useLiveQuery**: Causes undefined errors during initial load
2. **Importing from `db.types.ts` directly**: Use `src/services/db` re-exports instead
3. **Breaking migrations**: Always add upgrade logic for schema changes
4. **Modifying AI service permissions without Settings UI**: Sync with `src/pages/SettingsPage.tsx`
5. **Sync conflicts**: Remote always wins; local data overwritten on conflict (design choice)

---

## References

- **Dexie Docs:** https://dexie.org/docs/API-Reference
- **dexie-react-hooks:** `useLiveQuery()` for reactive queries
- **Google Gemini API:** https://ai.google.dev/
- **Bootstrap 5 + React Bootstrap:** UI component library
- **Recharts:** Chart visualizations in analytics/projections

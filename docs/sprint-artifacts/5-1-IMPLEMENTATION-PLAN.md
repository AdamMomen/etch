# Story 5.1: Implementation Plan (Safe, Incremental Approach)

**Goal:** Implement role system infrastructure WITHOUT breaking annotations or degrading performance.

**Strategy:** Atomic commits, test after each step, rollback on any regression.

---

## Step 1: Create Permission Types (10 min) ✅ LOW RISK

### Files to Create:
- `packages/shared/src/types/permissions.ts`

### Code:
```typescript
/**
 * Available roles for meeting participants.
 */
export type Role = 'host' | 'sharer' | 'annotator' | 'viewer'
```

### Testing:
```bash
pnpm build:shared
# Should build without errors
```

### Commit Message Template:
```
Feat: Add Role type definition for permission system

- Create packages/shared/src/types/permissions.ts
- Define Role type union: host | sharer | annotator | viewer
- No behavior changes, pure type definition

Tests: TypeScript compiles ✅
Risk: LOW - Type only, no runtime impact
```

### Smoke Test:
- ✅ App still builds
- ✅ No new errors

---

## Step 2: Implement Permission Utility Functions (30 min) ⚠️ MEDIUM RISK

### Files to Create:
- `packages/shared/src/permissions.ts`
- `packages/shared/src/permissions.test.ts`

### Testing:
```bash
pnpm test:shared
# All tests should pass
# Coverage should be 90%+
```

### Commit Message Template:
```
Feat: Add permission utility functions with comprehensive tests

- Create packages/shared/src/permissions.ts
- Implement canAnnotate(), canDeleteStroke(), canClearAll(), etc.
- Add 20+ unit tests covering all permission scenarios
- All functions are pure (no async, no I/O)

Tests: 20+ new tests passing ✅
Coverage: 95%+ on permissions.ts ✅
Risk: MEDIUM - Pure functions, well-tested, no integration yet
```

### Smoke Test:
- ✅ `pnpm test` passes
- ✅ Build succeeds

---

## Step 3: Export from Shared Package (5 min) ✅ LOW RISK

### Files to Update:
- `packages/shared/src/index.ts`

### Add exports:
```typescript
export type { Role } from './types/permissions'
export {
  canAnnotate,
  canDeleteStroke,
  canClearAll,
  canModerateUsers,
  canToggleRoomAnnotations,
} from './permissions'
```

### Testing:
```bash
pnpm build
# All packages should build successfully
```

### Smoke Test:
- ✅ All packages build
- ✅ No import errors

---

## Step 4: Update Server Token Generation (15 min) ⚠️ MEDIUM RISK

### Files to Update:
- `packages/server/src/routes/rooms.ts`

### Key change:
```typescript
// First participant gets 'host', others get 'annotator'
const role: Role = participants.length === 0 ? 'host' : 'annotator'
```

### Testing:
```bash
pnpm test:server
pnpm build:server
```

### Smoke Test (CRITICAL):
- ✅ Run dev server
- ✅ Create a meeting
- ✅ Verify participant metadata contains role
- ⚠️ **CRITICAL: Annotations must still work!**

**If annotations break → `git reset --hard HEAD~1` immediately**

---

## Step 5: Parse Roles in Client (20 min) 🚨 HIGH RISK

### Files to Update:
- `packages/client/src/hooks/useRoom.ts`

### Key change:
```typescript
// Parse role from LiveKit metadata with graceful fallback
try {
  const metadata = JSON.parse(livekitParticipant.metadata)
  role = metadata.role || 'annotator'
} catch (error) {
  console.warn('Failed to parse metadata:', error)
  role = 'annotator' // Safe default
}
```

### Testing:
```bash
pnpm test:client
pnpm build
./scripts/smoke-test.sh
```

### Smoke Test (SUPER CRITICAL!):
1. ✅ Start a meeting
2. ✅ Draw annotations with pen
3. ✅ Draw with highlighter
4. ✅ Use eraser
5. ✅ Change colors
6. ✅ Join from second device
7. ✅ Verify annotations sync in real-time
8. ✅ Check console for errors

**If ANYTHING fails → `git reset --hard HEAD~1`**

---

## Final Verification

### Automated:
```bash
./scripts/smoke-test.sh
pnpm test  # All tests pass
pnpm build # All packages build
```

### Manual Testing Checklist:
- [ ] Annotations work perfectly
- [ ] Screen share works
- [ ] Multi-participant sync works
- [ ] No console errors
- [ ] Performance feels good
- [ ] Bundle size reasonable

---

## Merge to Main

Only after EVERYTHING works:

```bash
git checkout greenfield
git merge feature/5-1-role-system
git push origin greenfield
```

---

## Red Flags 🚩

**STOP and rollback if you see:**
- ❌ Tests failing
- ❌ Annotations don't draw
- ❌ Annotations don't sync
- ❌ Console errors
- ❌ Drawing feels laggy
- ❌ Screen share breaks

---

## Success Criteria

- ✅ Role type defined and exported
- ✅ Permission functions implemented (90%+ coverage)
- ✅ Server assigns roles
- ✅ Client parses and stores roles
- ✅ **Annotations still work perfectly**
- ✅ **No performance degradation**
- ✅ All tests pass

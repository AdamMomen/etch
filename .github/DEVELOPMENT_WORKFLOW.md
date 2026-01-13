# Development Workflow & Quality Assurance

## Branch Strategy

### For Every Feature/Story:

1. **Create a feature branch from `greenfield`**
   ```bash
   git checkout greenfield
   git pull origin greenfield
   git checkout -b feature/5-1-role-system
   ```

2. **Work in small, testable increments**
   - Commit working states frequently
   - Each commit should pass tests
   - Easy to rollback to last known-good state

3. **Merge back only when everything works**
   ```bash
   # After all tests pass and manual testing complete:
   git checkout greenfield
   git merge feature/5-1-role-system
   git push
   ```

## Pre-Implementation Checklist

Before writing ANY code:

- [ ] Read the story context file
- [ ] Understand acceptance criteria
- [ ] Identify critical paths that must not break
- [ ] Note current working state (baseline)

## Development Testing Discipline

### After EVERY code change:

#### 1. **Unit Tests** (Fast, Automatic)
```bash
pnpm test
```
- **MUST pass** before committing
- Run affected package tests: `pnpm test:client` or `pnpm test:shared`
- Check coverage: Should maintain or increase

#### 2. **Type Check** (Fast, Catches Integration Issues)
```bash
pnpm build
```
- Catches TypeScript errors across packages
- Verifies imports/exports work correctly
- **MUST pass** before committing

#### 3. **Manual Smoke Test** (Critical Path)
**Run the app and verify core functionality still works:**

##### Annotation Smoke Test (5 minutes)
- [ ] Start a meeting (host)
- [ ] Draw annotation with pen tool (key `1`)
- [ ] Draw annotation with highlighter (key `2`)
- [ ] Use eraser to delete your stroke (key `7`)
- [ ] Change colors (keys `q`, `w`, `e`, `r`, `t`)
- [ ] Clear all annotations (key `0`)
- [ ] Join from second browser/device
- [ ] Verify remote participant sees annotations in real-time
- [ ] Verify remote annotations appear on your screen

##### Screen Share Smoke Test (3 minutes)
- [ ] Start screen sharing
- [ ] Verify overlay appears correctly
- [ ] Draw annotations on shared screen
- [ ] Stop screen sharing
- [ ] Verify cleanup (overlay closed, window restored)

#### 4. **Performance Check** (Quick Visual Inspection)
- [ ] App startup time feels normal (< 3 seconds)
- [ ] Drawing feels responsive (no lag)
- [ ] Memory usage looks reasonable in DevTools
- [ ] No console errors or warnings

## Commit Discipline

### DO commit when:
- ✅ All tests pass
- ✅ App builds without errors
- ✅ Smoke tests pass
- ✅ No regressions in core functionality
- ✅ Code is clean and understandable

### DON'T commit when:
- ❌ Tests are failing
- ❌ TypeScript errors exist
- ❌ Core features are broken
- ❌ "I'll fix it later" thinking

### Commit Message Format:
```
Type: Brief description (50 chars or less)

- Detailed point 1
- Detailed point 2
- What was tested

Tests: [X passing tests, Y test files]
Smoke test: ✅ Annotations working, Screen share working

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

## Incremental Development for Story 5.1

Break down into atomic commits:

### Commit 1: Add Role type (Low Risk)
- **Files**: `packages/shared/src/types/permissions.ts`
- **Test**: Type compiles, exports work
- **Smoke**: No change to app behavior ✅

### Commit 2: Add permission utility functions (Medium Risk)
- **Files**: `packages/shared/src/permissions.ts`, unit tests
- **Test**: Unit tests pass, 90%+ coverage
- **Smoke**: No change to app behavior ✅

### Commit 3: Update server token generation (Medium Risk)
- **Files**: `packages/server/src/services/livekit.ts`
- **Test**: Server builds, unit tests pass
- **Smoke**: Annotations still work ✅

### Commit 4: Update roomStore to parse roles (HIGH RISK ⚠️)
- **Files**: `packages/client/src/stores/roomStore.ts`
- **Test**: Client builds, store tests pass
- **Smoke**: ⚠️ **CRITICAL** - Run full annotation smoke test
- **Rollback point**: If annotations break, immediately `git reset --hard HEAD~1`

### Commit 5: Export from shared package (Low Risk)
- **Files**: `packages/shared/src/index.ts`
- **Test**: Build passes, exports resolve
- **Smoke**: Annotations still work ✅

## Rollback Strategy

### If something breaks:

#### Option 1: Soft rollback (preserve work)
```bash
# Undo last commit but keep changes
git reset --soft HEAD~1
# Review what broke, fix, re-test, re-commit
```

#### Option 2: Hard rollback (nuclear option)
```bash
# Completely undo last commit and changes
git reset --hard HEAD~1
# Start over with lessons learned
```

#### Option 3: Revert (safe for shared branches)
```bash
# Create new commit that undoes changes
git revert HEAD
# Preserves history, safe for pushed commits
```

## Performance Regression Prevention

### Before implementing feature:
```bash
# Baseline measurement
pnpm build
# Note build time and bundle sizes
ls -lh packages/client/dist/
```

### After implementing feature:
```bash
# Compare
pnpm build
ls -lh packages/client/dist/
# Bundle should not grow by more than 10KB for this feature
```

### If bundle size grew significantly:
- Check what dependencies were added
- Use `pnpm why <package>` to understand why
- Consider code splitting or lazy loading
- Remove unused imports

## Debugging Broken Annotations

### Common issues when adding role system:

1. **Metadata parsing errors**
   - Check browser console for JSON.parse errors
   - Verify LiveKit metadata is valid JSON

2. **Permission functions blocking drawing**
   - Temporarily return `true` from `canAnnotate()` to isolate issue
   - Check if role is being set correctly

3. **Import/export issues**
   - Verify shared package builds: `pnpm build:shared`
   - Check client can import: Look for TypeScript errors

4. **State update bugs**
   - Check roomStore in React DevTools
   - Verify participant objects have role field

5. **Performance issues**
   - Check if permission functions are called in tight loops
   - Use Performance tab to profile
   - Ensure functions are pure (no async, no I/O)

## Red Flags to Watch For

🚩 **STOP and review if you see:**
- Test count decreased
- Build time increased by >20%
- Bundle size increased by >50KB
- New console warnings/errors
- Annotations feel laggy
- App takes longer to start

## Recovery Checklist

If you've broken the app:

1. [ ] Don't panic - you have git history
2. [ ] Check `git log` to see your commits
3. [ ] Identify the commit where it broke
4. [ ] `git reset --hard <last-good-commit>`
5. [ ] Re-read the story context
6. [ ] Implement in smaller steps
7. [ ] Test after EACH step

## Success Metrics for Story 5.1

When you're done, you should have:
- [ ] ✅ All 1118+ tests passing
- [ ] ✅ 90%+ coverage on permissions.ts
- [ ] ✅ Annotations still work perfectly
- [ ] ✅ Screen share still works perfectly
- [ ] ✅ Bundle size increased < 10KB
- [ ] ✅ No new console errors
- [ ] ✅ Role field visible in participant metadata
- [ ] ✅ Permission functions return correct values

---

**Remember:** It's better to take 2 hours with 5 safe commits than 30 minutes with 1 broken commit.

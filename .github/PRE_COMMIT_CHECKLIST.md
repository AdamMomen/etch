# ✅ Pre-Commit Checklist

Run this **BEFORE every commit** to prevent breaking changes:

## Quick Checks (2 minutes)

```bash
# Run smoke test script
./scripts/smoke-test.sh

# Or manually:
pnpm test              # All tests pass?
pnpm build            # Build succeeds?
git diff --staged     # Review what you're committing
```

## Critical Path Test (5 minutes)

**Boot the app and verify:**

1. **Annotations work**
   - Draw with pen (key `1`)
   - Draw with highlighter (key `2`)
   - Erase (key `7`)
   - Change colors (q/w/e/r/t)

2. **Screen share works**
   - Start sharing
   - Draw on shared screen
   - Stop sharing

3. **No console errors**
   - Open DevTools → Console
   - Should be clean (no red errors)

## Risk Assessment

**LOW RISK** (safe to commit):
- Documentation only
- Adding tests
- Code comments
- Type definitions (no logic)

**MEDIUM RISK** (test carefully):
- New utility functions
- New components
- Updating types with new fields

**HIGH RISK** (test extensively):
- Changing core stores (roomStore, annotationStore)
- Modifying LiveKit integration
- Touching drawing/rendering logic
- Updating data protocols

## If Tests Fail

**DON'T:**
- ❌ Commit with failing tests
- ❌ Comment out failing tests
- ❌ Think "I'll fix it later"

**DO:**
- ✅ Fix the issue now
- ✅ Or rollback: `git reset --hard`
- ✅ Ask for help if stuck

## Recovery Commands

```bash
# Undo last commit, keep changes
git reset --soft HEAD~1

# Undo last commit and changes
git reset --hard HEAD~1

# See what changed
git diff HEAD~1

# Stash current work to start over
git stash
git stash list
git stash pop  # when ready to continue
```

---

**Remember:** A working commit every 30 minutes beats a broken commit every 3 hours.

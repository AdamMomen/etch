#!/bin/bash
# Smoke Test Script - Run before committing changes
# Usage: ./scripts/smoke-test.sh

set -e  # Exit on error

echo "🧪 Running Smoke Tests..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Unit Tests
echo "1️⃣  Running unit tests..."
if pnpm test > /tmp/test-output.log 2>&1; then
    TEST_COUNT=$(grep -oE '[0-9]+ passed' /tmp/test-output.log | head -1 | awk '{print $1}')
    echo -e "${GREEN}✅ Unit tests passed (${TEST_COUNT} tests)${NC}"
else
    echo -e "${RED}❌ Unit tests FAILED${NC}"
    echo "View logs: cat /tmp/test-output.log"
    exit 1
fi
echo ""

# Test 2: TypeScript Build
echo "2️⃣  Running TypeScript build..."
if pnpm build > /tmp/build-output.log 2>&1; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build FAILED${NC}"
    tail -20 /tmp/build-output.log
    exit 1
fi
echo ""

# Test 3: Bundle Size Check
echo "3️⃣  Checking bundle size..."
if [ -f "packages/client/dist/index.html" ]; then
    BUNDLE_SIZE=$(du -sh packages/client/dist/ | awk '{print $1}')
    echo -e "${GREEN}✅ Client bundle: ${BUNDLE_SIZE}${NC}"

    # Check if bundle is unreasonably large (>10MB is a red flag)
    BUNDLE_KB=$(du -sk packages/client/dist/ | awk '{print $1}')
    if [ "$BUNDLE_KB" -gt 10240 ]; then
        echo -e "${YELLOW}⚠️  WARNING: Bundle size seems large (>${BUNDLE_KB}KB)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No build output found (run 'pnpm build' first)${NC}"
fi
echo ""

# Test 4: Check for console.log statements (code quality)
echo "4️⃣  Checking for debug statements..."
DEBUG_COUNT=$(git diff --cached | grep -c "^\+.*console\\.log" || true)
if [ "$DEBUG_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found ${DEBUG_COUNT} console.log statements in staged changes${NC}"
    echo "   Consider removing debug logs before committing"
else
    echo -e "${GREEN}✅ No debug statements found${NC}"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Automated smoke tests passed!${NC}"
echo ""
echo "📋 Manual testing checklist:"
echo "   □ Start a meeting and draw annotations"
echo "   □ Test eraser and color changes"
echo "   □ Join from second device - verify sync"
echo "   □ Test screen sharing + annotations"
echo "   □ Check browser console for errors"
echo "   □ Verify app feels responsive"
echo ""
echo "Ready to commit? Run: git commit"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

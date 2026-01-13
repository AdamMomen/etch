#!/bin/bash
# Test Runner for Phase 1 + Phase 2 Hypothesis Testing
# Run this BEFORE starting Etch screen share

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Etch Capture Failure Hypothesis Testing                ║"
echo "║  Phase 1: Quick Diagnostic + Phase 2: Permission Monitoring ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Create logs directory
LOGS_DIR="$HOME/etch-test-logs-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$LOGS_DIR"

echo "📁 Logs directory: $LOGS_DIR"
echo ""

# Check if running with sudo for TCC logs
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  WARNING: Not running as sudo. TCC logs will be limited."
    echo "    For full TCC logging, run: sudo ./test-runner.sh"
    echo ""
fi

echo "🚀 Starting log capture..."
echo ""

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Stopping log capture..."
    jobs -p | xargs kill 2>/dev/null || true
    echo "✅ Logs saved to: $LOGS_DIR"
    echo ""
    echo "📊 To analyze logs:"
    echo "   grep '=== INITIAL SOURCE ENUMERATION ===' $LOGS_DIR/*.txt"
    echo "   grep '=== RESTART SOURCE ENUMERATION ===' $LOGS_DIR/*.txt"
    echo "   grep -i 'denied\|revok' $LOGS_DIR/*.txt"
    exit
}

trap cleanup EXIT INT TERM

# Terminal 1: TCC Logs (requires sudo)
echo "📝 [1/4] Capturing TCC permission logs..."
if [ "$EUID" -eq 0 ]; then
    log stream --predicate 'subsystem == "com.apple.TCC"' --level debug 2>&1 | \
        tee "$LOGS_DIR/tcc-logs.txt" | \
        grep --line-buffered -i "screen\|recording\|etch\|denied\|revok" &
else
    log stream --predicate 'subsystem == "com.apple.TCC"' --level info 2>&1 | \
        tee "$LOGS_DIR/tcc-logs-limited.txt" | \
        grep --line-buffered -i "screen\|recording\|etch\|denied\|revok" &
fi

# Terminal 2: Window Server Logs
echo "🪟 [2/4] Capturing Window Server logs..."
log stream --predicate 'subsystem == "com.apple.WindowServer"' --level debug 2>&1 | \
    tee "$LOGS_DIR/windowserver-logs.txt" | \
    grep --line-buffered -i "capture\|screen\|recording" &

# Terminal 3: All Screen Recording Events
echo "📹 [3/4] Capturing all screen recording events..."
log stream --predicate 'eventMessage CONTAINS "screen" OR eventMessage CONTAINS "recording" OR eventMessage CONTAINS "capture"' --level info 2>&1 | \
    tee "$LOGS_DIR/capture-events.txt" | \
    grep --line-buffered -i "error\|denied\|fail\|timeout\|revok" &

# Terminal 4: System profiler snapshot (before test)
echo "🖥️  [4/4] Capturing display information..."
system_profiler SPDisplaysDataType > "$LOGS_DIR/displays-before.txt"

echo ""
echo "✅ All monitoring started!"
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  NOW: Start Etch and begin screen share                 ║"
echo "║                                                               ║"
echo "║  WATCH FOR:                                                  ║"
echo "║  • Initial source enumeration (should show display titles)   ║"
echo "║  • Failure after ~3-5 minutes                                ║"
echo "║  • Restart source enumeration (titles empty?)                ║"
echo "║  • TCC/permission denial messages                            ║"
echo "║                                                               ║"
echo "║  KEEP THIS TERMINAL OPEN                                     ║"
echo "║  Press Ctrl+C when test is complete                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "⏱️  Waiting for Etch logs..."
echo "   (Logs will appear here as events occur)"
echo ""

# Keep script running
wait

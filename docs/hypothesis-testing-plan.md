# Hypothesis Testing Plan: 5-Minute Capture Failure

**Date:** 2025-12-27
**Issue:** All displays (built-in and external) fail after 2-5 minutes with empty source titles
**Critical Symptom:** `source_title=""` during restart (vs normal title at start)

---

## Summary of Observations

1. ✅ Capture works initially (sources have titles)
2. ❌ Fails after 2-5 minutes with permanent errors
3. ❌ ALL sources have empty titles during restart
4. ✅ Restart logic executes correctly (5 attempts)
5. ❌ Restart always fails immediately (can't capture frames)

**Key Clue:** Source titles are present initially but **empty during restart**. This suggests the DesktopCapturer or macOS is corrupted, not just the display.

---

## Hypothesis 1: macOS Screen Recording Permission Timeout ⭐ PRIMARY

**Likelihood:** 70%

### Theory
macOS Ventura/Sonoma has a known bug where Screen Recording permission can be:
- Revoked automatically after 2-5 minutes for unsigned apps
- Timeout-based for apps using older ScreenCaptureKit APIs
- Randomly revoked due to TCC (Transparency, Consent, and Control) daemon bugs

### Evidence Supporting
- ✅ Affects ALL displays (not hardware-specific)
- ✅ Consistent ~3-5 minute timeout
- ✅ Empty source titles (permission loss would cause this)
- ✅ Working on Hopp's fork (they sign their app)

### Evidence Against
- ⚠️ No direct confirmation from TCC logs yet

### How to Test

#### Test 1.1: Monitor Screen Recording Permission
**During next test run:**
1. Start screen share
2. Open System Settings → Privacy & Security → Screen Recording
3. Keep this window visible
4. **Watch the checkbox** when capture fails (~3-5 mins)
5. Note if NAMELESS becomes unchecked

**Expected if hypothesis true:** Checkbox unchecks when capture fails

#### Test 1.2: Monitor macOS TCC Logs
**Terminal 1 (run BEFORE starting screen share):**
```bash
sudo log stream --predicate 'subsystem == "com.apple.TCC"' --level debug | grep -i "screen"
```

**Terminal 2 (alternate):**
```bash
log stream --predicate 'eventMessage CONTAINS "screen" OR eventMessage CONTAINS "recording"' --level debug
```

**Watch for messages like:**
- "Screen recording permission denied"
- "TCC: denying access"
- "Revoking permission"

**Expected if hypothesis true:** Permission denial logs appear at ~3-5 minute mark

#### Test 1.3: Check Console.app for TCC Events
1. Open Console.app
2. Select your Mac in sidebar
3. Search for "TCC" or "Screen Recording"
4. Filter by "All Messages"
5. Start screen share and wait for failure
6. Look for red/orange errors around failure time

**Expected if hypothesis true:** TCC permission errors logged

#### Test 1.4: Force Permission Refresh
**Test with manual re-grant:**
1. Start screen share
2. After 2 minutes, go to Screen Recording settings
3. Uncheck NAMELESS
4. Recheck NAMELESS
5. See if this extends the capture time

**Expected if hypothesis true:** Capture continues after permission refresh

---

## Hypothesis 2: Hopp's libwebrtc Fork Bug 🐛

**Likelihood:** 20%

### Theory
The Hopp fork of libwebrtc might have a memory corruption or state management bug that corrupts source metadata after extended use.

### Evidence Supporting
- ✅ Empty source titles after timeout (could be memory corruption)
- ✅ Reproducible timing (consistent ~3-5 mins)
- ⚠️ Using a fork, not official libwebrtc

### Evidence Against
- ❌ Hopp's production app presumably works fine
- ❌ Would expect random crashes, not clean timeouts
- ❌ Why would it affect source titles specifically?

### How to Test

#### Test 2.1: Compare with Hopp's Own App
**If you have Hopp installed:**
1. Run Hopp's official app
2. Start screen capture
3. Let it run for 10+ minutes
4. Check if Hopp also fails after 5 minutes

**Expected if hypothesis true:** Hopp also fails (it's their fork)
**Expected if hypothesis false:** Hopp works fine (it's our code)

#### Test 2.2: Check Hopp's GitHub Issues
```bash
# Search Hopp repository for similar issues
open "https://github.com/hoprnet/hopr/issues?q=is%3Aissue+screen+capture"
open "https://github.com/hoprnet/hopr/issues?q=is%3Aissue+desktop+capturer"
```

**Search for:**
- "capture stops"
- "screen recording fails"
- "source title empty"
- "permission timeout"

**Expected if hypothesis true:** Similar issues reported

#### Test 2.3: Test with Different DesktopCapturer Settings
**Try creating capturer with different options:**

Check if there are alternative DesktopCapturer initialization flags in Hopp's code at:
`/Users/adam/.ghq/github.com/adammomen/nameless/hopp-main/core/src/capture/`

**Expected if hypothesis true:** Different settings avoid the bug

---

## Hypothesis 3: LiveKit Connection Breaking 📡

**Likelihood:** 10%

### Theory
LiveKit connection might be dropping after a few minutes, which somehow breaks the local capture session.

### Evidence Supporting
- ✅ Consistent timeout pattern
- ⚠️ Network-based services often have timeouts

### Evidence Against
- ❌ Local capture shouldn't depend on LiveKit connection
- ❌ Why would it affect source titles?
- ❌ No LiveKit error logs visible

### How to Test

#### Test 3.1: Monitor LiveKit Connection State
**Add logging to track LiveKit state:**

Check the LiveKit connection logs in your app. Look for:
- "Disconnected" messages
- "Connection lost"
- "Reconnecting"
- Timestamp correlation with capture failure

**Expected if hypothesis true:** LiveKit disconnects at same time as capture failure

#### Test 3.2: Test Capture WITHOUT LiveKit
**Modify code temporarily:**
```rust
// In main.rs or wherever LiveKit connects
// Comment out LiveKit connection
// But keep DesktopCapturer running

// Just start capture without publishing to LiveKit
```

**Run test:**
1. Start capture (no LiveKit)
2. Wait 10 minutes
3. Check if capture still fails

**Expected if hypothesis true:** Capture works > 5 minutes without LiveKit
**Expected if hypothesis false:** Capture still fails after 5 minutes

#### Test 3.3: Check LiveKit Server Logs
If you have access to LiveKit server logs:
```bash
# Check for disconnection events
grep "disconnect" livekit-server.log | grep <your_session_id>
```

**Expected if hypothesis true:** Server shows disconnection at failure time

---

## Hypothesis 4: macOS Window Server Timeout 🖥️

**Likelihood:** 5% (new hypothesis)

### Theory
macOS Window Server might have a timeout for screen capture sessions, independent of TCC permissions.

### Evidence Supporting
- ✅ Consistent timeout
- ✅ Affects all displays
- ⚠️ macOS has various undocumented timeouts

### Evidence Against
- ❌ Would be widely reported if common
- ❌ Hopp would have same issue

### How to Test

#### Test 4.1: Monitor Window Server Logs
```bash
log stream --predicate 'subsystem == "com.apple.WindowServer"' --level debug | grep -i "capture\|recording\|screen"
```

**Watch for:**
- "Capture session expired"
- "Screen recording timeout"
- "Stopping capture"

**Expected if hypothesis true:** Window Server logs show timeout

#### Test 4.2: Check System Logs for Capture Events
```bash
log show --predicate 'eventMessage CONTAINS "capture"' --last 1h --info
```

**After failure, search for:**
- System-level capture termination
- Window Server messages
- CoreGraphics errors

---

## Test Execution Plan

### Phase 1: Quick Diagnostics (5 minutes)
1. ✅ Rebuild Core with enhanced logging
2. ✅ Start screen share
3. ✅ Monitor logs for initial source enumeration
4. ⏳ Wait for failure (~3-5 mins)
5. ⏳ Compare initial vs restart source logs

**This will show:** Whether source titles are present initially or always empty

### Phase 2: Permission Monitoring (10 minutes)
1. ⏳ Terminal 1: `sudo log stream --predicate 'subsystem == "com.apple.TCC"' --level debug`
2. ⏳ Terminal 2: Run NAMELESS with screen share
3. ⏳ Terminal 3: Open System Settings → Screen Recording (keep visible)
4. ⏳ Wait for failure
5. ⏳ Check all three sources for permission events

**This will show:** If macOS is revoking Screen Recording permission

### Phase 3: Hopp Comparison (15 minutes)
1. ⏳ Test with Hopp's own app (if available)
2. ⏳ Search Hopp GitHub issues
3. ⏳ Check Hopp documentation for known limitations

**This will show:** If it's a fork bug or our implementation

### Phase 4: LiveKit Isolation (20 minutes)
1. ⏳ Add LiveKit connection state logging
2. ⏳ Test with LiveKit disabled (if possible)
3. ⏳ Check LiveKit server logs

**This will show:** If LiveKit connection affects local capture

---

## Test Results Template

```markdown
## Test Run: [Date/Time]

### Configuration
- macOS Version:
- Display: Built-in / External
- NAMELESS Version: greenfield@b1cc913

### Initial Source Enumeration
- Source Count:
- Source ID:
- Source Title: "[TITLE HERE]"

### Failure Details
- Time to Failure: X minutes Y seconds
- Total Frames Captured:

### Restart Source Enumeration
- Source Count:
- Source ID:
- Source Title: "[TITLE HERE]" ← COMPARE

### Hypothesis 1 Results
- TCC Logs: Permission denied? YES/NO
- Screen Recording Checkbox: Changed? YES/NO
- Console.app Errors: YES/NO

### Hypothesis 2 Results
- Hopp App Test: PASS/FAIL/N/A
- GitHub Issues Found: YES/NO

### Hypothesis 3 Results
- LiveKit State: Connected/Disconnected
- Timestamp Correlation: YES/NO

### Hypothesis 4 Results
- Window Server Logs: Timeout? YES/NO
- System Capture Events: Found? YES/NO

### Conclusion
[Primary hypothesis confirmed/ruled out]
```

---

## Next Actions Based on Results

### If Hypothesis 1 (Permission) is TRUE:
**Solutions:**
1. Code-sign the NAMELESS app properly
2. Request elevated permissions
3. Use newer ScreenCaptureKit API (if available)
4. File bug report with Apple
5. Warn user about permission timeout

### If Hypothesis 2 (libwebrtc Fork) is TRUE:
**Solutions:**
1. Report bug to Hopp team
2. Try official libwebrtc (if possible)
3. Patch the fork ourselves
4. Implement workaround (recreate capturer every 4 minutes)

### If Hypothesis 3 (LiveKit) is TRUE:
**Solutions:**
1. Decouple LiveKit from local capture
2. Fix LiveKit reconnection logic
3. Add connection monitoring

### If Hypothesis 4 (Window Server) is TRUE:
**Solutions:**
1. Recreate capture session every 4 minutes (preventive)
2. Use different capture API
3. File bug with Apple

---

## Monitoring Commands Reference

**Start these BEFORE beginning screen share:**

```bash
# Terminal 1: TCC Logs
sudo log stream --predicate 'subsystem == "com.apple.TCC"' --level debug | tee ~/tcc-logs.txt

# Terminal 2: Window Server Logs
log stream --predicate 'subsystem == "com.apple.WindowServer"' --level debug | tee ~/windowserver-logs.txt

# Terminal 3: All Screen Recording Events
log stream --predicate 'eventMessage CONTAINS "screen" OR eventMessage CONTAINS "recording" OR eventMessage CONTAINS "capture"' --level debug | tee ~/capture-logs.txt

# Terminal 4: Run NAMELESS
cd /Users/adam/.ghq/github.com/adammomen/nameless
# [start your app]
```

**Keep System Settings → Screen Recording open on another desktop**

---

## Critical Logs to Capture

When failure occurs, immediately save:
1. NAMELESS Core logs (already saved)
2. TCC logs (`~/tcc-logs.txt`)
3. Window Server logs (`~/windowserver-logs.txt`)
4. Capture logs (`~/capture-logs.txt`)
5. Screenshot of Screen Recording settings
6. Output of: `system_profiler SPDisplaysDataType > ~/displays.txt`

---

## Success Criteria

**We've identified the root cause when:**
- One hypothesis shows clear correlation with failure
- We can reproduce the fix
- We understand why source titles become empty

**Top priority:** Determine why source titles are empty during restart but not at start.

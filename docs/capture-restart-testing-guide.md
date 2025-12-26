# Capture Restart Testing Guide

**Created:** 2025-12-27
**Purpose:** Manual integration testing for Phase 2 automatic capture restart
**Related:** `docs/capture-error-recovery-plan.md`, Story 4.11

---

## Prerequisites

### Environment Setup
- **OS:** macOS (multi-monitor setup preferred)
- **Hardware:** MacBook Pro + external monitor (recommended)
- **Build:** Latest `greenfield` branch with commit `921c9bc`
- **Terminal:** Open with ability to monitor logs

### Verify Build
```bash
cd packages/core
cargo build --release
cd ../..
```

### Enable Detailed Logging
Add to your terminal before running:
```bash
export RUST_LOG=nameless_core::capture=debug
```

---

## Test Suite

### Test 1: Display Sleep/Wake Recovery ⭐ Critical

**Purpose:** Verify automatic restart when display goes to sleep and wakes up.

**Setup:**
1. Start NAMELESS client
2. Share external monitor (Display 2)
3. Verify annotation overlay is active on shared display
4. Open terminal to monitor Core logs

**Steps:**
1. Put external monitor to sleep via macOS System Settings → Displays → Energy Saver
   - Or use: `pmset displaysleepnow` (if supported)
2. Wait 2 seconds (allow sleep to complete)
3. Wake display (move mouse or press key)
4. Observe behavior

**Expected Results:**
- ✅ Logs show `Capture permanent error` (3 times, ~66ms apart)
- ✅ Logs show `Restart requested - attempting to restart capture`
- ✅ Logs show `Found source, restarting capture`
- ✅ Logs show `Successfully restarted capture`
- ✅ Screen share continues seamlessly after wake
- ✅ Annotation overlay remains active and functional
- ✅ Total recovery time < 1 second

**Failure Cases:**
- ❌ If logs show `Failed to restart after all retries` → Bug, display should be found on wake
- ❌ If overlay disappears → Check frontend error event handling
- ❌ If screen share stops → Check Core exit code

**Log Pattern to Look For:**
```
ERROR nameless_core::capture: Capture permanent error source_id=2 failure_count=1
ERROR nameless_core::capture: Capture permanent error source_id=2 failure_count=2
ERROR nameless_core::capture: Too many consecutive failures - triggering restart
WARN nameless_core::capture: Restart requested - attempting to restart capture
INFO nameless_core::capture: Starting capture restart procedure restart_attempt=1
INFO nameless_core::capture: Found source, restarting capture source_title="Display 2"
INFO nameless_core::capture: Successfully restarted capture
```

---

### Test 2: Monitor Disconnect During Share ⭐ Critical

**Purpose:** Verify retry behavior when monitor is physically disconnected.

**Setup:**
1. Start NAMELESS client
2. Share external monitor (Display 2)
3. Verify annotation overlay active

**Steps:**
1. While sharing, physically disconnect external monitor (unplug cable)
2. Observe behavior for 5 seconds
3. Leave monitor disconnected

**Expected Results:**
- ✅ Logs show 3 permanent errors (failure detection)
- ✅ Logs show `Restart requested`
- ✅ Logs show `Source not found, will retry` (5 times)
- ✅ Logs show `Failed to restart after all retry attempts`
- ✅ Logs show `Exhausted all restart attempts - stopping capture permanently`
- ✅ Overlay destroyed within 200ms of final failure
- ✅ Total time before giving up: ~4-5 seconds
- ✅ No Core crash, clean shutdown

**Failure Cases:**
- ❌ If Core crashes → Bug in restart logic
- ❌ If overlay remains visible → Frontend event listener issue
- ❌ If process hangs → Check mutex deadlock

**Log Pattern:**
```
ERROR Too many consecutive failures - triggering restart
WARN Restart requested - attempting to restart capture restart_attempts=1
WARN Source not found, will retry retry_num=0
WARN Source not found, will retry retry_num=1
...
ERROR Failed to restart capture after all retry attempts
ERROR Exhausted all restart attempts - stopping capture permanently
```

---

### Test 3: Monitor Reconnect During Retry Window 🎯 Key Feature

**Purpose:** Verify automatic recovery when monitor is reconnected during retry window.

**Setup:**
1. Start NAMELESS client
2. Share external monitor
3. Verify overlay active

**Steps:**
1. Disconnect external monitor (unplug cable)
2. Wait exactly 1 second (during retry window)
3. Reconnect external monitor
4. Observe behavior

**Expected Results:**
- ✅ Logs show initial permanent errors
- ✅ Logs show restart triggered
- ✅ Logs show `Source not found` for first 1-2 retries
- ✅ Logs show `Found source, restarting capture` after reconnection
- ✅ Logs show `Successfully restarted capture`
- ✅ Screen share resumes automatically
- ✅ Overlay repositions to reconnected monitor
- ✅ No user intervention required

**This is the killer feature** - seamless recovery from monitor reconnection.

**Log Pattern:**
```
WARN Source not found, will retry retry_num=0
WARN Source not found, will retry retry_num=1
INFO Found source, restarting capture source_title="Display 2"
INFO Successfully restarted capture restart_attempt=1
```

---

### Test 4: Built-in Display Share (Control)

**Purpose:** Verify restart works on built-in display (sleep behavior different).

**Setup:**
1. Share MacBook's built-in display
2. Close lid OR put Mac to sleep

**Steps:**
1. Share built-in display
2. Put Mac to sleep (sleep button or close lid if desktop mode)
3. Wake Mac

**Expected Results:**
- ✅ On sleep: Capture may pause or error (expected)
- ✅ On wake: Should attempt restart
- ✅ Recovery should succeed if display available
- ⚠️ Note: Built-in display behavior may differ from external

**Special Notes:**
- macOS may pause all captures during sleep
- This tests restart logic in different scenario
- Less critical than external monitor tests

---

### Test 5: Rapid Monitor Toggle (Stress Test)

**Purpose:** Stress test restart logic with rapid disconnect/reconnect cycles.

**Setup:**
1. Share external monitor
2. Have monitor cable accessible for rapid toggling

**Steps:**
1. Disconnect monitor
2. Wait 0.5 seconds
3. Reconnect monitor
4. Wait 0.5 seconds
5. Repeat 5 times

**Expected Results:**
- ✅ No crashes or hangs
- ✅ Restart attempts accumulate correctly
- ✅ Eventually recovers when monitor stays connected
- ✅ Logs show reasonable retry behavior
- ✅ No memory leaks (check with Activity Monitor)

**Metrics to Monitor:**
- CPU usage during rapid toggles (should be < 20%)
- Memory usage (should be stable)
- Log message frequency (should not spam)

**Failure Cases:**
- ❌ If Core crashes → Race condition in restart logic
- ❌ If memory grows unbounded → Leak in retry loop
- ❌ If CPU spikes to 100% → Busy-wait bug

---

### Test 6: Multiple Restart Attempts (Edge Case)

**Purpose:** Verify behavior when restart attempts are exhausted.

**Setup:**
1. Share external monitor
2. Prepare to disconnect for extended period

**Steps:**
1. Disconnect monitor
2. Let all 5 restart attempts fail (wait ~5 seconds)
3. Keep monitor disconnected
4. Observe final state

**Expected Results:**
- ✅ Logs show 5 distinct restart attempts
- ✅ Each restart has 5 retry attempts
- ✅ Final log: `Exhausted all restart attempts - stopping capture permanently`
- ✅ Core exits cleanly (exit code 0 or 1, not crash)
- ✅ Frontend event `core-terminated` fired
- ✅ Overlay destroyed by frontend
- ✅ User can manually restart screen share if desired

**Verify No Infinite Loop:**
- Total time should be ~4-5 seconds, not indefinite
- Process should exit, not hang

---

## Performance Validation

### Metrics to Track

**Restart Latency:**
- Time from first permanent error to restart trigger: ~66ms (3 errors @ 22ms)
- Time from restart trigger to first retry: 200ms (stabilization)
- Time per retry: ~100ms
- Total single restart attempt: ~866ms

**Resource Usage During Restart:**
- CPU: < 5% (single core)
- Memory: Stable (no leaks)
- Threads: No thread exhaustion

**Log Analysis:**
```bash
# Extract restart timings from logs
grep "Restart requested" <logfile> -A 10 | grep "Successfully restarted"

# Count restart attempts
grep "Starting capture restart procedure" <logfile> | wc -l

# Check for memory errors
grep -i "out of memory\|allocation failed" <logfile>
```

---

## Debugging Tips

### If Restart Fails Unexpectedly

**Check Source Enumeration:**
```rust
// In restart_capture(), verify sources are found:
let sources = cap.get_source_list();
tracing::debug!("Available sources during restart: {:?}", sources);
```

**Check Restart Attempt Counter:**
- If counter doesn't increment → mutex lock issue
- If counter exceeds MAX_RESTART_ATTEMPTS → logic bug

**Enable Verbose Logging:**
```bash
export RUST_LOG=nameless_core=trace
```

### If Overlay Not Destroyed

**Check Frontend Event Listener:**
```typescript
// In browser console:
console.log("Overlay active:", isOverlayActive)

// Manually test event:
import { emit } from '@tauri-apps/api/event'
emit('core-capture-error', 'Test error')
```

**Check Rust Event Emission:**
```rust
// In screen_share.rs, verify emit() succeeds:
if let Err(e) = app_handle.emit("core-capture-error", line_str.to_string()) {
    log::error!("Failed to emit: {}", e);
}
```

### Common Issues

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Restart never triggered | MAX_FAILURES not reached | Check error counting logic |
| Restarts forever | MAX_RESTART_ATTEMPTS not checked | Verify attempt counter |
| Core crashes | Panic in restart_capture() | Add error handling |
| Overlay orphaned | Event emission failed | Check Tauri event system |
| High CPU usage | Busy-wait in retry loop | Add sleep between retries |

---

## Success Criteria Checklist

- [ ] **Test 1 PASS:** Display sleep/wake recovers automatically
- [ ] **Test 2 PASS:** Monitor disconnect stops capture cleanly after retries
- [ ] **Test 3 PASS:** Monitor reconnect during retry window recovers
- [ ] **Test 4 PASS:** Built-in display share handles sleep/wake
- [ ] **Test 5 PASS:** Rapid toggle stress test doesn't crash
- [ ] **Test 6 PASS:** Exhausted attempts stop permanently, no infinite loop

**Performance:**
- [ ] Recovery time < 1 second for successful restart
- [ ] CPU usage < 5% during restart cycles
- [ ] No memory leaks after 100+ error cycles
- [ ] Overlay destroyed within 200ms of permanent failure

**Logs:**
- [ ] Detailed restart information logged at each step
- [ ] No ERROR logs except expected capture errors
- [ ] No PANIC or crash logs

---

## Reporting Results

### Template for Test Results

```markdown
## Test Results: Capture Restart Validation

**Date:** YYYY-MM-DD
**Tester:** Name
**Environment:** macOS 14.x, MacBook Pro + [Monitor Model]
**Build:** Commit hash

### Test 1: Display Sleep/Wake
- Status: ✅ PASS / ❌ FAIL
- Recovery time: XX ms
- Notes: [observations]

### Test 2: Monitor Disconnect
- Status: ✅ PASS / ❌ FAIL
- Stop time: XX seconds
- Notes: [observations]

[... continue for all tests ...]

### Performance Metrics
- Average restart latency: XX ms
- CPU during restart: X%
- Memory stable: Yes/No

### Issues Found
1. [Description]
2. [Description]

### Recommendations
[Any suggested improvements]
```

---

## Next Steps After Testing

**If All Tests Pass:**
1. Mark Phase 2 success criteria as validated in story file
2. Update sprint status
3. Consider adding automated integration tests for CI/CD
4. Document production behavior in user-facing docs

**If Tests Fail:**
1. Document failure scenarios with detailed logs
2. Create GitHub issues for each bug
3. Prioritize fixes based on severity
4. Re-test after fixes

**Future Enhancements:**
- Add telemetry for restart success rate in production
- Consider UX notification for restart events ("Reconnecting...")
- Add metrics dashboard for capture reliability

---

## Automated Testing Script (Optional)

For repetitive testing, consider creating a test script:

```bash
#!/bin/bash
# test-capture-restart.sh

echo "Starting capture restart test suite..."

# Test 1: Automated display sleep (if supported)
echo "Test 1: Display sleep/wake"
pmset displaysleepnow
sleep 5
# Wake display automatically
caffeinate -u -t 1

# Monitor logs
tail -f /path/to/nameless.log | grep -E "Restart|permanent error"
```

**Note:** Full automation difficult due to hardware dependency. Manual testing preferred.

---

## References

- **Implementation:** `packages/core/src/capture/mod.rs:533-976`
- **Plan:** `docs/capture-error-recovery-plan.md`
- **Story:** `docs/sprint-artifacts/4-11-render-annotations-on-sharers-overlay.md`
- **Hopp Reference:** `/Users/adam/.ghq/github.com/adammomen/nameless/hopp-main/core/src/capture/capturer.rs:523-588`

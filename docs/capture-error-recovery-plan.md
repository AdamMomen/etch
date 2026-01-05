# Capture Error Recovery & Testing Plan

**Created:** 2025-12-26
**Issue:** Random Core crashes on macOS multi-monitor setups when display sleeps or becomes unavailable

---

## Current State

### Our Implementation
- **MAX_FAILURES:** 3 (reduced from 10)
- **Strategy:** Stop capture loop after 3 consecutive `ErrorPermanent`
- **Recovery:** None - Core terminates, frontend cleans up overlay
- **User Action:** Manual restart required

### Hopp's Implementation (Reference)
- **MAX_STREAM_FAILURES_BEFORE_EXIT:** 10
- **Strategy:** Automatic stream restart with retry logic
- **Recovery:** Polling thread monitors and calls `restart_stream()`
  - Stops current stream
  - Sleeps 200ms
  - Creates new stream instance (reuses buffers)
  - Retries up to 10 times with 100ms delays
  - Exits Core process if all retries fail
- **User Action:** Automatic recovery; full restart only after 10 failed attempts

---

## Comparison Analysis

| Aspect | Our Approach | Hopp's Approach | Winner |
|--------|--------------|-----------------|--------|
| **Recovery** | None | Automatic | Hopp |
| **Complexity** | Low | High | Our (simpler) |
| **User Experience** | Poor (manual restart) | Good (auto-recovery) | Hopp |
| **Resource Usage** | Stops immediately | Retries use resources | Our |
| **Code Maintainability** | Simple | Complex | Our |
| **Production Readiness** | Medium | High | Hopp |

---

## Proposed Hybrid Approach

### Phase 1: Quick Win (Immediate)
**Goal:** Improve current implementation without major refactoring

1. **Keep current 3-failure threshold**
2. **Add one simple retry attempt before giving up**
3. **Better error messaging to frontend**

```rust
CaptureResult::ErrorPermanent => {
    let mut fail_count = failures_cb.lock();
    *fail_count += 1;
    let current_fails = *fail_count;

    tracing::error!(
        source_id = source_id,
        failure_count = current_fails,
        max_failures = MAX_FAILURES,
        "Capture permanent error - display may be unavailable"
    );

    // NEW: On first permanent error, try re-enumerating sources
    if current_fails == 1 {
        tracing::info!(source_id = source_id, "First permanent error - attempting source re-enumeration");
        // Drop and recreate capturer (simple restart)
        // If this works, reset fail_count
    }

    if current_fails >= MAX_FAILURES {
        tracing::error!(
            source_id = source_id,
            total_failures = current_fails,
            "Too many consecutive failures - stopping capture"
        );
        *should_stop_cb.lock() = true;
    }
    return;
}
```

### Phase 2: Hopp-Inspired Recovery (Next Sprint)
**Goal:** Full automatic stream restart with retry logic

1. **Add `restart_capture()` function** similar to Hopp's `restart_stream()`
2. **Implement retry logic** with exponential backoff
3. **Add failure tracking** across restart attempts
4. **Exit Core process** only after exhausting all retries

Benefits:
- ✅ Automatic recovery from transient display issues
- ✅ Better UX (users don't need to manually restart)
- ✅ Handles display sleep/wake gracefully
- ✅ Maintains screen share during monitor reconnection

Tradeoffs:
- ⚠️ More complex code
- ⚠️ Higher resource usage during retry loops
- ⚠️ Longer time to give up on truly dead displays

---

## Benchmark & Testing Strategy

### 1. Unit Tests (Rust)

**File:** `packages/core/tests/capture_error_recovery_test.rs`

```rust
#[cfg(test)]
mod capture_error_recovery_tests {
    use super::*;

    #[test]
    fn test_error_permanent_stops_after_max_failures() {
        // Simulate MAX_FAILURES consecutive ErrorPermanent results
        // Verify capture loop exits
    }

    #[test]
    fn test_error_permanent_resets_on_success() {
        // Simulate 2 errors, then success, then 2 more errors
        // Verify failure count resets and doesn't stop prematurely
    }

    #[test]
    fn test_temporary_errors_dont_count_toward_max() {
        // Simulate mix of ErrorTemporary and ErrorPermanent
        // Verify only permanent errors count
    }
}
```

### 2. Integration Tests (Display Simulation)

**File:** `packages/core/tests/integration/display_scenarios_test.rs`

**Scenarios:**
- ✅ Display goes to sleep mid-capture
- ✅ External monitor disconnected
- ✅ Display wakes up after sleep
- ✅ Monitor reconnected during capture
- ✅ Screen saver activation
- ✅ macOS Window Server restart

**Mock Strategy:**
Since we can't actually control displays in tests, we need to:
1. **Mock `DesktopCapturer`** to return controlled `CaptureResult` values
2. **Inject failure patterns** to simulate real scenarios
3. **Measure recovery time** and success rate

```rust
#[tokio::test]
async fn test_display_sleep_wake_cycle() {
    let mock_capturer = MockDesktopCapturer::new()
        .with_success_frames(100) // 100 successful frames
        .then_permanent_errors(5)  // Display sleeps (5 permanent errors)
        .then_success_frames(100); // Display wakes (resumes)

    let result = run_capture_with_mock(mock_capturer).await;

    assert_eq!(result.recovery_attempts, 1);
    assert_eq!(result.final_state, CaptureState::Running);
}
```

### 3. Stress Tests (Chaos Engineering)

**File:** `packages/core/benches/capture_stress_test.rs`

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_error_recovery(c: &mut Criterion) {
    c.bench_function("permanent_error_recovery", |b| {
        b.iter(|| {
            // Simulate rapid permanent errors
            // Measure time to stop or recover
            black_box(simulate_rapid_permanent_errors(100))
        });
    });

    c.bench_function("mixed_error_recovery", |b| {
        b.iter(|| {
            // Simulate realistic mix of temp/perm errors
            black_box(simulate_mixed_error_scenario())
        });
    });
}

criterion_group!(benches, bench_error_recovery);
criterion_main!(benches);
```

**Metrics to Track:**
- Time to detect failure (latency)
- Time to recovery (if applicable)
- Memory usage during error loops
- CPU usage during retry attempts
- Success rate of recovery attempts

### 4. Manual Testing Checklist

**macOS Multi-Monitor Setup:**

- [ ] Start screen share on Display 2
- [ ] Put Display 2 to sleep → Verify overlay destroyed within 100ms
- [ ] Wake Display 2 → Verify capture can be restarted
- [ ] Disconnect external monitor during share → Verify graceful stop
- [ ] Reconnect external monitor → Verify recovery (if Phase 2 implemented)
- [ ] Activate screen saver → Verify handling
- [ ] Lock screen → Verify handling
- [ ] Open Mission Control → Verify capture continues
- [ ] Switch Spaces → Verify capture continues

**Single Monitor:**
- [ ] Screen share on built-in display
- [ ] Put Mac to sleep → Verify cleanup on wake
- [ ] Screen saver → Verify handling

**Performance:**
- [ ] Monitor CPU usage during normal capture (baseline)
- [ ] Monitor CPU during error scenarios (should not spike indefinitely)
- [ ] Check memory leaks after 100+ error/recovery cycles

### 5. Automated E2E Tests

**File:** `packages/client/tests-tauri/specs/capture-error-recovery.spec.ts`

Using Tauri's test framework:

```typescript
import { test, expect } from '@tauri-apps/api/test'

test('overlay destroyed on Core capture error', async ({ page }) => {
  // Start screen share
  await page.click('[data-testid="screen-share-button"]')

  // Simulate Core capture error (via test IPC)
  await page.evaluate(() => {
    window.__TAURI__.event.emit('core-capture-error', 'Simulated error')
  })

  // Verify overlay is destroyed
  const overlayExists = await page.evaluate(() => {
    return document.querySelector('[data-testid="annotation-overlay"]') !== null
  })

  expect(overlayExists).toBe(false)
})
```

---

## Implementation Timeline

### Week 1: Testing Infrastructure
- [ ] Set up `criterion` for Rust benchmarks
- [ ] Create mock `DesktopCapturer` for unit tests
- [ ] Write unit tests for current error handling
- [ ] Baseline performance measurements

### Week 2: Phase 1 (Quick Win)
- [ ] Implement simple retry on first permanent error
- [ ] Add integration tests for retry logic
- [ ] Benchmark retry performance vs. immediate stop
- [ ] Update documentation

### Week 3: Phase 2 Planning (Optional)
- [ ] Design Hopp-inspired restart architecture
- [ ] Prototype `restart_capture()` function
- [ ] Performance comparison: restart vs. stop
- [ ] Decision: Implement Phase 2 or stick with Phase 1?

---

## Success Metrics

### Phase 1 Success Criteria
- ✅ 90%+ of transient errors recover automatically
- ✅ Overlay destroyed within 200ms of permanent failure
- ✅ No memory leaks after 1000+ error cycles
- ✅ CPU usage during errors < 5% (single core)

### Phase 2 Success Criteria (If Implemented)
- ✅ 95%+ of display sleep/wake cycles recover
- ✅ User never needs to manually restart for display issues
- ✅ Recovery time < 1 second for display wake
- ✅ No false positives (stopping when display is fine)

---

## Decision Matrix: Phase 1 vs Phase 2

| Factor | Phase 1 | Phase 2 |
|--------|---------|---------|
| **Dev Time** | 2-3 days | 7-10 days |
| **Complexity** | Low | High |
| **User Impact** | Medium | High |
| **Maintenance** | Low | Medium |
| **Risk** | Low | Medium |

**Recommendation:**
1. Start with **Phase 1** and gather data
2. Monitor production metrics for 2 weeks
3. Decide on Phase 2 based on actual user pain points

---

## Key Learnings from Hopp

1. **Separate Polling Thread:** Dedicated thread for monitoring stream health
2. **Buffer Reuse:** Don't reallocate buffers on restart (performance)
3. **Sentry Integration:** Upload logs before exiting on failure
4. **Process Exit Strategy:** Full restart is acceptable for unrecoverable errors
5. **Retry with Backoff:** Sleep 100-200ms between retries to let system stabilize

---

## References

- Hopp Implementation: `/Users/adam/.ghq/github.com/adammomen/etch/hopp-main/core/src/capture/`
- Our Implementation: `/Users/adam/.ghq/github.com/adammomen/etch/packages/core/src/capture/mod.rs`
- Test Suite: TBD (to be created)
- Benchmarks: TBD (to be created)

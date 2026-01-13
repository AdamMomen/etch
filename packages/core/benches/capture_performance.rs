// Capture performance benchmarks
//
// Run with: cargo bench --bench capture_performance
//
// These benchmarks measure the performance characteristics of the capture
// error handling system under various failure scenarios.

use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion};
use std::sync::{Arc, Mutex};

/// Simulates the failure counting logic from capture callback
fn simulate_error_counting(permanent_errors: u64, max_failures: u64) -> bool {
    let mut fail_count = 0u64;
    let mut should_stop = false;

    for _ in 0..permanent_errors {
        fail_count += 1;
        if fail_count >= max_failures {
            should_stop = true;
            break;
        }
    }

    should_stop
}

/// Simulates mixed temporary and permanent errors
fn simulate_mixed_errors(temp_errors: u64, perm_errors: u64, max_failures: u64) -> (u64, bool) {
    let mut fail_count = 0u64;
    let mut _temp_count = 0u64; // Unused but kept for completeness
    let mut should_stop = false;

    // Interleave temporary and permanent errors
    for i in 0..(temp_errors + perm_errors) {
        if i % 3 == 0 && perm_errors > 0 {
            // Permanent error
            fail_count += 1;
            if fail_count >= max_failures {
                should_stop = true;
                break;
            }
        } else if temp_errors > 0 {
            // Temporary error
            _temp_count += 1;
        }
    }

    (fail_count, should_stop)
}

/// Benchmarks for error counting performance
fn bench_error_counting(c: &mut Criterion) {
    let mut group = c.benchmark_group("error_counting");

    for max_failures in [3, 5, 10].iter() {
        group.bench_with_input(
            BenchmarkId::new("permanent_errors", max_failures),
            max_failures,
            |b, &max_failures| {
                b.iter(|| {
                    // Simulate hitting max failures
                    black_box(simulate_error_counting(max_failures, max_failures))
                });
            },
        );
    }

    group.finish();
}

/// Benchmarks for mixed error scenarios
fn bench_mixed_errors(c: &mut Criterion) {
    let mut group = c.benchmark_group("mixed_errors");

    // Realistic scenario: 100 temp errors, 3 permanent errors, max=3
    group.bench_function("realistic_mix", |b| {
        b.iter(|| black_box(simulate_mixed_errors(100, 3, 3)));
    });

    // Worst case: all permanent errors
    group.bench_function("worst_case_all_permanent", |b| {
        b.iter(|| black_box(simulate_mixed_errors(0, 10, 3)));
    });

    // Best case: all temporary errors
    group.bench_function("best_case_all_temporary", |b| {
        b.iter(|| black_box(simulate_mixed_errors(1000, 0, 3)));
    });

    group.finish();
}

/// Benchmarks for mutex contention in error counting
fn bench_mutex_overhead(c: &mut Criterion) {
    let mut group = c.benchmark_group("mutex_overhead");

    group.bench_function("error_counting_with_mutex", |b| {
        let fail_count = Arc::new(Mutex::new(0u64));
        let max_failures = 3u64;

        b.iter(|| {
            let fail_count = fail_count.clone();
            for _ in 0..max_failures {
                let mut count = fail_count.lock().unwrap();
                *count += 1;
                if *count >= max_failures {
                    break;
                }
            }
            // Reset for next iteration
            *fail_count.lock().unwrap() = 0;
        });
    });

    group.bench_function("error_counting_no_mutex", |b| {
        b.iter(|| {
            let mut fail_count = 0u64;
            let max_failures = 3u64;

            for _ in 0..max_failures {
                fail_count += 1;
                if fail_count >= max_failures {
                    break;
                }
            }
        });
    });

    group.finish();
}

/// Benchmarks for early return vs. full loop
fn bench_early_return(c: &mut Criterion) {
    let mut group = c.benchmark_group("early_return");

    // Measure cost of early return at different failure counts
    for failures in [1, 3, 5, 10].iter() {
        group.bench_with_input(
            BenchmarkId::new("early_return_at", failures),
            failures,
            |b, &failures| {
                b.iter(|| {
                    let max_failures = 3u64;
                    let mut should_stop = false;

                    for i in 0..failures {
                        if i >= max_failures {
                            should_stop = true;
                            break; // Early return
                        }
                    }

                    black_box(should_stop)
                });
            },
        );
    }

    group.finish();
}

criterion_group!(
    benches,
    bench_error_counting,
    bench_mixed_errors,
    bench_mutex_overhead,
    bench_early_return
);
criterion_main!(benches);

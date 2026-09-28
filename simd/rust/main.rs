#[cfg(target_arch = "x86_64")]
use std::arch::x86_64::{_mm256_add_epi32, _mm256_loadu_si256, _mm256_storeu_si256};

#[cfg(target_arch = "x86_64")]
fn main() {
    let a = [1, 2, 3, 4, 5, 6, 7, 8];
    let b = [10, 20, 30, 40, 50, 60, 70, 80];
    let mut result = [0; 8];

    // SAFETY: this example is compiled for x86-64 and uses AVX2 intrinsics.
    // Run with: rustc -C target-feature=+avx2 -C opt-level=3 main.rs
    unsafe {
        let va = _mm256_loadu_si256(a.as_ptr().cast());
        let vb = _mm256_loadu_si256(b.as_ptr().cast());
        let sum = _mm256_add_epi32(va, vb);
        _mm256_storeu_si256(result.as_mut_ptr().cast(), sum);
    }

    println!("{result:?}");
}

#[cfg(not(target_arch = "x86_64"))]
fn main() {
    eprintln!("This explicit example requires an x86-64 target with AVX2.");
}


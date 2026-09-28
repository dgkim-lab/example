# SIMD examples

Small vector-add examples in several languages. Each program adds eight values
to show the same operation in a comparable way.

## Run

```sh
g++ -O2 -mavx2 cpp/main.cpp -o /tmp/simd-cpp && /tmp/simd-cpp
rustc -C target-feature=+avx2 -C opt-level=3 rust/main.rs -o /tmp/simd-rust && /tmp/simd-rust
go run go/main.go
python3 python/main.py
node nodejs/main.js
```

## SIMD notes

- **C++** and **Rust** use explicit AVX2 instructions and therefore require an
  x86-64 CPU with AVX2 support.
- **Python** uses NumPy, whose native implementation can use SIMD internally.
- **Go** and **Node.js** use typed numeric loops. Their standard APIs do not
  provide portable explicit SIMD intrinsics; the compiler/runtime may optimize
  suitable loops. WebAssembly SIMD is a good next step for explicit SIMD in
  these ecosystems.

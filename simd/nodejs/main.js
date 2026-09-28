const a = new Int32Array([1, 2, 3, 4, 5, 6, 7, 8]);
const b = new Int32Array([10, 20, 30, 40, 50, 60, 70, 80]);
const result = new Int32Array(a.length);

// V8 may optimize this typed-array loop, but JavaScript has no portable
// explicit SIMD intrinsic API. WebAssembly SIMD is the explicit alternative.
for (let i = 0; i < result.length; i += 1) {
  result[i] = a[i] + b[i];
}

console.log([...result].join(" "));


import numpy as np


a = np.array([1, 2, 3, 4, 5, 6, 7, 8], dtype=np.int32)
b = np.array([10, 20, 30, 40, 50, 60, 70, 80], dtype=np.int32)

# NumPy performs the loop in native code and may use the CPU's SIMD backend.
result = a + b
print(result)


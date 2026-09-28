#include <immintrin.h>

#include <array>
#include <iostream>

int main() {
    alignas(32) const std::array<int, 8> a{1, 2, 3, 4, 5, 6, 7, 8};
    alignas(32) const std::array<int, 8> b{10, 20, 30, 40, 50, 60, 70, 80};
    alignas(32) std::array<int, 8> result{};

    const __m256i va = _mm256_load_si256(reinterpret_cast<const __m256i*>(a.data()));
    const __m256i vb = _mm256_load_si256(reinterpret_cast<const __m256i*>(b.data()));
    const __m256i sum = _mm256_add_epi32(va, vb);

    _mm256_store_si256(reinterpret_cast<__m256i*>(result.data()), sum);

    for (int value : result) {
        std::cout << value << ' ';
    }
    std::cout << '\n';
}


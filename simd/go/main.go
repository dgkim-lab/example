package main

import "fmt"

func main() {
	a := [8]int{1, 2, 3, 4, 5, 6, 7, 8}
	b := [8]int{10, 20, 30, 40, 50, 60, 70, 80}
	var result [8]int

	// Go has no portable SIMD intrinsic API in its standard library. This
	// regular loop is simple enough for compiler optimizations to consider.
	for i := range result {
		result[i] = a[i] + b[i]
	}

	fmt.Println(result)
}


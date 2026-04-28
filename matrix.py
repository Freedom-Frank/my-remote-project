"""
Matrix Multiplication: Three Implementations.

This script implements matrix multiplication in three different ways,
demonstrating the trade-off between algorithmic transparency and
execution efficiency in interpreted languages.

Author: Meng Wang
Course:  Remote Development Project
"""

import numpy as np


# ---------------------------------------------------------------------
# Implementation 1: Two-layer loop (innermost dot product as a sum)
# ---------------------------------------------------------------------
def matmul_two_layer(A, B):
    """
    Naive matrix multiplication using two explicit Python loops.
    The innermost summation is collapsed into a single line using
    Python's built-in sum() and a generator expression.

    Time complexity: O(n^3)
    """
    n = len(A)
    m = len(A[0])
    p = len(B[0])
    assert m == len(B), "Inner dimensions do not match for A @ B"

    C = [[0.0 for _ in range(p)] for _ in range(n)]
    for i in range(n):
        for j in range(p):
            C[i][j] = sum(A[i][k] * B[k][j] for k in range(m))
    return C


# ---------------------------------------------------------------------
# Implementation 2: One-layer loop (vectorised inner step with numpy)
# ---------------------------------------------------------------------
def matmul_one_layer(A, B):
    """
    Hybrid implementation: keep the outermost row loop in pure Python,
    but delegate each row-times-matrix product to numpy.
    """
    A_np = np.asarray(A, dtype=float)
    B_np = np.asarray(B, dtype=float)
    n = A_np.shape[0]
    p = B_np.shape[1]
    C = np.zeros((n, p))
    for i in range(n):
        C[i] = A_np[i] @ B_np
    return C


# ---------------------------------------------------------------------
# Implementation 3: No explicit loop (fully vectorised numpy)
# ---------------------------------------------------------------------
def matmul_no_loop(A, B):
    """
    Fully vectorised implementation: hand the work over to numpy and
    let its highly optimised C/Fortran backend do the heavy lifting.
    """
    A_np = np.asarray(A, dtype=float)
    B_np = np.asarray(B, dtype=float)
    return A_np @ B_np


# ---------------------------------------------------------------------
# Helper: pretty print a matrix
# ---------------------------------------------------------------------
def show(label, M):
    print(f"{label}:")
    for row in np.asarray(M):
        print(" ", [round(float(x), 4) for x in row])
    print()


# ---------------------------------------------------------------------
# Demo: run a small example and print results from all three methods
# ---------------------------------------------------------------------
def demo():
    A = [[1, 2],
         [3, 4]]
    B = [[5, 6],
         [7, 8]]
    # Expected: [[19, 22], [43, 50]]
    print("Input A:", A)
    print("Input B:", B)
    print()
    show("Two-layer Loop Result",  matmul_two_layer(A, B))
    show("One-layer Loop Result",  matmul_one_layer(A, B))
    show("No-loop (numpy) Result", matmul_no_loop(A, B))


# ---------------------------------------------------------------------
# Correctness verification suite
# ---------------------------------------------------------------------
def verify_correctness():
    """
    Run independent correctness checks on all three implementations.
    """
    print("=" * 60)
    print(" Correctness Verification Suite")
    print("=" * 60)

    # Test 1: hand-checkable 2x2 example vs numpy reference
    print("\n[Test 1] 2x2 fixed example, compare with numpy reference")
    A = np.array([[1, 2], [3, 4]], dtype=float)
    B = np.array([[5, 6], [7, 8]], dtype=float)
    expected = np.dot(A, B)
    r1 = np.array(matmul_two_layer(A.tolist(), B.tolist()))
    r2 = np.array(matmul_one_layer(A, B))
    r3 = np.array(matmul_no_loop(A, B))
    print(f"  Expected (np.dot):   {expected.flatten().tolist()}")
    print(f"  Two-layer matches:   {np.allclose(r1, expected)}")
    print(f"  One-layer matches:   {np.allclose(r2, expected)}")
    print(f"  No-loop  matches:    {np.allclose(r3, expected)}")

    # Test 2: identity matrix property
    print("\n[Test 2] Identity property: A @ I should equal A")
    A = np.random.rand(5, 5)
    I = np.eye(5)
    r1 = np.array(matmul_two_layer(A.tolist(), I.tolist()))
    r2 = np.array(matmul_one_layer(A, I))
    r3 = np.array(matmul_no_loop(A, I))
    print(f"  Two-layer == A:      {np.allclose(r1, A)}")
    print(f"  One-layer == A:      {np.allclose(r2, A)}")
    print(f"  No-loop  == A:       {np.allclose(r3, A)}")

    # Test 3: random 50x50 stress test
    print("\n[Test 3] Random 50x50 stress test")
    np.random.seed(42)
    A = np.random.rand(50, 50)
    B = np.random.rand(50, 50)
    expected = np.dot(A, B)
    r1 = np.array(matmul_two_layer(A.tolist(), B.tolist()))
    r2 = np.array(matmul_one_layer(A, B))
    r3 = np.array(matmul_no_loop(A, B))
    print(f"  Two-layer matches:   {np.allclose(r1, expected)}")
    print(f"  One-layer matches:   {np.allclose(r2, expected)}")
    print(f"  No-loop  matches:    {np.allclose(r3, expected)}")
    print(f"  Max abs error (two-layer vs np.dot): {np.max(np.abs(r1 - expected)):.2e}")

    print("\n" + "=" * 60)
    print(" All tests completed.")
    print("=" * 60)


# ---------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------
if __name__ == "__main__":
    demo()
    print()
    verify_correctness()

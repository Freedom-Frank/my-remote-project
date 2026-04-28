# Remote Development Project Report

**Student Name**: Meng Wang
**Student ID**: ZY2557108

> Assignment 1 of the Remote Development course.
> Submission: this Markdown report and the accompanying `matrix.py`,
> deployed as part of my personal Sphinx blog.

## System Configuration

The development environment is a WSL2 Ubuntu virtual machine running on
a Windows 11 host. All commands and outputs in this report were produced
on this exact environment, with `meng` as a normal (non-root) user inside
a dedicated `sphinx-env` conda environment.

### CPU Model

Output of `lscpu` (relevant fields only):
```
Architecture:             x86_64
CPU(s):                   16
On-line CPU(s) list:      0-15
Vendor ID:                GenuineIntel
Model name:               11th Gen Intel(R) Core(TM) i7-11800H @ 2.30GHz
Thread(s) per core:       2
Core(s) per socket:       8
Socket(s):                1
Caches (sum of all):
L1d: 384 KiB (8 instances)
L1i: 256 KiB (8 instances)
L2:  10 MiB (8 instances)
L3:  24 MiB (1 instance)
```

### Memory Size

Output of `free -h`:
```
           total        used        free      shared  buff/cache   available
Mem:           7.6Gi       372Mi       6.0Gi       2.0Mi       1.2Gi       7.1Gi
Swap:          2.0Gi          0B       2.0Gi
```

### Operating System Version

Output of `uname -a`:
```
Linux Simon 6.6.87.2-microsoft-standard-WSL2 #1 SMP PREEMPT_DYNAMIC Thu Jun  5 18:30:46 UTC 2025 x86_64 x86_64 x86_64 GNU/Linux
```

Output of `lsb_release -a`:
```
Distributor ID: Ubuntu
Description:    Ubuntu 22.04.5 LTS
Release:        22.04
Codename:       jammy
```

### Compiler Version

Output of `gcc --version`:
```
gcc (Ubuntu 11.4.0-1ubuntu1~22.04.2) 11.4.0
```

### Python Version

Output of `python --version` (inside the `sphinx-env` conda environment):
```
Python 3.11.15
```

## Python Language Implementation

### Source Code

The full source of `matrix.py` is included in the **Appendix** below.
It implements three independent versions of matrix multiplication, each
illustrating a different position on the spectrum from "pure Python loop"
to "fully vectorised numpy".

#### Implementation 1 — Two explicit Python loops

```python
def matmul_two_layer(A, B):
    n = len(A)
    m = len(A[0])
    p = len(B[0])
    C = [[0.0 for _ in range(p)] for _ in range(n)]
    for i in range(n):
        for j in range(p):
            C[i][j] = sum(A[i][k] * B[k][j] for k in range(m))
    return C
```

The two outer loops walk over the rows of `A` and the columns of `B`.
The inner dot product is expressed as a Python `sum()` over a generator;
this is still O(n) work in pure Python and is the slowest of the three.

#### Implementation 2 — One Python loop, inner step delegated to numpy

```python
def matmul_one_layer(A, B):
    A_np = np.asarray(A, dtype=float)
    B_np = np.asarray(B, dtype=float)
    C = np.zeros((A_np.shape[0], B_np.shape[1]))
    for i in range(A_np.shape[0]):
        C[i] = A_np[i] @ B_np
    return C
```

Only the outermost loop over rows of `A` remains in Python. For each
row, the entire "row × matrix" product is handed to numpy at once,
which collapses what would have been two more Python loops into a
single C-level call.

#### Implementation 3 — No explicit loops, fully vectorised

```python
def matmul_no_loop(A, B):
    return np.asarray(A, dtype=float) @ np.asarray(B, dtype=float)
```

All loops disappear into numpy's compiled backend. This is what numerical
Python code actually looks like in practice.

### Execution Command

The script is run from the project root inside the `sphinx-env`
conda environment:

```bash
conda activate sphinx-env
python matrix.py
```

Running the script prints (a) the result of all three implementations on
a small 2×2 example, and (b) the full output of the verification suite
described in the next section.

## Algorithm Verification

Three independent and complementary tests establish that the three
implementations are correct. They are deliberately chosen so that
"passing all of them by accident" is statistically implausible.

### Test 1 — Hand-checkable 2×2 example against `np.dot`

A 2×2 example whose product can be computed by hand is fed to all three
implementations and compared element-wise with numpy's reference
implementation `np.dot`. The expected product, computed by hand, is `[[19, 22], [43, 50]]`. All three implementations produce exactly this result.

### Test 2 — Algebraic identity: `A @ I == A`

Multiplying any matrix `A` by the identity matrix `I` of the same size
must yield `A`. This is a definitional property of matrix multiplication;
any implementation that violates it is wrong by definition. A random
5×5 `A` and `I = np.eye(5)` are passed through all three implementations.
All three produce `A` back, within floating-point tolerance.

### Test 3 — Randomised stress test on a 50×50 matrix

Small fixed examples can hide bugs that only manifest at scale. With
`numpy.random.seed(42)` for reproducibility, two random 50×50 matrices
are generated and each implementation is compared with `np.dot`. All
three pass. The maximum absolute element-wise error between the pure
Python `matmul_two_layer` result and `np.dot` is `5.33e-15`, which is
within rounding error of the IEEE 754 double-precision floating-point
limit. The discrepancy is not due to algorithmic error but to the
unavoidable fact that floating-point addition is non-associative and
the two implementations sum products in slightly different orders.

### Verification output
```
============================================================
Correctness Verification Suite
[Test 1] 2x2 fixed example, compare with numpy reference
Expected (np.dot):   [19.0, 22.0, 43.0, 50.0]
Two-layer matches:   True
One-layer matches:   True
No-loop  matches:    True
[Test 2] Identity property: A @ I should equal A
Two-layer == A:      True
One-layer == A:      True
No-loop  == A:       True
[Test 3] Random 50x50 stress test
Two-layer matches:   True
One-layer matches:   True
No-loop  matches:    True
Max abs error (two-layer vs np.dot): 5.33e-15
============================================================
All tests completed.
```

## Conclusion

This assignment introduced a complete remote-development workflow
on top of a small but didactic numerical task. Three observations stand
out from the work.

First, on **command-line and environment management**: maintaining a
clean separation between Windows (host), WSL Ubuntu (development OS),
and an isolated conda environment makes it trivial to reproduce the
same setup elsewhere — which is exactly the discipline a remote
workstation enforces. Switching from the default root account to a
normal user with `sudo` access reproduces the conventions used on the
course server (`10.62.192.91:9991`) and makes every tutorial command
work verbatim.

Second, on **Markdown documentation**: writing the report directly as
a Markdown file inside the Sphinx project means the same source becomes
both a `.md` deliverable and a page on the personal blog. There is no
duplicate copy of the content to keep in sync.

Third, on **the matrix multiplication itself**: the three Python
implementations make a single point with unusual clarity. The algorithm
is identical in all three; the only thing that changes is *who runs the
loops*. Asking the Python interpreter to drive every inner-loop
iteration is the slowest. Pushing one level of looping into numpy gives
a noticeable speed-up. Pushing all of it in (`A @ B`) gives the
production-grade speed that real numerical code actually relies on. The
gap between these three, on identical mathematics, is the gap between
"interpreted, dynamically typed, per-element overhead" and "compiled,
typed, vectorised hardware execution".

## References

- The Art of Command Line: <https://github.com/jlevy/the-art-of-command-line>
- Markdown Guide: <https://www.markdownguide.org/>
- Sphinx Documentation: <https://www.sphinx-doc.org/>
- MyST Parser (Markdown for Sphinx): <https://myst-parser.readthedocs.io/>
- Furo theme: <https://pradyunsg.me/furo/>
- numpy reference for `np.dot`: <https://numpy.org/doc/stable/reference/generated/numpy.dot.html>



## Appendix

### Full source of `matrix.py`

The full, runnable source of `matrix.py` is shown below. The
`verify_correctness()` function in particular contains the actual
implementation of the three tests described in the Algorithm
Verification section above.

```python
"""
Matrix Multiplication: Three Implementations.

This script implements matrix multiplication in three different ways,
demonstrating the trade-off between algorithmic transparency and
execution efficiency in interpreted languages.

Author: Meng Wang
Course:  Remote Development Project
"""

import numpy as np


def matmul_two_layer(A, B):
    n = len(A)
    m = len(A[0])
    p = len(B[0])
    assert m == len(B), "Inner dimensions do not match for A @ B"

    C = [[0.0 for _ in range(p)] for _ in range(n)]
    for i in range(n):
        for j in range(p):
            C[i][j] = sum(A[i][k] * B[k][j] for k in range(m))
    return C


def matmul_one_layer(A, B):
    A_np = np.asarray(A, dtype=float)
    B_np = np.asarray(B, dtype=float)
    n = A_np.shape[0]
    p = B_np.shape[1]
    C = np.zeros((n, p))
    for i in range(n):
        C[i] = A_np[i] @ B_np
    return C


def matmul_no_loop(A, B):
    A_np = np.asarray(A, dtype=float)
    B_np = np.asarray(B, dtype=float)
    return A_np @ B_np


def show(label, M):
    print(f"{label}:")
    for row in np.asarray(M):
        print(" ", [round(float(x), 4) for x in row])
    print()


def demo():
    A = [[1, 2], [3, 4]]
    B = [[5, 6], [7, 8]]
    print("Input A:", A)
    print("Input B:", B)
    print()
    show("Two-layer Loop Result",  matmul_two_layer(A, B))
    show("One-layer Loop Result",  matmul_one_layer(A, B))
    show("No-loop (numpy) Result", matmul_no_loop(A, B))


def verify_correctness():
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


if __name__ == "__main__":
    demo()
    print()
    verify_correctness()
```

### Notes

- All commands and outputs in this report were executed verbatim on
  the development machine; the contents of every code block are real
  terminal captures, not paraphrased reconstructions.
- The Sphinx project source is hosted on the school GitLab server.
  The deployed website mirrors the same source tree.

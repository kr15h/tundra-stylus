// Solve homography H (3x3) mapping src -> dst using 4 point correspondences.
// Returns H as [h00,h01,h02,h10,h11,h12,h20,h21,h22]
export function solveHomography4(src, dst) {
  if (!Array.isArray(src) || !Array.isArray(dst)) return null;
  if (src.length < 4 || dst.length < 4) return null;

  // Build 8x8 system A * h = b, where h is [h00,h01,h02,h10,h11,h12,h20,h21]
  // and h22 is fixed to 1.
  const A = [];
  const b = [];

  for (let i = 0; i < 4; i++) {
    const x = Number(src[i].x);
    const y = Number(src[i].y);
    const X = Number(dst[i].x);
    const Y = Number(dst[i].y);

    // Row for X
    A.push([ x, y, 1,  0, 0, 0,  -x * X, -y * X ]);
    b.push(X);

    // Row for Y
    A.push([ 0, 0, 0,  x, y, 1,  -x * Y, -y * Y ]);
    b.push(Y);
  }

  const h = solveLinearSystem(A, b);
  if (!h) return null;

  return [
    h[0], h[1], h[2],
    h[3], h[4], h[5],
    h[6], h[7], 1
  ];
}

// Simple Gaussian elimination with partial pivoting
function solveLinearSystem(A, b) {
  const n = A.length;       // 8
  const m = A[0].length;    // 8

  // Augment matrix
  const M = new Array(n);
  for (let i = 0; i < n; i++) {
    M[i] = A[i].slice();
    M[i].push(b[i]);
  }

  for (let col = 0; col < m; col++) {
    // Pivot
    let pivotRow = col;
    let maxAbs = Math.abs(M[col][col]);

    for (let row = col + 1; row < n; row++) {
      const v = Math.abs(M[row][col]);
      if (v > maxAbs) {
        maxAbs = v;
        pivotRow = row;
      }
    }

    if (maxAbs < 1e-12) return null;

    if (pivotRow !== col) {
      const tmp = M[col];
      M[col] = M[pivotRow];
      M[pivotRow] = tmp;
    }

    // Normalize pivot row
    const pivot = M[col][col];
    for (let j = col; j < m + 1; j++) {
      M[col][j] /= pivot;
    }

    // Eliminate
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row][col];
      if (Math.abs(factor) < 1e-12) continue;

      for (let j = col; j < m + 1; j++) {
        M[row][j] -= factor * M[col][j];
      }
    }
  }

  // Extract solution
  const x = new Array(m);
  for (let i = 0; i < m; i++) {
    x[i] = M[i][m];
  }
  return x;
}

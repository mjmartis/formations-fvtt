class Vec2D {
  constructor(readonly x: number, readonly y: number) {}
}

// Strong types for different vector use cases.
type Point = Vec2D;

class Grid {
  constructor(private blocked: boolean[][]) {}

  // Marks all cells in the line between p1 and p2 blocked.
  blockLine({x: x1, y: y1}: Point, {x: x2, y: y2}: Point) {
    // Use Bresenham line drawing algorithm.
    const dx: number = Math.abs(x2 - x1);
    const sx: number = x1 < x2 ? 1 : -1;
    const dy: number = -Math.abs(y2 - y1);
    const sy: number = y1 < y2 ? 1 : -1;

    let error: number = dx + dy;

    for (;;) {
      this.blocked[y1][x1] = true;

      if (x1 === x2 && y1 === y2) break;

      const e2 = 2 * error;
      if (e2 >= dy) {
        if (x1 === x2) break;

        error += dy;
        x1 += sx;
      }

      if (e2 <= dx) {
        if (y1 === y2) break;

        error += dx;
        y1 += sy;
      }
    }
  }
}

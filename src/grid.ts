// For cleaner for loops.
function range(start: number, end: number) {
  return [...Array(1 + end - start).keys()].map(v => start + v);
}

class Vec2D {
  constructor(readonly x: number, readonly y: number) {}

  add(o: Vec2D): Vec2D {
    return new Vec2D(this.x + o.x, this.y + o.y);
  }
}

class Point extends Vec2D {}

class Rect {
  constructor(readonly tl: Point, readonly br: Point) {}
}

// The steps that can be taken from one cell to an adjacent one.
const DIRS: Vec2D[] = [
  new Vec2D(0, -1),
  new Vec2D(-1, 0),
  new Vec2D(1, 0),
  new Vec2D(0, 1),
];

class Grid {
  // True if the cell is impassable.
  private blocked: boolean[][];

  // The index of the connected component to which this cell belongs.
  private part: number[][];

  constructor(private readonly w: number, private readonly h: number) {
    this.blocked = new Array(h).map(() => new Array(w).fill(false));
    this.part = new Array(h).map(() => new Array(w).fill(1));
  }

  // Marks all cells in the line between p1 and p2 blocked. Uses the Bresenham
  // line drawing algorithm.
  obstructLine({x: x1, y: y1}: Point, {x: x2, y: y2}: Point): void {
    const dx: number = Math.abs(x2 - x1);
    const sx: number = x1 < x2 ? 1 : -1;
    const dy: number = -Math.abs(y2 - y1);
    const sy: number = y1 < y2 ? 1 : -1;

    let error: number = dx + dy;

    for (;;) {
      this.blocked[y1][x1] = true;

      if (x1 === x2 && y1 === y2) break;

      const e2: number = 2 * error;
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

  // Returns true if the given cell is obstructed.
  isBlocked({x: x, y: y}: Point): boolean {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h || this.blocked[y][x])
      return true;
    return false;
  }

  // Returns true if there are no obstructions in the given rectangle.
  canOccupy({tl: {x: x1, y: y1}, br: {x: x2, y: y2}}: Rect) {
    for (const y of range(y1, y2 + 1)) {
      for (const x of range(x1, x2 + 1)) {
        if (this.isBlocked(new Point(x, y))) return false;
      }
    }

    return true;
  }

  calculatePartitions() {
    // Reset partitions, using 0 to denote "unvisited".
    this.part = new Array(this.h).map(() => new Array(this.w).fill(0));
    let curPart = 1;

    // Step through every cell.
    for (const oY of range(0, this.h)) {
      for (const oX of range(0, this.w)) {
        // Already seen.
        if (this.part[oY][oX] !== 0) continue;

        // Perform a breadth-first search starting from this unseen cell.
        const next: Point[] = [new Point(oX, oY)];
        let nextIndex = 0;
        while (nextIndex < next.length) {
          // Update partition of current cell.
          const {x: cX, y: cY} = next[nextIndex];
          this.part[cY][cX] = curPart;

          // Queue up each adjacent cell.
          for (const d of DIRS) {
            const nextPoint: Point = next[nextIndex].add(d);
            const {x: nX, y: nY} = nextPoint;

            // Skip visited or un-visitable cells.
            if (this.isBlocked(nextPoint) || this.part[nY][nX] !== 0) continue;

            next.push(nextPoint);
          }

          nextIndex++;
        }

        curPart++;
      }
    }
  }
}

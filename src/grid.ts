import {range, UnionFind} from './util';

class Vec2D {
  constructor(readonly x: number, readonly y: number) {}

  add(o: Vec2D): Vec2D {
    return new Vec2D(this.x + o.x, this.y + o.y);
  }
}

class Point extends Vec2D {}

class Rect {
  constructor(readonly tl: Point, readonly br: Point) {}

  translate(o: Vec2D): Rect {
    return new Rect(
      new Point(this.tl.x + o.x, this.tl.y + o.y),
      new Point(this.br.x + o.x, this.br.y + o.y)
    );
  }
}

// One connected component of a graph. May be in a "partially explored" state.
class Part {
  // The list of points currently unvisited and adjacent to the perimeter of
  // the part.
  private boundry: Point[];

  // The index of the current boundry point.
  private boundryIdx: number;

  constructor(readonly id: number, first: Point) {
    this.boundry = [first];
    this.boundryIdx = 0;
  }

  isFinal(): boolean {
    return this.boundryIdx >= this.boundry.length;
  }

  addBoundryPoint(p: Point): void {
    this.boundry.push(p);
  }

  nextBoundryPoint(): Point {
    return this.boundry[this.boundryIdx++];
  }

  subsume(p: Part): void {
    this.boundry.push(...p.boundry.slice(p.boundryIdx, p.boundry.length));
  }
}

class Grid {
  // The steps that can be taken from one cell to an adjacent one.
  private static readonly DIRS: Vec2D[] = [
    new Vec2D(0, -1),
    new Vec2D(-1, 0),
    new Vec2D(1, 0),
    new Vec2D(0, 1),
  ];

  // True if the cell is impassable.
  private blocked: boolean[][];

  // The index of the connected component to which this cell belongs.
  private part: number[][];

  constructor(readonly w: number, readonly h: number) {
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

  // Returns true if there are no obstructions in the given rectangle.
  canOccupy({tl: {x: x1, y: y1}, br: {x: x2, y: y2}}: Rect) {
    for (const y of range(y1, y2 + 1)) {
      for (const x of range(x1, x2 + 1)) {
        if (this.isBlocked(new Point(x, y))) return false;
      }
    }

    return true;
  }

  // Returns the points that the top left of the given rectangle can step to
  // without obstruction.
  adjPoints(r: Rect): Point[] {
    if (!this.canOccupy(r)) return [];

    const ps: Point[] = [];
    for (const d of Grid.DIRS) {
      if (this.canOccupy(r.translate(d))) {
        ps.push(r.tl.add(d));
      }
    }

    return ps;
  }

  // Returns true if the given cell is obstructed.
  private isBlocked({x: x, y: y}: Point): boolean {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h || this.blocked[y][x])
      return true;
    return false;
  }

  //calculatePartitions() {
  //  // Reset partitions, using 0 to denote "unvisited".
  //  this.part = new Array(this.h).map(() => new Array(this.w).fill(0));
  //  let curPart = 1;

  //  // Step through every cell.
  //  for (const oY of range(0, this.h)) {
  //    for (const oX of range(0, this.w)) {
  //      // Already seen.
  //      if (this.part[oY][oX] !== 0) continue;

  //      // Perform a breadth-first search starting from this unseen cell.
  //      const next: Point[] = [new Point(oX, oY)];
  //      let nextIndex = 0;
  //      while (nextIndex < next.length) {
  //        // Update partition of current cell.
  //        const {x: cX, y: cY} = next[nextIndex];
  //        this.part[cY][cX] = curPart;

  //        // Queue up each adjacent cell.
  //        for (const d of DIRS) {
  //          const nextPoint: Point = next[nextIndex].add(d);
  //          const {x: nX, y: nY} = nextPoint;

  //          // Skip visited or un-visitable cells.
  //          if (this.isBlocked(nextPoint) || this.part[nY][nX] !== 0) continue;

  //          next.push(nextPoint);
  //        }

  //        nextIndex++;
  //      }

  //      curPart++;
  //    }
  //  }
  //}
}

// The decomposition of a grid into connected components. Two points are
// connected if a rectangle of a fixed size can follow a path between them
// unobstructed.
class Partition {
  // The index of the connected component to which this cell belongs.
  private partIds: number[][];

  // The non-canonical ID to use for a new part.
  private nextId: number;

  // Information about each known part, keyed by non-canonical ID.
  private parts: Map<number, Part>;

  // Used to find the canonical ID for a given point.
  private uf: UnionFind;

  // Assumes non-empty grid.
  constructor(
    private readonly grid: Grid,
    private readonly w: number,
    private readonly h: number,
    private readonly cursor: Rect
  ) {
    // Use ID 0 to represent "unexplored".
    this.partIds = new Array(grid.h).map(() => new Array(grid.w).fill(0));
    this.nextId = 1;
    this.parts = new Map<number, Part>();
    this.uf = new UnionFind();
  }

  // Returns true if the two points are in the same connected component for a
  // rectangle of the given size.
  inSamePart(a: Point, b: Point): boolean {
    // Impossible points aren't in the same part.
    if (
      !this.grid.canOccupy(this.cursor.translate(a)) ||
      !this.grid.canOccupy(this.cursor.translate(b))
    ) {
      return false;
    }

    const aId: number = this.canonId(a);
    const bId: number = this.canonId(b);

    // If we've finished searching one of the parts, we would have found the
    // other point.
    if (
      (aId !== 0 && this.parts.get(aId)!.isFinal()) ||
      (bId !== 0 && this.parts.get(bId)!.isFinal())
    ) {
      return aId === bId;
    }

    // Shortcut: we might already be aware that the two points are in the same
    // part.
    if (aId !== 0 && aId === bId) return true;

    // See if the parts containing the two points are actually the same.
    this.flood(a, b);

    return this.canonId(a) === this.canonId(b);
  }

  // Returns the canonical part ID associated with the given point. Assumes
  // point is valid.
  private canonId(p: Point): number {
    return this.uf.find(this.partIds[p.y][p.x]);
  }

  // Searches the part containing point A until it is joined with the part
  // containing point B or is completely exhausted.
  private flood(a: Point, b: Point): void {
    // Populate the origin part if necessary.
    let aId = this.canonId(a);
    if (aId === 0) {
      aId = this.nextId++;
      this.partIds[a.y][a.x] = aId;
      this.parts.set(aId, new Part(aId, a));
    }

    // Iterate through points on the boundry of this part.
    const part: Part = this.parts.get(aId)!;
    while (!part.isFinal()) {
      // Add to our part or combine parts.
      const cur: Point = part.nextBoundryPoint();
      const curId: number = this.canonId(cur);
      if (curId !== 0 && curId !== aId) {
        part.subsume(this.parts.get(curId)!);
        this.uf.union(aId, curId);
        aId = this.canonId(a);
      }
      this.partIds[cur.y][cur.x] = aId;

      // We might have found part B now.
      if (this.canonId(a) === this.canonId(b)) return;

      // Eventually examine neighbours.
      for (const p of this.grid.adjPoints(this.cursor.translate(cur))) {
        if (this.canonId(p) !== aId) part.addBoundryPoint(p);
      }
    }
  }
}

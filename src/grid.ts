import {range, Queue, UnionFind} from './util';

export class Vec2D {
  constructor(readonly x: number, readonly y: number) {}

  add(o: Vec2D): Vec2D {
    return new Vec2D(this.x + o.x, this.y + o.y);
  }
}

export class Point extends Vec2D {}

export class Rect {
  constructor(readonly tl: Point, readonly br: Point) {}

  translate(o: Vec2D): Rect {
    return new Rect(
      new Point(this.tl.x + o.x, this.tl.y + o.y),
      new Point(this.br.x + o.x, this.br.y + o.y)
    );
  }
}

export class Grid {
  // The steps that can be taken from one cell to an adjacent one. Clockwise.
  private static readonly DIRS: Vec2D[] = [
    new Vec2D(0, -1),
    new Vec2D(1, 0),
    new Vec2D(0, 1),
    new Vec2D(-1, 0),
  ];

  // True if the cell is impassable.
  private blocked: boolean[][];

  constructor(readonly w: number, readonly h: number) {
    this.blocked = new Array(h).fill(false).map(() => new Array(w).fill(false));
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
    for (const y of range(y1, y2)) {
      for (const x of range(x1, x2)) {
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
}

// The decomposition of a grid into connected components. Two points are
// connected if a rectangle of a fixed size can follow a path between them
// unobstructed.
export class GridPartition {
  // The index of the connected component to which this cell belongs.
  private partIds: number[][];

  // The non-canonical ID to use for a new part.
  private nextId: number;

  // List of boundry points for each known part, keyed by non-canonical ID.
  private parts: Map<number, Queue<Point>>;

  // Used to find the canonical ID for a given point.
  private uf: UnionFind;

  // Assumes non-empty grid.
  constructor(private readonly grid: Grid, private readonly cursor: Rect) {
    // Use ID 0 to represent "unexplored".
    this.partIds = new Array(grid.h)
      .fill(0)
      .map(() => new Array(grid.w).fill(0));
    this.nextId = 1;
    this.parts = new Map<number, Queue<Point>>();
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

    // Shortcut: we might already be aware that the two points are in the same
    // part.
    if (aId !== 0 && aId === bId) return true;

    // If we've finished searching one of the parts, we would have found the
    // other point.
    if (
      (aId !== 0 && this.parts.get(aId)!.empty()) ||
      (bId !== 0 && this.parts.get(bId)!.empty())
    ) {
      return false;
    }

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
    // Populate a new part if necessary.
    let aId = this.canonId(a);
    if (aId === 0) {
      aId = this.nextId++;
      this.parts.set(aId, new Queue<Point>());
      this.parts.get(aId)!.push(a);
    }

    // Iterate through points on the boundry of this part.
    const part: Queue<Point> = this.parts.get(aId)!;
    while (!part.empty()) {
      const cur: Point = part.next();
      const curId: number = this.canonId(cur);

      // We've already proccessed this part.
      if (curId === aId) {
        continue;
      }

      // Add to our part or combine parts.
      if (curId !== 0 && curId !== aId) {
        part.extend(this.parts.get(curId)!);

        // Remove old data before IDs potentially change.
        this.parts.delete(curId);
        this.parts.delete(aId);

        // Grab the new canonical representation of part A.
        this.uf.union(aId, curId);
        aId = this.canonId(a);
        this.parts.set(aId, part);
      }
      this.partIds[cur.y][cur.x] = aId;

      // Queue neighbours to visit.
      for (const p of this.grid.adjPoints(this.cursor.translate(cur))) {
        if (this.canonId(p) !== aId) part.push(p);
      }

      // We might have found part B now. Do this at the end so that we have
      // always added all known boundry points to each part.
      if (this.canonId(a) === this.canonId(b)) return;
    }
  }
}

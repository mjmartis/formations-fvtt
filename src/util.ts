// Helper functions and classes.

// For cleaner for loops.
export function range(start: number, end: number) {
  return [...Array(1 + end - start).keys()].map(v => start + v);
}

export class UnionFind {
  private parents: Map<number, number>;
  private ranks: Map<number, number>;

  constructor() {
    this.parents = new Map<number, number>();
    this.ranks = new Map<number, number>();
  }

  // Returns the canonical representative of the set to which a number belongs.
  find(i: number): number {
    const p: number | undefined = this.parents.get(i);
    if (p === undefined) return i;

    const r: number = this.find(p);
    this.parents.set(i, r);
    return r;
  }

  // Joins the sets containing the two given numbers.
  union(i: number, j: number): void {
    const ip: number = this.find(i);
    const jp: number = this.find(j);

    if (ip === jp) return;

    const rip: number = this.ranks.get(ip) ?? -1;
    const rjp: number = this.ranks.get(jp) ?? -1;
    if (rip > rjp) {
      this.parents.set(jp, ip);
    } else {
      this.parents.set(ip, jp);
      this.ranks.set(jp, Math.max(rjp, rip + 1));
    }
  }
}
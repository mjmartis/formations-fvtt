import {range, UnionFind} from '../src/util';
import {Point, Rect, Grid, GridPartition} from '../src/grid';

// Returns a string with each line a visual representation of one row of the
// grid.
function prettyGridString(g: Grid): string {
  const blocked: Array<Array<boolean>> = g['blocked'];
  return blocked.map(r => r.map(e => (e ? 'x' : ' ')).join('')).join('\n');
}

// Returns a string with each line a visual representation of one row of the
// partition. Different parts are represented with different digits and walls
// are represented with 'x's.
//
// To avoid tracking union-find behaviour, parts are labeled from 1 onwards
// in the order they are encountered from top-left to bottom-right.
function prettyPartitionString(p: GridPartition): string {
  const blocked: Array<Array<boolean>> = p['grid']['blocked'];
  const parts: Array<Array<number>> = p['partIds'];
  const uf: UnionFind = p['uf'];

  // Map from canonical part ID to display part ID.
  const displayIds = new Map<number, number>();
  displayIds.set(0, 0);

  // Map non-canonical part IDs to IDs that increment from top-left to
  // bottom-right.
  const toCell = (n: number) => {
    const c = uf.find(n);

    const d = displayIds.get(c) ?? displayIds.size;
    displayIds.set(c, d);

    if (d === 0) return ' ';
    return d.toString();
  };

  const cells: Array<Array<string>> = parts.map(r => r.map(toCell));

  // Replace blocked squares with 'x's.
  for (const y of range(0, blocked.length)) {
    for (const x of range(0, blocked[0].length)) {
      if (blocked[y][x]) cells[y][x] = 'x';
    }
  }

  return cells.map(r => r.join('')).join('\n');
}

// Shorthand rect creation.
function newRect(tlx: number, tly: number, brx: number, bry: number) {
  return new Rect(new Point(tlx, tly), new Point(brx, bry));
}

test('grid starts empty', () => {
  const g = new Grid(2, 2);

  // prettier-ignore
  const expected: string = [
    '  ',
    '  ',
  ].join('\n');

  expect(prettyGridString(g)).toEqual(expected);
});

test('can block grid cells', () => {
  const g = new Grid(5, 5);
  g.obstructLine(new Point(0, 2), new Point(4, 2));
  g.obstructLine(new Point(2, 0), new Point(2, 2));
  g.obstructLine(new Point(1, 2), new Point(4, 4));

  // prettier-ignore
  const expected: string = [
    '  x  ',
    '  x  ',
    'xxxxx',
    '  xx ',
    '    x',
  ].join('\n');

  expect(prettyGridString(g)).toEqual(expected);
});

test('can detect collisions', () => {
  const g = new Grid(4, 4);
  g.obstructLine(new Point(1, 0), new Point(1, 1));
  g.obstructLine(new Point(0, 1), new Point(1, 1));

  // prettier-ignore
  const expected: string = [
    ' x  ',
    'xx  ',
    '    ',
    '    ',
  ].join('\n');

  expect(prettyGridString(g)).toEqual(expected);

  // 1x1 rect can fit in top left corner.
  expect(g.canOccupy(newRect(0, 0, 1, 1))).toEqual(true);

  // 2x1 rect can't fit.
  expect(g.canOccupy(newRect(0, 0, 2, 1))).toEqual(false);

  // 2x2 rect can fit in bottom right corner.
  expect(g.canOccupy(newRect(2, 2, 4, 4))).toEqual(true);
});

test('can detect available steps', () => {
  const g = new Grid(5, 4);
  g.obstructLine(new Point(1, 0), new Point(1, 0));
  g.obstructLine(new Point(0, 1), new Point(0, 1));
  g.obstructLine(new Point(2, 1), new Point(2, 1));
  g.obstructLine(new Point(3, 3), new Point(3, 3));

  // prettier-ignore
  const expected: string = [
    ' x   ',
    'x x  ',
    '     ',
    '   x ',
  ].join('\n');

  expect(prettyGridString(g)).toEqual(expected);

  // 1x1 rect can't move from top left.
  expect(g.adjPoints(newRect(0, 0, 1, 1))).toEqual([]);

  // 1x1 rect can only move down inside triangle of walls.
  expect(g.adjPoints(newRect(1, 1, 2, 2))).toEqual([new Point(1, 2)]);

  // 1x1 rect can only move up from lower right.
  expect(g.adjPoints(newRect(4, 3, 5, 4))).toEqual([new Point(4, 2)]);

  // 2x2 rect can only move down from top right.
  expect(g.adjPoints(newRect(3, 0, 5, 2))).toEqual([new Point(3, 1)]);
});

test('partition starts populated', () => {
  const g = new Grid(5, 5);
  g.obstructLine(new Point(0, 2), new Point(4, 2));
  g.obstructLine(new Point(2, 0), new Point(2, 2));
  g.obstructLine(new Point(1, 2), new Point(4, 4));
  const p = new GridPartition(g, newRect(0, 0, 1, 1));

  // prettier-ignore
  const expected: string = [
    '  x  ',
    '  x  ',
    'xxxxx',
    '  xx ',
    '    x',
  ].join('\n');

  expect(prettyPartitionString(p)).toEqual(expected);
});

test('closed part explored', () => {
  const g = new Grid(5, 5);
  g.obstructLine(new Point(2, 0), new Point(2, 2));
  g.obstructLine(new Point(2, 2), new Point(4, 2));

  const p = new GridPartition(g, newRect(0, 0, 1, 1));

  expect(p.inSamePart(new Point(0, 0), new Point(4, 0))).toEqual(false);
  // prettier-ignore
  const expected1s: string = [
    '11x  ',
    '11x  ',
    '11xxx',
    '11111',
    '11111',
  ].join('\n');
  expect(prettyPartitionString(p)).toEqual(expected1s);

  expect(p.inSamePart(new Point(0, 0), new Point(4, 4))).toEqual(true);

  expect(p.inSamePart(new Point(4, 0), new Point(4, 0))).toEqual(true);
  // prettier-ignore
  const expected2s: string = [
    '11x 2',
    '11x  ',
    '11xxx',
    '11111',
    '11111',
  ].join('\n');
  expect(prettyPartitionString(p)).toEqual(expected2s);
});

test('parts joined', () => {
  const g = new Grid(5, 2);
  g.obstructLine(new Point(2, 0), new Point(2, 0));

  const p = new GridPartition(g, newRect(0, 0, 1, 1));

  // Separate parts of the grid should be explored separately.
  expect(p.inSamePart(new Point(0, 0), new Point(1, 1))).toEqual(true);
  expect(p.inSamePart(new Point(4, 0), new Point(3, 1))).toEqual(true);
  // prettier-ignore
  const expectedFirst: string = [
    '11x22',
    '11 22',
  ].join('\n');
  expect(prettyPartitionString(p)).toEqual(expectedFirst);

  // The two separate parts should be joined together when they intersect.
  expect(p.inSamePart(new Point(0, 0), new Point(3, 1))).toEqual(true);
  // prettier-ignore
  const expectedSecond: string = [
    '11x11',
    '11111',
  ].join('\n');
  expect(prettyPartitionString(p)).toEqual(expectedSecond);
});

// Test that, when parts are combined, the boundry points from both are then
// examined.
test('boundry reused', () => {
  const g = new Grid(4, 2);
  g.obstructLine(new Point(1, 0), new Point(2, 0));

  const p = new GridPartition(g, newRect(0, 0, 1, 1));

  // Separate parts of the grid should be explored separately.
  expect(p.inSamePart(new Point(0, 0), new Point(0, 1))).toEqual(true);
  expect(p.inSamePart(new Point(2, 1), new Point(3, 1))).toEqual(true);
  // prettier-ignore
  const expectedFirst: string = [
    '1xx ',
    '1 22',
  ].join('\n');
  expect(prettyPartitionString(p)).toEqual(expectedFirst);

  // The second partition should be extended when encountered.
  expect(p.inSamePart(new Point(0, 0), new Point(3, 0))).toEqual(true);
  // prettier-ignore
  const expectedSecond: string = [
    '1xx1',
    '1111',
  ].join('\n');
  expect(prettyPartitionString(p)).toEqual(expectedSecond);
});

test('large rect handled', () => {
  const g = new Grid(5, 4);
  g.obstructLine(new Point(2, 0), new Point(2, 0));
  g.obstructLine(new Point(2, 2), new Point(2, 3));
  g.obstructLine(new Point(4, 2), new Point(4, 2));

  // 2x1 rect
  const p = new GridPartition(g, newRect(0, 0, 2, 1));

  expect(p.inSamePart(new Point(0, 0), new Point(3, 3))).toEqual(false);
  // prettier-ignore
  const expected: string = [
    '1 x1 ',
    '1111 ',
    '1 x x',
    '1 x  ',
  ].join('\n');
  expect(prettyPartitionString(p)).toEqual(expected);
});

//test('speed', () => {
//  const g = new Grid(2048, 2048);
//  const p = new GridPartition(g, newRect(0, 0, 1, 1));
//  expect(p.inSamePart(new Point(0, 0), new Point(2047, 2047))).toEqual(true);
//});

//import {expect, test} from '@jest/globals';
import {Vec2D, Point, Rect, Grid, GridPartition} from '../src/grid';

// Returns a strings with each line a visual representation of one row of the
// grid.
function prettyGrid(g: Grid): string {
  const blocked = g['blocked'];
  return blocked.map(r => r.map(e => (e ? 'x' : ' ')).join('')).join('\n');
}

test('grid starts empty', () => {
  const g = new Grid(2, 2);

  // prettier-ignore
  const expected: string = [
    '  ',
    '  ',
  ].join('\n');

  expect(prettyGrid(g)).toEqual(expected);
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

  expect(prettyGrid(g)).toEqual(expected);
});

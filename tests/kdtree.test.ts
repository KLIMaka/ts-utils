import { KDTree } from '../src/kdtree'

test("kdtree", () => {
  const points: number[] = [
    0, 0,
    0, 1,
    0, 2,
    1, 0,
    1, 1,
    1, 2,
    2, 0,
    2, 1,
    2, 2];


  const dist2d = (l: number[], r: number[]) => Math.sqrt((l[0] - r[0]) ** 2 + (l[1] - r[1]) ** 2);
  const inRange2d = (p: number[], min: number[], max: number[]) => p[0] >= min[0] && p[0] <= max[0] && p[1] >= min[1] && p[1] <= max[1];
  const tree = new KDTree(points, 2, dist2d, inRange2d);
  expect(tree.closest([1, 1])).toBe(4);
  expect(tree.closest([0, 0])).toBe(0);
  expect(tree.closest([0.499, 0])).toBe(0);
  expect(tree.closest([0.5, 0])).toBe(0);
  expect(tree.closest([1.5, 1.2])).toBe(4);
  expect(tree.closest([4, 4])).toBe(8);
  expect(tree.closest([-1, 1])).toBe(1);
  expect(tree.closest([1.7, 0.2])).toBe(6);

  expect(tree.inRange([0, 0], [1, 1])).toStrictEqual([4, 1, 3, 0]);

  const tree1 = new KDTree([0.1, 0.1, 0.1, 0.9, 0.9, 0.2], 2, dist2d, inRange2d);
  expect(tree1.inRange([0, 0], [0.5, 0.5])).toStrictEqual([0]);
  expect(tree1.closest([0.15, 0.1])).toBe(0);
})
import { DirectionalGraph, Links } from "../src/graph";


function build<T>() {
  const map = new Map<T, Links<T>>();
  const builder = {
    node: (parent: T, childs: T[], parents: T[]) => { map.set(parent, { from: new Set(parents), to: new Set(childs) }); return builder; },
    get: () => map
  }
  return builder;
}

test('graph', () => {
  const graph = new DirectionalGraph<string>();
  graph.add('a', 'b');
  graph.add('b', 'c');
  expect(graph.nodes).toStrictEqual(build().node('a', ['b'], []).node('b', ['c'], ['a']).node('c', [], ['b']).get());

  graph.remove('c');
  expect(graph.nodes).toStrictEqual(build().node('a', ['b'], []).node('b', [], ['a']).get());

  graph.remove('a');
  expect(graph.nodes).toStrictEqual(build().node('b', [], []).get());

  graph.add('a', 'b');
  graph.add('a', 'c');
  graph.add('c', 'd');
  graph.add('b', 'd');
  graph.remove('a');
  expect(graph.nodes).toStrictEqual(build().node('b', ['d'], []).node('c', ['d'], []).node('d', [], ['c', 'b']).get());

  graph.add('a', 'b');
  graph.add('a', 'c');
  graph.add('d', 'a');
  expect(graph.findCycle()).toStrictEqual(['d', 'a', 'b']);
});

test('order', () => {
  const graph = new DirectionalGraph<string>();
  graph.add('a', 'd');
  graph.add('a', 'e');
  graph.add('b', 'd');
  graph.add('d', 'e');
  graph.add('c', 'e');
  graph.add('f', 'd');
  graph.add('g', 'h');
  graph.add('d', 'x');

  expect(['a', 'b', 'c', 'd', 'e', 'f', 'x', 'h', 'g'].map(e => graph.order(e))).toStrictEqual([2, 2, 1, 1, 0, 2, 0, 0, 1]);
  expect(['a', 'b', 'c', 'd', 'e', 'f', 'x', 'h', 'g'].map(e => graph.order(e, n => n.from))).toStrictEqual([0, 0, 0, 1, 2, 0, 2, 1, 0]);
  expect(graph.orderedTo('e')).toStrictEqual(['a', 'b', 'f', 'd', 'c', 'e']);
  expect(graph.orderedTo('x')).toStrictEqual(['a', 'b', 'f', 'd', 'x']);
  expect(graph.orderedAll()).toStrictEqual(['a', 'b', 'f', 'd', 'c', 'g', 'e', 'h', 'x']);
  expect(graph.orderedAll(n => n.from)).toStrictEqual(['e', 'x', 'd', 'h', 'a', 'b', 'c', 'f', 'g']);
});

test('value dependency', () => {
  const graph = new DirectionalGraph<string>();
  graph.add('a', 'b');
  graph.add('b', 'c');
  graph.add('e', 'x');
  graph.addNode('xx');
  expect(['a', 'c', 'x', 'xx'].map(e => graph.order(e))).toStrictEqual([2, 0, 0, 0]);
  expect(graph.orderedAll()).toStrictEqual(['a', 'b', 'e', 'c', 'x', 'xx']);
});

test('subgraph', () => {
  const graph = new DirectionalGraph<string>();
  graph.add('a', 'b');
  graph.add('b', 'c');
  graph.add('d', 'e');
  graph.add('e', 'f');
  expect([...graph.subgraphs()]).toStrictEqual([['b', 'c', 'a'], ['e', 'f', 'd']]);

  graph.add('c', 'a');
  expect([...graph.subgraphs()]).toStrictEqual([['b', 'c', 'a'], ['e', 'f', 'd']]);

  graph.add('a', 'e');
  expect([...graph.subgraphs()]).toStrictEqual([['b', 'c', 'a', 'e', 'f', 'd']]);
});

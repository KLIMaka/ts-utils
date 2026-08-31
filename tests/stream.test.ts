import { iter } from '../src/iter';
import { Accessor, AccessorType, array, atomic_array, bit, bits, bits_signed, builder, byte, float, int, short, Stream, string, transformed, ubyte, uint, ushort, View } from '../src/stream';

type Test = {
  a: number;
  b: number;
  c: number;
}
const testStruct = builder()
  .field('a', byte)
  .field('b', bits(4))
  .field('c', bits_signed(4))
  .build();

function check<T>(stream: Stream, accessor: Accessor<T>, value: T): void {
  stream.setOffset(0);
  stream.write(accessor, value);
  stream.setOffset(0);
  expect(stream.read(accessor)).toStrictEqual(value);
}

test('write', () => {
  const view = new View(new Uint8Array(32));
  const stream = view.stream();

  check(stream, byte, 42);
  check(stream, ubyte, 42);
  check(stream, short, 42);
  check(stream, ushort, 42);
  check(stream, int, 42);
  check(stream, uint, 42);
  check(stream, float, 42);
  check(stream, string(10), "42");
  check(stream, array(byte, 4), [1, 2, -3, -4]);
  check(stream, atomic_array(byte, 4), new Int8Array([1, 2, -3, -4]));


  stream.setOffset(0);
  const t: Test = { a: 12, b: 4, c: -4 };
  stream.write(atomic_array(byte, 2), new Int8Array([12, 0b11000100]));
  stream.setOffset(0);
  expect(stream.read(testStruct)).toMatchObject(t);

  stream.setOffset(0);
  stream.write(testStruct, t);
  stream.setOffset(0);
  expect(stream.read(testStruct)).toMatchObject(t);
})

test('struct-builder', () => {
  const struct = builder()
    .field('a', ubyte)
    .field('b', bits(4))
    .field('c', bits_signed(4))
    .build();

  expect(struct.size).toBe(testStruct.size);

  const view = new View(new Uint8Array(2));
  const stream = view.stream();
  const t: AccessorType<typeof struct> = { a: 12, b: 4, c: -4 };
  stream.write(atomic_array(byte, 2), new Int8Array([12, 0b11000100]));
  stream.setOffset(0);
  const readed = stream.read(struct);
  expect(readed).toMatchObject(t);

  view.writeUShort(0, 0);
  stream.setOffset(0);
  stream.write(struct, t);
  stream.setOffset(0);
  expect(stream.read(atomic_array(byte, 2))).toStrictEqual(new Int8Array([12, 0b11000100]));

  const v = struct.view(view, 0);
  v.c = -22;
  expect(v).toMatchObject({ a: 12, b: 4, c: -6 });

  const copy = { ...v };
  copy.a = -4;
  expect(v).toMatchObject({ a: 12, b: 4, c: -6 });

  ushort.write(view, 0, 0);
  expect(v).toMatchObject({ a: 0, b: 0, c: 0 });
  expect(copy).toMatchObject({ a: -4, b: 4, c: -6 })
})

test('transformed', () => {
  const view = new View(new Uint8Array(32));
  const stream = view.stream();

  const tAccessor = transformed<boolean, string>(bit, s => s === 'true' ? true : false, s => s ? 'true' : 'false');
  const tarray = array(tAccessor, 8);
  stream.write(ubyte, 0);
  stream.setOffset(0);
  expect(stream.read(tarray)).toStrictEqual(new Array(8).fill('false'));

  stream.setOffset(0);
  stream.write(ubyte, 0xff);
  stream.setOffset(0);
  expect(stream.read(tarray)).toStrictEqual(new Array(8).fill('true'));

  stream.setOffset(0);
  stream.write(tarray, ['false', 'false', 'false', 'false', 'false', 'false', 'false', 'true']);
  stream.setOffset(0);
  expect(stream.read(ubyte)).toBe(128);

  const arr = tarray.view(view, 0);
  expect(arr).toMatchObject(['false', 'false', 'false', 'false', 'false', 'false', 'false', 'true']);
  arr[1] = 'true';
  expect(ubyte.read(view, 0)).toBe(130);
})

test('not int offsets', () => {
  const view = new View(new Uint8Array(32));

  const twoBits = bits(2);

  twoBits.write(view, 2 / 8, 3);
  const rbyte = byte.read(view, 0);
  expect(rbyte).toBe(12);

  byte.write(view, 0, 200); // 198 + 64 + 8
  const r = twoBits.read(view, 6 / 8);
  expect(r).toBe(3);
});

test('view', () => {

  const struct = builder()
    .field('a', byte)
    .field('b', bit)
    .field('rest', bits(7))
    .field('c', string(8))
    .field('arr', array(builder()
      .field('name', string(2))
      .field('atoms', atomic_array(byte, 2))
      .field('id', byte)
      .build(), 2))
    .build();

  expect(struct.size).toBe(20);
  const view = new View(new Uint8Array(struct.size * 2));

  let vstruct = struct.view(view, 0);
  vstruct.a = -11;
  vstruct.b = true;
  vstruct.rest = 99;
  vstruct.c = 'foo';
  vstruct.arr[1] = { name: 'az', id: 12, atoms: new Int8Array([1, 2]) }

  vstruct = struct.view(view, struct.size);
  vstruct.a = 42;
  vstruct.b = false;
  vstruct.rest = 9999999;
  vstruct.c = 'bar';
  vstruct.arr[1].name = 'xx';
  vstruct.arr[0].atoms[1] = -120;

  const values = array(struct, 2).read(view, 0);
  expect(values).toStrictEqual([
    { a: -11, b: true, c: 'foo', rest: 99, arr: [{ name: "", id: 0, atoms: new Int8Array([0, 0]) }, { name: 'az', id: 12, atoms: new Int8Array([1, 2]) }] },
    { a: 42, b: false, c: 'bar', rest: 127, arr: [{ name: "", id: 0, atoms: new Int8Array([0, -120]) }, { name: "xx", id: 0, atoms: new Int8Array([0, 0]) }] }]);
})

test('clone', () => {
  const view = new View(new Uint8Array(32));

  type T1 = { a: number, b: number, c: number, x: number };
  const struct = builder()
    .field('a', byte)
    .field('b', bits(4))
    .field('c', bits_signed(4))
    .build<T1>();

  const tt = { a: 1, b: 2, c: 3, x: 42 };
  testStruct.write(view, 0, tt);

  const copy = struct.view(view, 0);
  copy.x = 12;

  expect(copy.x).toBe(12);

  const copyOfCopy = { ...copy };
  expect(copyOfCopy).toStrictEqual({ a: 1, b: 2, c: 3, x: 12 });

  view.writeUByte(0, 11);
  const copyOfCopy1 = { ...copy };
  expect(copyOfCopy1).toStrictEqual({ a: 11, b: 2, c: 3, x: 12 });
})

test('iterable', () => {
  const view = new View(new Uint8Array(32));
  const t = builder()
    .field('a', bits(4))
    .field('b', bits(4))
    .build();
  array(t, 4).write(view, 0, [{ a: 1, b: 2 }, { a: 2, b: 4 }, { a: 3, b: 9 }, { a: 4, b: 16 }]);
  const [a, b, c, d] = array(t, 4).read(view, 0);

  expect(a).toStrictEqual({ a: 1, b: 2 });
  expect(b).toStrictEqual({ a: 2, b: 4 });
  expect(c).toStrictEqual({ a: 3, b: 9 });
  expect(d).toStrictEqual({ a: 4, b: 0 });


  const value = array(t, 4).read(view, 0);
  const container = { value };
  const x = iter(container.value)
    .enumerate()
    .filter(([{ a }]) => a > 2)
    .map(([{ b }, i]) => b + i)
    .collect();

  expect(x).toStrictEqual([11, 3]);
})

test('array view supports standard iteration methods', () => {
  const view = new View(new Uint8Array(4));
  const values = array(byte, 4);
  values.write(view, 0, [1, 2, 3, 4]);

  const arrayView = values.view(view, 0);
  const visited: number[] = [];
  arrayView.forEach(value => visited.push(value));

  expect(visited).toStrictEqual([1, 2, 3, 4]);
  expect(arrayView.map(value => value * 2)).toStrictEqual([2, 4, 6, 8]);
})

test('single buffer', () => {
  const arrayBuffer = new ArrayBuffer(32);
  const v1 = new View(new Uint8Array(arrayBuffer))
  const v2 = new View(new Uint8Array(arrayBuffer, 2));

  v1.writeByteString(0, 10, 'foobarbaz');
  expect(v2.readByteString(0, 3)).toBe('oba');

  v2.writeByteString(0, 2, 'xx');
  expect(v1.readByteString(0, 32)).toBe('foxxarbaz');

  v2.writeByteString(0, 3, 'zz');
  expect(v1.readByteString(0, 32)).toBe('fozz');
})

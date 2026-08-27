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
  const buffer = new ArrayBuffer(32);
  const view = new View(buffer);
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

  const buffer = new ArrayBuffer(32);
  const view = new View(buffer);
  const stream = view.stream();
  const t: AccessorType<typeof struct> = { a: 12, b: 4, c: -4 };
  stream.write(atomic_array(byte, 2), new Int8Array([12, 0b11000100]));
  stream.setOffset(0);
  expect(stream.read(struct)).toMatchObject(t);

  const v = struct.read(view, 0);
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
  const buffer = new ArrayBuffer(32);
  const view = new View(buffer);
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

  const arr = tarray.read(view, 0);
  expect(arr).toMatchObject(['false', 'false', 'false', 'false', 'false', 'false', 'false', 'true']);
  arr[1] = 'true';
  expect(ubyte.read(view, 0)).toBe(130);
})

test('not int offsets', () => {
  const buffer = new ArrayBuffer(32);
  const view = new View(buffer);

  const twoBits = bits(2);

  twoBits.write(view, 2 / 8, 3);
  const rbyte = byte.read(view, 0);
  expect(rbyte).toBe(12);

  byte.write(view, 0, 200); // 198 + 64 + 8
  const r = twoBits.read(view, 6 / 8);
  expect(r).toBe(3);
});

test('view', () => {
  const buffer = new ArrayBuffer(32);
  const view = new View(buffer);

  const struct = builder()
    .field('a', byte)
    .field('b', bit)
    .field('rest', bits(7))
    .field('c', string(8))
    .field('arr', array(builder()
      .field('name', string(2))
      .field('id', byte)
      .build(), 2))
    .build();

  let vstruct = struct.read(view, 0);
  vstruct.a = -11;
  vstruct.b = true;
  vstruct.rest = 99;
  vstruct.c = 'foo';
  vstruct.arr[1] = { name: 'az', id: 12 }

  vstruct = struct.read(view, struct.size);
  vstruct.a = 42;
  vstruct.b = false;
  vstruct.rest = 9999999;
  vstruct.c = 'bar';

  const values = array(struct, 2).read(view, 0);
  expect(values).toMatchObject([
    { a: -11, b: true, c: 'foo', rest: 99, arr: [{ name: "", id: 0 }, { name: 'az', id: 12 }] },
    { a: 42, b: false, c: 'bar', rest: 127, arr: [{ name: "", id: 0 }, { name: "", id: 0 }] }]);
})

test('clone', () => {
  const view = new View(new ArrayBuffer(32));

  const tt = { a: 1, b: 2, c: 3, x: 42 };
  testStruct.write(view, 0, tt);

  const copy = testStruct.read(view, 0) as AccessorType<typeof testStruct> & { x: number };
  copy.x = 12;

  expect(copy.x).toBe(12);
})
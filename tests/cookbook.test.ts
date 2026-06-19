import { ValuesContainer } from "../src/callbacks";
import { range } from "../src/collections";
import { cookbook } from "../src/cookbook"
import { sum } from "../src/mathutils";
import { DefaultScheduler } from "../src/scheduler";
import { Consumer } from "../src/types";

async function run(cb: Consumer<number>): Promise<void> {
  cb(0);
  return new Promise<void>(ok => setTimeout(ok));
}

const TIMER = () => performance.now();
const VALUES = new ValuesContainer('');
let gloabl_cb: Consumer<number> = () => { };
const SCHEDULER = DefaultScheduler(c => gloabl_cb = c, TIMER, VALUES);
const NEXTLOOP = () => run(gloabl_cb);

test('basic', async () => {
  type Input = { a: number, b: string };
  const { book, input } = cookbook<Input>();

  const output1 = book.recepie('output', [input], async ({ a }) => a + 1);
  const output2 = book.recepie('output2', [input, output1], async ({ b }, output) => `${b} * ${output}`);
  const output3 = book.recepie('output3', [output1, output2], async (o, o2) => o + o2.length);

  const inputValue = { a: 11, b: 'foo' };
  const task1 = SCHEDULER.exec(book.cook(output1, inputValue));
  const task2 = SCHEDULER.exec(book.cook(output2, inputValue));
  const task3 = SCHEDULER.exec(book.cook(output3, inputValue));
  await NEXTLOOP();

  expect((await task1.end()).unwrap()).toBe(12);
  expect((await task2.end()).unwrap()).toBe('foo * 12');
  expect((await task3.end()).unwrap()).toBe(20);
});

test('chapter', async () => {
  const { book, input } = cookbook<{ value: number, count: number }>();

  const chapter = book.chapter([input], (book, input, { count }) => {
    const values = [...range(0, count).map(x => book.recepie(`${x}`, [input], async ([{ value }]) => value * x))];
    return book.recepie('result', values, async (...values) => values.reduceRight(sum));
  })

  const task = SCHEDULER.exec(book.cook(chapter, { value: 10, count: 10 }));
  await NEXTLOOP();

  expect((await task.end()).unwrap()).toBe(10 + 20 + 30 + 40 + 50 + 60 + 70 + 80 + 90);
});

import { ValuesContainer } from "../src/callbacks";
import { cookbook, cookbookImmediate, cookbookInput } from "../src/cookbook";
import { bind, DefaultScheduler } from "../src/scheduler";
import { Consumer, typeToken } from "../src/types";

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
  const task = cookbookInput(typeToken<[Input]>(), (book, input) => {
    const output1 = book.recepie('output', [input], async ([{ a }]) => a + 1);
    const output2 = book.recepie('output2', [input, output1], async ([{ b }], output) => `${b} * ${output}`);
    return book.recepie('output3', [output1, output2], async (o, o2) => o + o2.length);
  });


  const inputValue = { a: 11, b: 'foo' };
  const taskHandle = SCHEDULER.exec(bind(task, inputValue));
  await NEXTLOOP();

  expect((await taskHandle.end()).unwrap()).toBe(20);
});

test('advanced', async () => {
  const task = cookbook(book => {
    const input = book.recepie('', [], async () => 42);
    return book.recepieTask([input], input => cookbook(book => {
      const t = book.recepie('', [], async () => 12 + input);
      const u = book.recepie('', [], async () => 42 * input);
      return book.recepie('', [t, u], async (t, u) => t + u)
    }))
  })

  const taskHandle = SCHEDULER.exec(task);
  await NEXTLOOP();
  expect((await taskHandle.end()).unwrap()).toBe(12 + 42 + 42 * 42);
});


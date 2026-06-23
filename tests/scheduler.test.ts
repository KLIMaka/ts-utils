import { DefaultScheduler } from "../src/scheduler";
import { getOrCreate, range } from "../src/collections";
import { Consumer, pair, ButLast, identity } from "../src/types";
import { ValuesContainer } from "../src/callbacks";


async function run(cb: Consumer<number>): Promise<void> {
  cb(0);
  return new Promise<void>(ok => setTimeout(ok));
}

const TIMER = () => performance.now();
const VALUES = new ValuesContainer('');
let gloabl_cb: Consumer<number> = () => { };
const SCHEDULER = DefaultScheduler(c => gloabl_cb = c, TIMER, VALUES);
const NEXTLOOP = () => run(gloabl_cb);

const counts = new Map<number, Consumer<void>[]>();
function on(c: number) {
  return new Promise<void>(ok => {
    const cbs = getOrCreate(counts, c, () => []);
    cbs.push(ok);
  });
}

function count(c: number) {
  const cbs = counts.get(c);
  if (cbs === undefined) return;
  for (const cb of cbs) cb();
}


test('Task', async () => {
  let x = 0;
  function* f1() {
    yield { progress: 0.5 };
    x = 2;
  }
  const controller1 = SCHEDULER.exec<void>(async h => {
    x = 1;
    await h.wait(f1());
  });


  expect(x).toBe(1);
  await NEXTLOOP();
  await controller1.end();
  expect(x).toBe(2)

  x = 0;
  function* f2() {
    yield { progress: 0.3 }
    x = 2;
    yield { progress: 0.3 }
    x = 3;
    throw new Error();
  }

  const controller2 = SCHEDULER.exec(async h => {
    x = 1;
    await h.wait(f2())
  });

  controller2.stop();
  expect(x).toBe(1);
  await NEXTLOOP();
  expect(x).toBe(1);
  await NEXTLOOP();
  expect(x).toBe(1);
  expect(async () => controller2.end().then(r => r.isErr())).toBeTruthy();

  x = 0;
  function* f3() {
    yield { progress: 1 };
    return 42;
  }
  const controller3 = SCHEDULER.exec<number>(async h => {
    x = 1;
    return h.wait(f3());
  });

  expect(x).toBe(1);
  expect(controller3.task.get().isDone()).toBe(false);
  await NEXTLOOP();
  expect(controller3.task.get().isDone()).toBe(true);
  expect(controller3.task.get().result().getOk()).toBe(42);
});

test('Scheduler1', async () => {
  let barrier: Consumer<void> | undefined;
  let x = 0;
  let r = 0;

  function* f() {
    yield { progress: 0.1 };
    x = 1;
    yield { progress: 0.1 };
  }

  async function b() {
    x = 2;
    await new Promise<void>(ok => barrier = ok);
    x = 3;
    return 42;
  }

  const task = SCHEDULER.exec(async h => {
    await h.wait(f());
    r = await h.waitFor(b());
    x = 5;
    return r;
  });

  expect(x).toBe(0);
  await NEXTLOOP();
  expect(x).toBe(1);
  await NEXTLOOP();
  expect(x).toBe(2);
  await NEXTLOOP();
  await NEXTLOOP();
  expect(x).toBe(2);
  barrier?.();
  expect(x).toBe(2);
  await NEXTLOOP();
  await NEXTLOOP();
  expect(x).toBe(5);
  expect(task.task.get().result().getOk()).toBe(42);
  expect(r).toBe(42);
  expect(task.task.get().isDone()).toBeTruthy();
});

test('Scheduler', async () => {
  let counter = 0;
  let x = 0;
  let y = 0;

  expect(x).toBe(0);
  function* f1() {
    x = 1;
    yield { progress: 0.5 };
    x = 2;
    yield { progress: 0.5 };
  }
  SCHEDULER.exec(h => h.wait(f1()));

  const nnH = SCHEDULER.exec(async h => {
    await h.waitFor(on(5));
    x = 99;
  });
  SCHEDULER.exec(async h => {
    await h.waitFor(on(3));
    y = 1;
  })
  SCHEDULER.exec(async h => {
    await h.waitFor(on(8));
    y = 2;
  })

  function* f2() {
    for (; ;) {
      count(++counter);
      yield { progress: 0 };
    }
  }
  const counterH = SCHEDULER.exec(h => h.wait(f2()));

  expect(x).toBe(1);
  expect(y).toBe(0);
  expect(counter).toBe(1);

  await NEXTLOOP();
  expect(x).toBe(2);
  expect(y).toBe(0);
  expect(counter).toBe(2);

  nnH.pause();

  await NEXTLOOP();
  expect(x).toBe(2);
  expect(y).toBe(1);
  expect(counter).toBe(3);

  await NEXTLOOP();
  expect(x).toBe(2);
  expect(y).toBe(1);
  expect(counter).toBe(4);

  await NEXTLOOP();
  expect(x).toBe(2);
  expect(y).toBe(1);
  expect(counter).toBe(5);

  await NEXTLOOP();
  expect(x).toBe(2);
  expect(y).toBe(1);
  expect(counter).toBe(6);

  await NEXTLOOP();
  expect(x).toBe(2);
  expect(y).toBe(1);
  expect(counter).toBe(7);

  nnH.unpause();
  expect(x).toBe(2);
  expect(y).toBe(1);
  expect(counter).toBe(7);

  await NEXTLOOP();
  expect(x).toBe(99);
  expect(y).toBe(2);
  expect(counter).toBe(8);

  counterH.pause();
  expect(y).toBe(2);
  expect(counter).toBe(8);
  await NEXTLOOP();
  expect(counter).toBe(8);
  await NEXTLOOP();
  expect(counter).toBe(8);

  counterH.unpause();
  expect(counter).toBe(8);

  await NEXTLOOP();
  expect(y).toBe(2);
  expect(counter).toBe(9);
})

test('waitMaybe', async () => {
  let stage = 0;
  const n = 1000;
  function* f() {
    for (let i = 0; i < n; i++) {
      stage = i;
      yield { progress: 1 / n };
    }
  }
  SCHEDULER.exec(handle => handle.waitMaybe(f(), '', 1));

  expect(stage).toBe(0);
  await NEXTLOOP();
  await NEXTLOOP();
  await NEXTLOOP();
  expect(stage).toBe(999);
});
import { TaskHandle } from "./scheduler";
import { BiConsumer, ButLast, First, Fn, Last } from "./types";
export type Work<I extends any[] = [], O = void> = (handle: TaskHandle, ...input: I) => Promise<O>;
export declare function tuple<I extends any[], O>(work: Work<I, O>): Work<I, [O]>;
export declare function field<I extends any[], O, K extends string>(field: K, work: Work<I, O>): Work<I, {
    [P in K]: O;
}>;
export declare class ParallelWorkBuilder<SeqInput extends any[], ParallelInput extends any[] = []> {
    tasks: Work<SeqInput, any>[];
    thread<T>(title: string, task: (...i: SeqInput) => Promise<T>): ParallelWorkBuilder<SeqInput, [...ParallelInput, T]>;
    threadWork<T>(work: Work<SeqInput, T>): ParallelWorkBuilder<SeqInput, [...ParallelInput, T]>;
}
export declare function begin(): WorkBuilder<[], [], []>;
export declare class WorkBuilder<SeqInput extends any[] = [], ParallelInput extends any[] = [], GlobalInput extends any[] = []> {
    private tasks;
    input<T>(): WorkBuilder<[T], ParallelInput, [T]>;
    multiInput<T extends any[]>(): WorkBuilder<T, ParallelInput, T>;
    append<T>(items: Iterable<T>, appender: BiConsumer<this, T>): this;
    then<T>(title: string, task: (...i: SeqInput) => Promise<T>): WorkBuilder<[T], [], GlobalInput>;
    thenPass<T>(title: string, task: (...i: SeqInput) => Promise<T>): WorkBuilder<[...SeqInput, T], [], GlobalInput>;
    thenWork<T extends any[]>(work: Work<SeqInput, T>): WorkBuilder<T, [], GlobalInput>;
    thenWorkPass<T extends any[]>(work: Work<SeqInput, T>): WorkBuilder<[...SeqInput, ...T], [], GlobalInput>;
    thenNamed<T, K extends string>(title: string, fieldId: K, task: (...i: SeqInput) => Promise<T>): WorkBuilder<[{
        [P in K]: T;
    }], [], GlobalInput>;
    thenNamedPass<T, K extends string>(title: string, fieldId: K, task: (...i: SeqInput) => Promise<T>): WorkBuilder<[...ButLast<SeqInput>, Last<SeqInput> & {
        [P in K]: T;
    }], [], GlobalInput>;
    thenWorkNamed<T, K extends string>(fieldId: K, work: Work<SeqInput, T>): WorkBuilder<[{
        [P in K]: T;
    }], [], GlobalInput>;
    thenWorkPassNamed<T, K extends string>(fieldId: K, work: Work<SeqInput, T>): WorkBuilder<[...ButLast<SeqInput>, Last<SeqInput> & {
        [P in K]: T;
    }], [], GlobalInput>;
    factory<T>(taskFactory: (builder: WorkBuilder, ...i: SeqInput) => Work<any, T>): WorkBuilder<[T], [], GlobalInput>;
    fork<T extends any[]>(b: Fn<ParallelWorkBuilder<SeqInput, []>, ParallelWorkBuilder<SeqInput, T>>): WorkBuilder<T, [], GlobalInput>;
    forkPass<T extends any[]>(b: Fn<ParallelWorkBuilder<SeqInput, []>, ParallelWorkBuilder<SeqInput, T>>): WorkBuilder<[...SeqInput, T], [], GlobalInput>;
    forkItems<I, O>(input: Iterable<I>, info: Fn<I, string>, task: Fn<I, Promise<O>>): WorkBuilder<[O[]], [], GlobalInput>;
    finish(defaultInput?: GlobalInput): Work<GlobalInput, SeqInput>;
    finishUntuple(defaultInput?: GlobalInput): Work<GlobalInput, First<SeqInput>>;
}
//# sourceMappingURL=work.d.ts.map
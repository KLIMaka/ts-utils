import { Task } from "./scheduler";
import { BiFn, Fn, MultiFn } from "./types";
export type Recepie<Input extends any[], Output> = (...input: Input) => Promise<Output>;
type Recepify<T> = {
    [P in keyof T]: Recepie<any, T[P]>;
};
type Arr<T> = T extends any[] ? T : never;
export declare function cookbook<Output>(factory: Fn<Cookbook<[]>, Task<Output, []>>): Task<Output, []>;
export declare function cookbookInput<Input extends any[], Output>(token: Input, factory: BiFn<Cookbook<Input>, Task<Input, any>, Task<Output, any>>): Task<Output, Arr<Input>>;
export declare class Cookbook<GlobalInput> {
    private input;
    private tasksGraph;
    private args;
    constructor(input: Recepie<[], GlobalInput>);
    recepie<Input extends any[], Output>(label: string, args: Recepify<Input>, recepie: MultiFn<Input, Promise<Output>>): Task<Output, Input>;
    paste<Input extends any[], Output>(args: Recepify<Input>, task: Task<Output, Input>): Task<Output, Input>;
    private cookRecepie;
    private extractGroups;
    private runGroups;
    cook<Output>(recepie: Recepie<any, Output>): Task<Output, Arr<GlobalInput>>;
}
export {};
//# sourceMappingURL=cookbook.d.ts.map
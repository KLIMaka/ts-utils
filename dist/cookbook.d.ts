import { BiFn, MultiFn } from "./types";
import { Work } from "./work";
export type Recepie<Input extends any[], Output> = (...input: Input) => Promise<Output>;
type Recepify<T> = {
    [P in keyof T]: Recepie<any, T[P]>;
};
type Arr<T> = T extends any[] ? T : never;
export declare function cookbook<Input>(): {
    input: Recepie<[], Input>;
    book: Cookbook<Input>;
};
export declare function cookbookWork<Input extends any[], Output>(token: Input, factory: BiFn<Cookbook<Input>, Work<any, Input>, Work<any, Output>>): Work<Arr<Input>, Output>;
export declare class Cookbook<GlobalInput> {
    private input;
    private recepiesGraph;
    private args;
    constructor(input: Recepie<[], GlobalInput>);
    recepie<Input extends any[], Output>(label: string, args: Recepify<Input>, recepie: MultiFn<Input, Promise<Output>>): Work<Input, Output>;
    paste<Input extends any[], Output>(args: Recepify<Input>, work: Work<Input, Output>): Work<Input, Output>;
    chapter<Input extends any[], Output>(args: Recepify<Input>, factory: MultiFn<[Cookbook<Input>, Work<any, Input>, ...Input], Work<any, Output>>): Work<Input, Output>;
    private cookRecepie;
    private extractGroups;
    private runGroups;
    cook<Output>(recepie: Recepie<any, Output>, input: GlobalInput): Work<[], Output>;
    extract<Output>(recepie: Recepie<any, Output>): Work<Arr<GlobalInput>, Output>;
}
export {};
//# sourceMappingURL=cookbook.d.ts.map
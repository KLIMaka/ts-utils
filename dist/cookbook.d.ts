import { MultiFn } from "./types";
import { Work } from "./work";
export type Recepie<Input extends any[], Output> = (...input: Input) => Promise<Output>;
type Recepify<T> = {
    [P in keyof T]: Recepie<any, T[P]>;
};
export declare function cookbook<Input>(): {
    input: Recepie<[], Input>;
    book: Cookbook<Input>;
};
export declare class Cookbook<GlobalInput> {
    private input;
    private recepiesGraph;
    private args;
    constructor(input: Recepie<[], GlobalInput>);
    recepie<Input extends any[], Output>(label: string, args: Recepify<Input>, recepie: MultiFn<Input, Promise<Output>>): Work<Input, Output>;
    inject<Input extends any[], Output>(args: Recepify<Input>, work: Work<Input, Output>): Work<Input, Output>;
    chapter<Input extends any[], Output>(args: Recepify<Input>, factory: MultiFn<[Cookbook<Input>, Work<any, Input>, ...Input], Work<any, Output>>): Work<Input, Output>;
    private cookRecepie;
    cook<Output>(recepie: Recepie<any, Output>, input: GlobalInput): Work<[], Output>;
}
export {};
//# sourceMappingURL=cookbook.d.ts.map
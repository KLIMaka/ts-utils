import { Value } from "./callbacks";
import { BiFunction, Function, Supplier } from "./types";
export type NavigateAction = 'nop' | 'next' | 'prev' | 'nextMicro' | 'prevMicro' | 'nextMacro' | 'prevMacro' | 'start' | 'end';
export type Navigator = Function<NavigateAction, Promise<void>>;
export declare const EMPTY_NAVIGATOR: Navigator;
export declare function navigateList<T>(value: Value<T>, listSupplier: Supplier<T[]>, wrap?: BiFunction<number, number, number>, macroStep?: number): Navigator;
//# sourceMappingURL=navigators.d.ts.map
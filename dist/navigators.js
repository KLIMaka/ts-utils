import { match } from "ts-pattern";
import { takeFirst } from "./collections";
import { cyclic } from "./mathutils";
export const EMPTY_NAVIGATOR = async (_) => { };
export function navigateList(value, listSupplier, wrap = cyclic, macroStep = 10) {
    const navigate = async (type) => {
        if (type === 'nop')
            return;
        const list = listSupplier();
        const currentValue = value.get();
        const currentId = list.indexOf(currentValue);
        if (currentId === -1) {
            takeFirst(list).ifPresent(first => value.set(first));
        }
        else {
            const newId = match(type)
                .with('next', 'nextMicro', () => wrap(currentId + 1, list.length))
                .with('prev', 'prevMicro', () => wrap(currentId - 1, list.length))
                .with('nextMacro', () => wrap(currentId + macroStep, list.length))
                .with('prevMacro', () => wrap(currentId - macroStep, list.length))
                .with('start', () => 0)
                .with('end', () => list.length - 1)
                .exhaustive();
            value.set(list[newId]);
        }
    };
    return navigate;
}
//# sourceMappingURL=navigators.js.map
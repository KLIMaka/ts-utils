export declare class LexerRule {
    pattern: RegExp;
    name: string;
    mid: number;
    conv: (s: string) => any;
    id: number;
    constructor(pattern: RegExp, name: string, mid?: number, conv?: (s: string) => any);
}
export declare class Lexer {
    private rulesIndex;
    private rules;
    private src;
    private offset;
    private lastOffset;
    private eoi;
    private matchedRule;
    private matchedValue;
    addRule(rule: LexerRule): this;
    add(pattern: RegExp, name: string, mid?: number, conv?: (s: string) => any): this;
    mark(): number;
    reset(offset?: number): string;
    setSource(src: string): void;
    private exec;
    next(): string;
    rule(): LexerRule | null;
    value(): any;
    isEoi(): boolean;
}
//# sourceMappingURL=lexer.d.ts.map
export declare class LexerRule {
    pattern: RegExp;
    name: string;
    mid: number;
    conv: (s: string) => any;
    constructor(pattern: RegExp, name: string, mid?: number, conv?: (s: string) => any);
}
export type LexerMatch = {
    type: 'rule';
    rule: string;
    value: any;
} | {
    type: 'eoi';
};
export declare const EOI: LexerMatch;
export declare class Lexer {
    private rulesIndex;
    private rules;
    private src;
    private offset;
    private lastOffset;
    private eoi;
    addRule(rule: LexerRule): this;
    add(pattern: RegExp, name: string, mid?: number, conv?: (s: string) => any): this;
    mark(): number;
    reset(offset?: number): LexerMatch;
    setSource(src: string): void;
    private exec;
    next(): LexerMatch;
    isEoi(): boolean;
}
//# sourceMappingURL=lexer.d.ts.map
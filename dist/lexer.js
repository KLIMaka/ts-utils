export class LexerRule {
    pattern;
    name;
    mid;
    conv;
    constructor(pattern, name, mid = 0, conv = (s) => s) {
        this.pattern = pattern;
        this.name = name;
        this.mid = mid;
        this.conv = conv;
    }
}
export const EOI = { type: 'eoi' };
export class Lexer {
    rulesIndex = new Map();
    rules = [];
    src;
    offset = 0;
    lastOffset = 0;
    eoi = false;
    addRule(rule) {
        const r = this.rulesIndex.get(rule.name);
        if (r === undefined)
            this.rules.push(rule);
        else
            throw new Error('Rule ' + rule.name + ' already exist');
        this.rulesIndex.set(rule.name, { id: this.rules.length, rule });
        return this;
    }
    add(pattern, name, mid = 0, conv = s => s) {
        return this.addRule(new LexerRule(pattern, name, mid, conv));
    }
    mark() {
        return this.lastOffset;
    }
    reset(offset = 0) {
        this.offset = offset;
        this.lastOffset = offset;
        this.eoi = false;
        return this.next();
    }
    setSource(src) {
        this.src = src;
        this.offset = 0;
        this.eoi = false;
    }
    exec() {
        if (this.src === undefined)
            throw new Error();
        if (this.offset >= this.src.length)
            this.eoi = true;
        if (this.eoi)
            return EOI;
        let len = 0;
        let matchedValue = null;
        let matchedRule = null;
        let subsrc = this.src.substring(this.offset);
        for (const rule of this.rules) {
            const match = rule.pattern.exec(subsrc);
            if (match != null && match[0].length >= len) {
                matchedValue = match;
                matchedRule = rule;
                len = match[0].length;
            }
        }
        this.lastOffset = this.offset;
        this.offset += len;
        if (matchedRule == null)
            throw new Error('Unexpected input "' + subsrc.substring(0, 10) + '..."');
        return { type: 'rule', rule: matchedRule.name, value: matchedValue?.[matchedRule.mid] };
    }
    next() {
        return this.exec();
    }
    isEoi() {
        return this.eoi;
    }
}
//# sourceMappingURL=lexer.js.map
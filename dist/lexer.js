export class LexerRule {
    pattern;
    name;
    mid;
    conv;
    id = null;
    constructor(pattern, name, mid = 0, conv = (s) => s) {
        this.pattern = pattern;
        this.name = name;
        this.mid = mid;
        this.conv = conv;
    }
}
export class Lexer {
    rulesIndex = new Map();
    rules = [];
    src;
    offset = 0;
    lastOffset = 0;
    eoi = false;
    matchedRule = null;
    matchedValue = null;
    addRule(rule) {
        const r = this.rulesIndex.get(rule.name);
        if (r === undefined) {
            rule.id = this.rules.length;
            this.rules.push(rule);
        }
        else {
            throw new Error('Rule ' + rule.name + ' already exist');
        }
        this.rulesIndex.set(rule.name, rule);
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
        if (this.offset >= this.src.length)
            this.eoi = true;
        if (this.eoi)
            return null;
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
        this.matchedRule = matchedRule;
        this.matchedValue = matchedValue;
        this.lastOffset = this.offset;
        this.offset += len;
        if (matchedRule == null)
            throw new Error('Unexpected input "' + subsrc.substring(0, 10) + '..."');
        return matchedRule.name;
    }
    next() {
        return this.exec();
    }
    rule() {
        return this.matchedRule;
    }
    value() {
        return this.rule()?.conv(this.matchedValue?.[this.rule().mid]);
    }
    isEoi() {
        return this.eoi;
    }
}
//# sourceMappingURL=lexer.js.map
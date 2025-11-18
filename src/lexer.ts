
export class LexerRule {
  constructor(
    public pattern: RegExp,
    public name: string,
    public mid = 0,
    public conv: (s: string) => any = (s: string) => s
  ) { }
}

type LexerRuleId = { id: number, rule: LexerRule };

export type LexerMatch = { type: 'rule', rule: string, value: any } | { type: 'eoi' };
export const EOI: LexerMatch = { type: 'eoi' };

export class Lexer {
  private rulesIndex = new Map<string, LexerRuleId>();
  private rules: LexerRule[] = [];
  private src: string | undefined;
  private offset = 0;
  private lastOffset = 0;
  private eoi = false;

  addRule(rule: LexerRule): this {
    const r = this.rulesIndex.get(rule.name);
    if (r === undefined) this.rules.push(rule);
    else throw new Error('Rule ' + rule.name + ' already exist');
    this.rulesIndex.set(rule.name, { id: this.rules.length, rule });
    return this;
  }

  add(pattern: RegExp, name: string, mid = 0, conv: (s: string) => any = s => s) {
    return this.addRule(new LexerRule(pattern, name, mid, conv))
  }

  mark(): number {
    return this.lastOffset;
  }

  reset(offset: number = 0): LexerMatch {
    this.offset = offset;
    this.lastOffset = offset;
    this.eoi = false;
    return this.next();
  }

  setSource(src: string): void {
    this.src = src;
    this.offset = 0;
    this.eoi = false;
  }

  private exec(): LexerMatch {
    if (this.src === undefined) throw new Error();
    if (this.offset >= this.src.length) this.eoi = true;
    if (this.eoi) return EOI;

    let len = 0;
    let matchedValue = null;
    let matchedRule: LexerRule | null = null;
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

  next(): LexerMatch {
    return this.exec()
  }

  isEoi(): boolean {
    return this.eoi;
  }
}

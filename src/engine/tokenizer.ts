// Hand-written tokenizer and recursive-descent expression parser for the safe pandas console (no eval).

export type Tok =
  | { t: 'name'; v: string }
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'op'; v: string }

export type Node =
  | { k: 'name'; id: string }
  | { k: 'num'; v: number }
  | { k: 'str'; v: string }
  | { k: 'list'; items: Node[] }
  | { k: 'dict'; entries: Array<[Node, Node]> }
  | { k: 'attr'; obj: Node; name: string }
  | { k: 'call'; fn: Node; args: Node[]; kwargs: Record<string, Node> }
  | { k: 'index'; obj: Node; keys: Node[] }
  | { k: 'bin'; op: string; l: Node; r: Node }
  | { k: 'neg'; v: Node }

export interface Statement {
  target?: Node
  value: Node
}

export class SyntaxErr extends Error {}

const OPS = ['==', '!=', '<=', '>=', '<', '>', '=', '(', ')', '[', ']', '{', '}', ',', ':', '.', '|', '&', '-', '+', '~']

/** Remove a trailing # comment that is not inside a string literal. */
export function stripComment(line: string): string {
  let quote: string | null = null
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (quote) {
      if (ch === '\\') i += 1
      else if (ch === quote) quote = null
    } else if (ch === '"' || ch === "'") quote = ch
    else if (ch === '#') return line.slice(0, i)
  }
  return line
}

export function tokenize(src: string): Tok[] {
  const out: Tok[] = []
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (/\s/.test(ch)) {
      i += 1
      continue
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1
      let s = ''
      while (j < src.length && src[j] !== ch) {
        if (src[j] === '\\' && j + 1 < src.length) {
          const n = src[j + 1]
          s += n === 'n' ? '\n' : n === 't' ? '\t' : n
          j += 2
        } else {
          s += src[j]
          j += 1
        }
      }
      if (j >= src.length) throw new SyntaxErr('SyntaxError: unterminated string literal')
      out.push({ t: 'str', v: s })
      i = j + 1
      continue
    }
    const numMatch = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(src.slice(i))
    if (numMatch && /[\d.]/.test(ch)) {
      out.push({ t: 'num', v: Number(numMatch[0]) })
      i += numMatch[0].length
      continue
    }
    const nameMatch = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))
    if (nameMatch) {
      out.push({ t: 'name', v: nameMatch[0] })
      i += nameMatch[0].length
      continue
    }
    const op = OPS.find((o) => src.startsWith(o, i))
    if (!op) throw new SyntaxErr(`SyntaxError: unexpected character '${ch}'`)
    out.push({ t: 'op', v: op })
    i += op.length
  }
  return out
}

class P {
  i = 0
  constructor(private toks: Tok[]) {}
  peek(): Tok | undefined {
    return this.toks[this.i]
  }
  isOp(v: string): boolean {
    const t = this.peek()
    return t?.t === 'op' && t.v === v
  }
  eat(v: string): void {
    if (!this.isOp(v)) throw new SyntaxErr(`SyntaxError: expected '${v}'`)
    this.i += 1
  }
  done(): boolean {
    return this.i >= this.toks.length
  }

  expr(): Node {
    return this.or()
  }
  or(): Node {
    let l = this.and()
    while (this.isOp('|')) {
      this.i += 1
      l = { k: 'bin', op: '|', l, r: this.and() }
    }
    return l
  }
  and(): Node {
    let l = this.cmp()
    while (this.isOp('&')) {
      this.i += 1
      l = { k: 'bin', op: '&', l, r: this.cmp() }
    }
    return l
  }
  cmp(): Node {
    const l = this.unary()
    for (const o of ['==', '!=', '<=', '>=', '<', '>']) {
      if (this.isOp(o)) {
        this.i += 1
        return { k: 'bin', op: o, l, r: this.unary() }
      }
    }
    return l
  }
  unary(): Node {
    if (this.isOp('-')) {
      this.i += 1
      return { k: 'neg', v: this.unary() }
    }
    if (this.isOp('+')) {
      this.i += 1
      return this.unary()
    }
    return this.postfix()
  }
  postfix(): Node {
    let n = this.primary()
    for (;;) {
      if (this.isOp('.')) {
        this.i += 1
        const t = this.peek()
        if (t?.t !== 'name') throw new SyntaxErr('SyntaxError: expected a name after "."')
        this.i += 1
        n = { k: 'attr', obj: n, name: t.v }
      } else if (this.isOp('(')) {
        this.i += 1
        const args: Node[] = []
        const kwargs: Record<string, Node> = {}
        while (!this.isOp(')')) {
          const t = this.peek()
          const nx = this.toks[this.i + 1]
          if (t?.t === 'name' && nx?.t === 'op' && nx.v === '=') {
            this.i += 2
            kwargs[t.v] = this.expr()
          } else args.push(this.expr())
          if (!this.isOp(',')) break
          this.i += 1
        }
        this.eat(')')
        n = { k: 'call', fn: n, args, kwargs }
      } else if (this.isOp('[')) {
        this.i += 1
        const keys: Node[] = [this.expr()]
        while (this.isOp(',')) {
          this.i += 1
          keys.push(this.expr())
        }
        this.eat(']')
        n = { k: 'index', obj: n, keys }
      } else return n
    }
  }
  primary(): Node {
    const t = this.peek()
    if (!t) throw new SyntaxErr('SyntaxError: unexpected end of command')
    this.i += 1
    if (t.t === 'name') return { k: 'name', id: t.v }
    if (t.t === 'num') return { k: 'num', v: t.v }
    if (t.t === 'str') return { k: 'str', v: t.v }
    if (t.v === '(') {
      const e = this.expr()
      this.eat(')')
      return e
    }
    if (t.v === '[') {
      const items: Node[] = []
      while (!this.isOp(']')) {
        items.push(this.expr())
        if (!this.isOp(',')) break
        this.i += 1
      }
      this.eat(']')
      return { k: 'list', items }
    }
    if (t.v === '{') {
      const entries: Array<[Node, Node]> = []
      while (!this.isOp('}')) {
        const key = this.expr()
        this.eat(':')
        entries.push([key, this.expr()])
        if (!this.isOp(',')) break
        this.i += 1
      }
      this.eat('}')
      return { k: 'dict', entries }
    }
    throw new SyntaxErr(`SyntaxError: unexpected '${t.v}'`)
  }
}

/** Parse one statement: `expr` or `target = expr`. */
export function parseStatement(src: string): Statement {
  const p = new P(tokenize(src))
  const first = p.expr()
  if (p.done()) return { value: first }
  if (p.isOp('=')) {
    p.i += 1
    const value = p.expr()
    if (!p.done()) throw new SyntaxErr('SyntaxError: unexpected text after the command')
    return { target: first, value }
  }
  throw new SyntaxErr('SyntaxError: unexpected text after the command')
}

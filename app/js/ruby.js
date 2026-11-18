// ruby.js: a small Ruby-subset interpreter (lexer, parser, evaluator) that runs offline in the browser.
// It covers the features used in the CSC 330 Ruby slides. The built-in classes live in rubylib.js.
// Usage: Ruby.run(source, { asks: ['expr', ...], echo: false, limit: 3000000, trace: fn })
//        -> { output, error, values }
(function (root) {
  'use strict';

  // ====================================================================== lexer
  const KEYWORDS = new Set('alias and begin break case class def do else elsif end ensure false for if in module next nil not or rescue return self super then true unless until when while yield'.split(' '));
  const OPS = ['**=', '<=>', '===', '...', '<<=', '>>=', '&&=', '||=', '**', '==', '!=', '>=', '<=', '&&', '||', '<<', '>>', '+=', '-=', '*=', '/=', '%=', '|=', '&=', '^=', '..', '::', '->', '=>', '=~', '&.',
    '+', '-', '*', '/', '%', '=', '<', '>', '!', '&', '|', '^', '~', '?', ':', ',', '.', '(', ')', '[', ']', '{', '}', ';'];
  const SYM_OPS = ['[]=', '[]', '<=>', '===', '==', '=~', '!=', '**', '+@', '-@', '<<', '>>', '<=', '>=', '+', '-', '*', '/', '%', '<', '>', '!', '&', '|', '^', '~'];
  const METHOD_OPS = new Set(['+', '-', '*', '/', '%', '**', '==', '!=', '<', '>', '<=', '>=', '<=>', '===', '<<', '>>', '!', '&', '|', '^', '~', '-@', '+@', '=~']);

  function cleanSource(s) {
    return String(s).replace(/[\u2018\u2019\u2032]/g, "'").replace(/[\u201C\u201D\u2033]/g, '"').replace(/\u00A0/g, ' ').replace(/[\u2013\u2014]/g, '-').replace(/\r\n?/g, '\n');
  }
  class SyntaxErr extends Error { constructor(msg, line) { super(msg); this.line = line; } }

  function lex(src) {
    const toks = []; let i = 0, line = 1, sp = true; const n = src.length;
    const push = (t, v) => { toks.push({ t, v, sp, line }); sp = false; };
    const prev = () => toks[toks.length - 1];
    const isId = (ch) => ch !== undefined && /[A-Za-z0-9_]/.test(ch);
    while (i < n) {
      const c = src[i];
      if ((i === 0 || src[i - 1] === '\n') && src.startsWith('=begin', i)) {
        let j = src.indexOf('\n=end', i); j = j < 0 ? n : j + 5;
        while (j < n && src[j] !== '\n') j++;
        for (let k = i; k < j; k++) if (src[k] === '\n') line++;
        i = j; continue;
      }
      if (c === ' ' || c === '\t') { sp = true; i++; continue; }
      if (c === '\\' && src[i + 1] === '\n') { i += 2; line++; sp = true; continue; }
      if (c === '#') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '\n') {
        let j = i + 1; while (j < n && /[ \t\n]/.test(src[j])) j++;
        if (src[j] === '.' && src[j + 1] !== '.') { for (let k = i; k < j; k++) if (src[k] === '\n') line++; i = j; sp = true; continue; } // leading-dot continuation
        if (prev() && prev().t !== 'nl') push('nl', '\n');
        line++; i++; sp = true; continue;
      }
      if (/[0-9]/.test(c)) {
        let j = i, isF = false; while (j < n && /[0-9_]/.test(src[j])) j++;
        if (src[j] === '.' && /[0-9]/.test(src[j + 1] || '')) { isF = true; j++; while (j < n && /[0-9_]/.test(src[j])) j++; }
        if (/[eE]/.test(src[j] || '') && /[-+0-9]/.test(src[j + 1] || '') && !/[A-Za-z_]/.test(src[j + 2] || '0')) { isF = true; j += 2; while (j < n && /[0-9]/.test(src[j])) j++; }
        push(isF ? 'float' : 'int', Number(src.slice(i, j).replace(/_/g, ''))); i = j; continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        let j = i; while (j < n && isId(src[j])) j++;
        if ((src[j] === '?' || src[j] === '!') && src[j + 1] !== '=') j++;
        const w = src.slice(i, j); const p = prev();
        const afterDot = p && p.t === 'op' && (p.v === '.' || p.v === '&.') && !sp;
        if (!afterDot && src[j] === ':' && src[j + 1] !== ':' && p && p.t === 'op' && (p.v === '{' || p.v === ',' || p.v === '(') && /[\s]/.test(src[j + 1] || ' ')) { push('label', w); i = j + 1; continue; }
        if (!afterDot && KEYWORDS.has(w)) push('kw', w);
        else if (/^[A-Z]/.test(w)) push('const', w);
        else push('ident', w);
        i = j; continue;
      }
      if (c === '@' || c === '$') {
        let j = i + 1; if (src[j] === '@') j++;
        const st = j; while (j < n && isId(src[j])) j++;
        if (j === st) throw new SyntaxErr("syntax error, unexpected '" + c + "'", line);
        const w = src.slice(i, j); push(c === '$' ? 'gvar' : w.startsWith('@@') ? 'cvar' : 'ivar', w); i = j; continue;
      }
      if (c === '"' || c === "'") {
        const r = readString(src, i, c, line); push('str', r.parts); line = r.line; i = r.end; continue;
      }
      if (c === ':' && src[i + 1] !== ':') {
        if (/[A-Za-z_]/.test(src[i + 1] || '')) {
          let j = i + 1; while (j < n && isId(src[j])) j++;
          if ((src[j] === '?' || src[j] === '!') && src[j + 1] !== '=') j++;
          else if (src[j] === '=' && !/[=~>]/.test(src[j + 1] || '')) j++;
          push('sym', src.slice(i + 1, j)); i = j; continue;
        }
        if (src[i + 1] === '"') { const r = readString(src, i + 1, '"', line); push('sym', r.parts.join('')); line = r.line; i = r.end; continue; }
        const so = SYM_OPS.find(o => src.startsWith(o, i + 1));
        if (so && (sp || (prev() && prev().t === 'op' && !')]}'.includes(prev().v))) && !/\s/.test(src[i + 1])) { push('sym', so); i += 1 + so.length; continue; }
      }
      if ((c === '-' || c === '+') && src[i + 1] === '@' && !/[A-Za-z_@]/.test(src[i + 2] || '')) { push('op', c + '@'); i += 2; continue; }
      const op = OPS.find(o => src.startsWith(o, i));
      if (!op) throw new SyntaxErr("syntax error, unexpected character '" + c + "'", line);
      push('op', op); i += op.length;
    }
    if (prev() && prev().t !== 'nl') push('nl', '\n');
    toks.push({ t: 'eof', v: '', sp: true, line });
    return toks;
  }
  function readString(src, i, q, line) {
    const parts = []; let cur = ''; const n = src.length; i++;
    const ESC = { n: '\n', t: '\t', s: ' ', 0: '\0', e: '\x1b', r: '\r' };
    while (i < n && src[i] !== q) {
      if (src[i] === '\\') {
        const e = src[i + 1];
        if (q === '"') cur += (e in ESC ? ESC[e] : e); else cur += (e === "'" || e === '\\') ? e : '\\' + e;
        i += 2; continue;
      }
      if (q === '"' && src[i] === '#' && src[i + 1] === '{') {
        let d = 1, j = i + 2; while (j < n && d > 0) { if (src[j] === '{') d++; else if (src[j] === '}') d--; j++; }
        if (cur) parts.push(cur); cur = ''; parts.push({ code: src.slice(i + 2, j - 1), line }); i = j; continue;
      }
      if (src[i] === '\n') line++;
      cur += src[i]; i++;
    }
    if (i >= n) throw new SyntaxErr('unterminated string meets end of file', line);
    if (cur || !parts.length) parts.push(cur);
    return { parts, end: i + 1, line };
  }

  // ====================================================================== parser
  const BIN = { '||': 1, '&&': 2, '<=>': 4, '==': 4, '===': 4, '!=': 4, '=~': 4, '<': 5, '<=': 5, '>': 5, '>=': 5, '|': 6, '^': 6, '&': 7, '<<': 8, '>>': 8, '+': 9, '-': 9, '*': 10, '/': 10, '%': 10, '**': 12 };
  const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=', '%=', '**=', '||=', '&&=', '|=', '&=', '<<=', '>>=', '^=']);
  const TOKDESC = { int: 'integer literal', float: 'float literal', str: 'string literal', sym: 'symbol literal', ident: 'local variable or method', const: 'constant', ivar: 'instance variable', cvar: 'class variable', gvar: 'global variable', nl: 'end of line', eof: 'end-of-input', label: 'label' };
  const tokDesc = (t) => TOKDESC[t.t] || "'" + t.v + "'";

  class Parser {
    constructor(toks, scopes) { this.toks = toks; this.p = 0; this.noDo = 0; this.mok = false; if (scopes) this.scopes = scopes; else { const s = new Set(); s.hard = true; this.scopes = [s]; } }
    get cur() { return this.toks[this.p]; }
    peek(k = 1) { return this.toks[Math.min(this.p + k, this.toks.length - 1)]; }
    next() { return this.toks[this.p++]; }
    isOp(v) { const t = this.cur; return t.t === 'op' && t.v === v; }
    isKw(v) { const t = this.cur; return t.t === 'kw' && t.v === v; }
    err(msg) { throw new SyntaxErr(msg || 'syntax error, unexpected ' + tokDesc(this.cur), this.cur.line); }
    expectOp(v) { if (!this.isOp(v)) this.err('syntax error, unexpected ' + tokDesc(this.cur) + ", expecting '" + v + "'"); return this.next(); }
    expectKw(v) { if (!this.isKw(v)) this.err('syntax error, unexpected ' + tokDesc(this.cur) + ", expecting '" + v + "'"); return this.next(); }
    skipNl() { while (this.cur.t === 'nl' || this.isOp(';')) this.p++; }
    skipNewlines() { while (this.cur.t === 'nl') this.p++; }
    declared(name) { for (let i = this.scopes.length - 1; i >= 0; i--) { if (this.scopes[i].has(name)) return true; if (this.scopes[i].hard) return false; } return false; }
    declare(name) { this.scopes[this.scopes.length - 1].add(name); }
    pushScope(hard) { const s = new Set(); s.hard = hard; this.scopes.push(s); }
    atEnd() { const t = this.cur; return t.t === 'nl' || t.t === 'eof' || (t.t === 'op' && (t.v === ';' || t.v === '}' || t.v === ')' || t.v === ']')) || (t.t === 'kw' && ['if', 'unless', 'while', 'until', 'end', 'then', 'do', 'and', 'or'].includes(t.v)); }

    parseProgram() { const b = this.parseStmts([]); if (this.cur.t !== 'eof') this.err(); return b; }
    parseStmts(terms) {
      const list = [];
      for (;;) {
        this.skipNl(); const t = this.cur;
        if (t.t === 'eof' || (t.t === 'kw' && terms.includes(t.v)) || (t.t === 'op' && (t.v === '}' || t.v === ')'))) break;
        list.push(this.parseStmt());
        const a = this.cur;
        if (!(a.t === 'nl' || a.t === 'eof' || (a.t === 'op' && (a.v === ';' || a.v === '}' || a.v === ')')) || (a.t === 'kw' && terms.includes(a.v)))) this.err();
      }
      return { t: 'block', list };
    }
    parseStmt() {
      const line = this.cur.line; this.mok = true;
      let e = this.parseExprStmt(); this.mok = false;
      for (;;) {
        const t = this.cur; if (t.t !== 'kw') break;
        if (t.v === 'if') { this.next(); e = { t: 'if', c: this.parseExprStmt(), a: e, b: null }; }
        else if (t.v === 'unless') { this.next(); e = { t: 'if', c: { t: 'not', e: this.parseExprStmt() }, a: e, b: null }; }
        else if (t.v === 'while') { this.next(); e = { t: 'while', c: this.parseExprStmt(), body: e }; }
        else if (t.v === 'until') { this.next(); e = { t: 'while', c: { t: 'not', e: this.parseExprStmt() }, body: e }; }
        else break;
      }
      if (e.line === undefined) e.line = line;
      return e;
    }
    parseExprStmt() {
      let e = this.parseNot();
      while (this.cur.t === 'kw' && (this.cur.v === 'and' || this.cur.v === 'or')) { const op = this.next().v; this.skipNewlines(); e = { t: op, a: e, b: this.parseNot() }; }
      return e;
    }
    parseNot() { if (this.isKw('not')) { this.next(); return { t: 'not', e: this.parseNot() }; } return this.parseExpr(); }
    assignable(e) { return e.t === 'lvar' || e.t === 'ivar' || e.t === 'cvar' || e.t === 'gvar' || e.t === 'const' || (e.t === 'call' && !e.blk && !e.parens && !e.cmd && (e.name === '[]' || (!e.args.length && /^[A-Za-z_]\w*$/.test(e.name)))); }
    toTarget(e) {
      if (e.t === 'call' && e.recv === null && e.name !== '[]') { this.declare(e.name); return { t: 'lvar', name: e.name }; }
      return e;
    }
    parseExpr() {
      const mok = this.mok; this.mok = false;
      const lhs = this.parseTernary();
      const t = this.cur;
      if (mok && this.isOp(',') && this.assignable(lhs)) { // a, b = b, a
        const targets = [lhs];
        while (this.isOp(',')) { this.next(); const x = this.parseTernary(); if (!this.assignable(x)) this.err(); targets.push(x); }
        this.expectOp('='); this.skipNewlines();
        const values = [this.parseTernary()]; while (this.isOp(',')) { this.next(); this.skipNewlines(); values.push(this.parseTernary()); }
        return { t: 'masgn', targets: targets.map(x => this.toTarget(x)), values, line: t.line };
      }
      if (t.t === 'op' && ASSIGN_OPS.has(t.v)) {
        if (!this.assignable(lhs)) this.err();
        this.next(); this.skipNewlines();
        const target = this.toTarget(lhs);
        let value = this.parseNotless();
        if (t.v === '=' && this.isOp(',') && mok) { const vs = [value]; while (this.isOp(',')) { this.next(); vs.push(this.parseTernary()); } value = { t: 'array', els: vs }; }
        if (t.v === '=') return { t: 'asgn', target, value, line: t.line };
        return { t: 'opasgn', target, op: t.v.slice(0, -1), value, line: t.line };
      }
      return lhs;
    }
    parseNotless() { return this.parseExpr(); }
    parseTernary() {
      const c = this.parseRange();
      if (this.isOp('?')) {
        this.next(); this.skipNewlines(); const a = this.parseTernary(); this.skipNewlines();
        if (!this.isOp(':')) this.err("syntax error, unexpected " + tokDesc(this.cur) + ", expecting ':'");
        this.next(); this.skipNewlines(); const b = this.parseTernary();
        return { t: 'if', c, a, b };
      }
      return c;
    }
    parseRange() {
      const a = this.parseBin(1);
      if (this.isOp('..') || this.isOp('...')) { const excl = this.next().v === '...'; return { t: 'range', a, b: this.parseBin(1), excl }; }
      return a;
    }
    parseBin(min) {
      let l = this.parseUnary();
      for (;;) {
        const t = this.cur; if (t.t !== 'op') break;
        const pr = BIN[t.v]; if (pr === undefined || pr < min) break;
        this.next(); this.skipNewlines();
        const r = this.parseBin(t.v === '**' ? pr : pr + 1);
        if (t.v === '&&') l = { t: 'and', a: l, b: r };
        else if (t.v === '||') l = { t: 'or', a: l, b: r };
        else if (t.v === '!=') l = { t: 'not', e: { t: 'call', recv: l, name: '==', args: [r], line: t.line } };
        else l = { t: 'call', recv: l, name: t.v, args: [r], line: t.line, isOp: true };
      }
      return l;
    }
    parseUnary() {
      const t = this.cur;
      if (t.t === 'op') {
        if (t.v === '!') { this.next(); return { t: 'not', e: this.parseUnary() }; }
        if (t.v === '-') {
          this.next(); const nx = this.cur;
          if ((nx.t === 'int' || nx.t === 'float') && !nx.sp) { this.next(); return this.parsePostfix({ t: nx.t, v: -nx.v }); }
          return { t: 'call', recv: this.parseUnary(), name: '-@', args: [], line: t.line };
        }
        if (t.v === '+') { this.next(); return this.parseUnary(); }
      }
      return this.parsePostfix(this.parsePrimary());
    }
    canStartArg() {
      const t = this.cur; if (!t.sp) return false;
      switch (t.t) {
        case 'int': case 'float': case 'str': case 'sym': case 'ident': case 'const': case 'ivar': case 'cvar': case 'gvar': case 'label': return true;
        case 'kw': return ['nil', 'true', 'false', 'self', 'def', 'yield', 'super'].includes(t.v);
        case 'op':
          if (t.v === '[' || t.v === '(' || t.v === '->' || t.v === '!') return true;
          if (t.v === '-' || t.v === '*' || t.v === '&' || t.v === '::') return !this.peek().sp && this.peek().t !== 'nl';
          return false;
      }
      return false;
    }
    parseArg() {
      if (this.isOp('*')) { this.next(); return { t: 'splat', e: this.parseTernary() }; }
      if (this.isOp('&')) { this.next(); return { t: 'blockpass', e: this.parseTernary() }; }
      if (this.cur.t === 'label') return this.parseBareHash(null);
      const e = this.parseExpr();
      if (this.isOp('=>')) return this.parseBareHash(e);
      return e;
    }
    parseBareHash(firstKey) {
      const pairs = [];
      const one = (k) => { if (k === null) { const l = this.next(); k = { t: 'sym', v: l.v }; } else this.expectOp('=>'); this.skipNewlines(); pairs.push([k, this.parseExpr()]); };
      one(firstKey);
      while (this.isOp(',') && (this.peek().t === 'label' || this.pairAhead())) { this.next(); this.skipNewlines(); if (this.cur.t === 'label') one(null); else one(this.parseTernary()); }
      return { t: 'hash', pairs };
    }
    pairAhead() { // is the next argument "expr => value"? (cheap look-ahead on the same nesting level)
      let d = 0;
      for (let k = this.p + 1; k < this.toks.length; k++) {
        const t = this.toks[k];
        if (t.t === 'op') { if ('([{'.includes(t.v)) d++; else if (')]}'.includes(t.v)) { if (d === 0) return false; d--; } else if (d === 0 && t.v === '=>') return true; else if (d === 0 && t.v === ',') return false; }
        if (t.t === 'nl' || t.t === 'eof') return false;
      }
      return false;
    }
    parseArgsParen() { // after '('
      const save = this.noDo; this.noDo = 0; const args = []; let blockArg = null; this.skipNewlines();
      while (!this.isOp(')')) {
        const a = this.parseArg(); if (a.t === 'blockpass') blockArg = a.e; else args.push(a);
        this.skipNewlines(); if (this.isOp(',')) { this.next(); this.skipNewlines(); } else break;
      }
      this.expectOp(')'); this.noDo = save; return { args, blockArg };
    }
    parseCommandArgs() {
      this.noDo++; const args = []; let blockArg = null;
      for (;;) {
        const a = this.parseArg(); if (a.t === 'blockpass') blockArg = a.e; else args.push(a);
        if (this.isOp(',')) { this.next(); this.skipNewlines(); } else break;
      }
      this.noDo--; return { args, blockArg };
    }
    finishCall(recv, name, line) {
      let args = [], blockArg = null, parens = false, cmd = false;
      if (this.isOp('(') && !this.cur.sp) { this.next(); ({ args, blockArg } = this.parseArgsParen()); parens = true; }
      else if (this.canStartArg()) { ({ args, blockArg } = this.parseCommandArgs()); cmd = true; }
      const node = { t: 'call', recv, name, args, blockArg, line, parens, cmd };
      if (!cmd && this.isOp('{')) node.blk = this.parseBraceBlock();
      else if (this.isKw('do') && this.noDo === 0) node.blk = this.parseDoBlock();
      return node;
    }
    parseBlockParams() {
      this.next(); const ps = [];
      while (!this.isOp('|')) {
        let kind = 'req'; if (this.isOp('*')) { this.next(); kind = 'rest'; } else if (this.isOp('&')) { this.next(); kind = 'block'; }
        const id = this.next(); if (id.t !== 'ident') { this.p--; this.err(); }
        this.declare(id.v); ps.push({ name: id.v, kind });
        if (this.isOp(',')) this.next(); else break;
      }
      this.expectOp('|'); return ps;
    }
    parseBraceBlock() {
      this.next(); const save = this.noDo; this.noDo = 0; this.pushScope(false); this.skipNewlines();
      let params = []; if (this.isOp('|')) params = this.parseBlockParams(); else if (this.isOp('||')) this.next();
      const body = this.parseStmts([]); this.expectOp('}'); this.scopes.pop(); this.noDo = save;
      return { params, body };
    }
    parseDoBlock() {
      this.next(); const save = this.noDo; this.noDo = 0; this.pushScope(false); this.skipNewlines();
      let params = []; if (this.isOp('|')) params = this.parseBlockParams(); else if (this.isOp('||')) this.next();
      const body = this.parseStmts(['end']); this.expectKw('end'); this.scopes.pop(); this.noDo = save;
      return { params, body };
    }
    parsePostfix(e) {
      for (;;) {
        const t = this.cur; if (t.t !== 'op') break;
        if (t.v === '.' || t.v === '&.') {
          this.next(); const nt = this.next(); let name;
          if (nt.t === 'ident' || nt.t === 'const' || nt.t === 'kw') name = nt.v;
          else if (nt.t === 'op' && nt.v === '(') { this.p--; name = 'call'; }
          else if (nt.t === 'op' && METHOD_OPS.has(nt.v)) name = nt.v;
          else { this.p--; this.err(); }
          e = this.finishCall(e, name, nt.line); if (t.v === '&.') e.safe = true;
          continue;
        }
        if (t.v === '::') {
          this.next(); const nt = this.next();
          if (nt.t === 'const') e = (this.isOp('(') && !this.cur.sp) ? this.finishCall(e, nt.v, nt.line) : { t: 'colon2', scope: e, name: nt.v };
          else if (nt.t === 'ident') e = this.finishCall(e, nt.v, nt.line);
          else { this.p--; this.err(); }
          continue;
        }
        if (t.v === '[' && (!t.sp || e.t === 'lvar' || e.t === 'ivar')) {
          this.next(); const save = this.noDo; this.noDo = 0; const args = []; this.skipNewlines();
          while (!this.isOp(']')) { args.push(this.parseArg()); this.skipNewlines(); if (this.isOp(',')) { this.next(); this.skipNewlines(); } else break; }
          this.expectOp(']'); this.noDo = save;
          e = { t: 'call', recv: e, name: '[]', args, line: t.line };
          continue;
        }
        break;
      }
      return e;
    }
    skipThen() { while (this.cur.t === 'nl' || this.isOp(';')) this.p++; if (this.isKw('then')) this.next(); }
    parseCond() { this.noDo++; const c = this.parseExprStmt(); this.noDo--; return c; }
    parseIf() { // after 'if' / 'elsif'
      const c = this.parseCond(); this.skipThen();
      const a = this.parseStmts(['elsif', 'else', 'end']); let b = null;
      if (this.isKw('elsif')) { this.next(); return { t: 'if', c, a, b: this.parseIf() }; }
      if (this.isKw('else')) { this.next(); b = this.parseStmts(['end']); }
      this.expectKw('end'); return { t: 'if', c, a, b };
    }
    parseParams(paren) {
      const ps = [];
      for (;;) {
        if (paren) { this.skipNewlines(); if (this.isOp(')')) break; } else if (this.cur.t === 'nl' || this.isOp(';') || this.cur.t === 'eof') break;
        let kind = 'req'; if (this.isOp('*')) { this.next(); kind = 'rest'; } else if (this.isOp('&')) { this.next(); kind = 'block'; }
        const id = this.next(); if (id.t !== 'ident') { this.p--; this.err(); }
        this.declare(id.v); const prm = { name: id.v, kind };
        if (this.isOp('=')) { this.next(); prm.kind = 'opt'; prm.def = this.parseTernary(); }
        ps.push(prm);
        if (this.isOp(',')) this.next(); else break;
      }
      if (paren) this.expectOp(')');
      return ps;
    }
    parseDef(line) {
      let singleton = null, nt = this.next(), name;
      if (nt.t === 'kw' && nt.v === 'self' && this.isOp('.')) { this.next(); singleton = { t: 'self' }; nt = this.next(); }
      else if (nt.t === 'const' && this.isOp('.')) { this.next(); singleton = { t: 'const', name: nt.v }; nt = this.next(); }
      if (nt.t === 'ident' || nt.t === 'const' || nt.t === 'kw') {
        name = nt.v;
        if (this.isOp('=') && !this.cur.sp && (this.peek().sp || (this.peek().t === 'op' && this.peek().v === '(') || this.peek().t === 'nl')) { this.next(); name += '='; }
      } else if (nt.t === 'op' && nt.v === '[') { this.expectOp(']'); name = '[]'; if (this.isOp('=') && !this.cur.sp) { this.next(); name = '[]='; } }
      else if (nt.t === 'op' && METHOD_OPS.has(nt.v)) name = nt.v;
      else { this.p--; this.err(); }
      this.pushScope(true);
      let params = [];
      if (this.isOp('(')) { this.next(); params = this.parseParams(true); } else params = this.parseParams(false);
      const body = this.parseBodyWithRescue();
      this.expectKw('end'); this.scopes.pop();
      return { t: 'def', name, params, body, singleton, line };
    }
    parseBodyWithRescue() { // statements, optionally followed by rescue/ensure clauses (the caller consumes 'end')
      const body = this.parseStmts(['rescue', 'ensure', 'end']);
      if (!this.isKw('rescue') && !this.isKw('ensure')) return body;
      const rescues = []; let ensure = null;
      while (this.isKw('rescue')) {
        this.next(); const classes = []; let name = null;
        while (this.cur.t === 'const') { classes.push(this.parsePostfix(this.parsePrimary())); if (this.isOp(',')) this.next(); else break; }
        if (this.isOp('=>')) { this.next(); const id = this.next(); if (id.t !== 'ident') { this.p--; this.err(); } name = id.v; this.declare(name); }
        this.skipThen();
        rescues.push({ classes, name, body: this.parseStmts(['rescue', 'ensure', 'end']) });
      }
      if (this.isKw('ensure')) { this.next(); ensure = this.parseStmts(['end']); }
      return { t: 'begin', body, rescues, ensure };
    }
    parsePrimary() {
      const t = this.cur;
      switch (t.t) {
        case 'int': this.next(); return { t: 'int', v: t.v };
        case 'float': this.next(); return { t: 'float', v: t.v };
        case 'sym': this.next(); return { t: 'sym', v: t.v };
        case 'str': {
          this.next();
          if (t.v.length === 1 && typeof t.v[0] === 'string') return { t: 'str', v: t.v[0] };
          return { t: 'dstr', parts: t.v.map(p => typeof p === 'string' ? p : new Parser(lex(p.code), this.scopes).parseProgram()) };
        }
        case 'ivar': this.next(); return { t: 'ivar', name: t.v };
        case 'cvar': this.next(); return { t: 'cvar', name: t.v };
        case 'gvar': this.next(); return { t: 'gvar', name: t.v };
        case 'const': this.next(); if (this.isOp('(') && !this.cur.sp) return this.finishCall(null, t.v, t.line); return { t: 'const', name: t.v, line: t.line };
        case 'ident': {
          this.next();
          if (this.declared(t.v) && !(this.isOp('(') && !this.cur.sp)) return { t: 'lvar', name: t.v };
          return this.finishCall(null, t.v, t.line);
        }
        case 'op': {
          if (t.v === '(') {
            this.next(); const save = this.noDo; this.noDo = 0;
            const body = this.parseStmts([]); this.expectOp(')'); this.noDo = save;
            return { t: 'paren', body };
          }
          if (t.v === '[') {
            this.next(); const save = this.noDo; this.noDo = 0; const els = []; this.skipNewlines();
            while (!this.isOp(']')) { els.push(this.parseArg()); this.skipNewlines(); if (this.isOp(',')) { this.next(); this.skipNewlines(); } else break; }
            this.expectOp(']'); this.noDo = save; return { t: 'array', els };
          }
          if (t.v === '{') {
            this.next(); const save = this.noDo; this.noDo = 0; const pairs = []; this.skipNewlines();
            while (!this.isOp('}')) {
              let k; if (this.cur.t === 'label') k = { t: 'sym', v: this.next().v }; else { k = this.parseTernary(); this.skipNewlines(); this.expectOp('=>'); }
              this.skipNewlines(); pairs.push([k, this.parseExpr()]); this.skipNewlines();
              if (this.isOp(',')) { this.next(); this.skipNewlines(); } else break;
            }
            this.expectOp('}'); this.noDo = save; return { t: 'hash', pairs };
          }
          if (t.v === '->') {
            this.next(); this.pushScope(false); let params = [];
            if (this.isOp('(')) { this.next(); params = this.parseParams(true); }
            let body;
            if (this.isOp('{')) { this.next(); const save = this.noDo; this.noDo = 0; body = this.parseStmts([]); this.expectOp('}'); this.noDo = save; }
            else if (this.isKw('do')) { this.next(); body = this.parseStmts(['end']); this.expectKw('end'); }
            else this.err();
            this.scopes.pop(); return { t: 'lambda', params, body };
          }
          if (t.v === '..' || t.v === '...') this.err('syntax error: beginless ranges are not supported in this mini-Ruby');
          this.err();
          break;
        }
        case 'kw': {
          this.next();
          switch (t.v) {
            case 'nil': return { t: 'nil' };
            case 'true': return { t: 'true' };
            case 'false': return { t: 'false' };
            case 'self': return { t: 'self' };
            case 'if': return this.parseIf();
            case 'unless': {
              const c = this.parseCond(); this.skipThen(); const a = this.parseStmts(['else', 'end']); let b = null;
              if (this.isKw('else')) { this.next(); b = this.parseStmts(['end']); }
              this.expectKw('end'); return { t: 'if', c: { t: 'not', e: c }, a, b };
            }
            case 'while': case 'until': {
              let c = this.parseCond(); if (t.v === 'until') c = { t: 'not', e: c };
              while (this.cur.t === 'nl' || this.isOp(';')) this.p++; if (this.isKw('do')) this.next();
              const body = this.parseStmts(['end']); this.expectKw('end'); return { t: 'while', c, body };
            }
            case 'case': {
              const subj = this.cur.t === 'nl' ? null : this.parseExprStmt(); this.skipNl(); const whens = []; let els = null;
              while (this.isKw('when')) {
                this.next(); const conds = [this.parseTernary()];
                while (this.isOp(',')) { this.next(); this.skipNewlines(); conds.push(this.parseTernary()); }
                this.skipThen(); whens.push({ conds, body: this.parseStmts(['when', 'else', 'end']) });
              }
              if (this.isKw('else')) { this.next(); els = this.parseStmts(['end']); }
              this.expectKw('end'); return { t: 'case', subj, whens, els };
            }
            case 'def': return this.parseDef(t.line);
            case 'class': case 'module': {
              const nm = this.next(); if (nm.t !== 'const') { this.p--; this.err(t.v === 'class' ? 'class/module name must be CONSTANT' : 'class/module name must be CONSTANT'); }
              let scope = null, name = nm.v;
              while (this.isOp('::')) { this.next(); const n2 = this.next(); if (n2.t !== 'const') { this.p--; this.err(); } scope = scope ? { t: 'colon2', scope, name } : { t: 'const', name }; name = n2.v; }
              let sup = null;
              if (t.v === 'class' && this.isOp('<')) { this.next(); sup = this.parsePostfix(this.parsePrimary()); }
              this.pushScope(true); const body = this.parseStmts(['end']); this.expectKw('end'); this.scopes.pop();
              return { t: t.v, name, scope, sup, body, line: t.line };
            }
            case 'begin': { const b = this.parseBodyWithRescue(); this.expectKw('end'); return b.t === 'begin' ? b : { t: 'paren', body: b }; }
            case 'return': case 'break': case 'next': {
              let value = null;
              if (!this.atEnd()) { value = this.parseExpr(); if (this.isOp(',')) { const els = [value]; while (this.isOp(',')) { this.next(); els.push(this.parseExpr()); } value = { t: 'array', els }; } }
              return { t: t.v, value, line: t.line };
            }
            case 'yield': {
              let args = [];
              if (this.isOp('(') && !this.cur.sp) { this.next(); args = this.parseArgsParen().args; }
              else if (this.canStartArg()) args = this.parseCommandArgs().args;
              return { t: 'yield', args, line: t.line };
            }
            case 'super': {
              const node = { t: 'super', args: [], zsuper: true, blockArg: null, line: t.line };
              if (this.isOp('(') && !this.cur.sp) { this.next(); const r = this.parseArgsParen(); node.args = r.args; node.blockArg = r.blockArg; node.zsuper = false; }
              else if (this.canStartArg()) { const r = this.parseCommandArgs(); node.args = r.args; node.blockArg = r.blockArg; node.zsuper = false; }
              if (this.isOp('{')) node.blk = this.parseBraceBlock(); else if (this.isKw('do') && this.noDo === 0) node.blk = this.parseDoBlock();
              return node;
            }
            case 'not': return { t: 'not', e: this.parseExpr() };
            case 'then': case 'end': case 'else': case 'elsif': case 'when': case 'do': case 'rescue': case 'ensure': case 'in': case 'and': case 'or':
              this.p--; this.err();
              break;
            default: this.p--; this.err("'" + t.v + "' is not supported in this mini-Ruby");
          }
          break;
        }
        default: this.err();
      }
    }
  }

  // ====================================================================== runtime values
  let ID = 0;
  class RObj { constructor(cls) { this.cls = cls; this.iv = new Map(); this.id = ++ID; } }
  class RClass {
    constructor(name, sup, isModule) { this.name = name; this.sup = sup || null; this.isModule = !!isModule; this.m = new Map(); this.sm = new Map(); this.includes = []; this.consts = new Map(); this.cvars = new Map(); this.iv = new Map(); this.id = ++ID; this.defvis = 'public'; }
  }
  class RStr { constructor(s) { this.s = s; this.id = ++ID; } }
  class RSym { constructor(n) { this.n = n; } }
  const SYMS = new Map();
  const sym = (n) => { let s = SYMS.get(n); if (!s) { s = new RSym(n); SYMS.set(n, s); } return s; };
  class RFloat { constructor(f) { this.f = f; } }
  class RHash { constructor() { this.map = new Map(); this.def = null; this.id = ++ID; } }
  class RRange { constructor(a, b, excl) { this.a = a; this.b = b; this.excl = !!excl; this.id = ++ID; } }
  class RProc { constructor(params, body, ctx, isLambda) { this.params = params; this.body = body; this.ctx = ctx; this.isLambda = !!isLambda; this.id = ++ID; this.multi = params ? params.filter(p => p.kind !== 'block').length > 1 : false; } }
  class Scope {
    constructor(parent) { this.v = new Map(); this.parent = parent; }
    get(n) { for (let s = this; s; s = s.parent) if (s.v.has(n)) return s.v.get(n); return undefined; }
    set(n, val) { for (let s = this; s; s = s.parent) if (s.v.has(n)) { s.v.set(n, val); return; } this.v.set(n, val); }
  }
  class BreakSig { constructor(tag, val) { this.tag = tag; this.val = val; } }
  class NextSig { constructor(val) { this.val = val; } }
  class LoopBreak { constructor(val) { this.val = val; } }
  class LoopNext { }
  class ReturnSig { constructor(frame, val) { this.frame = frame; this.val = val; } }
  class StopSig { }
  class StopIter { }
  class RubyError { constructor(exc) { this.exc = exc; } }

  const truthy = (v) => v !== null && v !== false;

  // ====================================================================== interpreter
  class Interp {
    constructor(opts = {}) {
      this.out = []; this.steps = 0; this.limit = opts.limit || 3000000; this.depth = 0; this.maxDepth = 2500; this.trace = opts.trace || null;
      this.line = 0; this.ver = 1; this.globals = new Map(); this.C = {}; this.extraIv = new WeakMap();
      for (const fn of installers) fn(this);
      this.main = new RObj(this.C.Object);
    }
    topCtx() { return { self: this.main, scope: new Scope(null), meth: null, args: [], blk: null, cref: [this.C.Object], frame: null, inLoop: false, inProc: null, top: true }; }
    defClass(name, sup, isModule) { const c = new RClass(name, isModule ? null : (sup === undefined ? this.C.Object : sup), isModule); this.C[name] = c; if (this.C.Object) this.C.Object.consts.set(name, c); return c; }
    native(cls, names, fn, vis) { for (const name of [].concat(names)) cls.m.set(name, { name, owner: cls, vis: vis || 'public', fn, builtin: true }); }
    snative(cls, names, fn) { for (const name of [].concat(names)) cls.sm.set(name, { name, owner: cls, vis: 'public', fn, builtin: true, sing: true }); }

    err(clsName, msg) { const o = new RObj(this.C[clsName]); o.iv.set('@message', new RStr(msg)); return new RubyError(o); }
    classOf(v) {
      const C = this.C;
      if (v === null) return C.NilClass; if (v === true) return C.TrueClass; if (v === false) return C.FalseClass;
      if (typeof v === 'number') return C.Integer;
      if (v instanceof RObj) return v.cls; if (v instanceof RStr) return C.String; if (v instanceof RSym) return C.Symbol; if (v instanceof RFloat) return C.Float;
      if (Array.isArray(v)) return C.Array; if (v instanceof RHash) return C.Hash; if (v instanceof RRange) return C.Range; if (v instanceof RProc) return C.Proc;
      if (v instanceof RClass) return v.isModule ? C.Module : C.Class;
      return C.Object;
    }
    ancestors(cls) {
      if (cls._av === this.ver) return cls._anc;
      const out = [];
      const addMod = (mod) => { if (out.includes(mod)) return; out.push(mod); for (let i = mod.includes.length - 1; i >= 0; i--) addMod(mod.includes[i]); };
      for (let k = cls; k; k = k.sup) { out.push(k); for (let i = k.includes.length - 1; i >= 0; i--) addMod(k.includes[i]); }
      cls._anc = out; cls._av = this.ver; return out;
    }
    isA(v, cls) { return this.ancestors(this.classOf(v)).includes(cls); }
    findMethod(recv, cls, name) {
      if (recv instanceof RClass) { for (let k = recv; k; k = k.sup) { const m = k.sm.get(name); if (m) return m; } }
      const anc = this.ancestors(cls);
      for (let i = 0; i < anc.length; i++) { const m = anc[i].m.get(name); if (m) return m; }
      return null;
    }
    descFor(v) {
      if (v === null) return 'nil'; if (v === true) return 'true'; if (v === false) return 'false';
      if (v === this.main) return 'main:Object';
      if (v instanceof RClass) return (v.isModule ? 'module ' : 'class ') + v.name;
      return 'an instance of ' + this.classOf(v).name;
    }
    ivars(v) { if (v instanceof RObj || v instanceof RClass) return v.iv; if (v !== null && typeof v === 'object') { let m = this.extraIv.get(v); if (!m) { m = new Map(); this.extraIv.set(v, m); } return m; } return new Map(); }
    constGet(c, name) {
      for (const k of c.cref) if (k.consts.has(name)) return k.consts.get(name);
      for (const k of this.ancestors(c.cref[0])) if (k.consts.has(name)) return k.consts.get(name);
      if (this.C.Object.consts.has(name)) return this.C.Object.consts.get(name);
      throw this.err('NameError', 'uninitialized constant ' + name);
    }
    cvarOwner(c, name) {
      let cls = c.cref[0]; if (c.self instanceof RClass && c.cref[0] === this.C.Object) cls = c.self;
      for (const k of this.ancestors(cls)) if (k.cvars.has(name)) return k;
      return null;
    }
    tick() { if (++this.steps > this.limit) throw new StopSig(); }

    // ---------- evaluation
    ev(n, c) {
      switch (n.t) {
        case 'block': { let v = null; const l = n.list; for (let i = 0; i < l.length; i++) { if (++this.steps > this.limit) throw new StopSig(); if (l[i].line) this.line = l[i].line; v = this.ev(l[i], c); } return v; }
        case 'int': return n.v;
        case 'float': return new RFloat(n.v);
        case 'str': return new RStr(n.v);
        case 'dstr': { let s = ''; for (const p of n.parts) s += typeof p === 'string' ? p : this.tos(this.ev(p, c)); return new RStr(s); }
        case 'sym': return sym(n.v);
        case 'nil': return null; case 'true': return true; case 'false': return false;
        case 'self': return c.self;
        case 'lvar': { const v = c.scope.get(n.name); return v === undefined ? null : v; }
        case 'ivar': { const v = this.ivars(c.self).get(n.name); return v === undefined ? null : v; }
        case 'cvar': { const o = this.cvarOwner(c, n.name); if (!o) throw this.err('NameError', 'uninitialized class variable ' + n.name + ' in ' + c.cref[0].name); return o.cvars.get(n.name); }
        case 'gvar': { const v = this.globals.get(n.name); return v === undefined ? null : v; }
        case 'const': if (n.line) this.line = n.line; return this.constGet(c, n.name);
        case 'colon2': {
          const s = this.ev(n.scope, c); if (!(s instanceof RClass)) throw this.err('TypeError', this.insp(s) + ' is not a class/module');
          for (const k of this.ancestors(s)) if (k.consts.has(n.name)) return k.consts.get(n.name);
          throw this.err('NameError', 'uninitialized constant ' + s.name + '::' + n.name);
        }
        case 'array': return this.evArgs(n.els, c);
        case 'hash': { const h = new RHash(); for (const [k, v] of n.pairs) this.hset(h, this.ev(k, c), this.ev(v, c)); return h; }
        case 'range': return new RRange(this.ev(n.a, c), this.ev(n.b, c), n.excl);
        case 'paren': return this.ev(n.body, c);
        case 'and': { const a = this.ev(n.a, c); return truthy(a) ? this.ev(n.b, c) : a; }
        case 'or': { const a = this.ev(n.a, c); return truthy(a) ? a : this.ev(n.b, c); }
        case 'not': return !truthy(this.ev(n.e, c));
        case 'if': return truthy(this.ev(n.c, c)) ? this.ev(n.a, c) : (n.b ? this.ev(n.b, c) : null);
        case 'asgn': { const v = this.ev(n.value, c); this.assign(n.target, v, c); return v; }
        case 'opasgn': return this.opAssign(n, c);
        case 'masgn': {
          let vals; if (n.values.length === 1) { const v = this.ev(n.values[0], c); vals = Array.isArray(v) ? v : [v]; } else vals = n.values.map(x => this.ev(x, c));
          n.targets.forEach((tg, i) => this.assign(tg, i < vals.length ? vals[i] : null, c));
          return vals;
        }
        case 'call': return this.evalCall(n, c);
        case 'yield': {
          if (!c.blk) throw this.err('LocalJumpError', 'no block given (yield)');
          return this.callProc(c.blk, this.evArgs(n.args, c));
        }
        case 'super': return this.evalSuper(n, c);
        case 'while': {
          const c2 = Object.assign({}, c, { inLoop: true });
          try {
            while (truthy(this.ev(n.c, c2))) {
              if (++this.steps > this.limit) throw new StopSig();
              try { this.ev(n.body, c2); } catch (e) { if (!(e instanceof LoopNext)) throw e; }
            }
          } catch (e) { if (e instanceof LoopBreak) return e.val; throw e; }
          return null;
        }
        case 'case': {
          const v = n.subj ? this.ev(n.subj, c) : null;
          for (const w of n.whens) for (const cd of w.conds) {
            const x = this.ev(cd, c);
            if (n.subj ? truthy(this.send(x, '===', [v], null, null, true)) : truthy(x)) return this.ev(w.body, c);
          }
          return n.els ? this.ev(n.els, c) : null;
        }
        case 'return': throw new ReturnSig(c.frame, n.value ? this.ev(n.value, c) : null);
        case 'break': { const v = n.value ? this.ev(n.value, c) : null; if (c.inLoop) throw new LoopBreak(v); if (c.inProc) throw new BreakSig(c.inProc, v); throw this.err('LocalJumpError', 'break from proc-closure'); }
        case 'next': { const v = n.value ? this.ev(n.value, c) : null; if (c.inLoop) throw new LoopNext(); throw new NextSig(v); }
        case 'lambda': return new RProc(n.params, n.body, c, true);
        case 'def': return this.evalDef(n, c);
        case 'class': case 'module': return this.evalClass(n, c);
        case 'begin': return this.evalBegin(n, c);
      }
      throw new Error('cannot evaluate node ' + n.t);
    }
    evArgs(list, c) {
      const out = [];
      for (const a of list) {
        if (a.t === 'splat') { const v = this.ev(a.e, c); if (Array.isArray(v)) out.push(...v); else if (v instanceof RRange) out.push(...this.toArray(v)); else if (v !== null) out.push(v); }
        else out.push(this.ev(a, c));
      }
      return out;
    }
    assign(tg, v, c) {
      switch (tg.t) {
        case 'lvar': c.scope.set(tg.name, v); return;
        case 'ivar': this.ivars(c.self).set(tg.name, v); return;
        case 'cvar': { const o = this.cvarOwner(c, tg.name) || (c.self instanceof RClass && c.cref[0] === this.C.Object ? c.self : c.cref[0]); o.cvars.set(tg.name, v); return; }
        case 'gvar': this.globals.set(tg.name, v); return;
        case 'const': { const k = c.cref[0]; k.consts.set(tg.name, v); if (v instanceof RClass && !v.name) v.name = tg.name; return; }
        case 'call':
          if (tg.name === '[]') { this.send(this.ev(tg.recv, c), '[]=', [...this.evArgs(tg.args, c), v], null, c, tg.recv.t === 'self'); return; }
          this.send(this.ev(tg.recv, c), tg.name + '=', [v], null, c, tg.recv.t === 'self'); return;
      }
      throw new Error('bad assignment target');
    }
    opAssign(n, c) {
      const tg = n.target, op = n.op;
      const combine = (cur) => {
        if (op === '||') return truthy(cur) ? { done: cur } : { v: this.ev(n.value, c) };
        if (op === '&&') return truthy(cur) ? { v: this.ev(n.value, c) } : { done: cur };
        return { v: this.send(cur, op, [this.ev(n.value, c)], null, c, false, { name: op, args: [1], recv: {} }) };
      };
      if (tg.t === 'call') {
        const recv = this.ev(tg.recv, c), self = tg.recv.t === 'self';
        if (tg.name === '[]') {
          const args = this.evArgs(tg.args, c); const r = combine(this.send(recv, '[]', args, null, c, self));
          if ('done' in r) return r.done; this.send(recv, '[]=', [...args, r.v], null, c, self); return r.v;
        }
        const r = combine(this.send(recv, tg.name, [], null, c, self));
        if ('done' in r) return r.done; this.send(recv, tg.name + '=', [r.v], null, c, self); return r.v;
      }
      let cur;
      if (tg.t === 'cvar' && !this.cvarOwner(c, tg.name)) { if (op !== '||') throw this.err('NameError', 'uninitialized class variable ' + tg.name + ' in ' + c.cref[0].name); cur = null; }
      else if (tg.t === 'const') cur = c.cref[0].consts.has(tg.name) ? c.cref[0].consts.get(tg.name) : null;
      else cur = this.ev(tg, c);
      const r = combine(cur); if ('done' in r) return r.done;
      this.assign(tg, r.v, c); return r.v;
    }
    evalCall(n, c) {
      let recv, fcall = false;
      if (n.recv === null) { recv = c.self; fcall = true; }
      else { recv = this.ev(n.recv, c); if (n.recv.t === 'self') fcall = true; if (n.safe && recv === null) return null; }
      const args = n.args.length ? this.evArgs(n.args, c) : [];
      if (n.line) this.line = n.line;
      if (n.blk) {
        const blk = new RProc(n.blk.params, n.blk.body, c, false);
        try { return this.send(recv, n.name, args, blk, c, fcall, n); }
        catch (e) { if (e instanceof BreakSig && e.tag === blk) return e.val; throw e; }
      }
      let blk = null;
      if (n.blockArg) blk = this.toProc(this.ev(n.blockArg, c));
      return this.send(recv, n.name, args, blk, c, fcall, n);
    }
    toProc(b) {
      if (b === null || b instanceof RProc) return b;
      if (b instanceof RSym) { const p = new RProc(null, null, null, false); p.nat = (args) => this.send(args[0], b.n, args.slice(1), null, null, false); p.symName = b.n; return p; }
      throw this.err('TypeError', 'wrong argument type ' + this.classOf(b).name + ' (expected Proc)');
    }
    send(recv, name, args, blk, c, fcall, node) {
      const cls = this.classOf(recv);
      const m = this.findMethod(recv, cls, name);
      if (this.trace && (!m || m.user)) this.traceCall(recv, cls, name, m, args);
      if (!m) {
        const mm = this.findMethod(recv, cls, 'method_missing');
        if (mm && !mm.builtin) return this.invoke(mm, recv, [sym(name), ...args], blk, c);
        if (fcall && node && node.recv === null && !node.parens && !node.args.length) throw this.err('NameError', "undefined local variable or method '" + name + "' for " + this.descFor(recv));
        throw this.err('NoMethodError', "undefined method '" + name + "' for " + this.descFor(recv));
      }
      if (m.vis !== 'public' && c !== null && !fcall) {
        if (m.vis === 'private') throw this.err('NoMethodError', "private method '" + name + "' called for " + this.descFor(recv));
        if (!this.isA(c.self, m.owner)) throw this.err('NoMethodError', "protected method '" + name + "' called for " + this.descFor(recv));
      }
      return this.invoke(m, recv, args, blk, c);
    }
    traceCall(recv, cls, name, m, args) {
      const path = []; let sing = false;
      if (recv instanceof RClass) { for (let k = recv; k; k = k.sup) { if (k.sm.size || k === recv) { path.push(k.name + ' (class methods)'); if (k.sm.has(name)) { sing = true; break; } } } }
      if (!sing) for (const k of this.ancestors(cls)) { path.push(k.name); if (k.m.has(name)) break; }
      this.trace({ k: 'call', name, cls: cls.name, recv: this.shortInsp(recv), args: args.map(a => this.shortInsp(a)), path, owner: m ? m.owner.name : null, found: !!m, depth: this.depth, ancestors: this.ancestors(cls).map(k => ({ name: k.name, mod: k.isModule })) });
    }
    shortInsp(v) { let s; try { s = (v instanceof RObj && !this.isA(v, this.C.Exception)) ? (v === this.main ? 'main' : '#<' + v.cls.name + '>') : this.insp(v); } catch (e) { s = '?'; } return s.length > 40 ? s.slice(0, 37) + '…' : s; }
    invoke(m, self, args, blk, c) {
      if (m.fn) return m.fn.call(this, self, args, blk, c);
      if (++this.steps > this.limit) throw new StopSig();
      if (++this.depth > this.maxDepth) { this.depth--; throw this.err('SystemStackError', 'stack level too deep'); }
      const frame = {};
      const ctx = { self, scope: new Scope(null), meth: m, args, blk, cref: m.cref, frame, inLoop: false, inProc: null };
      try { this.bindParams(m.params, args, ctx, true, blk); return this.ev(m.body, ctx); }
      catch (e) { if (e instanceof ReturnSig && e.frame === frame) return e.val; throw e; }
      finally { this.depth--; }
    }
    bindParams(params, args, ctx, strict, blk) {
      const scope = ctx.scope; let req = 0, opt = 0, rest = false;
      for (const p of params) { if (p.kind === 'req') req++; else if (p.kind === 'opt') opt++; else if (p.kind === 'rest') rest = true; }
      const given = args.length;
      if (strict && (given < req || (!rest && given > req + opt))) throw this.err('ArgumentError', 'wrong number of arguments (given ' + given + ', expected ' + (rest ? req + '+' : opt ? req + '..' + (req + opt) : req) + ')');
      let i = 0, fill = Math.max(0, Math.min(opt, given - req)), reqLeft = req;
      for (const p of params) {
        if (p.kind === 'req') { scope.v.set(p.name, i < given ? args[i] : null); i++; reqLeft--; }
        else if (p.kind === 'opt') { if (fill > 0) { scope.v.set(p.name, args[i++]); fill--; } else scope.v.set(p.name, this.ev(p.def, ctx)); }
        else if (p.kind === 'rest') { const k = Math.max(0, given - i - reqLeft); scope.v.set(p.name, args.slice(i, i + k)); i += k; }
        else scope.v.set(p.name, blk || null);
      }
    }
    callProc(proc, args) {
      if (proc.nat) return proc.nat(args);
      if (++this.steps > this.limit) throw new StopSig();
      if (++this.depth > this.maxDepth) { this.depth--; throw this.err('SystemStackError', 'stack level too deep'); }
      const pc = proc.ctx;
      let a = args; if (!proc.isLambda && a.length === 1 && Array.isArray(a[0]) && proc.multi) a = a[0];
      const ctx = { self: pc.self, scope: new Scope(pc.scope), meth: pc.meth, args: pc.args, blk: pc.blk, cref: pc.cref, frame: proc.isLambda ? {} : pc.frame, inLoop: false, inProc: proc };
      let r;
      try { this.bindParams(proc.params, a, ctx, proc.isLambda, null); r = this.ev(proc.body, ctx); }
      catch (e) {
        if (e instanceof NextSig) r = e.val;
        else if (proc.isLambda && ((e instanceof ReturnSig && e.frame === ctx.frame) || (e instanceof BreakSig && e.tag === proc))) r = e.val;
        else throw e;
      } finally { this.depth--; }
      if (this.trace) this.trace({ k: 'yield', args: a.map(x => this.shortInsp(x)), result: this.shortInsp(r), depth: this.depth });
      return r;
    }
    evalSuper(n, c) {
      const m = c.meth; if (!m) throw this.err('RuntimeError', 'super called outside of method');
      const self = c.self; let nextM = null;
      if (m.sing) { for (let k = m.owner.sup; k; k = k.sup) if (k.sm.has(m.name)) { nextM = k.sm.get(m.name); break; } if (!nextM) nextM = this.findMethod(null, this.classOf(self), m.name); }
      else { const anc = this.ancestors(this.classOf(self)); for (let j = anc.indexOf(m.owner) + 1; j < anc.length; j++) { const x = anc[j].m.get(m.name); if (x) { nextM = x; break; } } }
      if (this.trace) this.trace({ k: 'super', name: m.name, from: m.owner.name, owner: nextM ? nextM.owner.name : null, found: !!nextM, depth: this.depth, recv: this.shortInsp(self) });
      if (!nextM) throw this.err('NoMethodError', "super: no superclass method '" + m.name + "' for " + this.descFor(self));
      let args;
      if (!n.zsuper) args = this.evArgs(n.args, c);
      else if (m.params) { args = []; for (const p of m.params) { const v = c.scope.get(p.name); if (p.kind === 'rest') args.push(...(v || [])); else if (p.kind !== 'block') args.push(v === undefined ? null : v); } } // bare super passes the CURRENT values of the parameters
      else args = c.args;
      if (n.line) this.line = n.line;
      if (n.blk) { const blk = new RProc(n.blk.params, n.blk.body, c, false); try { return this.invoke(nextM, self, args, blk, c); } catch (e) { if (e instanceof BreakSig && e.tag === blk) return e.val; throw e; } }
      return this.invoke(nextM, self, args, n.blockArg ? this.toProc(this.ev(n.blockArg, c)) : c.blk, c);
    }
    evalDef(n, c) {
      const m = { name: n.name, params: n.params, body: n.body, user: true, cref: c.cref };
      if (n.singleton) {
        const o = n.singleton.t === 'self' ? c.self : this.constGet(c, n.singleton.name);
        if (!(o instanceof RClass)) throw this.err('TypeError', "can't define a singleton method here (only def self.name inside a class is supported)");
        m.owner = o; m.vis = 'public'; m.sing = true; o.sm.set(n.name, m);
      } else {
        const cls = c.cref[0];
        m.owner = cls;
        m.vis = n.name === 'initialize' ? 'private' : (c.top && cls === this.C.Object) ? 'private' : (c.self === cls ? cls.defvis : 'public');
        cls.m.set(n.name, m);
      }
      this.ver++;
      return sym(n.name);
    }
    evalClass(n, c) {
      const isMod = n.t === 'module';
      let holder = c.cref[0];
      if (n.scope) { holder = this.ev(n.scope, c); if (!(holder instanceof RClass)) throw this.err('TypeError', this.insp(holder) + ' is not a class/module'); }
      let sup = null;
      if (n.sup) { sup = this.ev(n.sup, c); if (!(sup instanceof RClass) || sup.isModule) throw this.err('TypeError', 'superclass must be an instance of Class (given ' + (sup instanceof RClass ? 'an instance of Module' : this.descFor(sup)) + ')'); }
      let cls = null;
      for (const k of (n.scope ? [holder] : c.cref)) if (k.consts.has(n.name)) { cls = k.consts.get(n.name); break; }
      if (!cls && !n.scope && this.C.Object.consts.has(n.name)) cls = this.C.Object.consts.get(n.name);
      if (cls) {
        if (!(cls instanceof RClass) || cls.isModule !== isMod) throw this.err('TypeError', n.name + ' is not a ' + (isMod ? 'module' : 'class'));
        if (sup && cls.sup !== sup) throw this.err('TypeError', 'superclass mismatch for class ' + n.name);
      } else {
        const full = holder === this.C.Object ? n.name : holder.name + '::' + n.name;
        cls = new RClass(full, isMod ? null : (sup || this.C.Object), isMod);
        cls.user = true;
        holder.consts.set(n.name, cls); this.ver++;
      }
      cls.defvis = 'public';
      const ctx = { self: cls, scope: new Scope(null), meth: null, args: [], blk: null, cref: [cls, ...c.cref], frame: null, inLoop: false, inProc: null };
      try { return this.ev(n.body, ctx); } finally { cls.defvis = 'public'; }
    }
    evalBegin(n, c) {
      try { return this.ev(n.body, c); }
      catch (e) {
        if (!(e instanceof RubyError)) throw e;
        for (const r of n.rescues) {
          const classes = r.classes.length ? r.classes.map(x => this.ev(x, c)) : [this.C.StandardError];
          if (classes.some(k => this.isA(e.exc, k))) { if (r.name) c.scope.set(r.name, e.exc); return this.ev(r.body, c); }
        }
        throw e;
      } finally { if (n.ensure) this.ev(n.ensure, c); }
    }

    // ---------- helpers used by the library
    hkey(v) {
      if (typeof v === 'number') return 'n' + v; if (v instanceof RStr) return 's' + v.s; if (v instanceof RSym) return 'y' + v.n; if (v === null) return 'nil';
      if (v === true) return 'T'; if (v === false) return 'F'; if (v instanceof RFloat) return 'f' + v.f;
      if (Array.isArray(v)) return 'a[' + v.map(x => this.hkey(x)).join(',') + ']';
      return 'o' + (v.id || (v.id = ++ID));
    }
    hset(h, k, v) { if (k instanceof RStr) k = new RStr(k.s); h.map.set(this.hkey(k), [k, v]); }
    hget(h, k) { const e = h.map.get(this.hkey(k)); return e ? e[1] : undefined; }
    eq(a, b) {
      if (a === b) return true;
      if (typeof a === 'number') return typeof b === 'number' ? a === b : b instanceof RFloat ? a === b.f : false;
      if (a instanceof RFloat) return typeof b === 'number' ? a.f === b : b instanceof RFloat ? a.f === b.f : false;
      if (a instanceof RStr) return b instanceof RStr && a.s === b.s;
      if (a === null || a === true || a === false || a instanceof RSym) return false;
      return truthy(this.send(a, '==', [b], null, null, true));
    }
    cmp(a, b) { // <=> as a JS number, raising when the values cannot be compared
      let r;
      if (typeof a === 'number' && typeof b === 'number') r = a < b ? -1 : a > b ? 1 : 0;
      else r = this.send(a, '<=>', [b], null, null, true);
      if (typeof r !== 'number') throw this.err('ArgumentError', 'comparison of ' + this.classOf(a).name + ' with ' + ((b === null || b === true || b === false || typeof b === 'number') ? this.insp(b) : this.classOf(b).name) + ' failed');
      return r;
    }
    callBlk(blk, args) { return this.callProc(blk, args); }
    iter(obj, fn) { // run fn(item) for every element that obj.each yields
      if (Array.isArray(obj)) { for (let i = 0; i < obj.length; i++) fn(obj[i]); return; }
      const p = new RProc(null, null, null, false); p.nat = (args) => { fn(args.length === 1 ? args[0] : args); return null; };
      this.send(obj, 'each', [], p, null, true);
    }
    iterStop(obj, fn) { try { this.iter(obj, fn); } catch (e) { if (!(e instanceof StopIter)) throw e; } }
    toArray(obj) { if (Array.isArray(obj)) return obj; const out = []; this.iter(obj, (x) => { out.push(x); }); return out; }
    fmtFloat(f) {
      if (Number.isNaN(f)) return 'NaN'; if (!Number.isFinite(f)) return f > 0 ? 'Infinity' : '-Infinity';
      const a = Math.abs(f);
      if (a !== 0 && (a >= 1e16 || a < 1e-4)) { let [m, e] = f.toExponential().split('e'); if (!m.includes('.')) m += '.0'; const sign = e[0] === '-' ? '-' : '+'; const d = e.replace(/^[-+]/, ''); return m + 'e' + sign + (d.length < 2 ? '0' + d : d); }
      const s = String(f); return /[.e]/.test(s) ? s : s + '.0';
    }
    addr(v) { return '0x' + (0x7f3a00000000 + (v.id || 0) * 40).toString(16).padStart(16, '0'); }
    tos(v) {
      if (v instanceof RStr) return v.s; if (typeof v === 'number') return String(v); if (v === null) return '';
      const r = this.send(v, 'to_s', [], null, null, true);
      return r instanceof RStr ? r.s : this.defaultToS(v);
    }
    defaultToS(v) { return '#<' + this.classOf(v).name + '>'; }
    strInspect(s) { return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/\x1b/g, '\\e').replace(/#\{/g, '\\#{') + '"'; }
    symInspect(n) { return /^(@{0,2}[A-Za-z_]\w*[?!=]?|\[\]=?|[-+*\/%<>!~^&|]|\*\*|[<>=]=|<=>|===?|=~|!=|<<|>>|[-+]@)$/.test(n) ? ':' + n : ':' + this.strInspect(n); }
    insp(v) {
      if (v === null) return 'nil'; if (v === true) return 'true'; if (v === false) return 'false';
      if (typeof v === 'number') return String(v);
      if (v instanceof RFloat) return this.fmtFloat(v.f);
      if (v instanceof RStr) return this.strInspect(v.s);
      if (v instanceof RSym) return this.symInspect(v.n);
      if (Array.isArray(v)) return '[' + v.map(x => this.insp(x)).join(', ') + ']';
      if (v instanceof RHash) {
        if (!v.map.size) return '{}';
        return '{' + [...v.map.values()].map(([k, x]) => (k instanceof RSym ? (/^[A-Za-z_]\w*[?!]?$/.test(k.n) ? k.n : this.strInspect(k.n)) + ': ' : this.insp(k) + ' => ') + this.insp(x)).join(', ') + '}';
      }
      if (v instanceof RRange) return this.insp(v.a) + (v.excl ? '...' : '..') + this.insp(v.b);
      if (v instanceof RProc) return '#<Proc:' + this.addr(v) + (v.isLambda ? ' (lambda)>' : '>');
      if (v instanceof RClass) return v.name;
      if (v === this.main) return 'main';
      const m = this.findMethod(v, this.classOf(v), 'inspect');
      if (m && m.user) { const r = this.send(v, 'inspect', [], null, null, true); return r instanceof RStr ? r.s : this.tos(r); }
      if (this.isA(v, this.C.Exception)) return '#<' + v.cls.name + ': ' + this.tos(v) + '>';
      const ivs = [...v.iv.entries()].map(([k, x]) => k + '=' + this.insp(x));
      return '#<' + v.cls.name + ':' + this.addr(v) + (ivs.length ? ' ' + ivs.join(', ') : '') + '>';
    }
    describe(e) {
      if (e instanceof SyntaxErr) return 'line ' + e.line + ': ' + e.message + ' (SyntaxError)\nNothing was run: Ruby checks the syntax of the whole file first.';
      if (e instanceof RubyError) { let msg; try { msg = this.tos(e.exc); } catch (x) { msg = '?'; } return 'line ' + this.line + ': ' + msg + ' (' + e.exc.cls.name + ')'; }
      if (e instanceof StopSig) return 'STOPPED: this ran for too long (probably an infinite loop).';
      if (e instanceof RangeError) return 'line ' + this.line + ': stack level too deep (SystemStackError)';
      if (e instanceof BreakSig || e instanceof LoopBreak) return 'line ' + this.line + ': break from proc-closure (LocalJumpError)';
      if (e instanceof NextSig || e instanceof LoopNext || e instanceof StopIter) return 'line ' + this.line + ': unexpected next (LocalJumpError)';
      return 'Internal interpreter error: ' + (e && e.message ? e.message : e);
    }
  }

  const installers = [];
  function run(src, opts = {}) {
    const I = new Interp(opts); let error = null; const values = [], shown = [];
    try {
      const P = new Parser(lex(cleanSource(src)));
      const ast = P.parseProgram(); const c = I.topCtx();
      try {
        if (opts.echo) for (const st of ast.list) { if (st.line) I.line = st.line; I.tick(); const v = I.ev(st, c); I.out.push('=> ' + I.insp(v) + '\n'); }
        else I.ev(ast, c);
        for (const ask of opts.asks || []) {
          const a = new Parser(lex(cleanSource(ask)), P.scopes).parseProgram();
          const v = I.ev(a, c); values.push(v); const shownAs = I.insp(v); shown.push(shownAs); I.out.push('=> ' + shownAs + '\n');
        }
      } catch (e) { if (!(e instanceof ReturnSig)) throw e; }
    } catch (e) { error = I.describe(e); }
    return { output: I.out.join(''), error, values, shown, interp: I };
  }
  function parse(src) { return new Parser(lex(cleanSource(src))).parseProgram(); }

  const Ruby = { run, parse, lex, cleanSource, Interp, installers, sym, truthy,
    RObj, RClass, RStr, RSym, RFloat, RHash, RRange, RProc, Scope, RubyError, StopIter, StopSig, BreakSig, SyntaxErr };
  root.Ruby = Ruby;
  if (typeof module !== 'undefined' && module.exports) module.exports = Ruby;
})(typeof window !== 'undefined' ? window : globalThis);

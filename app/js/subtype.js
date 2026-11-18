// subtype.js: a checker for the made-up record/function language of the Subtyping lecture (ruby6).
// Types:  int | string | float | bool | T list | {f1: T1, f2: T2} | T1 -> T2 | (T)   ("readonly f: T" is allowed in records)
// Rules:  width + permutation subtyping for records, NO depth subtyping unless opts.depth (or the field is immutable),
//         functions are contravariant in the argument and covariant in the result.
(function (root) {
  'use strict';
  function parseType(src, defs) {
    const toks = String(src).match(/->|[{}():,]|[A-Za-z_][A-Za-z0-9_']*/g) || []; let p = 0;
    const fail = (m) => { throw new Error(m + ' in type: ' + src); };
    function arrow() { const a = post(); if (toks[p] === '->') { p++; return { k: 'fn', arg: a, res: arrow() }; } return a; }
    function post() { let t = atom(); while (toks[p] === 'list') { p++; t = { k: 'list', el: t }; } return t; }
    function atom() {
      const t = toks[p++];
      if (t === undefined) fail('unexpected end');
      if (t === '(') { const x = arrow(); if (toks[p++] !== ')') fail('missing )'); return x; }
      if (t === '{') {
        const fields = [];
        while (toks[p] !== '}') {
          let ro = false; if (toks[p] === 'readonly') { ro = true; p++; }
          const name = toks[p++]; if (!/^[A-Za-z_]/.test(name || '')) fail('expected a field name');
          if (toks[p++] !== ':') fail('expected :');
          fields.push({ name, type: arrow(), ro });
          if (toks[p] === ',') p++; else if (toks[p] !== '}') fail('expected , or }');
        }
        p++; return { k: 'rec', fields };
      }
      if (!/^[A-Za-z_]/.test(t)) fail('unexpected ' + t);
      if (defs && defs[t] !== undefined) return typeof defs[t] === 'string' ? parseType(defs[t], defs) : defs[t];
      return { k: 'base', name: t };
    }
    const r = arrow(); if (p < toks.length) fail('unexpected ' + toks[p]); return r;
  }
  function show(t, inArg) {
    if (t.k === 'base') return t.name;
    if (t.k === 'list') return show(t.el, true) + ' list';
    if (t.k === 'rec') return '{' + t.fields.map(f => (f.ro ? 'readonly ' : '') + f.name + ': ' + show(f.type)).join(', ') + '}';
    const s = show(t.arg, true) + ' -> ' + show(t.res); return inArg ? '(' + s + ')' : s;
  }
  function same(a, b) { // equal up to the order of record fields
    if (a.k !== b.k) return false;
    if (a.k === 'base') return a.name === b.name;
    if (a.k === 'list') return same(a.el, b.el);
    if (a.k === 'fn') return same(a.arg, b.arg) && same(a.res, b.res);
    return a.fields.length === b.fields.length && a.fields.every(f => { const g = b.fields.find(x => x.name === f.name); return g && !!g.ro === !!f.ro && same(f.type, g.type); });
  }
  // Is a <: b ?  Returns { ok, why, kids } where why explains the rule that decided it.
  function check(a, b, opts) {
    opts = opts || {};
    const A = show(a), B = show(b);
    if (same(a, b)) return { ok: true, why: A + ' <: ' + B + ' by reflexivity/permutation (same fields and types; order does not matter).', kids: [] };
    if (a.k === 'base' || b.k === 'base' || a.k !== b.k) return { ok: false, why: A + ' is not a subtype of ' + B + ': they are different kinds of type.', kids: [] };
    if (a.k === 'list') return { ok: false, why: A + ' is not a subtype of ' + B + ': lists/arrays are mutable, so the element type cannot change (that would be depth subtyping).', kids: [] };
    if (a.k === 'rec') {
      const kids = [];
      for (const g of b.fields) {
        const f = a.fields.find(x => x.name === g.name);
        if (!f) return { ok: false, why: 'The supertype has field ' + g.name + ' but the subtype does not. A subtype must have every field of the supertype (it may have MORE, never fewer).', kids };
        if (f.ro && !g.ro) return { ok: false, why: 'Field ' + g.name + ' is readonly in the subtype but writable in the supertype: code using the supertype could write to it.', kids };
        if (same(f.type, g.type)) continue;
        const deep = opts.depth || opts.immutable || g.ro;
        if (!deep) return { ok: false, why: 'Field ' + g.name + ' has type ' + show(f.type) + ' on the left but ' + show(g.type) + ' on the right. Changing a field\'s type needs DEPTH subtyping, which is unsound when fields are mutable.', kids };
        const r = check(f.type, g.type, opts); kids.push(r);
        if (!r.ok) return { ok: false, why: 'Depth subtyping on field ' + g.name + ' fails: ' + show(f.type) + ' is not a subtype of ' + show(g.type) + '.', kids };
      }
      const extra = a.fields.filter(f => !b.fields.some(g => g.name === f.name)).map(f => f.name);
      return { ok: true, why: A + ' <: ' + B + (extra.length ? ' by width subtyping (extra field' + (extra.length > 1 ? 's ' : ' ') + extra.join(', ') + ' may be dropped)' : ' (same fields)') + (kids.length ? ', using depth subtyping on a field' : '') + '.', kids };
    }
    // functions
    const argR = check(b.arg, a.arg, opts), resR = check(a.res, b.res, opts);
    if (!argR.ok) return { ok: false, why: 'Arguments are CONTRAVARIANT: we need ' + show(b.arg) + ' <: ' + show(a.arg) + ' (the subtype function must accept everything the supertype accepts), and that fails.', kids: [argR, resR] };
    if (!resR.ok) return { ok: false, why: 'Results are COVARIANT: we need ' + show(a.res) + ' <: ' + show(b.res) + ' (the subtype function must return at least what the supertype promises), and that fails.', kids: [argR, resR] };
    return { ok: true, why: A + ' <: ' + B + ': argument is contravariant (' + show(b.arg) + ' <: ' + show(a.arg) + ') and result is covariant (' + show(a.res) + ' <: ' + show(b.res) + ').', kids: [argR, resR] };
  }
  const isSub = (a, b, defs, opts) => check(parseType(a, defs), parseType(b, defs), opts).ok;
  function relation(a, b, defs, opts) { const x = isSub(a, b, defs, opts), y = isSub(b, a, defs, opts); return x && y ? 'both' : x ? 'subtype' : y ? 'supertype' : 'neither'; }
  const Subtype = { parseType, show, same, check, isSub, relation };
  root.Subtype = Subtype;
  if (typeof module !== 'undefined' && module.exports) module.exports = Subtype;
})(typeof window !== 'undefined' ? window : globalThis);

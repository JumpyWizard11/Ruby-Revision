// viz.js: interactive visualisers used inside lessons (Ruby version).
(function () {
  'use strict';
  const R = window.Ruby, ST = window.Subtype;

  // ---------- tiny DOM helpers ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return el;
  }
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // ---------- syntax highlighting (Ruby, plus the typed pseudocode of the subtyping slides) ----------
  const KW = new Set('def end class module if elsif else unless while until do then return yield self super nil true false and or not begin rescue ensure case when break next lambda proc include attr_reader attr_writer attr_accessor private protected public raise puts print p require let in fun val type match with'.split(' '));
  function highlight(code) {
    let out = '', i = 0; const n = code.length;
    const span = (cls, s) => '<span class="' + cls + '">' + esc(s) + '</span>';
    while (i < n) {
      const c = code[i];
      if (c === '#' && code[i + 1] !== '{') { let j = code.indexOf('\n', i); if (j < 0) j = n; out += span('t-com', code.slice(i, j)); i = j; continue; }
      if (c === '(' && code[i + 1] === '*') { let j = code.indexOf('*)', i); j = j < 0 ? n : j + 2; out += span('t-com', code.slice(i, j)); i = j; continue; }
      if (c === '/' && code[i + 1] === '/') { let j = code.indexOf('\n', i); if (j < 0) j = n; out += span('t-com', code.slice(i, j)); i = j; continue; }
      if (c === '"' || c === "'") { let j = i + 1; while (j < n && code[j] !== c && code[j] !== '\n') { if (code[j] === '\\') j++; j++; } j = Math.min(n, j + 1); out += span('t-str', code.slice(i, j)); i = j; continue; }
      if (c === '@') { let j = i + 1; while (j < n && /[@\w]/.test(code[j])) j++; out += span('t-q', code.slice(i, j)); i = j; continue; }
      if (c === ':' && /[A-Za-z_]/.test(code[i + 1] || '') && code[i - 1] !== ':') { let j = i + 1; while (j < n && /[\w?!]/.test(code[j])) j++; out += span('t-bool', code.slice(i, j)); i = j; continue; }
      if (/[0-9]/.test(c) && !/[A-Za-z_]/.test(code[i - 1] || '')) { let j = i; while (j < n && /[0-9._]/.test(code[j]) && !(code[j] === '.' && !/[0-9]/.test(code[j + 1] || ''))) j++; out += span('t-num', code.slice(i, j)); i = j; continue; }
      if (/[A-Za-z_]/.test(c)) {
        let j = i; while (j < n && /[\w?!]/.test(code[j])) j++;
        const w = code.slice(i, j); i = j;
        if (KW.has(w) && code[i - w.length - 1] !== '.') out += span('t-kw', w);
        else if (/^[A-Z]/.test(w)) out += span('t-cls', w);
        else out += esc(w);
        continue;
      }
      if ('()[]{}|'.includes(c)) { out += span('t-par', c); i++; continue; }
      out += esc(c); i++;
    }
    return out;
  }

  // ---------- runnable code block ----------
  function codeBlock(code, opts = {}) {
    const wrap = h('div', { class: 'codeblock' });
    const pre = h('pre', { class: 'code', html: highlight(code) });
    const ta = h('textarea', { class: 'code-edit', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', rows: Math.min(16, code.split('\n').length + 1) });
    ta.value = code;
    const outEl = h('div', { class: 'run-out', hidden: true });
    let editing = false;
    const runBtn = h('button', { class: 'btn small primary', onclick: () => run(!!opts.echo) }, '▶ Run');
    const irbBtn = opts.echo ? null : h('button', { class: 'btn small', onclick: () => run(true) }, '⇒ irb');
    const editBtn = h('button', { class: 'btn small', onclick: () => toggle() }, '✎ Edit');
    function toggle() {
      editing = !editing;
      if (editing) { ta.value = current(); pre.replaceWith(ta); ta.focus(); editBtn.textContent = '✓ Done'; }
      else { pre.innerHTML = highlight(ta.value); ta.replaceWith(pre); editBtn.textContent = '✎ Edit'; }
    }
    const current = () => editing ? ta.value : (pre.dataset.src || code);
    ta.addEventListener('input', () => { pre.dataset.src = ta.value; });
    function run(echo) {
      let r;
      if (opts.prelude) { const base = R.run(opts.prelude, {}); r = R.run(opts.prelude + '\n' + current(), { echo }); if (echo) r.output = r.output.split('\n').slice(R.parse(opts.prelude).list.length).join('\n'); else if (base.output && r.output.startsWith(base.output)) r.output = r.output.slice(base.output.length); }
      else r = R.run(current(), { echo });
      outEl.hidden = false; outEl.innerHTML = '';
      if (r.output) outEl.append(h('pre', { class: 'out-text' }, r.output));
      if (r.error) outEl.append(h('pre', { class: 'out-err' }, r.error));
      if (!r.output && !r.error) outEl.append(h('div', { class: 'muted small' }, '(no output: a Ruby file only prints what you puts/p. Tap ⇒ irb to see each value.)'));
    }
    wrap.append(pre, h('div', { class: 'code-actions' }, runBtn, irbBtn, editBtn), outEl);
    return wrap;
  }

  // ---------- step-through explainer ----------
  // Frames are written compactly: "x: → object #1 | object #1 (class D): *@foo=0"
  //   NAME(PARENT): key=value; ...   a leading * highlights a change
  function parseFrames(spec) {
    if (!spec) return [];
    return spec.split(' | ').map((f) => {
      const m = f.match(/^\s*([^:(]+)(?:\(([^)]*)\))?:\s*(.*)$/);
      const name = m[1].trim(), parent = m[2] || null;
      const vars = m[3].trim() ? m[3].split(';').map(kv => {
        const k = kv.indexOf('='); let key = (k < 0 ? kv : kv.slice(0, k)).trim(); const val = k < 0 ? '' : kv.slice(k + 1).trim();
        const hot = key.startsWith('*'); if (hot) key = key.slice(1);
        return { key, val, hot };
      }) : [];
      return { name, parent, vars };
    });
  }
  function stepper(def) {
    const wrap = h('div', { class: 'widget stepper' });
    const tabs = def.variants ? h('div', { class: 'seg' }) : null;
    let variant = 0, k = 0;
    const codeEl = h('pre', { class: 'code step-code' });
    const framesEl = h('div', { class: 'frames' });
    const noteEl = h('div', { class: 'step-note' });
    const outEl = h('div', { class: 'step-out mono' });
    const counter = h('span', { class: 'muted small' });
    const prev = h('button', { class: 'btn small', onclick: () => go(k - 1) }, '◀ Back');
    const next = h('button', { class: 'btn small primary', onclick: () => go(k + 1) }, 'Next ▶');
    const cur = () => def.variants ? def.variants[variant] : def;
    const label = h('div', { class: 'frames-label small muted' });
    function go(nk) {
      const d = cur(); k = Math.max(0, Math.min(d.steps.length - 1, nk));
      const st = d.steps[k];
      codeEl.innerHTML = d.code.split('\n').map((l, idx) => `<span class="ln${(st.line || []).includes(idx + 1) ? ' hl' : ''}">${highlight(l) || ' '}</span>`).join('');
      const frames = parseFrames(st.frames);
      framesEl.innerHTML = '';
      frames.forEach((f, idx) => {
        framesEl.append(h('div', { class: 'frame c' + (idx % 6) },
          h('div', { class: 'frame-h' }, h('b', null, f.name), f.parent ? h('span', { class: 'frame-p' }, f.parent) : null),
          f.vars.length ? f.vars.map(v => h('div', { class: 'bind' + (v.hot ? ' hot' : '') }, h('span', { class: 'bk mono' }, v.key), h('span', { class: 'bv mono' }, v.val))) : h('div', { class: 'muted small' }, '(empty)')));
      });
      label.textContent = frames.length ? (d.framesLabel || def.framesLabel || 'State:') : '';
      noteEl.innerHTML = st.note || '';
      outEl.textContent = st.out ? '⇒ ' + st.out : '';
      outEl.hidden = !st.out;
      counter.textContent = `step ${k + 1} / ${d.steps.length}`;
      prev.disabled = k === 0; next.disabled = k === d.steps.length - 1;
    }
    if (tabs) def.variants.forEach((v, idx) => tabs.append(h('button', { class: 'seg-b' + (idx === 0 ? ' on' : ''), onclick: (e) => { variant = idx; [...tabs.children].forEach(c => c.classList.remove('on')); e.target.classList.add('on'); go(0); } }, v.label)));
    wrap.append(h('div', { class: 'w-title' }, '🪜 ' + def.title), tabs || '', codeEl, h('div', { class: 'step-nav' }, prev, counter, next), noteEl, outEl, label, framesEl);
    setTimeout(() => go(0), 0);
    return wrap;
  }

  const STEPS = {
    'aliasing': {
      title: 'Objects, instance variables and aliasing (class D from the slides)', framesLabel: 'Variables (top) and the objects they refer to:',
      code: `class D\n  def m1\n    @foo = 0\n  end\n  def m2 x\n    @foo += x\n  end\n  def foo\n    @foo\n  end\nend\nx = D.new\ny = D.new\nz = x\nx.foo\nx.m1\nz.m2 3\ny.foo\ny.m2 3`,
      steps: [
        { line: [12], frames: 'variables: *x=→ object #1 | object #1(class D): ', note: '<code>D.new</code> makes a <b>new object</b> and returns a <b>reference</b> to it. There is no <code>initialize</code>, so the object has <b>no instance variables yet</b>.' },
        { line: [13], frames: 'variables: x=→ object #1; *y=→ object #2 | object #1(class D):  | object #2(class D): ', note: 'A second <code>D.new</code>: a different object with its own (empty) state.' },
        { line: [14], frames: 'variables: x=→ object #1; y=→ object #2; *z=→ object #1 | object #1(class D):  | object #2(class D): ', note: '<code>z = x</code> copies the <b>reference</b>, not the object. x and z are <b>aliases</b>: two names for the same object.' },
        { line: [15, 9], frames: 'variables: x=→ object #1; y=→ object #2; z=→ object #1 | object #1(class D):  | object #2(class D): ', note: 'Reading an instance variable that was never assigned is <b>not an error</b>: it gives <code>nil</code>.', out: 'nil' },
        { line: [16, 3], frames: 'variables: x=→ object #1; y=→ object #2; z=→ object #1 | object #1(class D): *@foo=0 | object #2(class D): ', note: '<code>x.m1</code> runs with <code>self</code> = object #1. Assigning to <code>@foo</code> <b>creates</b> the instance variable in that object only.', out: '0' },
        { line: [17, 6], frames: 'variables: x=→ object #1; y=→ object #2; z=→ object #1 | object #1(class D): *@foo=3 | object #2(class D): ', note: '<code>z.m2 3</code>: z is the same object as x, so this changes the @foo that x sees too. <code>x.foo</code> is now 3.', out: '3' },
        { line: [18, 9], frames: 'variables: x=→ object #1; y=→ object #2; z=→ object #1 | object #1(class D): @foo=3 | object #2(class D): ', note: 'y is a different object. Its @foo was never assigned.', out: 'nil' },
        { line: [19, 6], frames: 'variables: x=→ object #1; y=→ object #2; z=→ object #1 | object #1(class D): @foo=3 | object #2(class D): ', note: '<code>@foo += x</code> means <code>@foo = @foo + x</code>. @foo is nil in object #2, so this calls <code>nil + 3</code>: nil has no <code>+</code> method.', out: "ERROR  undefined method '+' for nil (NoMethodError)" },
      ],
    },
    'classvars': {
      title: '@instance variables vs @@class variables (class F from the slides)', framesLabel: 'The class holds @@bar once; each object holds its own @foo:',
      code: `class F\n  def self.reset_bar\n    @@bar = 0\n  end\n  def initialize(f=0)\n    @foo = f\n  end\n  def m2 x\n    @foo += x\n    @@bar += 1\n  end\nend\nF.reset_bar\nd = F.new 17\nd.m2 5\ne = F.new\ne.m2 6`,
      steps: [
        { line: [13, 3], frames: 'class F: *@@bar=0', note: '<code>F.reset_bar</code> is a <b>class method</b> (defined with <code>def self.</code>). It is called on the class itself, not on an instance. It sets the class variable <code>@@bar</code>.', out: '0' },
        { line: [14, 6], frames: 'class F: @@bar=0 | d → object #1(class F): *@foo=17', note: '<code>F.new 17</code> creates an object, then calls <code>initialize(17)</code> on it <b>before</b> <code>new</code> returns.' },
        { line: [15, 9, 10], frames: 'class F: *@@bar=1 | d → object #1(class F): *@foo=22', note: '<code>m2</code> changes this object\'s @foo and the <b>shared</b> @@bar. The value of the method is its last expression: the new @@bar.', out: '1' },
        { line: [16, 6], frames: 'class F: @@bar=1 | d → object #1(class F): @foo=22 | e → object #2(class F): *@foo=0', note: '<code>F.new</code> with no argument uses the default <code>f=0</code>. e has its <b>own</b> @foo.' },
        { line: [17, 9, 10], frames: 'class F: *@@bar=2 | d → object #1(class F): @foo=22 | e → object #2(class F): *@foo=6', note: 'e.m2 changes e\'s @foo, but @@bar is the same variable for every instance: it has now been bumped by both d and e.', out: '2' },
      ],
    },
    'closure': {
      title: 'Blocks are closures: they see (and change) the variables around them', framesLabel: 'Local variables:',
      variants: [
        { label: 'block', code: `total = 0\n[4, 6, 8].each { |x| total += x }\nputs total`, steps: [
          { line: [1], frames: 'top level: *total=0', note: 'A local variable at the top level.' },
          { line: [2], frames: 'top level: total=0 | block call 1(scope inside top level): *x=4', note: '<code>each</code> calls the block once per element. The block has its own variable <code>x</code>, but it can also see <code>total</code>, because blocks use <b>lexical scope</b>: the environment where the block was <b>written</b>.' },
          { line: [2], frames: 'top level: *total=4 | block call 1(scope inside top level): x=4', note: '<code>total += x</code> changes the <b>outer</b> variable. It is not a copy.' },
          { line: [2], frames: 'top level: *total=10 | block call 2(scope inside top level): *x=6', note: 'Second call: a fresh <code>x</code>, the same <code>total</code>.' },
          { line: [2], frames: 'top level: *total=18 | block call 3(scope inside top level): *x=8', note: 'Third call.' },
          { line: [3], frames: 'top level: total=18', note: 'The block parameter x is gone, but the change to total remains.', out: '18' }] },
        { label: 'def (no closure!)', code: `total = 0\ndef add(x)\n  total += x\nend\nadd(4)`, steps: [
          { line: [1], frames: 'top level: *total=0', note: 'Same start.' },
          { line: [2, 3, 4], frames: 'top level: total=0', note: 'A <code>def</code> is <b>not</b> a closure. A method body is a brand-new scope: it cannot see local variables from outside.' },
          { line: [5, 3], frames: 'top level: total=0 | method add(new scope, sees nothing outside): x=4; *total=nil', note: 'Inside <code>add</code>, <code>total += x</code> means <code>total = total + x</code> with a <b>new local</b> <code>total</code> that is nil.', out: "ERROR  undefined method '+' for nil (NoMethodError)" }] },
        { label: 'lambda', code: `a = [3, 5, 7, 9]\nc = a.map { |x| lambda { |y| x >= y } }\nc[2].call 17\nc[2].call 6`, steps: [
          { line: [1], frames: 'top level: *a=[3, 5, 7, 9]', note: 'An array of numbers.' },
          { line: [2], frames: 'top level: a=[3, 5, 7, 9]; *c=[λ(x=3), λ(x=5), λ(x=7), λ(x=9)]', note: 'For each x, the block returns a <b>lambda</b>: a real closure object (class <code>Proc</code>) that remembers <b>its own</b> x. A block cannot be stored in an array, but a Proc can: it is <b>first-class</b>.' },
          { line: [3], frames: 'top level: a=[3, 5, 7, 9]; c=[λ(x=3), λ(x=5), λ(x=7), λ(x=9)] | λ call(remembers x=7): *y=17', note: '<code>c[2]</code> is the lambda that captured x = 7. <code>.call 17</code> runs it with y = 17: is 7 >= 17?', out: 'false' },
          { line: [4], frames: 'top level: a=[3, 5, 7, 9]; c=[λ(x=3), λ(x=5), λ(x=7), λ(x=9)] | λ call(remembers x=7): *y=6', note: '7 >= 6', out: 'true' }] },
      ],
    },
    'yield': {
      title: 'yield: the method calls the caller\'s block', framesLabel: 'Who is running:',
      code: `class Foo\n  def initialize(max)\n    @max = max\n  end\n  def silly\n    yield(4, 5) + yield(@max, @max)\n  end\nend\nfoo = Foo.new(1000)\nfoo.silly { |a, b| 2 * a - b }`,
      steps: [
        { line: [10], frames: 'foo → object(class Foo): @max=1000', note: 'The block <code>{ |a, b| 2 * a - b }</code> is passed <b>next to</b> the (zero) normal arguments. The method never gets a name for it.' },
        { line: [6], frames: 'foo → object(class Foo): @max=1000 | method silly(self = foo): ', note: 'Inside <code>silly</code>, <code>yield(4, 5)</code> means: call the block I was given with arguments 4 and 5.' },
        { line: [10], frames: 'foo → object(class Foo): @max=1000 | method silly(self = foo, waiting):  | block(called by yield): *a=4; *b=5', note: 'The block runs: 2 * 4 - 5 = <b>3</b>. That value becomes the value of <code>yield(4, 5)</code>.', out: '3' },
        { line: [6], frames: 'foo → object(class Foo): @max=1000 | method silly(self = foo): first yield=3', note: 'Now the second yield: <code>yield(@max, @max)</code> = yield(1000, 1000). The method can use its own instance variables as arguments.' },
        { line: [10], frames: 'foo → object(class Foo): @max=1000 | method silly(self = foo, waiting): first yield=3 | block(called by yield): *a=1000; *b=1000', note: 'The block runs again: 2 * 1000 - 1000 = <b>1000</b>.', out: '1000' },
        { line: [6], frames: 'foo → object(class Foo): @max=1000 | method silly(self = foo): first yield=3; second yield=1000', note: '3 + 1000', out: '1003' },
      ],
    },
    'polar': {
      title: 'Dynamic dispatch: why the inherited distFromOrigin2 works for a PolarPoint', framesLabel: 'self and where each method was found:',
      code: `class Point\n  attr_accessor :x, :y\n  def distFromOrigin2\n    Math.sqrt(x * x + y * y)   # x means self.x\n  end\nend\nclass PolarPoint < Point\n  def initialize(r, theta)\n    @r = r\n    @theta = theta\n  end\n  def x\n    @r * Math.cos(@theta)\n  end\n  def y\n    @r * Math.sin(@theta)\n  end\nend\npp = PolarPoint.new(4, Math::PI / 4)\npp.distFromOrigin2`,
      steps: [
        { line: [19], frames: 'pp → object(class PolarPoint): @r=4; @theta=0.785...', note: 'A PolarPoint has <b>no @x or @y at all</b>: its initialize never calls super, so those instance variables are never created.' },
        { line: [20], frames: 'pp → object(class PolarPoint): @r=4; @theta=0.785... | lookup distFromOrigin2: PolarPoint=✗ not defined here; *Point=✓ found', note: 'Method lookup starts in the <b>class of the receiver</b> (PolarPoint), then goes up to the superclass. distFromOrigin2 is found in Point.' },
        { line: [4], frames: 'pp → object(class PolarPoint): @r=4; @theta=0.785... | running Point#distFromOrigin2(self = pp, a PolarPoint!): ', note: 'The body runs with <b>self = the receiver</b> (pp). <code>x</code> is short for <code>self.x</code>: a new method call on pp.' },
        { line: [12, 13], frames: 'pp → object(class PolarPoint): @r=4; @theta=0.785... | running Point#distFromOrigin2(self = pp, a PolarPoint!):  | lookup x: *PolarPoint=✓ found (the override)', note: 'Lookup for <code>x</code> starts again from <b>self\'s class</b>, PolarPoint, not from Point where the calling code was written. So the <b>subclass\'s</b> x runs. This is dynamic dispatch (late binding).', out: 'x = 2.828...' },
        { line: [15, 16], frames: 'pp → object(class PolarPoint): @r=4; @theta=0.785... | running Point#distFromOrigin2(self = pp, a PolarPoint!):  | lookup y: *PolarPoint=✓ found (the override)', note: 'Same for y.', out: 'y = 2.828...' },
        { line: [4], frames: 'pp → object(class PolarPoint): @r=4; @theta=0.785...', note: 'A method written in the <b>superclass</b> ended up calling methods in the <b>subclass</b>. With direct field access (<code>@x * @x</code>, as in distFromOrigin) it would have failed: @x is nil.', out: '4.0' },
      ],
    },
    'super': {
      title: 'super: continue the lookup above the current method', framesLabel: 'Call stack:',
      code: `class Point\n  def initialize(x, y)\n    @x = x\n    @y = y\n  end\n  def distFromOrigin\n    Math.sqrt(@x * @x + @y * @y)\n  end\nend\nclass ThreeDPoint < Point\n  def initialize(x, y, z)\n    super(x, y)\n    @z = z\n  end\n  def distFromOrigin\n    d = super\n    Math.sqrt(d * d + @z * @z)\n  end\nend\nThreeDPoint.new(3, 4, 12).distFromOrigin`,
      steps: [
        { line: [20, 11], frames: 'new object(class ThreeDPoint): ', note: '<code>new</code> creates the object, then calls <code>initialize(3, 4, 12)</code>. Lookup finds ThreeDPoint#initialize.' },
        { line: [12, 2, 3, 4], frames: 'new object(class ThreeDPoint): *@x=3; *@y=4', note: '<code>super(x, y)</code> calls the method <b>with the same name</b> in the superclass, with the arguments given. self stays the same object, so Point#initialize sets @x and @y <b>in this ThreeDPoint</b>.' },
        { line: [13], frames: 'new object(class ThreeDPoint): @x=3; @y=4; *@z=12', note: 'Back in the subclass: add the extra state.' },
        { line: [20, 15], frames: 'object(class ThreeDPoint): @x=3; @y=4; @z=12 | ThreeDPoint#distFromOrigin(self = the object): ', note: 'distFromOrigin: lookup starts at ThreeDPoint and finds the <b>override</b>.' },
        { line: [16, 7], frames: 'object(class ThreeDPoint): @x=3; @y=4; @z=12 | ThreeDPoint#distFromOrigin(self = the object): *d=5.0 | Point#distFromOrigin(reached by super, same self): ', note: 'Bare <code>super</code> (no parentheses) passes on <b>the same arguments</b> the current method got (here none). Point\'s version computes √(9 + 16) = 5.0.' },
        { line: [17], frames: 'object(class ThreeDPoint): @x=3; @y=4; @z=12 | ThreeDPoint#distFromOrigin(self = the object): d=5.0', note: 'Reuse the superclass result instead of copying its code: √(25 + 144).', out: '13.0' },
      ],
    },
    'double': {
      title: 'Double dispatch step by step: Int + String', framesLabel: 'What is known so far:',
      code: `class Add\n  def eval\n    e1.eval.add_values e2.eval\n  end\nend\nclass Int\n  def add_values v     # first dispatch landed here\n    v.addInt self      # second dispatch\n  end\n  def addInt v    ... end   # v is an Int\n  def addString v ... end   # v is a MyString\nend\nclass MyString\n  def add_values v\n    v.addString self\n  end\n  def addInt v             # v is an Int, self is a MyString\n    MyString.new(v.i.to_s + s)\n  end\n  def addString v ... end\nend\nAdd.new(Int.new(3), MyString.new("x")).eval`,
      steps: [
        { line: [22, 3], frames: 'left value: Int 3 | right value: MyString "x"', note: 'We must add two values, and the right code depends on the class of <b>both</b>. Normal method calls only dispatch on <b>one</b> object: the receiver.' },
        { line: [3, 7], frames: 'left value: Int 3 | right value: MyString "x" | known: *left is an Int (because Int#add_values is running)', note: '<b>First dispatch</b>: <code>e1.eval.add_values e2.eval</code>. The receiver is the Int, so Ruby runs <code>Int#add_values</code>. Just by being in this method we <b>know self is an Int</b>. We still do not know what v is.' },
        { line: [8], frames: 'left value: Int 3 | right value: MyString "x" | known: left is an Int', note: 'The non-OOP way would be <code>if v.is_a? MyString ...</code>. The OOP way: <b>ask v</b>, by calling a method on it. We tell v what we are through the <b>method name</b>: <code>v.addInt self</code> means "you are being added to an Int, and here it is".' },
        { line: [17], frames: 'left value: Int 3 | right value: MyString "x" | known: left is an Int; *right is a MyString (because MyString#addInt is running)', note: '<b>Second dispatch</b>: v is a MyString, so Ruby runs <code>MyString#addInt</code>. Now both classes are known with <b>no type tests</b>: self is the MyString (right operand), the argument v is the Int (left operand).' },
        { line: [18], frames: 'left value: Int 3 | right value: MyString "x" | known: left is an Int; right is a MyString', note: 'Careful with the order: the argument <code>v</code> is the <b>left</b> operand. So it is <code>v.i.to_s + s</code>, not <code>s + v.i.to_s</code>.', out: 'MyString "3x"' },
      ],
    },
    'visitor': {
      title: 'The Visitor pattern is double dispatch too', framesLabel: 'Two dispatches:',
      code: `class Constant\n  def accept(visitor)\n    visitor.visit_constant(self)\n  end\nend\nclass Add\n  def accept(visitor)\n    visitor.visit_add(self)\n  end\nend\nclass EvalVisitor\n  def visit_constant(node)\n    node.value\n  end\n  def visit_add(node)\n    node.left.accept(self) + node.right.accept(self)\n  end\nend\nexpr = Add.new(Constant.new(3), Constant.new(4))\nexpr.accept(EvalVisitor.new)`,
      steps: [
        { line: [20], frames: 'expr: Add(Constant 3, Constant 4) | visitor: an EvalVisitor', note: 'The operation (evaluate) lives in its <b>own object</b>, outside the expression classes. Each expression class has just one hook: <code>accept</code>.' },
        { line: [7, 8], frames: 'expr: Add(Constant 3, Constant 4) | visitor: an EvalVisitor | dispatch 1: *expr.accept → Add#accept (now we know the variant)', note: '<b>First dispatch</b> on the expression: <code>Add#accept</code> runs, so the variant is known.' },
        { line: [15, 16], frames: 'expr: Add(Constant 3, Constant 4) | visitor: an EvalVisitor | dispatch 1: expr.accept → Add#accept | dispatch 2: *visitor.visit_add → EvalVisitor#visit_add (now we know the operation)', note: '<b>Second dispatch</b> on the visitor: <code>visit_add</code> of whichever visitor was passed. The method name carries the variant; the visitor\'s class carries the operation.' },
        { line: [16, 3, 13], frames: 'expr: Add(Constant 3, Constant 4) | visitor: an EvalVisitor | left child: accept → visit_constant → 3 | right child: accept → visit_constant → 4', note: 'The visitor recurses by calling <code>accept(self)</code> on each child: the same two dispatches again.', out: '3 + 4 = 7' },
        { line: [11], frames: 'new operation: add ONE new visitor class, change no expression class | new variant (Multiply): add the class AND add visit_multiply to EVERY visitor', note: 'Result: the usual OOP trade-off is <b>reversed</b>. New operations are easy, new variants are hard: just like the functional decomposition.' },
      ],
    },
    'depth': {
      title: 'Why depth subtyping is unsound with mutable fields', framesLabel: 'The record at run time vs what its type promises:',
      code: `let setToOrigin (c: {center: {x: float, y: float}, r: float}) =\n  c.center = {x = 0.0, y = 0.0}        (* MUTATION *)\n\nlet sphere: {center: {x: float, y: float, z: float}, r: float} =\n  {center = {x = 3.0, y = 4.0, z = 0.0}, r = 1.0}\n\nlet _ = setToOrigin sphere\nlet _ = sphere.center.z`,
      steps: [
        { line: [4, 5], frames: 'sphere (type says center has x, y, z): center={x=3.0, y=4.0, z=0.0}; r=1.0', note: 'sphere\'s type promises that <code>center</code> has an x, a y <b>and a z</b>.' },
        { line: [7], frames: 'sphere (type says center has x, y, z): center={x=3.0, y=4.0, z=0.0}; r=1.0', note: 'setToOrigin wants a record whose center is <code>{x, y}</code>. sphere\'s center has an extra field. If we allowed <b>depth subtyping</b>, sphere\'s type would be a subtype of the parameter type and this call would typecheck.' },
        { line: [1, 2], frames: 'c is an ALIAS of sphere(inside setToOrigin, type says center has x, y): *center={x=0.0, y=0.0}; r=1.0', note: 'Inside, the body is perfectly well typed: it stores an <code>{x, y}</code> record into a field of type <code>{x, y}</code>. But <code>c</code> <b>is</b> sphere (aliasing), so sphere\'s center just lost its z.' },
        { line: [8], frames: 'sphere (type STILL says center has x, y, z): center={x=0.0, y=0.0}; r=1.0', note: 'The typechecker still believes sphere.center has a z. It does not. We read a field that <b>does not exist</b>: exactly what the type system was supposed to prevent. So depth subtyping + mutable fields = <b>unsound</b>.', out: 'ERROR at run time: no field z' },
        { line: [2], frames: 'pick any two: setters (mutable fields); depth subtyping; soundness', note: 'If fields were <b>immutable</b>, line 2 would be impossible and depth subtyping would be sound. "Choose two of three: setters, depth subtyping, soundness."' },
      ],
    },
    'javaarray': {
      title: 'Java arrays: depth subtyping allowed, paid for with a run-time check', framesLabel: 'The array:',
      code: `void m1(Point[] pt_arr) {\n  pt_arr[0] = new Point(3, 4);\n}\nString m2(int x) {\n  ColorPoint[] carr = new ColorPoint[x];\n  for (int i = 0; i < x; i++)\n    carr[i] = new ColorPoint(0, 0, "green");\n  m1(carr);\n  return carr[0].color;\n}`,
      steps: [
        { line: [5, 6, 7], frames: 'carr (a ColorPoint[]): [0]=ColorPoint green; [1]=ColorPoint green', note: 'An array of ColorPoints.' },
        { line: [8], frames: 'carr (a ColorPoint[]): [0]=ColorPoint green; [1]=ColorPoint green', note: 'm1 wants a <code>Point[]</code>. Java says: ColorPoint &lt;: Point, therefore <code>ColorPoint[] &lt;: Point[]</code>. That is <b>depth subtyping on a mutable container</b>, which we just saw is unsound. It typechecks anyway.' },
        { line: [2], frames: 'pt_arr is an ALIAS of carr(static type Point[], really a ColorPoint[]): [0]=tries to store a plain Point; [1]=ColorPoint green', note: 'Storing a Point into a Point[] looks fine to the typechecker. To stay safe, Java checks <b>every array store at run time</b> against the array\'s real element class.', out: 'ArrayStoreException thrown HERE (line 2), although the mistake is in m2' },
        { line: [9], frames: 'guarantee kept: reading carr[0] always gives a ColorPoint, so .color never fails | price: every array store has a run-time check and can throw', note: 'Good news: field reads like <code>carr[0].color</code> can never hit a missing field. Bad news: <code>e1[e2] = e3</code> can fail even when the types look right, and the check costs time.' },
      ],
    },
    'contra': {
      title: 'Function subtyping: covariant result, contravariant argument', framesLabel: 'What distMoved does with f:',
      variants: [
        { label: 'result: more ✓', code: `let distMoved (f: {x,y} -> {x,y}) (p: {x,y}) =\n  let p2: {x,y} = f p in\n  ... p2.x ... p2.y ...\n\nlet flipGreen p = {x = -p.x, y = -p.y, color = "green"}\ndistMoved flipGreen {x = 3.0, y = 4.0}`, steps: [
          { line: [5], frames: 'flipGreen: takes {x,y}; returns {x,y,color}', note: 'flipGreen returns <b>more</b> than distMoved asks for: an extra color field.' },
          { line: [2, 3], frames: 'distMoved calls f p: gives it {x,y} ✓ | then uses the result: reads p2.x and p2.y ✓ (color is simply ignored)', note: 'distMoved only ever reads x and y from the result. Extra fields cannot hurt.', out: 'sound: T -> {x,y,color}  <:  T -> {x,y}' },
          { line: [5], frames: 'rule: if TA <: TB then  T -> TA  <:  T -> TB', note: 'Return types are <b>covariant</b>: the function subtype goes the <b>same way</b> as the result subtype. "A function may return more than it needs to."' }] },
        { label: 'argument: needs more ✗', code: `let distMoved (f: {x,y} -> {x,y}) (p: {x,y}) =\n  let p2: {x,y} = f p in\n  ... p2.x ... p2.y ...\n\nlet flipIfGreen p =\n  if p.color = "green" then {x = -p.x, y = -p.y}\n  else {x = p.x, y = p.y}\ndistMoved flipIfGreen {x = 3.0, y = 4.0}`, steps: [
          { line: [5, 6], frames: 'flipIfGreen: takes {x,y,color}; returns {x,y}', note: 'flipIfGreen <b>needs more</b> from its argument: it reads <code>p.color</code>.' },
          { line: [2], frames: 'distMoved calls f p: gives it only {x,y}', note: 'distMoved calls f with a plain <code>{x, y}</code> record, as its own type allows.' },
          { line: [6], frames: 'inside flipIfGreen: p={x=3.0, y=4.0}; p.color=✗ MISSING', note: 'The function reads a field that is not there.', out: 'UNSOUND: {x,y,color} -> T  is NOT a subtype of  {x,y} -> T' },
          { line: [5], frames: 'trap: TA <: TB does NOT give  TA -> T  <:  TB -> T', note: 'Arguments are <b>not</b> covariant. Anyone who says they are is mistaken, however confident.' }] },
        { label: 'argument: needs less ✓', code: `let distMoved (f: {x,y} -> {x,y}) (p: {x,y}) =\n  let p2: {x,y} = f p in\n  ... p2.x ... p2.y ...\n\nlet flipX_Y0 (p: {x}) = {x = -p.x, y = 0.0}\ndistMoved flipX_Y0 {x = 3.0, y = 4.0}`, steps: [
          { line: [5], frames: 'flipX_Y0: takes {x}; returns {x,y}', note: 'flipX_Y0 <b>needs less</b> from its argument: only x.' },
          { line: [2], frames: 'distMoved calls f p: gives it {x,y} | inside flipX_Y0: reads p.x ✓ (y is simply ignored)', note: 'Being handed more than you need is always fine.', out: 'sound: {x} -> T  <:  {x,y} -> T' },
          { line: [5], frames: 'rule: if TB <: TA then  TA -> T  <:  TB -> T | both together: if T3 <: T1 and T2 <: T4 then  T1 -> T2  <:  T3 -> T4', note: 'Argument types are <b>contravariant</b>: the function subtype goes the <b>opposite way</b> to the argument subtype. "A function may assume less than it needs to about its arguments."' }] },
      ],
    },
    'breakreturn': {
      title: 'return inside a block returns from the enclosing METHOD', framesLabel: 'What is running:',
      variants: [
        { label: 'return', code: `def first_even(xs)\n  xs.each { |x| return x if x.even? }\n  nil\nend\nfirst_even([3, 8, 5, 6])`, steps: [
          { line: [5, 2], frames: 'method first_even: xs=[3, 8, 5, 6] | each → block: x=3', note: '3 is odd: the block finishes normally and <code>each</code> moves on.' },
          { line: [2], frames: 'method first_even: xs=[3, 8, 5, 6] | each → block: *x=8', note: '8 is even, so the block executes <code>return x</code>. In a block, <code>return</code> does not just leave the block: it returns from the <b>method the block was written in</b> (first_even), abandoning <code>each</code> halfway.', out: '8' },
          { line: [3], frames: 'never reached: line 3 (nil), and elements 5 and 6', note: 'That is why the slides warn: use <code>next</code> to leave just the block (like "continue"), or <code>break</code> to stop the iterator.' }] },
        { label: 'next', code: `[3, 8, 5, 6].map { |x| next 0 if x.even?; x }`, steps: [
          { line: [1], frames: 'block: x=3', note: 'Odd: the block\'s value is its last expression, x.', out: 'block gives 3' },
          { line: [1], frames: 'block: *x=8', note: '<code>next 0</code> ends <b>this call of the block</b> with value 0. <code>map</code> carries on with the next element.', out: 'block gives 0' },
          { line: [1], frames: 'results so far: [3, 0, 5, 0]', note: 'All four elements are processed.', out: '[3, 0, 5, 0]' }] },
        { label: 'break', code: `[3, 8, 5, 6].each { |x| break x * 100 if x.even? }`, steps: [
          { line: [1], frames: 'block: x=3', note: 'Odd: nothing happens.' },
          { line: [1], frames: 'block: *x=8', note: '<code>break</code> stops the <b>iterator method</b> (each) immediately. The value given to break becomes the value of the whole <code>each</code> call. 5 and 6 are never visited.', out: '800' }] },
      ],
    },
  };

  // ---------- method-lookup tracer (driven by the real interpreter) ----------
  const DISPATCH = {
    polar: { label: 'PolarPoint', call: 'PolarPoint.new(4, 0).distFromOrigin2', note: 'distFromOrigin2 is found in Point, but the x and y it calls are found in PolarPoint: lookup always starts from the class of self.',
      code: `class Point\n  attr_accessor :x, :y\n  def initialize(x, y)\n    @x = x\n    @y = y\n  end\n  def distFromOrigin2\n    Math.sqrt(x * x + y * y)\n  end\nend\nclass PolarPoint < Point\n  def initialize(r, theta)\n    @r = r\n    @theta = theta\n  end\n  def x\n    @r * Math.cos(@theta)\n  end\n  def y\n    @r * Math.sin(@theta)\n  end\nend` },
    evenodd: { label: 'even/odd', call: 'B.new.odd(3)', note: 'B only overrides even, yet the behaviour of the INHERITED odd changes, because odd calls even on self. Try C.new.odd(3) too (C breaks odd).',
      code: `class A\n  def even x\n    if x == 0 then true else odd(x - 1) end\n  end\n  def odd x\n    if x == 0 then false else even(x - 1) end\n  end\nend\nclass B < A\n  def even x ; x % 2 == 0 end\nend\nclass C < A\n  def even x ; false end\nend` },
    superc: { label: 'super', call: 'C.new.m', note: 'Each super continues the search in the ancestors AFTER the class where the current method lives.',
      code: `class A\n  def m\n    "A"\n  end\nend\nclass B < A\n  def m\n    "B" + super\n  end\nend\nclass C < B\n  def m\n    "C" + super\n  end\nend` },
    mixin: { label: 'mixins', call: 'D.new.who', note: 'Order: the class itself, then its mixins (LAST included first), then the superclass, then the superclass\'s mixins. Try D.new.hello and D.new.only_m1.',
      code: `module M1\n  def who; "M1"; end\n  def only_m1; "from M1, self is a " + self.class.to_s; end\nend\nmodule M2\n  def who; "M2"; end\nend\nmodule M3\n  def hello; "hello from M3"; end\nend\nclass Base\n  include M3\n  def who; "Base"; end\nend\nclass D < Base\n  include M1\n  include M2\nend` },
    missing: { label: 'not found', call: 'Dog.new.fly', note: 'If no class in the chain defines the method, Ruby calls method_missing, which by default raises NoMethodError. Nothing is checked before the program runs.',
      code: `class Animal\n  def speak\n    "..."\n  end\nend\nclass Dog < Animal\n  def speak\n    "Woof"\n  end\nend` },
    comparable: { label: 'Comparable', call: 'House.new(10, 20) < House.new(100, 20)', note: 'House never defines <. It is found in the Comparable mixin, which calls <=> on self: and that IS defined in House.',
      code: `class House\n  include Comparable\n  attr_accessor :price, :sqft\n  def initialize(price, sqft)\n    @price = price\n    @sqft = sqft\n  end\n  def <=> other\n    price_comp = self.price <=> other.price\n    return price_comp if price_comp != 0\n    self.sqft <=> other.sqft\n  end\nend` },
  };
  function dispatchTracer(arg) {
    const keys = arg ? arg.split(',') : Object.keys(DISPATCH);
    let cur = DISPATCH[keys[0]];
    const ta = h('textarea', { class: 'code-edit', rows: 8, spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off', hidden: true });
    const pre = h('pre', { class: 'code small' });
    const callIn = h('input', { class: 'inp mono', spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' });
    const note = h('div', { class: 'small muted' });
    const listEl = h('div', { class: 'dsp-list' }), detail = h('div', { class: 'dsp-detail' }), result = h('div', { class: 'step-out mono' });
    const editBtn = h('button', { class: 'link small', onclick: () => { ta.hidden = !ta.hidden; pre.hidden = !ta.hidden; if (ta.hidden) { pre.innerHTML = highlight(ta.value); go(); } editBtn.textContent = ta.hidden ? '✎ edit the classes' : '✓ done editing'; } }, '✎ edit the classes');
    function load(d) { cur = d; ta.value = d.code; pre.innerHTML = highlight(d.code); callIn.value = d.call; note.textContent = d.note; go(); }
    function go() {
      listEl.innerHTML = ''; detail.innerHTML = ''; result.textContent = '';
      let skip = 0; R.run(ta.value, { trace: () => { skip++; } });
      const evs = []; const r = R.run(ta.value, { asks: [callIn.value], trace: (e) => { evs.push(e); } });
      const calls = evs.slice(skip).filter(e => e.k !== 'yield').slice(0, 60);
      result.textContent = r.error ? '✗ ' + r.error.replace(/^line \d+: /, '') : (r.output.trim().split('\n').pop() || '');
      result.className = 'step-out mono' + (r.error ? ' bad' : '');
      if (!calls.length) { listEl.append(h('div', { class: 'muted small' }, 'No calls to your own methods were made.')); return; }
      const base = Math.min(...calls.map(c => c.depth));
      calls.forEach((e, idx) => {
        const row = h('button', { class: 'dsp-row' + (e.found ? '' : ' bad'), style: `margin-left:${Math.min(8, e.depth - base) * 14}px`, onclick: () => show(e, row) },
          h('span', { class: 'mono' }, e.k === 'super' ? 'super' : e.recv + '.' + e.name + (e.args && e.args.length ? '(' + e.args.join(', ') + ')' : '')),
          h('span', { class: 'dsp-own' }, e.found ? '→ ' + e.owner + '#' + e.name : '→ not found'));
        listEl.append(row); if (idx === 0) setTimeout(() => show(e, row), 0);
      });
    }
    function show(e, row) {
      [...listEl.children].forEach(c => c.classList.remove('on')); row.classList.add('on');
      detail.innerHTML = '';
      if (e.k === 'super') {
        detail.append(h('div', { class: 'small' }, h('b', null, 'super'), ' inside ', h('span', { class: 'mono' }, e.from + '#' + e.name), ': keep searching the ancestors that come ', h('b', null, 'after ' + e.from), '. self is still ', h('span', { class: 'mono' }, e.recv), '.'),
          h('div', { class: 'chainbox ' + (e.found ? 'hit' : 'miss') }, e.found ? '✓ found in ' + e.owner : '✗ no superclass method'));
        return;
      }
      detail.append(h('div', { class: 'small' }, 'Receiver ', h('span', { class: 'mono b' }, e.recv), ' is an instance of ', h('b', null, e.cls), '. Search for ', h('span', { class: 'mono b' }, e.name), ' starts at ', h('b', null, e.cls), ' and walks up:'));
      const chain = h('div', { class: 'chain-col' });
      const searched = e.path.filter(p => !/class methods/.test(p));
      e.path.filter(p => /class methods/.test(p)).forEach((p, i, arr) => chain.append(h('div', { class: 'chainbox ' + (e.found && i === arr.length - 1 && !searched.length ? 'hit' : 'miss') }, (e.found && i === arr.length - 1 && !searched.length ? '✓ ' : '✗ ') + p)));
      if (searched.length || !e.found) e.ancestors.forEach((a) => {
        const i = searched.indexOf(a.name);
        const cls = i < 0 ? 'skip' : (e.found && i === searched.length - 1) ? 'hit' : 'miss';
        chain.append(h('div', { class: 'chainbox ' + cls }, (cls === 'hit' ? '✓ ' : cls === 'miss' ? '✗ ' : '· ') + a.name, a.mod ? h('span', { class: 'chain-tag' }, 'mixin') : null));
      });
      detail.append(chain, h('div', { class: 'small muted' }, e.found ? 'The body of ' + e.owner + '#' + e.name + ' now runs with self = ' + e.recv + '.' : 'Nothing found: method_missing raises NoMethodError.'));
    }
    const chips = keys.length > 1 ? h('div', { class: 'chips' }, keys.map(k => h('button', { class: 'chip', onclick: () => load(DISPATCH[k]) }, DISPATCH[k].label))) : null;
    setTimeout(() => load(cur), 0);
    return h('div', { class: 'widget' }, h('div', { class: 'w-title' }, '🔎 Method lookup tracer (runs the real code)'), chips, pre, ta, editBtn, note,
      h('div', { class: 'row' }, callIn, h('button', { class: 'btn small primary', onclick: go }, 'Trace')), result,
      h('div', { class: 'small muted' }, 'Every call to one of your methods, in order (indented = called from inside). Tap one:'), listEl, detail);
  }

  // ---------- iterator explorer: watch a block being called ----------
  function iterExplorer() {
    const presets = [
      ['each', '[4, 6, 8].each { |x| puts x + 1 }', 'each calls the block for its side effects and returns the ORIGINAL array.'],
      ['map', '[4, 8, 12].map { |x| x * 2 }', 'map (= collect) builds a NEW array from the block results.'],
      ['select', '[4, 8, 12, 16].select { |x| x > 7 }', 'select (= filter) keeps the elements for which the block is true.'],
      ['inject', '[4, 8, 12].inject(0) { |acc, elt| acc + elt }', 'inject is fold: acc starts at 0; each block result becomes the next acc.'],
      ['inject (no start)', '(1..5).inject { |acc, elt| acc * elt }', 'Without a start value the first element is the first acc, so the block runs one time fewer.'],
      ['any?', '[4, 8, 12].any? { |x| x > 7 }', 'any? stops as soon as one block result is true.'],
      ['all?', '[4, 8, 12].all? { |x| x > 7 }', 'all? stops as soon as one block result is false.'],
      ['count', '(3..9).count { |x| x * x < 50 }', 'count works on a Range too (duck typing): it only needs each.'],
      ['each on a hash', '{"OCaml" => 1, "Ruby" => 3}.each { |k, v| puts k + ": " + v.to_s }', 'A two-parameter block receives the key and the value.'],
      ['Array.new', 'Array.new(4) { |i| i * i }', 'The block is called with each index to produce the initial elements.'],
    ];
    const input = h('input', { class: 'inp mono', spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' });
    const note = h('div', { class: 'small muted' });
    const table = h('div', { class: 'iter-tbl' }), result = h('div', { class: 'step-out mono' });
    function go() {
      table.innerHTML = ''; const evs = [];
      const r = R.run('', { asks: [input.value], trace: (e) => { if (e.k === 'yield') evs.push(e); }, limit: 200000 });
      const top = evs.length ? Math.min(...evs.map(e => e.depth)) : 0;
      const rows = evs.filter(e => e.depth === top).slice(0, 30);
      if (rows.length) table.append(h('div', { class: 'iter-row head' }, h('span', null, 'call'), h('span', null, 'block arguments'), h('span', null, 'block result')));
      rows.forEach((e, i) => table.append(h('div', { class: 'iter-row' }, h('span', { class: 'muted' }, '#' + (i + 1)), h('span', { class: 'mono' }, e.args.join(', ') || '(none)'), h('span', { class: 'mono b' }, e.result))));
      const lines = r.output.trimEnd().split('\n'); const val = lines.pop();
      result.className = 'step-out mono' + (r.error ? ' bad' : '');
      result.textContent = r.error ? '✗ ' + r.error : 'whole expression ' + val + (lines.length && lines[0] !== '' ? '      (printed: ' + lines.join(' ⏎ ') + ')' : '');
    }
    const chips = h('div', { class: 'chips' }, presets.map(([n, c, t]) => h('button', { class: 'chip', onclick: () => { input.value = c; note.textContent = t; go(); } }, n)));
    input.value = presets[1][1]; note.textContent = presets[1][2]; setTimeout(go, 0);
    return h('div', { class: 'widget' }, h('div', { class: 'w-title' }, '🔁 Iterator explorer: every time the block is called'), chips,
      h('div', { class: 'row' }, input, h('button', { class: 'btn small primary', onclick: go }, 'Run')), note, table, result);
  }

  // ---------- the operations x variants grid ----------
  function gridWidget() {
    let mode = 'fp', extraOp = false, extraVar = false;
    const tbl = h('div', { class: 'gridwrap' }), msg = h('div', { class: 'step-note' });
    function draw() {
      const ops = ['eval', 'toString', 'hasZero'].concat(extraOp ? ['noNegConstants'] : []);
      const vars = ['Int', 'Add', 'Negate'].concat(extraVar ? ['Mult'] : []);
      let html = '<table class="grid-tbl ' + mode + '"><tr><th></th>' + ops.map((o, j) => `<th class="${mode === 'fp' ? 'unit u' + (j % 4) : ''}${o === 'noNegConstants' ? ' new' : ''}">${o}</th>`).join('') + '</tr>';
      vars.forEach((v, i) => {
        html += `<tr><th class="${mode === 'oop' ? 'unit u' + (i % 4) : ''}${v === 'Mult' ? ' new' : ''}">${v}</th>` + ops.map((o, j) => {
          const isNew = o === 'noNegConstants' || v === 'Mult';
          const editsOld = isNew && ((mode === 'fp' && v === 'Mult' && o !== 'noNegConstants') || (mode === 'oop' && o === 'noNegConstants' && v !== 'Mult'));
          return `<td class="u${(mode === 'fp' ? j : i) % 4}${isNew ? (editsOld ? ' edit' : ' add') : ''}">${isNew ? (editsOld ? '✎' : '＋') : '■'}</td>`;
        }).join('') + '</tr>';
      });
      tbl.innerHTML = html + '</table>';
      const unit = mode === 'fp' ? 'one <b>function per column</b> (operation), each with one <code>match</code> branch per variant' : 'one <b>class per row</b> (variant), each with one method per operation';
      let t = (mode === 'fp' ? 'Functional decomposition (OCaml/Racket): ' : 'Object-oriented decomposition (Ruby/Java): ') + unit + '.';
      if (extraOp) t += mode === 'fp' ? '<br>➕ <b>New operation</b>: just write one new function. <span class="good-t">No old code changes.</span>' : '<br>➕ <b>New operation</b>: add a method to <b>every existing class</b>. <span class="bad-t">Old code is edited (✎).</span>';
      if (extraVar) t += mode === 'fp' ? '<br>➕ <b>New variant</b>: add a branch to <b>every existing function</b>. <span class="bad-t">Old code is edited (✎).</span>' : '<br>➕ <b>New variant</b>: just write one new class. <span class="good-t">No old code changes.</span>';
      if (!extraOp && !extraVar) t += '<br>Every cell must be filled in either way. The only difference is how the cells are <b>grouped</b>. Now add something:';
      msg.innerHTML = t;
    }
    const seg = h('div', { class: 'seg' }, [['fp', 'Functions (by column)'], ['oop', 'Classes (by row)']].map(([m, l], i) => h('button', { class: 'seg-b' + (i === 0 ? ' on' : ''), onclick: (e) => { mode = m; [...seg.children].forEach(c => c.classList.remove('on')); e.target.classList.add('on'); draw(); } }, l)));
    const b1 = h('button', { class: 'btn small', onclick: () => { extraOp = !extraOp; b1.classList.toggle('primary', extraOp); draw(); } }, '+ operation noNegConstants');
    const b2 = h('button', { class: 'btn small', onclick: () => { extraVar = !extraVar; b2.classList.toggle('primary', extraVar); draw(); } }, '+ variant Mult');
    draw();
    return h('div', { class: 'widget' }, h('div', { class: 'w-title' }, '▦ The same grid, cut two ways'), seg, tbl, h('div', { class: 'row' }, b1, b2), msg,
      h('div', { class: 'small muted' }, '＋ = new code in a new place · ✎ = an existing function/class has to be opened and changed'));
  }

  // ---------- double dispatch explorer ----------
  function ddExplorer() {
    const kinds = [['Int', 'Int.new(3)', 'Int'], ['MyString', 'MyString.new("x")', 'String'], ['MyRational', 'MyRational.new(1, 2)', 'Rational']];
    let L = 0, Rr = 1;
    const grid = h('div', { class: 'gridwrap' }), trace = h('div', { class: 'dsp-list' }), result = h('div', { class: 'step-out mono' });
    function draw() {
      let html = '<table class="grid-tbl dd"><tr><th>left ╲ right</th>' + kinds.map(k => `<th>${k[0]}</th>`).join('') + '</tr>';
      kinds.forEach((a, i) => { html += `<tr><th>${a[0]}</th>` + kinds.map((b, j) => `<td class="${i === L && j === Rr ? 'sel' : ''}" data-l="${i}" data-r="${j}">${b[0]}#add${a[2]}</td>`).join('') + '</tr>'; });
      grid.innerHTML = html + '</table>';
      const evs = []; const src = window.PRELUDES.dd;
      let skip = 0; R.run(src, { trace: () => skip++ });
      const r = R.run(src, { asks: [`Add.new(${kinds[L][1]}, ${kinds[Rr][1]}).eval.toString`], trace: e => evs.push(e) });
      trace.innerHTML = '';
      const steps = evs.slice(skip).filter(e => e.k === 'call' && /^add/.test(e.name));
      steps.forEach((e, i) => trace.append(h('div', { class: 'dsp-row on' }, h('span', { class: 'mono' }, (i === 0 ? '1st dispatch: ' : '2nd dispatch: ') + e.recv + '.' + e.name + '(' + e.args.join(', ') + ')'), h('span', { class: 'dsp-own' }, '→ ' + e.owner + '#' + e.name + (i === 0 ? '   (now we know the LEFT value is a ' + e.owner + ')' : '   (now we know BOTH)')))));
      result.textContent = r.error ? '✗ ' + r.error : 'result: ' + r.output.trim();
    }
    grid.addEventListener('click', (e) => { const td = e.target.closest('td'); if (td) { L = +td.dataset.l; Rr = +td.dataset.r; draw(); } });
    setTimeout(draw, 0);
    return h('div', { class: 'widget' }, h('div', { class: 'w-title' }, '⇉ Double dispatch: tap a cell (9 cases, 9 methods, no is_a?)'), grid,
      h('div', { class: 'small muted' }, 'Each cell names the method that finally does the work: it lives in the class of the RIGHT value and is named after the LEFT value.'), trace, result);
  }

  // ---------- subtype checker ----------
  function subtypeChecker() {
    const presets = [
      ['width', '{x: int, y: int, color: string}', '{x: int, y: int}'],
      ['permutation', '{x: int, y: int}', '{y: int, x: int}'],
      ['depth ✗', '{center: {x: int, y: int, z: int}, r: int}', '{center: {x: int, y: int}, r: int}'],
      ['fewer fields ✗', '{x: int}', '{x: int, y: int}'],
      ['result (covariant)', 'int -> {x: int, y: int}', 'int -> {x: int}'],
      ['argument (contravariant)', '{x: int} -> int', '{x: int, y: int} -> int'],
      ['argument ✗', '{x: int, y: int} -> int', '{x: int} -> int'],
      ['both at once', '{x: int} -> {x: int, y: int, c: string}', '{x: int, y: int} -> {x: int, y: int}'],
      ['function as argument', '({x: int} -> int) -> int', '({x: int, y: int} -> int) -> int'],
    ];
    const a = h('input', { class: 'inp mono', spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' });
    const b = h('input', { class: 'inp mono', spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' });
    const depth = h('input', { type: 'checkbox' }), imm = h('input', { type: 'checkbox' });
    const outEl = h('div');
    const tree = (r) => h('div', { class: 'st-node ' + (r.ok ? 'ok' : 'no') }, h('div', null, (r.ok ? '✓ ' : '✗ ') + r.why), r.kids.map(tree));
    function go() {
      outEl.innerHTML = '';
      try {
        const ta = ST.parseType(a.value), tb = ST.parseType(b.value), opts = { depth: depth.checked, immutable: imm.checked };
        const r = ST.check(ta, tb, opts), rev = ST.check(tb, ta, opts);
        outEl.append(h('div', { class: 'step-out mono' + (r.ok ? '' : ' bad') }, (r.ok ? 'YES: ' : 'NO: ') + 'T1 ' + (r.ok ? '<:' : 'is not a subtype of') + ' T2'), tree(r),
          h('div', { class: 'small muted' }, 'The other way round, T2 <: T1? ' + (rev.ok ? 'Yes.' : 'No.') + (r.ok && rev.ok ? ' (So each is both a subtype and a supertype of the other.)' : !r.ok && !rev.ok ? ' (So: neither.)' : '')),
          depth.checked && !imm.checked ? h('div', { class: 'callout trap' }, '⚠️ You switched on depth subtyping while fields are mutable. The checker now says yes to things that can crash at run time: it is unsound.') : '');
      } catch (e) { outEl.append(h('pre', { class: 'out-err' }, e.message)); }
    }
    const chips = h('div', { class: 'chips' }, presets.map(([n, x, y]) => h('button', { class: 'chip', onclick: () => { a.value = x; b.value = y; go(); } }, n)));
    [a, b].forEach(el => el.addEventListener('input', go)); [depth, imm].forEach(el => el.addEventListener('change', go));
    a.value = presets[0][1]; b.value = presets[0][2]; setTimeout(go, 0);
    return h('div', { class: 'widget' }, h('div', { class: 'w-title' }, '≤ Subtype checker: is T1 <: T2 ?'), chips,
      h('label', { class: 'small b' }, 'T1 (the candidate subtype)'), a, h('label', { class: 'small b' }, 'T2 (the candidate supertype)'), b,
      h('div', { class: 'row small' }, h('label', null, depth, ' allow depth subtyping'), h('label', null, imm, ' fields are immutable')), outEl,
      h('div', { class: 'small muted' }, 'Syntax: int, string, {f: T, g: T}, T1 -> T2, parentheses. Rules used: width, permutation, reflexivity, and for functions contravariant arguments + covariant results.'));
  }

  // ---------- variance picker ----------
  function variancePicker() {
    let arg = 1, res = 1;
    const argT = ['{x: int}', '{x: int, y: int}', '{x: int, y: int, c: int}'], resT = ['{x: int}', '{x: int, y: int}', '{x: int, y: int, c: int}'];
    const outEl = h('div');
    const mk = (label, get, set, names) => { const seg = h('div', { class: 'seg' }, names.map((n, i) => h('button', { class: 'seg-b' + (i === get() ? ' on' : ''), onclick: (e) => { set(i); [...seg.children].forEach(c => c.classList.remove('on')); e.target.classList.add('on'); draw(); } }, n))); return h('div', null, h('div', { class: 'small b' }, label), seg); };
    function draw() {
      const f = argT[arg] + ' -> ' + resT[res], want = '{x: int, y: int} -> {x: int, y: int}';
      const r = ST.check(ST.parseType(f), ST.parseType(want));
      outEl.innerHTML = '';
      outEl.append(h('pre', { class: 'code small', html: highlight('expected:  ' + want + '\nyou pass:  ' + f) }),
        h('div', { class: 'step-out mono' + (r.ok ? '' : ' bad') }, r.ok ? '✓ safe: your function type is a subtype of the expected one' : '✗ unsound: not a subtype'),
        h('div', { class: 'step-note' }, r.why));
    }
    draw();
    return h('div', { class: 'widget' }, h('div', { class: 'w-title' }, '⇄ Which functions can you pass where a {x,y} -> {x,y} is expected?'),
      mk('Your function\'s ARGUMENT needs…', () => arg, (i) => { arg = i; }, ['less: {x}', 'same: {x,y}', 'more: {x,y,c}']),
      mk('Your function\'s RESULT has…', () => res, (i) => { res = i; }, ['less: {x}', 'same: {x,y}', 'more: {x,y,c}']), outEl);
  }

  // ---------- sorting games ----------
  const SORTERS = {
    fpoop: { title: 'FP or OOP: which makes this easy?', buckets: ['Functions (FP)', 'Classes (OOP)'], items: [
      ['Adding a new operation (e.g. noNegConstants) without touching old code', 0, 'A new operation is one new function with a branch per variant.'],
      ['Adding a new variant (e.g. Mult) without touching old code', 1, 'A new variant is one new class with a method per operation.'],
      ['The code is organised by columns of the grid', 0, 'One function per operation = one column.'],
      ['The code is organised by rows of the grid', 1, 'One class per variant = one row.'],
      ['An operation that depends on the variants of TWO arguments (add Int/String/Rational) is straightforward', 0, 'Pattern-match on the pair. OOP needs double dispatch.'],
      ['A default for several variants is written once in a superclass method', 1, 'FP would use a wildcard pattern for the same effect.'],
      ['Forgetting a case is reported by the OCaml typechecker (if no wildcards were used)', 0, 'Non-exhaustive match warning gives a to-do list.'],
      ['The Visitor pattern is needed to add operations "on the side"', 1, 'Visitor is how OOP plans ahead for new operations.'],
    ] },
    blockproc: { title: 'Block or Proc (lambda)?', buckets: ['Block', 'Proc / lambda'], items: [
      ['Can be stored in a variable or an array', 1, 'Procs are objects (first-class). Blocks are not.'],
      ['Called with yield', 0, 'yield calls the block passed to the current method.'],
      ['Called with .call', 1, 'A Proc is an instance of class Proc; its method is call.'],
      ['Every method can be passed zero or one of these, next to its arguments', 0, 'At most one block per call.'],
      ['Can be returned from a method as a value', 1, 'First-class values can be returned.'],
      ['Second-class: all you can do is yield to it', 0, 'That is what "second-class" means.'],
      ['Needed for an array of closures or a stored callback', 1, 'a.map { |x| lambda { |y| x >= y } }'],
      ['The most common kind of closure in Ruby code', 0, 'Blocks cover most uses and are a little more convenient.'],
    ] },
    mixiface: { title: 'Multiple inheritance, mixin or interface?', buckets: ['Multiple inheritance', 'Mixin (Ruby module)', 'Interface (Java, classic)'], items: [
      ['A class may have more than one superclass', 0, 'C++ allows this. Ruby and Java do not.'],
      ['Just a collection of methods; cannot be instantiated; a class can include any number', 1, 'A mixin is less than a class.'],
      ['Contains only method signatures (types), no method bodies', 2, 'Before Java 8, an interface was only a type.'],
      ['Needs rules for diamonds: two copies of the inherited fields, or one?', 0, 'The classic problem; C++ has two forms of inheritance for it.'],
      ['Its methods can call methods on self that it does not define itself (e.g. <=> or each)', 1, 'This is what makes Comparable and Enumerable work.'],
      ['Exists to make a static type system more flexible; of little use in a dynamically typed language', 2, 'Ruby has no types to satisfy, so no interfaces.'],
      ['Comparable and Enumerable are the two famous examples', 1, 'Define <=> or each, get many methods for free.'],
      ['A language that has this (plus abstract methods) does not need interfaces', 0, 'In C++, an "interface" is just a class with only abstract methods.'],
    ] },
    variance: { title: 'Sound or unsound subtyping rule?', buckets: ['Sound', 'Unsound'], items: [
      ['Width: a subtype may have extra fields', 0, 'Code using the supertype never looks at them.'],
      ['Permutation: field order does not matter', 0, 'Fields are found by name.'],
      ['Depth on mutable fields: a field may have a more specific type', 1, 'Someone can store a less specific value through the supertype view.'],
      ['Depth on immutable fields', 0, 'No setter, no problem.'],
      ['Function results are covariant', 0, 'Returning more than promised is harmless.'],
      ['Function arguments are covariant', 1, 'The function might use a field its caller did not provide.'],
      ['Function arguments are contravariant', 0, 'Needing less than you are given is harmless.'],
      ['Java: ColorPoint[] is a subtype of Point[]', 1, 'Statically unsound; Java patches it with a run-time check on every array store.'],
      ['null can have any object type (Java)', 1, 'e.m() can fail at run time with a null pointer error.'],
    ] },
    statdyn: { title: 'Static overloading, multimethods or neither?', buckets: ['Static overloading (Java/C++)', 'Multimethods (Julia)', 'Ruby'], items: [
      ['Several methods may share a name; the one called is chosen at COMPILE time from the static types of the arguments', 0, 'Only the receiver is dispatched on at run time.'],
      ['Several methods may share a name; the one called is chosen at RUN time from the classes of ALL arguments', 1, 'Also called multiple dispatch.'],
      ['A second method with the same name in the same class simply replaces the first', 2, 'Same name always means overriding/replacing.'],
      ['Upcasting an argument to its base type changes which method is chosen', 0, 'The C++ race(Animal, Animal) example: "run???".'],
      ['Manual double dispatch is unnecessary', 1, 'The language already does it.'],
      ['Needs manual double dispatch to choose code by the class of two objects in an OOP style', 2, 'Java/C++ need it too.'],
    ] },
  };
  function sorter(name) {
    const def = SORTERS[name]; if (!def) return h('div', null, 'missing sorter ' + name);
    let order = [], k = 0, score = 0;
    const card = h('div', { class: 'claim' }), fb = h('div', { class: 'step-note' }), prog = h('div', { class: 'small muted' });
    const btns = h('div', { class: 'row' }, def.buckets.map((b, i) => h('button', { class: 'btn small', onclick: () => ans(i) }, b)));
    function start() { order = def.items.map((_, i) => i).sort(() => Math.random() - 0.5); k = 0; score = 0; fb.innerHTML = 'Tap the bucket each statement belongs to.'; show(); }
    function show() {
      if (k >= order.length) { card.textContent = `Done: ${score} / ${order.length} first time.`; prog.textContent = ''; btns.hidden = true; again.hidden = false; return; }
      btns.hidden = false; again.hidden = true; card.textContent = def.items[order[k]][0]; prog.textContent = `${k + 1} / ${order.length}`;
    }
    function ans(i) {
      const it = def.items[order[k]]; const ok = i === it[1]; if (ok) score++;
      fb.innerHTML = (ok ? '<span class="good-t">✓ ' : '<span class="bad-t">✗ It is: ') + esc(def.buckets[it[1]]) + '.</span> ' + esc(it[2]);
      k++; show();
    }
    const again = h('button', { class: 'btn small', hidden: true, onclick: start }, '↺ Again');
    start();
    return h('div', { class: 'widget' }, h('div', { class: 'w-title' }, '🗂 ' + def.title), prog, card, btns, again, fb);
  }

  window.Viz = { h, esc, highlight, codeBlock, STEPS,
    widgets: {
      stepper: (name) => STEPS[name] ? stepper(STEPS[name]) : h('div', null, 'missing stepper ' + name),
      dispatch: dispatchTracer, iter: iterExplorer, grid: gridWidget, dd: ddExplorer, subtype: subtypeChecker, variance: variancePicker, sorter,
    } };
})();

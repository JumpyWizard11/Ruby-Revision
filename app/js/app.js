// app.js: navigation, lessons, practice engine, map, playground, flash cards. Works fully offline.
(function () {
  'use strict';
  const { h, highlight, codeBlock } = window.Viz;
  const R = window.Ruby;
  const TOPICS = window.TOPICS, QUESTIONS = window.QUESTIONS, PRELUDES = window.PRELUDES;
  const topicById = Object.fromEntries(TOPICS.map(t => [t.id, t]));
  const qById = Object.fromEntries(QUESTIONS.map(q => [q.id, q]));
  const main = document.getElementById('main');

  // ---------- storage (works even if localStorage is blocked) ----------
  const mem = {};
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return mem[k] ?? d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { mem[k] = v; } },
  };
  const P = store.get('rbr.progress', { q: {}, read: {}, known: {} });
  const save = () => store.set('rbr.progress', P);
  function record(id, ok) { const r = P.q[id] || { n: 0 }; r.n++; r.ok = ok; r.t = Date.now(); P.q[id] = r; save(); }
  const topicQs = (tid) => QUESTIONS.filter(q => q.topic === tid);
  const statsFor = (qs) => ({ total: qs.length, tried: qs.filter(q => P.q[q.id]).length, ok: qs.filter(q => P.q[q.id] && P.q[q.id].ok).length });

  // ---------- helpers ----------
  const preludeOf = (q) => [].concat(q.prelude || []).map(k => PRELUDES[k]).join('\n');
  const pct = (a, b) => (b ? Math.round(100 * a / b) : 0);
  function bar(value, cls = '') { return h('div', { class: 'pbar ' + cls }, h('div', { style: `width:${value}%` })); }
  // Lenient matching: ignore spacing, quote style, case, and old-vs-new hash printing ({:a=>1} vs {a: 1}).
  const normAns = (s) => R.cleanSource(String(s)).trim().replace(/\s+/g, '').replace(/'/g, '"').replace(/:(\w+)=>/g, '$1:').replace(/^=>/, '').toLowerCase();
  const unq = (s) => s.replace(/^"(.*)"$/, '$1');
  function answerMatches(input, part) {
    const u = normAns(input); if (!u) return false;
    if (part.a === 'error') return /err|fail|exception|undefined|nomethod|raise|crash/.test(u);
    if (part.nonterm) return /loop|infinite|never|forever|terminat|hang|stack|doesn.?tend|doesnotend/.test(u);
    const accepted = [part.a, ...(part.alt || [])];
    for (const a of accepted) {
      const e = normAns(a);
      if (u === e || unq(u) === unq(e)) return true;
      if (part.set) { const set = (x) => x.replace(/[\[\]{}()]/g, '').split(/[,;]|and/).filter(Boolean).sort().join(','); if (set(u) === set(e) || (/^(none|nothing|no|-|∅)/.test(u) && e === 'none')) return true; }
    }
    return false;
  }
  function srcBadge(q) { return q.src ? h('span', { class: 'src' + (/final|midterm/i.test(q.src) ? ' exam' : '') }, q.src) : null; }
  function mdInline(s) { // `code` and **bold** in prompts
    return Viz.esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  }

  // ---------- question renderer ----------
  function renderQuestion(q, opts = {}) {
    const card = h('div', { class: 'qcard' + (opts.inline ? ' inline' : '') });
    const head = h('div', { class: 'qhead' }, h('span', { class: 'qtype t-' + q.type }, q.tag === 'rewrite' ? 'Rewrite / fix' : { predict: 'Predict', mcq: 'Choose', write: 'Write code', explain: 'Explain' }[q.type]), srcBadge(q),
      P.q[q.id] ? h('span', { class: 'qprev ' + (P.q[q.id].ok ? 'ok' : 'bad') }, P.q[q.id].ok ? '✓ done before' : '✗ missed before') : null);
    card.append(head, h('div', { class: 'qtext', html: mdInline(q.q) }));
    const pre = preludeOf(q);
    if (pre && q.type !== 'write') {
      const box = h('pre', { class: 'code small', hidden: true, html: highlight(pre) });
      card.append(h('button', { class: 'link small', onclick: () => { box.hidden = !box.hidden; } }, '⊕ show helper definitions'), box);
    }
    if (q.code && q.code.trim()) card.append(h('pre', { class: 'code', html: highlight(q.code) }));
    const fb = h('div', { class: 'qfb' });
    const done = (ok) => { record(q.id, ok); if (opts.onAnswer) opts.onAnswer(ok); };
    const explainEl = () => q.explain ? h('div', { class: 'explain', html: '💡 ' + mdInline(q.explain) }) : null;

    if (q.type === 'mcq') {
      const opts_ = h('div', { class: 'opts' });
      // options are shown in a random order each time, so position is never a clue
      const order = q.options.length > 2 ? shuffle(q.options.map((_, i) => i)) : q.options.map((_, i) => i);
      order.forEach((i, pos) => { const o = q.options[i]; opts_.append(h('button', { class: 'opt', onclick: (e) => {
        if (opts_.dataset.done) return; opts_.dataset.done = '1';
        const ok = i === q.answer;
        [...opts_.children].forEach((b, j) => { if (order[j] === q.answer) b.classList.add('right'); else if (order[j] === i) b.classList.add('wrong'); b.disabled = true; });
        fb.innerHTML = ''; fb.append(h('div', { class: ok ? 'good-t' : 'bad-t' }, ok ? '✅ Correct' : '❌ Not quite'), explainEl());
        done(ok);
      } }, h('span', { class: 'optl' }, String.fromCharCode(65 + pos)), h('span', { html: mdInline(o) }))); });
      card.append(opts_, fb);
    }

    if (q.type === 'predict') {
      const rows = q.parts.map((p) => {
        const inp = h('input', { class: 'inp mono', placeholder: p.set ? 'e.g. t1, t3 (or none)' : (p.ph || 'value, error, or loops forever'), spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off', autocomplete: 'off' });
        const res = h('div', { class: 'pres' });
        const row = h('div', { class: 'prow' }, h('div', { class: 'pask', html: highlight(p.ask) }), h('div', { class: 'parrow' }, '⇒'), inp, res);
        return { p, inp, res, row };
      });
      const tbl = h('div', { class: 'parts' }, rows.map(r => r.row));
      const runOut = h('div', { class: 'run-out', hidden: true });
      const check = h('button', { class: 'btn primary', onclick: () => {
        let all = true;
        rows.forEach(({ p, inp, res, row }) => {
          const ok = answerMatches(inp.value, p); all = all && ok;
          row.classList.toggle('right', ok); row.classList.toggle('wrong', !ok);
          res.innerHTML = '';
          res.append(h('span', { class: ok ? 'good-t' : 'bad-t' }, ok ? '✓ ' : '✗ '), h('span', { class: 'mono ans' }, p.a === 'error' ? 'error' + (p.err ? ` (${p.err}…)` : '') : p.nonterm ? 'loops forever (never terminates)' : p.a), p.why ? h('div', { class: 'small muted', html: mdInline(p.why) }) : '');
        });
        fb.innerHTML = '';
        fb.append(h('div', { class: all ? 'good-t' : 'bad-t' }, all ? '✅ All correct!' : '❌ Some answers differ. Compare above' + (q.norun ? '.' : ', then run it to see exactly what Ruby prints.')), explainEl());
        if (!all) fb.append(h('button', { class: 'link small', onclick: (e) => { record(q.id, true); e.target.replaceWith(h('span', { class: 'small muted' }, 'Marked as correct.')); if (opts.onAnswer) opts.onAnswer(true); } }, 'I was actually right (typo/format): mark correct'));
        done(all);
      } }, 'Check');
      const runBtn = q.norun ? null : h('button', { class: 'btn', onclick: () => {
        runOut.hidden = false; runOut.innerHTML = '';
        const groups = q.independent ? q.parts.map(p => [p]) : [q.parts];
        groups.forEach(parts => {
          const nonterm = parts.some(p => p.nonterm);
          const r = R.run(pre + '\n' + (q.code || ''), { asks: parts.filter(p => !p.out).map(p => p.ask), limit: nonterm ? 400000 : 3000000 });
          if (q.independent) runOut.append(h('div', { class: 'small mono muted' }, '> ' + parts[0].ask));
          if (r.output) runOut.append(h('pre', { class: 'out-text' }, r.output));
          if (r.error) runOut.append(h('pre', { class: 'out-err' }, r.error));
          if (!r.output && !r.error) runOut.append(h('div', { class: 'muted small' }, '(no output)'));
        });
      } }, '▶ Run it');
      card.append(tbl, h('div', { class: 'qactions' }, check, runBtn), runOut, fb);
    }

    if (q.type === 'write') {
      const ta = h('textarea', { class: 'code-edit', spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off', autocomplete: 'off', rows: Math.max(4, (q.starter || '').split('\n').length + 2) });
      const key = 'rbr.draft.' + q.id; ta.value = store.get(key, q.starter || '');
      ta.addEventListener('input', () => store.set(key, ta.value));
      const results = h('div', { class: 'tests' });
      if (q.template) {
        const tpl = h('pre', { class: 'code small', hidden: true, html: highlight(q.template.replace('<<ANSWER>>', '# <<< YOUR CODE GOES HERE >>>')) });
        card.append(h('button', { class: 'link small', onclick: () => { tpl.hidden = !tpl.hidden; } }, '⊕ show the full program your code is inserted into'), tpl);
      } else if (pre) {
        const box = h('pre', { class: 'code small', hidden: true, html: highlight(pre) });
        card.append(h('button', { class: 'link small', onclick: () => { box.hidden = !box.hidden; } }, '⊕ show helper definitions (already loaded)'), box);
      }
      const runTests = h('button', { class: 'btn primary', onclick: () => {
        results.innerHTML = ''; let all = true;
        const mine = ta.value.replace(/#(?!\{).*$/gm, '');
        (q.require || []).forEach(([re, msg]) => { if (!new RegExp(re).test(mine)) { all = false; results.append(h('div', { class: 'test fail' }, h('div', { class: 'small' }, '✗ Style: ' + msg))); } });
        (q.forbid || []).forEach(([re, msg]) => { if (new RegExp(re).test(mine)) { all = false; results.append(h('div', { class: 'test fail' }, h('div', { class: 'small' }, '✗ Style: ' + msg))); } });
        const body = q.template ? q.template.replace('<<ANSWER>>', ta.value) : pre + '\n' + ta.value;
        q.tests.forEach(t => {
          const r = R.run(body + '\n' + t.run);
          const got = r.error ? 'error: ' + r.error.split('\n')[0] : r.output.trim();
          const ok = !r.error && got === t.expect; all = all && ok;
          results.append(h('div', { class: 'test ' + (ok ? 'pass' : 'fail') }, h('div', { class: 'mono small' }, (ok ? '✓ ' : '✗ ') + t.run), ok ? null : h('div', { class: 'mono small' }, 'expected: ' + t.expect), ok ? null : h('div', { class: 'mono small' }, 'got: ' + got)));
        });
        fb.innerHTML = ''; fb.append(h('div', { class: all ? 'good-t' : 'bad-t' }, all ? '✅ All tests pass!' : '❌ Some tests fail.'));
        if (all) fb.append(explainEl());
        done(all);
      } }, '▶ Run tests');
      const showAns = h('button', { class: 'btn', onclick: () => {
        fb.innerHTML = ''; fb.append(h('div', { class: 'small b' }, 'Model answer:'), h('pre', { class: 'code', html: highlight(q.answer) }), explainEl());
        if (!P.q[q.id]) record(q.id, false);
      } }, 'Show answer');
      const hintEl = h('div', { class: 'explain', hidden: true, html: '🔎 ' + mdInline(q.hint || '') });
      const hintBtn = q.hint ? h('button', { class: 'btn', onclick: () => { hintEl.hidden = !hintEl.hidden; } }, 'Hint') : null;
      card.append(ta, h('div', { class: 'qactions' }, runTests, hintBtn, showAns, h('button', { class: 'btn ghost small', onclick: () => { ta.value = q.starter || ''; store.set(key, ta.value); } }, 'Reset')), hintEl, results, fb);
    }

    if (q.type === 'explain') {
      const ta = h('textarea', { class: 'notes', rows: 3, placeholder: 'Write your answer first (optional), then reveal.' });
      const reveal = h('button', { class: 'btn primary', onclick: () => {
        reveal.remove();
        fb.append(h('div', { class: 'model' }, h('div', { class: 'small b' }, 'Model answer'), h('div', { html: mdInline(q.answer) })), explainEl(),
          h('div', { class: 'qactions' }, h('button', { class: 'btn good', onclick: (e) => { done(true); e.target.parentNode.replaceWith(h('div', { class: 'good-t small' }, 'Marked as got it ✓')); } }, '✓ I got it'),
            h('button', { class: 'btn bad', onclick: (e) => { done(false); e.target.parentNode.replaceWith(h('div', { class: 'bad-t small' }, 'Marked for review')); } }, '✗ Not yet')));
      } }, 'Reveal answer');
      card.append(ta, h('div', { class: 'qactions' }, reveal), fb);
    }
    return card;
  }

  // ---------- views ----------
  function setActiveTab(name) { document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === name)); }
  function header(title, back) {
    return h('div', { class: 'vhead' }, back ? h('a', { class: 'back', href: back }, '‹') : null, h('h1', null, title));
  }

  function viewHome() {
    setActiveTab('learn');
    const all = statsFor(QUESTIONS);
    const readCount = Object.keys(P.read).length, secTotal = TOPICS.reduce((a, t) => a + t.sections.length, 0);
    const standalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    const wrap = h('div', { class: 'view' },
      h('div', { class: 'hero' }, h('div', { class: 'hero-t' }, 'Ruby Revision'), h('div', { class: 'hero-s' }, 'CSC 330 · Ruby, OOP & subtyping · works offline'),
        h('div', { class: 'hero-stats' },
          h('div', null, h('b', null, `${readCount}/${secTotal}`), h('span', null, 'sections understood')),
          h('div', null, h('b', null, `${all.ok}/${all.total}`), h('span', null, 'questions correct')),
          h('div', null, h('b', null, `${pct(all.ok, all.tried)}%`), h('span', null, 'accuracy')))),
      !standalone ? h('div', { class: 'install' }, '📲 To use this offline: open this page in ', h('b', null, 'Safari'), ', tap ', h('b', null, 'Share'), ' → ', h('b', null, 'Add to Home Screen'), ', then open it once from the home screen while you still have signal.') : null,
      h('div', { class: 'quick' },
        h('a', { class: 'qbtn', href: '#/quiz?mode=smart' }, '🧠', h('span', null, 'Smart review')),
        h('a', { class: 'qbtn', href: '#/tips' }, '🧭', h('span', null, 'Exam tips')),
        h('a', { class: 'qbtn', href: '#/map' }, '🕸', h('span', null, 'Connections')),
        h('a', { class: 'qbtn', href: '#/quiz?mode=rewrite' }, '🛠', h('span', null, 'Rewrite & fix'))),
      h('h2', { class: 'sec-t' }, 'Topics (in lecture order)'),
      TOPICS.map((t, i) => {
        const s = statsFor(topicQs(t.id)); const rd = t.sections.filter(x => P.read[t.id + '/' + x.id]).length;
        return h('a', { class: 'tcard', href: '#/learn/' + t.id },
          h('div', { class: 'ticon c' + i }, t.icon),
          h('div', { class: 'tbody' }, h('div', { class: 'tt' }, t.title), h('div', { class: 'tb small muted' }, t.blurb),
            h('div', { class: 'tprog small' }, h('span', null, `📖 ${rd}/${t.sections.length}`), bar(pct(rd, t.sections.length), 'read'), h('span', null, `✅ ${s.ok}/${s.total}`), bar(pct(s.ok, s.total)))));
      }),
      h('div', { class: 'foot small muted' }, 'Slides: Ruby folder (ruby1 to ruby7) · ', h('a', { href: '#/about' }, 'about this app')));
    return wrap;
  }

  function hydrate(container, topicId) {
    container.querySelectorAll('pre[data-run]').forEach(pre => {
      const code = pre.textContent.replace(/^\n/, '');
      const preludeKey = pre.dataset.prelude;
      pre.replaceWith(codeBlock(code, { echo: pre.hasAttribute('data-echo'), prelude: preludeKey ? PRELUDES[preludeKey] : '' }));
    });
    container.querySelectorAll('[data-widget]').forEach(div => {
      const [name, arg] = div.dataset.widget.split(':');
      const fn = window.Viz.widgets[name];
      div.replaceWith(fn ? fn(arg) : h('div', null, 'missing widget ' + name));
    });
    container.querySelectorAll('[data-quiz]').forEach(div => {
      const q = qById[div.dataset.quiz];
      div.replaceWith(q ? h('div', { class: 'checkq' }, h('div', { class: 'checkq-l small' }, '✏️ Check yourself'), renderQuestion(q, { inline: true })) : h('div'));
    });
    container.querySelectorAll('a[data-map]').forEach(a => { a.href = '#/map/' + a.dataset.map; a.classList.add('maplink'); });
  }

  function viewTopic(tid, secId) {
    setActiveTab('learn');
    const t = topicById[tid]; if (!t) return viewHome();
    const idx = TOPICS.indexOf(t);
    const wrap = h('div', { class: 'view' }, header(t.icon + ' ' + t.title, '#/'),
      h('div', { class: 'small muted slides-ref' }, '📄 Slides: ', h('span', { class: 'mono' }, t.slides), ' · ', h('a', { href: '#/quiz?topic=' + t.id }, `Practise this topic (${topicQs(t.id).length} questions) →`)));
    t.sections.forEach((s, i) => {
      const key = t.id + '/' + s.id;
      const body = h('div', { class: 'sbody' });
      let built = false;
      const markBtn = h('button', { class: 'btn small ' + (P.read[key] ? 'good' : ''), onclick: () => { P.read[key] = !P.read[key]; if (!P.read[key]) delete P.read[key]; save(); markBtn.className = 'btn small ' + (P.read[key] ? 'good' : ''); markBtn.textContent = P.read[key] ? '✓ Understood' : 'Mark as understood'; chk.textContent = P.read[key] ? '✓' : String(i + 1); chk.classList.toggle('done', !!P.read[key]); } }, P.read[key] ? '✓ Understood' : 'Mark as understood');
      const chk = h('span', { class: 'snum' + (P.read[key] ? ' done' : '') }, P.read[key] ? '✓' : String(i + 1));
      const sec = h('section', { class: 'lsec', id: 'sec-' + s.id });
      const toggle = () => {
        const open = sec.classList.toggle('open');
        if (open && !built) { built = true; body.innerHTML = s.body; hydrate(body, t.id); body.append(h('div', { class: 'sfoot' }, markBtn)); }
      };
      sec.append(h('button', { class: 'shead', onclick: toggle }, chk, h('span', { class: 'stitle' }, s.title), h('span', { class: 'chev' }, '›')), body);
      wrap.append(sec);
      if ((secId && s.id === secId) || (!secId && i === 0)) setTimeout(() => { toggle(); if (secId) sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 0);
    });
    const nav = h('div', { class: 'tnav' },
      idx > 0 ? h('a', { class: 'btn', href: '#/learn/' + TOPICS[idx - 1].id }, '‹ ' + TOPICS[idx - 1].title) : h('span'),
      idx < TOPICS.length - 1 ? h('a', { class: 'btn', href: '#/learn/' + TOPICS[idx + 1].id }, TOPICS[idx + 1].title + ' ›') : h('span'));
    wrap.append(nav);
    return wrap;
  }

  // ---------- practice ----------
  function viewPractice() {
    setActiveTab('practice');
    const sel = new Set(store.get('rbr.topicsel', []));
    const wrong = QUESTIONS.filter(q => P.q[q.id] && !P.q[q.id].ok);
    const fresh = QUESTIONS.filter(q => !P.q[q.id]);
    const examQs = QUESTIONS.filter(q => /final|midterm/i.test(q.src || ''));
    const rewriteQs = QUESTIONS.filter(q => q.tag === 'rewrite');
    const chips = h('div', { class: 'chips' });
    const draw = () => {
      chips.innerHTML = '';
      chips.append(h('button', { class: 'chip' + (sel.size === 0 ? ' on' : ''), onclick: () => { sel.clear(); store.set('rbr.topicsel', []); draw(); } }, 'All topics'));
      TOPICS.forEach(t => chips.append(h('button', { class: 'chip' + (sel.has(t.id) ? ' on' : ''), onclick: () => { sel.has(t.id) ? sel.delete(t.id) : sel.add(t.id); store.set('rbr.topicsel', [...sel]); draw(); } }, t.icon + ' ' + t.title.split(' ')[0].replace(/,$/, ''))));
    };
    draw();
    const tq = () => [...sel].join(',');
    const mode = (m, icon, title, sub) => h('a', { class: 'mode', href: '#', onclick: (e) => { e.preventDefault(); location.hash = `#/quiz?mode=${m}&topic=${tq()}`; } }, h('span', { class: 'mode-i' }, icon), h('span', null, h('b', null, title), h('div', { class: 'small muted' }, sub)));
    return h('div', { class: 'view' }, header('Practice'),
      h('div', { class: 'small muted' }, 'Filter by topic (optional):'), chips,
      mode('smart', '🧠', 'Smart review (12)', 'Your mistakes first, then new questions, then your oldest correct ones'),
      mode('rewrite', '🛠', `Rewrite & improve (${rewriteQs.length})`, 'Fix the bug, make it more OOP, replace loops and is_a? with blocks and dynamic dispatch'),
      mode('order', '📚', 'Work through questions', 'In lesson order, skipping ones you have already got right'),
      mode('exam', '🎯', 'Exam mix (15 random)', 'Mixed topics, like the real thing'),
      mode('pastexam', '📝', `Past-exam questions (${examQs.length})`, 'OOP, mixin, decomposition and subtyping questions from the old finals, ported back to Ruby'),
      mode('wrong', '🔁', `Review mistakes (${wrong.length})`, 'Questions you got wrong last time'),
      mode('new', '🆕', `Not tried yet (${fresh.length})`, 'Fresh questions only'),
      mode('all', '🗂', 'Browse everything', 'All questions, including ones you got right'),
      h('h2', { class: 'sec-t' }, 'Your progress'),
      TOPICS.map(t => { const s = statsFor(topicQs(t.id)); return h('div', { class: 'prog-row' }, h('span', null, t.icon + ' ' + t.title), bar(pct(s.ok, s.total)), h('span', { class: 'small muted' }, `${s.ok}/${s.total}`)); }),
      h('button', { class: 'btn ghost small', onclick: () => { if (confirm('Reset ALL progress (answers, sections, flashcards)?')) { P.q = {}; P.read = {}; P.known = {}; save(); route(); } } }, 'Reset progress'));
  }

  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  let session = null;
  function viewQuiz(params) {
    setActiveTab('practice');
    const topics = (params.get('topic') || '').split(',').filter(Boolean);
    const m = params.get('mode') || 'order';
    const key = m + '|' + topics.join(',');
    if (!session || session.key !== key) {
      let qs = QUESTIONS.filter(q => !topics.length || topics.includes(q.topic));
      if (m === 'order') { const rest = qs.filter(q => !(P.q[q.id] && P.q[q.id].ok)); qs = rest.length ? rest : qs; }
      if (m === 'exam') qs = shuffle(qs).slice(0, 15);
      if (m === 'pastexam') qs = qs.filter(q => /final|midterm/i.test(q.src || ''));
      if (m === 'wrong') qs = qs.filter(q => P.q[q.id] && !P.q[q.id].ok);
      if (m === 'new') qs = qs.filter(q => !P.q[q.id]);
      if (m === 'rewrite') { const r = qs.filter(q => q.tag === 'rewrite'); const todo = r.filter(q => !(P.q[q.id] && P.q[q.id].ok)); qs = todo.length ? todo : r; }
      if (m === 'smart') { // mistakes (oldest first), then unseen, then correct answers not seen for the longest time
        const t = (q) => (P.q[q.id] || {}).t || 0;
        const wrong = qs.filter(q => P.q[q.id] && !P.q[q.id].ok).sort((a, b) => t(a) - t(b));
        const unseen = shuffle(qs.filter(q => !P.q[q.id]));
        const old = qs.filter(q => P.q[q.id] && P.q[q.id].ok).sort((a, b) => t(a) - t(b));
        qs = shuffle([...wrong.slice(0, 6), ...unseen.slice(0, 12), ...old].slice(0, 12));
      }
      session = { key, qs, i: 0, results: {} };
    }
    const S = session;
    const wrap = h('div', { class: 'view' }, header({ smart: 'Smart review', rewrite: 'Rewrite & improve', order: 'Practice', exam: 'Exam mix', pastexam: 'Past-exam questions', wrong: 'Review mistakes', new: 'New questions', all: 'All questions' }[m] || 'Practice', '#/practice'));
    if (!S.qs.length) { wrap.append(h('div', { class: 'empty' }, m === 'wrong' ? '🎉 No mistakes to review!' : 'No questions here.'), h('a', { class: 'btn', href: '#/practice' }, 'Back')); return wrap; }
    const body = h('div');
    const top = h('div', { class: 'qnav-top' });
    function show() {
      body.innerHTML = ''; top.innerHTML = '';
      if (S.i >= S.qs.length) return summary();
      const q = S.qs[S.i];
      const answered = Object.keys(S.results).length;
      top.append(h('span', { class: 'small' }, `Question ${S.i + 1} of ${S.qs.length}`), h('span', { class: 'small muted' }, (topicById[q.topic] || {}).title || ''), bar(pct(answered, S.qs.length)));
      body.append(renderQuestion(q, { onAnswer: (ok) => { S.results[q.id] = ok; } }),
        h('div', { class: 'qnav' },
          h('button', { class: 'btn', disabled: S.i === 0, onclick: () => { S.i--; show(); window.scrollTo(0, 0); } }, '‹ Prev'),
          h('a', { class: 'small', href: '#/learn/' + q.topic }, 'lesson'),
          h('button', { class: 'btn primary', onclick: () => { S.i++; show(); window.scrollTo(0, 0); } }, S.i === S.qs.length - 1 ? 'Finish' : 'Next ›')));
    }
    function summary() {
      const ids = Object.keys(S.results); const ok = ids.filter(id => S.results[id]).length;
      body.append(h('div', { class: 'summary' }, h('div', { class: 'big' }, `${ok} / ${ids.length}`), h('div', { class: 'muted' }, `answered correctly (${S.qs.length - ids.length} skipped)`),
        h('div', { class: 'sumlist' }, S.qs.map((q, i) => h('button', { class: 'sumq ' + (S.results[q.id] === true ? 'ok' : S.results[q.id] === false ? 'bad' : ''), onclick: () => { S.i = i; show(); } }, `${i + 1}. ${q.q.replace(/`/g, '').slice(0, 60)}…`))),
        h('div', { class: 'qactions' }, h('button', { class: 'btn primary', onclick: () => { session = null; route(); } }, 'New round'), h('a', { class: 'btn', href: '#/practice' }, 'Practice menu'))));
    }
    show();
    wrap.append(top, body);
    return wrap;
  }

  // ---------- connections map ----------
  function viewMap(nodeId) {
    setActiveTab('map');
    const { nodes, edges } = window.MAP;
    const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
    const topicIdx = Object.fromEntries(TOPICS.map((t, i) => [t.id, i]));
    const W = 380, NW = 112, NH = 30, H = Math.max(...nodes.map(n => n.y)) + 40;
    let svg = `<svg viewBox="0 0 ${W} ${H}" class="mapsvg" role="img" aria-label="concept map">`;
    edges.forEach((e, i) => {
      const a = byId[e.a], b = byId[e.b];
      const mx = (a.x + b.x) / 2 + (a.y === b.y ? 0 : (i % 2 ? 18 : -18)), my = (a.y + b.y) / 2 + (a.y === b.y ? -22 : 0);
      svg += `<path d="M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}" class="medge" data-a="${e.a}" data-b="${e.b}"/>`;
    });
    nodes.forEach(n => {
      svg += `<g class="mnode c${topicIdx[n.topic]}" data-id="${n.id}" transform="translate(${n.x - NW / 2},${n.y - NH / 2})"><rect width="${NW}" height="${NH}" rx="15"/><text x="${NW / 2}" y="${NH / 2}" text-anchor="middle" dominant-baseline="central">${Viz.esc(n.label)}</text></g>`;
    });
    svg += '</svg>';
    const mapEl = h('div', { class: 'mapwrap', html: svg });
    const panel = h('div', { class: 'mpanel' }, h('div', { class: 'muted small' }, 'Tap a concept to see how it connects to the others.'));
    function select(id) {
      const n = byId[id]; if (!n) return;
      mapEl.querySelectorAll('.mnode').forEach(g => { const rel = g.dataset.id === id || edges.some(e => (e.a === id && e.b === g.dataset.id) || (e.b === id && e.a === g.dataset.id)); g.classList.toggle('sel', g.dataset.id === id); g.classList.toggle('dim', !rel); });
      mapEl.querySelectorAll('.medge').forEach(p => { const on = p.dataset.a === id || p.dataset.b === id; p.classList.toggle('on', on); p.classList.toggle('dim', !on); });
      const rel = edges.filter(e => e.a === id || e.b === id);
      const [tid, sid] = n.lesson.split('/');
      panel.innerHTML = '';
      panel.append(h('div', { class: 'mp-h' }, h('b', null, n.label), h('a', { class: 'btn small', href: `#/learn/${tid}/${sid}` }, 'Open lesson →')),
        h('div', { class: 'small muted' }, `${rel.length} connections:`),
        ...rel.map(e => { const other = byId[e.a === id ? e.b : e.a]; return h('button', { class: 'mp-rel', onclick: () => { select(other.id); history.replaceState(null, '', '#/map/' + other.id); } }, h('span', { class: 'mp-o' }, (e.a === id ? '→ ' : '← ') + other.label), h('span', { class: 'small' }, e.why)); }));
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    mapEl.addEventListener('click', (e) => { const g = e.target.closest('.mnode'); if (g) { select(g.dataset.id); history.replaceState(null, '', '#/map/' + g.dataset.id); } });
    const legend = h('div', { class: 'mlegend' }, TOPICS.map((t, i) => h('span', { class: 'lgt c' + i }, t.icon + ' ' + t.title.split(/[ ,&]/)[0])));
    const cmp = h('div', null, h('h2', { class: 'sec-t' }, 'Side-by-side comparisons'), window.COMPARE.map(c => {
      const d = h('details', { class: 'cmpbox' }, h('summary', null, c.title), h('div', { html: c.html })); return d;
    }));
    const wrap = h('div', { class: 'view' }, header('Connections'), legend, mapEl, panel, cmp);
    if (nodeId) setTimeout(() => select(nodeId), 0);
    return wrap;
  }

  // ---------- playground ----------
  const EXAMPLES = window.PLAY_EXAMPLES;
  function viewPlay() {
    setActiveTab('play');
    const ta = h('textarea', { class: 'code-edit play', spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off', autocomplete: 'off', rows: 14 });
    ta.value = store.get('rbr.play', EXAMPLES[0][1]);
    ta.addEventListener('input', () => store.set('rbr.play', ta.value));
    const outEl = h('div', { class: 'run-out' }, h('div', { class: 'muted small' }, 'Output appears here.'));
    function ins(text, back = 0) {
      const s = ta.selectionStart, e = ta.selectionEnd;
      ta.value = ta.value.slice(0, s) + text + ta.value.slice(e);
      ta.selectionStart = ta.selectionEnd = s + text.length - back; ta.focus(); store.set('rbr.play', ta.value);
    }
    const keys = [['@', '@', 0], ['|x|', '|x| ', 0], ['{ }', '{  }', 2], ['[ ]', '[]', 1], ['( )', '()', 1], ['"', '""', 1], [':', ':', 0], ['=>', ' => ', 0], ['#{}', '#{}', 1], ['def', 'def \nend', 4], ['class', 'class \nend', 4], ['do', 'do ||\n  \nend', 8], ['end', 'end\n', 0], ['puts', 'puts ', 0], ['⏎', '\n  ', 0]];
    const kb = h('div', { class: 'kbar' }, keys.map(([l, t, b]) => h('button', { class: 'key', onmousedown: (e) => e.preventDefault(), onclick: () => ins(t, b) }, l)));
    const run = (echo) => {
      const r = R.run(ta.value, { echo }); outEl.innerHTML = '';
      if (r.output) outEl.append(h('pre', { class: 'out-text' }, r.output));
      if (r.error) outEl.append(h('pre', { class: 'out-err' }, r.error));
      if (!r.output && !r.error) outEl.append(h('div', { class: 'muted small' }, '(no output: use puts or p to print, or press "Run like irb")'));
    };
    const sel = h('select', { class: 'inp', onchange: () => { const ex = EXAMPLES[+sel.value]; if (ex) { ta.value = ex[1]; store.set('rbr.play', ta.value); run(false); } } },
      h('option', { value: '' }, 'Load an example…'), EXAMPLES.map(([n], i) => h('option', { value: i }, n)));
    const ref = h('details', { class: 'cmpbox' }, h('summary', null, 'What this mini-Ruby supports'), h('div', { class: 'small', html: window.PLAY_REF }));
    return h('div', { class: 'view' }, header('Code playground'),
      h('div', { class: 'small muted' }, 'A Ruby interpreter running on your phone. ▶ Run works like "ruby file.rb" (only puts/p print). "Run like irb" also shows => the value of every top-level line, as in the slides.'),
      h('div', { class: 'row' }, sel), kb, ta,
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => run(false) }, '▶ Run'), h('button', { class: 'btn', onclick: () => run(true) }, '⇒ Run like irb'), h('button', { class: 'btn ghost', onclick: () => { ta.value = ''; store.set('rbr.play', ''); ta.focus(); } }, 'Clear')),
      outEl, ref);
  }

  // ---------- flash cards ----------
  function viewCards() {
    setActiveTab('cards');
    const cards = window.CARDS;
    let order = shuffle(cards.map((_, i) => i).filter(i => !P.known[i]));
    if (!order.length) order = shuffle(cards.map((_, i) => i));
    let k = 0, flipped = false;
    const front = h('div', { class: 'cf' }); const back = h('div', { class: 'cb' });
    const card = h('div', { class: 'flash', onclick: () => { flipped = !flipped; card.classList.toggle('flipped', flipped); } }, front, back);
    const info = h('div', { class: 'small muted center' });
    function show() {
      if (k >= order.length) { front.textContent = '🎉 Deck done!'; back.textContent = 'Tap "Shuffle" to go again.'; info.textContent = ''; return; }
      const c = cards[order[k]]; flipped = false; card.classList.remove('flipped');
      front.textContent = c.front; back.textContent = c.back;
      const known = Object.keys(P.known).length;
      info.textContent = `Card ${k + 1} of ${order.length} · ${known}/${cards.length} known · tap the card to flip`;
    }
    const again = h('button', { class: 'btn bad', onclick: () => { if (k < order.length) { order.push(order[k]); k++; show(); } } }, '↺ Again');
    const got = h('button', { class: 'btn good', onclick: () => { if (k < order.length) { P.known[order[k]] = true; save(); k++; show(); } } }, '✓ Knew it');
    show();
    return h('div', { class: 'view' }, header('Flashcards'), info, card, h('div', { class: 'row center' }, again, got),
      h('div', { class: 'row center' }, h('button', { class: 'btn ghost small', onclick: () => { P.known = {}; save(); order = shuffle(cards.map((_, i) => i)); k = 0; show(); } }, 'Shuffle & reset')));
  }

  function viewTips() {
    setActiveTab('learn');
    return h('div', { class: 'view' }, header('Exam technique', '#/'), h('div', { class: 'tips', html: window.EXAM_TIPS }),
      h('a', { class: 'btn primary', href: '#/quiz?mode=pastexam' }, 'Practise past-exam questions →'));
  }
  function viewAbout() {
    return h('div', { class: 'view' }, header('About', '#/'), h('div', { class: 'tips', html: `
<p>Built from the CSC 330 Ruby lecture slides (ruby1 to ruby7) and the OOP, mixin, "functional vs object-oriented decomposition" and subtyping questions of the old CSE341 finals. Those finals were ported by the course staff from Ruby to Racket classes; here they are ported back to Ruby.</p>
<p>The code runner is a small Ruby interpreter written in JavaScript. It prints values and error messages in the style of current Ruby (3.4+), so a few things look slightly different from the older output on the slides (for example <span class="mono">{"a" => 1}</span> instead of <span class="mono">{"a"=>1}</span>). Typed answers accept both.</p>
<p>Progress is saved on this device only.</p>
<p>${QUESTIONS.length} questions · ${window.CARDS.length} flashcards · ${TOPICS.reduce((a, t) => a + t.sections.length, 0)} lesson sections.</p>` }));
  }

  // ---------- router ----------
  function route() {
    const hash = location.hash || '#/';
    const [path, qs] = hash.slice(1).split('?');
    const parts = path.split('/').filter(Boolean);
    const params = new URLSearchParams(qs || '');
    let view;
    if (!parts.length) view = viewHome();
    else if (parts[0] === 'learn') view = viewTopic(parts[1], parts[2]);
    else if (parts[0] === 'practice') { session = null; view = viewPractice(); }
    else if (parts[0] === 'quiz') view = viewQuiz(params);
    else if (parts[0] === 'map') view = viewMap(parts[1]);
    else if (parts[0] === 'play') view = viewPlay();
    else if (parts[0] === 'cards') view = viewCards();
    else if (parts[0] === 'tips') view = viewTips();
    else if (parts[0] === 'about') view = viewAbout();
    else view = viewHome();
    main.innerHTML = ''; main.append(view);
    if (!(parts[0] === 'learn' && parts[2])) window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();

  // Offline support. Skipped on localhost so edits show up immediately while developing.
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
    else navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();

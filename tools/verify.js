// Checks every question's answers against the app's interpreter (ruby.js) and, if Ruby is installed, against REAL Ruby.
// Usage:  node tools/verify.js            (all questions)
//         node tools/verify.js d-polar    (only ids containing "d-polar")
// Subtyping questions (no code to run) are checked with app/js/subtype.js.
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const appJs = path.join(__dirname, '..', 'app', 'js');
global.window = globalThis;
const R = require(path.join(appJs, 'ruby.js')); require(path.join(appJs, 'rubylib.js'));
const ST = require(path.join(appJs, 'subtype.js'));
for (const f of fs.readdirSync(appJs).filter(f => /^questions\d*\.js$/.test(f)).sort()) require(path.join(appJs, f));
const filter = process.argv[2] || '';
let rubyVersion = null;
try { rubyVersion = cp.execFileSync('ruby', ['-v'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch (e) { /* not installed */ }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rb-verify-'));
const norm = (s) => String(s).replace(/\r/g, '').replace(/:0x[0-9a-f]+/g, '');
const loose = (s) => norm(s).replace(/\s+/g, '');
const preOf = (q) => [].concat(q.prelude || []).map(k => { if (!(k in window.PRELUDES)) throw new Error('unknown prelude ' + k); return window.PRELUDES[k]; }).join('\n');

function runRuby(src, timeout) {
  const file = path.join(tmp, 'q.rb'); fs.writeFileSync(file, src);
  try { return { out: cp.execFileSync('ruby', ['-W0', '--disable-gems', file], { encoding: 'utf8', timeout: timeout || 30000, stdio: ['ignore', 'pipe', 'pipe'] }), err: '', timedOut: false }; }
  catch (e) { return { out: e.stdout || '', err: e.stderr || '', timedOut: !!(e.killed || /ETIMEDOUT/.test(String(e))) }; }
}
// Runs code + asks in both implementations; returns [{ name, values: [inspect strings], printed, error }]
function runBoth(src, asks, nonterm) {
  const res = [];
  const js = R.run(src, { asks, limit: nonterm ? 400000 : 3000000 });
  const base = R.run(src, {});
  res.push({ name: 'JS', values: js.shown, printed: base.output, error: js.error || '' });
  if (rubyVersion) {
    const b = runRuby(src);
    const full = runRuby(src + '\n' + asks.map(a => 'puts "=>VALUE " + (' + a + ').inspect').join('\n'), nonterm ? 6000 : 30000);
    const values = full.out.split('\n').filter(l => l.startsWith('=>VALUE ')).map(l => l.slice(8));
    res.push({ name: 'RUBY', values, printed: b.out, error: full.timedOut ? 'STOPPED (timed out)' : full.err });
  }
  return res;
}
function checkPredict(q, problems) {
  if (q.norun) return checkSubtype(q, problems);
  const pre = preOf(q), src = pre + '\n' + (q.code || '');
  const groups = q.independent ? q.parts.map(p => [p]) : [q.parts];
  for (const parts of groups) {
    const asks = [], expect = []; let err = null, nonterm = false, outPart = null;
    for (const p of parts) {
      if (p.out) { outPart = p; continue; }
      asks.push(p.ask);
      if (p.a === 'error') { err = p.err || ''; break; }
      if (p.nonterm) { nonterm = true; break; }
      expect.push(p);
    }
    for (const r of runBoth(src, asks, nonterm)) {
      if (outPart && loose(r.printed) !== loose(outPart.a)) problems.push(`${r.name} printed output differs\n    expected: ${JSON.stringify(outPart.a)}\n    got:      ${JSON.stringify(norm(r.printed))}`);
      expect.forEach((p, i) => {
        if (p.skip || p.a === 'object') return;
        const got = r.values[i];
        if (got === undefined) problems.push(`${r.name} "${p.ask}" produced no value (${r.error.split('\n')[0]})`);
        else if (norm(got) !== norm(p.a) && !(r.name === 'RUBY' && loose(got) === loose(p.a))) problems.push(`${r.name} "${p.ask}"\n    expected: ${p.a}\n    got:      ${norm(got)}`);
      });
      if (err !== null) { if (!r.error || !r.error.replace(/[`']/g, "'").includes(err)) problems.push(`${r.name} should fail with "${err}" but got: ${JSON.stringify(r.error.split('\n')[0])}`); }
      else if (nonterm) { if (!/STOPPED|stack level too deep/.test(r.error)) problems.push(`${r.name} should not terminate, got: ${JSON.stringify(r.error)}`); }
      else if (r.error) problems.push(`${r.name} unexpected error: ${r.error.split('\n')[0]}`);
    }
  }
}
function checkSubtype(q, problems) {
  const defs = q.types || {};
  for (const p of q.parts) {
    const opts = p.opts || q.stOpts || {};
    try {
      if (p.sub) { const got = ST.isSub(p.sub[0], p.sub[1], defs, opts) ? 'yes' : 'no'; if (got !== p.a) problems.push(`SUBTYPE "${p.ask}" expected ${p.a}, checker says ${got}`); }
      else if (p.rel) { const got = ST.relation(p.rel[0], p.rel[1], defs, opts); if (got !== p.a) problems.push(`SUBTYPE "${p.ask}" expected ${p.a}, checker says ${got}`); }
      else if (p.subsOf || p.supersOf) {
        const among = p.among || Object.keys(defs), target = p.subsOf || p.supersOf;
        const got = among.filter(t => p.subsOf ? ST.isSub(t, target, defs, opts) : ST.isSub(target, t, defs, opts));
        const want = p.a === 'none' ? [] : p.a.split(',').map(s => s.trim());
        if (got.map(loose).sort().join('|') !== want.map(loose).sort().join('|')) problems.push(`SUBTYPE "${p.ask}" expected ${p.a}, checker says ${got.join(', ') || 'none'}`);
      } else if (!p.manual) problems.push(`part "${p.ask}" of a norun question has no machine check (add sub/rel/subsOf/supersOf or manual: true)`);
    } catch (e) { problems.push('SUBTYPE check crashed: ' + e.message); }
  }
}
function checkWrite(q, problems) {
  const pre = preOf(q);
  for (const [re, msg] of q.require || []) if (!new RegExp(re).test(q.answer.replace(/#(?!\{).*$/gm, ''))) problems.push('model answer fails require: ' + msg);
  for (const [re, msg] of q.forbid || []) if (new RegExp(re).test(q.answer.replace(/#(?!\{).*$/gm, ''))) problems.push('model answer hits forbid: ' + msg);
  const body = q.template ? q.template.replace('<<ANSWER>>', q.answer) : pre + '\n' + q.answer;
  if (q.template && !q.template.includes('<<ANSWER>>')) problems.push('template has no <<ANSWER>> marker');
  for (const t of q.tests) {
    const js = R.run(body + '\n' + t.run);
    const got = js.error ? 'error: ' + js.error.split('\n')[0] : js.output.trim();
    if (got !== t.expect) problems.push(`JS test "${t.run.replace(/\n/g, '; ')}"\n    expected: ${t.expect}\n    got:      ${got}`);
    if (rubyVersion) { const r = runRuby(body + '\n' + t.run); const g = r.err ? 'error: ' + r.err.split('\n')[0] : norm(r.out).trim(); if (loose(g) !== loose(t.expect)) problems.push(`RUBY test "${t.run.replace(/\n/g, '; ')}"\n    expected: ${t.expect}\n    got:      ${g}`); }
  }
  // the starter (the "bad" version) of a rewrite question should NOT already pass everything
  if (q.tag === 'rewrite' && q.starter && !q.starterPasses) {
    const b2 = q.template ? q.template.replace('<<ANSWER>>', q.starter) : pre + '\n' + q.starter;
    const style = (q.require || []).some(([re]) => !new RegExp(re).test(q.starter)) || (q.forbid || []).some(([re]) => new RegExp(re).test(q.starter));
    const allPass = q.tests.every(t => { const r = R.run(b2 + '\n' + t.run); return !r.error && r.output.trim() === t.expect; });
    if (allPass && !style) problems.push('the starter code already passes every test and style rule');
  }
}
let checked = 0, bad = 0; const warnings = []; const ids = new Set();
for (const q of window.QUESTIONS) {
  if (ids.has(q.id)) { console.log('✗ duplicate id ' + q.id); bad++; } ids.add(q.id);
  if (filter && !q.id.includes(filter)) continue;
  const problems = [];
  try {
    if (q.type === 'predict') checkPredict(q, problems);
    else if (q.type === 'write') checkWrite(q, problems);
    else if (q.type === 'mcq') {
      if (!(q.answer >= 0 && q.answer < q.options.length)) problems.push('answer index out of range');
      const len = q.options.map(o => o.length), right = len[q.answer], others = len.filter((_, i) => i !== q.answer);
      if (q.options.length > 2 && (right > 1.35 * Math.max(...others) || right < 0.6 * Math.min(...others))) warnings.push(`${q.id}: correct option length ${right} vs others ${others.join('/')}`);
    } else if (q.type === 'explain') { if (!q.answer) problems.push('no model answer'); }
    else problems.push('unknown type ' + q.type);
  } catch (e) { problems.push('verify crashed: ' + e.message); }
  checked++;
  if (problems.length) { bad++; console.log(`✗ ${q.id}\n  ` + problems.join('\n  ')); }
  else if (process.argv.includes('-v')) console.log(`✓ ${q.id}`);
}
if (warnings.length) console.log('\nMultiple-choice balance warnings (the correct option stands out by length):\n  ' + warnings.join('\n  '));
const byType = {}; for (const q of window.QUESTIONS) byType[q.type] = (byType[q.type] || 0) + 1;
console.log(`\n${checked} questions checked, ${bad} with problems.  (${Object.entries(byType).map(([k, v]) => v + ' ' + k).join(', ')})`);
console.log(rubyVersion ? 'Checked against the app interpreter AND real Ruby: ' + rubyVersion : 'Checked against the app interpreter only. Real Ruby is NOT installed on this PC (no "ruby" on PATH), so nothing was compared with real Ruby.');
process.exit(bad ? 1 : 0);

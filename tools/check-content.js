// Checks the lesson content: every runnable code block runs, every quiz id / widget / map link / lesson link exists.
// Usage:  node tools/check-content.js
const fs = require('fs'), path = require('path');
const appJs = path.join(__dirname, '..', 'app', 'js');
global.window = globalThis;
const R = require(path.join(appJs, 'ruby.js')); require(path.join(appJs, 'rubylib.js')); require(path.join(appJs, 'subtype.js'));
for (const f of fs.readdirSync(appJs).filter(f => /^questions\d*\.js$/.test(f)).sort()) require(path.join(appJs, f));
require(path.join(appJs, 'lessons.js')); require(path.join(appJs, 'map.js'));
const vizSrc = fs.readFileSync(path.join(appJs, 'viz.js'), 'utf8');
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
const qids = new Set(window.QUESTIONS.map(q => q.id)), nodes = new Set(window.MAP.nodes.map(n => n.id));
let bad = 0; const fail = (m) => { bad++; console.log('✗ ' + m); };
const usedQuiz = new Set(); const secIds = new Set();
for (const t of window.TOPICS) for (const s of t.sections) {
  const where = t.id + '/' + s.id; secIds.add(where);
  for (const m of s.body.matchAll(/<pre data-run([^>]*)>([\s\S]*?)<\/pre>/g)) {
    const pre = (m[1].match(/data-prelude="([^"]+)"/) || [])[1];
    const src = (pre ? window.PRELUDES[pre] + '\n' : '') + unesc(m[2]);
    const r = R.run(src, { echo: /data-echo/.test(m[1]) });
    const expectErr = /# ?(error|fails)/.test(m[2]);
    if (r.error && !expectErr) fail(`${where}: code block error: ${r.error.split('\n')[0]}\n    ${unesc(m[2]).split('\n')[0]}`);
    if (!r.error && expectErr) fail(`${where}: code block was expected to end in an error but did not`);
    if (process.argv.includes('-v')) console.log('--- ' + where + '\n' + r.output + (r.error ? 'ERROR: ' + r.error : ''));
  }
  for (const m of s.body.matchAll(/data-quiz="([^"]+)"/g)) { usedQuiz.add(m[1]); if (!qids.has(m[1])) fail(`${where}: unknown quiz id ${m[1]}`); }
  for (const m of s.body.matchAll(/data-map="([^"]+)"/g)) if (!nodes.has(m[1])) fail(`${where}: unknown map node ${m[1]}`);
  for (const m of s.body.matchAll(/data-widget="([^"]+)"/g)) {
    const [name, arg] = m[1].split(':');
    if (!new RegExp('\\b' + name + '\\b').test(vizSrc)) fail(`${where}: unknown widget ${name}`);
    for (const a of (arg || '').split(',').filter(Boolean)) if (!new RegExp('\\b' + a + '[\'"]?:').test(vizSrc)) fail(`${where}: widget argument "${a}" not found in viz.js`);
  }
}
for (const n of window.MAP.nodes) if (!secIds.has(n.lesson)) fail(`map node ${n.id}: lesson ${n.lesson} does not exist`);
for (const e of window.MAP.edges) for (const k of [e.a, e.b]) if (!nodes.has(k)) fail(`map edge uses unknown node ${k}`);
const linked = new Set(window.MAP.edges.flatMap(e => [e.a, e.b])); for (const n of nodes) if (!linked.has(n)) fail(`map node ${n} has no edges`);
const topics = new Set(window.TOPICS.map(t => t.id)); for (const q of window.QUESTIONS) if (!topics.has(q.topic)) fail(`question ${q.id}: unknown topic ${q.topic}`);
for (const [name, code] of window.PLAY_EXAMPLES) { const r = R.run(code, {}); if (r.error) fail(`playground example "${name}": ${r.error.split('\n')[0]}`); }
console.log(`${window.TOPICS.length} topics, ${secIds.size} sections, ${usedQuiz.size} inline quizzes, ${window.CARDS.length} cards, ${window.MAP.nodes.length} map nodes, ${window.MAP.edges.length} edges, ${window.COMPARE.length} comparisons. ${bad} problems.`);
process.exit(bad ? 1 : 0);

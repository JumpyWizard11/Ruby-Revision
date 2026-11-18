# Ruby Revision (CSC 330, Fall 2026)

Revision workspace for the **Ruby / OOP unit**: objects and classes, blocks, dynamic dispatch, FP-vs-OOP decomposition and double dispatch, mixins, subtyping, generics. Same exam conditions as the Racket midterm: closed book, short written answers.

The solution is an **offline phone app** (`app/`) built from the Ruby slides and the OOP/subtyping parts of the past exams. It is a sibling of `../Racket-Revision/` (same design, separate folder, separate code, separate saved progress) and follows the design choices written down in `../Racket-Revision/CLAUDE.md` ("Design choices" section). Read that section before changing how the app works.

---

## What's here

| Path | What it is |
|---|---|
| `../Ruby/ruby1.pdf` … `ruby7.pdf` | **The lecture slides. This is what the exam covers.** |
| `../Racket Slides/Previous Racket/` | Old CSE341 finals/midterms. The finals were written for **Ruby**, then ported by course staff to Racket-OOP. The app ports the OOP questions **back to Ruby**. |
| `app/` | The revision app (static website / PWA). |
| `tools/verify.js` | Checks every question's answers against the app's interpreter, and against **real Ruby if `ruby` is on PATH**. |
| `tools/check-content.js` | Runs every lesson code block and playground example, and checks that every quiz id, widget, map link and lesson link exists. |
| `tools/serve.py` | Local preview server (no caching): `python tools/serve.py`, then http://localhost:8731 |
| `tools/make-icons.js` | Regenerates `app/icons/*.png`. |

### Slides → app topics

| Slides | Content | App topic (id) |
|---|---|---|
| `ruby1.pdf` | pure OOP rules, classes, methods, `self`, instance/class variables, `initialize`, getters/setters, `attr_*`, private/protected, `MyRational`, reflection, open classes, duck typing | 💎 Objects, classes & state (`oop`) |
| `ruby2.pdf` | arrays, blocks, iterators, `yield`, closures, `Proc`/`lambda`, hashes, symbols, ranges | 🧱 Arrays, blocks, procs, hashes (`blocks`) |
| `ruby3.pdf` | subclassing, `is_a?`, `super`, overriding, alternatives to subclassing, **dynamic dispatch** (PolarPoint), lookup rules, even/odd, objects coded in Racket | 🎯 Subclassing & dynamic dispatch (`dispatch`) |
| `ruby4.pdf` | operations × variants grid, extensibility, binary methods, **double dispatch**, multimethods, static overloading | 🧩 FP vs OOP decomposition & double dispatch (`extend`) |
| `ruby5.pdf` | multiple inheritance, **mixins**, lookup with mixins, `Comparable`, `Enumerable`, interfaces, abstract methods | 🧬 Mixins, multiple inheritance, interfaces (`mixins`) |
| `ruby6.pdf` | record language, width/permutation/transitivity/reflexivity, **depth is unsound**, Java arrays, null, **function subtyping** | 📐 Subtyping (`subtyping`) |
| `ruby7.pdf` | objects as records, sound overriding, `self`, class vs type, generics vs subtyping, bounded polymorphism, visitor pattern | 🧮 Generics, typed OOP & visitors (`generics`) |

### Old exams: what is relevant to this unit

- `Previous Racket/final*.pdf`: use the questions the **Racket** app skips:
  - "OOP: what does this print" (class hierarchy, `super`, calls on `self`)
  - "FP vs OOP decomposition": port an OCaml datatype + function to classes (or back), then extensibility
  - "Mixins" (write one / what does it assume)
  - "Subtyping" (list all subtypes/supertypes, function subtyping, is this rule sound)
- Skip there: Racket programming, streams, MUPL interpreter, soundness/completeness of static typing (that is the Racket unit).
- `Previous Racket/midterm*.pdf` are OCaml: style only.
- In the app, a `src` such as `Sp19 final Q7` is a real exam question ported to Ruby. A `src` starting with **`like`** (e.g. `like Wi23 final Q9`) is a new question written in the style of that exam question, not the original.

---

## The app (`app/`)

Plain HTML/CSS/JS, no build step, no internet needed at runtime.

- **Learn**: 7 topics / 42 sections in lecture order. Each has explanation, runnable/editable Ruby, visualisers, 🔑 key idea / 🔗 connection / ⚠️ trap callouts and inline questions. Most topics end with an "Exam skill" section.
- **Visualisers** (`js/viz.js`): steppers (aliasing, class variables, closures, yield, PolarPoint dispatch, super, double dispatch, visitor, depth-subtyping counterexample, Java array store, contravariance, return-in-block), **method lookup tracer** (runs the real code and shows the ancestor chain searched for each call), iterator explorer, FP/OOP grid, double-dispatch explorer, **subtype checker** (explains each rule it used; depth/immutable switches), variance picker, sorting games.
- **Practice** (`js/questions1-4.js`): 185 questions (78 multiple choice, 63 predict, 35 write-code with tests, 9 explain). 18 are **rewrite / fix** questions (`tag: 'rewrite'`). 21 are tagged as past-exam. Same modes as the Racket app.
- **Connect** (`js/map.js`): 40 concepts, 55 labelled connections, 12 comparison tables.
- **Code**: playground running `js/ruby.js`. **Cards**: 42 flashcards. **Exam tips**.

Progress is saved in `localStorage` under keys starting **`rbr.`**. Keep that prefix: both apps are served from the same GitHub Pages origin, so shared key names would mix up their progress.

### File map

```
app/index.html            page shell + all CSS (light/dark), rose theme
app/js/ruby.js            Ruby-subset interpreter: lexer, parser, evaluator, inspect/printing, tracing hooks
app/js/rubylib.js         built-in classes: Object/Kernel, Module, Comparable, Enumerable, Integer, Float, String, Symbol, Array, Hash, Range, Proc, exceptions, Math
app/js/subtype.js         checker for the subtyping lecture's record/function types (used by the widget and by verify.js)
app/js/viz.js             visualiser widgets + stepper scripts (STEPS)
app/js/questions1.js      oop + blocks questions (also most PRELUDES: rational, point, exp, dd, house, visitor)
app/js/questions2.js      dispatch + extend questions (PRELUDES polar, coins) incl. past-exam ports
app/js/questions3.js      mixins + subtyping + generics questions (PRELUDE countdown)
app/js/questions4.js      the rewrite / fix questions
app/js/lessons.js         TOPICS, CARDS, EXAM_TIPS, PLAY_EXAMPLES, PLAY_REF
app/js/map.js             MAP (concept graph) and COMPARE (tables)
app/js/app.js             router, views, question engine, progress storage, service-worker registration
app/sw.js                 service worker. Bump VERSION after any change!
```

### Lesson markup (inside `lessons.js` bodies)

- `<pre data-run>code</pre>`: runnable block. `data-echo` shows `=> value` per line (irb style). `data-prelude="point"` preloads helper code. Write `&lt;` for `<` inside it.
- `<div data-widget="stepper:polar"></div>`, `dispatch:polar`, `dispatch:superc,missing`, `iter`, `grid`, `dd`, `subtype`, `variance`, `sorter:fpoop`
- `<div data-quiz="question-id"></div>`, `<a data-map="node-id">`

### Question format

```js
{ id, topic: 'oop'|'blocks'|'dispatch'|'extend'|'mixins'|'subtyping'|'generics', type: 'predict'|'mcq'|'write'|'explain',
  src: 'Sp19 final Q7',            // optional; containing "final" puts it in Past-exam mode
  q: 'prompt with `code`', code: '...shown code...', prelude: 'point' | ['point','polar'],
  // predict: asks are evaluated after the code; answers are Ruby inspect strings
  parts: [{ ask: 'expr', a: '[1, 2]' }, { ask: 'bad', a: 'error', err: "substring of the error" },
          { ask: 'loop', a: 'loops forever', nonterm: true }, { out: true, a: 'printed output' }],
  independent: true,               // run each part separately (needed after an error part)
  // predict with norun: true = subtyping question, nothing is run. Each part needs a machine check:
  //   sub: [A, B] (a: 'yes'|'no'), rel: [X, Y] (a: 'subtype'|'supertype'|'both'|'neither'),
  //   subsOf / supersOf: 't2' with among: [...] or q.types (a: 't1, t2', set: true), or manual: true
  //   q.types = named types; opts / q.stOpts = { depth, immutable }
  options: ['correct one FIRST', ...], answer: 0,          // mcq: the app shuffles on every render
  starter, answer: 'model code', tests: [{ run: 'p expr', expect: 'printed' }], template: '... <<ANSWER>> ...',
  tag: 'rewrite', hint, require: [['regex', 'message']], forbid: [['regex', 'message']],
  explain: 'shown after answering' }
```

Multiple choice rules (same as the Racket app): options of similar length and detail, every wrong option a believable misconception, never mention option letters. `verify.js` prints a warning when the correct option stands out by length.

**After adding or editing anything, run both:**

```
node tools/verify.js
node tools/check-content.js
```

Last result (2026-11-16): 185/185 questions pass in **both** the app interpreter and **real Ruby 3.4.12**, 0 content problems. The 31 runnable lesson blocks and playground examples were also compared with real Ruby once: identical output and error messages.

Real Ruby is installed at `C:\Ruby34-x64` (RubyInstaller 3.4, via winget). `verify.js` uses it automatically when `ruby` is on PATH and prints which one it used on its last line; if that line says "app interpreter only", open a new terminal or add `C:\Ruby34-x64\bin` to PATH. It runs Ruby with `--disable-gems` because RubyInstaller's rubygems startup file crashes in the Git Bash shell here (nothing in the app needs gems).

Known, deliberate interpreter differences: a subset only (no regex, keyword arguments, `require`, files, most of the standard library); error messages follow Ruby 3.4 (`undefined method 'x' for nil`, `for an instance of Foo`), while the slides show the older wording, and typed answers accept both; hash inspect is the 3.4 style (`{"a" => 1}`); object ids in `#<Foo>` are made up; programs stop after a step limit.

---

## Putting it on the iPhone (offline)

Same as the Racket app: host once over HTTPS (GitHub Pages), open in Safari, **Share → Add to Home Screen**, open once from the Home Screen while online, then test in Airplane Mode.

1. Create a GitHub repo (e.g. `Ruby-Revision`) and upload this folder (the root `index.html` forwards to `app/`).
2. Repo **Settings → Pages** → Deploy from branch `main`, folder `/ (root)`.
3. Open `https://<username>.github.io/Ruby-Revision/` on the phone and add it to the Home Screen.

Updating later: change files → **bump `VERSION` in `app/sw.js`** → push → on the phone open the app online, close it, open it again.

Local preview: `python tools/serve.py` → http://localhost:8731 (service worker disabled on localhost).

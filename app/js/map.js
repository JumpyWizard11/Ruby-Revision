// map.js: the concept map (how ideas connect) and side-by-side comparisons.
(function () {
  // [id, label, topic, lesson "topic/section", x, y]
  const N = [
    ['pure', 'Pure OOP', 'oop', 'oop/big', 62, 40], ['class', 'Classes & methods', 'oop', 'oop/classes', 190, 40], ['state', '@ instance vars', 'oop', 'oop/state', 318, 40],
    ['attr', 'Getters / attr_*', 'oop', 'oop/attr', 62, 100], ['visibility', 'private / protected', 'oop', 'oop/visibility', 190, 100], ['duck', 'Duck typing', 'oop', 'oop/dynamic', 318, 100],
    ['array', 'Arrays', 'blocks', 'blocks/arrays', 62, 170], ['block', 'Blocks & yield', 'blocks', 'blocks/blocks', 190, 170], ['proc', 'Proc / lambda', 'blocks', 'blocks/procs', 318, 170],
    ['alias', 'Aliasing', 'oop', 'oop/state', 62, 230], ['iter', 'Iterators', 'blocks', 'blocks/blocks', 190, 230], ['objclosure', 'Objects ≈ closures', 'dispatch', 'dispatch/diy', 318, 230],
    ['subclass', 'Subclassing', 'dispatch', 'dispatch/subclass', 62, 300], ['override', 'Overriding & super', 'dispatch', 'dispatch/why', 190, 300], ['dispatch', 'Dynamic dispatch', 'dispatch', 'dispatch/dispatch', 318, 300],
    ['isa', 'is_a? (not OOP)', 'dispatch', 'dispatch/subclass', 62, 360], ['lookup', 'Method lookup', 'dispatch', 'dispatch/rules', 190, 360], ['evenodd', 'Open vs closed', 'dispatch', 'dispatch/evenodd', 318, 360],
    ['grid', 'FP vs OOP grid', 'extend', 'extend/grid', 62, 430], ['extens', 'Extensibility', 'extend', 'extend/extens', 190, 430], ['dd', 'Double dispatch', 'extend', 'extend/dd', 318, 430],
    ['binary', 'Binary methods', 'extend', 'extend/binary', 62, 490], ['multimethod', 'Multimethods', 'extend', 'extend/multi', 190, 490], ['overload', 'Static overloading', 'extend', 'extend/multi', 318, 490],
    ['mi', 'Multiple inheritance', 'mixins', 'mixins/mi', 62, 560], ['mixin', 'Mixins', 'mixins', 'mixins/mixin', 190, 560], ['interface', 'Interfaces', 'mixins', 'mixins/iface', 318, 560],
    ['enumerable', 'Comparable / Enumerable', 'mixins', 'mixins/builtin', 126, 620], ['abstract', 'Abstract methods', 'mixins', 'mixins/iface', 290, 620],
    ['subtyping', 'Subtyping <:', 'subtyping', 'subtyping/records', 62, 690], ['width', 'Width / permutation', 'subtyping', 'subtyping/four', 190, 690], ['depth', 'Depth (unsound)', 'subtyping', 'subtyping/depth', 318, 690],
    ['sound', 'Soundness', 'subtyping', 'subtyping/records', 62, 750], ['javaarray', 'Java arrays / null', 'subtyping', 'subtyping/java', 190, 750], ['funsub', 'Function subtyping', 'subtyping', 'subtyping/functions', 318, 750],
    ['overridetypes', 'Sound overriding', 'generics', 'generics/objects', 62, 820], ['classtype', 'Class vs type', 'generics', 'generics/classtype', 190, 820], ['generics', 'Generics', 'generics', 'generics/versus', 318, 820],
    ['bounded', 'Bounded generics', 'generics', 'generics/versus', 126, 880], ['visitor', 'Visitor pattern', 'generics', 'generics/visitor', 290, 880]
  ];
  // [from, to, why]
  const E = [
    ['pure', 'class', 'Every value is an object, and every object is an instance of a class that holds its methods.'],
    ['class', 'state', 'Methods live in the class; state (@variables) lives in each object and is created by assignment, usually in initialize.'],
    ['state', 'attr', 'Instance variables are private to the object. The only way in from outside is a method: a getter or setter.'],
    ['attr', 'visibility', 'Getters are methods, so they can be public, protected (other instances of the class may call) or private (self only).'],
    ['attr', 'dispatch', 'A getter call is a method call, so a subclass can override it. Code using x instead of @x keeps working for PolarPoint.'],
    ['state', 'alias', 'Variables hold references to objects. Two names for one mutable object: a change through one shows through the other.'],
    ['alias', 'depth', 'Depth subtyping breaks exactly because of aliasing + mutation: one alias has the weaker type and stores a smaller value.'],
    ['pure', 'duck', 'With no static types, a method only needs its arguments to respond to the messages it sends.'],
    ['duck', 'interface', 'Duck typing is the dynamic version of "implements an interface": the requirement exists but is never written down or checked.'],
    ['duck', 'generics', 'In Ruby every method is "generic" for free. Generics are how a static type system buys that flexibility back.'],
    ['array', 'iter', 'Arrays (and hashes, ranges) are processed with each/map/select/inject and a block, not with index loops.'],
    ['array', 'alias', 'push mutates the array in place; + builds a new one. With aliases the difference is visible.'],
    ['block', 'iter', 'An iterator is just a method that calls yield once per element.'],
    ['block', 'proc', 'A block is second-class (one per call, cannot be stored). lambda turns the same code into a first-class Proc object.'],
    ['proc', 'objclosure', 'A closure is an object with one method (call); an object is a bundle of closures sharing fields. Each can encode the other.'],
    ['block', 'abstract', 'A block fills a hole in a method chosen by the caller; an abstract method fills a hole chosen by a subclass.'],
    ['iter', 'enumerable', 'Define each (which yields) and include Enumerable: all the other iterators come for free.'],
    ['class', 'subclass', 'A subclass inherits every method of its superclass, can add more, and can override.'],
    ['subclass', 'override', 'Overriding replaces an inherited method; super calls the version being replaced.'],
    ['subclass', 'isa', 'is_a? is true for the class and all superclasses. Branching on it is the FP style smuggled into OOP.'],
    ['override', 'dispatch', 'Overriding only matters because calls on self are looked up from the receiver\'s class at run time.'],
    ['dispatch', 'lookup', 'The rule: class of the receiver, then (mixins, then) superclasses; run the method with self bound to the receiver.'],
    ['dispatch', 'evenodd', 'Overriding even in B changes inherited odd. Powerful reuse, harder reasoning: methods are "open", functions "closed".'],
    ['dispatch', 'objclosure', 'Objects coded by hand in Racket: send passes the whole object as self, and that alone gives dynamic dispatch.'],
    ['isa', 'dd', 'Double dispatch removes the is_a? chain when the right code depends on the classes of TWO objects.'],
    ['isa', 'grid', 'A chain of is_a? tests is one FP-style function (a column) written inside an OOP program.'],
    ['grid', 'extens', 'FP groups code by operation, OOP by variant. So FP adds operations easily and OOP adds variants easily.'],
    ['extens', 'visitor', 'The visitor pattern lets an OOP program add operations without editing the classes, at the price of harder new variants.'],
    ['grid', 'binary', 'An operation over two variant values has its own n × n grid of cases.'],
    ['binary', 'dd', 'Dispatch only looks at the receiver. Double dispatch calls back on the argument with a method name that encodes the receiver\'s class.'],
    ['dd', 'multimethod', 'Multimethods build in what double dispatch does by hand: choose by the run-time class of every argument.'],
    ['multimethod', 'overload', 'Both allow many methods with one name. Overloading picks at compile time from static types; multimethods at run time.'],
    ['dd', 'visitor', 'accept(visitor) then visitor.visit_x(self) is double dispatch on (node kind, operation).'],
    ['subclass', 'mi', 'One superclass is limiting. Several superclasses bring name clashes and the diamond (one copy of fields or two?).'],
    ['mi', 'mixin', 'Mixins keep most of the reuse of multiple inheritance: many modules of methods, but no fields and one clear lookup order.'],
    ['mi', 'interface', 'Interfaces keep only the typing benefit of multiple inheritance: no code, so nothing can clash.'],
    ['mixin', 'lookup', 'Lookup order becomes: class, its mixins (last included first), superclass, its mixins, ...'],
    ['mixin', 'enumerable', 'The classic mixins: provide <=> or each, get a whole protocol built on that one method.'],
    ['enumerable', 'abstract', 'Comparable calls <=> that it does not define: the including class must supply it, like an abstract method.'],
    ['interface', 'abstract', 'An interface is like a class with only abstract methods, which is why C++ (multiple inheritance) has no separate interfaces.'],
    ['interface', 'classtype', 'Interfaces give subtyping with no subclassing: the clearest sign that types and classes are different things.'],
    ['subtyping', 'width', 'The sound record rules: extra fields, any field order, plus transitivity and reflexivity.'],
    ['subtyping', 'sound', 'A subtyping rule is acceptable only if no well-typed program can then access a missing field.'],
    ['width', 'depth', 'Width adds fields. Depth would change a field\'s type to a subtype: unsound when that field can be assigned.'],
    ['depth', 'javaarray', 'Java allows the depth rule for arrays anyway and pays with a run-time check on every store (ArrayStoreException).'],
    ['sound', 'javaarray', 'Java stays safe but not statically sound: the array-store check and the null check happen at run time.'],
    ['subtyping', 'funsub', 'Functions have subtyping too: contravariant in the argument, covariant in the result.'],
    ['funsub', 'overridetypes', 'A method is a function, so an overriding method may take a more general argument and return a more specific result.'],
    ['depth', 'overridetypes', 'Methods cannot be reassigned, so "depth" subtyping on them is sound; fields are mutable, so their types must not change.'],
    ['override', 'overridetypes', 'Ruby lets an override do anything. A typed language must restrict overriding so substitution stays safe.'],
    ['overridetypes', 'classtype', 'Java makes each class a type and each subclass a subtype, but subclassing (code) and subtyping (substitution) are separate ideas.'],
    ['subtyping', 'generics', 'Different tools: subtyping = "extra is fine"; generics = "the same unknown type in several places".'],
    ['generics', 'bounded', 'Bounded polymorphism combines them: any type T that is a subtype of Pt.'],
    ['depth', 'generics', 'List<ColorPt> is not a subtype of List<Pt>: that would be depth subtyping on a mutable container.'],
    ['generics', 'visitor', 'In typed languages visitors are usually generic in their result type; in Ruby duck typing makes that invisible.']
  ];
  window.MAP = { nodes: N.map(([id, label, topic, lesson, x, y]) => ({ id, label, topic, lesson, x, y })), edges: E.map(([a, b, why]) => ({ a, b, why })) };

  // ---------- side-by-side comparisons ----------
  window.COMPARE = [
    { title: 'Local vs @instance vs @@class vs CONSTANT', html: `<table class="cmp small"><tr><th></th><th>Belongs to</th><th>Created by</th><th>If never assigned</th></tr>
<tr><td><code>x</code></td><td>one method call (or block)</td><td>first assignment</td><td>NameError</td></tr>
<tr><td><code>@x</code></td><td>one object</td><td>first assignment (usually in <code>initialize</code>)</td><td><code>nil</code>, silently</td></tr>
<tr><td><code>@@x</code></td><td>the class: shared by all instances</td><td>assignment in the class</td><td>NameError</td></tr>
<tr><td><code>X</code></td><td>the enclosing class/module (<code>C::X</code>)</td><td>assignment, once</td><td>NameError</td></tr></table>` },
    { title: 'public vs protected vs private', html: `<table class="cmp small"><tr><th></th><th><code>obj.m</code> from outside</th><th><code>other.m</code> inside the class</th><th><code>m</code> on self</th></tr>
<tr><td><b>public</b></td><td>✅</td><td>✅</td><td>✅</td></tr>
<tr><td><b>protected</b></td><td>❌ NoMethodError</td><td>✅</td><td>✅</td></tr>
<tr><td><b>private</b></td><td>❌ NoMethodError</td><td>❌</td><td>✅</td></tr></table>
<p class="small">Instance variables are always private to the object; there is no keyword for them.</p>` },
    { title: 'Block vs Proc/lambda vs method', html: `<table class="cmp small"><tr><th></th><th>Block</th><th>lambda (Proc)</th><th>Method</th></tr>
<tr><td>First-class value?</td><td>no</td><td>yes</td><td>no (belongs to a class)</td></tr>
<tr><td>Called by</td><td><code>yield</code></td><td><code>f.call(x)</code></td><td><code>obj.m(x)</code></td></tr>
<tr><td>Closure over locals?</td><td>yes</td><td>yes</td><td><b>no</b>: a <code>def</code> starts a fresh scope</td></tr>
<tr><td><code>self</code> inside</td><td>same as where it was written</td><td>same as where it was written</td><td>the receiver</td></tr>
<tr><td><code>return</code></td><td>leaves the enclosing method</td><td>leaves the lambda</td><td>leaves the method</td></tr></table>` },
    { title: 'each vs map vs select vs inject', html: `<table class="cmp small"><tr><th></th><th>Block returns</th><th>Call returns</th><th><code>[1,2,3]</code> example</th></tr>
<tr><td><code>each</code></td><td>(ignored)</td><td>the receiver</td><td><code>each { |x| x * 2 }</code> → <code>[1, 2, 3]</code></td></tr>
<tr><td><code>map</code></td><td>new element</td><td>new array</td><td><code>map { |x| x * 2 }</code> → <code>[2, 4, 6]</code></td></tr>
<tr><td><code>select</code></td><td>keep?</td><td>new, shorter array</td><td><code>select { |x| x > 1 }</code> → <code>[2, 3]</code></td></tr>
<tr><td><code>inject</code></td><td>next accumulator</td><td>final accumulator</td><td><code>inject(0) { |a, x| a + x }</code> → <code>6</code></td></tr>
<tr><td><code>any?</code> / <code>all?</code></td><td>test</td><td>true / false</td><td><code>any? { |x| x > 2 }</code> → <code>true</code></td></tr></table>` },
    { title: 'is_a? vs instance_of? vs respond_to?', html: `<table class="cmp small"><tr><th><code>cp = ColorPoint.new(...)</code></th><th>Result</th><th>Asks</th></tr>
<tr><td><code>cp.is_a?(ColorPoint)</code></td><td>true</td><td rowspan="3">class, a superclass, or an included module?</td></tr>
<tr><td><code>cp.is_a?(Point)</code></td><td>true</td></tr>
<tr><td><code>cp.is_a?(Object)</code></td><td>true</td></tr>
<tr><td><code>cp.instance_of?(Point)</code></td><td><b>false</b></td><td>exactly this class?</td></tr>
<tr><td><code>cp.respond_to?(:color)</code></td><td>true</td><td>has a (public) method with this name? The duck-typing question.</td></tr></table>` },
    { title: 'What is looked up how', html: `<table class="cmp small"><tr><th>Thing</th><th>Resolved</th><th>Rule</th></tr>
<tr><td>local variable</td><td>lexically</td><td>enclosing method/block where it is written</td></tr>
<tr><td><code>@x</code></td><td>via <code>self</code></td><td>the current object's own state</td></tr>
<tr><td>method <code>m</code> / <code>self.m</code></td><td><b>dynamically</b></td><td>from the class of the receiver, upward</td></tr>
<tr><td><code>super</code></td><td>dynamically</td><td>continue above the class containing the current method; <code>self</code> unchanged</td></tr>
<tr><td>OCaml/Racket function call</td><td>lexically</td><td>the closure's environment: later definitions cannot change it</td></tr></table>` },
    { title: 'FP vs OOP decomposition', html: `<table class="cmp small"><tr><th></th><th>FP (OCaml)</th><th>OOP (Ruby)</th></tr>
<tr><td>Code grouped by</td><td>operation: one function, a case per variant</td><td>variant: one class, a method per operation</td></tr>
<tr><td>Add an operation</td><td>✅ one new function</td><td>❌ a method in every class</td></tr>
<tr><td>Add a variant</td><td>❌ a case in every function</td><td>✅ one new class</td></tr>
<tr><td>Binary operation</td><td>✅ match on the pair</td><td>double dispatch (n × n methods)</td></tr>
<tr><td>Plan for the hard direction</td><td>"other" case / function arguments</td><td>visitor pattern</td></tr></table>` },
    { title: 'Single dispatch vs double dispatch vs multimethods vs overloading', html: `<table class="cmp small"><tr><th></th><th>Method chosen by</th><th>When</th><th>Where</th></tr>
<tr><td>Dynamic (single) dispatch</td><td>run-time class of the receiver</td><td>run time</td><td>Ruby, Java, ...</td></tr>
<tr><td>Double dispatch</td><td>receiver, then a second call on the argument</td><td>run time (twice)</td><td>a coding pattern in any OOP language</td></tr>
<tr><td>Multimethods</td><td>run-time classes of all arguments</td><td>run time</td><td>Julia, Clojure, CLOS</td></tr>
<tr><td>Static overloading</td><td>compile-time types of the arguments</td><td>compile time</td><td>Java, C++, C#</td></tr></table>` },
    { title: 'Multiple inheritance vs mixins vs interfaces', html: `<table class="cmp small"><tr><th></th><th>Multiple inheritance</th><th>Mixins</th><th>Interfaces</th></tr>
<tr><td>Language</td><td>C++</td><td>Ruby</td><td>Java, C#</td></tr>
<tr><td>Brings methods?</td><td>yes</td><td>yes</td><td>no (signatures only)</td></tr>
<tr><td>Brings fields?</td><td>yes</td><td>should not</td><td>no</td></tr>
<tr><td>Can be instantiated?</td><td>yes (a class)</td><td>no</td><td>no</td></tr>
<tr><td>Main problem</td><td>diamonds, ambiguous methods</td><td>name clashes; hidden assumptions</td><td>no code reuse</td></tr>
<tr><td>Needed for</td><td>reuse from several classes</td><td>reuse (<code>Comparable</code>, <code>Enumerable</code>)</td><td>static type-checking only</td></tr></table>` },
    { title: 'Record subtyping rules', html: `<table class="cmp small"><tr><th>Rule</th><th>Example</th><th>Sound?</th></tr>
<tr><td>Width</td><td><code>{x:int, y:int} &lt;: {x:int}</code></td><td>✅</td></tr>
<tr><td>Permutation</td><td><code>{x:int, y:int} &lt;: {y:int, x:int}</code></td><td>✅</td></tr>
<tr><td>Transitivity</td><td><code>t1 &lt;: t2</code>, <code>t2 &lt;: t3</code> ⟹ <code>t1 &lt;: t3</code></td><td>✅</td></tr>
<tr><td>Reflexivity</td><td><code>t &lt;: t</code></td><td>✅</td></tr>
<tr><td>Depth</td><td><code>{p:{x:int, y:int}} &lt;: {p:{x:int}}</code></td><td>❌ with mutable fields; ✅ if immutable</td></tr></table>` },
    { title: 'Covariant vs contravariant', html: `<table class="cmp small"><tr><th>Position</th><th>May change to a...</th><th>Why</th></tr>
<tr><td>Function / method <b>result</b></td><td>subtype (covariant)</td><td>returning more than promised is harmless</td></tr>
<tr><td>Function / method <b>argument</b></td><td>supertype (contravariant)</td><td>must accept everything callers may pass</td></tr>
<tr><td><b>Mutable</b> field, array element, <code>List&lt;T&gt;</code></td><td>nothing (invariant)</td><td>it is both read (wants covariant) and written (wants contravariant)</td></tr>
<tr><td><b>Immutable</b> field</td><td>subtype (covariant)</td><td>only read</td></tr>
<tr><td><code>self</code> / <code>this</code></td><td>subtype (covariant), specially</td><td>never supplied by callers: always the real receiver</td></tr></table>` },
    { title: 'Generics vs subtyping', html: `<table class="cmp small"><tr><th></th><th>Generics</th><th>Subtyping</th><th>Bounded generics</th></tr>
<tr><td>Says</td><td>any type, the same one throughout</td><td>any type with at least these members</td><td>any type T that is a subtype of B</td></tr>
<tr><td>Typical use</td><td>containers, <code>map</code>, <code>compose</code></td><td>Pt code reused for ColorPt</td><td><code>&lt;T extends Pt&gt; List&lt;T&gt; inCircle(...)</code></td></tr>
<tr><td>Misused as the other</td><td>extra function arguments everywhere</td><td><code>Object</code> + downcasts (run-time failures)</td><td>—</td></tr>
<tr><td>In Ruby</td><td colspan="3">not needed: duck typing gives all three, with errors only at run time</td></tr></table>` }
  ];
})();

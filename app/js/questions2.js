// Question bank part 2: inheritance & dynamic dispatch (ruby3) and extensibility / double dispatch (ruby4).
// "src" containing "final" marks a question adapted from an old exam. Those exams were ported by the course staff
// from Ruby to Racket classes; here they are ported back to Ruby.
(function () {
  const P = window.PRELUDES, Q = window.QUESTIONS;
  P.polar = P.point + `
class PolarPoint < Point
  def initialize(r, theta)   # no call to super: no @x or @y at all
    @r = r
    @theta = theta
  end
  def x
    @r * Math.cos(@theta)
  end
  def y
    @r * Math.sin(@theta)
  end
  def distFromOrigin         # must override: the inherited one reads @x and @y
    @r
  end
  # the inherited distFromOrigin2 already works!
end
class PolarNoOverride < Point
  def initialize(r, theta)
    @r = r
    @theta = theta
  end
  def x
    @r * Math.cos(@theta)
  end
  def y
    @r * Math.sin(@theta)
  end
end`;
  P.coins = `class CoinCollection
end
class Penny < CoinCollection
  def value; 1; end
end
class Nickel < CoinCollection
  def value; 5; end
end
class Dime < CoinCollection
  def value; 10; end
end
class Quarter < CoinCollection
  def value; 25; end
end
class NoCoins < CoinCollection
  def value; 0; end
end
class TwoCollections < CoinCollection
  def initialize(cc1, cc2)
    @cc1 = cc1
    @cc2 = cc2
  end
  def value
    @cc1.value + @cc2.value
  end
end
cs0 = TwoCollections.new(Dime.new, NoCoins.new)
cs1 = TwoCollections.new(Nickel.new, TwoCollections.new(cs0, Nickel.new))`;

  Q.push(
  // ======================= INHERITANCE & DYNAMIC DISPATCH (ruby3) =======================
  { id: 'd-isa', topic: 'dispatch', type: 'predict', src: 'slides', prelude: 'point',
    q: 'Using `Point` and `ColorPoint < Point` from the slides. An object has a class; a class has a superclass.',
    code: `pt = Point.new(0, 0)
cp = ColorPoint.new(0, 0, "red")`,
    parts: [{ ask: 'cp.class', a: 'ColorPoint' }, { ask: 'cp.class.superclass', a: 'Point' }, { ask: 'cp.class.superclass.superclass', a: 'Object' }, { ask: 'cp.is_a? Point', a: 'true' }, { ask: 'cp.instance_of? Point', a: 'false' }, { ask: 'cp.instance_of? ColorPoint', a: 'true' }, { ask: 'pt.is_a? ColorPoint', a: 'false' }],
    explain: 'An instance of ColorPoint **is a** Point (`is_a?` follows the superclass chain) but is **not an instance of** Point (`instance_of?` asks for the exact class). A class with no stated superclass has superclass `Object`.' },

  { id: 'd-isa-style', topic: 'dispatch', type: 'mcq', src: 'slides',
    q: 'Why is using `is_a?` and `instance_of?` usually considered non-OOP style?',
    options: ['It rejects other objects that would have worked because they have the right methods', 'It is slow, because the whole superclass chain is searched on every call', 'It breaks encapsulation, because it reads the private state of the object', 'It only works for built-in classes, not for classes defined by the program'], answer: 0,
    explain: 'Testing the class "disallows other things that act like a duck". OOP style is to **call a method** and let each class respond in its own way (dynamic dispatch) instead of asking what class something is.' },

  { id: 'd-inherit-fields', topic: 'dispatch', type: 'mcq', src: 'slides',
    q: 'A `ColorPoint` has `@x` and `@y`. Where do they come from?',
    options: ['From running `Point#initialize` on the new object, via `super(x, y)`', 'Fields are inherited: every subclass instance starts with the superclass\'s fields', 'From `attr_accessor :x, :y`, which creates the instance variables in each object', 'From `ColorPoint.new`, which copies all instance variables of a template Point'], answer: 0,
    explain: 'In Ruby there is **no such thing as inheriting fields**. A class inherits **methods**. Instance variables exist only because some method (here Point\'s initialize, reached by `super`) assigned to them **in this object**.' },

  { id: 'd-nosuper', topic: 'dispatch', type: 'predict',
    q: 'What if the subclass\'s `initialize` forgets to call `super`?',
    code: `class P
  attr_reader :x
  def initialize(x)
    @x = x
  end
end
class Q < P
  def initialize(x, c)
    @c = c
  end
end`,
    parts: [{ ask: 'P.new(1).x', a: '1' }, { ask: 'Q.new(1, 2).x', a: 'nil' }, { ask: 'Q.new(1, 2).instance_variables', a: '[:@c]' }],
    explain: 'Q overrides `initialize`, so P\'s version never runs and `@x` is never created. The **inherited getter** `x` still exists (methods are inherited) and returns nil. This is exactly how `PolarPoint` ends up with no `@x`/`@y`.' },

  { id: 'd-super', topic: 'dispatch', type: 'predict', src: 'slides', prelude: 'point',
    q: '`ThreeDPoint` overrides `distFromOrigin` using `super`:\n`d = super` then `Math.sqrt(d * d + @z * @z)`.',
    code: ``,
    parts: [{ ask: 'Point.new(3, 4).distFromOrigin', a: '5.0' }, { ask: 'ThreeDPoint.new(3, 4, 12).distFromOrigin', a: '13.0' }, { ask: 'ThreeDPoint.new(3, 4, 12).distFromOrigin2', a: '13.0' }, { ask: 'ThreeDPoint.new(3, 4, 12).z', a: '12' }],
    explain: '`super` calls the method **of the same name** in the superclass (√(9+16) = 5.0), and the override builds on it: √(25 + 144) = 13.0. Code is reused instead of copied.' },

  { id: 'd-polar', topic: 'dispatch', type: 'predict', src: 'slides', prelude: 'polar',
    q: '`PolarPoint < Point` stores `@r` and `@theta`, overrides `x` and `y` to compute them, and overrides `distFromOrigin` to return `@r`. `PolarNoOverride` is the same **without** overriding `distFromOrigin`. (Tap "show helper definitions".)',
    code: `pp = PolarPoint.new(4, 0)
pn = PolarNoOverride.new(4, 0)`,
    parts: [{ ask: 'pp.x', a: '4.0' }, { ask: 'pp.distFromOrigin', a: '4' }, { ask: 'pp.distFromOrigin2', a: '4.0' }, { ask: 'pn.distFromOrigin2', a: '4.0' }, { ask: 'pn.distFromOrigin', a: 'error', err: "undefined method '*' for nil" }],
    explain: 'The inherited `distFromOrigin2` calls `x` and `y` **on self**, so it reaches PolarPoint\'s overrides: √(16.0 + 0.0) = 4.0. The inherited `distFromOrigin` reads `@x` and `@y` directly; a polar point has none (nil), so `nil * nil` fails. That is why PolarPoint must override it.' },

  { id: 'd-polar-why', topic: 'dispatch', type: 'mcq', src: 'slides',
    q: '`distFromOrigin2` is defined only in `Point` as `Math.sqrt(x * x + y * y)`. Why does it give the right answer for a `PolarPoint`?',
    options: ['`x` and `y` are calls on self, and method lookup starts from the class of self', '`PolarPoint#initialize` also stores `@x` and `@y`, so the getters find them', 'Ruby copies inherited methods into the subclass and rewrites `x` to `@r * cos`', 'The call is resolved in `Point`, whose getters convert polar fields on demand'], answer: 0,
    explain: '**Dynamic dispatch** (late binding): a call to `self.m` inside a method defined in class C can resolve to an `m` defined in a **subclass** of C, because the body runs with `self` bound to the receiver and lookup uses the receiver\'s class.' },

  { id: 'd-evenodd', topic: 'dispatch', type: 'predict', src: 'slides',
    q: 'Subclasses can change the behaviour of methods they do **not** override.',
    code: `class A
  def even x
    if x == 0 then true else odd(x - 1) end
  end
  def odd x
    if x == 0 then false else even(x - 1) end
  end
end
class B < A
  def even x ; x % 2 == 0 end
end
class C < A
  def even x ; false end
end`,
    parts: [{ ask: 'A.new.odd(7)', a: 'true' }, { ask: 'B.new.odd(7)', a: 'true' }, { ask: 'C.new.odd(7)', a: 'false' }, { ask: 'C.new.odd(0)', a: 'false' }, { ask: 'A.new.even(4)', a: 'true' }],
    explain: '`odd` is inherited unchanged, but it calls `even` **on self**. In a B that reaches B\'s fast `even` (improves odd). In a C it reaches the broken `even` that always answers false, so `odd(7)` → `even(6)` → false: C **breaks** odd without touching it.' },

  { id: 'd-closed', topic: 'dispatch', type: 'mcq', src: 'slides',
    q: 'In OCaml, after defining mutually recursive `even` and `odd`, you write a new `let even x = false`. Why does `odd` keep working, unlike in the Ruby class `C` above?',
    options: ['Closures are closed: `odd` keeps referring to the `even` in its defining environment', 'OCaml refuses to compile a second top-level definition of the name `even`', 'The typechecker detects that the new `even` would break `odd` and inlines the old one', 'OCaml also uses late binding, but only for functions declared with `rec`'], answer: 0,
    explain: 'A new `let` only **shadows**. The closure for `odd` looks `even` up in the environment where `odd` was defined (lexical scope). In OOP, `self.even` is looked up **at call time in the receiver\'s class**, so overriding changes it.' },

  { id: 'd-lookup-rules', topic: 'dispatch', type: 'mcq', src: 'slides',
    q: 'Which is the correct description of evaluating `e0.m(e1, ..., eN)` in Ruby?',
    options: ['Evaluate e0..eN; find `m` starting from the class of e0\'s value; run it with self = that value', 'Find `m` in the class where the calling code was written; then evaluate e0..eN; run with self = caller', 'Evaluate e0..eN; choose the `m` whose parameter classes best match the classes of e1..eN', 'Evaluate e0; find `m` in the static type of e0; evaluate e1..eN lazily, when first used'], answer: 0,
    explain: '1. Evaluate receiver and arguments to objects. 2. Let C be the **class of the receiver**. 3. Look for `m` in C, then C\'s superclass, and so on (else `method_missing`). 4. Run the body with the parameters bound to the arguments and **self bound to the receiver**: that last step is what implements dynamic dispatch.' },

  { id: 'd-tradeoff', topic: 'dispatch', type: 'explain', src: 'slides',
    q: 'Explain "the OOP trade-off" of dynamic dispatch: what does it cost, and what does it buy?',
    answer: '**Cost:** any method that calls overridable methods on self can have its behaviour changed by a subclass, even though the method itself is not overridden (on purpose or by mistake). So it is **harder to reason about the code you are looking at**. (You can avoid it by disallowing overriding: private or final methods.) **Benefit:** it is **easier for subclasses to change or specialise behaviour without copying code** (PolarPoint reuses distFromOrigin2; B improves odd).',
    explain: 'Compare closures: a closure\'s behaviour is fixed by its definition environment, which is easier to reason about but less extensible.' },

  { id: 'd-overload', topic: 'dispatch', type: 'predict', src: 'slides',
    q: 'Two methods with the same name in one class.',
    code: `class K
  def m(a)
    "one"
  end
  def m(a, b)
    "two"
  end
end`,
    parts: [{ ask: 'K.new.m(1, 2)', a: '"two"' }, { ask: 'K.new.m(1)', a: 'error', err: 'wrong number of arguments (given 1, expected 2)' }],
    explain: 'Ruby has **no static overloading**. Same method name always means overriding/replacing: the second `def m` replaces the first. Java/C++ would keep both and pick one using the **static types** of the arguments.' },

  { id: 'd-what-prints', topic: 'dispatch', type: 'predict',
    q: 'The classic dispatch puzzle: `m1` calls `m2` on self.',
    code: `class A
  def m1; "A.m1 " + m2; end
  def m2; "A.m2"; end
end
class B < A
  def m2; "B.m2"; end
end
class C < B
  def m1; "C.m1 " + super; end
end`,
    parts: [{ ask: 'A.new.m1', a: '"A.m1 A.m2"' }, { ask: 'B.new.m1', a: '"A.m1 B.m2"' }, { ask: 'C.new.m1', a: '"C.m1 A.m1 B.m2"' }],
    explain: 'For `C.new.m1`: C#m1 runs, `super` reaches A#m1 (B has no m1) **with self still the C object**, and A#m1\'s call to `m2` starts looking from class C: C has none, B does. Routine: for every call ask "what is self?", then search up from **self\'s class**.' },

  { id: 'd-final5', topic: 'dispatch', type: 'predict', src: 'Final Q5 (OOP)',
    q: 'Past exam (ported back to Ruby). Class `C`, two subclasses, and a mixin `F`. What does each expression evaluate to?',
    code: `class C
  def initialize
    @foo = 7
  end
  def m1(x, y)
    x + y + @foo
  end
  def m2(z)
    m1(z, z)
  end
end
class D < C
  def m2(z)
    1 + z
  end
end
class E < C
  def m1(x, y)
    x + @foo
  end
end
module F
  def m1(x, y)
    x - y
  end
end
class G < C
  include F
end
class H
  include F
end`,
    parts: [{ ask: 'C.new.m2(3)', a: '13' }, { ask: 'D.new.m2(3)', a: '4' }, { ask: 'E.new.m2(3)', a: '10' }, { ask: 'G.new.m1(7, 3)', a: '4' }, { ask: 'G.new.m2(5)', a: '0' }, { ask: 'H.new.m1(7, 3)', a: '4' }, { ask: 'H.new.m2(5)', a: 'error', err: "undefined method 'm2'" }],
    explain: '`E.new.m2(3)`: m2 is inherited from C but its `m1(z, z)` is a call on self, an E, so E\'s m1 runs: 3 + 7. A subclass can read `@foo` because it is the **same object**. For G, lookup order is G, then its mixin F, then C: F\'s m1 wins, even inside the inherited m2 (5 - 5 = 0). H has F\'s m1 but nobody gives it an m2.' },

  { id: 'd-ivar-lookup', topic: 'dispatch', type: 'mcq', src: 'slides',
    q: 'How are `@x` and `@@x` looked up?',
    options: ['`@x` in the object bound to self; `@@x` using the class of that object', '`@x` in the class where the method was defined; `@@x` in the object bound to self', 'Both in the environment where the method was defined, like local variables', 'Both through the method lookup chain: class, mixins, then superclasses'], answer: 0,
    explain: 'Local variables and blocks use lexical scope (like OCaml/Racket). Instance variables, class variables and methods are more like record fields: they are found **in terms of self**, which is special.' },

  { id: 'd-diy', topic: 'dispatch', type: 'mcq', src: 'slides',
    q: 'In the "DIY objects in Racket" code, an object is `(struct obj (fields methods))` and a method is `(lambda (self args) ...)`. What makes dynamic dispatch work?',
    options: ['`send` passes the **whole receiver** as `self`, and methods call `(send self ...)` rather than each other directly', 'Each method lambda closes over the field list of the object it was created for, so it always sees the right fields', '`send` looks the method up in the constructor function that built the object, then in whatever called that', 'Racket\'s `struct` automatically adds a hidden class pointer to every `obj` value, which `send` then follows'], answer: 0,
    explain: '`(send obj msg . args)` finds the first method named `msg` in `obj`\'s method list and calls it with **obj itself** as `self`. So when an inherited method does `(send self \'get-x)`, the search happens in the full (possibly "subclass") object: late binding, coded by hand.' },

  { id: 'd-diy-override', topic: 'dispatch', type: 'mcq', src: 'slides',
    q: 'In the DIY Racket encoding, how does `make-polar-point` "override" `get-x` of the point it builds on?',
    options: ['It puts its own `get-x` earlier in the method list; `send` uses the first match', 'It mutates the `get-x` pair in the super object with `set-mcdr!`', 'It removes the old `get-x` entry from the list before adding the new one', 'It stores the new `get-x` in the field list, which `send` searches first'], answer: 0,
    explain: 'The "subclass" constructor builds a new `obj` whose method list is `(append new-methods (obj-methods pt))`. `assoc` returns the **first** matching entry, so earlier entries shadow later ones: exactly a subclass before its superclass in the lookup chain.' },

  { id: 'd-why-not-ocaml', topic: 'dispatch', type: 'mcq', src: 'slides',
    q: 'Why was the DIY-objects exercise done in Racket and not in OCaml?',
    options: ['OCaml\'s type system (as covered) has no subtyping and no good type for the `self` arguments', 'OCaml has no closures, so methods taking `self` could not be stored in a list', 'OCaml has no mutation at all, so fields could not be updated by setters', 'OCaml already has dynamic dispatch built in for every function call'], answer: 0,
    explain: 'A polar-point "type" would also have to be a point "type" (subtyping), and `self` needs a type covering every extension. You need a fairly sophisticated type system to support dynamic dispatch if it is not built into the language.' },

  { id: 'd-subclass-alt', topic: 'dispatch', type: 'mcq', src: 'slides',
    q: 'Instead of `class ColorPoint < Point`, you give `ColorPoint` an instance variable `@pt = Point.new(x, y)` and write forwarding methods (`def x; @pt.x; end` …). What is different for clients?',
    options: ['`cp.is_a? Point` is now false, though code that only calls methods still works', 'Nothing can be called any more, because `x` and `y` belong to a different object', '`cp.x = 5` now changes every ColorPoint, because they all share one `@pt`', 'Clients must write `cp.pt.x`, since forwarding methods cannot be public'], answer: 0,
    explain: 'With duck typing, forwarding (composition) "means the same thing if you don\'t rely on `is_a?` and `superclass`". Subclassing is less work here and lets a ColorPoint be used wherever code expects a Point, but OOP programmers often **overuse** subclassing.' },

  { id: 'd-forward', topic: 'dispatch', type: 'write', prelude: 'point',
    q: 'Write `ColorPoint2` **without subclassing** `Point`: keep a `Point` in an instance variable `@pt` and forward `x`, `y` and `distFromOrigin` to it. It also has a `color` getter and setter. `ColorPoint2.new(3, 4, "red")`.',
    starter: `class ColorPoint2

end`,
    answer: `class ColorPoint2
  attr_accessor :color
  def initialize(x, y, c)
    @pt = Point.new(x, y)
    @color = c
  end
  def x
    @pt.x
  end
  def y
    @pt.y
  end
  def distFromOrigin
    @pt.distFromOrigin
  end
end`,
    tests: [{ run: 'c = ColorPoint2.new(3, 4, "red")\np c.x + c.y', expect: '7' }, { run: 'p ColorPoint2.new(3, 4, "red").distFromOrigin', expect: '5.0' }, { run: 'c = ColorPoint2.new(3, 4, "red")\nc.color = "blue"\np c.color', expect: '"blue"' }, { run: 'p ColorPoint2.new(0, 0, "red").is_a?(Point)', expect: 'false' }],
    forbid: [['ColorPoint2\\s*<', 'Do not subclass: use an instance variable holding a Point.']], hint: '`@pt = Point.new(x, y)` in initialize; each forwarding method just sends the same message to `@pt`.',
    explain: 'This is the "use a Point instance variable" alternative from the slides. Duck-typed clients cannot tell the difference; only `is_a?`/`superclass` can.' },

  { id: 'd-method-missing', topic: 'dispatch', type: 'predict',
    q: 'When lookup reaches the top without finding the method, Ruby calls `method_missing`.',
    code: `class Animal
  def speak; "..."; end
end
class Dog < Animal
  def speak; "Woof"; end
end
class Robot
  def method_missing(name, *args)
    "cannot " + name.to_s
  end
end`,
    parts: [{ ask: 'Dog.new.speak', a: '"Woof"' }, { ask: 'Robot.new.fly', a: '"cannot fly"' }, { ask: 'Dog.new.fly', a: 'error', err: "undefined method 'fly'" }],
    explain: 'The default `method_missing` (in Object) raises NoMethodError. A class may override it. Nothing is checked before the program runs: "you can still (try to) call any method on any object".' },

  { id: 'd-super-args', topic: 'dispatch', type: 'predict',
    q: '`super` with and without parentheses.',
    code: `class Base
  def greet(name = "you")
    "hi " + name
  end
end
class Kid < Base
  def greet(name = "kid")
    super + "!"
  end
end
class Kid2 < Base
  def greet(name = "kid")
    super() + "!"
  end
end`,
    parts: [{ ask: 'Kid.new.greet("Al")', a: '"hi Al!"' }, { ask: 'Kid.new.greet', a: '"hi kid!"' }, { ask: 'Kid2.new.greet("Al")', a: '"hi you!"' }],
    explain: 'Bare `super` passes along **the current method\'s arguments** (here `name`, including its default). `super()` passes **no** arguments, so Base uses its own default. `super(x, y)` passes exactly those: that is what `ColorPoint#initialize` does.' },

  { id: 'd-static-overloading', topic: 'dispatch', type: 'mcq', src: 'slides',
    q: 'Java/C++ method lookup is like Ruby\'s, plus static overloading. What does static overloading add?',
    options: ['Several methods may share a name; one is picked at compile time from the static argument types', 'Several methods may share a name; one is picked at run time from the classes of all arguments', 'A subclass may not reuse a method name of its superclass with different parameters', 'The receiver\'s static type, not its run-time class, decides which override runs'], answer: 0,
    explain: 'In Java/C++ overriding only happens when the number/types of arguments match; otherwise the name is **overloaded** and the "best" method is chosen using the **static** types of the arguments. That relies on typechecking, which Ruby does not have.' },

  { id: 'd-objects-closures', topic: 'dispatch', type: 'mcq', src: 'slides',
    q: 'The slides say simple objects "are not so different from closures". What is the **one essential difference** of OOP?',
    options: ['Overriding can make a method defined in the superclass call a method in the subclass', 'Objects can hold several values in their state, a closure can capture only one', 'Objects are created at run time, whereas closures are created at compile time', 'Methods can be recursive, whereas closures cannot refer to themselves'], answer: 0,
    explain: 'Multiple methods, explicit instance variables and inheritance are conveniences you could build with closures. **Dynamic dispatch** is the genuinely new thing: calls on self are resolved through the receiver\'s class.' },

  // ======================= EXTENSIBILITY: FP vs OOP, DOUBLE DISPATCH (ruby4) =======================
  { id: 'e-grid-fp', topic: 'extend', type: 'mcq', src: 'slides',
    q: 'Think of a grid with one **row per variant** (Int, Add, Negate) and one **column per operation** (eval, toString, hasZero). How does a functional program fill it in?',
    options: ['One function per column, each with one branch per variant', 'One function per row, each with one branch per operation', 'One function per cell, collected in a table indexed by variant', 'One class per row, each with one method per operation'], answer: 0,
    explain: 'FP: define a datatype with one constructor per variant, then **one function per operation** that pattern-matches on the variants: the code is organised **by column**.' },

  { id: 'e-grid-oop', topic: 'extend', type: 'mcq', src: 'slides',
    q: 'And how does an object-oriented program fill in the same grid?',
    options: ['One class per row (variant), each with one method per operation', 'One class per column (operation), each with one method per variant', 'One class for the whole grid, with a method for each cell', 'One function per column, each with one branch per variant'], answer: 0,
    explain: 'OOP: one (sub)class per variant, each implementing every operation as a method: the code is organised **by row**. "FP and OOP often do the same thing in exactly the opposite way."' },

  { id: 'e-ext-fp', topic: 'extend', type: 'mcq', src: 'slides',
    q: 'In the **functional** decomposition, what does adding a new variant `Mult` require?',
    options: ['Adding a branch to every existing function (the typechecker can list them)', 'Writing one new function; no existing code has to be touched', 'Nothing: a wildcard branch in each function already handles it correctly', 'Rewriting the datatype as a class hierarchy so that it can be extended'], answer: 0,
    explain: 'Functions make new **operations** easy (one new function) and new **variants** hard (edit every function). If the original code avoided wildcard patterns, OCaml\'s inexhaustive-match warnings give you a to-do list.' },

  { id: 'e-ext-oop', topic: 'extend', type: 'mcq', src: 'slides',
    q: 'In the **object-oriented** decomposition, what does adding a new operation `noNegConstants` require?',
    options: ['Adding a method to every existing class', 'Writing one new class; no existing code has to be touched', 'Writing one new top-level function that tests the class of its argument', 'Nothing: every class inherits a default from `Object` that works'], answer: 0,
    explain: 'Objects make new **variants** easy (one new class) and new **operations** hard (edit every class). In Ruby you can reopen the classes "from the side", but you are still adding a method to each one.' },

  { id: 'e-eval', topic: 'extend', type: 'predict', src: 'slides', prelude: 'exp',
    q: 'The expression evaluator in Ruby (classes `Int`, `Negate`, `Add`, each with `eval`, `toString`, `hasZero`).',
    code: `a = Add.new(Int.new(-5), Int.new(6))`,
    parts: [{ ask: 'a.toString', a: '"(-5 + 6)"' }, { ask: 'a.eval.i', a: '1' }, { ask: 'a.hasZero', a: 'false' }, { ask: 'Negate.new(Add.new(Int.new(1), Int.new(2))).toString', a: '"-((1 + 2))"' }, { ask: 'Negate.new(Add.new(Int.new(1), Int.new(2))).eval.i', a: '-3' }, { ask: 'Add.new(Int.new(0), a).hasZero', a: 'true' }],
    explain: 'Each class answers each message in its own way, and the composite classes just send the same message to their parts (`e1.eval`, `e.toString`): recursion by dynamic dispatch instead of pattern matching.' },

  { id: 'e-nonneg', topic: 'extend', type: 'write', src: 'slides', prelude: 'exp',
    q: 'Add the operation `noNegConstants` to the evaluator **by reopening the classes**: it returns an equivalent expression with no negative constants (`Int.new(-5)` becomes `Negate.new(Int.new(5))`; everything else is rebuilt from converted parts).',
    starter: `class Int
  def noNegConstants

  end
end
class Negate
  def noNegConstants

  end
end
class Add
  def noNegConstants

  end
end`,
    answer: `class Int
  def noNegConstants
    if i < 0
      Negate.new(Int.new(-i))
    else
      self
    end
  end
end
class Negate
  def noNegConstants
    Negate.new(e.noNegConstants)
  end
end
class Add
  def noNegConstants
    Add.new(e1.noNegConstants, e2.noNegConstants)
  end
end`,
    tests: [{ run: 'puts Add.new(Int.new(-5), Int.new(6)).noNegConstants.toString', expect: '(-(5) + 6)' }, { run: 'puts Negate.new(Int.new(-2)).noNegConstants.toString', expect: '-(-(2))' }, { run: 'p Add.new(Int.new(-5), Int.new(6)).noNegConstants.eval.i', expect: '1' }, { run: 'x = Int.new(3)\np x.noNegConstants.equal?(x)', expect: 'true' }],
    hint: 'Int: if `i < 0` build `Negate.new(Int.new(-i))`, else return `self`. The other two classes just rebuild themselves from `noNegConstants` of their parts.',
    explain: 'One new operation = one new method in **every** class: the hard direction for OOP. In OCaml it would be a single new function.' },

  { id: 'e-mult', topic: 'extend', type: 'write', src: 'slides', prelude: 'exp',
    q: 'Add a new **variant** `Mult` (multiplication of two subexpressions) to the evaluator, with `eval`, `toString` (like Add but with `*`) and `hasZero`.',
    starter: `class Mult < Exp

end`,
    answer: `class Mult < Exp
  attr_reader :e1, :e2
  def initialize(e1, e2)
    @e1 = e1
    @e2 = e2
  end
  def eval
    Int.new(e1.eval.i * e2.eval.i)
  end
  def toString
    "(" + e1.toString + " * " + e2.toString + ")"
  end
  def hasZero
    e1.hasZero || e2.hasZero
  end
end`,
    tests: [{ run: 'p Mult.new(Int.new(3), Add.new(Int.new(1), Int.new(1))).eval.i', expect: '6' }, { run: 'puts Mult.new(Int.new(3), Negate.new(Int.new(4))).toString', expect: '(3 * -(4))' }, { run: 'p Mult.new(Int.new(3), Int.new(0)).hasZero', expect: 'true' }, { run: 'p Add.new(Mult.new(Int.new(2), Int.new(5)), Int.new(1)).eval.i', expect: '11' }],
    hint: 'Copy the shape of `Add`: two readers, an initialize, and three methods.',
    explain: 'One new variant = one new class, and **no existing class changes**: the easy direction for OOP. In OCaml every function over `exp` would need a new branch.' },

  { id: 'e-isa-not-oop', topic: 'extend', type: 'mcq', src: 'slides',
    q: 'Why do the slides call this version of `Int#add_values` "not an OOP way"?',
    code: `class Int
  def add_values v
    if v.is_a? Int
      Int.new(v.i + i)
    elsif v.is_a? MyRational
      MyRational.new(v.i + v.j * i, v.j)
    else
      MyString.new(v.s + i.to_s)
    end
  end
end`,
    options: ['It dispatches on the receiver, then falls back to type tests for the other argument', 'It is wrong: `is_a?` is also true for subclasses, so the first branch always runs', 'It mutates `v`, whereas an OOP solution must return a fresh value object', 'It breaks encapsulation by calling the getters `i`, `j` and `s` on another object'], answer: 0,
    explain: 'It is a "hybrid": dynamic dispatch for one argument, then Racket-style type tests for the other. Full OOP style **always solves "what kind of thing is v?" by calling a method on v**. (The slides admit the `is_a?` version "is not that bad": it is just not OOP.)' },

  { id: 'e-dd', topic: 'extend', type: 'predict', src: 'slides', prelude: 'dd',
    q: 'Double dispatch. `Add#eval` is `e1.eval.add_values e2.eval`; each value class defines `add_values`, `addInt`, `addString`, `addRational`. Strings concatenate with anything; otherwise it is arithmetic.',
    code: ``,
    parts: [{ ask: 'Add.new(Int.new(3), MyString.new("x")).eval.toString', a: '"3x"' }, { ask: 'Add.new(MyString.new("x"), Int.new(3)).eval.toString', a: '"x3"' }, { ask: 'Add.new(Int.new(1), MyRational.new(1, 2)).eval.toString', a: '"3/2"' }, { ask: 'Add.new(MyRational.new(1, 2), MyRational.new(1, 3)).eval.toString', a: '"5/6"' }, { ask: 'Add.new(MyString.new("a"), MyRational.new(1, 2)).eval.toString', a: '"a1/2"' }],
    explain: 'The order of the operands is preserved: Int + String is "3x" but String + Int is "x3" (addition of strings is not commutative). 1 + 1/2 = 3/2, and 1/2 + 1/3 = 5/6.' },

  { id: 'e-dd-which', topic: 'extend', type: 'mcq', src: 'slides',
    q: 'For `Add.new(Int.new(3), MyString.new("x")).eval`, which method finally computes the answer `"3x"`?',
    options: ['`MyString#addInt`, called with the Int as its argument', '`Int#addString`, called with the MyString as its argument', '`Int#add_values`, after testing the class of its argument', '`MyString#add_values`, called with the Int as its argument'], answer: 0,
    explain: 'First dispatch: `Int#add_values(v)` (receiver = left value). It calls `v.addInt self`. Second dispatch: `v` is the MyString, so **`MyString#addInt`** runs, with self = the string (right) and argument = the Int (left).' },

  { id: 'e-dd-count', topic: 'extend', type: 'mcq', src: 'slides',
    q: 'With three value classes (`Int`, `MyString`, `MyRational`), how many `addInt` / `addString` / `addRational` methods does the double-dispatch solution need in total?',
    options: ['9: each of the 3 classes defines all 3 of them', '3: one for each of the three value classes', '6: commutative pairs can share a single method', '27: one per ordered triple of the three classes'], answer: 0,
    explain: 'The addition grid is 3 × 3, so there are **9 cases and 9 methods** (plus one `add_values` per class to perform the second dispatch). A commutative case can delegate (e.g. call the other object\'s method) but it is still its own method.' },

  { id: 'e-rps', topic: 'extend', type: 'write',
    q: 'Rock-paper-scissors by **double dispatch**. `a.fight(b)` returns `"win"`, `"lose"` or `"draw"` from **a\'s** point of view. `Paper` and `Scissors` are done (tap "show the full program"). Write `Rock` in the same style: no `is_a?`, no `if`.',
    template: `class Paper
  def fight(other)
    other.fought_by_paper      # "tell" other what we are via the method name
  end
  def fought_by_rock           # a Rock attacked this Paper: result for the ROCK
    "lose"
  end
  def fought_by_paper
    "draw"
  end
  def fought_by_scissors
    "win"
  end
end
class Scissors
  def fight(other)
    other.fought_by_scissors
  end
  def fought_by_rock
    "win"
  end
  def fought_by_paper
    "lose"
  end
  def fought_by_scissors
    "draw"
  end
end
<<ANSWER>>`,
    starter: `class Rock

end`,
    answer: `class Rock
  def fight(other)
    other.fought_by_rock
  end
  def fought_by_rock
    "draw"
  end
  def fought_by_paper
    "win"
  end
  def fought_by_scissors
    "lose"
  end
end`,
    tests: [{ run: 'p Rock.new.fight(Scissors.new)', expect: '"win"' }, { run: 'p Rock.new.fight(Paper.new)', expect: '"lose"' }, { run: 'p Rock.new.fight(Rock.new)', expect: '"draw"' }, { run: 'p Paper.new.fight(Rock.new)', expect: '"win"' }, { run: 'p Scissors.new.fight(Rock.new)', expect: '"lose"' }],
    forbid: [['is_a\\?|instance_of\\?|\\.class|\\bif\\b|\\bcase\\b|\\?', 'No type tests and no conditionals: let the two method calls choose the code.']],
    hint: '`fight` performs the second dispatch: `other.fought_by_rock`. Then define the three `fought_by_...` methods: each returns the result **for the attacker**, when the attacked thing is a Rock.',
    explain: 'Nine cases, nine tiny methods, and the "which case am I in?" question is answered entirely by two dynamic dispatches. `Rock#fought_by_paper` is "win" because the attacker (paper) beats rock.' },

  { id: 'e-multimethods', topic: 'extend', type: 'mcq', src: 'slides',
    q: 'What are multimethods (multiple dispatch), as in Julia?',
    options: ['Several methods share a name; the one called is chosen at run time from the classes of all arguments', 'Several methods share a name; the one called is chosen at compile time from the static argument types', 'One method may be inherited from several superclasses that all define it', 'One method may be given several blocks, and yields to each of them in turn'], answer: 0,
    explain: 'Multimethods take double dispatch "to its logical conclusion": the language itself dispatches on **every** argument, not just the receiver. If dynamic dispatch is the essence of OOP, this is "more OOP". Downside: with subclassing there may be no clear winner.' },

  { id: 'e-static-overload', topic: 'extend', type: 'mcq', src: 'slides',
    q: 'C++ has `race(Lizard, Rabbit)`, `race(Rabbit, Lizard)` and `race(Animal, Animal)`. `void meet(Animal a, Animal b)` calls `race(a, b)`. What does `meet(bayi, sally)` (a Lizard and a Rabbit) use?',
    options: ['`race(Animal, Animal)`: inside `meet` the compiler only knows that a and b are Animals', '`race(Lizard, Rabbit)`: the run-time classes of both arguments are inspected', 'A compile error: the call `race(a, b)` is ambiguous between the three overloads', '`race(Rabbit, Lizard)`: overloads are tried in the reverse order of declaration'], answer: 0,
    explain: '**Static overloading is not multimethods.** The overload is chosen at compile time from the **static types** (`Animal`, `Animal`), so every meeting prints "run???". Julia chooses at run time and prints the specific outcome. In Java/C++ you still need manual double dispatch.' },

  { id: 'e-why-not-ruby', topic: 'extend', type: 'mcq', src: 'slides',
    q: 'Why are multimethods a bad fit for Ruby?',
    options: ['Ruby never allows two methods with the same name, and parameters carry no class restrictions', 'Ruby has no dynamic dispatch on the receiver to extend to the other arguments', 'Ruby resolves every call at compile time, when argument classes are still unknown', 'Ruby classes cannot be reopened, so the extra methods could never be added later'], answer: 0,
    explain: 'In Ruby the same name always means overriding/replacing, and nothing says "this parameter must be an Int", so there is nothing to select on. Duck typing avoids many of the cases anyway. (Libraries can add it.)' },

  { id: 'e-thoughts', topic: 'extend', type: 'mcq', src: 'slides',
    q: 'Which rule of thumb about planning for extension comes from the slides?',
    options: ['Expect new operations: choose FP. Expect new variants: choose OOP.', 'Expect new operations: choose OOP. Expect new variants: choose FP.', 'Expect either kind of extension: OOP handles both without planning.', 'Expect either kind of extension: FP handles both without planning.'], answer: 0,
    explain: 'Each decomposition supports one kind of extension naturally. The other is possible only "awkwardly, if you plan ahead" (extensible datatypes in FP; the Visitor pattern in OOP). And the future is hard to predict.' },

  { id: 'e-sword', topic: 'extend', type: 'explain', src: 'slides',
    q: 'Why do the slides call extensibility a "double-edged sword"?',
    answer: 'Extensible code is **more reusable without being changed later**. But it makes the original code **harder to reason about locally** and **harder to change later**, because a change might break extensions you do not know about. That is why languages offer ways to make code **less** extensible (OCaml modules hiding a datatype, Java\'s `final` preventing subclassing/overriding). Planning for extension can also lead to over-engineering.',
    explain: 'The same tension as the dynamic-dispatch trade-off: flexibility for extenders versus certainty for the reader.' },

  { id: 'e-clothing', topic: 'extend', type: 'predict', src: 'Au18 final Q7 (OOP)',
    q: 'Past exam (ported back to Ruby). The OCaml version says `num_sleeves` is 2 for shirts except tank tops, and 0 for everything else (hats, necklace, gloves). This Ruby port has bugs.',
    code: `class UpperBodyClothing
  def num_sleeves; 0; end
end
class Shirt < UpperBodyClothing
  def num_sleeves; 2; end
  def good_for_hot_day; true; end
end
class LongSleeve < Shirt
  def good_for_hot_day; false; end
end
class TankTop < Shirt
  def num_sleeves; 0; end
end
class Hat < UpperBodyClothing
  def good_for_hot_day; false; end
end
class Summer < Hat
  def good_for_hot_day; true; end
end
class Necklace
  def good_for_hot_day; true; end
end
class Gloves
  def good_for_hot_day; false; end
end`,
    parts: [{ ask: 'LongSleeve.new.num_sleeves', a: '2' }, { ask: 'TankTop.new.num_sleeves', a: '0' }, { ask: 'Summer.new.num_sleeves', a: '0' }, { ask: 'Gloves.new.good_for_hot_day', a: 'false' }, { ask: 'Necklace.new.num_sleeves', a: 'error', err: "undefined method 'num_sleeves'" }],
    explain: 'Official answer: the code is wrong for instances of `Necklace` and `Gloves`: calling `num_sleeves` gives a **method-missing error**, because they do not subclass `UpperBodyClothing` and so never inherit the default. Fix: make both subclasses of it.' },

  { id: 'e-coins-a', topic: 'extend', type: 'predict', src: 'Sp17 final Q6 (OOP)', prelude: 'coins',
    q: 'Past exam (ported back to Ruby). Coin classes each define `value`; `TwoCollections` holds two collections and adds their values. With\n`cs0 = TwoCollections.new(Dime.new, NoCoins.new)`\n`cs1 = TwoCollections.new(Nickel.new, TwoCollections.new(cs0, Nickel.new))`',
    code: ``,
    parts: [{ ask: 'cs0.value', a: '10' }, { ask: 'cs1.value', a: '20' }],
    explain: '5 + ((10 + 0) + 5) = 20. Each object answers `value` in its own way; the composite just asks its parts.' },

  { id: 'e-coins-b', topic: 'extend', type: 'write', src: 'Sp17 final Q6 (OOP)', prelude: 'coins',
    q: 'Same coin classes. Add **three method definitions** (say which classes by reopening them) so that `c.num_coins` is the number of coins in any collection, e.g. `cs1.num_coins` is 3.',
    starter: `class CoinCollection

end`,
    answer: `class CoinCollection
  def num_coins
    1
  end
end
class NoCoins
  def num_coins
    0
  end
end
class TwoCollections
  def num_coins
    @cc1.num_coins + @cc2.num_coins
  end
end`,
    tests: [{ run: 'p cs1.num_coins', expect: '3' }, { run: 'p cs0.num_coins', expect: '1' }, { run: 'p Quarter.new.num_coins', expect: '1' }, { run: 'p NoCoins.new.num_coins', expect: '0' }],
    forbid: [['is_a\\?|instance_of\\?|\\.class', 'No type tests: put the default in the superclass and override it.']],
    hint: 'A default in `CoinCollection` (1 coin) covers Penny, Nickel, Dime and Quarter. Only `NoCoins` and `TwoCollections` need to override it.',
    explain: 'Official solution: `num_coins` = 1 in `CoinCollection`, overridden to 0 in `NoCoins` and to the sum of the parts in `TwoCollections`. A default in the superclass plays the role of a wildcard pattern.' },

  { id: 'e-coins-fp', topic: 'extend', type: 'mcq', src: 'Sp17 final Q7 (OOP vs FP)',
    q: 'Past exam. Porting the coin classes (`Penny`, `Nickel`, `Dime`, `Quarter`, `NoCoins`, `TwoCollections`, with methods `value` and `num_coins`) to OCaml in a functional style gives…',
    options: ['one type with six constructors, and two functions that each match on it', 'six types, one per class, each with its own pair of functions', 'two types (one per method), each with six constructors', 'one type with two constructors, and six functions that match on it'], answer: 0,
    explain: 'Rows become constructors of one datatype (`TwoCollections of coin_collection * coin_collection`), columns become functions: `let rec value cc = match cc with ...` and `numCoins`. The superclass default becomes a wildcard branch `| _ -> 1`.' },

  { id: 'e-lifeform', topic: 'extend', type: 'mcq', src: 'Au17 final Q8 (OOP)',
    q: 'Past exam. Porting this OCaml to OOP with 10 classes (`LifeForm`; `Plant` and `Animal`; `Tree`, `Flower`, `Vine`; `Dog`, `Giraffe`, `Centipede`, `Snake`), where should `is_name_of_a_data_structure` be defined?',
    code: `let is_name_of_a_data_structure lf =
  match lf with
  | Plant Tree -> true
  | _ -> false`,
    options: ['Returning false in `LifeForm`, overridden to return true in `Tree` only', 'Returning false in each of the nine other classes, and true in `Tree`', 'Returning true in `Plant`, overridden to return false in `Flower` and `Vine`', 'Only in `Tree`; the other classes need no definition at all'], answer: 0,
    explain: 'The wildcard `_ -> false` becomes a **default method in the common superclass**; the one special case overrides it. Defining it only in `Tree` would make every other object raise NoMethodError.' },

  { id: 'e-transport', topic: 'extend', type: 'write', src: 'Wi22 final Q7 (FP vs OOP)',
    q: 'Past exam (ported back to Ruby). The OCaml below is ported to 10 classes. `Transport`, `Boat` and the three boats are done (tap "show the full program"). Write `Vehicle`, `Car` and `Truck` in good OOP style (defaults in superclasses, override only what differs).\n`num_wheels`: car 4, truck 4. `is_loud`: vehicles are loud except Car (and Bicycle). `num_doors`: Car 4, Truck 2, everything else 0.',
    template: `# type boat = Sailboat | Motorboat | Cruiseship
# type vehicle = Car | Truck | Bicycle | Motorcycle
# type transport = Boat of boat | Vehicle of vehicle
class Transport
  def num_doors
    0
  end
end
class Boat < Transport
  def num_wheels
    0
  end
  def is_loud
    true
  end
end
class Sailboat < Boat
  def is_loud
    false
  end
end
class Motorboat < Boat
end
class Cruiseship < Boat
  def num_doors
    1000
  end
end
<<ANSWER>>
class Bicycle < Vehicle
  def num_wheels
    2
  end
  def is_loud
    false
  end
end
class Motorcycle < Vehicle
  def num_wheels
    2
  end
end`,
    starter: `class Vehicle < Transport

end
class Car < Vehicle

end
class Truck < Vehicle

end`,
    answer: `class Vehicle < Transport
  def is_loud
    true
  end
end
class Car < Vehicle
  def num_wheels
    4
  end
  def is_loud
    false
  end
  def num_doors
    4
  end
end
class Truck < Vehicle
  def num_wheels
    4
  end
  def num_doors
    2
  end
end`,
    tests: [{ run: 'c = Car.new\np [c.num_wheels, c.is_loud, c.num_doors]', expect: '[4, false, 4]' }, { run: 't = Truck.new\np [t.num_wheels, t.is_loud, t.num_doors]', expect: '[4, true, 2]' }, { run: 'm = Motorcycle.new\np [m.num_wheels, m.is_loud, m.num_doors]', expect: '[2, true, 0]' }, { run: 'p Bicycle.new.is_loud', expect: 'false' }, { run: 'p Truck.instance_methods(false).sort', expect: '[:num_doors, :num_wheels]' }],
    forbid: [['is_a\\?|instance_of\\?|\\.class', 'No type tests.']],
    hint: 'Vehicle only needs the default `is_loud` (true). `num_doors` 0 is already inherited from Transport. Truck is loud by default, so it must NOT redefine `is_loud`.',
    explain: 'Each OCaml wildcard (`| _ -> true`, `| _ -> 0`) becomes a default in a superclass; each specific case becomes an override in one subclass.' },

  { id: 'e-mylist', topic: 'extend', type: 'write', src: 'Sp19 final Q8 (FP vs OOP)',
    q: 'Past exam (ported back to Ruby). OCaml\'s `type \'a mylist = Empty | NonEmpty of \'a * \'a mylist` with `head`, `tail`, `length`, `sum`, `append` and `is_longer` becomes three classes. `MyList` and `Empty` are done (tap "show the full program"). Write `NonEmpty`: it is the only class with state. No mutation, no arrays, no `is_a?`.',
    template: `class MyList
  def is_longer(ys)
    length > ys.length
  end
end
class Empty < MyList
  def head
    raise "head of empty list"
  end
  def tail
    raise "tail of empty list"
  end
  def length
    0
  end
  def sum
    0
  end
  def append(ys)
    ys
  end
end
<<ANSWER>>`,
    starter: `class NonEmpty < MyList
  def initialize(h, t)

  end

end`,
    answer: `class NonEmpty < MyList
  def initialize(h, t)
    @h = h
    @t = t
  end
  def head
    @h
  end
  def tail
    @t
  end
  def length
    1 + @t.length
  end
  def sum
    @h + @t.sum
  end
  def append(ys)
    NonEmpty.new(@h, @t.append(ys))
  end
end`,
    tests: [{ run: 'xs = NonEmpty.new(1, NonEmpty.new(2, Empty.new))\np [xs.head, xs.tail.head, xs.length, xs.sum]', expect: '[1, 2, 2, 3]' }, { run: 'xs = NonEmpty.new(1, NonEmpty.new(2, Empty.new))\nys = NonEmpty.new(10, Empty.new)\nzs = xs.append(ys)\np [zs.length, zs.sum, xs.length]', expect: '[3, 13, 2]' }, { run: 'xs = NonEmpty.new(1, NonEmpty.new(2, Empty.new))\np [xs.is_longer(Empty.new), Empty.new.is_longer(xs)]', expect: '[true, false]' }],
    forbid: [['is_a\\?|instance_of\\?|\\.class|nil\\?|\\[', 'No type tests, no nil checks and no arrays: the recursion ends by dispatching to Empty.']],
    hint: 'Each method does its bit of work and sends the same message to the tail `@t`. The base case is not an `if`: it is the `Empty` class.',
    explain: 'The `match` on `Empty | NonEmpty` disappears: dynamic dispatch picks the branch. `is_longer` lives once in the superclass because it is the same for both variants.' },

  { id: 'e-inttree', topic: 'extend', type: 'write', src: 'Wi23 final Q8 (FP vs OOP)',
    q: 'Past exam (ported back to Ruby). Binary trees with ints at the leaves: `type int_tree = Leaf of int | Node of int_tree * int_tree` with `size`, `map` and `absolute_value_of_all`. `IntTree` and `Leaf` are done (tap "show the full program"). Write `Node`: getters `left` and `right`, `size`, and `map`, which takes a **block** and returns a **new** tree (nothing is mutated).',
    template: `class IntTree
  def absolute_value_of_all
    map { |i| i.abs }
  end
end
class Leaf < IntTree
  attr_reader :i
  def initialize(i)
    @i = i
  end
  def size
    1
  end
  def map
    Leaf.new(yield @i)
  end
end
<<ANSWER>>`,
    starter: `class Node < IntTree
  def initialize(left, right)
    @left = left
    @right = right
  end

end`,
    answer: `class Node < IntTree
  attr_reader :left, :right
  def initialize(left, right)
    @left = left
    @right = right
  end
  def size
    @left.size + @right.size
  end
  def map
    Node.new(@left.map { |i| yield i }, @right.map { |i| yield i })
  end
end`,
    tests: [{ run: 't = Node.new(Leaf.new(-3), Node.new(Leaf.new(4), Leaf.new(-5)))\np t.size', expect: '3' }, { run: 't = Node.new(Leaf.new(-3), Node.new(Leaf.new(4), Leaf.new(-5)))\nu = t.absolute_value_of_all\np [u.left.i, u.right.left.i, u.right.right.i]', expect: '[3, 4, 5]' }, { run: 't = Node.new(Leaf.new(-3), Leaf.new(4))\nu = t.map { |x| x * 2 }\np [u.left.i, u.right.i, t.left.i]', expect: '[-6, 8, -3]' }],
    forbid: [['is_a\\?|instance_of\\?|\\.class', 'No type tests.']],
    hint: 'To pass "my block" on to a child, wrap it in a new block: `@left.map { |i| yield i }`. A bare `@left.map` would pass no block at all.',
    explain: '`absolute_value_of_all` is written once in the superclass and works for both variants because `map` is dispatched dynamically. Note the "necessary block wrapping": a block is not a value you can hand on, so you yield from inside a new block.' },
  );
})();

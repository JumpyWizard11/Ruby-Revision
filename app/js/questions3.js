// Question bank part 3: mixins & multiple inheritance (ruby5), subtyping (ruby6), generics vs subtyping + visitor (ruby7).
// Subtyping questions have no Ruby code to run ("norun"): tools/verify.js checks them with app/js/subtype.js instead.
(function () {
  const P = window.PRELUDES, Q = window.QUESTIONS;
  P.countdown = `class Countdown
  include Enumerable
  def initialize(n)
    @n = n
  end
  def each
    i = @n
    while i > 0
      yield i
      i -= 1
    end
  end
end`;
  const T14 = { t1: '{a:int}', t2: '{a:int, b:int}', t3: '{a:int, b:{c:int}}', t4: '{a:int, b:{c:int, d:int}}' };
  const T14code = `t1 = {a : int}
t2 = {a : int, b : int}
t3 = {a : int, b : {c : int}}
t4 = {a : int, b : {c : int, d : int}}`;
  const FN16 = []; for (const a of ['t1', 't2', 't3', 't4']) for (const b of ['t1', 't2', 't3', 't4']) FN16.push(a + '->' + b);
  const PT = { Pt: '{x:float, y:float}', ColorPt: '{x:float, y:float, color:string}' };
  const yn = 'yes / no';

  Q.push(
  // ======================= MIXINS, MULTIPLE INHERITANCE, INTERFACES (ruby5) =======================
  { id: 'm-def', topic: 'mixins', type: 'mcq', src: 'slides',
    q: 'What is a Ruby **mixin** (a `module` that a class `include`s)?',
    options: ['A collection of methods that you cannot instantiate; including it makes them part of the class', 'A second superclass, so the class gets two parents and a full copy of both parents\' fields', 'A list of method names the class promises to define, checked when the class is loaded', 'A class whose `new` method is private, so only its including classes can create instances'], answer: 0,
    explain: 'A mixin is "just a pile of methods". Less than a class: no `new`, no instances. A class has **one** superclass but may include **any number** of mixins. It is more than an interface, because it brings real method bodies with it.' },

  { id: 'm-doubler', topic: 'mixins', type: 'predict', src: 'slides',
    q: 'The `Doubler` example from the slides. The mixin calls `+` on `self`, whatever `self` turns out to be.',
    code: `module Doubler
  def double
    self + self      # assumes the including class defines +
  end
end
class Pt
  attr_accessor :x, :y
  include Doubler
  def + other
    ans = Pt.new
    ans.x = self.x + other.x
    ans.y = self.y + other.y
    ans
  end
end
class String
  include Doubler
end
pt = Pt.new
pt.x = 3
pt.y = 4`,
    parts: [{ ask: 'pt.double.x', a: '6' }, { ask: 'pt.double.double.y', a: '16' }, { ask: '"hi".double', a: '"hihi"' }, { ask: 'pt.is_a?(Doubler)', a: 'true' }],
    explain: '`double` is found in the mixin, but `self + self` is an ordinary method call on `self`, so it uses **Pt\'s** `+` or **String\'s** `+`: dynamic dispatch again. Mixin methods can call methods the class has (and vice versa). `is_a?` is true for included modules too.' },

  { id: 'm-lookup', topic: 'mixins', type: 'predict', src: 'slides',
    q: 'Method lookup with mixins. Which `who` wins?',
    code: `module A
  def who
    "A"
  end
end
module B
  def who
    "B"
  end
end
class Base
  def who
    "Base"
  end
end
class C < Base
  include A
  include B
end
class D < Base
  include A
  def who
    "D"
  end
end`,
    parts: [{ ask: 'C.new.who', a: '"B"' }, { ask: 'D.new.who', a: '"D"' }, { ask: 'C.ancestors.take(4)', a: '[C, B, A, Base]' }],
    explain: 'Lookup order: the object\'s **class** first, then the **mixins** that class includes (**later includes shadow earlier ones**), then the superclass, then the superclass\'s mixins, and so on. So `C` (no `who` of its own) finds `B`\'s before `A`\'s, and both before `Base`\'s. `D` defines `who` itself, which beats everything.' },

  { id: 'm-lookup-rule', topic: 'mixins', type: 'mcq', src: 'slides',
    q: 'Class `C < Base` includes mixin `M`. `C`, `M` and `Base` all define method `m`. In which order does `C.new.m` look?',
    options: ['`C`, then `M`, then `Base`: a class\'s mixins sit between it and its superclass', '`M`, then `C`, then `Base`: an included mixin overrides the class that includes it', '`C`, then `Base`, then `M`: mixins are only a fallback after the whole class chain', '`Base`, then `M`, then `C`: lookup starts at the top and the last definition wins'], answer: 0,
    explain: 'The class itself always comes first, so a class can override a method from a mixin it includes. The mixin comes **before the superclass**, so a mixin method overrides an inherited one. (This is why including a mixin cannot change a method the class defines itself.)' },

  { id: 'm-super', topic: 'mixins', type: 'predict',
    q: 'A mixin method that calls `super`. Careful: where does the mixin sit in each lookup chain?',
    code: `module Loud
  def speak
    super.upcase + "!"
  end
end
class Animal
  def speak
    "hello"
  end
end
class Dog < Animal
  include Loud
end
class Cat < Animal
  include Loud
  def speak
    "meow"
  end
end`,
    parts: [{ ask: 'Dog.new.speak', a: '"HELLO!"' }, { ask: 'Cat.new.speak', a: '"meow"' }, { ask: 'Cat.ancestors.take(3)', a: '[Cat, Loud, Animal]' }],
    explain: 'For a `Dog`, lookup finds `speak` in `Loud` (between Dog and Animal); its `super` continues up the chain to `Animal#speak`. For a `Cat`, the class\'s own `speak` is found **first**, so `Loud#speak` never runs. An *included* module can wrap inherited methods, but never the including class\'s own methods.' },

  { id: 'm-ivar', topic: 'mixins', type: 'mcq', src: 'slides',
    q: 'A mixin\'s methods can read and write instance variables such as `@count`. Why do the slides call this bad style?',
    options: ['They become variables of the including object and may clash with its own `@count`', 'Each mixin gets its own hidden object, so the state is silently shared by all classes', 'Instance variables in modules are read-only, so every assignment raises an error', 'Ruby copies the variable into every subclass, which wastes memory for big programs'], answer: 0,
    explain: 'A mixin has no object of its own. `@count` inside a mixin method is simply `self`\'s `@count`. If the class (or another mixin) also uses the name `@count` for something else, they overwrite each other with no warning. Mixins that only **call methods** on `self` are much safer.' },

  { id: 'm-comparable', topic: 'mixins', type: 'predict', src: 'slides', prelude: 'house',
    q: '`House` (tap "show the full program") includes `Comparable` and defines only `<=>`: by price, then by square feet.',
    code: `h1 = House.new(300, 80)
h2 = House.new(500, 60)
h3 = House.new(300, 95)`,
    parts: [{ ask: 'h1 < h2', a: 'true' }, { ask: 'h3 <= h1', a: 'false' }, { ask: 'h3.between?(h1, h2)', a: 'true' }, { ask: 'h1 == House.new(300, 80)', a: 'true' }, { ask: '[h1, h2, h3].max.price', a: '500' }, { ask: '[h2, h3, h1].sort.map { |h| h.sqft }', a: '[80, 95, 60]' }],
    explain: '`Comparable` supplies `<`, `<=`, `>`, `>=`, `==` and `between?`, every one written in terms of `<=>`. `House` only had to say how two houses compare (`-1`, `0` or `1`). `sort` and `max` on an array also just call `<=>` on the elements.' },

  { id: 'm-comparable-needs', topic: 'mixins', type: 'mcq', src: 'slides',
    q: 'What must a class provide so that `include Comparable` gives it working `<`, `>`, `==` and `between?`?',
    options: ['A `<=>` method returning a negative number, zero or a positive number', 'Both a `<` method and an `==` method; the others are derived from those two', 'An `each` method that yields the object\'s elements in sorted order', 'A `to_s` method, because objects are compared by their printed form'], answer: 0,
    explain: 'The deal with `Comparable`: you write the one "spaceship" method `<=>`, it writes all the comparison operators. The deal with `Enumerable` is the same idea with `each`.' },

  { id: 'm-enum', topic: 'mixins', type: 'predict', src: 'slides', prelude: 'countdown',
    q: '`Countdown` (tap "show the full program") defines only `each`, which yields n, n-1, ..., 1, and includes `Enumerable`.',
    code: `c = Countdown.new(4)`,
    parts: [{ ask: 'c.map { |x| x * x }', a: '[16, 9, 4, 1]' }, { ask: 'c.select { |x| x.even? }', a: '[4, 2]' }, { ask: 'c.include?(3)', a: 'true' }, { ask: 'c.inject(0) { |acc, x| acc + x }', a: '10' }, { ask: 'c.sort', a: '[1, 2, 3, 4]' }, { ask: 'c.any? { |x| x > 4 }', a: 'false' }],
    explain: '`Enumerable` builds `map`, `select`, `include?`, `inject`, `sort`, `any?`, `to_a`, ... all on top of **your** `each`. The results are plain arrays, in the order `each` yielded the elements (4, 3, 2, 1).' },

  { id: 'm-enum-needs', topic: 'mixins', type: 'mcq', src: 'slides',
    q: 'A `BinaryTree` class wants `map`, `select`, `include?` and `to_a`. What is the least work that achieves it?',
    options: ['Define `each` (yield every element) and `include Enumerable`', 'Subclass `Array`, then override `[]` and `length` for the tree', 'Define `map` and `include Comparable` to derive the others', 'Define `<=>` on trees and `include Enumerable` to get iteration'], answer: 0,
    explain: 'Every `Enumerable` method is written in terms of `each`. (Only a few of them, such as `sort`, `min` and `max`, also need the **elements** to respond to `<=>`.) The mixin makes "a new kind of collection" a 10-line job.' },

  { id: 'm-version', topic: 'mixins', type: 'write',
    q: 'Write class `Version` with getters `major` and `minor` (`Version.new(2, 5)`). Versions compare by `major` first, then `minor`. Get `<`, `>`, `==`, `between?` ... **from a mixin** instead of writing them yourself.',
    starter: `class Version

end`,
    answer: `class Version
  include Comparable
  attr_reader :major, :minor
  def initialize(major, minor)
    @major = major
    @minor = minor
  end
  def <=>(other)
    c = major <=> other.major
    return c if c != 0
    minor <=> other.minor
  end
end`,
    hint: 'Include `Comparable` and define just `<=>`. Integers already have `<=>`: `3 <=> 5` is -1.',
    require: [['include\\s+Comparable', 'use `include Comparable`'], ['<=>', 'define `<=>`']], forbid: [['def\\s+(<|>|==|between\\?)\\s*[\\s(]', 'do not define `<`, `>`, `==` or `between?` yourself: the mixin does that']],
    tests: [{ run: 'p Version.new(2, 5) < Version.new(3, 0)', expect: 'true' }, { run: 'p Version.new(2, 5) > Version.new(2, 10)', expect: 'false' }, { run: 'p Version.new(1, 4) == Version.new(1, 4)', expect: 'true' }, { run: 'p Version.new(2, 5).between?(Version.new(2, 0), Version.new(2, 9))', expect: 'true' }, { run: 'p [Version.new(3, 1), Version.new(1, 9), Version.new(3, 0)].max.minor', expect: '1' }],
    explain: 'This is exactly the `House` pattern from the slides. One method (`<=>`) plus one line (`include Comparable`) buys the whole comparison protocol, and `sort`, `min`, `max` on arrays of versions work too.' },

  { id: 'm-sentence', topic: 'mixins', type: 'write',
    q: 'Class `Sentence` stores a string. Make it a collection of its **words**: after your changes `Sentence.new("the quick fox").map { |w| w.length }` must be `[3, 5, 3]`, and `select`, `include?`, `sort`, `to_a` must work too. Write only one method yourself. (`"a b".split(" ")` gives `["a", "b"]`.)',
    starter: `class Sentence
  def initialize(text)
    @text = text
  end

end`,
    answer: `class Sentence
  include Enumerable
  def initialize(text)
    @text = text
  end
  def each
    @text.split(" ").each { |w| yield w }
  end
end`,
    hint: 'Define `each` so it yields every word, and `include Enumerable`.',
    require: [['include\\s+Enumerable', 'use `include Enumerable`'], ['def\\s+each', 'define `each`']], forbid: [['def\\s+(map|select|include\\?|sort|to_a)\\b', 'only define `each`: the mixin provides the rest']],
    tests: [{ run: 'p Sentence.new("the quick fox").map { |w| w.length }', expect: '[3, 5, 3]' }, { run: 'p Sentence.new("the quick fox").include?("fox")', expect: 'true' }, { run: 'p Sentence.new("pear apple fig").sort', expect: '["apple", "fig", "pear"]' }, { run: 'p Sentence.new("a bb ccc dd").select { |w| w.length == 2 }', expect: '["bb", "dd"]' }, { run: 'p Sentence.new("x y").to_a', expect: '["x", "y"]' }],
    explain: 'Inside your own `each` you have to pass each element on to the caller\'s block: `{ |w| yield w }`. Then `Enumerable` supplies the dozens of iterator methods.' },

  { id: 'm-simpleint', topic: 'mixins', type: 'predict', src: 'like Wi23 final Q7',
    q: 'A home-made comparison mixin. It never defines `compare`; it just calls it.',
    code: `module CompareOps
  def lt?(other)
    compare(other) < 0
  end
  def max_with(other)
    if lt?(other) then other else self end
  end
end
class SimpleInt
  include CompareOps
  attr_reader :n
  def initialize(n)
    @n = n
  end
  def compare(other)
    @n - other.n
  end
end
class Blob
  include CompareOps
end
three = SimpleInt.new(3)
five = SimpleInt.new(5)`,
    parts: [{ ask: 'three.lt?(five)', a: 'true' }, { ask: 'five.lt?(three)', a: 'false' }, { ask: 'three.max_with(five).n', a: '5' }, { ask: 'five.max_with(three).n', a: '5' }, { ask: 'Blob.new.lt?(Blob.new)', a: 'error', err: "undefined method 'compare'" }],
    independent: true,
    explain: 'The mixin **assumes** every including class has a `compare(other)` that returns a negative number, zero or a positive number. Nothing checks this assumption when `Blob` includes the module: the failure only appears at run time, when `lt?` actually sends `compare` to a `Blob`.' },

  { id: 'm-assumes', topic: 'mixins', type: 'mcq', src: 'like Wi23 final Q7',
    q: 'A mixin defines `def smallest?(arr) arr.all? { |x| compare(x) <= 0 } end`. What does it require of a class that includes it?',
    options: ['Instances must respond to `compare`, returning a number; nothing checks this up front', 'The class must subclass `Comparable`, otherwise the `include` line raises an error', 'The class must declare `compare` as abstract so that Ruby can type-check the mixin', 'Nothing: `compare` is inherited from `Object`, so every Ruby object already has it'], answer: 0,
    explain: 'Exam answers for "what does this mixin assume?" always have the same shape: *the including class must define method X, taking ... and returning ...*. In Ruby that contract lives only in comments (duck typing); an interface in Java would make the type-checker enforce it.' },

  { id: 'm-extcomp', topic: 'mixins', type: 'write', src: 'Sp19 final Q7',
    q: 'Write a mixin `ExtendedComparable` for classes that already have `<` and `>`. It adds:\n- `strictly_between?(lo, hi)`: true if `self` is greater than `lo` and less than `hi`\n- `less_than_all?(arr)`: true if `self` is less than **every** element of the array `arr`\n\nThe tests include it in `Integer` and `String`.',
    starter: `module ExtendedComparable

end`,
    answer: `module ExtendedComparable
  def strictly_between?(lo, hi)
    self > lo && self < hi
  end
  def less_than_all?(arr)
    arr.all? { |x| self < x }
  end
end`,
    template: `<<ANSWER>>
class Integer
  include ExtendedComparable
end
class String
  include ExtendedComparable
end`,
    hint: 'Inside a mixin, `self` is the object the method was called on. `arr.all? { |x| ... }` is true if the block is true for every element.',
    require: [['module\\s+ExtendedComparable', 'define `module ExtendedComparable`']], forbid: [['\\bclass\\b', 'write a module, not a class'], ['is_a\\?|instance_of\\?', 'no type tests: rely on `<` and `>`']],
    tests: [{ run: 'p 5.strictly_between?(1, 9)', expect: 'true' }, { run: 'p 5.strictly_between?(5, 9)', expect: 'false' }, { run: 'p 9.strictly_between?(1, 9)', expect: 'false' }, { run: 'p "m".strictly_between?("a", "z")', expect: 'true' }, { run: 'p 2.less_than_all?([3, 8, 5])', expect: 'true' }, { run: 'p 5.less_than_all?([3, 8, 5])', expect: 'false' }, { run: 'p "a".less_than_all?(["b", "c"])', expect: 'true' }, { run: 'p 7.less_than_all?([])', expect: 'true' }],
    explain: 'The mixin never mentions a class: it only sends `<` and `>` to `self`, so it works for any class with those methods (integers, strings, the `House` class, ...). That is the whole point of a mixin: write the derived methods **once**.' },

  { id: 'm-myany', topic: 'mixins', type: 'write', src: 'Au18 final Q6',
    q: 'Class `Pair` (tap "show the full program") has an `each` that yields its two elements. Write mixin `AddAny` with method `my_any?`: it takes a block and returns `true` if the block returns a true value for **at least one** element, else `false`. Use only `each` (not the built-in `any?`).',
    starter: `module AddAny
  def my_any?

  end
end`,
    answer: `module AddAny
  def my_any?
    found = false
    each { |x| found = true if yield x }
    found
  end
end`,
    template: `<<ANSWER>>
class Pair
  include AddAny
  def initialize(e1, e2)
    @e1 = e1
    @e2 = e2
  end
  def each
    yield @e1
    yield @e2
  end
end
class Array
  include AddAny
end`,
    hint: 'Keep a local flag. Call `each` with a block that does `yield x` (passing the element on to the caller\'s block) and sets the flag.',
    require: [['\\beach\\b', 'use `each`'], ['yield', 'call the caller\'s block with `yield`']], forbid: [['[.\\s]any\\?', 'do not use the built-in `any?`'], ['@e1|@e2', 'the mixin must not touch Pair\'s instance variables: it should work for any class with `each`']],
    tests: [{ run: 'p Pair.new(3, 8).my_any? { |x| x > 5 }', expect: 'true' }, { run: 'p Pair.new(3, 4).my_any? { |x| x > 5 }', expect: 'false' }, { run: 'p Pair.new(9, 1).my_any? { |x| x > 5 }', expect: 'true' }, { run: 'p [1, 2, 3].my_any? { |x| x == 2 }', expect: 'true' }, { run: 'p [].my_any? { |x| true }', expect: 'false' }, { run: 'p Pair.new(nil, false).my_any? { |x| x }', expect: 'false' }],
    explain: 'The block given to `each` is a closure, so it can assign to the local variable `found` of `my_any?`. `yield x` inside that block calls the block that was passed to `my_any?`. Because the mixin only uses `each`, it works for `Pair`, `Array` and anything else that can enumerate itself.' },

  { id: 'm-any-short', topic: 'mixins', type: 'predict', src: 'Au18 final Q6',
    q: 'Two ways to write `any?` for a `Pair`. They return the same answer, but are they *equivalent*? Count how often the block runs.',
    code: `class Pair
  def initialize(e1, e2)
    @e1 = e1
    @e2 = e2
  end
  def each
    yield @e1
    yield @e2
  end
  def any_flag
    found = false
    each { |x| found = true if yield x }
    found
  end
  def any_or
    (yield @e1) || (yield @e2)
  end
end
pr = Pair.new(7, 9)
calls1 = 0
r1 = pr.any_flag { |x| calls1 += 1; x > 5 }
calls2 = 0
r2 = pr.any_or { |x| calls2 += 1; x > 5 }`,
    parts: [{ ask: 'r1', a: 'true' }, { ask: 'calls1', a: '2' }, { ask: 'r2', a: 'true' }, { ask: 'calls2', a: '1' }],
    explain: '`||` **short-circuits**: once `yield @e1` is true, the second `yield` never happens. The `each`-with-a-flag version always visits every element. Same result, but not equivalent if the block has side effects (printing, counting, mutation) or is slow. This was the "are they equivalent?" part of the exam question.' },

  { id: 'm-mi-diamond', topic: 'mixins', type: 'mcq', src: 'slides',
    q: 'With **multiple inheritance**, `ColorPt3D` extends both `ColorPt` and `Pt3D`, which both extend `Pt`. What is the hard question this "diamond" raises?',
    options: ['Should the object have one copy of `Pt`\'s fields or two, and which overridden method wins', 'Whether `Pt` can still be instantiated once two different classes have subclassed it', 'How the constructor of `ColorPt3D` can run before the constructors of its two parents', 'Whether `ColorPt` and `Pt3D` are allowed to add fields that have different names'], answer: 0,
    explain: 'Two paths lead to `Pt`. For `x` and `y` you want **one** copy; but in other examples (the slides\' `ArtistCowboy`, whose parents each have a `@pocket`) you want **two**. And if both parents override the same method, which does the child inherit? C++ answers with extra language features; Ruby and Java avoid the problem by allowing one superclass only.' },

  { id: 'm-cowboy', topic: 'mixins', type: 'mcq', src: 'slides',
    q: '`Artist` has `draw` (make a picture) and `Cowboy` has `draw` (pull out a gun). With multiple inheritance, class `ArtistCowboy` extends both. What goes wrong?',
    options: ['Two unrelated methods share one name, so `draw` on an `ArtistCowboy` is ambiguous', 'Neither `draw` is inherited, because methods with the same name cancel each other out', 'The two `draw` bodies are merged and both run, in the order the parents were listed', 'Nothing: static overloading selects the right `draw` from the type of the receiver'], answer: 0,
    explain: 'The methods merely share a name; neither is "the same method, overridden". The language must pick one, force the programmer to choose, or reject the class. Mixins have the same name-clash risk, but with a simple fixed rule (the lookup order), and no copies-of-fields question because mixins should not have fields.' },

  { id: 'm-interfaces', topic: 'mixins', type: 'mcq', src: 'slides',
    q: 'Java has **interfaces**. Why would they be pointless in Ruby?',
    options: ['An interface only helps a static type-checker, and Ruby has none: any object can be passed anywhere', 'Ruby classes may have several superclasses, which already covers what interfaces do', 'Ruby modules cannot list method names without bodies, so interfaces cannot be written', 'Ruby checks at load time that every class defines all the methods its callers will use'], answer: 0,
    explain: 'A Java interface is a **type**: it lets a method accept "anything that implements `Comparable`" and still type-check. It contains no code, so it raises none of the multiple-inheritance problems. In a dynamically typed language you can already pass any object; if it responds to the message, fine (duck typing), if not you get `NoMethodError` at run time.' },

  { id: 'm-abstract', topic: 'mixins', type: 'predict', src: 'slides',
    q: '"Required overriding": `Shape#describe` calls a method that only subclasses define.',
    code: `class Shape
  def describe
    "A shape with area " + area.to_s
  end
end
class Square < Shape
  def initialize(side)
    @side = side
  end
  def area
    @side * @side
  end
end`,
    parts: [{ ask: 'Square.new(3).describe', a: '"A shape with area 9"' }, { ask: 'Shape.new.describe', a: 'error', err: "undefined local variable or method 'area'" }],
    independent: true,
    explain: '`Shape` is "abstract" only by convention. Ruby lets you create a `Shape`; things break when `describe` reaches the call of `area` (a `NameError`). A statically typed language needs **abstract methods**: it can then type-check `describe`, and it forbids `new Shape()` so the missing method can never be called.' },

  { id: 'm-abstract-hof', topic: 'mixins', type: 'mcq', src: 'slides',
    q: 'The slides say abstract methods and higher-order functions are closely related. In what way?',
    options: ['Both let general code call code supplied later: by a subclass, or by a function argument', 'Both are checked only at run time, so neither helps a static type-checker in any way', 'Both need multiple inheritance, which is why OCaml and Ruby support neither of them', 'Both remove dynamic dispatch, because the method to call is known when compiling'], answer: 0,
    explain: 'A superclass method that calls an abstract method is a "template with a hole": the subclass fills the hole by overriding. A higher-order function is a template whose hole is a parameter: the caller fills it by passing a function. Same idea, expressed with dispatch vs. with closures.' },

  { id: 'm-cpp', topic: 'mixins', type: 'mcq', src: 'slides',
    q: 'Why does C++ have no separate notion of interface?',
    options: ['It has multiple inheritance, so a class with only abstract methods does the job', 'It is dynamically typed like Ruby, so an interface would never be type-checked', 'Its templates are expanded at run time, which makes interfaces unnecessary', 'It forbids abstract methods, so there would be nothing for an interface to list'], answer: 0,
    explain: 'A Java interface is essentially a class with **only abstract methods**. Java needs a special construct because a class can extend just one class. C++ allows many superclasses, so a programmer simply inherits from several all-abstract ("pure virtual") classes.' },

  { id: 'm-compare', topic: 'mixins', type: 'explain', src: 'slides',
    q: 'Compare **multiple inheritance**, **mixins** and **interfaces**: what does each give you, and what problem does each have or avoid?',
    answer: '**Multiple inheritance** (C++): several superclasses, so you inherit methods *and fields* from all of them. Most powerful, but raises hard questions: diamonds (one copy of the shared ancestor\'s fields or two?) and which method wins when both parents define it.\n\n**Mixins** (Ruby): one superclass plus any number of modules that contribute *methods only*. You get most of the code reuse (`Comparable`, `Enumerable`) with a simple lookup rule (class, its mixins latest-first, superclass, ...). Mixins should avoid instance variables, and a mixin silently assumes the class defines certain methods.\n\n**Interfaces** (Java): a class may implement any number of them, but they contain *no code*, only method types. No semantic problems at all, yet they let the type-checker accept one object in many roles. Useless in a dynamically typed language.',
    explain: 'Remember it as a ladder: interfaces share **types**, mixins share **methods**, multiple inheritance shares **methods and fields**. Each step up adds reuse and adds trouble.' },

  { id: 'm-mixin-vs-super', topic: 'mixins', type: 'mcq',
    q: 'You have classes `Temperature`, `Money` and `Version`, each with its own superclass, and all three need `<`, `>`, `between?`. Why a mixin instead of a shared superclass?',
    options: ['A class has only one superclass, already in use here; it may include any number of mixins', 'Methods inherited from a superclass cannot call methods that the subclass defines', 'A superclass would force all three classes to share the same instance variables', 'Mixin methods are found before the class\'s own methods, so they run faster'], answer: 0,
    explain: 'Single inheritance means the one superclass slot is precious. Behaviour that cuts across unrelated classes ("is comparable", "is enumerable") goes in a mixin. (Inherited methods *can* call subclass methods: that is dynamic dispatch.)' },

  // ======================= SUBTYPING (ruby6) =======================
  { id: 's-width', topic: 'subtyping', type: 'predict', norun: true, src: 'slides',
    q: 'Record subtyping in the lecture\'s little language. Is the left type a **subtype** of the right one? Answer yes or no.',
    code: `# t1 <: t2 means: a value of type t1 may be used
# wherever a value of type t2 is expected.`,
    parts: [
      { ask: '{x:float, y:float, color:string}  <:  {x:float, y:float}', sub: ['{x:float, y:float, color:string}', '{x:float, y:float}'], a: 'yes', ph: yn },
      { ask: '{x:float, y:float}  <:  {x:float, y:float, color:string}', sub: ['{x:float, y:float}', '{x:float, y:float, color:string}'], a: 'no', ph: yn },
      { ask: '{y:float, x:float}  <:  {x:float, y:float}', sub: ['{y:float, x:float}', '{x:float, y:float}'], a: 'yes', ph: yn },
      { ask: '{x:float}  <:  {x:float}', sub: ['{x:float}', '{x:float}'], a: 'yes', ph: yn },
      { ask: '{x:float, y:float}  <:  {x:float, z:float}', sub: ['{x:float, y:float}', '{x:float, z:float}'], a: 'no', ph: yn }],
    explain: '**Width**: a record with *extra* fields is a subtype (code that only reads `x` and `y` cannot be hurt by a `color`). **Permutation**: field order is irrelevant. **Reflexivity**: every type is a subtype of itself. The subtype has **more** fields: "sub" means *more specific*, not *smaller*.' },

  { id: 's-rules', topic: 'subtyping', type: 'mcq', src: 'slides',
    q: 'We know `{x:float, y:float, z:float} <: {x:float, y:float}` and `{x:float, y:float} <: {x:float}`. Which rule lets us conclude `{x:float, y:float, z:float} <: {x:float}` from those two facts?',
    options: ['Transitivity: if `t1 <: t2` and `t2 <: t3` then `t1 <: t3`', 'Permutation: fields of a record type may be reordered freely', 'Reflexivity: every type is a subtype of itself', 'Depth: a field\'s type may be replaced by a subtype'], answer: 0,
    explain: 'The four sound record rules are width, permutation, transitivity and reflexivity. (Here width alone would also do it directly, but chaining two known facts is transitivity.) Depth subtyping is the famous one that is **not** sound when fields are mutable.' },

  { id: 's-good-bad', topic: 'subtyping', type: 'mcq', src: 'slides',
    q: 'What is the job of a subtyping rule, according to the lecture?',
    options: ['Accept more programs, but never one that could access a field that is not there', 'Reject more programs, so that fewer run-time checks are needed for field access', 'Convert a value to the supertype by deleting the fields the supertype lacks', 'Tell the compiler how to lay out records so that field access is fast'], answer: 0,
    explain: 'Subtyping is about **substitutability**: if `t1 <: t2`, any `t1` value can be used as a `t2`. The rules add flexibility to the type system (more programs type-check) and must keep it **sound**: a well-typed program never gets stuck on a missing field. Nothing is converted or copied.' },

  { id: 's-depth', topic: 'subtyping', type: 'mcq', src: 'slides',
    q: 'Suppose we allowed **depth** subtyping with mutable fields. Which line gets stuck at run time?\n\n```\nfun setToOrigin (c : {center:{x:float,y:float}, r:float}) =\n  c.center = {x=0.0, y=0.0}                        (* 1 *)\nval sphere : {center:{x:float,y:float,z:float}, r:float} =\n  {center={x=3.0, y=4.0, z=0.0}, r=1.0}            (* 2 *)\nval _ = setToOrigin(sphere)                         (* 3 *)\nval _ = sphere.center.z                             (* 4 *)\n```',
    options: ['Line 4: `sphere.center` is now a record that has no `z` field', 'Line 1: a record with only `x` and `y` cannot be stored in `center`', 'Line 3: `sphere` has the wrong number of fields in its `center`', 'Line 2: a 3-D centre cannot be given to a record with field `r`'], answer: 0,
    explain: 'Every line type-checks **if** depth subtyping is allowed (line 3 needs it). Line 1 legitimately stores a 2-D point into what it believes is a 2-D centre. But `c` and `sphere` are **aliases**, so the sphere\'s centre has silently lost its `z`. Line 4, which the type system promised was fine, has no field to read.' },

  { id: 's-choose', topic: 'subtyping', type: 'mcq', src: 'slides',
    q: 'The slides say that for depth subtyping you can "choose two of three". Which three things cannot all hold?',
    options: ['Setting a field, depth subtyping on that field, and a sound type system', 'Width subtyping, permutation subtyping, and a sound type system', 'Reading a field, width subtyping on records, and aliasing', 'Function subtyping, depth subtyping, and reflexivity'], answer: 0,
    explain: 'With **mutation + depth**, soundness is lost (the sphere example). Keep **mutation + soundness** and you must ban depth (the lecture\'s language, and Java fields). Keep **depth + soundness** and fields must be immutable (as in OCaml-style records): then nobody can replace a field by a "smaller" value.' },

  { id: 's-immutable', topic: 'subtyping', type: 'predict', norun: true, src: 'like Au18 final Q8',
    q: 'Depth subtyping depends on mutability. Answer yes or no for each line: first for the lecture\'s language where fields are **mutable**, then for a language whose fields are all **immutable**.',
    code: `# is  {a : {x:int, y:int}, b : int}  <:  {a : {x:int}}  ?`,
    parts: [
      { ask: 'mutable fields:  {b:int, a:{x:int}}  <:  {a:{x:int}}', sub: ['{b:int, a:{x:int}}', '{a:{x:int}}'], a: 'yes', ph: yn },
      { ask: 'mutable fields:  {a:{x:int, y:int}, b:int}  <:  {a:{x:int}}', sub: ['{a:{x:int, y:int}, b:int}', '{a:{x:int}}'], a: 'no', ph: yn },
      { ask: 'immutable fields:  {a:{x:int, y:int}, b:int}  <:  {a:{x:int}}', sub: ['{a:{x:int, y:int}, b:int}', '{a:{x:int}}'], opts: { immutable: true }, a: 'yes', ph: yn },
      { ask: 'immutable fields:  {a:{x:int}}  <:  {a:{x:int, y:int}}', sub: ['{a:{x:int}}', '{a:{x:int, y:int}}'], opts: { immutable: true }, a: 'no', ph: yn }],
    explain: 'Width (dropping `b`) is always fine. Changing the type of field `a` to a supertype is **depth** subtyping: unsound with mutable fields, sound when no field can ever be assigned. Even then it only goes one way: the subtype\'s field must be a *subtype*, never a supertype.' },

  { id: 's-readonly', topic: 'subtyping', type: 'mcq', src: 'like Sp17 final Q9',
    q: 'A language marks some record fields `readonly` (they can be read but never assigned). For which fields is depth subtyping sound?',
    options: ['Only the `readonly` fields: without assignment nobody can store a "too small" value', 'Only the mutable fields: assignments are checked, so they keep the record valid', 'All fields: marking any single field readonly makes the whole record immutable', 'No fields: depth subtyping is unsound whether or not fields can be assigned'], answer: 0,
    explain: 'The counterexample to depth subtyping **needs an assignment** through the supertype view (`c.center = {x=0.0, y=0.0}`). If that field cannot be assigned, the counterexample cannot be written, and reading a field at a supertype is harmless. Mutable fields must stay invariant.' },

  { id: 's-java-array', topic: 'subtyping', type: 'mcq', src: 'slides',
    q: 'Java allows `ColorPoint[] <: Point[]` (depth subtyping on mutable arrays). Where does this program fail?\n\n```java\nvoid m1(Point[] arr) {\n  arr[0] = new Point(3, 4);          // A\n}\nString m2(int x) {\n  ColorPoint[] cs = new ColorPoint[x];\n  m1(cs);                            // B\n  return cs[0].color;                // C\n}\n```',
    options: ['At A, at run time: storing a `Point` into a `ColorPoint[]` throws `ArrayStoreException`', 'At B, at compile time: a `ColorPoint[]` is rejected where a `Point[]` is required', 'At C, at run time: the `Point` object stored in `cs[0]` has no `color` field', 'Nowhere: the program is accepted and `m2` returns the default colour string'], answer: 0,
    explain: 'Java **chose** the unsound rule (line B type-checks) and repairs it at run time: every array remembers its element type, and **every store** into an array is checked. So the failure comes early, at A, as an `ArrayStoreException`, and line C can keep trusting that `cs[0]` is a `ColorPoint`. The price: a run-time check on each array write, and a type error the type-checker did not catch.' },

  { id: 's-java-why', topic: 'subtyping', type: 'mcq', src: 'slides',
    q: 'Why did Java\'s designers allow array subtyping like `ColorPoint[] <: Point[]` even though it needs run-time checks?',
    options: ['Before generics, it was the only way to write methods that work on arrays of any element type', 'It makes array reads faster, because the element type no longer has to be checked on a read', 'It was needed for `null`, which must be storable in an array of any element type', 'It lets the compiler prove that an `ArrayStoreException` can never be thrown'], answer: 0,
    explain: 'Early Java had no generics. A method like "sort any array" or "copy any array" had to take `Object[]`, which only works if every `T[]` is a subtype of `Object[]`. Flexibility was bought with soundness; generics later did the job properly.' },

  { id: 's-null', topic: 'subtyping', type: 'mcq', src: 'slides',
    q: 'In Java, `null` can be used where any object type is expected, yet it has no fields or methods. What does that mean for the type system?',
    options: ['It is like a subtype with *fewer* members, so each field access or call needs a run-time null check', 'It is sound, since `null` is a record with every possible field, each one holding `null`', 'It only matters for arrays, because `null` cannot be stored in an ordinary variable', 'It is checked at compile time, so a `NullPointerException` can only come from casts'], answer: 0,
    explain: 'Subtypes are supposed to have *at least* what the supertype has. `null` has nothing, but is allowed everywhere. So "the type-checker guarantees the field exists" has an exception, paid for with a check on every dereference and the familiar `NullPointerException`. Option types (OCaml) keep "might be missing" visible in the type instead.' },

  { id: 's-fun-rule', topic: 'subtyping', type: 'mcq', src: 'slides',
    q: 'When is the function type `t1 -> t2` a subtype of `t3 -> t4`?',
    options: ['When `t3 <: t1` and `t2 <: t4`: arguments contravariant, results covariant', 'When `t1 <: t3` and `t2 <: t4`: arguments covariant, results covariant', 'When `t3 <: t1` and `t4 <: t2`: arguments contravariant, results contravariant', 'When `t1 <: t3` and `t4 <: t2`: arguments covariant, results contravariant'], answer: 0,
    explain: 'A substitute function must **accept at least** every argument the original accepted (so its argument type may be a *supertype*: contravariant) and must **return something at least as good** (its result type may be a *subtype*: covariant). "Be liberal in what you take, strict in what you return."' },

  { id: 's-fun', topic: 'subtyping', type: 'predict', norun: true, src: 'slides', types: PT,
    q: 'Function subtyping. `ColorPt <: Pt` by width. Is the left function type a subtype of the right one? (Imagine passing the left function to code that expects the right type.)',
    code: `Pt      = {x : float, y : float}
ColorPt = {x : float, y : float, color : string}`,
    parts: [
      { ask: 'Pt -> ColorPt  <:  Pt -> Pt', sub: ['Pt -> ColorPt', 'Pt -> Pt'], a: 'yes', ph: yn },
      { ask: 'Pt -> Pt  <:  Pt -> ColorPt', sub: ['Pt -> Pt', 'Pt -> ColorPt'], a: 'no', ph: yn },
      { ask: 'ColorPt -> Pt  <:  Pt -> Pt', sub: ['ColorPt -> Pt', 'Pt -> Pt'], a: 'no', ph: yn },
      { ask: 'Pt -> Pt  <:  ColorPt -> Pt', sub: ['Pt -> Pt', 'ColorPt -> Pt'], a: 'yes', ph: yn },
      { ask: 'Pt -> ColorPt  <:  ColorPt -> Pt', sub: ['Pt -> ColorPt', 'ColorPt -> Pt'], a: 'yes', ph: yn },
      { ask: 'ColorPt -> ColorPt  <:  Pt -> Pt', sub: ['ColorPt -> ColorPt', 'Pt -> Pt'], a: 'no', ph: yn }],
    explain: 'Returning **more** than promised is fine (line 1). Requiring **more** of the argument than the caller will supply is not (line 3: the caller passes a plain `Pt`, the function reads `.color`). Requiring **less** is fine (line 4). Line 5 uses both at once: needs less, returns more. Line 6 has a good result but a bad argument, and one bad side is enough.' },

  { id: 's-final8a', topic: 'subtyping', type: 'predict', norun: true, src: 'final Q8(a)', types: T14,
    q: 'Records are mutable: width and permutation subtyping, **no depth** subtyping. For each question list all of t1, t2, t3, t4 that qualify (a type counts as a subtype and supertype of itself).',
    code: T14code,
    parts: [
      { ask: 'subtypes of t1', subsOf: 't1', a: 't1, t2, t3, t4', set: true, ph: 'e.g. t1, t3' },
      { ask: 'supertypes of t1', supersOf: 't1', a: 't1', set: true },
      { ask: 'subtypes of t2', subsOf: 't2', a: 't2', set: true },
      { ask: 'supertypes of t2', supersOf: 't2', a: 't1, t2', set: true },
      { ask: 'subtypes of t3', subsOf: 't3', a: 't3', set: true },
      { ask: 'supertypes of t3', supersOf: 't3', a: 't1, t3', set: true },
      { ask: 'subtypes of t4', subsOf: 't4', a: 't4', set: true },
      { ask: 'supertypes of t4', supersOf: 't4', a: 't1, t4', set: true }],
    explain: 'Everything with an `a:int` field is a subtype of `t1` (width). `t2`, `t3` and `t4` all have a field `b`, but with three **different types** (`int`, `{c:int}`, `{c:int,d:int}`). Without depth subtyping a field\'s type must match exactly, so none of them is a subtype of another. The trap is `t4 <: t3`: tempting, but that is depth subtyping on mutable field `b`.' },

  { id: 's-final8b', topic: 'subtyping', type: 'predict', norun: true, src: 'final Q8(b)', types: T14,
    q: 'Same four record types (no depth subtyping). Now consider **function types** built from them: every `ti -> tj`. List all that qualify, e.g. `t2->t2, t3->t1`.',
    code: T14code,
    parts: [
      { ask: 'supertypes of t2 -> t2', supersOf: 't2->t2', among: FN16, a: 't2->t2, t2->t1', set: true, ph: 'e.g. t2->t2, t3->t1' },
      { ask: 'subtypes of t2 -> t2', subsOf: 't2->t2', among: FN16, a: 't2->t2, t1->t2', set: true },
      { ask: 'supertypes of t2 -> t4', supersOf: 't2->t4', among: FN16, a: 't2->t4, t2->t1', set: true },
      { ask: 'subtypes of t2 -> t4', subsOf: 't2->t4', among: FN16, a: 't2->t4, t1->t4', set: true }],
    explain: 'Use the rule mechanically. **Supertype** of `A -> R`: argument a *subtype* of A, result a *supertype* of R. **Subtype** of `A -> R`: argument a *supertype* of A, result a *subtype* of R. From part (a): t2\'s only subtype is t2, its supertypes are t1 and t2; t4\'s only subtype is t4, its supertypes are t1 and t4. Combine the two lists for each answer.' },

  { id: 's-rel', topic: 'subtyping', type: 'predict', norun: true, src: 'like Wi23 final Q9', types: { A: '{x:int}', B: '{x:int, y:int}' },
    q: 'For each pair, is the **first** type a `subtype` of the second, a `supertype` of it, `both`, or `neither`? Mutable records: width and permutation only.',
    code: `A = {x : int}
B = {x : int, y : int}`,
    parts: [
      { ask: 'B   vs   A', rel: ['B', 'A'], a: 'subtype', ph: 'subtype / supertype / both / neither' },
      { ask: '{x:int, y:int}   vs   {y:int, x:int}', rel: ['{x:int, y:int}', '{y:int, x:int}'], a: 'both' },
      { ask: '{p : A}   vs   {p : B}', rel: ['{p:A}', '{p:B}'], a: 'neither' },
      { ask: 'A -> int   vs   B -> int', rel: ['A -> int', 'B -> int'], a: 'subtype' },
      { ask: 'int -> A   vs   int -> B', rel: ['int -> A', 'int -> B'], a: 'supertype' },
      { ask: '(B -> int) -> int   vs   (A -> int) -> int', rel: ['(B -> int) -> int', '(A -> int) -> int'], a: 'subtype' },
      { ask: 'A -> B   vs   B -> A', rel: ['A -> B', 'B -> A'], a: 'subtype' },
      { ask: '{x:int}   vs   {y:int}', rel: ['{x:int}', '{y:int}'], a: 'neither' }],
    explain: '`B <: A` by width. Permuted records are subtypes of each other. `{p:A}` vs `{p:B}` would need depth: neither. `A -> int <: B -> int`: the argument flips (contravariant), needing `B <: A`. `int -> A` is a *supertype* of `int -> B` (results covariant). For the higher-order pair, flip twice: we need `A -> int <: B -> int`, which holds. `A -> B <: B -> A` needs `B <: A` for the argument and `B <: A` for the result: both hold.' },

  { id: 's-finite', topic: 'subtyping', type: 'predict', norun: true, src: 'like Wi22 final Q8',
    q: 'Width and permutation subtyping, no depth. Does each type have a `finite` or an `infinite` number of subtypes / supertypes? (Field order does not make a different type.)',
    code: `t = {a : int, b : int}`,
    parts: [
      { ask: 'subtypes of t', a: 'infinite', manual: true, ph: 'finite / infinite' },
      { ask: 'supertypes of t', a: 'finite', manual: true },
      { ask: 'subtypes of t -> int', a: 'finite', manual: true },
      { ask: 'supertypes of t -> int', a: 'infinite', manual: true },
      { ask: 'supertypes of int -> t', a: 'finite', manual: true }],
    explain: 'A record type has **infinitely many subtypes** (keep adding fields: `{a:int,b:int,c:int}`, ...) but only **finitely many supertypes** (drop fields: `{a:int}`, `{b:int}`, `{}` and t itself). For functions, the argument flips: subtypes of `t -> int` need an argument that is a *supertype* of t (finitely many); supertypes need an argument that is a *subtype* of t (infinitely many). `int -> t` has supertypes `int -> (a supertype of t)`: finite.' },

  { id: 's-contra', topic: 'subtyping', type: 'explain', src: 'slides',
    q: 'Explain, with an example, why function subtyping is **contravariant** in the argument type. Why would the "natural" covariant rule be unsound?',
    answer: 'Suppose we allowed `ColorPt -> float <: Pt -> float` (covariant arguments). Take `f = fun (c : ColorPt) -> String.length c.color`... any function that reads the `color` field. With the bad rule we may pass `f` to code expecting a `Pt -> float`. That code is entitled to call it with a plain `{x=3.0, y=4.0}`. Now `f` runs and accesses `.color` on a record that has no such field: stuck.\n\nThe sound rule goes the other way: a function that accepts **any Pt** can safely stand in where only ColorPts will ever be passed, because every ColorPt is a Pt. So `Pt -> float <: ColorPt -> float`: the *function* subtype has the *argument* supertype.',
    explain: 'Exam recipe: (1) write a function that uses the extra field, (2) pass it where the supertype of its argument is expected, (3) show the caller supplying a value without that field. Results are the easy direction: returning more than promised never hurts.' },

  { id: 's-fun-flex', topic: 'subtyping', type: 'mcq', src: 'slides',
    q: '`distMoved` takes `f : Pt -> Pt` and a point `p`, and computes how far `f p` is from `p`. Which function may soundly be passed as `f`?',
    options: ['One of type `Pt -> ColorPt`: its result has the `x` and `y` that `distMoved` reads', 'One of type `ColorPt -> Pt`: it gets a point and may read the `color` field from it', 'One of type `ColorPt -> ColorPt`: both sides are subtypes, so the whole type is too', 'One of type `{x:float} -> {x:float}`: fewer fields on both sides is always safe'], answer: 0,
    explain: '`distMoved` calls `f` with a plain `Pt` and reads `x`, `y` of the result. Returning a `ColorPt` (extra field) is harmless: covariant results. A function wanting a `ColorPt` argument would look for `color` on a plain point: not allowed. `{x:float} -> {x:float}` has a fine argument type (it needs less) but its result lacks `y`.' },

  { id: 's-dynamic', topic: 'subtyping', type: 'mcq', src: 'slides',
    q: 'Why does the subtyping lecture switch to a made-up typed record language instead of using Ruby?',
    options: ['Subtyping is a question for static type systems, and Ruby does not have one', 'Ruby objects cannot have fields added, so width subtyping cannot be shown', 'Ruby has no functions as values, so function subtyping would be impossible', 'Ruby already enforces depth subtyping at run time, hiding the unsoundness'], answer: 0,
    explain: 'In Ruby nothing is checked before running: any object can be passed anywhere, and a missing method is found only when it is called. Subtyping asks "which substitutions can a **static** checker allow without risking that error?", so a small typed language with records makes the rules visible.' },

  { id: 's-subst', topic: 'subtyping', type: 'mcq', src: 'slides',
    q: 'How does subtyping get used in the lecture\'s type system?',
    options: ['One new rule: if `e` has type `t1` and `t1 <: t2`, then `e` also has type `t2`', 'Every existing typing rule is rewritten to mention the subtype relation directly', 'The programmer writes an explicit upcast wherever a supertype is expected', 'The type-checker copies the value and removes fields the supertype lacks'], answer: 0,
    explain: 'All other typing rules stay exactly as they were. Subtyping is added as a separate relation `t1 <: t2` plus the single "subsumption" rule that lets an expression of a subtype be viewed at a supertype. That keeps the design modular: to add flexibility you only add subtyping rules.' },

  // ======================= GENERICS vs SUBTYPING, VISITOR (ruby7) =======================
  { id: 'g-obj-records', topic: 'generics', type: 'mcq', src: 'slides',
    q: 'Objects are like records with fields and methods. Why is it sound for an overriding **method** to have a more specific result type, while a **field** must keep exactly the same type in a subclass?',
    options: ['Methods are immutable slots (so depth subtyping is safe); fields can be assigned', 'Methods are looked up dynamically, and anything looked up at run time is sound', 'Fields are private in every OOP language, so their types cannot be compared', 'Method types are erased by the compiler, so they are never actually checked'], answer: 0,
    explain: 'Depth subtyping is sound for **immutable** record fields. An object\'s method "slots" cannot be reassigned from outside, so a subclass may give a method a *subtype* of the original method type: contravariant arguments, covariant result. Fields are mutable, so their types must be invariant (the sphere example again).' },

  { id: 'g-java-rules', topic: 'generics', type: 'mcq', src: 'slides',
    q: 'Sound theory would let an overriding method take a **more general** argument type and return a **more specific** result. What do Java and C# actually allow?',
    options: ['Covariant results, but argument types must be identical (otherwise it is overloading)', 'Both contravariant arguments and covariant results, exactly as the theory says', 'Neither: an overriding method must repeat the full method type exactly', 'Covariant arguments and covariant results, checked with run-time casts'], answer: 0,
    explain: 'Java lets an override *return* a subtype. But a method with different argument types is treated as a **different method** (static overloading), not an override. So Java is more restrictive than necessary, by choice. (Covariant *arguments* would be unsound.)' },

  { id: 'g-class-type', topic: 'generics', type: 'mcq', src: 'slides',
    q: 'The slides insist that a **class** and a **type** are different concepts. What is the difference?',
    options: ['A class defines an object\'s behaviour; a type describes which fields and methods it has', 'A class exists only at compile time; a type is the object\'s tag while the program runs', 'A class can have subclasses; a type can never be a subtype of another type', 'A class is used in dynamically typed languages; a type replaces it in static ones'], answer: 0,
    explain: 'Subclassing is about **inheriting code**; subtyping is about **substitutability**. Java and C# confuse the two on purpose: each class name is also a type name and each subclass is also a subtype. But you could have subtypes that share no code (interfaces), or (in other languages) code reuse without subtyping.' },

  { id: 'g-self', topic: 'generics', type: 'mcq', src: 'slides',
    q: 'In a subclass method, `self`/`this` has the **subclass** type. `self` is like an extra argument, and arguments should be contravariant. Why is this covariance sound anyway?',
    options: ['Callers never choose `self`: it is always the receiver, which really is a subclass instance', 'The compiler inserts a run-time cast on `self` at the top of every inherited method', 'Subclass methods cannot use `self` to reach fields that the subclass added', '`self` is immutable, and every immutable argument may be treated covariantly'], answer: 0,
    explain: 'The danger of covariant arguments is a caller passing a "too general" value. For `self` that cannot happen: a method defined in class `B` is only ever reached by dispatch on an object that is a `B` (or a subclass of it). So the special treatment of `self` is sound, and it is what makes dynamic dispatch type-check.' },

  { id: 'g-generics-good', topic: 'generics', type: 'mcq', src: 'slides',
    q: 'Which job is **generics** (parametric polymorphism, `\'a`) the right tool for?',
    options: ['Saying that several types in a signature are the *same* unknown type, as in `compose` or a list', 'Passing a value with extra fields to code that was written for values with fewer fields', 'Letting one method body run different code depending on the run-time class of an argument', 'Checking at run time that a value taken out of a collection has the type we hoped for'], answer: 0,
    explain: 'Generics shine for **combining functions** (`(\'b -> \'c) * (\'a -> \'b) -> (\'a -> \'c)`), **containers** (`\'a list`, `Pair<A,B>`), and anything where types must *relate to each other*. "Extra fields are fine" is subtyping\'s job. Each is a poor replacement for the other.' },

  { id: 'g-lamepair', topic: 'generics', type: 'mcq', src: 'slides',
    q: 'Without generics, Java code wrote `class LamePair { Object x; Object y; ... }`. What is wrong with using subtyping to fake a generic pair?',
    options: ['Getting a component back needs a downcast, which can fail at run time instead of compile time', 'A `LamePair` can only hold two values of the same class, never a `String` with an `Integer`', 'The pair cannot be passed to a method, because `Object` is not a subtype of anything', 'Storing a value in the pair copies it, so mutations of the original are lost'], answer: 0,
    explain: '`String s = (String)(p.y);` compiles even when `y` holds an `Integer`; the mistake appears as a `ClassCastException` at run time. With `Pair<String,Integer>` the type-checker knows what comes out and catches the error. Faking generics with subtyping throws away static checking.' },

  { id: 'g-subtyping-good', topic: 'generics', type: 'mcq', src: 'slides',
    q: 'Which job is **subtyping** the right tool for?',
    options: ['Reusing code that expects a `Pt` on values with *more*, such as a `ColorPt`', 'Writing `swap` so that its result type mentions both components\' types', 'Giving `map` a type that links the list\'s elements to the function\'s argument', 'Guaranteeing that a list contains elements of exactly one type and no other'], answer: 0,
    explain: 'Subtyping = "code that needs a `t2` also works with any `t1 <: t2`". Geometry on points works for coloured points; GUI code works for every widget subclass. The other three need type *variables* that relate positions in a signature: generics.' },

  { id: 'g-list-inv', topic: 'generics', type: 'mcq', src: 'slides',
    q: 'In Java, `ColorPt` is a subtype of `Pt`, yet `List<ColorPt>` is **not** a subtype of `List<Pt>`. Why must it be that way?',
    options: ['Code holding it as a `List<Pt>` could add a plain `Pt`, breaking the `List<ColorPt>` view', 'Generic types are erased, so the compiler cannot tell the two list types apart', 'Lists copy their elements, so a `ColorPt` would lose its colour when it is added', 'Subtyping in Java is only defined between classes that have no type parameters'], answer: 0,
    explain: 'A mutable list is a record with a mutable field. `List<ColorPt> <: List<Pt>` would be **depth subtyping on mutable data**, the same unsoundness as the sphere example and Java arrays. Generic types are therefore *invariant* in Java.' },

  { id: 'g-bounded', topic: 'generics', type: 'mcq', src: 'slides',
    q: 'We want a method that takes a list of points, keeps those inside a circle, and still works (and keeps the precise type) for a `List<ColorPt>`. Which signature does that?',
    options: ['`<T extends Pt> List<T> inCircle(List<T> pts, Pt center, double r)`', '`List<Pt> inCircle(List<Pt> pts, Pt center, double r)`', '`<T> List<T> inCircle(List<T> pts, Pt center, double r)`', '`List<Object> inCircle(List<Object> pts, Pt center, double r)`'], answer: 0,
    explain: '**Bounded polymorphism** combines the two ideas. `List<Pt>` rejects a `List<ColorPt>` (invariance). A plain `<T>` accepts anything, but then the body may not call `distance` on a `T`. The bound `T extends Pt` says "any type T, as long as it is a subtype of Pt": the body may use T as a Pt, and the caller gets a `List<ColorPt>` back.' },

  { id: 'g-ruby', topic: 'generics', type: 'mcq',
    q: 'Why does Ruby need neither generics nor subtyping rules to write a method that works on a "pair of anything" or a "list of points or colour points"?',
    options: ['It is dynamically typed: nothing is checked until a method is actually sent to an object', 'Ruby infers the most general generic type for every method, as OCaml does', 'Every Ruby container is declared with a type parameter that defaults to `Object`', 'Ruby arrays check each store and raise `ArrayStoreException` for wrong elements'], answer: 0,
    explain: 'Generics and subtyping are both ways to make a **static** type system flexible enough to accept more correct programs. With no static types, every method is "generic" and every argument is "substitutable" for free. The price is that mistakes show up as `NoMethodError` at run time.' },

  { id: 'g-visitor', topic: 'generics', type: 'predict', src: 'slides', prelude: 'visitor',
    q: 'The **visitor pattern** (tap "show the full program"): each node class has `accept(visitor)`, which calls `visitor.visit_constant(self)` or `visitor.visit_add(self)`.',
    code: `e = Add.new(Constant.new(3), Constant.new(4))
big = Add.new(e, Add.new(Constant.new(10), e))`,
    parts: [{ ask: 'e.accept(EvalVisitor.new)', a: '7' }, { ask: 'e.accept(PrintVisitor.new)', a: '"(3 + 4)"' }, { ask: 'big.accept(EvalVisitor.new)', a: '24' }, { ask: 'big.accept(PrintVisitor.new)', a: '"((3 + 4) + (10 + (3 + 4)))"' }, { ask: 'Constant.new(5).accept(PrintVisitor.new)', a: '"5"' }],
    explain: 'The node decides **which visit method** to call (it knows what kind of node it is); the visitor decides **what to do** for that kind. `visit_add` recurses by sending `accept(self)` to the children, so the same visitor walks the whole tree.' },

  { id: 'g-visitor-dd', topic: 'generics', type: 'mcq', src: 'slides',
    q: '`node.accept(visitor)` followed by `visitor.visit_add(self)`. How does this relate to double dispatch?',
    options: ['It *is* double dispatch: one dispatch on the node\'s class, then one on the visitor\'s class', 'It replaces double dispatch with a single dispatch on the class of the visitor', 'It is static overloading: the compiler picks `visit_add` from the argument type', 'It avoids dispatch completely by testing the class of the node with `is_a?`'], answer: 0,
    explain: 'The right code depends on **two** things: the kind of node and the operation. The call `node.accept(v)` dispatches on the node; inside it, the call `v.visit_add(self)` dispatches on the visitor, with the node\'s kind encoded in the method name. Exactly the `add_values` / `addInt` trick from the double-dispatch lecture.' },

  { id: 'g-visitor-trade', topic: 'generics', type: 'mcq', src: 'slides',
    q: 'How does the visitor pattern change the extensibility trade-off of an OOP program?',
    options: ['New operations become easy (one new visitor class); new node kinds become the hard case', 'New node kinds become easy (one new class); new operations become the hard case', 'Both new operations and new node kinds become easy, with no existing code touched', 'Neither changes: visitors only make the existing code shorter to read'], answer: 0,
    explain: 'Plain OOP: adding a variant is easy, adding an operation means editing every class. With visitors each operation lives in **one** class (like one function with a `match` in FP), so operations are easy. But a new node kind needs a new `visit_...` method in **every** existing visitor. The trade-off is flipped to the FP side.' },

  { id: 'g-countvisitor', topic: 'generics', type: 'write', prelude: 'visitor',
    q: 'Add a new **operation** without touching the node classes: write `CountVisitor`, which counts the `Constant` nodes in an expression. `Add.new(Constant.new(1), Constant.new(2)).accept(CountVisitor.new)` is `2`.',
    starter: `class CountVisitor

end`,
    answer: `class CountVisitor
  def visit_constant(node)
    1
  end
  def visit_add(node)
    node.left.accept(self) + node.right.accept(self)
  end
end`,
    hint: 'Give it the same two methods as `EvalVisitor`: `visit_constant(node)` and `visit_add(node)`. Recurse with `node.left.accept(self)`.',
    require: [['def\\s+visit_constant', 'define `visit_constant`'], ['def\\s+visit_add', 'define `visit_add`'], ['accept\\s*\\(?\\s*self', 'recurse with `accept(self)`']], forbid: [['is_a\\?|instance_of\\?|\\.class\\b', 'no type tests: the nodes dispatch for you'], ['class\\s+(Constant|Add)\\b', 'do not reopen the node classes']],
    tests: [{ run: 'p Add.new(Constant.new(1), Constant.new(2)).accept(CountVisitor.new)', expect: '2' }, { run: 'p Constant.new(9).accept(CountVisitor.new)', expect: '1' }, { run: 'p Add.new(Add.new(Constant.new(1), Constant.new(2)), Add.new(Constant.new(3), Add.new(Constant.new(4), Constant.new(5)))).accept(CountVisitor.new)', expect: '5' }],
    explain: 'One new class, zero edits elsewhere: that is what the visitor pattern buys. Compare with the "reopen every class and add a method" style of the evaluator in the extensibility lecture.' },

  { id: 'g-multiply', topic: 'generics', type: 'write', prelude: 'visitor',
    q: 'Now add a new **node kind**, `Multiply` (with `left` and `right`), and make **both** existing visitors handle it: `EvalVisitor` multiplies, `PrintVisitor` prints like `"(3 * 4)"`. Reopen the visitor classes to add the missing method.',
    starter: `class Multiply

end
class EvalVisitor

end
class PrintVisitor

end`,
    answer: `class Multiply
  attr_reader :left, :right
  def initialize(left, right)
    @left = left
    @right = right
  end
  def accept(visitor)
    visitor.visit_multiply(self)
  end
end
class EvalVisitor
  def visit_multiply(node)
    node.left.accept(self) * node.right.accept(self)
  end
end
class PrintVisitor
  def visit_multiply(node)
    "(#{node.left.accept(self)} * #{node.right.accept(self)})"
  end
end`,
    hint: '`Multiply#accept(visitor)` should call `visitor.visit_multiply(self)`. Then each visitor needs a `visit_multiply(node)`.',
    require: [['def\\s+accept', '`Multiply` needs `accept`'], ['visit_multiply\\s*\\(?\\s*self', '`accept` should call `visitor.visit_multiply(self)`']], forbid: [['is_a\\?|instance_of\\?', 'no type tests']],
    tests: [{ run: 'p Multiply.new(Constant.new(3), Constant.new(4)).accept(EvalVisitor.new)', expect: '12' }, { run: 'p Multiply.new(Constant.new(3), Constant.new(4)).accept(PrintVisitor.new)', expect: '"(3 * 4)"' }, { run: 'p Add.new(Constant.new(1), Multiply.new(Constant.new(2), Add.new(Constant.new(3), Constant.new(4)))).accept(EvalVisitor.new)', expect: '15' }, { run: 'p Add.new(Constant.new(1), Multiply.new(Constant.new(2), Constant.new(5))).accept(PrintVisitor.new)', expect: '"(1 + (2 * 5))"' }],
    explain: 'One new node kind forced a change in **every visitor**. With two visitors that is two edits; with twenty it is twenty. This is the hard direction for the visitor pattern, exactly as adding a constructor is the hard direction for FP `match` code.' },

  { id: 'g-visitor-missing', topic: 'generics', type: 'predict', prelude: 'visitor',
    q: 'Someone adds a node kind but forgets to update `PrintVisitor`.',
    code: `class Negate
  attr_reader :e
  def initialize(e)
    @e = e
  end
  def accept(visitor)
    visitor.visit_negate(self)
  end
end
class EvalVisitor
  def visit_negate(node)
    -node.e.accept(self)
  end
end
n = Add.new(Constant.new(10), Negate.new(Constant.new(4)))`,
    parts: [{ ask: 'n.accept(EvalVisitor.new)', a: '6' }, { ask: 'n.accept(PrintVisitor.new)', a: 'error', err: "undefined method 'visit_negate'" }],
    independent: true,
    explain: 'Ruby checks nothing in advance: the missing `visit_negate` shows up as a `NoMethodError` only when a `PrintVisitor` actually reaches a `Negate` node. In a statically typed language the visitor **interface** would list `visit_negate`, and the compiler would point at every visitor that lacks it: a to-do list for free.' },

  { id: 'g-school', topic: 'generics', type: 'explain', src: 'like final Q6(b)',
    q: 'In Ruby, a method `total_cost(items)` sums `item.cost` over an array holding `Pencil`, `Notebook` and `Eraser` objects. The three classes are unrelated (each just has a `cost` method). The same design in Java does not type-check. Why not, and what must be added?',
    answer: 'Ruby uses duck typing: `item.cost` works for any object that responds to `cost`, and nothing is checked before the call.\n\nJava must give the array elements **one static type** that is known to have a `cost` method. Unrelated classes have no common type except `Object`, which has no `cost`. So Java needs a common **supertype**: an interface (or abstract class) such as `SchoolSupply` declaring `cost`, which `Pencil`, `Notebook` and `Eraser` all implement/extend. Then the method takes a `List<SchoolSupply>` (or `<T extends SchoolSupply> ... List<T>`), and the call `item.cost()` type-checks via subtyping.',
    explain: 'The general lesson: what Ruby gets from duck typing, a statically typed OOP language gets from **subtyping to a shared interface**. The interface is the written-down version of the assumption "these objects all have `cost`".' },

  { id: 'g-sound', topic: 'generics', type: 'mcq',
    q: 'A subtyping rule or a generic type is called **sound** when ...',
    options: ['no program accepted by the type-checker can hit the error the type system is meant to prevent', 'every program that would run without errors is accepted by the type-checker', 'the type-checker always finishes, even for programs that contain infinite loops', 'programs run equally fast whether or not the type-checker has been switched on'], answer: 0,
    explain: 'Sound = **no false negatives**: if it type-checks, the bad thing (here: accessing a missing field or method) cannot happen. The second option describes *completeness*, which practical type systems give up. Java arrays show a third route: accept the unsound rule and add a run-time check.' }
  );
})();

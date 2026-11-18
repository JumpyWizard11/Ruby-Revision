// Question bank part 1: shared helper code (PRELUDES), then objects/classes/state (ruby1) and arrays/hashes/blocks (ruby2).
// Types: predict (type what each expression evaluates to, as irb would show it), mcq, write (tests run in-app), explain (self-marked).
// Multiple choice: the CORRECT option is always listed first (answer: 0); the app shuffles the order every time.
// Every predict answer and write test is checked by tools/verify.js.
(function () {
  const P = (window.PRELUDES = window.PRELUDES || {});
  P.rational = `class MyRational
  def initialize(num, den=1)
    if den == 0
      raise "MyRational received denominator of zero"
    elsif den < 0
      @num = - num
      @den = - den
    else
      @num = num
      @den = den
    end
    reduce
  end
  def to_s
    ans = @num.to_s
    if @den != 1
      ans += "/"
      ans += @den.to_s
    end
    ans
  end
  def add! r
    a = r.num
    b = r.den
    c = @num
    d = @den
    @num = (a * d) + (b * c)
    @den = b * d
    reduce
    self
  end
  def + r
    ans = MyRational.new(@num, @den)
    ans.add! r
    ans
  end
protected
  def num
    @num
  end
  def den
    @den
  end
private
  def gcd(x, y)
    if x == y
      x
    elsif x < y
      gcd(x, y - x)
    else
      gcd(y, x)
    end
  end
  def reduce
    if @num == 0
      @den = 1
    else
      d = gcd(@num.abs, @den)
      @num = @num / d
      @den = @den / d
    end
  end
end`;
  P.point = `class Point
  attr_accessor :x, :y
  def initialize(x, y)
    @x = x
    @y = y
  end
  def distFromOrigin
    Math.sqrt(@x * @x + @y * @y)   # direct field access
  end
  def distFromOrigin2
    Math.sqrt(x * x + y * y)       # uses the getters
  end
end
class ColorPoint < Point
  attr_accessor :color
  def initialize(x, y, c="clear")
    super(x, y)
    @color = c
  end
end
class ThreeDPoint < Point
  attr_accessor :z
  def initialize(x, y, z)
    super(x, y)
    @z = z
  end
  def distFromOrigin
    d = super
    Math.sqrt(d * d + @z * @z)
  end
  def distFromOrigin2
    d = super
    Math.sqrt(d * d + z * z)
  end
end`;
  P.exp = `class Exp
end
class Value < Exp
  def eval
    self
  end
end
class Int < Value
  attr_reader :i
  def initialize(i)
    @i = i
  end
  def toString
    @i.to_s
  end
  def hasZero
    i == 0
  end
end
class Negate < Exp
  attr_reader :e
  def initialize(e)
    @e = e
  end
  def eval
    Int.new(-e.eval.i)
  end
  def toString
    "-(" + e.toString + ")"
  end
  def hasZero
    e.hasZero
  end
end
class Add < Exp
  attr_reader :e1, :e2
  def initialize(e1, e2)
    @e1 = e1
    @e2 = e2
  end
  def eval
    Int.new(e1.eval.i + e2.eval.i)
  end
  def toString
    "(" + e1.toString + " + " + e2.toString + ")"
  end
  def hasZero
    e1.hasZero || e2.hasZero
  end
end`;
  P.dd = `class Exp
end
class Value < Exp
  def eval
    self
  end
end
class Int < Value
  attr_reader :i
  def initialize(i)
    @i = i
  end
  def toString
    @i.to_s
  end
  def add_values(v)      # first dispatch: self is an Int
    v.addInt self        # second dispatch
  end
  def addInt(v)          # v is an Int (the LEFT operand)
    Int.new(v.i + i)
  end
  def addString(v)       # v is a MyString
    MyString.new(v.s + i.to_s)
  end
  def addRational(v)     # v is a MyRational
    MyRational.new(v.i + v.j * i, v.j)
  end
end
class MyString < Value
  attr_reader :s
  def initialize(s)
    @s = s
  end
  def toString
    s
  end
  def add_values(v)
    v.addString self
  end
  def addInt(v)
    MyString.new(v.i.to_s + s)
  end
  def addString(v)
    MyString.new(v.s + s)
  end
  def addRational(v)
    MyString.new(v.i.to_s + "/" + v.j.to_s + s)
  end
end
class MyRational < Value
  attr_reader :i, :j
  def initialize(i, j)
    @i = i
    @j = j
  end
  def toString
    i.to_s + "/" + j.to_s
  end
  def add_values(v)
    v.addRational self
  end
  def addInt(v)
    MyRational.new(v.i * j + i, j)
  end
  def addString(v)
    MyString.new(v.s + i.to_s + "/" + j.to_s)
  end
  def addRational(v)
    MyRational.new(v.i * j + v.j * i, v.j * j)
  end
end
class Add < Exp
  attr_reader :e1, :e2
  def initialize(e1, e2)
    @e1 = e1
    @e2 = e2
  end
  def eval
    e1.eval.add_values e2.eval
  end
  def toString
    "(" + e1.toString + " + " + e2.toString + ")"
  end
end`;
  P.house = `class House
  attr_accessor :price, :sqft
  include Comparable
  def initialize(price, sqft)
    @price = price
    @sqft = sqft
  end
  # Houses are ordered by price, then by sqft.
  def <=> other
    price_comp = self.price <=> other.price
    return price_comp if price_comp != 0
    self.sqft <=> other.sqft
  end
end`;
  P.visitor = `class Constant
  attr_reader :value
  def initialize(value)
    @value = value
  end
  def accept(visitor)
    visitor.visit_constant(self)
  end
end
class Add
  attr_reader :left, :right
  def initialize(left, right)
    @left, @right = left, right
  end
  def accept(visitor)
    visitor.visit_add(self)
  end
end
class EvalVisitor
  def visit_constant(node)
    node.value
  end
  def visit_add(node)
    node.left.accept(self) + node.right.accept(self)
  end
end
class PrintVisitor
  def visit_constant(node)
    node.value.to_s
  end
  def visit_add(node)
    "(#{node.left.accept(self)} + #{node.right.accept(self)})"
  end
end`;

  const Q = (window.QUESTIONS = window.QUESTIONS || []);
  Q.push(
  // ======================= OBJECTS, CLASSES, STATE (ruby1) =======================
  { id: 'o-rules', topic: 'oop', type: 'mcq', src: 'slides',
    q: 'Which of these is **not** one of Ruby\'s rules of class-based OOP?',
    options: ['Any object may read another object\'s instance variables', 'All values are references to objects, even numbers', 'Objects communicate through method calls (messages)', 'An object\'s class determines the object\'s behaviour'], answer: 0,
    explain: 'Each object has its own **private** state. Only the object\'s own methods can touch its instance variables: you can write `@foo` but never `e.@foo`. The other three are rules 1, 2 and 5 from the slides.' },

  { id: 'o-pure', topic: 'oop', type: 'predict',
    q: 'Ruby is **pure** OOP: every value is an object, and almost everything is a method call.',
    code: ``,
    parts: [{ ask: '3.+(4)', a: '7' }, { ask: '"hello" + 3.to_s', a: '"hello3"' }, { ask: 'nil.nil?', a: 'true' }, { ask: '5.nil?', a: 'false' }, { ask: '-7.abs', a: '7' }, { ask: 'nil.class', a: 'NilClass' }],
    explain: '`3 + 4` is just sugar for `3.+(4)`: sending the message `+` to the object 3. Even `nil` is an object (of class `NilClass`), so you can call methods such as `nil?` on it.' },

  { id: 'o-truthy', topic: 'oop', type: 'predict',
    q: 'Which values count as true? What does `t` return?',
    code: `def t(x)
  if x then "yes" else "no" end
end`,
    parts: [{ ask: 't(0)', a: '"yes"' }, { ask: 't("")', a: '"yes"' }, { ask: 't(nil)', a: '"no"' }, { ask: 't(false)', a: '"no"' }, { ask: 't([])', a: '"yes"' }],
    explain: 'Only `nil` and `false` are false. **Everything else is true**, including `0`, the empty string and the empty array (unlike Python or C).' },

  { id: 'o-classes', topic: 'oop', type: 'predict', src: 'slides',
    q: 'Methods return their **last expression**. What does each call evaluate to?',
    code: `class A
  def m1
    34
  end
  def m2(x, y)
    z = 7
    if x > y
      false
    else
      x + y * z
    end
  end
end
class B
  def m1
    4
  end
  def m3 x
    x.abs * 2 + self.m1
  end
end
a = A.new`,
    parts: [{ ask: 'a.m1', a: '34' }, { ask: 'a.m2(3, 4)', a: '31' }, { ask: 'a.m2(5, 4)', a: 'false' }, { ask: 'B.new.m3(-17)', a: '38' }],
    explain: '`m2(3, 4)`: 3 > 4 is false, so the result is `3 + 4 * 7 = 31`. In `m3`, `self.m1` calls **B\'s** m1 (4), because self is a B: `17 * 2 + 4 = 38`. No `return` is needed.' },

  { id: 'o-chain', topic: 'oop', type: 'predict', src: 'slides',
    q: 'What does the last line **print**? (Type the printed text; spacing and line breaks are ignored.)',
    code: `class C
  def m1
    print "hi "
    self
  end
  def m2
    print "bye "
    self
  end
  def m3
    print "\\n"
    self
  end
end
c = C.new
c.m1.m2.m3.m1.m1.m3`,
    parts: [{ ask: 'printed output', out: true, a: 'hi bye \nhi hi \n', ph: 'what is printed' }],
    explain: 'Each method returns `self`, so the result of `c.m1` is the same object and you can immediately send it another message. This is "stringing method calls" (method chaining).' },

  { id: 'o-state', topic: 'oop', type: 'predict', src: 'slides',
    q: 'Instance variables and aliasing. Answer each line in order.',
    code: `class D
  def m1
    @foo = 0
  end
  def m2 x
    @foo += x
  end
  def foo
    @foo
  end
end
x = D.new
y = D.new
z = x`,
    parts: [{ ask: 'x.foo', a: 'nil' }, { ask: 'x.m1', a: '0' }, { ask: 'z.m2 3', a: '3' }, { ask: 'x.foo', a: '3' }, { ask: 'y.foo', a: 'nil' }, { ask: 'y.m2 3', a: 'error', err: "undefined method '+' for nil" }],
    explain: 'Reading an unassigned instance variable gives `nil` (no error). `z = x` makes an **alias**, so `z.m2 3` changes the object x refers to. y is a different object whose `@foo` is still nil, so `@foo += 3` is `nil + 3`: a NoMethodError.' },

  { id: 'o-ivar-typo', topic: 'oop', type: 'mcq',
    q: 'Inside a method you mistype `@count = @count + 1` as `@count = @cuont + 1`. What happens when the method runs?',
    options: ['`@cuont` is read as nil, so `nil + 1` raises NoMethodError when that line runs', 'Ruby reports an "undeclared instance variable" error before the program starts', '`@cuont` is created with the value 0, so `@count` silently becomes 1', 'A NameError is raised at that line, because `@cuont` was never assigned'], answer: 0,
    explain: 'Instance variables are never declared: they "spring into being" on assignment, and **reading one that does not exist gives nil**. So a misspelling is not caught as such; here it shows up as `nil + 1`. If the typo were on the left of an assignment it would silently create new state.' },

  { id: 'o-init', topic: 'oop', type: 'predict', src: 'slides',
    q: '`initialize` is called on the new object before `new` returns, with the arguments given to `new`.',
    code: `class E
  def initialize(f=0)
    @foo = f
  end
  def m2 x
    @foo += x
  end
  def foo
    @foo
  end
end
w = E.new 3
v = E.new`,
    parts: [{ ask: 'w.foo + v.foo', a: '3' }, { ask: 'v.m2 5', a: '5' }, { ask: 'E.new(1, 2)', a: 'error', err: 'wrong number of arguments (given 2, expected 0..1)' }],
    explain: '`f=0` is a default argument, so `E.new` works with zero or one argument. Creating instance variables in `initialize` is good style: it gives every instance the same invariant (here: `@foo` is always a number).' },

  { id: 'o-classvar', topic: 'oop', type: 'predict', src: 'slides',
    q: 'Class variables (`@@`), class constants and class methods. Answer in order.',
    code: `class F
  Age = 44
  def self.reset_bar
    @@bar = 0
  end
  def initialize(f=0)
    @foo = f
  end
  def m2 x
    @foo += x
    @@bar += 1
  end
  def foo
    @foo
  end
  def bar
    @@bar
  end
end`,
    parts: [{ ask: 'F.reset_bar', a: '0' }, { ask: 'd = F.new 17', a: 'object', alt: ['#<F>', 'an F object', 'F object', 'a new F'], ph: 'just type: object' }, { ask: 'd.m2 5', a: '1' }, { ask: 'e = F.new', a: 'object', alt: ['#<F>', 'an F object', 'F object', 'a new F'], ph: 'just type: object' }, { ask: 'e.m2 6', a: '2' }, { ask: 'd.bar', a: '2' }, { ask: 'e.foo', a: '6' }, { ask: 'F::Age', a: '44' }],
    explain: '`@@bar` is **one variable shared by all instances** of F, so both `d.m2` and `e.m2` bump the same counter. `@foo` is per object. A constant is visible outside the class as `F::Age`; a class variable is not.' },

  { id: 'o-classmethod', topic: 'oop', type: 'mcq',
    q: 'Class `F` contains `def self.reset_bar ... end`. How is this method called?',
    options: ['`F.reset_bar`: on the class itself', '`F.new.reset_bar`: on any instance of F', '`F::reset_bar.new`: through the constant lookup operator', '`reset_bar(F)`: as a top-level function taking the class'], answer: 0,
    explain: '`def self.name` defines a **class method** (like a Java static method). It belongs to the class, not to a particular instance, so `F.new.reset_bar` is a NoMethodError.' },

  { id: 'o-private-state', topic: 'oop', type: 'mcq',
    q: '`pt` is a `Point` whose `initialize` sets `@x`. The class defines **no** getter. What does `pt.@x` do?',
    options: ['It is a syntax error: there is no syntax for reaching into another object', 'It returns the value of `@x`, because instance variables are public by default', 'It returns nil, because `@x` is looked up in the top-level object instead', 'It raises NoMethodError when that line runs, because `@x` is private'], answer: 0,
    explain: 'Object state is **always private** in Ruby. `e.@foo` is not even valid syntax, so the file does not run at all. To expose state you must define methods (getters/setters), usually with `attr_reader` / `attr_accessor`.' },

  { id: 'o-attr', topic: 'oop', type: 'write',
    q: 'Write a class `Counter`. A new counter starts at 0. It has a **getter** `count` (but **no setter**: use the built-in shorthand) and a method `increment!` that adds 1 and returns the counter itself, so calls can be chained.',
    starter: `class Counter

end`,
    answer: `class Counter
  attr_reader :count
  def initialize
    @count = 0
  end
  def increment!
    @count += 1
    self
  end
end`,
    tests: [{ run: 'c = Counter.new\nc.increment!.increment!\np c.count', expect: '2' }, { run: 'p Counter.new.count', expect: '0' }, { run: 'p Counter.new.respond_to?(:count=)', expect: 'false' }],
    require: [['attr_reader', 'Use attr_reader for the getter.']], hint: '`attr_reader :count` defines `def count; @count; end` for you. Return `self` from `increment!`.',
    explain: '`attr_reader :count` is sugar for a getter method. Returning `self` is what makes `c.increment!.increment!` work.' },

  { id: 'o-attr-sugar', topic: 'oop', type: 'mcq',
    q: 'What exactly does `attr_accessor :foo` do inside a class?',
    options: ['Defines two ordinary methods, `foo` and `foo=`, that read and write `@foo`', 'Declares an instance variable `@foo` and initialises it to nil in every object', 'Makes the instance variable `@foo` public, so `obj.@foo` becomes legal', 'Defines the methods `get_foo` and `set_foo`, following the Java convention'], answer: 0,
    explain: 'Despite the sugar, getters and setters are **just methods**. `obj.foo = 3` is the method call `obj.foo=(3)`. Nothing is declared: `@foo` still only exists once something assigns to it.' },

  { id: 'o-setter', topic: 'oop', type: 'predict', src: 'slides',
    q: 'A method whose name ends in `=` can be called with assignment syntax, even if it is not really a setter.',
    code: `class Temp
  def celsius= x
    @kelvin = x + 273
  end
  def kelvin
    @kelvin
  end
end
t = Temp.new
t.celsius = 27`,
    parts: [{ ask: 't.kelvin', a: '300' }, { ask: 't.respond_to?(:celsius)', a: 'false' }, { ask: 't.respond_to?(:celsius=)', a: 'true' }],
    explain: 'There is no `@celsius` at all. Clients cannot tell: they only see methods. This is why private state lets you **change the representation later without changing clients**.' },

  { id: 'o-visibility', topic: 'oop', type: 'mcq', src: 'slides',
    q: 'A method `m` is declared under `private`. According to the slides, how may it be called?',
    options: ['Only as `m` or `m(args)`, with no explicit receiver, from the object\'s own methods', 'As `other.m(args)` from any method of the same class or a subclass', 'From anywhere in the program, but only when given at least one argument', 'Only from class methods, that is, methods defined with `def self.`'], answer: 0,
    explain: '`private`: only the object itself, and only with the shorthand `m(...)` (the slides: "for private methods only the shorthand is allowed"; recent Ruby versions also accept a literal `self.m`). `protected`: any instance of the class or its subclasses, so `other.m` works inside the class. `public` (the default): everyone.' },

  { id: 'o-protected', topic: 'oop', type: 'explain', src: 'slides',
    q: 'In `MyRational`, the getters `num` and `den` are declared `protected`. Why not `private`, and why not `public`?',
    answer: 'Not **public**: clients should not depend on the representation (numerator/denominator in reduced form). Not **private**: `add! r` needs to call `r.num` and `r.den` on **another** MyRational object, and a private method can only be called on self with no explicit receiver. `protected` allows exactly that: calls with an explicit receiver, but only from code inside the class (or subclasses).',
    explain: 'Rule of thumb: private = this object only; protected = any object of this class, from inside the class; public = anyone.' },

  { id: 'o-rational', topic: 'oop', type: 'predict', src: 'slides', prelude: 'rational',
    q: 'Using the `MyRational` class from the slides (fractions kept in reduced form with a positive denominator):',
    code: ``,
    parts: [{ ask: 'MyRational.new(3, 4).to_s', a: '"3/4"' }, { ask: 'MyRational.new(2, -4).to_s', a: '"-1/2"' }, { ask: '(MyRational.new(1, 2) + MyRational.new(1, 2)).to_s', a: '"1"' }, { ask: 'MyRational.new(1, 2).num', a: 'error', err: "protected method 'num' called" }],
    explain: '`initialize` moves the sign to the numerator and calls the private `reduce`. `+` is a normal method named `+`, so `r1 + r2` works. `num` is protected: calling it from the top level (outside the class) is a NoMethodError.' },

  { id: 'o-rational-zero', topic: 'oop', type: 'mcq', src: 'slides', prelude: 'rational',
    q: 'With the `MyRational` class from the slides, what does `MyRational.new(1, 0)` do?',
    options: ['Raises a RuntimeError with the message given to `raise` in `initialize`', 'Returns nil, because `initialize` stops before any instance variable is set', 'Returns a MyRational whose `@num` and `@den` are both nil', 'Raises ZeroDivisionError when `reduce` divides by the denominator'], answer: 0,
    explain: '`raise "message"` raises a `RuntimeError`. Because `initialize` runs before `new` returns, no broken object ever escapes: this is how `initialize` establishes **object invariants**.' },

  { id: 'o-reflection', topic: 'oop', type: 'predict',
    q: 'Reflection: every object can tell you its class at run time.',
    code: ``,
    parts: [{ ask: '3.class', a: 'Integer' }, { ask: '3.7.class', a: 'Float' }, { ask: '"hi".class', a: 'String' }, { ask: ':hi.class', a: 'Symbol' }, { ask: '[1, 2].class', a: 'Array' }, { ask: '(1..2).class', a: 'Range' }, { ask: '3.class.class', a: 'Class' }],
    explain: 'Every object is an instance of a class, and classes are objects too (instances of `Class`). `methods` and `class` are ordinary methods: reflection is "just objects and method calls".' },

  { id: 'o-changing', topic: 'oop', type: 'predict', src: 'slides',
    q: 'Classes can be changed while the program runs, even built-in ones.',
    code: `class Integer
  def double
    self + self
  end
end
def n
  56
end`,
    parts: [{ ask: '5.double', a: '10' }, { ask: 'n', a: '56' }, { ask: '"ab".double', a: 'error', err: "undefined method 'double'" }],
    explain: '`class Integer ... end` **reopens** the existing class and adds a method to it. A top-level `def` adds a method to class `Object`. `double` was only added to Integer, so a String does not have it.' },

  { id: 'o-moral', topic: 'oop', type: 'predict', src: 'slides',
    q: 'An instance is created, **then** its class is changed. Old method or new method?',
    code: `class C
  def m; "old"; end
end
x = C.new
class C
  def m; "new"; end
  def extra; "added"; end
end`,
    parts: [{ ask: 'x.m', a: '"new"' }, { ask: 'x.extra', a: '"added"' }],
    explain: 'An object does not copy its methods. Every call looks the method up **in the class at the time of the call**, so existing instances see the replacement. Java/C++ never have to ask this question, which allows faster method calls.' },

  { id: 'o-duck', topic: 'oop', type: 'mcq', src: 'slides',
    q: 'Which description of what `mirror_update` accepts is the true duck-typing one?',
    code: `def mirror_update pt
  pt.x = pt.x * (-1)
end`,
    options: ['Anything with methods `x` and `x=`, where the result of `x` has a `*` method that accepts -1', 'Any instance of class `Point` or of one of its subclasses, since those are the classes that define `x`', 'Anything that has an instance variable `@x` holding a number, whatever class it belongs to', 'Any object with a numeric `x` field and with a getter and a setter method for that field'], answer: 0,
    explain: 'Duck typing: only the **messages the object receives** matter. The body sends `x`, sends `*` to that result, then sends `x=`. Nothing requires a Point, an `@x`, or even a number.' },

  { id: 'o-duck-predict', topic: 'oop', type: 'predict', src: 'slides',
    q: 'One method, many kinds of argument.',
    code: `def double x
  x + x
end`,
    parts: [{ ask: 'double 3', a: '6' }, { ask: 'double "ab"', a: '"abab"' }, { ask: 'double [1, 2]', a: '[1, 2, 1, 2]' }, { ask: 'double nil', a: 'error', err: "undefined method '+' for nil" }],
    explain: 'Anything that understands `+` works: numbers, strings, arrays, a `MyRational`. The check happens only at run time, when the message is actually sent.' },

  { id: 'o-duck-explain', topic: 'oop', type: 'explain', src: 'slides',
    q: 'Give one advantage and one disadvantage of duck typing.',
    answer: '**Advantage:** more code reuse. A method works for any object with the right methods, including classes nobody anticipated. It is also very OOP: only the messages an object can receive matter. **Disadvantage:** almost nothing is equivalent any more. `x + x`, `x * 2` and `2 * x` may all behave differently for some argument, so callers may come to depend on exactly how the method is implemented, and you can no longer change the implementation safely.',
    explain: 'Embracing duck typing means **always calling methods** instead of testing the class of the arguments (`is_a?`).' },

  { id: 'o-toplevel', topic: 'oop', type: 'mcq', src: 'slides',
    q: 'You write `def helper ... end` at the top level of a file, outside any class. Where does the method go?',
    options: ['Into class `Object`, so every class inherits it and it can be called anywhere', 'Into a separate global function table that is not connected to any class', 'Into class `Kernel::Main`, which is visible only inside that same file', 'Nowhere: it stays local to the file until a class explicitly includes it'], answer: 0,
    explain: 'All code is methods and all methods belong to a class. Top-level methods are added to `Object`; every class you define is a subclass of `Object`, so they are available everywhere (unless a class overrides the name).' },

  { id: 'o-localscope', topic: 'oop', type: 'predict', independent: true,
    q: 'Local variables. The scope of a local variable is the **method body** it is in.',
    code: `x = 10
def f
  x
end
def g
  y = 5 if false
  y
end`,
    parts: [{ ask: 'f', a: 'error', err: "undefined local variable or method 'x'" }, { ask: 'g', a: 'nil' }, { ask: 'x', a: '10' }],
    explain: 'A `def` starts a brand-new scope: it **cannot see** the top-level `x` (methods are not closures; blocks are). In `g`, the assignment never runs, but the variable still exists for the rest of the method with the value nil.' },

  { id: 'o-where-fits', topic: 'oop', type: 'mcq', src: 'slides',
    q: 'Where does Ruby sit among the languages of this course?',
    options: ['Dynamically typed and object-oriented (like Racket in typing, like Java in style)', 'Statically typed and object-oriented (like Java in both typing and style)', 'Dynamically typed and functional (like Racket in both typing and style)', 'Statically typed and functional (like OCaml in both typing and style)'], answer: 0,
    explain: 'OCaml: static + functional. Racket: dynamic + functional. Java: static + OOP. Ruby: dynamic + OOP. Studying OOP in a dynamically typed language shows its essence without type rules getting in the way.' },

  { id: 'o-why-private', topic: 'oop', type: 'explain', src: 'slides',
    q: 'Why is private object state (with getters/setters only where needed) considered good, "more OOP" design?',
    answer: 'Because clients can only send messages, the class can **change its implementation later without changing clients** (as with OCaml modules that hide the representation). A method can look like a getter or setter without being one (`celsius=` storing kelvin). And an **unrelated class** that implements the same methods can be used with the same clients (duck typing).',
    explain: 'The object decides how to respond to a message; nobody outside can depend on what is stored.' },

  // ======================= ARRAYS, HASHES, BLOCKS (ruby2) =======================
  { id: 'b-arr', topic: 'blocks', type: 'predict', src: 'slides',
    q: 'Ruby arrays are flexible: "fewer operations are errors". Answer in order.',
    code: `a = [3, 2, 7, 9]`,
    parts: [{ ask: 'a[2]', a: '7' }, { ask: 'a[4]', a: 'nil' }, { ask: 'a[-1]', a: '9' }, { ask: 'a[6] = 14', a: '14' }, { ask: 'a', a: '[3, 2, 7, 9, nil, nil, 14]' }, { ask: 'a.size', a: '7' }],
    explain: 'Reading past the end gives `nil`, not an error. Negative indices count from the end. Assigning past the end **grows** the array and fills the gap with nil.' },

  { id: 'b-arr-ops', topic: 'blocks', type: 'predict', src: 'slides',
    q: 'More array operations.',
    code: ``,
    parts: [{ ask: '[3, 2, 3] | [1, 2, 3]', a: '[3, 2, 1]' }, { ask: '[1, 2] + [true, "hi"]', a: '[1, 2, true, "hi"]' }, { ask: 'Array.new(3) { |i| i * i }', a: '[0, 1, 4]' }, { ask: 'Array.new(2)', a: '[nil, nil]' }, { ask: '[false, "hi", 3 + 4][2]', a: '7' }],
    explain: '`|` is set union (duplicates removed, first-seen order). `+` concatenates into a **new** array. `Array.new(n) { |i| ... }` calls the block with each index. Arrays can mix types, so they make fine tuples.' },

  { id: 'b-stack', topic: 'blocks', type: 'predict', src: 'slides',
    q: 'Arrays as stacks and queues. Answer in order.',
    code: `a = [1, 2, 3]`,
    parts: [{ ask: 'a.push 4', a: '[1, 2, 3, 4]' }, { ask: 'a.pop', a: '4' }, { ask: 'a.shift', a: '1' }, { ask: 'a.unshift 9', a: '[9, 2, 3]' }],
    explain: '`push`/`pop` work at the **end** (a stack). `shift`/`unshift` work at the **front**; `push` + `shift` gives a queue. `push` and `unshift` return the array; `pop` and `shift` return the removed element.' },

  { id: 'b-alias', topic: 'blocks', type: 'predict', src: 'slides',
    q: 'Aliasing versus copying.',
    code: `a = [1, 2, 3]
d = a
e = a + []
a[0] = 6`,
    parts: [{ ask: 'd[0]', a: '6' }, { ask: 'e[0]', a: '1' }, { ask: 'd.equal?(a)', a: 'true' }, { ask: 'e.equal?(a)', a: 'false' }],
    explain: '`d = a` is an alias: same array object. `a + []` builds a **new** array with the same elements (a copy), so later changes to `a` do not affect `e`. `equal?` tests object identity.' },

  { id: 'b-slice', topic: 'blocks', type: 'predict', src: 'slides',
    q: 'Slicing: `f[start, length]`. Answer in order.',
    code: `f = [2, 4, 6, 8, 10, 12, 14]`,
    parts: [{ ask: 'f[2, 4]', a: '[6, 8, 10, 12]' }, { ask: 'f.slice(-2, 2)', a: '[12, 14]' }, { ask: 'f[2, 4] = [1, 1]', a: '[1, 1]' }, { ask: 'f', a: '[2, 4, 1, 1, 14]' }],
    explain: '`f[2, 4]` is 4 elements starting at index 2. Assigning to a slice **replaces** those 4 elements with the 2 new ones, so the array shrinks.' },

  { id: 'b-each-ret', topic: 'blocks', type: 'predict',
    q: '`each` versus `map`: what is the **value** of each expression?',
    code: ``,
    parts: [{ ask: '[1, 2, 3].each { |x| x * 2 }', a: '[1, 2, 3]' }, { ask: '[1, 2, 3].map { |x| x * 2 }', a: '[2, 4, 6]' }, { ask: '3.times { |i| i }', a: '3' }],
    explain: '`each` runs the block for its **side effects** and returns the original receiver; the block results are thrown away. `map` (synonym `collect`) collects the block results in a new array.' },

  { id: 'b-iters', topic: 'blocks', type: 'predict', src: 'slides',
    q: 'The standard iterators.',
    code: `a = Array.new(5) { |i| 4 * (i + 1) }`,
    parts: [{ ask: 'a', a: '[4, 8, 12, 16, 20]' }, { ask: 'a.any? { |x| x > 7 }', a: 'true' }, { ask: 'a.all? { |x| x > 7 }', a: 'false' }, { ask: 'a.inject(0) { |acc, elt| acc + elt }', a: '60' }, { ask: 'a.select { |x| x > 7 }', a: '[8, 12, 16, 20]' }, { ask: 'a.all?', a: 'true' }],
    explain: '`inject` is fold: `acc` starts at 0 and each block result becomes the next `acc`. `select` (synonym `filter`) keeps elements for which the block is true. `all?` with no block asks whether every element is "true" (neither nil nor false).' },

  { id: 'b-yield', topic: 'blocks', type: 'predict', src: 'slides',
    q: 'A method calls the block it was given with `yield`.',
    code: `class Foo
  def initialize(max)
    @max = max
  end
  def silly
    yield(4, 5) + yield(@max, @max)
  end
  def count base
    if base > @max
      raise "reached max"
    elsif yield base
      1
    else
      1 + (count(base + 1) { |i| yield i })
    end
  end
end
foo = Foo.new(1000)`,
    parts: [{ ask: 'foo.silly { |a, b| 2 * a - b }', a: '1003' }, { ask: 'foo.count(10) { |i| (i * i) == (34 * i) }', a: '25' }],
    explain: '`silly`: (2*4-5) + (2*1000-1000) = 3 + 1000. `count` counts how many numbers it tries from 10 until the block is true: i*i == 34*i is true for i = 34, and 10..34 is 25 numbers. The recursive call must **wrap the block again**: `{ |i| yield i }` passes "my block" down.' },

  { id: 'b-yield-write', topic: 'blocks', type: 'write',
    q: 'Write a method `apply_n(n, x)` that takes a block and applies it `n` times, starting from `x`: `apply_n(3, 1) { |v| v * 2 }` is `((1*2)*2)*2 = 8`. With `n = 0` it returns `x`.',
    starter: `def apply_n(n, x)

end`,
    answer: `def apply_n(n, x)
  n.times { x = yield x }
  x
end`,
    tests: [{ run: 'p apply_n(3, 1) { |v| v * 2 }', expect: '8' }, { run: 'p apply_n(0, 5) { |v| v + 1 }', expect: '5' }, { run: 'p apply_n(2, "a") { |s| s + "!" }', expect: '"a!!"' }],
    require: [['yield', 'Call the block with yield.']], hint: '`yield x` calls the block with x and gives you its result. Do that n times, feeding each result back in.',
    explain: 'The method never names its block: it just yields to it. A recursive version works too: `n == 0 ? x : apply_n(n - 1, yield(x)) { |v| yield v }`.' },

  { id: 'b-noblock', topic: 'blocks', type: 'predict', independent: true,
    q: 'Any method can be passed a block; whether it uses it is up to the method.',
    code: `def m
  yield
end
def m2
  block_given?
end
def m3
  42
end`,
    parts: [{ ask: 'm', a: 'error', err: 'no block given (yield)' }, { ask: 'm2', a: 'false' }, { ask: 'm2 { 1 }', a: 'true' }, { ask: 'm3 { 1 }', a: '42' }],
    explain: 'The callee might **ignore** the block (m3), **fail** if it is missing (m: LocalJumpError), or **behave differently** with and without one (using `block_given?`).' },

  { id: 'b-closure', topic: 'blocks', type: 'predict',
    q: 'Blocks are closures: they use the environment where they were **defined**.',
    code: `i = 7
out = []
[4, 6, 8].each { |x| if i > x then out.push(x + 1) end }
total = 10
[1, 2].each { |n| total += n }`,
    parts: [{ ask: 'out', a: '[5, 7]' }, { ask: 'total', a: '13' }],
    explain: 'The block can read `i` and even **assign** to `total`: it shares the variables of the surrounding code (lexical scope). 8 is not less than 7, so only 4 and 6 are pushed.' },

  { id: 'b-proc-first', topic: 'blocks', type: 'mcq', src: 'slides',
    q: 'Why does the inner part of this code need `lambda` instead of just another block?',
    code: `c = a.map { |x| lambda { |y| x >= y } }`,
    options: ['A block is second-class: it cannot be stored in an array, but a Proc object can', 'A block cannot refer to variables such as `x` from an enclosing block', 'A block may take at most one parameter when nested inside another block', '`map` would call the inner block immediately, so nothing could be delayed'], answer: 0,
    explain: 'All a method can do with a block is `yield` to it. To **store, return or pass around** a closure it must be a real object: an instance of `Proc`, made with `lambda` (or `proc`) and called with `.call`.' },

  { id: 'b-procs', topic: 'blocks', type: 'predict', src: 'slides',
    q: 'Procs: closures as first-class objects.',
    code: `a = [3, 5, 7, 9]
c = a.map { |x| lambda { |y| x >= y } }
fn = lambda { |x| x + 1 }`,
    parts: [{ ask: 'c[2].call 17', a: 'false' }, { ask: 'c.count { |x| x.call(5) }', a: '3' }, { ask: 'fn.call(5)', a: '6' }, { ask: '[1, 2, 3].map(&fn)', a: '[2, 3, 4]' }, { ask: 'fn.class', a: 'Proc' }],
    explain: '`c[2]` remembers x = 7: `7 >= 17` is false. Three of the lambdas have x >= 5 (5, 7, 9). `&fn` turns a Proc back into a block when calling a method.' },

  { id: 'b-return', topic: 'blocks', type: 'predict',
    q: '`return`, `next` and `break` inside a block.',
    code: `def f
  [1, 2, 3].each { |x| return x * 10 if x == 2 }
  :never
end`,
    parts: [{ ask: 'f', a: '20' }, { ask: '[1, 2, 3, 4].map { |x| next 0 if x.even?; x }', a: '[1, 0, 3, 0]' }, { ask: '[1, 2, 3, 4].each { |x| break x * 100 if x == 3 }', a: '300' }],
    explain: '`return` in a block returns from the **enclosing method** (f), not just the block. `next` ends only the current call of the block (like "continue"). `break` stops the iterator, and its value becomes the value of the whole call.' },

  { id: 'b-arity', topic: 'blocks', type: 'predict',
    q: 'Blocks and `proc` do not check the number of arguments; `lambda` does.',
    code: `pr = proc { |a, b| [a, b] }
l = lambda { |a, b| a + b }`,
    parts: [{ ask: 'pr.call(1)', a: '[1, nil]' }, { ask: 'pr.call(1, 2, 3)', a: '[1, 2]' }, { ask: 'l.call(1, 2)', a: '3' }, { ask: 'l.call(1)', a: 'error', err: 'wrong number of arguments (given 1, expected 2)' }],
    explain: 'Missing block arguments become nil and extra ones are dropped ("they don\'t check they\'re passed the right number of arguments"). A lambda behaves like a method: wrong arity is an ArgumentError. One reason `lambda` is usually preferred to `proc`.' },

  { id: 'b-hash', topic: 'blocks', type: 'predict', src: 'slides',
    q: 'Hashes map keys (anything) to values. Answer in order.',
    code: `h1 = {}
h1["a"] = "Found A"
h1[false] = "Found false"`,
    parts: [{ ask: 'h1["a"]', a: '"Found A"' }, { ask: 'h1[42]', a: 'nil' }, { ask: 'h1.keys', a: '["a", false]' }, { ask: 'h1.delete("a")', a: '"Found A"' }, { ask: 'h1.size', a: '1' }],
    explain: 'A missing key gives `nil`, not an error. Keys can be any object (`false` here). `delete` returns the value that was removed.' },

  { id: 'b-sym', topic: 'blocks', type: 'mcq', src: 'slides',
    q: 'What is a symbol such as `:ruby`, and where is it typically used?',
    options: ['Like a string but cheaper; commonly used for hash keys and method names', 'A reference to the local variable `ruby`, resolved when the symbol is used', 'A constant: its first use defines it and reassigning it is an error', 'A string that can be mutated in place, unlike a normal string literal'], answer: 0,
    explain: '`{:ocaml => 1, :ruby => 3}`: symbols are immutable names, compared by identity, so they are cheap. They also name methods: `attr_reader :x`, `obj.send(:m)`.' },

  { id: 'b-hash-each', topic: 'blocks', type: 'predict', src: 'slides',
    q: 'What does this **print**? (Spacing and line breaks are ignored.)',
    code: `h2 = {"OCaml" => 1, "Ruby" => 3}
h2.each { |k, v| print k; print ": "; puts v }`,
    parts: [{ ask: 'printed output', out: true, a: 'OCaml: 1\nRuby: 3\n', ph: 'what is printed' }],
    explain: '`each` on a hash works best with a **two-argument block**: key and value. Keys come out in insertion order.' },

  { id: 'b-range', topic: 'blocks', type: 'predict', src: 'slides',
    q: 'Ranges: like arrays of contiguous numbers, but represented efficiently.',
    code: ``,
    parts: [{ ask: '(1..100).inject { |acc, elt| acc + elt }', a: '5050' }, { ask: '(1..5).to_a', a: '[1, 2, 3, 4, 5]' }, { ask: '(1...5).to_a', a: '[1, 2, 3, 4]' }, { ask: '(1..10).step(3).to_a', a: '[1, 4, 7, 10]' }, { ask: '(3..9).count { |x| x * x < 50 }', a: '5' }],
    explain: '`i..j` includes j; `i...j` excludes it. Ranges have the same iterators as arrays (`inject`, `count`, `map`…). `inject` without a start value uses the first element as the first `acc`.' },

  { id: 'b-duck', topic: 'blocks', type: 'mcq', src: 'slides',
    q: 'Why can `m` be called with both an Array and a Range?',
    code: `def m a
  a.count { |x| x * x < 50 }
end
m [3, 5, 7, 9]   # => 3
m (3..9)         # => 5`,
    options: ['Duck typing: `m` only needs its argument to respond to `count` with a block', 'A Range is converted to an Array automatically when passed as an argument', '`Range` is a subclass of `Array`, so it inherits the same `count` method', '`m` is overloaded: Ruby picks a different version of it for each argument class'], answer: 0,
    explain: 'Arrays, hashes and ranges share many iterator methods. A method that only uses those works for all of them: "separating **how to iterate** from **what to do**".' },

  { id: 'b-t-print', topic: 'blocks', type: 'predict', src: 'slides',
    q: 'What does `t 2` **print**? (Spacing and line breaks are ignored.)',
    code: `def t i
  (0..i).each do |j|
    print " " * j
    (j..i).each { |k| print k; print " " }
    print "\\n"
  end
end
t 2`,
    parts: [{ ask: 'printed output', out: true, a: '0 1 2 \n 1 2 \n  2 \n', ph: 'the digits printed, in order' }],
    explain: 'The outer block runs for j = 0, 1, 2. Each time the inner block prints the numbers from j to i. `do ... end` is the same as `{ ... }`, preferred for multi-line blocks. Explicit loops are rare: you find an iterator instead.' },

  { id: 'b-do-end', topic: 'blocks', type: 'predict',
    q: 'Nested blocks sharing a variable.',
    code: `r = []
(0..2).each do |j|
  (j..2).each { |k| r.push(k) }
end`,
    parts: [{ ask: 'r', a: '[0, 1, 2, 1, 2, 2]' }, { ask: 'r.size', a: '6' }],
    explain: 'Both blocks can see `r` (lexical scope), and the inner block can also see the outer block\'s `j`.' },

  { id: 'b-count', topic: 'blocks', type: 'mcq', src: 'slides',
    q: 'How many blocks can be passed in one method call?',
    options: ['Zero or one, placed next to the other arguments', 'Any number, separated by commas like other arguments', 'Exactly one: a call without a block is a syntax error', 'At most as many as the method has declared parameters'], answer: 0,
    explain: 'You can pass 0 or 1 block with **any** message. The callee does not declare it in its parameter list; it just calls `yield`. To pass several closures, use Proc objects as ordinary arguments.' },

  { id: 'b-style', topic: 'blocks', type: 'mcq', src: 'slides',
    q: 'Which is the style advice from the slides?',
    options: ['Use a range instead of an array when you can, and a hash when non-numeric keys fit the data', 'Use an explicit `while` loop when you can: iterators hide the control flow', 'Use an array of pairs instead of a hash, so the ordering is always explicit', 'Use `proc` instead of a block when you can, since procs are first-class'], answer: 0,
    explain: 'Ranges are cheaper than arrays of the same numbers; hashes are "dynamic records" when keys are not numbers. Loops exist but are rarely used: find a useful iterator instead.' },

  { id: 'b-firstclass', topic: 'blocks', type: 'explain', src: 'slides',
    q: 'What does it mean that blocks are "second-class" while Procs are "first-class"? Why did Ruby\'s designers accept this?',
    answer: '**First-class** means a value can be passed, returned and stored anywhere (in a variable, an array, an object\'s field). A block cannot: all a method can do with a block is `yield` to it. A `Proc` (made with `lambda`/`proc`) is an ordinary object with a `call` method, so it is first-class and strictly more powerful. Blocks are kept because they are a little more **convenient** and cover most uses. It is a language-design trade-off: convenience versus generality.',
    explain: 'Use a Proc when you need an array of closures or want to store a callback.' },

  { id: 'b-inject-write', topic: 'blocks', type: 'write',
    q: 'Write `sum_squares(xs)` that returns the sum of the squares of the numbers in `xs` (0 for an empty collection). Use `inject`; no loops and no `each`. It should also work for a range.',
    starter: `def sum_squares(xs)

end`,
    answer: `def sum_squares(xs)
  xs.inject(0) { |acc, x| acc + x * x }
end`,
    tests: [{ run: 'p sum_squares([1, 2, 3])', expect: '14' }, { run: 'p sum_squares([])', expect: '0' }, { run: 'p sum_squares(1..4)', expect: '30' }],
    require: [['inject|reduce', 'Use inject.']], forbid: [['\\b(while|until|for|each)\\b', 'No explicit loops and no each.']], hint: 'Start the accumulator at 0 so the empty case works: `xs.inject(0) { |acc, x| ... }`.',
    explain: 'Because it only calls `inject`, the method works for anything that has it: arrays, ranges, your own Enumerable classes (duck typing).' },

  { id: 'b-array-flex', topic: 'blocks', type: 'mcq', src: 'slides',
    q: 'Compared with arrays in many other languages, Ruby arrays are…',
    options: ['more flexible and dynamic, with fewer operations being errors, but less efficient', 'faster and more compact, because the element type is fixed when they are created', 'immutable, so every operation such as `push` returns a new array', 'fixed in size once created, although elements may be of any class'], answer: 0,
    explain: 'They are the standard collection (like lists in OCaml/Racket): dynamically sized, used for tuples, stacks, queues and sets. The price for flexibility is efficiency.' },
  );
})();

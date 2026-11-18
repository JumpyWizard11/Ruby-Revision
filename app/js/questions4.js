// Question bank part 4: "rewrite / fix this code" questions (tag: 'rewrite').
// Each has a working-but-bad (or broken) starter, tests, and style rules (require / forbid) that the model answer passes.
(function () {
  const Q = window.QUESTIONS;
  Q.push(
  { id: 'r-map', topic: 'blocks', type: 'write', tag: 'rewrite',
    q: 'This works, but it is a Java loop wearing a Ruby costume. Rewrite `squares` using the right **iterator** (no `while`, no index variable).',
    starter: `def squares(arr)
  result = []
  i = 0
  while i < arr.length
    result.push(arr[i] * arr[i])
    i += 1
  end
  result
end`,
    answer: `def squares(arr)
  arr.map { |x| x * x }
end`,
    hint: '`map` builds a new array from what the block returns for each element.',
    require: [['\\.(map|collect)\\b', 'use `map`']], forbid: [['\\bwhile\\b|\\bfor\\b|\\buntil\\b', 'no explicit loops'], ['\\[\\s*i\\s*\\]', 'no indexing']],
    tests: [{ run: 'p squares([1, 2, 3])', expect: '[1, 4, 9]' }, { run: 'p squares([])', expect: '[]' }, { run: 'p squares([-4])', expect: '[16]' }],
    explain: 'The slides: "good Ruby style is to use iterators with blocks instead of loops". `map` says *what* you want (a transformed array) instead of *how* to walk the indices.' },

  { id: 'r-select', topic: 'blocks', type: 'write', tag: 'rewrite',
    q: 'Rewrite `long_words` with one iterator call. It returns the words longer than `n` characters.',
    starter: `def long_words(words, n)
  result = []
  words.each do |w|
    if w.length > n
      result.push(w)
    end
  end
  result
end`,
    answer: `def long_words(words, n)
  words.select { |w| w.length > n }
end`,
    hint: '`select` keeps the elements for which the block is true. The block can use `n`: blocks are closures.',
    require: [['\\.(select|filter)\\b', 'use `select`']], forbid: [['\\.each\\b|\\bwhile\\b|\\bfor\\b', 'no `each` or loops'], ['push|<<', 'do not build the array by hand']],
    tests: [{ run: 'p long_words(["a", "tree", "ox", "banana"], 2)', expect: '["tree", "banana"]' }, { run: 'p long_words(["a", "b"], 5)', expect: '[]' }, { run: 'p long_words([], 0)', expect: '[]' }],
    explain: '`each` + `if` + `push` is the pattern `select` exists for. The block reads the method\'s parameter `n` from its defining environment.' },

  { id: 'r-inject', topic: 'blocks', type: 'write', tag: 'rewrite',
    q: 'Rewrite `total` using `inject` (Ruby\'s fold) instead of a mutable counter and `each`.',
    starter: `def total(prices)
  sum = 0
  prices.each { |p| sum = sum + p }
  sum
end`,
    answer: `def total(prices)
  prices.inject(0) { |acc, p| acc + p }
end`,
    hint: '`arr.inject(start) { |acc, x| ... }`: the block returns the next accumulator.',
    require: [['\\.(inject|reduce)\\b', 'use `inject`']], forbid: [['\\.each\\b|\\bwhile\\b|\\bfor\\b', 'no `each` or loops'], ['\\.sum\\b', 'practise `inject` here, not `sum`']],
    tests: [{ run: 'p total([3, 4, 5])', expect: '12' }, { run: 'p total([])', expect: '0' }, { run: 'p total([10])', expect: '10' }],
    explain: '`inject` is `fold_left`: start with 0, combine with each element in turn. Giving the initial value makes the empty array work.' },

  { id: 'r-any', topic: 'blocks', type: 'write', tag: 'rewrite',
    q: 'Rewrite `has_negative?` with one iterator call (no flag variable).',
    starter: `def has_negative?(nums)
  found = false
  nums.each do |n|
    if n < 0
      found = true
    end
  end
  found
end`,
    answer: `def has_negative?(nums)
  nums.any? { |n| n < 0 }
end`,
    hint: '`any?` is true if the block is true for at least one element.',
    require: [['\\.any\\?', 'use `any?`']], forbid: [['\\.each\\b|\\bwhile\\b|\\bfor\\b', 'no `each` or loops'], ['found|flag', 'no flag variable']],
    tests: [{ run: 'p has_negative?([3, -1, 4])', expect: 'true' }, { run: 'p has_negative?([3, 1, 4])', expect: 'false' }, { run: 'p has_negative?([])', expect: 'false' }],
    explain: '`any?` and `all?` replace the flag-and-loop pattern, and they stop early once the answer is known.' },

  { id: 'r-attr', topic: 'oop', type: 'write', tag: 'rewrite',
    q: 'Four methods of pure boilerplate. Replace the hand-written getters and setters with the built-in shorthand. `name` must be readable **and** writable, `id` readable only.',
    starter: `class Student
  def initialize(name, id)
    @name = name
    @id = id
  end
  def name
    @name
  end
  def name=(n)
    @name = n
  end
  def id
    @id
  end
end`,
    answer: `class Student
  attr_accessor :name
  attr_reader :id
  def initialize(name, id)
    @name = name
    @id = id
  end
end`,
    hint: '`attr_reader :a` defines a getter; `attr_accessor :a` defines getter and setter.',
    require: [['attr_accessor\\s+:name', 'use `attr_accessor :name`'], ['attr_reader\\s+.*:id', 'use `attr_reader :id`']], forbid: [['def\\s+(name|id)\\b', 'do not write the getters/setters by hand'], ['attr_accessor[^\\n]*:id|attr_writer[^\\n]*:id', '`id` must stay read-only']],
    tests: [{ run: 's = Student.new("Ann", 7)\ns.name = "Bo"\np s.name', expect: '"Bo"' }, { run: 'p Student.new("Ann", 7).id', expect: '7' }, { run: 'p Student.new("Ann", 7).respond_to?(:id=)', expect: 'false' }],
    explain: '`attr_reader`, `attr_writer` and `attr_accessor` are just method calls that define these one-line methods for you. Instance variables stay private; only the methods you ask for exist.' },

  { id: 'r-init', topic: 'oop', type: 'write', tag: 'rewrite',
    q: '**Fix the bug.** `Counter.new.bump` crashes with `undefined method \'+\' for nil`. Make a fresh counter start at 0.',
    starter: `class Counter
  def bump
    @count = @count + 1
    @count
  end
end`,
    answer: `class Counter
  def initialize
    @count = 0
  end
  def bump
    @count = @count + 1
    @count
  end
end`,
    hint: 'An instance variable that was never assigned is `nil`. Where do instance variables get their first value?',
    require: [['def\\s+initialize', 'define `initialize`']],
    tests: [{ run: 'c = Counter.new\nc.bump\np c.bump', expect: '2' }, { run: 'p Counter.new.bump', expect: '1' }],
    explain: 'Ruby never declares instance variables: reading an unassigned `@count` quietly gives `nil`, and `nil + 1` is the error. `initialize` runs on every `new` and is where the state should be set up.' },

  { id: 'r-chain', topic: 'oop', type: 'write', tag: 'rewrite',
    q: '**Fix it** so that calls can be chained: `Cart.new.add(3).add(4).total` should be `7`. At the moment `add` returns the wrong thing.',
    starter: `class Cart
  def initialize
    @total = 0
  end
  def add(price)
    @total = @total + price
  end
  def total
    @total
  end
end`,
    answer: `class Cart
  def initialize
    @total = 0
  end
  def add(price)
    @total = @total + price
    self
  end
  def total
    @total
  end
end`,
    hint: 'A method returns its last expression. For chaining, the result of `add` must be the cart itself.',
    require: [['\\bself\\b', 'return `self` from `add`']],
    tests: [{ run: 'p Cart.new.add(3).add(4).total', expect: '7' }, { run: 'p Cart.new.total', expect: '0' }, { run: 'c = Cart.new\nc.add(5)\np c.total', expect: '5' }],
    explain: '`add` returned the new total (an Integer), so the second `.add` was sent to a number. Ending a mutating method with `self` is the idiom that makes `a.m1.m2.m3` chains work.' },

  { id: 'r-alias', topic: 'blocks', type: 'write', tag: 'rewrite',
    q: '**Fix the bug.** `with_bonus(scores)` should return a *new* array with 10 appended, leaving the caller\'s array unchanged. Right now it changes the caller\'s array too.',
    starter: `def with_bonus(scores)
  result = scores
  result.push(10)
  result
end`,
    answer: `def with_bonus(scores)
  result = scores + [10]
  result
end`,
    hint: '`result = scores` makes an **alias**, not a copy. `a + b` builds a new array.',
    forbid: [['result\\s*=\\s*scores\\s*$', '`result = scores` is only an alias of the same array']],
    tests: [{ run: 'a = [1, 2]\nb = with_bonus(a)\np a', expect: '[1, 2]' }, { run: 'p with_bonus([1, 2])', expect: '[1, 2, 10]' }, { run: 'p with_bonus([])', expect: '[10]' }],
    explain: 'Variables hold references. After `result = scores` there is still one array with two names, and `push` mutates it. `scores + [10]` (or `scores.dup`) creates a second array.' },

  { id: 'r-next', topic: 'blocks', type: 'write', tag: 'rewrite',
    q: '**Fix the bug.** `halves` should halve the even numbers and turn odd ones into 0: `halves([4, 3, 10])` is `[2, 0, 5]`. It currently returns just `0` for that input. Keep using `map`.',
    starter: `def halves(nums)
  nums.map do |n|
    if n.odd?
      return 0
    end
    n / 2
  end
end`,
    answer: `def halves(nums)
  nums.map do |n|
    if n.odd?
      next 0
    end
    n / 2
  end
end`,
    hint: '`return` inside a block returns from the **enclosing method**. To finish only the current block call with a value, use `next value` (or an if/else expression).',
    require: [['\\.map\\b', 'keep using `map`']], forbid: [['\\breturn\\b', '`return` in a block leaves the whole method']],
    tests: [{ run: 'p halves([4, 3, 10])', expect: '[2, 0, 5]' }, { run: 'p halves([1])', expect: '[0]' }, { run: 'p halves([])', expect: '[]' }],
    explain: 'A block is not a method: `return` inside it means "return from `halves`", so the first odd number ended everything with 0. `next 0` ends just this block call. (In a `lambda`, `return` would behave like `next`.)' },

  { id: 'r-yieldwrap', topic: 'blocks', type: 'write', tag: 'rewrite',
    q: '**Fix the bug.** `Playlist#each` should hand every song to the caller\'s block, but `Playlist.new(["a", "b"]).each { |s| puts s }` prints nothing.',
    starter: `class Playlist
  def initialize(songs)
    @songs = songs
  end
  def each
    @songs.each
  end
end`,
    answer: `class Playlist
  def initialize(songs)
    @songs = songs
  end
  def each
    @songs.each { |s| yield s }
  end
end`,
    hint: 'The block given to `Playlist#each` is not passed on automatically. Give `@songs.each` a block that `yield`s each element.',
    require: [['yield', 'use `yield` to call the caller\'s block']],
    tests: [{ run: 'out = []\nPlaylist.new(["a", "b"]).each { |s| out.push(s.upcase) }\np out', expect: '["A", "B"]' }, { run: 'n = 0\nPlaylist.new([]).each { |s| n += 1 }\np n', expect: '0' }],
    explain: 'A block belongs to exactly one call. `@songs.each` here was called with **no** block. Wrapping, `{ |s| yield s }`, forwards each element to the block of the outer method. You need this pattern in every hand-written `each`.' },

  { id: 'r-lambda', topic: 'blocks', type: 'write', tag: 'rewrite',
    q: '**Fix it.** `make_adders` should return an array of three **callable** objects that add 1, 2 and 3: `make_adders[1].call(10)` is `12`. Blocks cannot be stored in an array, and this code stores the wrong thing.',
    starter: `def make_adders
  [1, 2, 3].map { |n| n + 0 }
end`,
    answer: `def make_adders
  [1, 2, 3].map { |n| lambda { |x| x + n } }
end`,
    hint: 'Turn a block into a first-class object with `lambda { |x| ... }`. The lambda closes over `n`.',
    require: [['lambda|->|Proc\\.new|\\bproc\\b', 'create a Proc with `lambda`']],
    tests: [{ run: 'p make_adders[1].call(10)', expect: '12' }, { run: 'p make_adders.map { |f| f.call(0) }', expect: '[1, 2, 3]' }, { run: 'p make_adders.length', expect: '3' }],
    explain: 'Blocks are second-class: you can only pass one to a method and `yield` to it. A `lambda` makes a real object (a `Proc`) you can store, return and `call` later. Each lambda keeps its own `n`: a closure.' },

  { id: 'r-dispatch', topic: 'dispatch', type: 'write', tag: 'rewrite',
    q: 'This "works" but is **not OOP**: one function tests the class of its argument. Rewrite it so each class has its own `area` method and `describe` just calls `shape.area`.',
    starter: `class Circle
  attr_reader :r
  def initialize(r)
    @r = r
  end
end
class Rect
  attr_reader :w, :h
  def initialize(w, h)
    @w = w
    @h = h
  end
end
def describe(shape)
  if shape.is_a?(Circle)
    "area " + (3 * shape.r * shape.r).to_s
  elsif shape.is_a?(Rect)
    "area " + (shape.w * shape.h).to_s
  end
end`,
    answer: `class Circle
  attr_reader :r
  def initialize(r)
    @r = r
  end
  def area
    3 * r * r
  end
end
class Rect
  attr_reader :w, :h
  def initialize(w, h)
    @w = w
    @h = h
  end
  def area
    w * h
  end
end
def describe(shape)
  "area " + shape.area.to_s
end`,
    hint: 'Move each branch into the class it is about, as a method `area`. Dynamic dispatch then picks the right one.',
    require: [['def\\s+area', 'define `area` in the classes'], ['shape\\.area', '`describe` should call `shape.area`']], forbid: [['is_a\\?|instance_of\\?|\\.class\\b|kind_of\\?', 'no type tests: use dynamic dispatch']],
    tests: [{ run: 'p describe(Circle.new(2))', expect: '"area 12"' }, { run: 'p describe(Rect.new(3, 4))', expect: '"area 12"' }, { run: 'p Rect.new(2, 5).area', expect: '10' }],
    explain: 'An `is_a?` chain is the FP `match` written badly: every new shape means editing `describe`. With a method per class, adding `Triangle` touches no existing code. Exams mark `is_a?` solutions as "not OOP style".' },

  { id: 'r-getters', topic: 'dispatch', type: 'write', tag: 'rewrite', prelude: 'polar',
    q: '`dist_to_origin` is written with instance variables, so it breaks for the subclass `PolarPoint` (which has no `@x`/`@y`, only overridden `x` and `y` methods). Rewrite the method so it works for **both** classes.',
    starter: `class Point
  def dist_to_origin
    Math.sqrt(@x * @x + @y * @y)
  end
end`,
    answer: `class Point
  def dist_to_origin
    Math.sqrt(x * x + y * y)
  end
end`,
    hint: 'Call the getters `x` and `y` (method calls on `self`) instead of reading `@x` and `@y`.',
    forbid: [['@x|@y', 'do not read `@x`/`@y` directly: a `PolarPoint` has none'], ['class\\s+PolarPoint', 'only change `Point`']],
    tests: [{ run: 'p Point.new(3, 4).dist_to_origin', expect: '5.0' }, { run: 'p PolarPoint.new(2, 0).dist_to_origin', expect: '2.0' }],
    explain: 'This is `distFromOrigin` vs `distFromOrigin2` from the slides. `x` means `self.x`, which is **late bound**: for a `PolarPoint` it runs the overriding `x` that computes `r * cos(theta)`. `@x` is just a field read and is `nil` there.' },

  { id: 'r-super', topic: 'dispatch', type: 'write', tag: 'rewrite', prelude: 'point',
    q: '`ColorPoint` copies the body of `Point#initialize`. Remove the duplication by calling the superclass\'s `initialize`.',
    starter: `class ColorPoint < Point
  attr_accessor :color
  def initialize(x, y, c)
    @x = x
    @y = y
    @color = c
  end
end`,
    answer: `class ColorPoint < Point
  attr_accessor :color
  def initialize(x, y, c)
    super(x, y)
    @color = c
  end
end`,
    hint: '`super(x, y)` calls the method of the same name in the superclass.',
    require: [['super\\s*\\(\\s*x\\s*,\\s*y\\s*\\)', 'call `super(x, y)`']], forbid: [['@x|@y', 'let `Point#initialize` set `@x` and `@y`']],
    tests: [{ run: 'c = ColorPoint.new(3, 4, "red")\np [c.x, c.y, c.color]', expect: '[3, 4, "red"]' }, { run: 'p ColorPoint.new(3, 4, "red").distFromOrigin', expect: '5.0' }],
    explain: 'If `Point#initialize` ever changes (validation, a new field), the copy would silently go out of date. Note `super(x, y)` with explicit arguments: a bare `super` would pass all three arguments and fail.' },

  { id: 'r-protected', topic: 'oop', type: 'write', tag: 'rewrite',
    q: '**Fix it.** `a.richer_than?(b)` crashes with `private method \'balance\' called`. Keep `balance` hidden from outside code, but let another `Account` read it.',
    starter: `class Account
  def initialize(balance)
    @balance = balance
  end
  def richer_than?(other)
    balance > other.balance
  end
  private
  def balance
    @balance
  end
end`,
    answer: `class Account
  def initialize(balance)
    @balance = balance
  end
  def richer_than?(other)
    balance > other.balance
  end
  protected
  def balance
    @balance
  end
end`,
    hint: '`private`: only callable on `self`. `protected`: callable from methods of the same class (or subclasses) on **other** instances too.',
    require: [['\\bprotected\\b', 'use `protected`']], forbid: [['attr_reader|attr_accessor|public', '`balance` must not become public']],
    tests: [{ run: 'p Account.new(50).richer_than?(Account.new(20))', expect: 'true' }, { run: 'p Account.new(5).richer_than?(Account.new(20))', expect: 'false' }, { run: 'begin\n  Account.new(5).balance\n  puts "public!"\nrescue NoMethodError\n  puts "hidden"\nend', expect: 'hidden' }],
    explain: 'This is exactly why `protected` exists (the slides\' `MyRational` uses it for `num` and `den`): binary methods like `+`, `==` or `richer_than?` need the *other* object\'s data, while outside code still gets a `NoMethodError`.' },

  { id: 'r-comparable', topic: 'mixins', type: 'write', tag: 'rewrite',
    q: 'Four near-identical comparison methods. Replace them with **one** method and a mixin. Heights compare by `cm`.',
    starter: `class Height
  attr_reader :cm
  def initialize(cm)
    @cm = cm
  end
  def <(other)
    cm < other.cm
  end
  def >(other)
    cm > other.cm
  end
  def <=(other)
    cm <= other.cm
  end
  def >=(other)
    cm >= other.cm
  end
end`,
    answer: `class Height
  include Comparable
  attr_reader :cm
  def initialize(cm)
    @cm = cm
  end
  def <=>(other)
    cm <=> other.cm
  end
end`,
    hint: 'Define `<=>` and `include Comparable`.',
    require: [['include\\s+Comparable', '`include Comparable`'], ['def\\s+<=>', 'define `<=>`']], forbid: [['def\\s+(<|>|<=|>=)\\s*\\(', 'do not define `<`, `>`, `<=`, `>=` by hand']],
    tests: [{ run: 'p Height.new(170) < Height.new(180)', expect: 'true' }, { run: 'p Height.new(170) >= Height.new(180)', expect: 'false' }, { run: 'p Height.new(170) == Height.new(170)', expect: 'true' }, { run: 'p Height.new(175).between?(Height.new(170), Height.new(180))', expect: 'true' }],
    explain: 'The rewritten class is shorter **and** does more: `==` and `between?` now work, and arrays of heights can be sorted. That is the mixin bargain: you supply `<=>`, `Comparable` supplies the rest.' },

  { id: 'r-enumerable', topic: 'mixins', type: 'write', tag: 'rewrite',
    q: '`Bag` re-implements collection methods by hand. Keep `each`, delete the hand-written `to_a` and `include?`, and get them (and `map`, `select`, ...) from a mixin.',
    starter: `class Bag
  def initialize(items)
    @items = items
  end
  def each
    @items.each { |x| yield x }
  end
  def to_a
    result = []
    each { |x| result.push(x) }
    result
  end
  def include?(v)
    found = false
    each { |x| found = true if x == v }
    found
  end
end`,
    answer: `class Bag
  include Enumerable
  def initialize(items)
    @items = items
  end
  def each
    @items.each { |x| yield x }
  end
end`,
    hint: '`include Enumerable` gives every class with an `each` about fifty iterator methods.',
    require: [['include\\s+Enumerable', '`include Enumerable`'], ['def\\s+each', 'keep `each`']], forbid: [['def\\s+(to_a|include\\?|map|select)\\b', 'do not write these by hand']],
    tests: [{ run: 'p Bag.new([3, 1, 2]).to_a', expect: '[3, 1, 2]' }, { run: 'p Bag.new([3, 1, 2]).include?(1)', expect: 'true' }, { run: 'p Bag.new([3, 1, 2]).map { |x| x * 10 }', expect: '[30, 10, 20]' }, { run: 'p Bag.new([3, 1, 2]).sort', expect: '[1, 2, 3]' }],
    explain: 'The deleted methods were correct, just pointless: `Enumerable` contains the same code, written once for every collection. The starter also lacked `map` and `sort`; the mixin version has them for free.' },

  { id: 'r-dd-order', topic: 'extend', type: 'write', tag: 'rewrite',
    q: '**Fix the bug** in this double dispatch. `MyString.new("hi").add_values(Int.new(3))` should be the string `"hi3"` (left operand first), but it gives `"3hi"`. In `addString`/`addInt`, **self is the right-hand operand** and the parameter is the left-hand one.',
    starter: `class Int
  attr_reader :i
  def initialize(i)
    @i = i
  end
  def add_values(v)        # self is the LEFT operand
    v.addInt(self)
  end
  def addInt(v)            # v + self, both Ints
    Int.new(v.i + i)
  end
  def addString(v)         # v is a MyString on the left, self an Int on the right
    MyString.new(i.to_s + v.s)
  end
end
class MyString
  attr_reader :s
  def initialize(s)
    @s = s
  end
  def add_values(v)
    v.addString(self)
  end
  def addString(v)
    MyString.new(v.s + s)
  end
  def addInt(v)            # v is an Int on the left, self a MyString on the right
    MyString.new(v.i.to_s + s)
  end
end`,
    answer: `class Int
  attr_reader :i
  def initialize(i)
    @i = i
  end
  def add_values(v)        # self is the LEFT operand
    v.addInt(self)
  end
  def addInt(v)            # v + self, both Ints
    Int.new(v.i + i)
  end
  def addString(v)         # v is a MyString on the left, self an Int on the right
    MyString.new(v.s + i.to_s)
  end
end
class MyString
  attr_reader :s
  def initialize(s)
    @s = s
  end
  def add_values(v)
    v.addString(self)
  end
  def addString(v)
    MyString.new(v.s + s)
  end
  def addInt(v)            # v is an Int on the left, self a MyString on the right
    MyString.new(v.i.to_s + s)
  end
end`,
    hint: 'Trace it: `MyString("hi").add_values(Int(3))` calls `Int(3).addString(MyString("hi"))`. In that method the *parameter* is the left operand.',
    forbid: [['is_a\\?|instance_of\\?', 'no type tests']],
    tests: [{ run: 'p MyString.new("hi").add_values(Int.new(3)).s', expect: '"hi3"' }, { run: 'p Int.new(3).add_values(MyString.new("hi")).s', expect: '"3hi"' }, { run: 'p Int.new(3).add_values(Int.new(4)).i', expect: '7' }, { run: 'p MyString.new("a").add_values(MyString.new("b")).s', expect: '"ab"' }],
    explain: 'The second dispatch **swaps the roles**: the original receiver becomes the argument. For a commutative operation nobody notices, but string concatenation is not commutative. The slides flag this exact pitfall in `MyString#addInt` and friends: always write `v` (the left operand) first.' }
  );
})();

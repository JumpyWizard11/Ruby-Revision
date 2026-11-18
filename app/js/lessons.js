// lessons.js: the learning content, one topic per slide deck (ruby1.pdf ... ruby7.pdf), in lecture order.
// Markup used inside bodies (turned into live widgets by app.js):
//   <pre data-run>code</pre>            runnable + editable Ruby   (data-echo: show "=> value" for every line, like irb;
//                                        data-prelude="key": prepend window.PRELUDES[key] invisibly)
//   <div data-widget="name"></div>      a visualiser from viz.js   (e.g. "stepper:polar", "dispatch:polar", "dd", "subtype")
//   <div data-quiz="question-id"></div> an inline check question from the question bank
//   <a data-map="node-id">text</a>      jump to that concept on the Connections map
// Inside <pre> write &lt; for < and &amp; for &.
(function () {
  window.TOPICS = [
  // =====================================================================
  { id: 'oop', icon: '💎', title: 'Objects, classes & state', slides: 'ruby1.pdf',
    blurb: 'Pure OOP, classes and methods, instance variables, getters/setters, private/protected, dynamic classes, duck typing.',
    sections: [
    { id: 'big', title: 'Where Ruby fits', body: `
<p>The course compares languages along two axes. Ruby fills the last corner:</p>
<table class="cmp"><tr><th></th><th>dynamically typed</th><th>statically typed</th></tr>
<tr><td><b>functional</b></td><td>Racket</td><td>OCaml</td></tr>
<tr><td><b>object-oriented</b></td><td><b>Ruby</b></td><td>Java, C#, ...</td></tr></table>
<p>Ruby is <b>pure, class-based OOP</b>. The rules:</p>
<ol><li><b>All values are references to objects</b> (even <code>3</code>, <code>nil</code>, <code>true</code>).</li>
<li>Objects communicate via <b>method calls</b>, also called <b>messages</b>.</li>
<li>Each object has its own <b>private state</b>.</li>
<li>Every object is an <b>instance of a class</b>.</li>
<li>An object's class determines its <b>behaviour</b> (the class holds the methods).</li></ol>
<pre data-run data-echo>3 + 4
3.+(4)
-7.abs
nil.nil?
3.class
"hi".class
nil.class</pre>
<p><code>3 + 4</code> is only sugar for the method call <code>3.+(4)</code>: send the message <code>+</code> to the object 3 with argument 4.</p>
<div class="callout key">🔑 The question for the whole Ruby unit: <i>"Which object receives this message, and so which method runs?"</i> Later this becomes <a data-map="dispatch">dynamic dispatch</a>.</div>
<div class="callout trap">⚠️ The slides were made with an older Ruby. Error messages there look like <code>undefined method \`foo' for nil:NilClass</code>; current Ruby (and this app) prints <code>undefined method 'foo' for nil</code>. The app accepts either in answers.</div>
<div data-quiz="o-rules"></div>` },

    { id: 'classes', title: 'Classes, methods, self', body: `
<pre data-run>class A
  def m1
    34
  end
  def m2(x, y)
    z = 7                  # a local variable
    if x > y then false else x + y * z end
  end
end
a = A.new                # make an instance
puts a.m1
puts a.m2(3, 4)</pre>
<ul><li>A method returns its <b>last expression</b> (<code>return</code> is optional and mostly used for early exits).</li>
<li><b>Everything is an expression</b>, including <code>if</code>.</li>
<li>Only <code>false</code> and <code>nil</code> count as false. <code>0</code>, <code>""</code> and <code>[]</code> are all <b>true</b>.</li>
<li>Parentheses on calls are optional: <code>a.m1</code>, <code>puts x</code>.</li>
<li><code>self</code> is the current object. <code>m(args)</code> with no receiver means <code>self.m(args)</code>.</li></ul>
<p>Returning <code>self</code> allows chains:</p>
<pre data-run>class B
  def m1
    puts "m1"
    self
  end
  def m2
    puts "m2"
    self
  end
end
B.new.m1.m2.m1</pre>
<div data-quiz="o-truthy"></div>
<div data-quiz="o-chain"></div>` },

    { id: 'state', title: 'Object state: @, @@, initialize', body: `
<p>An object's state is its <b>instance variables</b>, written <code>@name</code>. They are <b>not declared</b>: one springs into existence when first assigned, and reading one that was never assigned gives <code>nil</code> (no error!).</p>
<pre data-run>class Counter
  def initialize(start=0)   # called by Counter.new; default argument
    @count = start
  end
  def bump
    @count += 1
    self
  end
  def count
    @count
  end
end
c = Counter.new
d = Counter.new(10)
c.bump.bump
puts c.count
puts d.count</pre>
<table class="cmp"><tr><th>Written</th><th>Is</th><th>Shared by</th></tr>
<tr><td><code>x</code></td><td>local variable</td><td>one method call</td></tr>
<tr><td><code>@x</code></td><td>instance variable</td><td>one object</td></tr>
<tr><td><code>@@x</code></td><td>class variable</td><td>all instances of the class</td></tr>
<tr><td><code>X</code>, <code>Math::PI</code></td><td>constant</td><td>everyone (should not be reassigned)</td></tr>
<tr><td><code>def self.m</code></td><td>class method, called <code>C.m</code></td><td>the class itself</td></tr></table>
<div data-widget="stepper:classvars"></div>
<div class="callout trap">⚠️ A typo such as <code>@cuont</code> is not an error: it silently creates/reads a different variable holding <code>nil</code>. Typical exam symptom: <code>undefined method '+' for nil</code>.</div>
<p><b>Aliasing</b>: variables hold references. <code>y = x</code> makes a second name for the same object, so mutation through one is visible through the other.</p>
<div data-widget="stepper:aliasing"></div>
<div data-quiz="o-state"></div>
<div data-quiz="o-classvar"></div>` },

    { id: 'attr', title: 'Getters, setters, attr_*', body: `
<p>Instance variables are <b>always private to the object</b>. There is no syntax like <code>obj.@x</code>. To expose state you write methods:</p>
<pre data-run>class Point
  def initialize(x, y)
    @x = x
    @y = y
  end
  def x          # getter
    @x
  end
  def x=(v)      # setter: note the = in the NAME
    @x = v
  end
end
pt = Point.new(3, 4)
pt.x = 10        # sugar for pt.x=(10)
puts pt.x</pre>
<p>Because that is so common, there is shorthand (these are just methods that define methods):</p>
<table class="cmp"><tr><th>Shorthand</th><th>Defines</th></tr>
<tr><td><code>attr_reader :x, :y</code></td><td>getters <code>x</code>, <code>y</code></td></tr>
<tr><td><code>attr_writer :x</code></td><td>setter <code>x=</code></td></tr>
<tr><td><code>attr_accessor :x</code></td><td>both</td></tr></table>
<div class="callout key">🔑 <code>pt.x</code> is <b>always a method call</b>, never a field read. That matters later: a subclass can <a data-map="override">override</a> <code>x</code>, and code that uses the getter keeps working (the PolarPoint example).</div>
<div data-quiz="o-attr"></div>
<div data-quiz="r-attr"></div>` },

    { id: 'visibility', title: 'private, protected, public', body: `
<table class="cmp"><tr><th></th><th>Who may call the method</th></tr>
<tr><td><b>public</b> (default)</td><td>anyone</td></tr>
<tr><td><b>protected</b></td><td>code inside the same class or its subclasses, on <b>any</b> instance (<code>other.num</code>)</td></tr>
<tr><td><b>private</b></td><td>only on <code>self</code>: written as <code>m(args)</code> with no receiver</td></tr></table>
<p>The slides' <code>MyRational</code> shows why <code>protected</code> exists: <code>+</code> needs the <b>other</b> fraction's numerator and denominator, which outside code should not see.</p>
<pre data-run>class MyRational
  def initialize(num, den=1)
    if den == 0
      raise "MyRational received an inappropriate argument"
    elsif den &lt; 0
      @num = -num
      @den = -den
    else
      @num = num
      @den = den
    end
    reduce            # private helper, called on self
  end
  def to_s
    ans = @num.to_s
    ans += "/" + @den.to_s if @den != 1
    ans
  end
  def + r
    MyRational.new(@num * r.den + r.num * @den, @den * r.den)
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
    if x == y then x elsif x &lt; y then gcd(x, y - x) else gcd(y, x) end
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
end
a = MyRational.new(1, 2)
b = MyRational.new(1, 3)
puts (a + b).to_s
puts a.num           # error: protected</pre>
<div class="callout trap">⚠️ In the Ruby of the slides, a private method could not even be called as <code>self.m</code> (only bare <code>m</code>). Newer Ruby allows the literal receiver <code>self</code>. Either way: never <code>other.m</code>.</div>
<div data-quiz="o-visibility"></div>
<div data-quiz="r-protected"></div>` },

    { id: 'dynamic', title: 'Everything is dynamic: reflection, open classes, duck typing', body: `
<p>You can ask objects about themselves at run time, and <b>change classes while the program runs</b> (even built-in ones):</p>
<pre data-run>puts 3.class
puts 3.respond_to?(:abs)
puts 3.is_a?(Integer)
class Integer
  def double          # add a method to EVERY integer
    self + self
  end
end
puts 5.double
class Foo
  def m; "old"; end
end
f = Foo.new
class Foo
  def m; "new"; end   # replaces m, also for objects that already exist
end
puts f.m</pre>
<p>The moral of the slides: dynamic features make programs <b>harder to reason about</b> (any code can change what <code>+</code> means), but they are simple and flexible.</p>
<h4>Duck typing</h4>
<p>"If it walks like a duck and quacks like a duck, it's a duck." A method does not care about the <i>class</i> of its argument, only which <b>messages</b> it responds to:</p>
<pre data-run>def mirror_update pt
  pt.x = pt.x * (-1)      # needs: x and x=   (nothing else!)
end
class Pt
  attr_accessor :x
  def initialize(x)
    @x = x
  end
end
p1 = Pt.new(3)
mirror_update(p1)
puts p1.x</pre>
<div class="callout link">🔗 Duck typing is the dynamic-typing answer to what <a data-map="subtyping">subtyping</a>, <a data-map="interface">interfaces</a> and <a data-map="generics">generics</a> achieve in static languages. Plus: more code reuse. Minus: the "contract" (needs <code>x</code> and <code>x=</code>) is invisible, and you cannot swap <code>pt.x * (-1)</code> for <code>-pt.x</code> without changing what is required.</div>
<div data-quiz="o-duck"></div>
<div data-quiz="o-changing"></div>` },

    { id: 'exam', title: 'Exam skill: tracing object state', body: `
<p>OOP "what does this print" questions are won on paper with a small table: one row per object, one column per instance variable.</p>
<ol><li>For each <code>new</code>, add a row and run <code>initialize</code>.</li>
<li>For each call, write down <b>who is self</b>. <code>@x</code> always means <i>self's</i> x.</li>
<li>Remember aliases: two variables, one row.</li>
<li>Unassigned <code>@v</code> is <code>nil</code>; <code>@@v</code> is one cell shared by all rows.</li>
<li>A method's value is its last expression (a <code>puts</code> at the end returns <code>nil</code>!).</li></ol>
<div data-quiz="o-init"></div>
<div data-quiz="o-localscope"></div>
<div data-quiz="r-init"></div>` }
    ] },

  // =====================================================================
  { id: 'blocks', icon: '🧱', title: 'Arrays, blocks, procs, hashes', slides: 'ruby2.pdf',
    blurb: 'Flexible arrays, iterators with blocks, yield, closures, Proc/lambda, hashes, ranges.',
    sections: [
    { id: 'arrays', title: 'Arrays do everything', body: `
<p>Ruby's <code>Array</code> is a growable, mixed-type array that also serves as tuple, list, stack, queue and set.</p>
<pre data-run data-echo>a = [3, 2, 7, 9]
a[2]
a[-1]
a[10]
a.size
a.push(5)
a.pop
a.shift
a.unshift(1)
a + [0, 0]
a | [7, 8]
a[1, 2]
[1, "two", nil, [4]].length
Array.new(3) { |i| i * i }</pre>
<ul><li>Out-of-bounds read: <code>nil</code>, no error. Out-of-bounds write: the array grows, gaps filled with <code>nil</code>.</li>
<li>Negative indices count from the end.</li>
<li><code>push</code>/<code>pop</code> = stack at the end; <code>shift</code>/<code>unshift</code> = the front; <code>a[i, n]</code> = slice.</li>
<li><code>+</code> makes a <b>new</b> array; <code>push</code> <b>mutates</b>. With aliasing that difference is everything.</li></ul>
<div data-quiz="b-arr"></div>
<div data-quiz="b-alias"></div>
<div data-quiz="r-alias"></div>` },

    { id: 'blocks', title: 'Blocks and iterators', body: `
<p>A <b>block</b> is an anonymous function passed to a method, written <code>{ |x| ... }</code> or <code>do |x| ... end</code>. <b>Any</b> method call may be given zero or one block. Blocks are <b>closures</b>: they can read and assign the local variables around them.</p>
<pre data-run>a = [3, 5, 7, 9]
sum = 0
a.each { |x| sum += x }          # the block updates the outer sum
puts sum
3.times { puts "hi" }
p a.map { |x| x * 2 }             # new array
p a.select { |x| x > 4 }          # filter
p a.any? { |x| x > 7 }
p a.all? { |x| x > 7 }
p a.inject(0) { |acc, x| acc + x }   # fold
a.each_with_index do |x, i|
  puts i.to_s + ": " + x.to_s
end</pre>
<div data-widget="iter"></div>
<table class="cmp"><tr><th>Ruby</th><th>OCaml</th><th>Gives</th></tr>
<tr><td><code>each</code></td><td><code>List.iter</code></td><td>the receiver (run for effect)</td></tr>
<tr><td><code>map</code> / <code>collect</code></td><td><code>List.map</code></td><td>new array of block results</td></tr>
<tr><td><code>select</code> / <code>filter</code></td><td><code>List.filter</code></td><td>elements where block is true</td></tr>
<tr><td><code>inject</code> / <code>reduce</code></td><td><code>List.fold_left</code></td><td>the final accumulator</td></tr>
<tr><td><code>any?</code> / <code>all?</code></td><td><code>List.exists</code> / <code>for_all</code></td><td>true or false</td></tr></table>
<div class="callout key">🔑 Good Ruby style: <b>use iterators with blocks instead of loops</b>. Each rewrite question in Practice that removes a <code>while</code> is drilling this.</div>
<div data-quiz="b-iters"></div>
<div data-quiz="r-map"></div>` },

    { id: 'yield', title: 'Writing methods that take blocks: yield', body: `
<p>The block is <b>not a named parameter</b>. The method calls it with <code>yield</code>; the value of <code>yield</code> is whatever the block returned. <code>block_given?</code> tells you whether there is one.</p>
<pre data-run>def silly a
  (yield a) + (yield 42)
end
puts silly(5) { |b| b * 2 }

class Foo
  def initialize(max)
    @max = max
  end
  def count base
    c = 0
    i = base
    while i &lt;= @max
      c += 1 if yield i
      i += 1
    end
    c
  end
end
puts Foo.new(10).count(1) { |i| i % 3 == 0 }</pre>
<div data-widget="stepper:yield"></div>
<div class="callout trap">⚠️ Calling <code>yield</code> when no block was given raises <code>LocalJumpError: no block given (yield)</code>. And a block is attached to exactly one call: to pass it on you must wrap it, <code>@items.each { |x| yield x }</code>.</div>
<div data-quiz="b-yield"></div>
<div data-quiz="b-noblock"></div>
<div data-quiz="r-yieldwrap"></div>` },

    { id: 'procs', title: 'Blocks are second-class; Procs are first-class', body: `
<p>A block can only be passed to one method and yielded to. It cannot be stored in a variable, put in an array, or returned. When you need a real function <b>value</b>, make a <code>Proc</code> with <code>lambda</code> and call it with <code>.call</code>:</p>
<pre data-run>a = [3, 5, 7, 9]
b = a.map { |x| x + 1 }                   # block: computes numbers now
c = a.map { |x| lambda { |y| x >= y } }   # an array of closures
puts c[2].call(17)
puts c[2].call(6)
puts c.count { |f| f.call(5) }             # how many elements are >= 5 ?</pre>
<div data-widget="stepper:closure"></div>
<table class="cmp"><tr><th></th><th>Block</th><th>Proc / lambda</th></tr>
<tr><td>Is an object?</td><td>no ("second-class")</td><td>yes, instance of <code>Proc</code></td></tr>
<tr><td>Store / return / put in array</td><td>no</td><td>yes</td></tr>
<tr><td>Called with</td><td><code>yield</code></td><td><code>f.call(args)</code></td></tr>
<tr><td>How many per call</td><td>at most one</td><td>any number, as ordinary arguments</td></tr>
<tr><td><code>return</code> inside</td><td>returns from the <b>enclosing method</b></td><td>returns from the lambda</td></tr></table>
<div data-widget="stepper:breakreturn"></div>
<div data-widget="sorter:blockproc"></div>
<div class="callout link">🔗 Closures here are the same idea as in OCaml and Racket: code plus the environment where it was defined. Ruby's twist is having <b>two</b> forms because the one-block case is so common. Later: <a data-map="objclosure">objects and closures</a> can encode each other.</div>
<div data-quiz="b-procs"></div>
<div data-quiz="b-return"></div>
<div data-quiz="r-next"></div>` },

    { id: 'hashes', title: 'Hashes, symbols, ranges', body: `
<pre data-run data-echo>h = {}
h["a"] = "Found A"
h[false] = "Found false"
h["a"]
h[42]
h.keys
h.delete("a")
h2 = {"SML" => 1, "Racket" => 2, "Ruby" => 3}
h2["Ruby"]
h3 = {:sml => 1, :ruby => 3}
h3[:ruby]
h2.each { |k, v| puts k + ": " + v.to_s }
(1..5).to_a
(1...5).to_a
(1..100).inject { |acc, x| acc + x }
(1..10).select { |x| x % 3 == 0 }</pre>
<ul><li>A <b>hash</b> maps any key to any value. Missing key: <code>nil</code>. <code>each</code> gives the block <b>two</b> arguments.</li>
<li>A <b>symbol</b> (<code>:foo</code>) is like a cheap immutable string, the usual choice for keys.</li>
<li>A <b>range</b> <code>1..n</code> is a compact "array" of consecutive values; it has the same iterators.</li></ul>
<div class="callout key">🔑 Duck typing again: <code>(1..5).map</code>, <code>[1,2].map</code> and <code>hash.map</code> all "just work", so code written against <code>each</code>/<code>map</code> does not care which collection it got. Use a range when you can, an array when you need to grow or mutate, a hash for non-numeric keys.</div>
<div data-quiz="b-hash"></div>
<div data-quiz="b-range"></div>` },

    { id: 'exam', title: 'Exam skill: return value vs printed output', body: `
<p>Most block mistakes in exams are about <b>what the call returns</b>, not what the block does.</p>
<table class="cmp"><tr><th>Call</th><th>Returns</th></tr>
<tr><td><code>arr.each { ... }</code></td><td><code>arr</code> itself (block results thrown away)</td></tr>
<tr><td><code>arr.map { ... }</code></td><td>a new array (of <code>nil</code>s if the block ends in <code>puts</code>!)</td></tr>
<tr><td><code>puts x</code></td><td><code>nil</code></td></tr>
<tr><td><code>x = 5</code> as last line</td><td>5</td></tr>
<tr><td><code>3.times { }</code></td><td>3</td></tr></table>
<p><code>puts</code> prints with <code>to_s</code> (arrays one element per line); <code>p</code> prints with <code>inspect</code> (strings keep their quotes) and returns its argument.</p>
<div data-quiz="b-each-ret"></div>
<div data-quiz="b-t-print"></div>
<div data-quiz="r-inject"></div>` }
    ] },

  // =====================================================================
  { id: 'dispatch', icon: '🎯', title: 'Subclassing & dynamic dispatch', slides: 'ruby3.pdf',
    blurb: 'Inheritance, overriding, super, method lookup, late binding via self, the even/odd puzzle, objects coded in Racket.',
    sections: [
    { id: 'subclass', title: 'Subclasses, is_a?, super', body: `
<p><code>class ColorPoint &lt; Point</code> makes a subclass. It <b>inherits all methods</b>; it can <b>add</b> methods and <b>override</b> them. Every class has exactly one superclass (default <code>Object</code>).</p>
<pre data-run>class Point
  attr_accessor :x, :y
  def initialize(x, y)
    @x = x
    @y = y
  end
  def distFromOrigin
    Math.sqrt(@x * @x + @y * @y)
  end
end
class ColorPoint &lt; Point
  attr_accessor :color
  def initialize(x, y, c="clear")
    super(x, y)          # run Point's initialize
    @color = c
  end
end
cp = ColorPoint.new(3, 4, "red")
puts cp.distFromOrigin       # inherited
puts cp.class
puts cp.class.superclass
puts cp.is_a?(Point)          # true: instance of Point or a subclass
puts cp.instance_of?(Point)   # false: exactly Point only
p ColorPoint.ancestors.take(3)</pre>
<div class="callout trap">⚠️ <b>Instance variables are not inherited</b>, because they are not part of a class at all. A <code>ColorPoint</code> has <code>@x</code> only because <code>super(x, y)</code> ran the code that assigns it. Forget <code>super</code> and <code>@x</code> is <code>nil</code>.</div>
<div class="callout key">🔑 Using <code>is_a?</code> / <code>instance_of?</code> to decide what to do is <b>"not OOP style"</b>: it breaks duck typing and must be edited for every new class. Put a method in each class and let dispatch choose.</div>
<div data-quiz="d-isa"></div>
<div data-quiz="d-nosuper"></div>
<div data-quiz="r-super"></div>` },

    { id: 'why', title: 'Why subclass? (and the alternatives)', body: `
<p>Could we get a <code>ColorPoint</code> without subclassing?</p>
<table class="cmp"><tr><th>Alternative</th><th>Problem</th></tr>
<tr><td>Add <code>color</code> to <code>Point</code> itself</td><td>changes every Point; breaks modularity</td></tr>
<tr><td>Copy and paste <code>Point</code></td><td>duplicated code drifts apart; no <code>is_a?(Point)</code></td></tr>
<tr><td>Keep a <code>Point</code> in an instance variable and <b>forward</b> messages</td><td>works well (often better!) but more code, and it is not "a Point" for <code>is_a?</code></td></tr></table>
<p>Subclassing is right when the new thing really <b>is a</b> more specific kind of the old thing. A <code>ThreeDPoint</code> is arguably <i>not</i> a <code>Point</code> (its distance is different), yet it is convenient to reuse the code: it <b>overrides</b> <code>distFromOrigin</code> and uses <code>super</code>:</p>
<pre data-run data-prelude="point">class ThreeDPoint2 &lt; Point
  attr_accessor :z
  def initialize(x, y, z)
    super(x, y)
    @z = z
  end
  def distFromOrigin
    d = super               # the overridden method, same arguments
    Math.sqrt(d * d + @z * @z)
  end
end
puts ThreeDPoint2.new(3, 4, 12).distFromOrigin</pre>
<div data-widget="stepper:super"></div>
<div data-quiz="d-subclass-alt"></div>
<div data-quiz="d-super"></div>
<div data-quiz="d-forward"></div>` },

    { id: 'dispatch', title: 'Dynamic dispatch (late binding)', body: `
<p>The heart of OOP. <code>PolarPoint</code> stores <code>@r</code> and <code>@theta</code> instead of <code>@x</code>/<code>@y</code> and overrides the getters. It does <b>not</b> override <code>distFromOrigin2</code>, yet that inherited method gives the right answer:</p>
<pre data-run>class Point
  attr_accessor :x, :y
  def initialize(x, y)
    @x = x
    @y = y
  end
  def distFromOrigin          # direct field access
    Math.sqrt(@x * @x + @y * @y)
  end
  def distFromOrigin2         # uses getters: self.x, self.y
    Math.sqrt(x * x + y * y)
  end
end
class PolarPoint &lt; Point
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
end
pp = PolarPoint.new(4, Math::PI / 4)
puts pp.distFromOrigin2       # 4.0 : calls PolarPoint's x and y
puts pp.distFromOrigin        # error: @x is nil</pre>
<div data-widget="stepper:polar"></div>
<div class="callout key">🔑 <b>Dynamic dispatch</b>: a call <code>self.m</code> inside a method defined in class C can run code from a <b>subclass</b> of C, because lookup always starts at the <b>class of the object self refers to</b>, not at the class where the calling code is written. (Also called late binding or virtual methods.)</div>
<div data-widget="dispatch:polar"></div>
<div data-quiz="d-polar"></div>
<div data-quiz="r-getters"></div>` },

    { id: 'rules', title: 'The method-lookup rules, precisely', body: `
<p>To evaluate <code>e0.m(e1, ..., en)</code>:</p>
<ol class="steps"><li>Evaluate <code>e0, e1, ..., en</code> to objects <code>obj0, obj1, ..., objn</code>.</li>
<li>Let <code>C</code> be the <b>class of obj0</b> (every object knows its class at run time).</li>
<li>Look for <code>m</code> in <code>C</code>, then (its mixins, then) its superclass, and so on up. None found: call <code>method_missing</code> (default: <code>NoMethodError</code>).</li>
<li>Run the method found with the parameters bound to <code>obj1..objn</code> and <b><code>self</code> bound to obj0</b>.</li></ol>
<p>Step 4 is what makes it dynamic: every later <code>self.anything</code> starts the search again from obj0's class.</p>
<table class="cmp"><tr><th>Looked up...</th><th>How</th></tr>
<tr><td>local variables, block parameters</td><td><b>lexical scope</b> (like OCaml/Racket)</td></tr>
<tr><td>instance variables <code>@x</code></td><td>in the object bound to <code>self</code></td></tr>
<tr><td>methods</td><td><b>dynamically</b>, from the class of the receiver</td></tr>
<tr><td><code>self</code></td><td>bound when the method is called; unchanged inside blocks</td></tr></table>
<div data-widget="dispatch:superc,missing"></div>
<div class="callout link">🔗 Java/C++ add <b>static overloading</b>: several methods with one name, chosen by the <i>compile-time</i> types of the arguments. Ruby has no static types, so it has no overloading: a second <code>def m</code> in the same class simply replaces the first. See <a data-map="multimethod">multimethods</a>.</div>
<div data-quiz="d-lookup-rules"></div>
<div data-quiz="d-what-prints"></div>` },

    { id: 'evenodd', title: 'The even/odd puzzle: closed functions vs open methods', body: `
<pre data-run>class A
  def even x
    puts "in even A"
    if x == 0 then true else odd(x - 1) end
  end
  def odd x
    puts "in odd A"
    if x == 0 then false else even(x - 1) end
  end
end
class B &lt; A
  def even x          # changes B's odd too!
    puts "in even B"
    x % 2 == 0
  end
end
puts A.new.odd(3)
puts "---"
puts B.new.odd(3)</pre>
<p>In OCaml, a function's calls to other functions are fixed when it is defined (<b>closed</b>): shadowing <code>even</code> later would not affect <code>odd</code>. With objects, <code>odd</code>'s call <code>even(x - 1)</code> is <code>self.even</code>, so a subclass can change it <b>without touching <code>odd</code></b>.</p>
<div data-widget="dispatch:evenodd"></div>
<table class="cmp"><tr><th>Dynamic dispatch</th><th></th></tr>
<tr><td>👍</td><td>Subclasses can change the behaviour of inherited methods just by overriding what they call: very flexible reuse.</td></tr>
<tr><td>👎</td><td>You cannot reason about a method by reading its class alone: any call on <code>self</code> may run code written later by someone else. Overriding can break inherited methods that relied on the old behaviour.</td></tr></table>
<div data-quiz="d-evenodd"></div>
<div data-quiz="d-closed"></div>
<div data-quiz="d-tradeoff"></div>` },

    { id: 'diy', title: 'Objects from scratch in Racket', body: `
<p>To prove dispatch is no magic, the lecture builds objects in Racket: an object is a struct with a list of <b>fields</b> (mutable name/value pairs) and a list of <b>methods</b> (name/function pairs). Every method takes <code>self</code> as an explicit argument.</p>
<pre class="code">(struct obj (fields methods))

(define (send obj msg . args)
  (let ([pr (assoc-m msg (obj-methods obj))])
    (if pr
        ((cdr pr) obj args)          ; pass the WHOLE object as self
        (error "method not found" msg))))

; "subclass": new fields + new methods IN FRONT of the old ones
(define (make-polar-point _r _th)
  (let ([pt (make-point #f #f)])
    (obj (append (list (mcons 'r _r) (mcons 'theta _th)) (obj-fields pt))
         (append (list (cons 'get-x (lambda (self args) ...)) ...)
                 (obj-methods pt)))))</pre>
<ul><li><b>Dynamic dispatch</b> = <code>send</code> passes the receiver as <code>self</code>, and methods call <code>(send self 'get-x)</code> rather than a fixed function.</li>
<li><b>Overriding</b> = the new method comes earlier in the list, so <code>assoc</code> finds it first.</li>
<li>It is not how real implementations work (they use classes with method tables, not a list per object), and it would not type-check in OCaml (what is the type of <code>self</code>? That needs <a data-map="subtyping">subtyping</a>).</li></ul>
<div data-quiz="d-diy"></div>
<div data-quiz="d-diy-override"></div>
<div data-quiz="d-objects-closures"></div>` },

    { id: 'exam', title: 'Exam skill: "what does this print?" with inheritance', body: `
<p>The old finals always include a class hierarchy where methods call each other through <code>self</code> and <code>super</code>. Method:</p>
<ol><li>Note the <b>class of the actual object</b> (from the <code>new</code>). It never changes during the call chain.</li>
<li>For every call with no receiver or with <code>self.</code>: start looking at <b>that</b> class, even if the code you are reading is in a superclass.</li>
<li>For <code>super</code>: continue looking <b>above the class where the current method is written</b>. <code>self</code> stays the same object.</li>
<li>Write the output as you go; do not skip the "boring" prints.</li></ol>
<div data-widget="dispatch"></div>
<div data-quiz="d-final5"></div>
<div data-quiz="d-super-args"></div>
<div data-quiz="r-dispatch"></div>` }
    ] },

  // =====================================================================
  { id: 'extend', icon: '🧩', title: 'FP vs OOP decomposition & double dispatch', slides: 'ruby4.pdf',
    blurb: 'The operations × variants grid, extensibility, binary methods, double dispatch, multimethods.',
    sections: [
    { id: 'grid', title: 'One grid, two ways to slice it', body: `
<p>Many programs are a table of <b>variants</b> (kinds of data) × <b>operations</b>. Example: an expression language.</p>
<table class="cmp"><tr><th></th><th>eval</th><th>toString</th><th>hasZero</th></tr>
<tr><td><b>Int</b></td><td>·</td><td>·</td><td>·</td></tr><tr><td><b>Add</b></td><td>·</td><td>·</td><td>·</td></tr><tr><td><b>Negate</b></td><td>·</td><td>·</td><td>·</td></tr></table>
<p>Every cell needs code. The only question is how the code is <b>grouped</b>:</p>
<ul><li><b>FP</b> (OCaml): one <b>function per column</b>, with a <code>match</code> branch per variant.</li>
<li><b>OOP</b> (Ruby): one <b>class per row</b>, with a method per operation.</li></ul>
<div data-widget="grid"></div>
<pre data-run>class Exp; end
class Int &lt; Exp
  attr_reader :i
  def initialize(i); @i = i; end
  def eval; self; end
  def toString; @i.to_s; end
  def hasZero; @i == 0; end
end
class Negate &lt; Exp
  def initialize(e); @e = e; end
  def eval; Int.new(-@e.eval.i); end
  def toString; "-(" + @e.toString + ")"; end
  def hasZero; @e.hasZero; end
end
class Add &lt; Exp
  def initialize(e1, e2); @e1 = e1; @e2 = e2; end
  def eval; Int.new(@e1.eval.i + @e2.eval.i); end
  def toString; "(" + @e1.toString + " + " + @e2.toString + ")"; end
  def hasZero; @e1.hasZero || @e2.hasZero; end
end
e = Add.new(Int.new(3), Negate.new(Int.new(4)))
puts e.toString
puts e.eval.i
puts e.hasZero</pre>
<div class="callout key">🔑 FP and OOP are "exactly opposite" decompositions of the same grid. Neither is better in general: it depends on which direction the program will <b>grow</b>.</div>
<div data-quiz="e-grid-fp"></div>
<div data-quiz="e-eval"></div>` },

    { id: 'extens', title: 'Extensibility: what is easy to add?', body: `
<table class="cmp"><tr><th></th><th>New <b>operation</b> (column)</th><th>New <b>variant</b> (row)</th></tr>
<tr><td><b>FP</b></td><td>✅ easy: write one new function</td><td>❌ edit <b>every</b> function (but the type-checker lists the missing cases)</td></tr>
<tr><td><b>OOP</b></td><td>❌ edit <b>every</b> class (static typing lists missing methods if you declare it abstract)</td><td>✅ easy: write one new class</td></tr></table>
<div data-widget="sorter:fpoop"></div>
<p>You can <b>plan ahead</b> for the hard direction:</p>
<ul><li>FP: give the datatype an "other" constructor or make functions take a function for extra cases.</li>
<li>OOP: the <a data-map="visitor">visitor pattern</a> (uses double dispatch) makes new operations easy.</li>
<li>Ruby only: classes are <b>open</b>, so you can add a method to every class from a new file. Convenient, but any file can then change any class.</li></ul>
<div class="callout link">🔗 Exam questions phrase this as: "you add a new kind of X: in the OCaml version what must change? in the Ruby version?" Answer with the grid: row or column, and who has to be edited.</div>
<div data-quiz="e-ext-fp"></div>
<div data-quiz="e-ext-oop"></div>
<div data-quiz="e-nonneg"></div>` },

    { id: 'binary', title: 'Binary operations: the problem', body: `
<p>Now add values of several kinds (<code>Int</code>, <code>MyString</code>, <code>MyRational</code>) and an <code>Add</code> that works on <b>any pair</b>. That is a second grid: <b>3 × 3 = 9 cases</b> for one operation.</p>
<ul><li><b>FP</b>: easy. One helper <code>add_values</code> matching on the <b>pair</b>: <code>match (v1, v2) with (Int i, Int j) -> ... | (Int i, MyString s) -> ...</code>.</li>
<li><b>OOP</b>: <code>Add#eval</code> calls <code>e1.eval.add_values(e2.eval)</code>. Dispatch picks the method by the class of the <b>receiver</b> only. Inside <code>Int#add_values(v)</code> we still don't know what <code>v</code> is.</li></ul>
<pre data-run>class Int
  attr_reader :i
  def initialize(i); @i = i; end
  def add_values v
    if v.is_a?(Int)                 # works, but NOT OOP style
      Int.new(v.i + i)
    elsif v.is_a?(MyString)
      MyString.new(i.to_s + v.s)
    end
  end
end
class MyString
  attr_reader :s
  def initialize(s); @s = s; end
end
puts Int.new(3).add_values(MyString.new("x")).s</pre>
<div class="callout trap">⚠️ The <code>is_a?</code> version is the FP pattern match smuggled into a method. It gives up the one thing OOP was good at: adding a new variant now means editing these chains again.</div>
<div data-quiz="e-isa-not-oop"></div>` },

    { id: 'dd', title: 'Double dispatch', body: `
<p>The OOP answer: <b>dispatch twice</b>. The first call finds out the class of the left operand; that method immediately calls a method on the <b>other</b> operand whose <b>name says what the first one is</b>.</p>
<pre data-run>class Int
  attr_reader :i
  def initialize(i); @i = i; end
  def add_values v          # first dispatch: self is an Int
    v.addInt self           # "hey v, add yourself to an Int: me"
  end
  def addInt v              # second dispatch landed here: v + self, both Ints
    Int.new(v.i + i)
  end
  def addString v           # v is a MyString (left), self an Int (right)
    MyString.new(v.s + i.to_s)
  end
end
class MyString
  attr_reader :s
  def initialize(s); @s = s; end
  def add_values v
    v.addString self
  end
  def addInt v              # v is an Int (left), self a MyString (right)
    MyString.new(v.i.to_s + s)
  end
  def addString v
    MyString.new(v.s + s)
  end
end
puts Int.new(3).add_values(Int.new(4)).i
puts Int.new(3).add_values(MyString.new("x")).s
puts MyString.new("x").add_values(Int.new(3)).s</pre>
<div data-widget="dd"></div>
<div data-widget="stepper:double"></div>
<ul><li>With n variants: each class gets <code>add_values</code> plus n methods <code>addX</code>: <b>n × n cases, no type tests</b>.</li>
<li>In the second method the roles are <b>swapped</b>: the parameter is the <i>left</i> operand, <code>self</code> the <i>right</i>. Matters for non-commutative operations (string concatenation!).</li>
<li>Adding a variant: one new class with all methods <b>plus</b> one new <code>addNew</code> method in every existing class.</li></ul>
<div data-quiz="e-dd"></div>
<div data-quiz="e-dd-count"></div>
<div data-quiz="e-rps"></div>
<div data-quiz="r-dd-order"></div>` },

    { id: 'multi', title: 'Multimethods and static overloading', body: `
<p>Double dispatch is a hand-coded workaround. Some languages (Julia, Clojure, CLOS) have <b>multimethods</b> (multiple dispatch): you write several methods with the same name, and the one to run is chosen at <b>run time</b> from the classes of <b>all</b> arguments.</p>
<table class="cmp"><tr><th></th><th>Chosen using</th><th>When</th><th>Languages</th></tr>
<tr><td>Single dynamic dispatch</td><td>run-time class of the <b>receiver</b></td><td>run time</td><td>Ruby, Java, C++ ...</td></tr>
<tr><td>Static overloading</td><td><b>static types</b> of the arguments</td><td>compile time</td><td>Java, C++, C#</td></tr>
<tr><td>Multimethods</td><td>run-time classes of <b>all arguments</b></td><td>run time</td><td>Julia, Clojure, CLOS</td></tr></table>
<div data-widget="sorter:statdyn"></div>
<div class="callout trap">⚠️ Java's overloading <b>looks</b> like multimethods but is not: it uses the declared (compile-time) type of each argument. If <code>Exp e = new Int(3)</code>, then <code>x.add(e)</code> picks <code>add(Exp)</code>, never <code>add(Int)</code>.</div>
<p>Ruby has neither: no static types to overload on, and one method per name per class. Multimethods also raise their own puzzle: with subclasses, several methods can match and "the most specific" may be <b>ambiguous</b>.</p>
<div data-quiz="e-multimethods"></div>
<div data-quiz="e-static-overload"></div>
<div data-quiz="e-why-not-ruby"></div>` },

    { id: 'exam', title: 'Exam skill: port between OCaml and OOP', body: `
<p>A favourite final-exam question gives a small OCaml datatype with a function and asks for the "same" program in OOP style (or the reverse), then asks about extensibility.</p>
<ol><li>One <b>class per constructor</b>; the constructor's data become instance variables set in <code>initialize</code>.</li>
<li>One <b>method per function</b> in every class: the body is that function's <code>match</code> branch for this constructor.</li>
<li>Recursive calls <code>f e1</code> become <code>@e1.f</code>.</li>
<li><b>No</b> <code>is_a?</code>, no <code>case</code> on classes. If the function matches on two values, use <b>double dispatch</b>.</li>
<li>A shared superclass is optional in Ruby (duck typing), but put common/default methods there if several classes share them.</li></ol>
<div data-quiz="e-coins-a"></div>
<div data-quiz="e-coins-b"></div>
<div data-quiz="e-transport"></div>
<div data-quiz="e-inttree"></div>
<div data-quiz="e-clothing"></div>` }
    ] },

  // =====================================================================
  { id: 'mixins', icon: '🧬', title: 'Mixins, multiple inheritance, interfaces', slides: 'ruby5.pdf',
    blurb: 'Why more than one superclass is tempting and hard; Ruby modules; Comparable and Enumerable; interfaces and abstract methods.',
    sections: [
    { id: 'mi', title: 'Multiple inheritance: tempting and troublesome', body: `
<p>What if a class could have <b>more than one superclass</b>? Three answers exist:</p>
<table class="cmp"><tr><th></th><th>You may have many...</th><th>You get</th><th>Language</th></tr>
<tr><td><b>Multiple inheritance</b></td><td>superclasses</td><td>their methods <b>and fields</b></td><td>C++</td></tr>
<tr><td><b>Mixins</b></td><td>modules (one superclass)</td><td>their <b>methods</b></td><td>Ruby</td></tr>
<tr><td><b>Interfaces</b></td><td>interfaces (one superclass)</td><td>only <b>types</b> (no code)</td><td>Java, C#</td></tr></table>
<p>Why is full multiple inheritance hard?</p>
<ul><li><b>Name clashes</b>: <code>ColorPt3D</code> extends <code>ColorPt</code> and <code>Pt3D</code>. Both override <code>distFromOrigin</code>... which one does it inherit? And what does <code>super</code> mean?</li>
<li><b>The diamond</b>: both parents extend <code>Pt</code>. Does a <code>ColorPt3D</code> have one <code>@x</code> or two? Here one is right...</li>
<li>...but <code>ArtistCowboy</code> extends <code>Artist</code> and <code>Cowboy</code>, which both extend <code>Person</code> with a <code>@pocket</code>. There you'd want <b>two</b> pockets. And both define <code>draw</code> (a picture / a gun), meaning different things.</li></ul>
<div class="callout key">🔑 The class hierarchy becomes a <b>DAG</b> instead of a tree. No rule is right for every program, so C++ adds extra features (virtual base classes) and most newer languages allow only one superclass.</div>
<div data-quiz="m-mi-diamond"></div>
<div data-quiz="m-cowboy"></div>` },

    { id: 'mixin', title: 'Mixins: modules of methods', body: `
<p>A <b>mixin</b> is a collection of methods. You cannot instantiate it. A class <code>include</code>s it, and the methods become part of the class.</p>
<pre data-run>module Doubler
  def double
    self + self        # assumes the including class has +
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
pt.y = 4
puts pt.double.x
puts "hi".double
p Pt.ancestors.take(3)</pre>
<p><b>Lookup with mixins</b>: the object's class, then that class's mixins (<b>latest include first</b>), then the superclass, its mixins, and so on.</p>
<div data-widget="dispatch:mixin"></div>
<ul><li>Mixin methods may call methods of the class through <code>self</code> (and the other way round): dynamic dispatch as usual.</li>
<li>A method defined in the class itself <b>beats</b> the mixin's; the mixin's beats the superclass's.</li>
<li>Instance variables in mixins are bad style: they are just <code>self</code>'s variables and may clash with the class's.</li></ul>
<div data-quiz="m-doubler"></div>
<div data-quiz="m-lookup"></div>
<div data-quiz="m-super"></div>` },

    { id: 'builtin', title: 'The two famous mixins: Comparable and Enumerable', body: `
<table class="cmp"><tr><th>Mixin</th><th>You define</th><th>You get</th></tr>
<tr><td><code>Comparable</code></td><td><code>&lt;=&gt;</code> (returns negative, 0, positive)</td><td><code>&lt; &lt;= &gt; &gt;= ==</code> <code>between?</code> <code>clamp</code></td></tr>
<tr><td><code>Enumerable</code></td><td><code>each</code> (yields every element)</td><td><code>map select inject include? any? all? count to_a sort min max first ...</code></td></tr></table>
<pre data-run>class Name
  attr_accessor :first, :middle, :last
  include Comparable
  def initialize(first, last, middle="")
    @first = first
    @last = last
    @middle = middle
  end
  def &lt;=&gt; other
    l = @last &lt;=&gt; other.last          # strings already have &lt;=&gt;
    return l if l != 0
    f = @first &lt;=&gt; other.first
    return f if f != 0
    @middle &lt;=&gt; other.middle
  end
end
n1 = Name.new("Ada", "Lovelace")
n2 = Name.new("Alan", "Turing")
puts n1 &lt; n2
puts n1.between?(n1, n2)
puts [n2, n1].min.first

class MyRange
  include Enumerable
  def initialize(low, high)
    @low = low
    @high = high
  end
  def each
    i = @low
    while i &lt;= @high
      yield i
      i += 1
    end
  end
end
r = MyRange.new(4, 8)
p r.map { |x| x * 2 }
p r.select { |x| x.odd? }
puts r.inject { |a, b| a + b }
puts r.include?(7)</pre>
<div data-widget="dispatch:comparable"></div>
<div class="callout key">🔑 Follow one call: <code>n1 &lt; n2</code> → not in <code>Name</code> → found in <code>Comparable</code> → its body calls <code>self.&lt;=&gt;(other)</code> → dispatch on <code>self</code> finds <code>Name#&lt;=&gt;</code>. The mixin calls <b>down</b> into the class. This is the abstract-method pattern.</div>
<div data-quiz="m-comparable"></div>
<div data-quiz="m-enum"></div>
<div data-quiz="m-version"></div>
<div data-quiz="r-enumerable"></div>` },

    { id: 'iface', title: 'Interfaces and abstract methods', body: `
<p>In a <b>statically typed</b> OOP language, a method call type-checks only if the receiver's type is known to have that method. A Java <b>interface</b> is a type that lists method signatures with no bodies. A class may implement many interfaces, and that causes none of the multiple-inheritance problems because there is <b>no code and no fields</b> to clash.</p>
<pre class="code">interface Comparable { int compareTo(Object other); }
class Name implements Comparable, Printable { ... }   // must define compareTo
void sort(Comparable[] arr) { ... }   // accepts any class that implements it</pre>
<p>In Ruby interfaces would be pointless: nothing is checked statically, any object can be passed anywhere (duck typing).</p>
<h4>Abstract methods</h4>
<p>A superclass often calls a method that only subclasses define ("required overriding"):</p>
<pre data-run>class Shape
  def describe
    "A shape with area " + area.to_s     # area: defined by subclasses
  end
end
class Square &lt; Shape
  def initialize(s); @s = s; end
  def area; @s * @s; end
end
puts Square.new(3).describe
puts Shape.new.describe                  # fails only when area is called</pre>
<ul><li>Ruby: nothing to declare. Creating a <code>Shape</code> is allowed; it fails at the call.</li>
<li>Java/C#: declare <code>abstract</code> methods in an abstract class. The checker then accepts <code>describe</code>, and forbids <code>new Shape()</code>.</li>
<li>C++: abstract ("pure virtual") methods + multiple inheritance, so an interface is simply a class with only abstract methods. No separate construct needed.</li></ul>
<div class="callout link">🔗 An abstract method is a "hole" filled by a subclass; a <a data-map="block">block / higher-order function</a> argument is a hole filled by the caller. Same idea, two mechanisms.</div>
<div data-widget="sorter:mixiface"></div>
<div data-quiz="m-interfaces"></div>
<div data-quiz="m-abstract"></div>
<div data-quiz="m-cpp"></div>` },

    { id: 'exam', title: 'Exam skill: writing and reading mixins', body: `
<p>The finals ask you to (a) write a small mixin, (b) say what it <b>assumes</b> about the including class, (c) trace lookup.</p>
<ol><li>Inside a mixin use only <b>method calls on self</b> (<code>each</code>, <code>&lt;</code>, <code>compare(x)</code>). No instance variables.</li>
<li>If the mixin method takes a block and uses the class's <code>each</code>, forward with <code>each { |x| ... yield x ... }</code>.</li>
<li>State the assumption in one sentence: "the class must define <code>each</code> that yields each element once".</li>
<li>Remember the order: <b>class, its mixins (last included first), superclass</b>. An included mixin can never override the class's own method.</li></ol>
<div data-quiz="m-simpleint"></div>
<div data-quiz="m-extcomp"></div>
<div data-quiz="m-myany"></div>
<div data-quiz="m-any-short"></div>` }
    ] },

  // =====================================================================
  { id: 'subtyping', icon: '📐', title: 'Subtyping', slides: 'ruby6.pdf',
    blurb: 'Records with width/permutation subtyping, why depth is unsound with mutation, Java arrays, function subtyping (contravariance).',
    sections: [
    { id: 'records', title: 'A tiny typed language of records', body: `
<p>Ruby has no static types, so to study <b>subtyping</b> the lecture invents a small typed language with <b>records</b> (think: objects with only fields):</p>
<table class="cmp"><tr><th>Syntax</th><th>Meaning</th></tr>
<tr><td><code>{f1=e1, ..., fn=en}</code></td><td>build a record</td></tr>
<tr><td><code>e.f</code></td><td>read field f</td></tr>
<tr><td><code>e1.f = e2</code></td><td><b>assign</b> field f (records are mutable)</td></tr>
<tr><td><code>{f1:t1, ..., fn:tn}</code></td><td>record <b>type</b></td></tr></table>
<p>The type system's promise (<b>soundness</b>): a program that type-checks never tries to read or write a field that the record does not have.</p>
<p>Without subtyping the system is annoyingly strict. This sensible program is rejected:</p>
<pre class="code">fun distToOrigin (p : {x:float, y:float}) = sqrt(p.x*p.x + p.y*p.y)
val c : {x:float, y:float, color:string} = {x=3.0, y=4.0, color="green"}
val _ = distToOrigin(c)       (* type error: c has an extra field *)</pre>
<div class="callout key">🔑 <b>Subtyping</b>: write <code>t1 &lt;: t2</code> ("t1 is a subtype of t2") when any value of type t1 can safely be used where a t2 is expected. Add <b>one</b> typing rule: if <code>e : t1</code> and <code>t1 &lt;: t2</code> then <code>e : t2</code>. Everything else is deciding which <code>&lt;:</code> facts are safe.</div>
<div data-quiz="s-good-bad"></div>
<div data-quiz="s-subst"></div>` },

    { id: 'four', title: 'The four sound record rules', body: `
<table class="cmp"><tr><th>Rule</th><th>Says</th><th>Example</th></tr>
<tr><td><b>Width</b></td><td>a subtype may have <b>extra fields</b></td><td><code>{x:float, y:float, color:string} &lt;: {x:float, y:float}</code></td></tr>
<tr><td><b>Permutation</b></td><td>field order is irrelevant</td><td><code>{y:float, x:float} &lt;: {x:float, y:float}</code></td></tr>
<tr><td><b>Transitivity</b></td><td>if <code>t1 &lt;: t2</code> and <code>t2 &lt;: t3</code> then <code>t1 &lt;: t3</code></td><td>chain the two above</td></tr>
<tr><td><b>Reflexivity</b></td><td>every type is a subtype of itself</td><td><code>{x:float} &lt;: {x:float}</code></td></tr></table>
<p>Try any pair of types. The checker explains its answer:</p>
<div data-widget="subtype"></div>
<div class="callout trap">⚠️ "Sub" does not mean smaller: the <b>sub</b>type has <b>more</b> fields. It describes a <i>smaller set of values</i> (fewer records have all those fields), each of which can do more.</div>
<div data-quiz="s-width"></div>
<div data-quiz="s-rules"></div>` },

    { id: 'depth', title: 'Depth subtyping: natural but unsound', body: `
<p>It seems obvious that <code>{center:{x:float,y:float,z:float}, r:float}</code> should be a subtype of <code>{center:{x:float,y:float}, r:float}</code>: replace a <b>field's type</b> by a subtype. That rule is called <b>depth subtyping</b>, and with mutable fields it is <b>wrong</b>:</p>
<pre class="code">fun setToOrigin (c : {center:{x:float,y:float}, r:float}) =
  c.center = {x=0.0, y=0.0}             (* fine for the declared type *)

val sphere : {center:{x:float,y:float,z:float}, r:float} =
  {center={x=3.0, y=4.0, z=0.0}, r=1.0}

val _ = setToOrigin(sphere)             (* allowed ONLY by depth subtyping *)
val _ = sphere.center.z                 (* stuck: no z field any more! *)</pre>
<div data-widget="stepper:depth"></div>
<div class="callout key">🔑 <b>Choose two of three</b>: (1) setting a field, (2) depth subtyping on that field, (3) a sound type system. The lecture's language (and Java fields) keep 1 and 3. A language with <b>immutable</b> records can keep 2 and 3.</div>
<p>The culprit is <b>aliasing + mutation</b>: the function writes through a "weaker" view of the same record. If fields cannot be assigned (or a particular field is <code>readonly</code>), the counterexample cannot be written and depth subtyping is sound for that field.</p>
<div data-quiz="s-depth"></div>
<div data-quiz="s-choose"></div>
<div data-quiz="s-immutable"></div>
<div data-quiz="s-readonly"></div>` },

    { id: 'java', title: 'Java arrays got it wrong (on purpose)', body: `
<p>An array is a record with mutable fields named 0, 1, 2, ... So <code>ColorPoint[] &lt;: Point[]</code> is depth subtyping on mutable data and should be rejected. Java <b>allows</b> it:</p>
<pre class="code">class Point { ... }
class ColorPoint extends Point { String color; ... }

void m1(Point[] arr) {
  arr[0] = new Point(3, 4);          // run time: ArrayStoreException !
}
String m2(int x) {
  ColorPoint[] cs = new ColorPoint[x];
  m1(cs);                            // type-checks thanks to the bad rule
  return cs[0].color;                // never reached with a plain Point
}</pre>
<div data-widget="stepper:javaarray"></div>
<ul><li>To stay safe, every array remembers its real element type and <b>every array store is checked at run time</b>. The failure is an <code>ArrayStoreException</code> at the assignment in <code>m1</code>.</li>
<li>Why? Early Java had no generics; this was the way to write methods over "arrays of anything" (<code>Object[]</code>).</li>
<li>Cost: slower stores, and an error the type-checker should have found.</li></ul>
<p><b>null</b> is a similar hole: it is allowed wherever an object is expected although it has <i>no</i> fields or methods, so each access needs a run-time check (<code>NullPointerException</code>).</p>
<div data-quiz="s-java-array"></div>
<div data-quiz="s-java-why"></div>
<div data-quiz="s-null"></div>` },

    { id: 'functions', title: 'Function subtyping: contravariant arguments', body: `
<p>When can a function of type <code>t1 -> t2</code> be passed where a <code>t3 -> t4</code> is expected?</p>
<div class="callout key">🔑 <code>t1 -> t2 &lt;: t3 -> t4</code> &nbsp;if&nbsp; <b><code>t3 &lt;: t1</code></b> &nbsp;and&nbsp; <b><code>t2 &lt;: t4</code></b>.<br>Results are <b>covariant</b> (same direction). Arguments are <b>contravariant</b> (the direction flips).</div>
<p>Think of what the <b>caller</b> will do with the function it was promised:</p>
<ul><li>It passes a <code>t3</code>. The substitute must cope with every <code>t3</code>, so its argument type may be <b>more general</b> (a supertype).</li>
<li>It uses the result as a <code>t4</code>. The substitute may return <b>more</b> (a subtype).</li></ul>
<div data-widget="variance"></div>
<div data-widget="stepper:contra"></div>
<p>The tempting rule "<code>ColorPt -> Pt &lt;: Pt -> Pt</code>" is <b>unsound</b>: the caller passes a plain point, the function reads <code>.color</code>.</p>
<div data-widget="sorter:variance"></div>
<div class="callout link">🔗 Methods are functions, so the same rule decides which <a data-map="overridetypes">overriding method types</a> are sound in a statically typed OOP language.</div>
<div data-quiz="s-fun-rule"></div>
<div data-quiz="s-fun"></div>
<div data-quiz="s-contra"></div>` },

    { id: 'exam', title: 'Exam skill: subtype tables', body: `
<p>Every final has a "list all subtypes / supertypes" question. Work mechanically:</p>
<ol><li><b>Records</b>: A &lt;: B if A has <b>every field of B, with exactly the same type</b> (unless told that depth is allowed / fields are immutable). Extra fields and reordering are fine.</li>
<li><b>Functions</b> A1 -> R1 &lt;: A2 -> R2: check <b>A2 &lt;: A1</b> (flipped!) and <b>R1 &lt;: R2</b>.</li>
<li>For "all supertypes of <code>t2 -> t4</code>": arguments = all <b>sub</b>types of t2; results = all <b>super</b>types of t4. Combine.</li>
<li>Nested function types flip again: an argument of an argument is covariant.</li>
<li>Do not forget the type itself (reflexivity).</li>
<li>Counting: a record type has <b>infinitely many subtypes</b> (add fields), <b>finitely many supertypes</b> (drop fields).</li></ol>
<div data-quiz="s-final8a"></div>
<div data-quiz="s-final8b"></div>
<div data-quiz="s-rel"></div>
<div data-quiz="s-finite"></div>` }
    ] },

  // =====================================================================
  { id: 'generics', icon: '🧮', title: 'Generics, typed OOP & visitors', slides: 'ruby7.pdf',
    blurb: 'Objects as records, sound overriding, class vs type, generics vs subtyping, bounded polymorphism, the visitor pattern.',
    sections: [
    { id: 'objects', title: 'Objects are (almost) records', body: `
<p>Apply the record rules to objects in a statically typed OOP language:</p>
<table class="cmp"><tr><th>Part of an object</th><th>Like a...</th><th>So a subtype may...</th></tr>
<tr><td><b>Fields</b></td><td><b>mutable</b> record field</td><td>add fields (width), but <b>not</b> change a field's type (no depth)</td></tr>
<tr><td><b>Methods</b></td><td><b>immutable</b> record field holding a function</td><td>add methods, and give an overriding method a <b>subtype</b> of the old method type</td></tr></table>
<p>"A subtype of the method type" means the function rule: <b>contravariant arguments, covariant result</b>. That is the most a sound language could allow.</p>
<table class="cmp"><tr><th>Overriding method changes...</th><th>Sound?</th><th>Java / C#</th></tr>
<tr><td>return type to a <b>subtype</b></td><td>yes</td><td>allowed</td></tr>
<tr><td>argument type to a <b>supertype</b></td><td>yes</td><td>not overriding: treated as a different (overloaded) method</td></tr>
<tr><td>argument type to a <b>subtype</b></td><td><b>no</b></td><td>(also overloading)</td></tr>
<tr><td>a field's type</td><td><b>no</b> (mutable)</td><td>not allowed</td></tr></table>
<div class="callout key">🔑 <b>self/this is special</b>: it is like an argument, yet in a subclass it has the subclass type (covariant!). That is sound because callers never pass <code>self</code> explicitly: it is always the receiver, which really is an instance of the subclass.</div>
<div data-quiz="g-obj-records"></div>
<div data-quiz="g-java-rules"></div>
<div data-quiz="g-self"></div>` },

    { id: 'classtype', title: 'Classes vs types', body: `
<table class="cmp"><tr><th></th><th>Class</th><th>Type</th></tr>
<tr><td>Is about</td><td><b>behaviour</b>: how objects are built and what their methods do</td><td><b>interface</b>: which fields/methods exist and with what types</td></tr>
<tr><td>Relation</td><td><b>subclassing</b> = inheriting code</td><td><b>subtyping</b> = substitutability</td></tr>
<tr><td>Used for</td><td>avoiding code duplication</td><td>rejecting "no such method" before running</td></tr></table>
<p>Java and C# deliberately merge them: each class name is also a type, each subclass also a subtype. But the ideas are separate:</p>
<ul><li>Subtyping without subclassing: two unrelated classes implementing one <a data-map="interface">interface</a>.</li>
<li>Subclassing without (wanting) subtyping: reusing code of a class that is not really an "is-a" (the <code>ThreeDPoint</code> debate).</li>
<li>Ruby has classes but <b>no types</b> at all.</li></ul>
<div data-quiz="g-class-type"></div>` },

    { id: 'versus', title: 'Generics vs subtyping: different jobs', body: `
<table class="cmp"><tr><th></th><th>Generics (parametric polymorphism)</th><th>Subtyping</th></tr>
<tr><td>Idea</td><td>"for <b>any</b> type <code>'a</code>, and it is the <b>same</b> type everywhere <code>'a</code> appears"</td><td>"anything with <b>at least</b> these members will do"</td></tr>
<tr><td>Great for</td><td>containers (<code>'a list</code>, <code>Pair&lt;A,B&gt;</code>), combining functions (<code>compose</code>, <code>map</code>)</td><td>code that works on a <code>Pt</code> reused for <code>ColorPt</code>; GUI widgets; "extra stuff is fine"</td></tr>
<tr><td>Faking it with the other</td><td>(passing extra functions around: clumsy)</td><td><code>Object</code> everywhere + <b>downcasts</b> that can fail at run time</td></tr></table>
<pre class="code">class LamePair { Object x; Object y; ... }          // subtyping faking generics
String s = (String)(pair.y);     // compiles; ClassCastException if y is an Integer

class Pair&lt;A,B&gt; { A x; B y; ... }                   // the right tool
String s = pair.y;               // checked at compile time</pre>
<p><b>Generic types are invariant</b>: <code>List&lt;ColorPt&gt;</code> is <b>not</b> a subtype of <code>List&lt;Pt&gt;</code>. If it were, code could add a plain <code>Pt</code> to it: depth subtyping on mutable data again.</p>
<h4>Bounded polymorphism: both together</h4>
<pre class="code">&lt;T extends Pt&gt; List&lt;T&gt; inCircle(List&lt;T&gt; pts, Pt center, double r)</pre>
<p>"For any type T <b>that is a subtype of Pt</b>": the body may treat elements as <code>Pt</code>s (call <code>distance</code>), and a caller passing a <code>List&lt;ColorPt&gt;</code> gets a <code>List&lt;ColorPt&gt;</code> back.</p>
<div class="callout link">🔗 Ruby needs none of this: with <a data-map="duck">duck typing</a> every method is already "generic" and every argument "substitutable". The static features exist to get that flexibility back <b>while keeping compile-time checks</b>.</div>
<div data-quiz="g-generics-good"></div>
<div data-quiz="g-lamepair"></div>
<div data-quiz="g-list-inv"></div>
<div data-quiz="g-bounded"></div>` },

    { id: 'visitor', title: 'The visitor pattern', body: `
<p>OOP makes new <b>operations</b> hard (edit every class). The <b>visitor pattern</b> fixes that with double dispatch: each node class gets <b>one</b> method, <code>accept</code>, and every operation becomes a separate <b>visitor</b> object.</p>
<pre data-run>class Constant
  attr_reader :value
  def initialize(value); @value = value; end
  def accept(visitor)
    visitor.visit_constant(self)     # "I am a Constant"
  end
end
class Add
  attr_reader :left, :right
  def initialize(left, right); @left, @right = left, right; end
  def accept(visitor)
    visitor.visit_add(self)          # "I am an Add"
  end
end
class EvalVisitor
  def visit_constant(node); node.value; end
  def visit_add(node)
    node.left.accept(self) + node.right.accept(self)
  end
end
class PrintVisitor
  def visit_constant(node); node.value.to_s; end
  def visit_add(node)
    "(" + node.left.accept(self) + " + " + node.right.accept(self) + ")"
  end
end
e = Add.new(Constant.new(3), Add.new(Constant.new(4), Constant.new(5)))
puts e.accept(EvalVisitor.new)
puts e.accept(PrintVisitor.new)</pre>
<div data-widget="stepper:visitor"></div>
<table class="cmp"><tr><th></th><th>New operation</th><th>New node kind</th></tr>
<tr><td>Plain OOP</td><td>❌ edit every class</td><td>✅ one class</td></tr>
<tr><td>OOP + visitor</td><td>✅ one visitor class</td><td>❌ new <code>visit_...</code> in <b>every visitor</b></td></tr></table>
<div class="callout key">🔑 A visitor is "a function with one case per variant", i.e. the FP column, rebuilt inside OOP. <code>accept</code> is the first dispatch (which node?), <code>visit_x</code> the second (which operation?).</div>
<div data-quiz="g-visitor"></div>
<div data-quiz="g-visitor-trade"></div>
<div data-quiz="g-countvisitor"></div>
<div data-quiz="g-multiply"></div>` },

    { id: 'exam', title: 'Exam skill: "would this type-check in Java?"', body: `
<p>Questions in this area give Ruby (or Racket-OOP) code that works through duck typing and ask what a statically typed language would need.</p>
<ol><li>Find each <b>method call</b> and ask: "what static type must the receiver have for this call to be accepted?"</li>
<li>If objects of unrelated classes flow to the same variable, they need a <b>common supertype</b> declaring the method: an interface or abstract class.</li>
<li>If a container's element type must be remembered (get out what you put in), that is <b>generics</b>.</li>
<li>If both: bounded generics, <code>&lt;T extends Shape&gt;</code>.</li>
<li>If the proposed rule allows writing through a weaker view (arrays, mutable fields, <code>List&lt;Sub&gt;</code> as <code>List&lt;Super&gt;</code>): <b>unsound</b>, give the "store then read missing field" counterexample.</li></ol>
<div data-quiz="g-school"></div>
<div data-quiz="g-visitor-missing"></div>
<div data-quiz="g-sound"></div>` }
    ] }
  ];

  // =====================================================================
  window.CARDS = [
    { front: 'The 5 rules of pure class-based OOP (Ruby)', back: '1. All values are references to **objects**. 2. Objects communicate via **method calls** (messages). 3. Each object has its own **private state**. 4. Every object is an **instance of a class**. 5. The class determines the object\'s **behaviour**.' },
    { front: 'Which values are false in Ruby?', back: 'Only `false` and `nil`. `0`, `""`, `[]` are all true.' },
    { front: 'Reading an instance variable that was never assigned gives...', back: '`nil`, with no error. (So typos in `@names` fail later, as `undefined method ... for nil`.)' },
    { front: '`@x` vs `@@x` vs `X`', back: '`@x`: instance variable, one per object. `@@x`: class variable, shared by all instances. `X`: constant (capital letter).' },
    { front: 'What does `attr_accessor :x` define?', back: 'A getter `x` and a setter `x=`. `attr_reader`: getter only. `attr_writer`: setter only.' },
    { front: 'private vs protected', back: '**private**: callable only on `self` (no explicit receiver). **protected**: callable from inside the class or its subclasses on **any** instance, e.g. `other.num` inside `+`.' },
    { front: 'Duck typing', back: 'A method works with any object that responds to the messages it sends, whatever its class. More reuse; but the requirement is implicit and changing the method body changes what callers must provide.' },
    { front: 'What does `arr.each { ... }` return? And `map`?', back: '`each` returns the **receiver** `arr`. `map` returns a **new array** of the block\'s results.' },
    { front: 'Out-of-bounds array access `a[10]`', back: 'Read: `nil`. Write: the array grows and the gap is filled with `nil`. Negative indices count from the end.' },
    { front: 'Block vs Proc', back: 'A **block** is second-class: at most one per call, used with `yield`, cannot be stored. A **Proc** (`lambda { |x| ... }`) is a first-class object: store it, return it, `f.call(x)`.' },
    { front: '`return` inside a block', back: 'Returns from the **enclosing method**, not just the block. Use `next value` to finish only the block. In a `lambda`, `return` leaves just the lambda.' },
    { front: '`yield` with no block given', back: '`LocalJumpError: no block given (yield)`. Test with `block_given?`.' },
    { front: 'How do you pass your block on to another iterator?', back: 'Wrap it: `@items.each { |x| yield x }`. A block belongs to one call only.' },
    { front: 'Ruby iterators ↔ OCaml', back: '`each` = `List.iter`, `map` = `List.map`, `select` = `List.filter`, `inject` = `List.fold_left`, `any?`/`all?` = `exists`/`for_all`.' },
    { front: '`is_a?` vs `instance_of?`', back: '`x.is_a?(C)`: x\'s class is C **or a subclass** (or includes module C). `x.instance_of?(C)`: x\'s class is **exactly** C. Using either to choose behaviour is "not OOP style".' },
    { front: 'Are instance variables inherited?', back: 'No: they belong to objects, not classes. A subclass instance has `@x` only if code that assigns it runs (usually via `super` in `initialize`).' },
    { front: '`super` vs `super(a, b)` vs `super()`', back: 'Bare `super`: same method in the superclass with the **same arguments**. `super(a, b)`: those arguments. `super()`: no arguments.' },
    { front: 'Dynamic dispatch (late binding)', back: 'A call on `self` looks the method up starting from the **class of the object self refers to**, so an inherited method can end up calling code in a subclass.' },
    { front: 'Method lookup for `e0.m(e1..en)`', back: 'Evaluate everything; take the **class of e0\'s result**; search that class, its mixins (last included first), the superclass, ...; run the method with `self` = receiver. Nothing found: `method_missing` → `NoMethodError`.' },
    { front: 'Why did overriding `even` in B change `odd`?', back: '`odd` (in A) calls `even(x-1)`, i.e. `self.even`. For a B object, dispatch finds **B\'s** `even`. Functions in FP are closed; methods are open to overriding.' },
    { front: 'Why PolarPoint works with `distFromOrigin2` but not `distFromOrigin`', back: '`distFromOrigin2` uses the getters `x`, `y` (dispatched → PolarPoint\'s versions). `distFromOrigin` reads `@x`, `@y` directly, which a PolarPoint never set (`nil`).' },
    { front: 'FP vs OOP decomposition', back: 'Same grid of variants × operations. **FP**: one function per operation (column), `match` on variants. **OOP**: one class per variant (row), a method per operation.' },
    { front: 'Extensibility', back: '**FP**: new operation easy, new variant = edit every function. **OOP**: new variant easy, new operation = edit every class. Visitors flip OOP to the FP side.' },
    { front: 'Double dispatch', back: '`a.add_values(b)` calls `b.addInt(self)` (name encodes a\'s class). Two dynamic dispatches select the code from **both** classes with no `is_a?`. n variants → n×n methods.' },
    { front: 'In `addString(v)`, which operand is `self`?', back: 'The **right** one. The roles swap in the second dispatch: `v` is the original receiver (left operand).' },
    { front: 'Multimethods vs static overloading', back: '**Multimethods**: choose by the **run-time** classes of all arguments. **Static overloading** (Java): choose by the **compile-time** types of arguments. Ruby has neither.' },
    { front: 'Multiple inheritance problems', back: 'Name clashes (which `draw`?), and the **diamond**: one copy of the shared ancestor\'s fields or two? No rule suits every program.' },
    { front: 'Mixin', back: 'A `module` of methods that a class `include`s. Not instantiable. One superclass, many mixins. Methods only (avoid instance variables).' },
    { front: 'Lookup order with mixins', back: 'The class → its mixins (**latest include first**) → superclass → superclass\'s mixins → ...' },
    { front: 'Comparable / Enumerable', back: 'Define `<=>` and `include Comparable`: get `< <= > >= == between?`. Define `each` and `include Enumerable`: get `map select inject include? sort ...`.' },
    { front: 'Why no interfaces in Ruby?', back: 'An interface is only a **type** for a static checker. Ruby is dynamically typed: any object can be passed anywhere (duck typing).' },
    { front: 'Abstract method', back: 'A method the superclass calls but only subclasses define. Ruby: nothing to declare, fails at the call. Java: `abstract`, checked statically, class cannot be instantiated. Similar to a higher-order function\'s argument.' },
    { front: 'The four sound record subtyping rules', back: '**Width** (extra fields), **permutation** (order), **transitivity**, **reflexivity**.' },
    { front: 'Depth subtyping', back: 'Replacing a field\'s type by a subtype. **Unsound with mutable fields** (store a "smaller" record through the supertype view, then read the missing field). Sound for immutable/readonly fields.' },
    { front: '"Choose two of three"', back: 'Setting a field, depth subtyping on it, a sound type system. You cannot have all three.' },
    { front: 'Java array subtyping', back: '`ColorPoint[] <: Point[]` is allowed (unsound depth rule). Fixed by a **run-time check on every array store**: `ArrayStoreException`.' },
    { front: 'Function subtyping rule', back: '`t1 -> t2 <: t3 -> t4` if `t3 <: t1` and `t2 <: t4`. **Contravariant** arguments, **covariant** results.' },
    { front: 'Sound overriding in typed OOP', back: 'Methods are immutable function fields: an override may take **more general** arguments and return a **more specific** result. Java allows only the covariant result. Field types must not change.' },
    { front: 'Class vs type', back: '**Class**: behaviour and code reuse (subclassing). **Type**: which members exist, substitutability (subtyping). Java merges them; they are different ideas.' },
    { front: 'Generics vs subtyping', back: '**Generics**: types that must be the *same* in several places (containers, `compose`). **Subtyping**: extra members are fine (ColorPt as Pt). Faking generics with `Object` needs downcasts.' },
    { front: 'Bounded polymorphism', back: '`<T extends Pt> List<T> inCircle(List<T> pts, ...)`: any type T that is a subtype of Pt. Body can use T as a Pt; caller keeps the precise type.' },
    { front: 'Visitor pattern', back: 'Each node has `accept(v)` calling `v.visit_kind(self)`; each operation is a visitor class. New operation: one class. New node kind: edit every visitor. It is double dispatch.' }
  ];

  // =====================================================================
  window.EXAM_TIPS = `
<h3>What the old exams ask about this unit</h3>
<p>The practice finals were written for Ruby, then ported by the course staff to Racket classes. The OOP questions follow a very stable pattern:</p>
<table class="cmp"><tr><th>Question type</th><th>What to do</th></tr>
<tr><td><b>"What does this print?"</b> with subclasses, <code>super</code>, calls on <code>self</code></td><td>Fix the class of the real object. Every self-call starts lookup there. <code>super</code> continues above the class where the current method is written.</td></tr>
<tr><td><b>Port OCaml ↔ OOP</b></td><td>One class per constructor, one method per function, recursion becomes a method call on a field. No <code>is_a?</code>.</td></tr>
<tr><td><b>Extensibility</b></td><td>Draw the grid. New row or new column? Say which existing code must be edited in each style.</td></tr>
<tr><td><b>Double dispatch</b></td><td><code>a.op(b)</code> → <code>b.opWithA(self)</code>. Watch the operand order in the second method.</td></tr>
<tr><td><b>Write a mixin</b> / what does it assume?</td><td>Only call methods on <code>self</code>; state "the class must define X". Lookup: class, mixins (latest first), superclass.</td></tr>
<tr><td><b>Subtype tables</b></td><td>Records: all fields of the supertype, same types, no depth. Functions: flip the argument, keep the result.</td></tr>
<tr><td><b>Is this rule sound?</b></td><td>If mutation + depth: no. Give the counterexample: alias, store a smaller value, read the missing field.</td></tr></table>
<h3>Ten traps</h3>
<ol>
<li><code>0</code> and <code>""</code> are <b>true</b>. Only <code>false</code> and <code>nil</code> are false.</li>
<li>An unassigned <code>@var</code> is <code>nil</code>, not an error.</li>
<li><code>each</code> returns the receiver; <code>puts</code> returns <code>nil</code>; a method returns its last expression.</li>
<li><code>return</code> inside a block leaves the whole method.</li>
<li><code>x = y</code> for arrays/objects makes an alias, not a copy.</li>
<li>A getter call <code>x</code> is dispatched; a field read <code>@x</code> is not. That is the whole PolarPoint story.</li>
<li>Bare <code>super</code> passes <b>all</b> the current arguments.</li>
<li>A class's own method beats a mixin's; a mixin's beats the superclass's.</li>
<li>The subtype is the one with <b>more</b> fields.</li>
<li>Function arguments are <b>contra</b>variant. If you wrote "both sides are subtypes so the function type is too", check again.</li>
</ol>
<h3>Writing Ruby on paper</h3>
<ul>
<li>Every <code>def</code>, <code>class</code>, <code>module</code>, <code>if</code>, <code>while</code>, <code>do</code> needs its <code>end</code>.</li>
<li><code>initialize</code>, not <code>init</code> or the class name. Create with <code>Foo.new(args)</code>.</li>
<li>Prefer <code>attr_reader</code>/<code>attr_accessor</code> and iterators with blocks: markers look for idiomatic style.</li>
<li>String building: <code>"a" + x.to_s</code> or <code>"a#{x}"</code>. <code>"a" + 3</code> is a TypeError.</li>
<li>Small syntax slips are normally forgiven; wrong dispatch reasoning is not.</li>
</ul>`;

  // =====================================================================
  // Playground examples: [name, code]
  window.PLAY_EXAMPLES = [
    ['Classes & state', `class Counter
  attr_reader :count
  def initialize(start=0)
    @count = start
  end
  def bump
    @count += 1
    self
  end
end
c = Counter.new
c.bump.bump.bump
puts c.count
p c`],
    ['Blocks & iterators', `a = [3, 5, 7, 9]
p a.map { |x| x * 2 }
p a.select { |x| x > 4 }
p a.inject(0) { |acc, x| acc + x }
a.each_with_index { |x, i| puts "#{i}: #{x}" }
def twice
  yield
  yield
end
twice { puts "hi" }`],
    ['Procs & closures', `def make_counter
  n = 0
  lambda { n += 1 }
end
c1 = make_counter
c2 = make_counter
c1.call
c1.call
puts c1.call
puts c2.call
adders = [1, 2, 3].map { |n| lambda { |x| x + n } }
p adders.map { |f| f.call(10) }`],
    ['Dynamic dispatch', `class A
  def even x
    puts "in even A"
    if x == 0 then true else odd(x - 1) end
  end
  def odd x
    puts "in odd A"
    if x == 0 then false else even(x - 1) end
  end
end
class B < A
  def even x
    puts "in even B"
    x % 2 == 0
  end
end
puts B.new.odd(7)`],
    ['Double dispatch', `class Int
  attr_reader :i
  def initialize(i); @i = i; end
  def add_values(v); v.addInt(self); end
  def addInt(v); Int.new(v.i + i); end
  def addString(v); MyString.new(v.s + i.to_s); end
  def to_s; "Int(#{i})"; end
end
class MyString
  attr_reader :s
  def initialize(s); @s = s; end
  def add_values(v); v.addString(self); end
  def addInt(v); MyString.new(v.i.to_s + s); end
  def addString(v); MyString.new(v.s + s); end
  def to_s; "MyString(#{s})"; end
end
puts Int.new(3).add_values(Int.new(4))
puts Int.new(3).add_values(MyString.new("x"))
puts MyString.new("x").add_values(Int.new(3))`],
    ['Mixins', `class Version
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
  def to_s; "#{major}.#{minor}"; end
end
vs = [Version.new(2, 1), Version.new(1, 9), Version.new(2, 0)]
puts vs.sort.map { |v| v.to_s }.join(" < ")
puts vs.max
puts Version.new(1, 5).between?(vs[1], vs[2])
p Version.ancestors.take(3)`],
    ['Visitor', `class Constant
  attr_reader :value
  def initialize(value); @value = value; end
  def accept(v); v.visit_constant(self); end
end
class Add
  attr_reader :left, :right
  def initialize(l, r); @left = l; @right = r; end
  def accept(v); v.visit_add(self); end
end
class EvalVisitor
  def visit_constant(n); n.value; end
  def visit_add(n); n.left.accept(self) + n.right.accept(self); end
end
class PrintVisitor
  def visit_constant(n); n.value.to_s; end
  def visit_add(n); "(#{n.left.accept(self)} + #{n.right.accept(self)})"; end
end
e = Add.new(Constant.new(3), Add.new(Constant.new(4), Constant.new(5)))
puts e.accept(PrintVisitor.new)
puts e.accept(EvalVisitor.new)`]
  ];

  window.PLAY_REF = `
<p>This is a small Ruby interpreter written for this app. It covers what the slides use; it is not the real thing.</p>
<ul>
<li><b>Works</b>: classes, modules/mixins, inheritance, <code>super</code>, <code>attr_*</code>, private/protected, class methods and <code>@@vars</code>, open classes, blocks, <code>yield</code>, <code>lambda</code>/<code>Proc</code>, string interpolation, arrays, hashes, ranges, symbols, <code>Comparable</code>, <code>Enumerable</code>, <code>if/unless/while/until/case</code>, <code>begin/rescue</code>, <code>raise</code>, <code>method_missing</code>, <code>respond_to?</code>, <code>is_a?</code>, <code>Math</code>.</li>
<li><b>Output</b>: <code>puts</code>, <code>print</code>, <code>p</code>. Tick "show values" style examples use <code>p</code>.</li>
<li><b>Messages follow current Ruby</b> (3.4), e.g. <code>undefined method 'foo' for nil</code>. The slides show the older wording.</li>
<li><b>Not supported</b>: files, <code>require</code>, regular expressions, keyword arguments, <code>eval</code>, threads, and most of the standard library.</li>
<li>Endless loops and runaway recursion are stopped automatically.</li>
</ul>`;
})();

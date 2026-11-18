// rubylib.js: the built-in classes for the mini-Ruby interpreter in ruby.js
// (Object/Kernel, Module/Class, Comparable, Enumerable, Integer, Float, String, Symbol, Array, Hash, Range, Proc, exceptions, Math).
(function (root) {
  'use strict';
  const Ruby = root.Ruby || require('./ruby.js');
  const { RObj, RClass, RStr, RSym, RFloat, RHash, RRange, RProc, RubyError, StopIter, sym, truthy } = Ruby;

  Ruby.installers.push(function (I) {
    const C = I.C;
    // ---------- class skeleton
    const ObjectC = new RClass('Object', null, false); C.Object = ObjectC; ObjectC.consts.set('Object', ObjectC);
    const Kernel = I.defClass('Kernel', null, true);
    const Comparable = I.defClass('Comparable', null, true);
    const Enumerable = I.defClass('Enumerable', null, true);
    ObjectC.includes.push(Kernel);
    const ModuleC = I.defClass('Module'), ClassC = I.defClass('Class', ModuleC);
    const Numeric = I.defClass('Numeric'); Numeric.includes.push(Comparable);
    const IntegerC = I.defClass('Integer', Numeric), FloatC = I.defClass('Float', Numeric);
    const StringC = I.defClass('String'); StringC.includes.push(Comparable);
    const SymbolC = I.defClass('Symbol'), NilC = I.defClass('NilClass'), TrueC = I.defClass('TrueClass'), FalseC = I.defClass('FalseClass');
    const ArrayC = I.defClass('Array'); ArrayC.includes.push(Enumerable);
    const HashC = I.defClass('Hash'); HashC.includes.push(Enumerable);
    const RangeC = I.defClass('Range'); RangeC.includes.push(Enumerable);
    const ProcC = I.defClass('Proc');
    const MathM = I.defClass('Math', null, true);
    const Exc = I.defClass('Exception');
    const mkE = (n, s) => I.defClass(n, s);
    const ScriptError = mkE('ScriptError', Exc); mkE('NotImplementedError', ScriptError);
    mkE('SystemStackError', Exc); mkE('NoMemoryError', Exc);
    const StdErr = mkE('StandardError', Exc);
    mkE('RuntimeError', StdErr); mkE('ArgumentError', StdErr); mkE('TypeError', StdErr); mkE('ZeroDivisionError', StdErr);
    const NameErr = mkE('NameError', StdErr); mkE('NoMethodError', NameErr);
    const IndexErr = mkE('IndexError', StdErr); mkE('KeyError', IndexErr); mkE('StopIteration', IndexErr);
    mkE('RangeError', StdErr); mkE('LocalJumpError', StdErr); mkE('FrozenError', StdErr);
    mkE('FloatDomainError', StdErr);

    const def = (cls, names, fn, vis) => I.native(cls, names, fn, vis);
    const sdef = (cls, names, fn) => I.snative(cls, names, fn);
    const S = (s) => new RStr(s);
    const F = (f) => new RFloat(f);
    const err = (k, m) => I.err(k, m);
    const argc = (args, min, max) => { if (args.length < min || (max >= 0 && args.length > max)) throw err('ArgumentError', 'wrong number of arguments (given ' + args.length + ', expected ' + (max < 0 ? min + '+' : min === max ? min : min + '..' + max) + ')'); };
    const needBlk = (blk, name) => { if (!blk) throw err('ArgumentError', "mini-Ruby: '" + name + "' needs a block here (enumerators without a block are not supported)"); };
    const isNum = (v) => typeof v === 'number' || v instanceof RFloat;
    const nv = (v) => typeof v === 'number' ? v : v.f;
    const clsName = (v) => I.classOf(v).name;
    const coerceName = (v) => (v === null ? 'nil' : v === true ? 'true' : v === false ? 'false' : clsName(v));
    const toInt = (v, what) => { if (typeof v === 'number') return v; if (v instanceof RFloat) return Math.trunc(v.f); throw err('TypeError', 'no implicit conversion ' + (v === null ? 'from nil to integer' : 'of ' + clsName(v) + ' into Integer')); };
    const toStr = (v) => { if (v instanceof RStr) return v.s; throw err('TypeError', 'no implicit conversion of ' + coerceName(v) + ' into String'); };
    const symOrStr = (v) => v instanceof RSym ? v.n : v instanceof RStr ? v.s : (() => { throw err('TypeError', I.insp(v) + ' is not a symbol nor a string'); })();
    const call = (o, name, args, blk) => I.send(o, name, args || [], blk || null, null, true);
    const yieldTo = (blk, args) => I.callProc(blk, args);

    // ---------- Kernel / Object
    const out = (s) => { I.out.push(s); };
    const putsOne = (v) => {
      if (Array.isArray(v)) { if (!v.length) out('\n'); v.forEach(putsOne); return; }
      const s = I.tos(v); out(s.endsWith('\n') ? s : s + '\n');
    };
    def(Kernel, 'puts', function (self, args) { if (!args.length) out('\n'); args.forEach(putsOne); return null; }, 'private');
    def(Kernel, 'print', function (self, args) { args.forEach(a => out(I.tos(a))); return null; }, 'private');
    def(Kernel, ['p', 'pp'], function (self, args) { args.forEach(a => out(I.insp(a) + '\n')); return args.length === 0 ? null : args.length === 1 ? args[0] : args; }, 'private');
    def(Kernel, ['require', 'require_relative'], function () { return true; }, 'private');
    def(Kernel, ['raise', 'fail'], function (self, args) {
      let e;
      if (!args.length) e = I.err('RuntimeError', 'unhandled exception').exc;
      else if (args[0] instanceof RStr) e = I.err('RuntimeError', args[0].s).exc;
      else if (args[0] instanceof RClass) e = call(args[0], 'new', args.slice(1, 2));
      else e = args[0];
      if (!(e instanceof RObj) || !I.isA(e, Exc)) throw err('TypeError', 'exception class/object expected');
      throw new RubyError(e);
    }, 'private');
    def(Kernel, 'lambda', function (self, args, blk) { if (!blk) throw err('ArgumentError', 'tried to create Proc object without a block'); blk.isLambda = true; return blk; }, 'private');
    def(Kernel, 'proc', function (self, args, blk) { if (!blk) throw err('ArgumentError', 'tried to create Proc object without a block'); return blk; }, 'private');
    def(Kernel, 'block_given?', function (self, args, blk, c) { return !!(c && c.blk); }, 'private');
    def(Kernel, 'loop', function (self, args, blk) { needBlk(blk, 'loop'); for (;;) { I.tick(); yieldTo(blk, []); } }, 'private');
    def(Kernel, 'Integer', function (self, args) { const v = args[0]; if (v instanceof RStr) { if (!/^\s*-?\d+\s*$/.test(v.s)) throw err('ArgumentError', 'invalid value for Integer(): ' + I.insp(v)); return parseInt(v.s, 10); } return toInt(v); }, 'private');
    def(Kernel, 'Float', function (self, args) { const v = args[0]; if (v instanceof RStr) return F(parseFloat(v.s)); return F(nv(v)); }, 'private');
    def(Kernel, 'String', function (self, args) { return S(I.tos(args[0])); }, 'private');
    def(Kernel, ['sleep', 'srand'], function () { return 0; }, 'private');
    def(Kernel, 'rand', function (self, args) { const a = args[0]; if (typeof a === 'number') return Math.floor(Math.random() * a); return F(Math.random()); }, 'private');
    def(Kernel, ['private', 'public', 'protected', 'include'], function (self, args) { if (self === I.main && args.length && args[0] instanceof RClass) { args.forEach(m => { if (!ObjectC.includes.includes(m)) ObjectC.includes.push(m); }); I.ver++; } return null; }, 'private');
    def(Kernel, 'initialize', function (self, args) { argc(args, 0, 0); return null; }, 'private');
    def(Kernel, 'method_missing', function (self, args) { throw err('NoMethodError', "undefined method '" + (args[0] ? symOrStr(args[0]) : '?') + "' for " + I.descFor(self)); }, 'private');

    def(Kernel, 'class', function (self) { return I.classOf(self); });
    def(Kernel, ['is_a?', 'kind_of?'], function (self, args) { argc(args, 1, 1); if (!(args[0] instanceof RClass)) throw err('TypeError', 'class or module required'); return I.isA(self, args[0]); });
    def(Kernel, 'instance_of?', function (self, args) { argc(args, 1, 1); if (!(args[0] instanceof RClass)) throw err('TypeError', 'class or module required'); return I.classOf(self) === args[0]; });
    def(Kernel, 'nil?', function (self) { return self === null; });
    def(Kernel, ['==', 'equal?', 'eql?'], function (self, args) { argc(args, 1, 1); return self === args[0]; });
    def(Kernel, '===', function (self, args) { return I.eq(self, args[0]); });
    def(Kernel, '!=', function (self, args) { return !I.eq(self, args[0]); });
    def(Kernel, '!', function (self) { return !truthy(self); });
    def(Kernel, '<=>', function (self, args) { return I.eq(self, args[0]) ? 0 : null; });
    def(Kernel, '=~', function () { return null; });
    def(Kernel, 'to_s', function (self) { if (self === I.main) return S('main'); return S('#<' + clsName(self) + (self instanceof RObj ? ':' + I.addr(self) : '') + '>'); });
    def(Kernel, 'inspect', function (self) { return S(I.insp(self)); });
    def(Kernel, ['object_id', '__id__'], function (self) { return typeof self === 'number' ? 2 * self + 1 : self === null ? 8 : self === true ? 20 : self === false ? 0 : 8 * (self.id || 1); });
    def(Kernel, 'hash', function (self) { let h = 7; for (const ch of I.hkey(self)) h = (h * 31 + ch.charCodeAt(0)) | 0; return h; });
    def(Kernel, 'respond_to?', function (self, args) { const m = I.findMethod(self, I.classOf(self), symOrStr(args[0])); return !!m && (m.vis === 'public' || truthy(args[1] === undefined ? null : args[1])); });
    def(Kernel, ['send', '__send__'], function (self, args, blk) { argc(args, 1, -1); return I.send(self, symOrStr(args[0]), args.slice(1), blk, null, true); });
    def(Kernel, 'public_send', function (self, args, blk, c) { argc(args, 1, -1); return I.send(self, symOrStr(args[0]), args.slice(1), blk, c || I.topCtx(), false); });
    const userMethods = (cls, all) => { const names = []; for (const k of I.ancestors(cls)) { if (!all && k !== cls) break; for (const [n, m] of k.m) if ((m.user || !all) && m.vis !== 'private' && !names.includes(n) && (m.user || k.user)) names.push(n); } return names.map(sym); };
    def(Kernel, ['methods', 'public_methods'], function (self) { const r = userMethods(I.classOf(self), true); if (self instanceof RClass) for (let k = self; k; k = k.sup) for (const [n, m] of k.sm) if (m.user) r.push(sym(n)); return r; });
    def(Kernel, 'instance_variables', function (self) { return [...I.ivars(self).keys()].map(sym); });
    def(Kernel, 'instance_variable_get', function (self, args) { const v = I.ivars(self).get(symOrStr(args[0])); return v === undefined ? null : v; });
    def(Kernel, 'instance_variable_set', function (self, args) { I.ivars(self).set(symOrStr(args[0]), args[1]); return args[1]; });
    def(Kernel, 'instance_variable_defined?', function (self, args) { return I.ivars(self).has(symOrStr(args[0])); });
    def(Kernel, ['dup', 'clone'], function (self) {
      if (Array.isArray(self)) return self.slice(); if (self instanceof RStr) return S(self.s);
      if (self instanceof RHash) { const h = new RHash(); for (const [k, v] of self.map) h.map.set(k, v.slice()); h.def = self.def; return h; }
      if (self instanceof RObj) { const o = new RObj(self.cls); for (const [k, v] of self.iv) o.iv.set(k, v); return o; }
      return self;
    });
    def(Kernel, ['freeze', 'itself'], function (self) { return self; });
    def(Kernel, 'frozen?', function (self) { return self === null || typeof self === 'number' || typeof self === 'boolean' || self instanceof RSym; });
    def(Kernel, 'tap', function (self, args, blk) { needBlk(blk, 'tap'); yieldTo(blk, [self]); return self; });
    def(Kernel, 'then', function (self, args, blk) { needBlk(blk, 'then'); return yieldTo(blk, [self]); });
    def(Kernel, 'instance_variables_hash', function (self) { return null; });

    // ---------- Module / Class
    def(ModuleC, ['name', 'to_s', 'inspect'], function (self) { return S(self.name); });
    def(ModuleC, '===', function (self, args) { return I.isA(args[0], self); });
    def(ModuleC, '==', function (self, args) { return self === args[0]; });
    def(ModuleC, '<', function (self, args) { const o = args[0]; if (!(o instanceof RClass)) throw err('TypeError', 'compared with non class/module'); if (self === o) return false; return I.ancestors(self).includes(o) ? true : I.ancestors(o).includes(self) ? false : null; });
    def(ModuleC, '<=', function (self, args) { const o = args[0]; if (!(o instanceof RClass)) throw err('TypeError', 'compared with non class/module'); return I.ancestors(self).includes(o) ? true : I.ancestors(o).includes(self) ? false : null; });
    def(ModuleC, '>', function (self, args) { const o = args[0]; if (self === o) return false; return I.ancestors(o).includes(self) ? true : I.ancestors(self).includes(o) ? false : null; });
    def(ModuleC, 'ancestors', function (self) { return I.ancestors(self).slice(); });
    def(ModuleC, 'included_modules', function (self) { return I.ancestors(self).filter(k => k.isModule); });
    def(ModuleC, 'include?', function (self, args) { return args[0] !== self && args[0].isModule && I.ancestors(self).includes(args[0]); });
    def(ModuleC, 'include', function (self, args) {
      argc(args, 1, -1);
      for (const m of args) { if (!(m instanceof RClass) || !m.isModule) throw err('TypeError', 'wrong argument type ' + (m instanceof RClass ? 'Class' : clsName(m)) + ' (expected Module)'); if (!I.ancestors(self).includes(m)) self.includes.push(m); }
      I.ver++; return self;
    });
    def(ModuleC, ['instance_methods', 'public_instance_methods'], function (self, args) { return userMethods(self, args.length ? truthy(args[0]) : true); });
    def(ModuleC, ['method_defined?', 'public_method_defined?', 'instance_method_defined?'], function (self, args) { const m = I.findMethod(null, self, symOrStr(args[0])); return !!m && m.vis !== 'private'; });
    def(ModuleC, 'private_method_defined?', function (self, args) { const m = I.findMethod(null, self, symOrStr(args[0])); return !!m && m.vis === 'private'; });
    def(ModuleC, 'const_get', function (self, args) { const n = symOrStr(args[0]); for (const k of I.ancestors(self)) if (k.consts.has(n)) return k.consts.get(n); if (ObjectC.consts.has(n)) return ObjectC.consts.get(n); throw err('NameError', 'uninitialized constant ' + self.name + '::' + n); });
    def(ModuleC, 'constants', function (self) { return [...self.consts.keys()].map(sym); });
    def(ModuleC, 'class_variable_get', function (self, args) { const n = symOrStr(args[0]); for (const k of I.ancestors(self)) if (k.cvars.has(n)) return k.cvars.get(n); throw err('NameError', 'uninitialized class variable ' + n + ' in ' + self.name); });
    def(ModuleC, 'class_variables', function (self) { const r = []; for (const k of I.ancestors(self)) for (const n of k.cvars.keys()) r.push(sym(n)); return r; });
    const attr = (self, args, r, w) => {
      for (const a of args) {
        const n = symOrStr(a), iv = '@' + n;
        if (r) self.m.set(n, { name: n, owner: self, vis: self.defvis, user: true, attr: 'reader', fn: function (o, as) { argc(as, 0, 0); const v = I.ivars(o).get(iv); return v === undefined ? null : v; } });
        if (w) self.m.set(n + '=', { name: n + '=', owner: self, vis: self.defvis, user: true, attr: 'writer', fn: function (o, as) { argc(as, 1, 1); I.ivars(o).set(iv, as[0]); return as[0]; } });
      }
      I.ver++; return args.map(a => sym(symOrStr(a)));
    };
    def(ModuleC, 'attr_reader', function (self, args) { return attr(self, args, true, false); });
    def(ModuleC, 'attr_writer', function (self, args) { return attr(self, args, false, true); });
    def(ModuleC, 'attr_accessor', function (self, args) { return attr(self, args, true, true); });
    const setVis = (vis) => function (self, args) {
      if (!args.length) { self.defvis = vis; return null; }
      for (const a of args.flat()) {
        const n = symOrStr(a); let m = self.m.get(n);
        if (!m) { const inh = I.findMethod(null, self, n); if (!inh) throw err('NameError', "undefined method '" + n + "' for class '" + self.name + "'"); m = Object.assign({}, inh, { owner: self }); }
        self.m.set(n, Object.assign({}, m, { vis }));
      }
      I.ver++; return args.length === 1 ? args[0] : args;
    };
    def(ModuleC, 'private', setVis('private')); def(ModuleC, 'public', setVis('public')); def(ModuleC, 'protected', setVis('protected'));
    def(ModuleC, ['module_function', 'private_constant', 'private_class_method'], function () { return null; });
    def(ModuleC, 'alias_method', function (self, args) { const m = I.findMethod(null, self, symOrStr(args[1])); if (!m) throw err('NameError', "undefined method '" + symOrStr(args[1]) + "' for class '" + self.name + "'"); self.m.set(symOrStr(args[0]), Object.assign({}, m, { name: symOrStr(args[0]) })); I.ver++; return args[0]; });
    def(ModuleC, 'define_method', function (self, args, blk) {
      needBlk(blk, 'define_method'); const n = symOrStr(args[0]);
      self.m.set(n, { name: n, owner: self, vis: self.defvis, user: true, fn: function (o, as) { const p = new RProc(blk.params, blk.body, Object.assign({}, blk.ctx, { self: o }), true); return I.callProc(p, as); } });
      I.ver++; return sym(n);
    });
    def(ClassC, 'superclass', function (self) { return self.sup; });
    def(ClassC, 'allocate', function (self) { return new RObj(self); });
    def(ClassC, 'new', function (self, args, blk) {
      const o = new RObj(self);
      I.send(o, 'initialize', args, blk, null, true);
      return o;
    });
    def(ModuleC, 'new', function (self) { throw err('NoMethodError', "undefined method 'new' for module " + self.name); });
    for (const k of [IntegerC, FloatC, SymbolC, NilC, TrueC, FalseC]) sdef(k, 'new', function (self) { throw err('NoMethodError', "undefined method 'new' for class " + self.name); });

    // ---------- exceptions
    def(Exc, 'initialize', function (self, args) { argc(args, 0, 1); self.iv.set('@message', args.length ? args[0] : null); return null; }, 'private');
    def(Exc, ['message', 'to_s'], function (self) { const m = self.iv.get('@message'); return m === null || m === undefined ? S(self.cls.name) : S(I.tos(m)); });
    def(Exc, 'full_message', function (self) { return S(I.tos(self) + ' (' + self.cls.name + ')'); });
    def(Exc, 'backtrace', function () { return []; });
    def(Exc, 'inspect', function (self) { return S('#<' + self.cls.name + ': ' + I.tos(self) + '>'); });

    // ---------- Comparable
    const cmpOp = (name, test) => def(Comparable, name, function (self, args) {
      argc(args, 1, 1);
      const r = call(self, '<=>', [args[0]]);
      if (typeof r !== 'number') throw err('ArgumentError', 'comparison of ' + clsName(self) + ' with ' + ((args[0] === null || typeof args[0] === 'number' || typeof args[0] === 'boolean') ? I.insp(args[0]) : clsName(args[0])) + ' failed');
      return test(r);
    });
    cmpOp('<', r => r < 0); cmpOp('>', r => r > 0); cmpOp('<=', r => r <= 0); cmpOp('>=', r => r >= 0);
    def(Comparable, '==', function (self, args) { if (self === args[0]) return true; const r = call(self, '<=>', [args[0]]); return typeof r === 'number' && r === 0; });
    def(Comparable, 'between?', function (self, args) { argc(args, 2, 2); return I.cmp(self, args[0]) >= 0 && I.cmp(self, args[1]) <= 0; });
    def(Comparable, 'clamp', function (self, args) { argc(args, 2, 2); return I.cmp(self, args[0]) < 0 ? args[0] : I.cmp(self, args[1]) > 0 ? args[1] : self; });

    // ---------- numbers
    const idiv = (a, b) => { if (b === 0) throw err('ZeroDivisionError', 'divided by 0'); return Math.floor(a / b); };
    const imod = (a, b) => { if (b === 0) throw err('ZeroDivisionError', 'divided by 0'); return ((a % b) + b) % b; };
    const fmod = (a, b) => { const r = a % b; return (r !== 0 && (r < 0) !== (b < 0)) ? r + b : r; };
    const arith = (name, fi, ff) => {
      def(IntegerC, name, function (self, args) { argc(args, 1, 1); const o = args[0]; if (typeof o === 'number') return fi(self, o); if (o instanceof RFloat) return F(ff(self, o.f)); throw err('TypeError', coerceName(o) + " can't be coerced into Integer"); });
      def(FloatC, name, function (self, args) { argc(args, 1, 1); const o = args[0]; if (isNum(o)) return F(ff(self.f, nv(o))); throw err('TypeError', coerceName(o) + " can't be coerced into Float"); });
    };
    arith('+', (a, b) => a + b, (a, b) => a + b); arith('-', (a, b) => a - b, (a, b) => a - b); arith('*', (a, b) => a * b, (a, b) => a * b);
    arith('/', idiv, (a, b) => a / b); arith(['%', 'modulo'], imod, fmod);
    arith(['**', 'pow'], (a, b) => b >= 0 ? Math.pow(a, b) : F(Math.pow(a, b)), (a, b) => Math.pow(a, b));
    def(IntegerC, 'fdiv', function (self, args) { return F(self / nv(args[0])); });
    def(IntegerC, 'div', function (self, args) { return idiv(self, toInt(args[0])); });
    def(IntegerC, 'divmod', function (self, args) { return [idiv(self, args[0]), imod(self, args[0])]; });
    def(IntegerC, '-@', function (self) { return -self; }); def(FloatC, '-@', function (self) { return F(-self.f); });
    def(Numeric, '+@', function (self) { return self; });
    const numCmp = (name, test) => {
      const f = function (self, args) { argc(args, 1, 1); const o = args[0]; if (!isNum(o)) throw err('ArgumentError', 'comparison of ' + clsName(self) + ' with ' + ((o === null || typeof o === 'boolean') ? I.insp(o) : clsName(o)) + ' failed'); return test(nv(self), nv(o)); };
      def(IntegerC, name, f); def(FloatC, name, f);
    };
    numCmp('<', (a, b) => a < b); numCmp('>', (a, b) => a > b); numCmp('<=', (a, b) => a <= b); numCmp('>=', (a, b) => a >= b);
    def(Numeric, ['==', '==='], function (self, args) { return isNum(args[0]) && nv(self) === nv(args[0]); });
    def(Numeric, 'eql?', function (self, args) { return isNum(args[0]) && (typeof self === typeof args[0]) && nv(self) === nv(args[0]); });
    def(Numeric, 'equal?', function (self, args) { return isNum(args[0]) && (typeof self === typeof args[0]) && nv(self) === nv(args[0]); });
    def(Numeric, '<=>', function (self, args) { const o = args[0]; if (!isNum(o)) return null; const a = nv(self), b = nv(o); return a < b ? -1 : a > b ? 1 : 0; });
    def(Numeric, 'zero?', function (self) { return nv(self) === 0; });
    def(Numeric, 'positive?', function (self) { return nv(self) > 0; });
    def(Numeric, 'negative?', function (self) { return nv(self) < 0; });
    def(Numeric, 'nonzero?', function (self) { return nv(self) === 0 ? null : self; });
    def(Numeric, 'integer?', function (self) { return typeof self === 'number'; });
    def(Numeric, ['abs', 'magnitude'], function (self) { return typeof self === 'number' ? Math.abs(self) : F(Math.abs(self.f)); });
    def(Numeric, 'to_f', function (self) { return F(nv(self)); });
    def(Numeric, 'to_c', function (self) { return self; });
    def(Numeric, 'step', function (self, args, blk) { needBlk(blk, 'step'); const lim = nv(args[0]), st = args.length > 1 ? nv(args[1]) : 1; const fl = !(typeof self === 'number' && typeof args[0] === 'number' && (args.length < 2 || typeof args[1] === 'number')); for (let x = nv(self); st > 0 ? x <= lim : x >= lim; x += st) { I.tick(); yieldTo(blk, [fl ? F(x) : x]); } return self; });
    def(IntegerC, ['to_s', 'inspect'], function (self, args) { return S(args.length ? self.toString(toInt(args[0])) : String(self)); });
    def(IntegerC, ['to_i', 'to_int', 'floor', 'ceil', 'round', 'truncate', 'ord'], function (self) { return self; });
    def(IntegerC, 'chr', function (self) { return S(String.fromCharCode(self)); });
    def(IntegerC, 'even?', function (self) { return self % 2 === 0; });
    def(IntegerC, 'odd?', function (self) { return self % 2 !== 0; });
    def(IntegerC, ['succ', 'next'], function (self) { return self + 1; });
    def(IntegerC, 'pred', function (self) { return self - 1; });
    const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; };
    def(IntegerC, 'gcd', function (self, args) { return gcd(self, toInt(args[0])); });
    def(IntegerC, 'lcm', function (self, args) { const b = toInt(args[0]); return self === 0 || b === 0 ? 0 : Math.abs(self * b) / gcd(self, b); });
    def(IntegerC, 'digits', function (self) { return String(Math.abs(self)).split('').reverse().map(Number); });
    def(IntegerC, 'times', function (self, args, blk) { needBlk(blk, 'times'); for (let i = 0; i < self; i++) { I.tick(); yieldTo(blk, [i]); } return self; });
    def(IntegerC, 'upto', function (self, args, blk) { needBlk(blk, 'upto'); const lim = toInt(args[0]); for (let i = self; i <= lim; i++) { I.tick(); yieldTo(blk, [i]); } return self; });
    def(IntegerC, 'downto', function (self, args, blk) { needBlk(blk, 'downto'); const lim = toInt(args[0]); for (let i = self; i >= lim; i--) { I.tick(); yieldTo(blk, [i]); } return self; });
    def(IntegerC, '&', function (self, args) { return self & toInt(args[0]); }); def(IntegerC, '|', function (self, args) { return self | toInt(args[0]); });
    def(IntegerC, '^', function (self, args) { return self ^ toInt(args[0]); }); def(IntegerC, '<<', function (self, args) { return self * Math.pow(2, toInt(args[0])); });
    def(IntegerC, '>>', function (self, args) { return Math.floor(self / Math.pow(2, toInt(args[0]))); });
    def(IntegerC, 'coerce', function (self, args) { return [args[0], self]; });
    def(FloatC, ['to_s', 'inspect'], function (self) { return S(I.fmtFloat(self.f)); });
    const fint = (f) => { if (!Number.isFinite(f)) throw err('FloatDomainError', I.fmtFloat(f)); return f; };
    def(FloatC, ['to_i', 'to_int', 'truncate'], function (self) { return Math.trunc(fint(self.f)); });
    def(FloatC, 'floor', function (self) { return Math.floor(fint(self.f)); });
    def(FloatC, 'ceil', function (self) { return Math.ceil(fint(self.f)); });
    def(FloatC, 'round', function (self, args) { const d = args.length ? toInt(args[0]) : 0; const rnd = (x) => Math.sign(x) * Math.round(Math.abs(x)); if (d > 0) { const k = Math.pow(10, d); return F(rnd(self.f * k) / k); } return rnd(fint(self.f)); });
    def(FloatC, 'nan?', function (self) { return Number.isNaN(self.f); });
    def(FloatC, 'infinite?', function (self) { return Number.isFinite(self.f) || Number.isNaN(self.f) ? null : (self.f > 0 ? 1 : -1); });
    def(FloatC, 'finite?', function (self) { return Number.isFinite(self.f); });
    FloatC.consts.set('INFINITY', F(Infinity)); FloatC.consts.set('NAN', F(NaN)); FloatC.consts.set('EPSILON', F(Number.EPSILON));

    // ---------- nil / true / false / Symbol
    def(NilC, 'to_s', function () { return S(''); }); def(NilC, 'to_a', function () { return []; }); def(NilC, 'to_i', function () { return 0; });
    def(NilC, 'inspect', function () { return S('nil'); }); def(NilC, '&', function () { return false; }); def(NilC, '|', function (self, args) { return truthy(args[0]); });
    def(TrueC, ['to_s', 'inspect'], function () { return S('true'); }); def(FalseC, ['to_s', 'inspect'], function () { return S('false'); });
    def(TrueC, '&', function (self, args) { return truthy(args[0]); }); def(TrueC, '|', function () { return true; }); def(TrueC, '^', function (self, args) { return !truthy(args[0]); });
    def(FalseC, '&', function () { return false; }); def(FalseC, ['|', '^'], function (self, args) { return truthy(args[0]); });
    def(SymbolC, ['to_s', 'name', 'id2name'], function (self) { return S(self.n); });
    def(SymbolC, 'to_sym', function (self) { return self; });
    def(SymbolC, 'inspect', function (self) { return S(I.symInspect(self.n)); });
    def(SymbolC, 'to_proc', function (self) { return I.toProc(self); });
    def(SymbolC, ['length', 'size'], function (self) { return self.n.length; });
    def(SymbolC, '<=>', function (self, args) { const o = args[0]; return o instanceof RSym ? (self.n < o.n ? -1 : self.n > o.n ? 1 : 0) : null; });

    // ---------- String
    sdef(StringC, 'new', function (self, args) { return S(args.length ? toStr(args[0]) : ''); });
    def(StringC, '+', function (self, args) { argc(args, 1, 1); return S(self.s + toStr(args[0])); });
    def(StringC, '*', function (self, args) { const k = toInt(args[0]); if (k < 0) throw err('ArgumentError', 'negative argument'); return S(self.s.repeat(k)); });
    def(StringC, ['==', '===', 'eql?'], function (self, args) { return args[0] instanceof RStr && args[0].s === self.s; });
    def(StringC, 'equal?', function (self, args) { return self === args[0]; });
    def(StringC, '<=>', function (self, args) { const o = args[0]; return o instanceof RStr ? (self.s < o.s ? -1 : self.s > o.s ? 1 : 0) : null; });
    def(StringC, ['length', 'size'], function (self) { return self.s.length; });
    def(StringC, ['to_s', 'to_str'], function (self) { return self; });
    def(StringC, 'inspect', function (self) { return S(I.strInspect(self.s)); });
    def(StringC, ['to_sym', 'intern'], function (self) { return sym(self.s); });
    def(StringC, 'to_i', function (self) { const m = self.s.match(/^\s*[-+]?\d+/); return m ? parseInt(m[0], 10) : 0; });
    def(StringC, 'to_f', function (self) { const m = self.s.match(/^\s*[-+]?\d+(\.\d+)?([eE][-+]?\d+)?/); return F(m ? parseFloat(m[0]) : 0); });
    const smap = (name, fn) => def(StringC, name, function (self) { return S(fn(self.s)); });
    smap('upcase', s => s.toUpperCase()); smap('downcase', s => s.toLowerCase()); smap('reverse', s => [...s].reverse().join(''));
    smap('capitalize', s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()); smap('strip', s => s.trim()); smap('lstrip', s => s.trimStart()); smap('rstrip', s => s.trimEnd());
    smap('chomp', s => s.replace(/\r?\n$/, '')); smap('chop', s => s.slice(0, -1)); smap('swapcase', s => [...s].map(ch => ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase()).join(''));
    smap('succ', s => s.slice(0, -1) + String.fromCharCode(s.charCodeAt(s.length - 1) + 1));
    def(StringC, ['upcase!', 'downcase!', 'reverse!', 'capitalize!', 'strip!', 'chomp!'], function (self, args, blk, c) { return null; });
    def(StringC, 'empty?', function (self) { return self.s.length === 0; });
    def(StringC, 'include?', function (self, args) { return self.s.includes(toStr(args[0])); });
    def(StringC, 'start_with?', function (self, args) { return args.some(a => self.s.startsWith(toStr(a))); });
    def(StringC, 'end_with?', function (self, args) { return args.some(a => self.s.endsWith(toStr(a))); });
    def(StringC, 'index', function (self, args) { const i = self.s.indexOf(toStr(args[0]), args.length > 1 ? toInt(args[1]) : 0); return i < 0 ? null : i; });
    def(StringC, 'count', function (self, args) { const set = toStr(args[0]); return [...self.s].filter(ch => set.includes(ch)).length; });
    def(StringC, 'chars', function (self) { return [...self.s].map(S); });
    def(StringC, 'each_char', function (self, args, blk) { needBlk(blk, 'each_char'); for (const ch of self.s) yieldTo(blk, [S(ch)]); return self; });
    def(StringC, 'lines', function (self) { return self.s.split(/(?<=\n)/).filter(x => x.length).map(S); });
    def(StringC, 'split', function (self, args) { const sep = args.length && args[0] !== null ? toStr(args[0]) : null; const parts = sep === null || sep === ' ' ? self.s.trim().split(/\s+/).filter(x => x.length) : self.s.split(sep); while (parts.length && parts[parts.length - 1] === '') parts.pop(); return parts.map(S); });
    def(StringC, ['<<', 'concat'], function (self, args) { for (const a of args) self.s += typeof a === 'number' ? String.fromCharCode(a) : toStr(a); return self; });
    def(StringC, 'replace', function (self, args) { self.s = toStr(args[0]); return self; });
    def(StringC, 'prepend', function (self, args) { self.s = toStr(args[0]) + self.s; return self; });
    def(StringC, 'clear', function (self) { self.s = ''; return self; });
    def(StringC, 'ord', function (self) { return self.s.charCodeAt(0); });
    def(StringC, 'hash', function (self) { let h = 7; for (const ch of self.s) h = (h * 31 + ch.charCodeAt(0)) | 0; return h; });
    def(StringC, 'sub', function (self, args) { return S(self.s.replace(toStr(args[0]), () => toStr(args[1]))); });
    def(StringC, 'gsub', function (self, args) { return S(self.s.split(toStr(args[0])).join(toStr(args[1]))); });
    def(StringC, 'tr', function (self, args) { const a = toStr(args[0]), b = toStr(args[1]); return S([...self.s].map(ch => { const i = a.indexOf(ch); return i < 0 ? ch : b[Math.min(i, b.length - 1)] || ''; }).join('')); });
    def(StringC, 'delete', function (self, args) { const a = toStr(args[0]); return S([...self.s].filter(ch => !a.includes(ch)).join('')); });
    const pad = (name, fn) => def(StringC, name, function (self, args) { const w = toInt(args[0]), p = args.length > 1 ? toStr(args[1]) : ' '; return S(fn(self.s, w, p)); });
    pad('ljust', (s, w, p) => s.padEnd(w, p)); pad('rjust', (s, w, p) => s.padStart(w, p));
    pad('center', (s, w, p) => { const tot = Math.max(0, w - s.length), l = Math.floor(tot / 2); return s.padStart(s.length + l, p).padEnd(Math.max(w, s.length), p); });
    const sliceIdx = (len, args) => { // -> [start, count] or null
      if (args[0] instanceof RRange) { let a = toInt(args[0].a), b = toInt(args[0].b); if (a < 0) a += len; if (b < 0) b += len; if (!args[0].excl) b++; if (a < 0 || a > len) return null; return [a, Math.max(0, b - a)]; }
      let a = toInt(args[0]); if (a < 0) a += len;
      if (args.length > 1) { const n = toInt(args[1]); if (a < 0 || a > len || n < 0) return null; return [a, n]; }
      return [a, -1];
    };
    def(StringC, ['[]', 'slice'], function (self, args) {
      argc(args, 1, 2);
      if (args[0] instanceof RStr) return self.s.includes(args[0].s) ? S(args[0].s) : null;
      const r = sliceIdx(self.s.length, args); if (!r) return null;
      if (r[1] < 0) return r[0] < 0 || r[0] >= self.s.length ? null : S(self.s[r[0]]);
      return S(self.s.substr(r[0], r[1]));
    });
    def(StringC, '%', function (self, args) { const vals = Array.isArray(args[0]) ? args[0].slice() : [args[0]]; return S(self.s.replace(/%(-?\d*)(?:\.(\d+))?([dsf%])/g, (m, w, pr, k) => { if (k === '%') return '%'; const v = vals.shift(); let s = k === 'd' ? String(toInt(v)) : k === 'f' ? nv(v).toFixed(pr === undefined ? 6 : +pr) : I.tos(v); if (w) s = w.startsWith('-') ? s.padEnd(-w) : s.padStart(+w, w.startsWith('0') ? '0' : ' '); return s; })); });

    // ---------- Array
    sdef(ArrayC, 'new', function (self, args, blk) {
      argc(args, 0, 2); const n = args.length ? toInt(args[0]) : 0; if (n < 0) throw err('ArgumentError', 'negative array size');
      const a = []; for (let i = 0; i < n; i++) { I.tick(); a.push(blk ? yieldTo(blk, [i]) : (args.length > 1 ? args[1] : null)); } return a;
    });
    def(ArrayC, ['[]', 'slice'], function (self, args) {
      argc(args, 1, 2); const r = sliceIdx(self.length, args); if (!r) return null;
      if (r[1] < 0) { const v = self[r[0]]; return v === undefined ? null : v; }
      return self.slice(r[0], r[0] + r[1]);
    });
    def(ArrayC, '[]=', function (self, args) {
      argc(args, 2, 3);
      if (args.length === 3 || args[0] instanceof RRange) {
        const r = sliceIdx(self.length, args.slice(0, args.length - 1)); if (!r) throw err('IndexError', 'index out of range');
        const v = args[args.length - 1]; while (self.length < r[0]) self.push(null);
        self.splice(r[0], r[1], ...(Array.isArray(v) ? v : [v])); return v;
      }
      let i = toInt(args[0]); if (i < 0) { i += self.length; if (i < 0) throw err('IndexError', 'index ' + (i - self.length) + ' too small for array; minimum: -' + self.length); }
      while (self.length < i) self.push(null);
      self[i] = args[1]; return args[1];
    });
    def(ArrayC, 'at', function (self, args) { let i = toInt(args[0]); if (i < 0) i += self.length; const v = self[i]; return v === undefined ? null : v; });
    def(ArrayC, 'fetch', function (self, args) { let i = toInt(args[0]); const j = i < 0 ? i + self.length : i; if (j < 0 || j >= self.length) { if (args.length > 1) return args[1]; throw err('IndexError', 'index ' + i + ' outside of array bounds: ' + (-self.length) + '...' + self.length); } return self[j]; });
    def(ArrayC, 'dig', function (self, args) { let v = self; for (const k of args) { if (v === null) return null; v = call(v, '[]', [k]); } return v; });
    def(ArrayC, 'values_at', function (self, args) { return args.map(i => { let j = toInt(i); if (j < 0) j += self.length; const v = self[j]; return v === undefined ? null : v; }); });
    def(ArrayC, ['length', 'size'], function (self) { return self.length; });
    def(ArrayC, 'empty?', function (self) { return self.length === 0; });
    def(ArrayC, ['push', 'append'], function (self, args) { self.push(...args); return self; });
    def(ArrayC, '<<', function (self, args) { argc(args, 1, 1); self.push(args[0]); return self; });
    def(ArrayC, 'pop', function (self, args) { if (args.length) return self.splice(Math.max(0, self.length - toInt(args[0]))); return self.length ? self.pop() : null; });
    def(ArrayC, 'shift', function (self, args) { if (args.length) return self.splice(0, toInt(args[0])); return self.length ? self.shift() : null; });
    def(ArrayC, ['unshift', 'prepend'], function (self, args) { self.unshift(...args); return self; });
    def(ArrayC, 'insert', function (self, args) { let i = toInt(args[0]); if (i < 0) i += self.length + 1; while (self.length < i) self.push(null); self.splice(i, 0, ...args.slice(1)); return self; });
    def(ArrayC, 'concat', function (self, args) { for (const a of args) { if (!Array.isArray(a)) throw err('TypeError', 'no implicit conversion of ' + coerceName(a) + ' into Array'); self.push(...a); } return self; });
    def(ArrayC, 'replace', function (self, args) { const a = args[0].slice(); self.length = 0; self.push(...a); return self; });
    def(ArrayC, 'clear', function (self) { self.length = 0; return self; });
    const needArr = (v) => { if (!Array.isArray(v)) throw err('TypeError', 'no implicit conversion of ' + coerceName(v) + ' into Array'); return v; };
    def(ArrayC, '+', function (self, args) { argc(args, 1, 1); return self.concat(needArr(args[0])); });
    def(ArrayC, ['-', 'difference'], function (self, args) { const ks = new Set(needArr(args[0]).map(x => I.hkey(x))); return self.filter(x => !ks.has(I.hkey(x))); });
    def(ArrayC, '*', function (self, args) { if (args[0] instanceof RStr) return S(self.map(x => I.tos(x)).join(args[0].s)); const k = toInt(args[0]); let r = []; for (let i = 0; i < k; i++) r = r.concat(self); return r; });
    const uniq = (a) => { const seen = new Set(), r = []; for (const x of a) { const k = I.hkey(x); if (!seen.has(k)) { seen.add(k); r.push(x); } } return r; };
    def(ArrayC, ['|', 'union'], function (self, args) { return uniq(self.concat(needArr(args[0]))); });
    def(ArrayC, ['&', 'intersection'], function (self, args) { const ks = new Set(needArr(args[0]).map(x => I.hkey(x))); return uniq(self.filter(x => ks.has(I.hkey(x)))); });
    def(ArrayC, ['==', 'eql?'], function (self, args) { const o = args[0]; if (self === o) return true; if (!Array.isArray(o) || o.length !== self.length) return false; for (let i = 0; i < self.length; i++) if (!I.eq(self[i], o[i])) return false; return true; });
    def(ArrayC, '<=>', function (self, args) { const o = args[0]; if (!Array.isArray(o)) return null; for (let i = 0; i < Math.min(self.length, o.length); i++) { const r = call(self[i], '<=>', [o[i]]); if (r !== 0) return r; } return self.length < o.length ? -1 : self.length > o.length ? 1 : 0; });
    def(ArrayC, 'each', function (self, args, blk) { needBlk(blk, 'each'); for (let i = 0; i < self.length; i++) { I.tick(); yieldTo(blk, [self[i]]); } return self; });
    def(ArrayC, 'each_index', function (self, args, blk) { needBlk(blk, 'each_index'); for (let i = 0; i < self.length; i++) yieldTo(blk, [i]); return self; });
    def(ArrayC, ['map!', 'collect!'], function (self, args, blk) { needBlk(blk, 'map!'); for (let i = 0; i < self.length; i++) self[i] = yieldTo(blk, [self[i]]); return self; });
    const filterBang = (name, keep) => def(ArrayC, name, function (self, args, blk) { needBlk(blk, name[0]); const r = self.filter(x => truthy(yieldTo(blk, [x])) === keep); self.length = 0; self.push(...r); return self; });
    filterBang(['select!', 'keep_if', 'filter!'], true); filterBang(['reject!', 'delete_if'], false);
    def(ArrayC, 'reverse', function (self) { return self.slice().reverse(); });
    def(ArrayC, 'reverse!', function (self) { self.reverse(); return self; });
    def(ArrayC, 'rotate', function (self, args) { const n = self.length; if (!n) return []; const k = ((args.length ? toInt(args[0]) : 1) % n + n) % n; return self.slice(k).concat(self.slice(0, k)); });
    def(ArrayC, 'join', function (self, args) { const sep = args.length && args[0] !== null ? toStr(args[0]) : ''; const j = (a) => a.map(x => Array.isArray(x) ? j(x) : I.tos(x)).join(sep); return S(j(self)); });
    def(ArrayC, ['to_a', 'entries'], function (self) { return self; });
    def(ArrayC, ['to_s', 'inspect'], function (self) { return S(I.insp(self)); });
    def(ArrayC, ['include?', 'member?'], function (self, args) { argc(args, 1, 1); return self.some(x => I.eq(x, args[0])); });
    def(ArrayC, ['index', 'find_index'], function (self, args, blk) { for (let i = 0; i < self.length; i++) if (blk && !args.length ? truthy(yieldTo(blk, [self[i]])) : I.eq(self[i], args[0])) return i; return null; });
    def(ArrayC, 'rindex', function (self, args) { for (let i = self.length - 1; i >= 0; i--) if (I.eq(self[i], args[0])) return i; return null; });
    def(ArrayC, 'delete', function (self, args) { let found = null; for (let i = self.length - 1; i >= 0; i--) if (I.eq(self[i], args[0])) { found = self[i]; self.splice(i, 1); } return found; });
    def(ArrayC, 'delete_at', function (self, args) { let i = toInt(args[0]); if (i < 0) i += self.length; if (i < 0 || i >= self.length) return null; return self.splice(i, 1)[0]; });
    def(ArrayC, 'slice!', function (self, args) { const r = sliceIdx(self.length, args); if (!r) return null; if (r[1] < 0) return r[0] < self.length ? self.splice(r[0], 1)[0] : null; return self.splice(r[0], r[1]); });
    def(ArrayC, 'compact', function (self) { return self.filter(x => x !== null); });
    def(ArrayC, 'compact!', function (self) { const r = self.filter(x => x !== null); self.length = 0; self.push(...r); return self; });
    const flat = (a, d) => a.reduce((r, x) => Array.isArray(x) && d !== 0 ? r.concat(flat(x, d - 1)) : (r.push(x), r), []);
    def(ArrayC, 'flatten', function (self, args) { return flat(self, args.length ? toInt(args[0]) : -1); });
    def(ArrayC, 'uniq', function (self) { return uniq(self); });
    def(ArrayC, 'sort!', function (self, args, blk) { const r = call(self, 'sort', [], blk); self.length = 0; self.push(...r); return self; });
    def(ArrayC, 'last', function (self, args) { if (args.length) return self.slice(Math.max(0, self.length - toInt(args[0]))); return self.length ? self[self.length - 1] : null; });
    def(ArrayC, 'assoc', function (self, args) { for (const x of self) if (Array.isArray(x) && I.eq(x[0], args[0])) return x; return null; });
    def(ArrayC, 'transpose', function (self) { if (!self.length) return []; return self[0].map((_, i) => self.map(r => r[i])); });
    def(ArrayC, 'fill', function (self, args) { for (let i = 0; i < self.length; i++) self[i] = args[0]; return self; });
    def(ArrayC, 'hash', function (self) { let h = 7; for (const ch of I.hkey(self)) h = (h * 31 + ch.charCodeAt(0)) | 0; return h; });
    def(ArrayC, 'pack', function () { throw err('NotImplementedError', 'pack is not supported in mini-Ruby'); });

    // ---------- Enumerable (everything is written in terms of each)
    const E = (names, fn) => def(Enumerable, names, fn);
    const stop = () => { throw new StopIter(); };
    const items = (self) => I.toArray(self);
    E(['to_a', 'entries'], function (self) { return items(self).slice(); });
    E(['map', 'collect'], function (self, args, blk) { needBlk(blk, 'map'); const r = []; I.iter(self, x => { r.push(yieldTo(blk, [x])); }); return r; });
    E(['flat_map', 'collect_concat'], function (self, args, blk) { needBlk(blk, 'flat_map'); const r = []; I.iter(self, x => { const v = yieldTo(blk, [x]); if (Array.isArray(v)) r.push(...v); else r.push(v); }); return r; });
    E(['select', 'filter', 'find_all'], function (self, args, blk) { needBlk(blk, 'select'); const r = []; I.iter(self, x => { if (truthy(yieldTo(blk, [x]))) r.push(x); }); return r; });
    E('filter_map', function (self, args, blk) { needBlk(blk, 'filter_map'); const r = []; I.iter(self, x => { const v = yieldTo(blk, [x]); if (truthy(v)) r.push(v); }); return r; });
    E('reject', function (self, args, blk) { needBlk(blk, 'reject'); const r = []; I.iter(self, x => { if (!truthy(yieldTo(blk, [x]))) r.push(x); }); return r; });
    E(['find', 'detect'], function (self, args, blk) { needBlk(blk, 'find'); let r = null; I.iterStop(self, x => { if (truthy(yieldTo(blk, [x]))) { r = x; stop(); } }); return r; });
    E('find_index', function (self, args, blk) { let r = null, i = 0; I.iterStop(self, x => { if (blk && !args.length ? truthy(yieldTo(blk, [x])) : I.eq(x, args[0])) { r = i; stop(); } i++; }); return r; });
    E('each_with_index', function (self, args, blk) { needBlk(blk, 'each_with_index'); let i = 0; I.iter(self, x => { yieldTo(blk, [x, i++]); }); return self; });
    E('each_with_object', function (self, args, blk) { needBlk(blk, 'each_with_object'); I.iter(self, x => { yieldTo(blk, [x, args[0]]); }); return args[0]; });
    E('each_entry', function (self, args, blk) { needBlk(blk, 'each_entry'); I.iter(self, x => { yieldTo(blk, [x]); }); return self; });
    E('reverse_each', function (self, args, blk) { needBlk(blk, 'reverse_each'); const a = items(self); for (let i = a.length - 1; i >= 0; i--) yieldTo(blk, [a[i]]); return self; });
    E(['inject', 'reduce'], function (self, args, blk) {
      let acc, has = false, op = null;
      if (args.length === 2) { acc = args[0]; has = true; op = symOrStr(args[1]); }
      else if (args.length === 1 && !blk) op = symOrStr(args[0]);
      else if (args.length === 1) { acc = args[0]; has = true; }
      if (!op && !blk) throw err('LocalJumpError', 'no block given');
      I.iter(self, x => { if (!has) { acc = x; has = true; } else acc = op ? call(acc, op, [x]) : yieldTo(blk, [acc, x]); });
      return has ? acc : null;
    });
    E('sum', function (self, args, blk) { let acc = args.length ? args[0] : 0; I.iter(self, x => { acc = call(acc, '+', [blk ? yieldTo(blk, [x]) : x]); }); return acc; });
    E('count', function (self, args, blk) { let n = 0; I.iter(self, x => { if (args.length ? I.eq(x, args[0]) : blk ? truthy(yieldTo(blk, [x])) : true) n++; }); return n; });
    const quant = (names, init, onHit) => E(names, function (self, args, blk) {
      let r = init;
      I.iterStop(self, x => { const t = args.length ? truthy(call(args[0], '===', [x])) : blk ? truthy(yieldTo(blk, [x])) : truthy(x); const d = onHit(t); if (d !== undefined) { r = d; stop(); } });
      return r;
    });
    quant('any?', false, t => t ? true : undefined); quant('all?', true, t => t ? undefined : false); quant('none?', true, t => t ? false : undefined);
    E('one?', function (self, args, blk) { let n = 0; I.iter(self, x => { if (blk ? truthy(yieldTo(blk, [x])) : truthy(x)) n++; }); return n === 1; });
    E(['include?', 'member?'], function (self, args) { let r = false; I.iterStop(self, x => { if (I.eq(x, args[0])) { r = true; stop(); } }); return r; });
    E('first', function (self, args) { if (!args.length) { let r = null; I.iterStop(self, x => { r = x; stop(); }); return r; } const n = toInt(args[0]), r = []; if (n > 0) I.iterStop(self, x => { r.push(x); if (r.length >= n) stop(); }); return r; });
    E('take', function (self, args) { const n = toInt(args[0]), r = []; if (n > 0) I.iterStop(self, x => { r.push(x); if (r.length >= n) stop(); }); return r; });
    E('take_while', function (self, args, blk) { needBlk(blk, 'take_while'); const r = []; I.iterStop(self, x => { if (!truthy(yieldTo(blk, [x]))) stop(); r.push(x); }); return r; });
    E('drop', function (self, args) { return items(self).slice(toInt(args[0])); });
    E('drop_while', function (self, args, blk) { needBlk(blk, 'drop_while'); const a = items(self); let i = 0; while (i < a.length && truthy(yieldTo(blk, [a[i]]))) i++; return a.slice(i); });
    const sorted = (a, cmpf) => { const b = a.slice(); b.sort(cmpf); return b; }; // Array.prototype.sort is stable
    E('sort', function (self, args, blk) { return sorted(items(self), blk ? (x, y) => { const r = yieldTo(blk, [x, y]); if (typeof r !== 'number') throw err('ArgumentError', 'comparison of ' + clsName(x) + ' with ' + clsName(y) + ' failed'); return r; } : (x, y) => I.cmp(x, y)); });
    E('sort_by', function (self, args, blk) { needBlk(blk, 'sort_by'); return sorted(items(self).map(x => [yieldTo(blk, [x]), x]), (p, q) => I.cmp(p[0], q[0])).map(p => p[1]); });
    const best = (names, sign, by) => E(names, function (self, args, blk) {
      if (by) needBlk(blk, names);
      let r = null, rk = null, has = false;
      I.iter(self, x => { const k = by ? yieldTo(blk, [x]) : x; if (!has) { r = x; rk = k; has = true; return; } const cmp = (!by && blk) ? yieldTo(blk, [k, rk]) : I.cmp(k, rk); if (cmp * sign > 0) { r = x; rk = k; } });
      return r;
    });
    best('min', -1, false); best('max', 1, false); best('min_by', -1, true); best('max_by', 1, true);
    E('minmax', function (self) { return [call(self, 'min'), call(self, 'max')]; });
    const mkHash = (pairs) => { const h = new RHash(); for (const [k, v] of pairs) I.hset(h, k, v); return h; };
    E('group_by', function (self, args, blk) { needBlk(blk, 'group_by'); const h = new RHash(); I.iter(self, x => { const k = yieldTo(blk, [x]); const cur = I.hget(h, k); if (cur) cur.push(x); else I.hset(h, k, [x]); }); return h; });
    E('partition', function (self, args, blk) { needBlk(blk, 'partition'); const a = [], b = []; I.iter(self, x => { (truthy(yieldTo(blk, [x])) ? a : b).push(x); }); return [a, b]; });
    E('tally', function (self) { const h = new RHash(); I.iter(self, x => { I.hset(h, x, (I.hget(h, x) || 0) + 1); }); return h; });
    E('zip', function (self, args) { const others = args.map(a => items(a)); return items(self).map((x, i) => [x, ...others.map(o => i < o.length ? o[i] : null)]); });
    E('each_slice', function (self, args, blk) { const n = toInt(args[0]), a = items(self), r = []; for (let i = 0; i < a.length; i += n) r.push(a.slice(i, i + n)); if (!blk) return r; r.forEach(x => yieldTo(blk, [x])); return self; });
    E('each_cons', function (self, args, blk) { const n = toInt(args[0]), a = items(self), r = []; for (let i = 0; i + n <= a.length; i++) r.push(a.slice(i, i + n)); if (!blk) return r; r.forEach(x => yieldTo(blk, [x])); return self; });
    E('uniq', function (self) { return uniq(items(self)); });
    E('to_h', function (self, args, blk) { return mkHash(items(self).map(x => { const p = blk ? yieldTo(blk, [x]) : x; if (!Array.isArray(p) || p.length !== 2) throw err('TypeError', 'wrong element type ' + clsName(p) + ' (expected array)'); return p; })); });
    E('to_set', function (self) { return uniq(items(self)); });
    E('lazy', function (self) { return self; });

    // ---------- Hash
    sdef(HashC, 'new', function (self, args) { const h = new RHash(); h.def = args.length ? args[0] : null; return h; });
    def(HashC, '[]', function (self, args) { argc(args, 1, 1); const v = I.hget(self, args[0]); return v === undefined ? self.def : v; });
    def(HashC, ['[]=', 'store'], function (self, args) { argc(args, 2, 2); I.hset(self, args[0], args[1]); return args[1]; });
    def(HashC, 'fetch', function (self, args, blk) { const v = I.hget(self, args[0]); if (v !== undefined) return v; if (args.length > 1) return args[1]; if (blk) return yieldTo(blk, [args[0]]); throw err('KeyError', 'key not found: ' + I.insp(args[0])); });
    def(HashC, 'dig', function (self, args) { let v = self; for (const k of args) { if (v === null) return null; v = call(v, '[]', [k]); } return v; });
    def(HashC, ['key?', 'has_key?', 'include?', 'member?'], function (self, args) { return self.map.has(I.hkey(args[0])); });
    def(HashC, ['value?', 'has_value?'], function (self, args) { return [...self.map.values()].some(e => I.eq(e[1], args[0])); });
    def(HashC, 'key', function (self, args) { for (const e of self.map.values()) if (I.eq(e[1], args[0])) return e[0]; return null; });
    def(HashC, 'keys', function (self) { return [...self.map.values()].map(e => e[0]); });
    def(HashC, 'values', function (self) { return [...self.map.values()].map(e => e[1]); });
    def(HashC, 'values_at', function (self, args) { return args.map(k => { const v = I.hget(self, k); return v === undefined ? self.def : v; }); });
    def(HashC, ['length', 'size'], function (self) { return self.map.size; });
    def(HashC, 'empty?', function (self) { return self.map.size === 0; });
    def(HashC, 'delete', function (self, args) { const k = I.hkey(args[0]); const e = self.map.get(k); if (!e) return null; self.map.delete(k); return e[1]; });
    def(HashC, 'clear', function (self) { self.map.clear(); return self; });
    def(HashC, ['each', 'each_pair'], function (self, args, blk) { needBlk(blk, 'each'); for (const e of [...self.map.values()]) { I.tick(); yieldTo(blk, [[e[0], e[1]]]); } return self; });
    def(HashC, 'each_key', function (self, args, blk) { needBlk(blk, 'each_key'); for (const e of [...self.map.values()]) yieldTo(blk, [e[0]]); return self; });
    def(HashC, 'each_value', function (self, args, blk) { needBlk(blk, 'each_value'); for (const e of [...self.map.values()]) yieldTo(blk, [e[1]]); return self; });
    const hfilter = (names, keep) => def(HashC, names, function (self, args, blk) { needBlk(blk, names[0]); return mkHash([...self.map.values()].filter(e => truthy(yieldTo(blk, [e[0], e[1]])) === keep)); });
    hfilter(['select', 'filter'], true); hfilter(['reject'], false);
    def(HashC, 'transform_values', function (self, args, blk) { needBlk(blk, 'transform_values'); return mkHash([...self.map.values()].map(e => [e[0], yieldTo(blk, [e[1]])])); });
    def(HashC, 'transform_keys', function (self, args, blk) { needBlk(blk, 'transform_keys'); return mkHash([...self.map.values()].map(e => [yieldTo(blk, [e[0]]), e[1]])); });
    def(HashC, 'to_a', function (self) { return [...self.map.values()].map(e => [e[0], e[1]]); });
    def(HashC, 'to_h', function (self) { return self; });
    def(HashC, 'merge', function (self, args) { const h = mkHash([...self.map.values()]); for (const o of args) for (const e of o.map.values()) I.hset(h, e[0], e[1]); h.def = self.def; return h; });
    def(HashC, ['merge!', 'update'], function (self, args) { for (const o of args) for (const e of o.map.values()) I.hset(self, e[0], e[1]); return self; });
    def(HashC, 'invert', function (self) { return mkHash([...self.map.values()].map(e => [e[1], e[0]])); });
    def(HashC, ['to_s', 'inspect'], function (self) { return S(I.insp(self)); });
    def(HashC, '==', function (self, args) { const o = args[0]; if (!(o instanceof RHash) || o.map.size !== self.map.size) return false; for (const [k, e] of self.map) { const f = o.map.get(k); if (!f || !I.eq(e[1], f[1])) return false; } return true; });
    def(HashC, 'default', function (self) { return self.def; });
    def(HashC, 'default=', function (self, args) { self.def = args[0]; return args[0]; });
    def(HashC, 'count', function (self, args, blk) { if (!blk) return self.map.size; let n = 0; for (const e of self.map.values()) if (truthy(yieldTo(blk, [e[0], e[1]]))) n++; return n; });
    def(HashC, 'any?', function (self, args, blk) { if (!blk) return self.map.size > 0; for (const e of [...self.map.values()]) if (truthy(yieldTo(blk, [e[0], e[1]]))) return true; return false; });
    def(HashC, 'all?', function (self, args, blk) { if (!blk) return true; for (const e of [...self.map.values()]) if (!truthy(yieldTo(blk, [e[0], e[1]]))) return false; return true; });
    def(HashC, ['find', 'detect'], function (self, args, blk) { needBlk(blk, 'find'); for (const e of [...self.map.values()]) if (truthy(yieldTo(blk, [e[0], e[1]]))) return [e[0], e[1]]; return null; });
    def(HashC, 'map', function (self, args, blk) { needBlk(blk, 'map'); return [...self.map.values()].map(e => yieldTo(blk, [e[0], e[1]])); });
    def(HashC, 'sum', function (self, args, blk) { let acc = args.length ? args[0] : 0; for (const e of [...self.map.values()]) acc = call(acc, '+', [blk ? yieldTo(blk, [e[0], e[1]]) : [e[0], e[1]]]); return acc; });

    // ---------- Range
    sdef(RangeC, 'new', function (self, args) { argc(args, 2, 3); return new RRange(args[0], args[1], truthy(args[2] === undefined ? null : args[2])); });
    const rEach = (self, fn) => {
      if (typeof self.a !== 'number') { if (self.a instanceof RStr && self.b instanceof RStr && self.a.s.length === 1 && self.b.s.length === 1) { for (let ch = self.a.s.charCodeAt(0); self.excl ? ch < self.b.s.charCodeAt(0) : ch <= self.b.s.charCodeAt(0); ch++) fn(S(String.fromCharCode(ch))); return; } throw err('TypeError', "can't iterate from " + clsName(self.a)); }
      const end = isNum(self.b) ? nv(self.b) : (() => { throw err('ArgumentError', 'bad value for range'); })();
      for (let i = self.a; self.excl ? i < end : i <= end; i++) { I.tick(); fn(i); }
    };
    def(RangeC, 'each', function (self, args, blk) { needBlk(blk, 'each'); rEach(self, x => { yieldTo(blk, [x]); }); return self; });
    def(RangeC, ['first', 'begin', 'min'], function (self, args, blk) { if (args.length) { const n = toInt(args[0]), r = []; if (n > 0) try { rEach(self, x => { r.push(x); if (r.length >= n) stop(); }); } catch (e) { if (!(e instanceof StopIter)) throw e; } return r; } if (I.cmp(self.a, self.b) > 0) return null; return self.a; });
    def(RangeC, ['last', 'end'], function (self, args) { if (args.length) { const a = items(self); return a.slice(Math.max(0, a.length - toInt(args[0]))); } return self.b; });
    def(RangeC, 'max', function (self) { if (I.cmp(self.a, self.b) > 0) return null; return self.excl && typeof self.b === 'number' ? (self.b - 1 < self.a ? null : self.b - 1) : self.b; });
    def(RangeC, ['size', 'count', 'length'], function (self, args, blk) { if (blk || args.length) { let n = 0; rEach(self, x => { if (args.length ? I.eq(x, args[0]) : truthy(yieldTo(blk, [x]))) n++; }); return n; } if (!isNum(self.a) || !isNum(self.b)) return null; return Math.max(0, Math.floor(nv(self.b) - nv(self.a)) + (self.excl && Number.isInteger(nv(self.b) - nv(self.a)) ? 0 : 1)); });
    def(RangeC, ['include?', 'member?', '===', 'cover?'], function (self, args) { const x = args[0]; let lo, hi; try { lo = I.cmp(self.a, x); hi = I.cmp(x, self.b); } catch (e) { if (e instanceof RubyError) return false; throw e; } return lo <= 0 && (self.excl ? hi < 0 : hi <= 0); });
    def(RangeC, 'exclude_end?', function (self) { return self.excl; });
    def(RangeC, ['to_s', 'inspect'], function (self) { return S(I.insp(self)); });
    def(RangeC, ['==', 'eql?'], function (self, args) { const o = args[0]; return o instanceof RRange && o.excl === self.excl && I.eq(self.a, o.a) && I.eq(self.b, o.b); });
    def(RangeC, ['step', '%'], function (self, args, blk) { const st = nv(args[0]); if (st <= 0) throw err('ArgumentError', "step can't be " + (st === 0 ? '0' : 'negative')); const r = []; const end = nv(self.b); for (let x = nv(self.a); self.excl ? x < end : x <= end; x += st) { I.tick(); const v = typeof self.a === 'number' && typeof args[0] === 'number' ? x : F(x); if (blk) yieldTo(blk, [v]); else r.push(v); } return blk ? self : r; });
    def(RangeC, 'sum', function (self, args, blk) { let acc = args.length ? args[0] : 0; rEach(self, x => { acc = call(acc, '+', [blk ? yieldTo(blk, [x]) : x]); }); return acc; });

    // ---------- Proc
    sdef(ProcC, 'new', function (self, args, blk) { if (!blk) throw err('ArgumentError', 'tried to create Proc object without a block'); return blk; });
    def(ProcC, ['call', '()', 'yield', '===', '[]'], function (self, args) { return I.callProc(self, args); });
    def(ProcC, 'to_proc', function (self) { return self; });
    def(ProcC, 'lambda?', function (self) { return self.isLambda; });
    def(ProcC, 'arity', function (self) { if (!self.params) return -2; const req = self.params.filter(p => p.kind === 'req').length; const more = self.params.some(p => p.kind === 'rest' || (p.kind === 'opt')); return more || (!self.isLambda && false) ? -(req + 1) : req; });
    def(ProcC, 'parameters', function (self) { return (self.params || []).map(p => [sym(p.kind === 'req' && !self.isLambda ? 'opt' : p.kind), sym(p.name)]); });
    def(ProcC, ['to_s', 'inspect'], function (self) { return S(I.insp(self)); });
    def(ProcC, 'curry', function (self) { const n = self.params.filter(p => p.kind === 'req').length; const mk = (got) => { const p = new RProc(null, null, null, true); p.nat = (args) => { const all = got.concat(args); return all.length >= n ? I.callProc(self, all) : mk(all); }; return p; }; return mk([]); });

    // ---------- Math
    const m1 = (name, fn) => sdef(MathM, name, function (self, args) { argc(args, 1, 1); if (!isNum(args[0])) throw err('TypeError', "can't convert " + coerceName(args[0]) + ' into Float'); return F(fn(nv(args[0]))); });
    m1('sqrt', (x) => { if (x < 0) throw err('ArgumentError', 'Numerical argument is out of domain - "sqrt"'); return Math.sqrt(x); });
    m1('sin', Math.sin); m1('cos', Math.cos); m1('tan', Math.tan); m1('atan', Math.atan); m1('exp', Math.exp); m1('log2', Math.log2); m1('log10', Math.log10); m1('cbrt', Math.cbrt); m1('asin', Math.asin); m1('acos', Math.acos);
    sdef(MathM, 'log', function (self, args) { return F(args.length > 1 ? Math.log(nv(args[0])) / Math.log(nv(args[1])) : Math.log(nv(args[0]))); });
    sdef(MathM, 'atan2', function (self, args) { argc(args, 2, 2); return F(Math.atan2(nv(args[0]), nv(args[1]))); });
    sdef(MathM, 'hypot', function (self, args) { argc(args, 2, 2); return F(Math.hypot(nv(args[0]), nv(args[1]))); });
    sdef(MathM, 'pow', function (self, args) { return F(Math.pow(nv(args[0]), nv(args[1]))); });
    MathM.consts.set('PI', F(Math.PI)); MathM.consts.set('E', F(Math.E));
  });
})(typeof window !== 'undefined' ? window : globalThis);

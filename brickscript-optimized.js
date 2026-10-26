/* ============================================================
   BRICKSCRIPT — Optimized for Game Engines
   The language itself, tuned for the access pattern a game loop
   actually has: a script is loaded ONCE, then a handful of its
   blueprints (onframe/onkey callbacks) get called 30–60+ times
   PER SECOND for the life of the game. A tree-walking interpreter
   that re-switches on node.type for every statement/expression on
   every single frame spends most of its time on dispatch, not on
   the script's actual logic. This build removes that repeated
   dispatch and a few other frame-loop costs:

   1. Compile-once closures
      Every AST node is compiled into a plain JS function exactly
      once, when the script loads (or a `blueprint` is declared).
      Calling a blueprint afterwards is just calling those nested
      closures — no switch(node.type) tree-walk happens on the hot
      path anymore, only on first compile.

   2. No exceptions for control flow
      The original design used `throw new ReturnSignal(...)` /
      try-catch to implement `return`. Throwing is comparatively
      expensive and can block JIT optimization of the function
      that throws. Here `return` produces an ordinary ReturnSignal
      VALUE that callers check for, the same way a normal function
      would propagate an early-exit flag.

   3. Prototype-chain environments
      Variable scopes are plain JS objects linked with
      Object.create() instead of a hand-rolled Map + manual parent
      walk. Reading a variable is one native property lookup that
      the JS engine can inline-cache across repeated calls — exactly
      what happens when the same blueprint reads the same variable
      names every frame.

   4. Char-code tokenizing
      The lexer classifies characters with numeric comparisons
      instead of a `RegExp.test()` call per character, which
      matters on larger scripts and hot-reloads during development.

   Behavior is unchanged from the reference BrickScript interpreter:
   same syntax (`brick`, `show`, `if`, `stack`, `blueprint`, `return`),
   same semantics, same error messages. This file also keeps the
   NativeFunction bridge so a host game engine can expose its own
   functions (sprite movement, input, etc.) to BrickScript — that
   bridge is part of the language runtime, not a bundled engine.

   Usage:
     <script src="brickscript-optimized.js"></script>
     <script>
       const interp = new BrickScript.Interpreter(
         (text) => console.log(text),      // onShow
         { rand: () => Math.random() }     // native functions, optional
       );
       interp.run(BrickScript.parse(`
         brick x = 5;
         show x + 1;
       `));
     </script>
   ============================================================ */

(function (global) {
  "use strict";

  class BSError extends Error {
    constructor(msg, line) {
      super(msg);
      this.line = line;
    }
  }

  /* ---------- Lexer ---------- */
  const KEYWORDS = new Set([
    "brick", "show", "if", "else", "stack", "blueprint", "return", "build",
    "true", "false", "and", "or", "not"
  ]);

  // Numeric char-code checks instead of per-character regex tests.
  function isDigitCode(code) { return code >= 48 && code <= 57; }               // 0-9
  function isAlphaCode(code) {
    return (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code === 95; // A-Z a-z _
  }
  function isAlnumCode(code) { return isAlphaCode(code) || isDigitCode(code); }

  function tokenize(src) {
    const tokens = [];
    let i = 0, line = 1;
    const n = src.length;

    while (i < n) {
      const c = src[i];
      const code = src.charCodeAt(i);

      if (c === "\n") { line++; i++; continue; }
      if (c === " " || c === "\t" || c === "\r") { i++; continue; }

      if (c === "/" && src[i + 1] === "/") {
        while (i < n && src[i] !== "\n") i++;
        continue;
      }

      if (isDigitCode(code)) {
        let start = i;
        while (i < n && isDigitCode(src.charCodeAt(i))) i++;
        if (src[i] === "." && isDigitCode(src.charCodeAt(i + 1))) {
          i++;
          while (i < n && isDigitCode(src.charCodeAt(i))) i++;
        }
        tokens.push({ type: "NUMBER", value: parseFloat(src.slice(start, i)), line });
        continue;
      }

      if (c === '"' || c === "'") {
        const quote = c;
        i++;
        let buf = "";
        while (i < n && src[i] !== quote) {
          if (src[i] === "\\" && i + 1 < n) {
            const esc = src[i + 1];
            buf += (esc === "n") ? "\n" : (esc === "t") ? "\t" : esc;
            i += 2;
            continue;
          }
          if (src[i] === "\n") line++;
          buf += src[i];
          i++;
        }
        if (i >= n) throw new BSError("Unterminated string literal.", line);
        i++; // closing quote
        tokens.push({ type: "STRING", value: buf, line });
        continue;
      }

      if (isAlphaCode(code)) {
        let start = i;
        while (i < n && isAlnumCode(src.charCodeAt(i))) i++;
        const word = src.slice(start, i);
        if (KEYWORDS.has(word)) {
          tokens.push({ type: word.toUpperCase(), value: word, line });
        } else {
          tokens.push({ type: "IDENT", value: word, line });
        }
        continue;
      }

      const two = src.slice(i, i + 2);
      if (["==", "!=", "<=", ">=", "&&", "||"].includes(two)) {
        tokens.push({ type: two, value: two, line });
        i += 2;
        continue;
      }

      if ("+-*/%(){}[],;=<>!.".includes(c)) {
        tokens.push({ type: c, value: c, line });
        i++;
        continue;
      }

      throw new BSError(`Unexpected character: '${c}'`, line);
    }

    tokens.push({ type: "EOF", value: null, line });
    return tokens;
  }

  /* ---------- Parser (recursive descent, unchanged semantics) ---------- */
  class Parser {
    constructor(tokens) { this.tokens = tokens; this.pos = 0; }
    peek() { return this.tokens[this.pos]; }
    prev() { return this.tokens[this.pos - 1]; }
    atEnd() { return this.peek().type === "EOF"; }
    check(type) { return this.peek().type === type; }
    advance() { if (!this.atEnd()) this.pos++; return this.prev(); }
    match(...types) {
      if (types.includes(this.peek().type)) return this.advance();
      return null;
    }
    expect(type, msg) {
      if (this.check(type)) return this.advance();
      const t = this.peek();
      throw new BSError(msg || `Expected '${type}', found '${t.value ?? t.type}'.`, t.line);
    }

    parseProgram() {
      const stmts = [];
      while (!this.atEnd()) stmts.push(this.statement());
      return { type: "Program", body: stmts };
    }

    block() {
      this.expect("{", "Expected '{'.");
      const stmts = [];
      while (!this.check("}") && !this.atEnd()) stmts.push(this.statement());
      this.expect("}", "Expected '}'.");
      return { type: "Block", body: stmts };
    }

    statement() {
      if (this.match("BRICK")) return this.brickDecl();
      if (this.match("SHOW")) return this.showStmt();
      if (this.match("IF")) return this.ifStmt();
      if (this.match("STACK")) return this.stackStmt();
      if (this.match("BLUEPRINT")) return this.blueprintDecl();
      if (this.match("RETURN")) return this.returnStmt();
      if (this.check("{")) return this.block();
      return this.exprOrAssignStmt();
    }

    brickDecl() {
      const line = this.prev().line;
      const name = this.expect("IDENT", "Expected variable name.").value;
      this.expect("=", "Expected '='.");
      const init = this.expression();
      this.expect(";", "Expected ';'.");
      return { type: "BrickDecl", name, init, line };
    }

    showStmt() {
      const line = this.prev().line;
      const expr = this.expression();
      this.expect(";", "Expected ';'.");
      return { type: "Show", expr, line };
    }

    ifStmt() {
      const line = this.prev().line;
      this.expect("(", "Expected '('.");
      const cond = this.expression();
      this.expect(")", "Expected ')'.");
      const thenBranch = this.block();
      let elseBranch = null;
      if (this.match("ELSE")) {
        elseBranch = this.check("IF") ? (this.advance(), this.ifStmt()) : this.block();
      }
      return { type: "If", cond, thenBranch, elseBranch, line };
    }

    stackStmt() {
      const line = this.prev().line;
      this.expect("(", "Expected '('.");
      const cond = this.expression();
      this.expect(")", "Expected ')'.");
      const body = this.block();
      return { type: "Stack", cond, body, line };
    }

    blueprintDecl() {
      const line = this.prev().line;
      const name = this.expect("IDENT", "Expected function name.").value;
      this.expect("(", "Expected '('.");
      const params = [];
      if (!this.check(")")) {
        do { params.push(this.expect("IDENT", "Expected parameter name.").value); }
        while (this.match(","));
      }
      this.expect(")", "Expected ')'.");
      const body = this.block();
      return { type: "BlueprintDecl", name, params, body, line };
    }

    returnStmt() {
      const line = this.prev().line;
      let value = null;
      if (!this.check(";")) value = this.expression();
      this.expect(";", "Expected ';'.");
      return { type: "Return", value, line };
    }

    exprOrAssignStmt() {
      const line = this.peek().line;
      const expr = this.expression();
      if (this.match("=")) {
        const value = this.expression();
        this.expect(";", "Expected ';'.");
        if (expr.type === "Ident") return { type: "Assign", name: expr.name, value, line };
        if (expr.type === "Index") return { type: "IndexAssign", target: expr.target, index: expr.index, value, line };
        throw new BSError("Cannot assign to this expression.", line);
      }
      this.expect(";", "Expected ';'.");
      return { type: "ExprStmt", expr, line };
    }

    expression() { return this.orExpr(); }

    orExpr() {
      let left = this.andExpr();
      while (this.match("||")) {
        const op = this.prev().value;
        const right = this.andExpr();
        left = { type: "Logical", op, left, right };
      }
      return left;
    }
    andExpr() {
      let left = this.equality();
      while (this.match("&&")) {
        const op = this.prev().value;
        const right = this.equality();
        left = { type: "Logical", op, left, right };
      }
      return left;
    }
    equality() {
      let left = this.relational();
      while (this.match("==", "!=")) {
        const op = this.prev().value;
        const right = this.relational();
        left = { type: "Binary", op, left, right };
      }
      return left;
    }
    relational() {
      let left = this.additive();
      while (this.match("<", ">", "<=", ">=")) {
        const op = this.prev().value;
        const right = this.additive();
        left = { type: "Binary", op, left, right };
      }
      return left;
    }
    additive() {
      let left = this.multiplicative();
      while (this.match("+", "-")) {
        const op = this.prev().value;
        const right = this.multiplicative();
        left = { type: "Binary", op, left, right };
      }
      return left;
    }
    multiplicative() {
      let left = this.unary();
      while (this.match("*", "/", "%")) {
        const op = this.prev().value;
        const right = this.unary();
        left = { type: "Binary", op, left, right };
      }
      return left;
    }
    unary() {
      if (this.match("!", "-")) {
        const op = this.prev().value;
        const right = this.unary();
        return { type: "Unary", op, right };
      }
      return this.callOrIndex();
    }
    callOrIndex() {
      let expr = this.primary();
      for (;;) {
        if (this.match("(")) {
          const args = [];
          if (!this.check(")")) {
            do { args.push(this.expression()); } while (this.match(","));
          }
          const line = this.expect(")", "Expected ')'.").line;
          expr = { type: "Call", callee: expr, args, line };
        } else if (this.match("[")) {
          const index = this.expression();
          this.expect("]", "Expected ']'.");
          expr = { type: "Index", target: expr, index };
        } else break;
      }
      return expr;
    }
    primary() {
      const t = this.peek();
      if (this.match("NUMBER")) return { type: "Number", value: this.prev().value };
      if (this.match("STRING")) return { type: "String", value: this.prev().value };
      if (this.match("TRUE")) return { type: "Bool", value: true };
      if (this.match("FALSE")) return { type: "Bool", value: false };
      if (this.match("IDENT")) return { type: "Ident", name: this.prev().value };
      if (this.match("(")) {
        const e = this.expression();
        this.expect(")", "Expected ')'.");
        return e;
      }
      if (this.match("[")) {
        const elements = [];
        if (!this.check("]")) {
          do { elements.push(this.expression()); } while (this.match(","));
        }
        this.expect("]", "Expected ']'.");
        return { type: "Array", elements };
      }
      throw new BSError(`Unexpected expression: '${t.value ?? t.type}'`, t.line);
    }
  }

  function parse(source) {
    return new Parser(tokenize(source)).parseProgram();
  }

  /* ---------- Runtime values ---------- */

  // Prototype-chain scopes: reading a variable is one native property
  // lookup that walks parent scopes automatically via the JS engine's
  // own (inline-cached) prototype mechanism, instead of a manual
  // while-loop over a chain of Map objects on every single read.
  class Environment {
    constructor(parent) {
      this.vars = Object.create(parent ? parent.vars : null);
      this.parent = parent || null;
    }
    define(name, value) {
      this.vars[name] = value === undefined ? null : value;
    }
    get(name, line) {
      const v = this.vars[name];
      if (v !== undefined) return v;
      throw new BSError(`Undefined variable: '${name}'`, line);
    }
    set(name, value, line) {
      let scope = this;
      while (scope) {
        if (Object.prototype.hasOwnProperty.call(scope.vars, name)) {
          scope.vars[name] = value;
          return;
        }
        scope = scope.parent;
      }
      throw new BSError(`Assignment to undefined variable: '${name}'`, line);
    }
  }

  // Ordinary return value (never thrown) — cheap to create, cheap to
  // check with `instanceof`, and doesn't defeat JIT inlining the way
  // throw/catch-based control flow can.
  class ReturnSignal {
    constructor(value) { this.value = value; }
  }

  class NativeFunction {
    constructor(name, fn) { this.name = name; this.fn = fn; }
    call(interp, args) {
      const result = this.fn(...args);
      return result === undefined ? null : result;
    }
  }

  class BSFunction {
    // bodyFn is the pre-compiled statement list for the blueprint body —
    // compiled once, at `blueprint` declaration time, not on every call.
    constructor(decl, closure, bodyFn) {
      this.decl = decl;
      this.closure = closure;
      this.bodyFn = bodyFn;
    }
    call(interp, args) {
      const env = new Environment(this.closure);
      const params = this.decl.params;
      for (let i = 0; i < params.length; i++) {
        env.define(params[i], args[i] !== undefined ? args[i] : null);
      }
      const sig = this.bodyFn(env);
      return sig instanceof ReturnSignal ? sig.value : null;
    }
  }

  function bsToString(v) {
    if (v === null || v === undefined) return "null";
    if (typeof v === "boolean") return v ? "true" : "false";
    if (Array.isArray(v)) return "[" + v.map(bsToString).join(", ") + "]";
    if (v instanceof BSFunction) return `<blueprint ${v.decl.name}>`;
    if (v instanceof NativeFunction) return `<native ${v.name}>`;
    return String(v);
  }
  function isTruthy(v) {
    if (v === null || v === undefined) return false;
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    if (typeof v === "string") return v.length > 0;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  }

  // Binary operators as a lookup table, resolved once per AST node at
  // compile time instead of via a switch statement on every evaluation.
  const BIN_OPS = {
    "+": (l, r) => (typeof l === "string" || typeof r === "string") ? bsToString(l) + bsToString(r) : l + r,
    "-": (l, r) => l - r,
    "*": (l, r) => l * r,
    "%": (l, r) => l % r,
    "==": (l, r) => l === r,
    "!=": (l, r) => l !== r,
    "<": (l, r) => l < r,
    ">": (l, r) => l > r,
    "<=": (l, r) => l <= r,
    ">=": (l, r) => l >= r,
  };

  /* ---------- Compiler: AST -> closures ---------- */
  class Interpreter {
    constructor(onShow, natives) {
      this.global = new Environment();
      this.onShow = onShow || (() => {});
      if (natives) {
        for (const name in natives) {
          this.global.define(name, new NativeFunction(name, natives[name]));
        }
      }
    }

    // Invoke an already-compiled BSFunction/NativeFunction value the same
    // way a `Call` node would — used by host code (e.g. a game's frame
    // loop) to re-invoke a stored blueprint every frame with no re-parse
    // and no re-compile, just closure calls.
    invoke(fnValue, args) {
      if (fnValue instanceof BSFunction || fnValue instanceof NativeFunction) {
        return fnValue.call(this, args);
      }
      return null;
    }

    run(ast) {
      const runFn = this.compileStmtList(ast.body);
      runFn(this.global);
    }

    // --- statement compilation ---

    compileStmtList(stmts) {
      const fns = stmts.map((s) => this.compileStmt(s));
      const len = fns.length;
      return (env) => {
        for (let i = 0; i < len; i++) {
          const sig = fns[i](env);
          if (sig !== undefined) return sig;
        }
        return undefined;
      };
    }

    compileStmt(stmt) {
      switch (stmt.type) {
        case "BrickDecl": {
          const initFn = this.compileExpr(stmt.init);
          const name = stmt.name;
          return (env) => { env.define(name, initFn(env)); return undefined; };
        }
        case "Assign": {
          const valueFn = this.compileExpr(stmt.value);
          const name = stmt.name, line = stmt.line;
          return (env) => { env.set(name, valueFn(env), line); return undefined; };
        }
        case "IndexAssign": {
          const targetFn = this.compileExpr(stmt.target);
          const indexFn = this.compileExpr(stmt.index);
          const valueFn = this.compileExpr(stmt.value);
          const line = stmt.line;
          return (env) => {
            const arr = targetFn(env);
            if (!Array.isArray(arr)) throw new BSError("Only arrays can be assigned to by index.", line);
            arr[indexFn(env)] = valueFn(env);
            return undefined;
          };
        }
        case "Show": {
          const exprFn = this.compileExpr(stmt.expr);
          return (env) => { this.onShow(bsToString(exprFn(env))); return undefined; };
        }
        case "If": {
          const condFn = this.compileExpr(stmt.cond);
          const thenFn = this.compileStmt(stmt.thenBranch);
          const elseFn = stmt.elseBranch ? this.compileStmt(stmt.elseBranch) : null;
          return (env) => {
            if (isTruthy(condFn(env))) return thenFn(env);
            if (elseFn) return elseFn(env);
            return undefined;
          };
        }
        case "Stack": {
          const condFn = this.compileExpr(stmt.cond);
          const bodyFn = this.compileStmt(stmt.body);
          const line = stmt.line;
          return (env) => {
            let guard = 0;
            while (isTruthy(condFn(env))) {
              const sig = bodyFn(env);
              if (sig !== undefined) return sig;
              if (++guard > 200000) throw new BSError("stack loop ran too long (possible infinite loop).", line);
            }
            return undefined;
          };
        }
        case "BlueprintDecl": {
          // Compiled ONCE here, at declaration time — every later call
          // just runs this closure, no matter how many frames it's
          // invoked over.
          const bodyFn = this.compileStmtList(stmt.body.body);
          const name = stmt.name;
          return (env) => { env.define(name, new BSFunction(stmt, env, bodyFn)); return undefined; };
        }
        case "Return": {
          const valueFn = stmt.value ? this.compileExpr(stmt.value) : null;
          return (env) => new ReturnSignal(valueFn ? valueFn(env) : null);
        }
        case "Block": {
          const bodyFn = this.compileStmtList(stmt.body);
          return (env) => bodyFn(new Environment(env));
        }
        case "ExprStmt": {
          const exprFn = this.compileExpr(stmt.expr);
          return (env) => { exprFn(env); return undefined; };
        }
        default:
          throw new BSError(`Unknown statement type: ${stmt.type}`, stmt.line);
      }
    }

    // --- expression compilation ---

    compileExpr(node) {
      switch (node.type) {
        case "Number": { const v = node.value; return () => v; }
        case "String": { const v = node.value; return () => v; }
        case "Bool": { const v = node.value; return () => v; }
        case "Array": {
          const elFns = node.elements.map((e) => this.compileExpr(e));
          return (env) => elFns.map((f) => f(env));
        }
        case "Ident": {
          const name = node.name, line = node.line;
          return (env) => env.get(name, line);
        }
        case "Index": {
          const targetFn = this.compileExpr(node.target);
          const indexFn = this.compileExpr(node.index);
          const line = node.line;
          return (env) => {
            const target = targetFn(env);
            if (!Array.isArray(target)) throw new BSError("Only arrays can be indexed.", line);
            const v = target[indexFn(env)];
            return v !== undefined ? v : null;
          };
        }
        case "Unary": {
          const rightFn = this.compileExpr(node.right);
          return node.op === "-" ? (env) => -rightFn(env) : (env) => !isTruthy(rightFn(env));
        }
        case "Logical": {
          const leftFn = this.compileExpr(node.left);
          const rightFn = this.compileExpr(node.right);
          return node.op === "&&"
            ? (env) => { const l = leftFn(env); return isTruthy(l) ? rightFn(env) : l; }
            : (env) => { const l = leftFn(env); return isTruthy(l) ? l : rightFn(env); };
        }
        case "Binary": {
          const leftFn = this.compileExpr(node.left);
          const rightFn = this.compileExpr(node.right);
          const line = node.left.line;
          if (node.op === "/") {
            return (env) => {
              const r = rightFn(env);
              if (r === 0) throw new BSError("Division by zero error.", line);
              return leftFn(env) / r;
            };
          }
          const op = BIN_OPS[node.op];
          return (env) => op(leftFn(env), rightFn(env));
        }
        case "Call": {
          const calleeFn = this.compileExpr(node.callee);
          const argFns = node.args.map((a) => this.compileExpr(a));
          const line = node.line;
          const calleeName = node.callee.type === "Ident" ? node.callee.name : "?";
          return (env) => {
            const callee = calleeFn(env);
            if (!(callee instanceof BSFunction) && !(callee instanceof NativeFunction)) {
              throw new BSError(`'${calleeName}' is not a blueprint (function).`, line);
            }
            const args = new Array(argFns.length);
            for (let i = 0; i < argFns.length; i++) args[i] = argFns[i](env);
            return callee.call(this, args);
          };
        }
        default:
          throw new BSError(`Unevaluable expression: ${node.type}`, node.line || 0);
      }
    }
  }

  const BrickScript = {
    tokenize, Parser, parse, Interpreter, Environment,
    BSFunction, NativeFunction, ReturnSignal, BSError, bsToString, isTruthy,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = BrickScript;
  }
  if (typeof global !== "undefined") {
    global.BrickScript = BrickScript;
  }
})(typeof window !== "undefined" ? window : globalThis);

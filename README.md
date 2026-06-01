# 🖥️ Compiler Phases Visualizer

An **interactive, browser-based tool** that walks you through all six classic phases of a compiler — from raw source code to assembly-like target code — in real time.

![Compiler Visualizer](https://img.shields.io/badge/Built%20With-Vanilla%20JS-f7df1e?style=flat-square&logo=javascript)
![No Dependencies](https://img.shields.io/badge/Dependencies-None-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## ✨ Features

- **6-Phase Pipeline** — Visualizes each compiler stage sequentially with live progress tracking
- **Interactive Code Editor** — Syntax-aware textarea with line numbers, tab support, and character/line counters
- **Built-in Presets** — Four ready-to-run example programs (arithmetic, if-else, while loop, full program)
- **Detailed Phase Output** — Rich, formatted output for every phase:
  - Color-coded token stream
  - Interactive AST tree view
  - Symbol table with scope/type/usage info
  - Three-Address Code (TAC) with syntax highlighting
  - Side-by-side before/after optimization view with stats
  - Assembly-like target code with register annotations
- **Error Reporting** — Inline error display with phase identification and line numbers
- **Zero Dependencies** — Pure HTML, CSS, and JavaScript; no build step required

---

## 🚀 Getting Started

Since this is a pure frontend project, just open the file in any modern browser:

```bash
# Clone the repository
git clone https://github.com/your-username/compiler-visualizer.git
cd compiler-visualizer

# Open directly in your browser
open index.html
```

Or serve it with any static file server:

```bash
# Python 3
python3 -m http.server 8080

# Node.js (npx)
npx serve .
```

Then navigate to `http://localhost:8080`.

---

## 🔬 Compilation Phases

| # | Phase | Description |
|---|-------|-------------|
| 1 | **Lexical Analysis** | Breaks source code into a stream of classified tokens |
| 2 | **Syntax Analysis** | Builds an Abstract Syntax Tree (AST) from the token stream |
| 3 | **Semantic Analysis** | Performs type checking, scope resolution, and builds a symbol table |
| 4 | **Intermediate Code Generation** | Produces Three-Address Code (TAC) from the AST |
| 5 | **Code Optimization** | Applies constant folding, dead code elimination, and copy propagation |
| 6 | **Target Code Generation** | Outputs assembly-like instructions with register allocation |

---

## 🗂️ Project Structure

```
compiler-visualizer/
├── index.html          # Main UI — layout, phase cards, editor
├── css/
│   └── style.css       # Full design system — dark theme, animations, layout
└── js/
    ├── lexer.js        # Phase 1: Tokenizer (Lexer class, TokenType)
    ├── parser.js       # Phase 2: Recursive-descent parser → AST
    ├── semantic.js     # Phase 3: SemanticAnalyzer — symbol table, type checks
    ├── icg.js          # Phase 4: ICGenerator — Three-Address Code generation
    ├── optimizer.js    # Phase 5: Optimizer — constant folding, dead code elim.
    ├── codegen.js      # Phase 6: CodeGenerator — register-based assembly output
    └── app.js          # App controller — UI orchestration, phase rendering
```

---

## 🧪 Supported Language

The visualizer accepts a **simplified C-like language** with the following features:

```c
// Variable declarations
int a = 10;
float b = 3.14;

// Arithmetic expressions
int c = a + b * 2;

// Relational operators: > < >= <= == !=
if (a > b) {
    print(a);
} else {
    print(b);
}

// While loops
int i = 5;
int sum = 0;
while (i > 0) {
    sum = sum + i;
    i = i - 1;
}
print(sum);
```

**Supported types:** `int`, `float`, `char`, `void`  
**Supported keywords:** `if`, `else`, `while`, `for`, `return`, `print`  
**Supported operators:** `+`, `-`, `*`, `/`, `%`, `=`, `==`, `!=`, `<`, `>`, `<=`, `>=`, `&&`, `||`, `++`, `--`  
**Comments:** `// line comments` and `/* block comments */`

---

## 🛠️ How It Works

1. **Write or select** code in the editor panel on the left.
2. **Click Compile** — the pipeline animates through all 6 phases sequentially.
3. **Click any phase card** to expand/collapse its detailed output.
4. **Errors halt** the pipeline at the failing phase and show inline diagnostics.

The pipeline is driven by `app.js`, which calls each module in order and passes results from one phase to the next:

```
Source Code
    → Lexer.tokenize()         → tokens[]
    → Parser.parse()           → AST
    → SemanticAnalyzer.analyze() → symbols, messages
    → ICGenerator.generate()   → TAC instructions[]
    → Optimizer.optimize()     → { original, optimized, stats }
    → CodeGenerator.generate() → assembly instructions[]
```

---

## 🎨 Design

- **Deep Space-Dark Glassmorphism** — Highly polished, dark theme (`#07070e` / `#0b0b16`) with multi-layered glow effects and glassmorphic panels
- **Interactive AST Visualizer** — Custom recursive tree structure utilizing linear-gradient connector lines and interactive micro-translations on hover
- **Rounded Token Badges** — Pill-style token displays with custom category border glow highlights
- **IDE-Like Outputs** — TAC, Assembly, and Optimization blocks designed to mimic premium developer environments, including line-level hover highlighters
- **Modern Typography** — **Inter** (UI) and **JetBrains Mono** (code editor) loaded dynamically via Google Fonts
- **Polished Controls** — Micro-animations on compiler triggers and custom drop-down selectors
- **Responsive Layout** — Split-screen view adjusting between vertical stack on mobile/tablet and side-by-side editor on desktop

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

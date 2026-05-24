// ===== APP CONTROLLER =====
// Orchestrates UI, phase execution, and rendering

const PRESETS = {
    arithmetic: `int a = 10;
int b = 20;
int c = a + b * 2;
print(c);`,
    ifelse: `int x = 15;
int y = 10;
if (x > y) {
    print(x);
} else {
    print(y);
}`,
    whileloop: `int i = 5;
int sum = 0;
while (i > 0) {
    sum = sum + i;
    i = i - 1;
}
print(sum);`,
    complex: `int a = 10;
int b = 20;
int c = a + b * 2;
if (c > 30) {
    print(c);
} else {
    print(0);
}
int i = 5;
int sum = 0;
while (i > 0) {
    sum = sum + i;
    i = i - 1;
}
print(sum);`
};

// DOM references
const codeEditor = document.getElementById('codeEditor');
const lineNumbers = document.getElementById('lineNumbers');
const btnCompile = document.getElementById('btnCompile');
const btnClear = document.getElementById('btnClear');
const presetSelect = document.getElementById('presetSelect');
const editorError = document.getElementById('editorError');
const pipelineBar = document.getElementById('pipelineBar');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const compileTimeEl = document.getElementById('compileTime');
const tokenCountEl = document.getElementById('tokenCount');
const lineCountEl = document.getElementById('lineCount');
const charCountEl = document.getElementById('charCount');

// ===== LINE NUMBERS =====
function updateLineNumbers() {
    const lines = codeEditor.value.split('\n').length;
    const nums = [];
    for (let i = 1; i <= Math.max(lines, 20); i++) nums.push(i);
    lineNumbers.textContent = nums.join('\n');
    lineCountEl.textContent = `Lines: ${lines}`;
    charCountEl.textContent = `Chars: ${codeEditor.value.length}`;
}

codeEditor.addEventListener('input', updateLineNumbers);
codeEditor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = codeEditor.scrollTop;
});

// Tab support
codeEditor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = codeEditor.selectionStart;
        const end = codeEditor.selectionEnd;
        codeEditor.value = codeEditor.value.substring(0, start) + '    ' + codeEditor.value.substring(end);
        codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
        updateLineNumbers();
    }
});

// ===== PRESETS =====
presetSelect.addEventListener('change', () => {
    const val = presetSelect.value;
    if (val && PRESETS[val]) {
        codeEditor.value = PRESETS[val];
        updateLineNumbers();
        clearPhases();
    }
});

// ===== CLEAR =====
btnClear.addEventListener('click', () => {
    codeEditor.value = '';
    presetSelect.value = '';
    updateLineNumbers();
    clearPhases();
    setStatus('ready', 'Ready');
    editorError.classList.remove('visible');
    compileTimeEl.textContent = '';
    tokenCountEl.textContent = '';
});

function clearPhases() {
    for (let i = 1; i <= 6; i++) {
        const card = document.getElementById(`phase${i}`);
        card.className = 'phase-card';
        document.getElementById(`phase${i}Status`).textContent = '';
        document.getElementById(`phase${i}Status`).className = 'phase-status';
        document.getElementById(`phase${i}Content`).innerHTML = '<p class="phase-placeholder">Click "Compile" to run...</p>';
    }
    pipelineBar.style.width = '0%';
}

// ===== STATUS =====
function setStatus(state, text) {
    statusIndicator.className = `status-indicator ${state}`;
    statusText.textContent = text;
}

// ===== PHASE TOGGLE =====
document.querySelectorAll('.phase-header').forEach(header => {
    header.addEventListener('click', () => {
        const card = header.closest('.phase-card');
        card.classList.toggle('expanded');
    });
});

// ===== COMPILE =====
btnCompile.addEventListener('click', () => compile());

async function compile() {
    const source = codeEditor.value.trim();
    if (!source) {
        setStatus('error', 'No code to compile');
        editorError.textContent = '⚠ Please enter some code first.';
        editorError.classList.add('visible');
        return;
    }
    editorError.classList.remove('visible');
    btnCompile.classList.add('compiling');
    clearPhases();

    const startTime = performance.now();
    setStatus('running', 'Compiling...');

    try {
        // Phase 1: Lexical Analysis
        await animatePhase(1);
        const lexer = new Lexer(source);
        const lexResult = lexer.tokenize();
        renderTokens(lexResult.tokens, lexResult.errors);
        if (lexResult.errors.length > 0) {
            completePhase(1, 'error');
            showEditorErrors(lexResult.errors);
            throw { phase: 1, errors: lexResult.errors };
        }
        completePhase(1, 'done');
        tokenCountEl.textContent = `Tokens: ${lexResult.tokens.length - 1}`;

        // Phase 2: Syntax Analysis
        await animatePhase(2);
        const parser = new Parser(lexResult.tokens);
        const parseResult = parser.parse();
        renderAST(parseResult.ast);
        if (parseResult.errors.length > 0) {
            completePhase(2, 'error');
            showEditorErrors(parseResult.errors);
            throw { phase: 2, errors: parseResult.errors };
        }
        completePhase(2, 'done');

        // Phase 3: Semantic Analysis
        await animatePhase(3);
        const semantic = new SemanticAnalyzer();
        const semResult = semantic.analyze(parseResult.ast);
        renderSemantic(semResult);
        const semErrors = semResult.messages.filter(m => m.type === 'error');
        completePhase(3, semErrors.length > 0 ? 'error' : 'done');
        if (semErrors.length > 0) {
            throw { phase: 3, errors: semErrors };
        }

        // Phase 4: Intermediate Code Generation
        await animatePhase(4);
        const icg = new ICGenerator();
        const tacCode = icg.generate(parseResult.ast);
        renderTAC(tacCode, 'phase4Content');
        completePhase(4, 'done');

        // Phase 5: Code Optimization
        await animatePhase(5);
        const optimizer = new Optimizer();
        const optResult = optimizer.optimize(tacCode);
        renderOptimization(optResult);
        completePhase(5, 'done');

        // Phase 6: Target Code Generation
        await animatePhase(6);
        const codegen = new CodeGenerator();
        const assembly = codegen.generate(optResult.optimized);
        renderAssembly(assembly);
        completePhase(6, 'done');

        const elapsed = (performance.now() - startTime).toFixed(1);
        compileTimeEl.textContent = `Compiled in ${elapsed}ms`;
        setStatus('ready', 'Compilation successful');

    } catch (err) {
        if (err.phase) {
            const elapsed = (performance.now() - startTime).toFixed(1);
            compileTimeEl.textContent = `Failed at Phase ${err.phase} (${elapsed}ms)`;
            setStatus('error', `Error in Phase ${err.phase}`);
        } else {
            console.error(err);
            setStatus('error', 'Unexpected error');
        }
    }

    btnCompile.classList.remove('compiling');
}

function animatePhase(n) {
    return new Promise(resolve => {
        const card = document.getElementById(`phase${n}`);
        card.classList.add('active');
        card.classList.add('expanded');
        const statusEl = document.getElementById(`phase${n}Status`);
        statusEl.textContent = 'Running...';
        statusEl.className = 'phase-status running';
        pipelineBar.style.width = `${((n - 1) / 6) * 100}%`;
        setTimeout(resolve, 300);
    });
}

function completePhase(n, status) {
    const card = document.getElementById(`phase${n}`);
    card.classList.remove('active');
    card.classList.add(status === 'done' ? 'completed' : 'error');
    const statusEl = document.getElementById(`phase${n}Status`);
    statusEl.textContent = status === 'done' ? '✓ Done' : '✗ Error';
    statusEl.className = `phase-status ${status === 'done' ? 'done' : 'failed'}`;
    pipelineBar.style.width = `${(n / 6) * 100}%`;
}

function showEditorErrors(errors) {
    const msgs = errors.map(e => `Line ${e.line || '?'}: ${e.message}`).join('\n');
    editorError.textContent = msgs;
    editorError.classList.add('visible');
}

// ===== RENDER: Phase 1 - Tokens =====
function renderTokens(tokens, errors) {
    const container = document.getElementById('phase1Content');
    const tokenEls = tokens
        .filter(t => t.type !== TokenType.EOF)
        .map(t => {
            const cls = getTokenClass(t.type);
            return `<span class="token-badge ${cls}" title="Line ${t.line}, Col ${t.col}">
                <span class="token-type">${t.type}</span>${escapeHtml(t.value)}</span>`;
        }).join('');

    let html = `<div class="token-stream fade-in">${tokenEls}</div>`;
    if (errors.length > 0) {
        html += `<div class="semantic-messages">${errors.map(e =>
            `<div class="semantic-msg error"><span class="msg-icon">✗</span>Line ${e.line}: ${escapeHtml(e.message)}</div>`
        ).join('')}</div>`;
    }
    container.innerHTML = html;
}

function getTokenClass(type) {
    switch (type) {
        case 'KEYWORD': return 'keyword';
        case 'TYPE': return 'type';
        case 'IDENTIFIER': return 'identifier';
        case 'NUMBER': case 'FLOAT': return 'number';
        case 'STRING': return 'string';
        case 'OPERATOR': case 'ASSIGN': case 'RELOP': return 'operator';
        default: return 'delimiter';
    }
}

// ===== RENDER: Phase 2 - AST =====
function renderAST(ast) {
    const container = document.getElementById('phase2Content');
    const html = `<div class="ast-container fade-in">${renderASTNode(ast)}</div>`;
    container.innerHTML = html;
}

function renderASTNode(node, depth = 0) {
    if (!node) return '';
    let label = node.type;
    let valueStr = '';

    switch (node.type) {
        case 'VarDecl': valueStr = `${node.varType} ${node.name}`; break;
        case 'Identifier': valueStr = node.name; break;
        case 'NumberLiteral': case 'FloatLiteral': valueStr = String(node.value); break;
        case 'StringLiteral': valueStr = node.value; break;
        case 'BinaryExpr': valueStr = node.operator; break;
        case 'UnaryExpr': valueStr = node.operator; break;
        case 'Assignment': valueStr = node.target ? node.target.name : ''; break;
    }

    let html = `<div class="ast-node">`;
    html += `<div class="ast-label"><span class="node-type">${label}</span>`;
    if (valueStr) html += ` <span class="node-value">${escapeHtml(valueStr)}</span>`;
    html += `</div>`;

    // Children
    const children = getASTChildren(node);
    for (const child of children) {
        html += renderASTNode(child, depth + 1);
    }
    html += `</div>`;
    return html;
}

function getASTChildren(node) {
    if (!node) return [];
    const kids = [];
    if (node.body && Array.isArray(node.body)) kids.push(...node.body);
    if (node.init) kids.push(node.init);
    if (node.expression) kids.push(node.expression);
    if (node.condition) kids.push(node.condition);
    if (node.consequent) kids.push(node.consequent);
    if (node.alternate) kids.push(node.alternate);
    if (node.value && typeof node.value === 'object') kids.push(node.value);
    if (node.left) kids.push(node.left);
    if (node.right) kids.push(node.right);
    if (node.operand) kids.push(node.operand);
    if (node.target && node.type === 'Assignment') {
        // already shown in label
    }
    return kids;
}

// ===== RENDER: Phase 3 - Semantic =====
function renderSemantic(result) {
    const container = document.getElementById('phase3Content');
    let html = '<div class="fade-in">';

    // Symbol table
    if (result.symbols.length > 0) {
        html += `<table class="symbol-table">
            <thead><tr><th>Name</th><th>Type</th><th>Scope</th><th>Line</th><th>Init</th><th>Used</th></tr></thead>
            <tbody>`;
        for (const sym of result.symbols) {
            html += `<tr>
                <td>${escapeHtml(sym.name)}</td>
                <td>${sym.type}</td>
                <td>${sym.scope}</td>
                <td>${sym.line}</td>
                <td>${sym.initialized ? '✓' : '✗'}</td>
                <td>${sym.used ? '✓' : '✗'}</td>
            </tr>`;
        }
        html += `</tbody></table>`;
    }

    // Messages
    if (result.messages.length > 0) {
        html += `<div class="semantic-messages">`;
        for (const msg of result.messages) {
            const icon = msg.type === 'error' ? '✗' : msg.type === 'warning' ? '⚠' : 'ℹ';
            html += `<div class="semantic-msg ${msg.type}"><span class="msg-icon">${icon}</span>${escapeHtml(msg.message)}</div>`;
        }
        html += `</div>`;
    }

    html += '</div>';
    container.innerHTML = html;
}

// ===== RENDER: Phase 4 - TAC =====
function renderTAC(instructions, containerId) {
    const container = document.getElementById(containerId);
    let html = '<div class="code-output fade-in">';
    let lineNum = 1;
    for (const instr of instructions) {
        const text = instr.toString();
        if (instr.comment) {
            html += `<div class="line"><span class="line-num"></span><span class="line-content comment">${escapeHtml(text)}</span></div>`;
        } else if (instr.label) {
            html += `<div class="line"><span class="line-num"></span><span class="line-content label">${escapeHtml(text)}</span></div>`;
        } else {
            html += `<div class="line"><span class="line-num">${lineNum++}</span><span class="line-content">${highlightTAC(text)}</span></div>`;
        }
    }
    html += '</div>';
    container.innerHTML = html;
}

function highlightTAC(text) {
    return escapeHtml(text)
        .replace(/\b(t\d+)\b/g, '<span class="register">$1</span>')
        .replace(/\b(iffalse|goto|print|return|decl)\b/g, '<span class="instruction">$1</span>')
        .replace(/\b(L\d+)\b/g, '<span class="label">$1</span>');
}

// ===== RENDER: Phase 5 - Optimization =====
function renderOptimization(result) {
    const container = document.getElementById('phase5Content');
    let html = '<div class="fade-in">';

    html += `<div class="opt-comparison">
        <div class="opt-section before">
            <h3>Before Optimization</h3>
            <div class="code-output">`;
    let ln = 1;
    for (const instr of result.original) {
        const text = instr.toString();
        if (instr.comment) {
            html += `<div class="line"><span class="line-num"></span><span class="line-content comment">${escapeHtml(text)}</span></div>`;
        } else if (instr.label) {
            html += `<div class="line"><span class="line-num"></span><span class="line-content label">${escapeHtml(text)}</span></div>`;
        } else {
            html += `<div class="line"><span class="line-num">${ln++}</span><span class="line-content">${highlightTAC(text)}</span></div>`;
        }
    }
    html += `</div></div>`;

    html += `<div class="opt-section after">
            <h3>After Optimization</h3>
            <div class="code-output">`;
    ln = 1;
    for (const instr of result.optimized) {
        const text = instr.toString();
        if (instr.comment) {
            html += `<div class="line"><span class="line-num"></span><span class="line-content comment">${escapeHtml(text)}</span></div>`;
        } else if (instr.label) {
            html += `<div class="line"><span class="line-num"></span><span class="line-content label">${escapeHtml(text)}</span></div>`;
        } else {
            html += `<div class="line"><span class="line-num">${ln++}</span><span class="line-content opt-added">${highlightTAC(text)}</span></div>`;
        }
    }
    html += `</div></div></div>`;

    // Stats
    html += `<div class="opt-stats">
        <div class="opt-stat">Constants folded: <span class="stat-value">${result.stats.constantFolded}</span></div>
        <div class="opt-stat">Dead code removed: <span class="stat-value">${result.stats.deadCodeRemoved}</span></div>
        <div class="opt-stat">Copies propagated: <span class="stat-value">${result.stats.copyPropagated}</span></div>
    </div>`;

    html += '</div>';
    container.innerHTML = html;
}

// ===== RENDER: Phase 6 - Assembly =====
function renderAssembly(instructions) {
    const container = document.getElementById('phase6Content');
    let html = '<div class="code-output fade-in">';
    let lineNum = 1;
    for (const instr of instructions) {
        if (instr.label) {
            html += `<div class="line"><span class="line-num"></span><span class="line-content label">${escapeHtml(instr.label)}:</span></div>`;
            continue;
        }
        if (instr.isDirective) {
            html += `<div class="line"><span class="line-num"></span><span class="line-content comment">    ${escapeHtml(instr.instr)} ${instr.args.join(', ')}</span></div>`;
            continue;
        }
        if (!instr.instr && instr.comment) {
            html += `<div class="line"><span class="line-num"></span><span class="line-content comment">    ; ${escapeHtml(instr.comment)}</span></div>`;
            continue;
        }
        if (!instr.instr && !instr.comment) {
            html += `<div class="line"><span class="line-num"></span><span class="line-content"></span></div>`;
            continue;
        }
        const argsStr = instr.args.map(a => {
            if (/^R\d+$/.test(a)) return `<span class="register">${a}</span>`;
            if (/^#/.test(a)) return `<span class="node-value">${escapeHtml(a)}</span>`;
            if (/^L\d+$/.test(a) || a === '_print') return `<span class="label">${escapeHtml(a)}</span>`;
            return escapeHtml(a);
        }).join(', ');
        const commentStr = instr.comment ? ` <span class="comment">; ${escapeHtml(instr.comment)}</span>` : '';
        html += `<div class="line"><span class="line-num">${lineNum++}</span><span class="line-content">    <span class="instruction">${escapeHtml(instr.instr)}</span> ${argsStr}${commentStr}</span></div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

// ===== UTILS =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== INIT =====
updateLineNumbers();
setStatus('ready', 'Ready');

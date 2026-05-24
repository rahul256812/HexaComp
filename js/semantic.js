// ===== SEMANTIC ANALYZER (Phase 3) =====
// Type checking, symbol table, scope resolution

class SemanticError {
    constructor(type, message, line) {
        this.type = type; // 'error', 'warning', 'info'
        this.message = message;
        this.line = line;
    }
}

class SymbolEntry {
    constructor(name, type, scope, line, initialized) {
        this.name = name;
        this.type = type;
        this.scope = scope;
        this.line = line;
        this.initialized = initialized;
        this.used = false;
    }
}

class SemanticAnalyzer {
    constructor() {
        this.symbols = [];
        this.messages = [];
        this.scopes = [{}]; // stack of scope maps
        this.scopeDepth = 0;
        this.scopeNames = ['global'];
    }

    currentScope() {
        return this.scopes[this.scopes.length - 1];
    }

    enterScope(name) {
        this.scopeDepth++;
        this.scopes.push({});
        this.scopeNames.push(name || `block_${this.scopeDepth}`);
    }

    exitScope() {
        const scope = this.scopes.pop();
        this.scopeNames.pop();
        this.scopeDepth--;
        // Check for unused variables in this scope
        for (const name in scope) {
            const sym = scope[name];
            if (!sym.used) {
                this.messages.push(new SemanticError('warning', `Variable '${name}' declared but never used`, sym.line));
            }
        }
    }

    declare(name, type, line, initialized) {
        const scope = this.currentScope();
        if (scope[name]) {
            this.messages.push(new SemanticError('error', `Variable '${name}' already declared in this scope`, line));
            return null;
        }
        const scopeName = this.scopeNames[this.scopeNames.length - 1];
        const entry = new SymbolEntry(name, type, scopeName, line, initialized);
        scope[name] = entry;
        this.symbols.push(entry);
        this.messages.push(new SemanticError('info', `Declared '${name}' as ${type} in scope '${scopeName}'`, line));
        return entry;
    }

    lookup(name) {
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            if (this.scopes[i][name]) return this.scopes[i][name];
        }
        return null;
    }

    analyze(ast) {
        this.symbols = [];
        this.messages = [];
        this.scopes = [{}];
        this.scopeDepth = 0;
        this.scopeNames = ['global'];

        if (ast.type === 'Program') {
            for (const stmt of ast.body) {
                this.analyzeNode(stmt);
            }
        }

        // Check for unused in global scope
        const globalScope = this.scopes[0];
        for (const name in globalScope) {
            const sym = globalScope[name];
            if (!sym.used) {
                this.messages.push(new SemanticError('warning', `Variable '${name}' declared but never used`, sym.line));
            }
        }

        return { symbols: this.symbols, messages: this.messages };
    }

    analyzeNode(node) {
        if (!node) return 'void';

        switch (node.type) {
            case 'VarDecl': return this.analyzeVarDecl(node);
            case 'Assignment': return this.analyzeAssignment(node);
            case 'ExprStatement': return this.analyzeNode(node.expression);
            case 'IfStatement': return this.analyzeIf(node);
            case 'WhileStatement': return this.analyzeWhile(node);
            case 'PrintStatement': return this.analyzePrint(node);
            case 'ReturnStatement': return this.analyzeReturn(node);
            case 'Block': return this.analyzeBlock(node);
            case 'BinaryExpr': return this.analyzeBinary(node);
            case 'UnaryExpr': return this.analyzeUnary(node);
            case 'NumberLiteral': return 'int';
            case 'FloatLiteral': return 'float';
            case 'StringLiteral': return 'string';
            case 'Identifier': return this.analyzeIdentifier(node);
            default: return 'void';
        }
    }

    analyzeVarDecl(node) {
        let initType = null;
        if (node.init) {
            initType = this.analyzeNode(node.init);
        }
        this.declare(node.name, node.varType, node.line, !!node.init);
        if (initType && initType !== node.varType && initType !== 'void') {
            if (node.varType === 'int' && initType === 'float') {
                this.messages.push(new SemanticError('warning', `Implicit conversion from float to int for '${node.name}'`, node.line));
            } else if (node.varType === 'float' && initType === 'int') {
                // int to float is fine
            } else {
                this.messages.push(new SemanticError('error', `Type mismatch: cannot assign ${initType} to ${node.varType} variable '${node.name}'`, node.line));
            }
        }
        return node.varType;
    }

    analyzeAssignment(node) {
        if (node.target.type !== 'Identifier') {
            this.messages.push(new SemanticError('error', 'Left side of assignment must be a variable', node.line));
            return 'void';
        }
        const sym = this.lookup(node.target.name);
        if (!sym) {
            this.messages.push(new SemanticError('error', `Undeclared variable '${node.target.name}'`, node.line));
            return 'void';
        }
        sym.initialized = true;
        const valType = this.analyzeNode(node.value);
        if (valType !== sym.type && valType !== 'void') {
            if (sym.type === 'int' && valType === 'float') {
                this.messages.push(new SemanticError('warning', `Implicit conversion from float to int in assignment to '${node.target.name}'`, node.line));
            }
        }
        return sym.type;
    }

    analyzeIdentifier(node) {
        const sym = this.lookup(node.name);
        if (!sym) {
            this.messages.push(new SemanticError('error', `Undeclared variable '${node.name}'`, node.line));
            return 'void';
        }
        sym.used = true;
        if (!sym.initialized) {
            this.messages.push(new SemanticError('warning', `Variable '${node.name}' may be used before initialization`, node.line));
        }
        return sym.type;
    }

    analyzeIf(node) {
        this.analyzeNode(node.condition);
        this.enterScope('if');
        if (node.consequent.type === 'Block') {
            for (const s of node.consequent.body) this.analyzeNode(s);
        } else {
            this.analyzeNode(node.consequent);
        }
        this.exitScope();
        if (node.alternate) {
            this.enterScope('else');
            if (node.alternate.type === 'Block') {
                for (const s of node.alternate.body) this.analyzeNode(s);
            } else {
                this.analyzeNode(node.alternate);
            }
            this.exitScope();
        }
        return 'void';
    }

    analyzeWhile(node) {
        this.analyzeNode(node.condition);
        this.enterScope('while');
        if (node.body.type === 'Block') {
            for (const s of node.body.body) this.analyzeNode(s);
        } else {
            this.analyzeNode(node.body);
        }
        this.exitScope();
        return 'void';
    }

    analyzePrint(node) {
        this.analyzeNode(node.expression);
        return 'void';
    }

    analyzeReturn(node) {
        if (node.expression) this.analyzeNode(node.expression);
        return 'void';
    }

    analyzeBlock(node) {
        this.enterScope('block');
        for (const s of node.body) this.analyzeNode(s);
        this.exitScope();
        return 'void';
    }

    analyzeBinary(node) {
        const leftType = this.analyzeNode(node.left);
        const rightType = this.analyzeNode(node.right);
        if (['<', '>', '<=', '>=', '==', '!=', '&&', '||'].includes(node.operator)) {
            return 'int'; // boolean as int
        }
        if (leftType === 'float' || rightType === 'float') return 'float';
        return 'int';
    }

    analyzeUnary(node) {
        return this.analyzeNode(node.operand);
    }
}

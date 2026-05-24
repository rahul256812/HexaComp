// ===== INTERMEDIATE CODE GENERATOR (Phase 4) =====
// Generates Three-Address Code (TAC) from AST

class TACInstruction {
    constructor(op, arg1, arg2, result, label, comment) {
        this.op = op;
        this.arg1 = arg1 || null;
        this.arg2 = arg2 || null;
        this.result = result || null;
        this.label = label || null;
        this.comment = comment || null;
    }

    toString() {
        if (this.label) return `${this.label}:`;
        if (this.comment) return `// ${this.comment}`;
        switch (this.op) {
            case 'assign': return `${this.result} = ${this.arg1}`;
            case 'add': return `${this.result} = ${this.arg1} + ${this.arg2}`;
            case 'sub': return `${this.result} = ${this.arg1} - ${this.arg2}`;
            case 'mul': return `${this.result} = ${this.arg1} * ${this.arg2}`;
            case 'div': return `${this.result} = ${this.arg1} / ${this.arg2}`;
            case 'mod': return `${this.result} = ${this.arg1} % ${this.arg2}`;
            case 'neg': return `${this.result} = -${this.arg1}`;
            case 'not': return `${this.result} = !${this.arg1}`;
            case 'lt': return `${this.result} = ${this.arg1} < ${this.arg2}`;
            case 'gt': return `${this.result} = ${this.arg1} > ${this.arg2}`;
            case 'le': return `${this.result} = ${this.arg1} <= ${this.arg2}`;
            case 'ge': return `${this.result} = ${this.arg1} >= ${this.arg2}`;
            case 'eq': return `${this.result} = ${this.arg1} == ${this.arg2}`;
            case 'ne': return `${this.result} = ${this.arg1} != ${this.arg2}`;
            case 'and': return `${this.result} = ${this.arg1} && ${this.arg2}`;
            case 'or': return `${this.result} = ${this.arg1} || ${this.arg2}`;
            case 'iffalse': return `iffalse ${this.arg1} goto ${this.result}`;
            case 'goto': return `goto ${this.result}`;
            case 'print': return `print ${this.arg1}`;
            case 'return': return this.arg1 ? `return ${this.arg1}` : 'return';
            case 'decl': return `decl ${this.result} : ${this.arg1}`;
            default: return `${this.op} ${this.arg1 || ''} ${this.arg2 || ''} ${this.result || ''}`.trim();
        }
    }
}

class ICGenerator {
    constructor() {
        this.instructions = [];
        this.tempCount = 0;
        this.labelCount = 0;
    }

    newTemp() { return `t${this.tempCount++}`; }
    newLabel() { return `L${this.labelCount++}`; }

    addInstr(op, arg1, arg2, result) {
        const instr = new TACInstruction(op, arg1, arg2, result);
        this.instructions.push(instr);
        return instr;
    }

    addLabel(label) {
        this.instructions.push(new TACInstruction(null, null, null, null, label));
    }

    addComment(text) {
        this.instructions.push(new TACInstruction(null, null, null, null, null, text));
    }

    generate(ast) {
        this.instructions = [];
        this.tempCount = 0;
        this.labelCount = 0;

        if (ast.type === 'Program') {
            for (const stmt of ast.body) {
                this.genStatement(stmt);
            }
        }
        return this.instructions;
    }

    genStatement(node) {
        if (!node) return;
        switch (node.type) {
            case 'VarDecl': this.genVarDecl(node); break;
            case 'ExprStatement': this.genExpr(node.expression); break;
            case 'Assignment': this.genAssignment(node); break;
            case 'IfStatement': this.genIf(node); break;
            case 'WhileStatement': this.genWhile(node); break;
            case 'PrintStatement': this.genPrint(node); break;
            case 'ReturnStatement': this.genReturn(node); break;
            case 'Block':
                for (const s of node.body) this.genStatement(s);
                break;
        }
    }

    genVarDecl(node) {
        this.addComment(`declare ${node.varType} ${node.name}`);
        this.addInstr('decl', node.varType, null, node.name);
        if (node.init) {
            const val = this.genExpr(node.init);
            this.addInstr('assign', val, null, node.name);
        }
    }

    genAssignment(node) {
        const val = this.genExpr(node.value);
        const target = node.target.name;
        this.addInstr('assign', val, null, target);
        return target;
    }

    genIf(node) {
        this.addComment('if statement');
        const cond = this.genExpr(node.condition);
        const labelElse = this.newLabel();
        const labelEnd = this.newLabel();

        this.addInstr('iffalse', cond, null, labelElse);

        // Then branch
        if (node.consequent.type === 'Block') {
            for (const s of node.consequent.body) this.genStatement(s);
        } else {
            this.genStatement(node.consequent);
        }

        if (node.alternate) {
            this.addInstr('goto', null, null, labelEnd);
        }

        this.addLabel(labelElse);

        if (node.alternate) {
            if (node.alternate.type === 'Block') {
                for (const s of node.alternate.body) this.genStatement(s);
            } else {
                this.genStatement(node.alternate);
            }
            this.addLabel(labelEnd);
        }
    }

    genWhile(node) {
        this.addComment('while loop');
        const labelStart = this.newLabel();
        const labelEnd = this.newLabel();

        this.addLabel(labelStart);
        const cond = this.genExpr(node.condition);
        this.addInstr('iffalse', cond, null, labelEnd);

        if (node.body.type === 'Block') {
            for (const s of node.body.body) this.genStatement(s);
        } else {
            this.genStatement(node.body);
        }

        this.addInstr('goto', null, null, labelStart);
        this.addLabel(labelEnd);
    }

    genPrint(node) {
        const val = this.genExpr(node.expression);
        this.addInstr('print', val);
    }

    genReturn(node) {
        if (node.expression) {
            const val = this.genExpr(node.expression);
            this.addInstr('return', val);
        } else {
            this.addInstr('return');
        }
    }

    genExpr(node) {
        if (!node) return '0';
        switch (node.type) {
            case 'NumberLiteral':
            case 'FloatLiteral':
                return node.raw || String(node.value);
            case 'StringLiteral':
                return node.value;
            case 'Identifier':
                return node.name;
            case 'Assignment':
                return this.genAssignment(node);
            case 'BinaryExpr':
                return this.genBinary(node);
            case 'UnaryExpr':
                return this.genUnary(node);
            default:
                return '0';
        }
    }

    genBinary(node) {
        const left = this.genExpr(node.left);
        const right = this.genExpr(node.right);
        const temp = this.newTemp();
        const opMap = {
            '+': 'add', '-': 'sub', '*': 'mul', '/': 'div', '%': 'mod',
            '<': 'lt', '>': 'gt', '<=': 'le', '>=': 'ge',
            '==': 'eq', '!=': 'ne', '&&': 'and', '||': 'or'
        };
        const op = opMap[node.operator] || node.operator;
        this.addInstr(op, left, right, temp);
        return temp;
    }

    genUnary(node) {
        const operand = this.genExpr(node.operand);
        const temp = this.newTemp();
        const op = node.operator === '-' ? 'neg' : 'not';
        this.addInstr(op, operand, null, temp);
        return temp;
    }
}

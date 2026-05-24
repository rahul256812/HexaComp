// ===== TARGET CODE GENERATOR (Phase 6) =====
// Generates pseudo-assembly from optimized TAC

class CodeGenerator {
    constructor() {
        this.output = [];
        this.registers = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'];
        this.regMap = {};      // variable -> register
        this.regUsage = {};    // register -> variable
        this.nextReg = 0;
        this.memVars = {};     // variable -> memory location
        this.memOffset = 0;
    }

    allocReg(varName) {
        // Already in a register?
        if (this.regMap[varName]) return this.regMap[varName];

        // Find a free register
        if (this.nextReg < this.registers.length) {
            const reg = this.registers[this.nextReg++];
            this.regMap[varName] = reg;
            this.regUsage[reg] = varName;
            return reg;
        }

        // Spill: reuse the oldest register
        const spillReg = this.registers[this.nextReg % this.registers.length];
        const spillVar = this.regUsage[spillReg];
        if (spillVar) {
            this.memVars[spillVar] = `[${spillVar}]`;
            this.output.push({ instr: 'STORE', args: [spillReg, `[${spillVar}]`], comment: `spill ${spillVar}` });
            delete this.regMap[spillVar];
        }
        this.regMap[varName] = spillReg;
        this.regUsage[spillReg] = varName;
        this.nextReg++;
        return spillReg;
    }

    getOperand(val) {
        if (val === null || val === undefined) return '#0';
        // Is it a number literal?
        if (/^-?\d+(\.\d+)?$/.test(String(val))) return `#${val}`;
        // Is it in a register?
        if (this.regMap[val]) return this.regMap[val];
        // Is it in memory?
        if (this.memVars[val]) {
            const reg = this.allocReg(val);
            this.output.push({ instr: 'LOAD', args: [reg, `[${val}]`], comment: `load ${val}` });
            return reg;
        }
        // Treat as variable — allocate register
        return this.allocReg(val);
    }

    generate(instructions) {
        this.output = [];
        this.regMap = {};
        this.regUsage = {};
        this.nextReg = 0;
        this.memVars = {};

        this.output.push({ instr: '.CODE', args: [], comment: 'Program start', isDirective: true });
        this.output.push({ instr: '', args: [], comment: '' });

        for (const tac of instructions) {
            if (tac.comment) {
                this.output.push({ instr: '', args: [], comment: tac.comment });
                continue;
            }
            if (tac.label) {
                this.output.push({ label: tac.label });
                continue;
            }

            switch (tac.op) {
                case 'decl': this.genDecl(tac); break;
                case 'assign': this.genAssign(tac); break;
                case 'add': case 'sub': case 'mul': case 'div': case 'mod':
                    this.genArith(tac); break;
                case 'neg': this.genNeg(tac); break;
                case 'lt': case 'gt': case 'le': case 'ge': case 'eq': case 'ne':
                    this.genCompare(tac); break;
                case 'iffalse': this.genIfFalse(tac); break;
                case 'goto': this.genGoto(tac); break;
                case 'print': this.genPrint(tac); break;
                case 'return': this.genReturn(tac); break;
            }
        }

        this.output.push({ instr: '', args: [], comment: '' });
        this.output.push({ instr: 'HALT', args: [], comment: 'Program end' });

        return this.output;
    }

    genDecl(tac) {
        // Declare: allocate memory/register
        this.output.push({ instr: '; DECL', args: [tac.result, tac.arg1], comment: `${tac.arg1} ${tac.result}`, isDirective: true });
    }

    genAssign(tac) {
        const src = this.getOperand(tac.arg1);
        const dst = this.allocReg(tac.result);
        this.output.push({ instr: 'MOV', args: [dst, src], comment: `${tac.result} = ${tac.arg1}` });
    }

    genArith(tac) {
        const src1 = this.getOperand(tac.arg1);
        const src2 = this.getOperand(tac.arg2);
        const dst = this.allocReg(tac.result);
        const instrMap = { add: 'ADD', sub: 'SUB', mul: 'MUL', div: 'DIV', mod: 'MOD' };
        // Move first operand to destination if needed
        if (dst !== src1) {
            this.output.push({ instr: 'MOV', args: [dst, src1], comment: '' });
        }
        this.output.push({ instr: instrMap[tac.op], args: [dst, src2], comment: `${tac.result} = ${tac.arg1} ${tac.op} ${tac.arg2}` });
    }

    genNeg(tac) {
        const src = this.getOperand(tac.arg1);
        const dst = this.allocReg(tac.result);
        this.output.push({ instr: 'MOV', args: [dst, src], comment: '' });
        this.output.push({ instr: 'NEG', args: [dst], comment: `${tac.result} = -${tac.arg1}` });
    }

    genCompare(tac) {
        const src1 = this.getOperand(tac.arg1);
        const src2 = this.getOperand(tac.arg2);
        const dst = this.allocReg(tac.result);
        this.output.push({ instr: 'CMP', args: [src1, src2], comment: `compare ${tac.arg1}, ${tac.arg2}` });
        const condMap = { lt: 'SETL', gt: 'SETG', le: 'SETLE', ge: 'SETGE', eq: 'SETE', ne: 'SETNE' };
        this.output.push({ instr: condMap[tac.op], args: [dst], comment: `${tac.result} = ${tac.arg1} ${tac.op} ${tac.arg2}` });
    }

    genIfFalse(tac) {
        const src = this.getOperand(tac.arg1);
        this.output.push({ instr: 'CMP', args: [src, '#0'], comment: `test ${tac.arg1}` });
        this.output.push({ instr: 'JZ', args: [tac.result], comment: `jump if false to ${tac.result}` });
    }

    genGoto(tac) {
        this.output.push({ instr: 'JMP', args: [tac.result], comment: `goto ${tac.result}` });
    }

    genPrint(tac) {
        const src = this.getOperand(tac.arg1);
        this.output.push({ instr: 'PUSH', args: [src], comment: `arg: ${tac.arg1}` });
        this.output.push({ instr: 'CALL', args: ['_print'], comment: 'print()' });
    }

    genReturn(tac) {
        if (tac.arg1) {
            const src = this.getOperand(tac.arg1);
            this.output.push({ instr: 'MOV', args: ['R0', src], comment: `return value: ${tac.arg1}` });
        }
        this.output.push({ instr: 'RET', args: [], comment: 'return' });
    }
}

// ===== CODE OPTIMIZER (Phase 5) =====
// Constant folding, dead code elimination, copy propagation

class Optimizer {
    constructor() {
        this.stats = { constantFolded: 0, deadCodeRemoved: 0, copyPropagated: 0 };
    }

    optimize(instructions) {
        this.stats = { constantFolded: 0, deadCodeRemoved: 0, copyPropagated: 0 };
        let code = instructions.map(i => this.cloneInstr(i));

        // Multiple passes
        code = this.constantFolding(code);
        code = this.copyPropagation(code);
        code = this.deadCodeElimination(code);

        return { optimized: code, stats: { ...this.stats }, original: instructions };
    }

    cloneInstr(instr) {
        return new TACInstruction(instr.op, instr.arg1, instr.arg2, instr.result, instr.label, instr.comment);
    }

    isNumber(val) {
        if (val === null || val === undefined) return false;
        return /^-?\d+(\.\d+)?$/.test(String(val));
    }

    evaluate(op, a, b) {
        const na = parseFloat(a);
        const nb = parseFloat(b);
        switch (op) {
            case 'add': return String(na + nb);
            case 'sub': return String(na - nb);
            case 'mul': return String(na * nb);
            case 'div': return nb !== 0 ? String(Math.trunc(na / nb)) : null;
            case 'mod': return nb !== 0 ? String(na % nb) : null;
            case 'lt': return na < nb ? '1' : '0';
            case 'gt': return na > nb ? '1' : '0';
            case 'le': return na <= nb ? '1' : '0';
            case 'ge': return na >= nb ? '1' : '0';
            case 'eq': return na === nb ? '1' : '0';
            case 'ne': return na !== nb ? '1' : '0';
            default: return null;
        }
    }

    constantFolding(code) {
        const result = [];
        for (const instr of code) {
            if (instr.label || instr.comment) { result.push(instr); continue; }

            // Binary ops with two constants
            if (['add', 'sub', 'mul', 'div', 'mod', 'lt', 'gt', 'le', 'ge', 'eq', 'ne'].includes(instr.op)) {
                if (this.isNumber(instr.arg1) && this.isNumber(instr.arg2)) {
                    const val = this.evaluate(instr.op, instr.arg1, instr.arg2);
                    if (val !== null) {
                        this.stats.constantFolded++;
                        result.push(new TACInstruction('assign', val, null, instr.result));
                        continue;
                    }
                }
            }

            // Unary with constant
            if (instr.op === 'neg' && this.isNumber(instr.arg1)) {
                this.stats.constantFolded++;
                result.push(new TACInstruction('assign', String(-parseFloat(instr.arg1)), null, instr.result));
                continue;
            }

            // Identity operations: x + 0, x * 1, x - 0
            if (instr.op === 'add' && instr.arg2 === '0') {
                this.stats.constantFolded++;
                result.push(new TACInstruction('assign', instr.arg1, null, instr.result));
                continue;
            }
            if (instr.op === 'add' && instr.arg1 === '0') {
                this.stats.constantFolded++;
                result.push(new TACInstruction('assign', instr.arg2, null, instr.result));
                continue;
            }
            if (instr.op === 'mul' && (instr.arg2 === '1')) {
                this.stats.constantFolded++;
                result.push(new TACInstruction('assign', instr.arg1, null, instr.result));
                continue;
            }
            if (instr.op === 'mul' && (instr.arg1 === '1')) {
                this.stats.constantFolded++;
                result.push(new TACInstruction('assign', instr.arg2, null, instr.result));
                continue;
            }
            if (instr.op === 'mul' && (instr.arg1 === '0' || instr.arg2 === '0')) {
                this.stats.constantFolded++;
                result.push(new TACInstruction('assign', '0', null, instr.result));
                continue;
            }

            result.push(instr);
        }
        return result;
    }

    copyPropagation(code) {
        // Simple copy propagation: if t1 = x, replace subsequent uses of t1 with x
        const copies = {}; // temp -> value
        const result = [];

        for (const instr of code) {
            if (instr.label || instr.comment) {
                result.push(instr);
                // Labels invalidate copies (control flow merge)
                if (instr.label) Object.keys(copies).forEach(k => delete copies[k]);
                continue;
            }

            // Clone and propagate
            const newInstr = this.cloneInstr(instr);

            // Replace args with propagated values
            if (newInstr.arg1 && copies[newInstr.arg1]) {
                newInstr.arg1 = copies[newInstr.arg1];
                this.stats.copyPropagated++;
            }
            if (newInstr.arg2 && copies[newInstr.arg2]) {
                newInstr.arg2 = copies[newInstr.arg2];
                this.stats.copyPropagated++;
            }

            // Track copies: result = arg1 (simple assign of temp)
            if (newInstr.op === 'assign' && newInstr.result && newInstr.result.startsWith('t')) {
                copies[newInstr.result] = newInstr.arg1;
            }

            // If result is overwritten, invalidate
            if (newInstr.result && !newInstr.result.startsWith('t')) {
                // Invalidate any copy that references this variable
                for (const k in copies) {
                    if (copies[k] === newInstr.result) delete copies[k];
                }
            }

            result.push(newInstr);
        }
        return result;
    }

    deadCodeElimination(code) {
        // Find used temporaries
        const usedVars = new Set();
        const labelTargets = new Set();

        // First pass: find all used variables and label targets
        for (const instr of code) {
            if (instr.op === 'iffalse' || instr.op === 'goto') {
                labelTargets.add(instr.result);
            }
            if (instr.arg1 && typeof instr.arg1 === 'string') usedVars.add(instr.arg1);
            if (instr.arg2 && typeof instr.arg2 === 'string') usedVars.add(instr.arg2);
            if (instr.op === 'print' || instr.op === 'return' || instr.op === 'iffalse') {
                if (instr.arg1) usedVars.add(instr.arg1);
            }
        }

        // Second pass: remove dead temp assignments
        const result = [];
        for (const instr of code) {
            if (instr.label || instr.comment) { result.push(instr); continue; }

            // Keep if result is a user variable (not temp) or if temp is used
            if (instr.result && instr.result.startsWith('t') && !usedVars.has(instr.result)) {
                if (!['print', 'return', 'iffalse', 'goto', 'decl'].includes(instr.op)) {
                    this.stats.deadCodeRemoved++;
                    continue; // Remove dead code
                }
            }
            result.push(instr);
        }
        return result;
    }
}

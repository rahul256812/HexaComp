// ===== SYNTAX ANALYZER (Phase 2) =====
// Recursive descent parser that builds an AST

class ParseError extends Error {
    constructor(message, token) {
        super(message);
        this.name = 'ParseError';
        this.token = token;
        this.line = token ? token.line : 0;
        this.col = token ? token.col : 0;
    }
}

// AST Node types
class ASTNode {
    constructor(type, props = {}) {
        this.type = type;
        Object.assign(this, props);
    }
}

class Parser {
    constructor(tokens) {
        this.tokens = tokens.filter(t => t.type !== TokenType.EOF);
        this.tokens.push(new Token(TokenType.EOF, 'EOF', 0, 0));
        this.pos = 0;
        this.errors = [];
    }

    peek() { return this.tokens[this.pos]; }

    advance() {
        const tok = this.tokens[this.pos];
        if (this.pos < this.tokens.length - 1) this.pos++;
        return tok;
    }

    expect(type, value) {
        const tok = this.peek();
        if (tok.type === type && (value === undefined || tok.value === value)) {
            return this.advance();
        }
        const expected = value ? `'${value}'` : type;
        throw new ParseError(`Expected ${expected} but got '${tok.value}' (${tok.type})`, tok);
    }

    match(type, value) {
        const tok = this.peek();
        if (tok.type === type && (value === undefined || tok.value === value)) {
            this.advance();
            return true;
        }
        return false;
    }

    parse() {
        const statements = [];
        this.errors = [];
        try {
            while (this.peek().type !== TokenType.EOF) {
                try {
                    statements.push(this.parseStatement());
                } catch (e) {
                    if (e instanceof ParseError) {
                        this.errors.push(e);
                        // Recovery: skip to next semicolon or brace
                        while (this.peek().type !== TokenType.EOF &&
                               this.peek().type !== TokenType.SEMICOLON &&
                               this.peek().type !== TokenType.RBRACE) {
                            this.advance();
                        }
                        if (this.peek().type === TokenType.SEMICOLON) this.advance();
                    } else {
                        throw e;
                    }
                }
            }
        } catch (e) {
            if (e instanceof ParseError) this.errors.push(e);
            else throw e;
        }
        return { ast: new ASTNode('Program', { body: statements }), errors: this.errors };
    }

    parseStatement() {
        const tok = this.peek();

        // Variable declaration: int x = 5;
        if (tok.type === TokenType.TYPE) {
            return this.parseVarDecl();
        }
        // If statement
        if (tok.type === TokenType.KEYWORD && tok.value === 'if') {
            return this.parseIfStatement();
        }
        // While loop
        if (tok.type === TokenType.KEYWORD && tok.value === 'while') {
            return this.parseWhileStatement();
        }
        // Print statement
        if (tok.type === TokenType.KEYWORD && tok.value === 'print') {
            return this.parsePrintStatement();
        }
        // Return statement
        if (tok.type === TokenType.KEYWORD && tok.value === 'return') {
            return this.parseReturnStatement();
        }
        // Block
        if (tok.type === TokenType.LBRACE) {
            return this.parseBlock();
        }
        // Expression statement (assignment or expression)
        return this.parseExpressionStatement();
    }

    parseVarDecl() {
        const typeTok = this.expect(TokenType.TYPE);
        const nameTok = this.expect(TokenType.IDENTIFIER);
        let init = null;
        if (this.match(TokenType.ASSIGN)) {
            init = this.parseExpression();
        }
        this.expect(TokenType.SEMICOLON);
        return new ASTNode('VarDecl', {
            varType: typeTok.value,
            name: nameTok.value,
            init: init,
            line: typeTok.line
        });
    }

    parseIfStatement() {
        const tok = this.expect(TokenType.KEYWORD, 'if');
        this.expect(TokenType.LPAREN);
        const condition = this.parseExpression();
        this.expect(TokenType.RPAREN);
        const consequent = this.parseBlockOrStatement();
        let alternate = null;
        if (this.peek().type === TokenType.KEYWORD && this.peek().value === 'else') {
            this.advance();
            alternate = this.parseBlockOrStatement();
        }
        return new ASTNode('IfStatement', { condition, consequent, alternate, line: tok.line });
    }

    parseWhileStatement() {
        const tok = this.expect(TokenType.KEYWORD, 'while');
        this.expect(TokenType.LPAREN);
        const condition = this.parseExpression();
        this.expect(TokenType.RPAREN);
        const body = this.parseBlockOrStatement();
        return new ASTNode('WhileStatement', { condition, body, line: tok.line });
    }

    parsePrintStatement() {
        const tok = this.expect(TokenType.KEYWORD, 'print');
        this.expect(TokenType.LPAREN);
        const expr = this.parseExpression();
        this.expect(TokenType.RPAREN);
        this.expect(TokenType.SEMICOLON);
        return new ASTNode('PrintStatement', { expression: expr, line: tok.line });
    }

    parseReturnStatement() {
        const tok = this.expect(TokenType.KEYWORD, 'return');
        let expr = null;
        if (this.peek().type !== TokenType.SEMICOLON) {
            expr = this.parseExpression();
        }
        this.expect(TokenType.SEMICOLON);
        return new ASTNode('ReturnStatement', { expression: expr, line: tok.line });
    }

    parseBlock() {
        this.expect(TokenType.LBRACE);
        const stmts = [];
        while (this.peek().type !== TokenType.RBRACE && this.peek().type !== TokenType.EOF) {
            stmts.push(this.parseStatement());
        }
        this.expect(TokenType.RBRACE);
        return new ASTNode('Block', { body: stmts });
    }

    parseBlockOrStatement() {
        if (this.peek().type === TokenType.LBRACE) return this.parseBlock();
        return this.parseStatement();
    }

    parseExpressionStatement() {
        const expr = this.parseAssignment();
        this.expect(TokenType.SEMICOLON);
        return new ASTNode('ExprStatement', { expression: expr });
    }

    parseAssignment() {
        const left = this.parseOr();
        if (this.peek().type === TokenType.ASSIGN) {
            this.advance();
            const right = this.parseAssignment();
            return new ASTNode('Assignment', { target: left, value: right, line: left.line || 0 });
        }
        return left;
    }

    parseExpression() {
        return this.parseAssignment();
    }

    parseOr() {
        let left = this.parseAnd();
        while (this.peek().type === TokenType.RELOP && this.peek().value === '||') {
            const op = this.advance().value;
            const right = this.parseAnd();
            left = new ASTNode('BinaryExpr', { operator: op, left, right });
        }
        return left;
    }

    parseAnd() {
        let left = this.parseEquality();
        while (this.peek().type === TokenType.RELOP && this.peek().value === '&&') {
            const op = this.advance().value;
            const right = this.parseEquality();
            left = new ASTNode('BinaryExpr', { operator: op, left, right });
        }
        return left;
    }

    parseEquality() {
        let left = this.parseComparison();
        while (this.peek().type === TokenType.RELOP && ['==', '!='].includes(this.peek().value)) {
            const op = this.advance().value;
            const right = this.parseComparison();
            left = new ASTNode('BinaryExpr', { operator: op, left, right });
        }
        return left;
    }

    parseComparison() {
        let left = this.parseAdditive();
        while (this.peek().type === TokenType.RELOP && ['<', '>', '<=', '>='].includes(this.peek().value)) {
            const op = this.advance().value;
            const right = this.parseAdditive();
            left = new ASTNode('BinaryExpr', { operator: op, left, right });
        }
        return left;
    }

    parseAdditive() {
        let left = this.parseMultiplicative();
        while (this.peek().type === TokenType.OPERATOR && ['+', '-'].includes(this.peek().value)) {
            const op = this.advance().value;
            const right = this.parseMultiplicative();
            left = new ASTNode('BinaryExpr', { operator: op, left, right });
        }
        return left;
    }

    parseMultiplicative() {
        let left = this.parseUnary();
        while (this.peek().type === TokenType.OPERATOR && ['*', '/', '%'].includes(this.peek().value)) {
            const op = this.advance().value;
            const right = this.parseUnary();
            left = new ASTNode('BinaryExpr', { operator: op, left, right });
        }
        return left;
    }

    parseUnary() {
        if (this.peek().type === TokenType.OPERATOR && ['-', '!'].includes(this.peek().value)) {
            const op = this.advance().value;
            const operand = this.parseUnary();
            return new ASTNode('UnaryExpr', { operator: op, operand });
        }
        return this.parsePrimary();
    }

    parsePrimary() {
        const tok = this.peek();

        if (tok.type === TokenType.NUMBER) {
            this.advance();
            return new ASTNode('NumberLiteral', { value: parseInt(tok.value), raw: tok.value, line: tok.line });
        }
        if (tok.type === TokenType.FLOAT_LIT) {
            this.advance();
            return new ASTNode('FloatLiteral', { value: parseFloat(tok.value), raw: tok.value, line: tok.line });
        }
        if (tok.type === TokenType.STRING) {
            this.advance();
            return new ASTNode('StringLiteral', { value: tok.value, line: tok.line });
        }
        if (tok.type === TokenType.IDENTIFIER) {
            this.advance();
            return new ASTNode('Identifier', { name: tok.value, line: tok.line });
        }
        if (tok.type === TokenType.LPAREN) {
            this.advance();
            const expr = this.parseExpression();
            this.expect(TokenType.RPAREN);
            return expr;
        }

        throw new ParseError(`Unexpected token '${tok.value}'`, tok);
    }
}

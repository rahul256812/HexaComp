// ===== LEXICAL ANALYZER (Phase 1) =====
// Tokenizer for a simplified C-like language

const TokenType = {
    KEYWORD:    'KEYWORD',
    TYPE:       'TYPE',
    IDENTIFIER: 'IDENTIFIER',
    NUMBER:     'NUMBER',
    FLOAT_LIT:  'FLOAT',
    STRING:     'STRING',
    OPERATOR:   'OPERATOR',
    ASSIGN:     'ASSIGN',
    RELOP:      'RELOP',
    DELIMITER:  'DELIMITER',
    LPAREN:     'LPAREN',
    RPAREN:     'RPAREN',
    LBRACE:     'LBRACE',
    RBRACE:     'RBRACE',
    SEMICOLON:  'SEMICOLON',
    EOF:        'EOF',
};

const KEYWORDS = new Set(['if', 'else', 'while', 'for', 'return', 'print']);
const TYPES = new Set(['int', 'float', 'char', 'void']);

class Token {
    constructor(type, value, line, col) {
        this.type = type;
        this.value = value;
        this.line = line;
        this.col = col;
    }
}

class LexerError extends Error {
    constructor(message, line, col) {
        super(message);
        this.name = 'LexerError';
        this.line = line;
        this.col = col;
    }
}

class Lexer {
    constructor(source) {
        this.source = source;
        this.pos = 0;
        this.line = 1;
        this.col = 1;
        this.tokens = [];
        this.errors = [];
    }

    peek() {
        return this.pos < this.source.length ? this.source[this.pos] : null;
    }

    advance() {
        const ch = this.source[this.pos];
        this.pos++;
        if (ch === '\n') { this.line++; this.col = 1; } else { this.col++; }
        return ch;
    }

    skipWhitespace() {
        while (this.pos < this.source.length && /\s/.test(this.source[this.pos])) {
            this.advance();
        }
    }

    skipLineComment() {
        while (this.pos < this.source.length && this.source[this.pos] !== '\n') {
            this.advance();
        }
    }

    skipBlockComment() {
        this.advance(); // skip *
        while (this.pos < this.source.length) {
            if (this.source[this.pos] === '*' && this.pos + 1 < this.source.length && this.source[this.pos + 1] === '/') {
                this.advance(); this.advance();
                return;
            }
            this.advance();
        }
        this.errors.push(new LexerError('Unterminated block comment', this.line, this.col));
    }

    readNumber() {
        const startCol = this.col;
        let num = '';
        let isFloat = false;
        while (this.pos < this.source.length && /[0-9]/.test(this.source[this.pos])) {
            num += this.advance();
        }
        if (this.pos < this.source.length && this.source[this.pos] === '.' && this.pos + 1 < this.source.length && /[0-9]/.test(this.source[this.pos + 1])) {
            isFloat = true;
            num += this.advance(); // dot
            while (this.pos < this.source.length && /[0-9]/.test(this.source[this.pos])) {
                num += this.advance();
            }
        }
        return new Token(isFloat ? TokenType.FLOAT_LIT : TokenType.NUMBER, num, this.line, startCol);
    }

    readIdentifier() {
        const startCol = this.col;
        let id = '';
        while (this.pos < this.source.length && /[a-zA-Z0-9_]/.test(this.source[this.pos])) {
            id += this.advance();
        }
        let type = TokenType.IDENTIFIER;
        if (KEYWORDS.has(id)) type = TokenType.KEYWORD;
        else if (TYPES.has(id)) type = TokenType.TYPE;
        return new Token(type, id, this.line, startCol);
    }

    readString() {
        const startCol = this.col;
        const quote = this.advance();
        let str = '';
        while (this.pos < this.source.length && this.source[this.pos] !== quote) {
            if (this.source[this.pos] === '\\') {
                this.advance();
                if (this.pos < this.source.length) str += this.advance();
            } else {
                str += this.advance();
            }
        }
        if (this.pos < this.source.length) {
            this.advance(); // closing quote
        } else {
            this.errors.push(new LexerError('Unterminated string', this.line, startCol));
        }
        return new Token(TokenType.STRING, quote + str + quote, this.line, startCol);
    }

    tokenize() {
        this.tokens = [];
        this.errors = [];
        this.pos = 0;
        this.line = 1;
        this.col = 1;

        while (this.pos < this.source.length) {
            this.skipWhitespace();
            if (this.pos >= this.source.length) break;

            const ch = this.source[this.pos];
            const startLine = this.line;
            const startCol = this.col;

            // Comments
            if (ch === '/' && this.pos + 1 < this.source.length) {
                if (this.source[this.pos + 1] === '/') { this.advance(); this.advance(); this.skipLineComment(); continue; }
                if (this.source[this.pos + 1] === '*') { this.advance(); this.skipBlockComment(); continue; }
            }

            // Numbers
            if (/[0-9]/.test(ch)) { this.tokens.push(this.readNumber()); continue; }

            // Identifiers / Keywords
            if (/[a-zA-Z_]/.test(ch)) { this.tokens.push(this.readIdentifier()); continue; }

            // Strings
            if (ch === '"' || ch === "'") { this.tokens.push(this.readString()); continue; }

            // Two-char operators
            if (this.pos + 1 < this.source.length) {
                const two = ch + this.source[this.pos + 1];
                if (['==', '!=', '<=', '>=', '&&', '||', '++', '--'].includes(two)) {
                    this.advance(); this.advance();
                    this.tokens.push(new Token(TokenType.RELOP, two, startLine, startCol));
                    continue;
                }
            }

            // Single char tokens
            this.advance();
            switch (ch) {
                case '(': this.tokens.push(new Token(TokenType.LPAREN, ch, startLine, startCol)); break;
                case ')': this.tokens.push(new Token(TokenType.RPAREN, ch, startLine, startCol)); break;
                case '{': this.tokens.push(new Token(TokenType.LBRACE, ch, startLine, startCol)); break;
                case '}': this.tokens.push(new Token(TokenType.RBRACE, ch, startLine, startCol)); break;
                case ';': this.tokens.push(new Token(TokenType.SEMICOLON, ch, startLine, startCol)); break;
                case ',': this.tokens.push(new Token(TokenType.DELIMITER, ch, startLine, startCol)); break;
                case '=': this.tokens.push(new Token(TokenType.ASSIGN, ch, startLine, startCol)); break;
                case '+': case '-': case '*': case '/': case '%':
                    this.tokens.push(new Token(TokenType.OPERATOR, ch, startLine, startCol)); break;
                case '<': case '>':
                    this.tokens.push(new Token(TokenType.RELOP, ch, startLine, startCol)); break;
                case '!':
                    this.tokens.push(new Token(TokenType.OPERATOR, ch, startLine, startCol)); break;
                default:
                    this.errors.push(new LexerError(`Unexpected character '${ch}'`, startLine, startCol));
            }
        }

        this.tokens.push(new Token(TokenType.EOF, 'EOF', this.line, this.col));
        return { tokens: this.tokens, errors: this.errors };
    }
}

/**
 * Configured page-expression parse + evaluate. The original ParaShape
 * engine used jsep + arrow/object/ternary plugins; this is a same-surface
 * recursive-descent stand-in so the parked runtime does not import a
 * missing package. Throws on parse/eval failure — callers apply the value
 * law (literal fallback) or the event-compile path.
 */
import type { Expression } from "./types.js"

type TokenType =
    | "Identifier"
    | "String"
    | "Number"
    | "Punct"
    | "=>"
    | "&&"
    | "||"
    | "==="
    | "!=="
    | "=="
    | "!="
    | "<="
    | ">="
    | "EOF"

type Token = { type: TokenType; value: string }

const TWO_CHAR = new Set(["&&", "||", "==", "!=", "<=", ">=", "=>"])
const THREE_CHAR = new Set(["===", "!=="])

function tokenize(source: string): Token[] {
    const tokens: Token[] = []
    let index = 0
    const peek = (offset = 0) => source[index + offset] ?? ""
    while (index < source.length) {
        const char = source[index]
        if (char <= " ") { index++; continue }
        if (char === "'" || char === "\"") {
            const quote = char
            let value = ""
            index++
            while (index < source.length && source[index] !== quote) {
                if (source[index] === "\\") {
                    index++
                    const escaped = source[index] ?? ""
                    value += escaped === "n" ? "\n" : escaped === "t" ? "\t" : escaped
                    index++
                } else {
                    value += source[index]
                    index++
                }
            }
            if (source[index] !== quote) throw new Error("Unterminated string")
            index++
            tokens.push({ type: "String", value })
            continue
        }
        if (char >= "0" && char <= "9") {
            let value = ""
            while ((source[index] >= "0" && source[index] <= "9") || source[index] === ".") {
                value += source[index]
                index++
            }
            tokens.push({ type: "Number", value })
            continue
        }
        if (/[A-Za-z_$]/.test(char)) {
            let value = ""
            while (index < source.length && /[A-Za-z0-9_$]/.test(source[index])) {
                value += source[index]
                index++
            }
            tokens.push({ type: "Identifier", value })
            continue
        }
        const three = source.slice(index, index + 3)
        if (THREE_CHAR.has(three)) {
            tokens.push({ type: three as TokenType, value: three })
            index += 3
            continue
        }
        const two = source.slice(index, index + 2)
        if (TWO_CHAR.has(two)) {
            tokens.push({ type: two as TokenType, value: two })
            index += 2
            continue
        }
        tokens.push({ type: "Punct", value: char })
        index++
    }
    tokens.push({ type: "EOF", value: "" })
    return tokens
}

class Parser {
    private index = 0
    constructor(private readonly tokens: Token[]) {}

    parse(): Expression {
        const expression = this.parseExpression()
        if (!this.check("EOF")) throw new Error(`Unexpected token ${this.current().value}`)
        return expression
    }

    private current(): Token { return this.tokens[this.index] }
    private check(type: TokenType, value?: string): boolean {
        const token = this.current()
        return token.type === type && (value === undefined || token.value === value)
    }
    private take(): Token { return this.tokens[this.index++] }
    private expectPunct(value: string): void {
        if (!this.check("Punct", value)) throw new Error(`Expected "${value}"`)
        this.take()
    }

    private parseExpression(): Expression {
        const arrow = this.tryParseArrow()
        return arrow ?? this.parseTernary()
    }

    private tryParseArrow(): Expression | null {
        const saved = this.index
        if (this.check("Identifier") && this.tokens[this.index + 1]?.type === "=>") {
            const name = this.take().value
            this.take()
            return {
                type: "ArrowFunctionExpression",
                params: [{ type: "Identifier", name }],
                body: this.parseExpression(),
            }
        }
        if (this.check("Punct", "(")) {
            this.take()
            const params: { type: "Identifier"; name: string }[] = []
            let isParams = true
            if (!this.check("Punct", ")")) {
                if (this.check("Identifier")) {
                    params.push({ type: "Identifier", name: this.take().value })
                    while (this.check("Punct", ",")) {
                        this.take()
                        if (!this.check("Identifier")) { isParams = false; break }
                        params.push({ type: "Identifier", name: this.take().value })
                    }
                } else {
                    isParams = false
                }
            }
            if (isParams && this.check("Punct", ")")) {
                this.take()
                if (this.check("=>")) {
                    this.take()
                    return { type: "ArrowFunctionExpression", params, body: this.parseExpression() }
                }
            }
        }
        this.index = saved
        return null
    }

    private parseTernary(): Expression {
        const test = this.parseLogicalOr()
        if (!this.check("Punct", "?")) return test
        this.take()
        const consequent = this.parseExpression()
        this.expectPunct(":")
        return { type: "ConditionalExpression", test, consequent, alternate: this.parseExpression() }
    }

    private parseLogicalOr(): Expression {
        let left = this.parseLogicalAnd()
        while (this.check("||")) {
            this.take()
            left = { type: "LogicalExpression", operator: "||", left, right: this.parseLogicalAnd() }
        }
        return left
    }

    private parseLogicalAnd(): Expression {
        let left = this.parseEquality()
        while (this.check("&&")) {
            this.take()
            left = { type: "LogicalExpression", operator: "&&", left, right: this.parseEquality() }
        }
        return left
    }

    private parseEquality(): Expression {
        let left = this.parseRelational()
        while (this.check("===") || this.check("!==") || this.check("==") || this.check("!=")) {
            const operator = this.take().value
            left = { type: "BinaryExpression", operator, left, right: this.parseRelational() }
        }
        return left
    }

    private parseRelational(): Expression {
        let left = this.parseAdditive()
        while (this.check("<=") || this.check(">=") || this.check("Punct", "<") || this.check("Punct", ">")) {
            const operator = this.take().value
            left = { type: "BinaryExpression", operator, left, right: this.parseAdditive() }
        }
        return left
    }

    private parseAdditive(): Expression {
        let left = this.parseMultiplicative()
        while (this.check("Punct", "+") || this.check("Punct", "-")) {
            const operator = this.take().value
            left = { type: "BinaryExpression", operator, left, right: this.parseMultiplicative() }
        }
        return left
    }

    private parseMultiplicative(): Expression {
        let left = this.parseUnary()
        while (this.check("Punct", "*") || this.check("Punct", "/") || this.check("Punct", "%")) {
            const operator = this.take().value
            left = { type: "BinaryExpression", operator, left, right: this.parseUnary() }
        }
        return left
    }

    private parseUnary(): Expression {
        if (this.check("Punct", "!") || this.check("Punct", "-") || this.check("Punct", "+")) {
            const operator = this.take().value
            return { type: "UnaryExpression", operator, argument: this.parseUnary() }
        }
        return this.parsePostfix()
    }

    private parsePostfix(): Expression {
        let expression = this.parsePrimary()
        for (;;) {
            if (this.check("Punct", ".")) {
                this.take()
                if (!this.check("Identifier")) throw new Error("Expected property name")
                expression = {
                    type: "MemberExpression",
                    computed: false,
                    object: expression,
                    property: { type: "Identifier", name: this.take().value },
                }
            } else if (this.check("Punct", "[")) {
                this.take()
                const property = this.parseExpression()
                this.expectPunct("]")
                expression = { type: "MemberExpression", computed: true, object: expression, property }
            } else if (this.check("Punct", "(")) {
                this.take()
                const args: Expression[] = []
                if (!this.check("Punct", ")")) {
                    args.push(this.parseExpression())
                    while (this.check("Punct", ",")) {
                        this.take()
                        args.push(this.parseExpression())
                    }
                }
                this.expectPunct(")")
                expression = { type: "CallExpression", callee: expression, arguments: args }
            } else {
                break
            }
        }
        return expression
    }

    private parsePrimary(): Expression {
        if (this.check("Number")) return { type: "Literal", value: Number(this.take().value) }
        if (this.check("String")) return { type: "Literal", value: this.take().value }
        if (this.check("Identifier")) {
            const name = this.take().value
            if (name === "true") return { type: "Literal", value: true }
            if (name === "false") return { type: "Literal", value: false }
            if (name === "null") return { type: "Literal", value: null }
            return { type: "Identifier", name }
        }
        if (this.check("Punct", "[")) {
            this.take()
            const elements: Expression[] = []
            if (!this.check("Punct", "]")) {
                elements.push(this.parseExpression())
                while (this.check("Punct", ",")) {
                    this.take()
                    if (this.check("Punct", "]")) break
                    elements.push(this.parseExpression())
                }
            }
            this.expectPunct("]")
            return { type: "ArrayExpression", elements }
        }
        if (this.check("Punct", "{")) {
            this.take()
            const properties: { key: Expression; value: Expression }[] = []
            while (!this.check("Punct", "}") && !this.check("EOF")) {
                let key: Expression
                if (this.check("Identifier")) key = { type: "Identifier", name: this.take().value }
                else if (this.check("String")) key = { type: "Literal", value: this.take().value }
                else throw new Error("Expected object key")
                this.expectPunct(":")
                properties.push({ key, value: this.parseExpression() })
                if (this.check("Punct", ",")) this.take()
                else break
            }
            this.expectPunct("}")
            return { type: "ObjectExpression", properties }
        }
        if (this.check("Punct", "(")) {
            this.take()
            const expression = this.parseExpression()
            this.expectPunct(")")
            return expression
        }
        throw new Error(`Unexpected token ${this.current().value}`)
    }
}

export function parse(source: string): Expression {
    return new Parser(tokenize(source)).parse()
}

const BLOCKED_NAMES = new Set(["__proto__", "constructor", "prototype"])

export function evaluate(
    ast: Expression,
    context: Record<string, unknown>,
    namespaces?: Record<string, unknown>,
): unknown {
    switch (ast.type) {
        case "Literal":
            return ast.value
        case "Identifier": {
            const name = String(ast.name)
            if (BLOCKED_NAMES.has(name)) throw new Error(`Unknown identifier: ${name}`)
            if (name in context) return context[name]
            if (namespaces && name in namespaces) return namespaces[name]
            throw new Error(`Unknown identifier: ${name}`)
        }
        case "MemberExpression": {
            const object = evaluate(ast.object as Expression, context, namespaces)
            const key = ast.computed
                ? evaluate(ast.property as Expression, context, namespaces)
                : String((ast.property as { name: string }).name)
            if (object == null) return undefined
            return (object as Record<PropertyKey, unknown>)[key as PropertyKey]
        }
        case "CallExpression": {
            const calleeAst = ast.callee as Expression
            let thisArgument: unknown
            let fn: unknown
            if (calleeAst.type === "MemberExpression") {
                thisArgument = evaluate(calleeAst.object as Expression, context, namespaces)
                const key = calleeAst.computed
                    ? evaluate(calleeAst.property as Expression, context, namespaces)
                    : String((calleeAst.property as { name: string }).name)
                fn = thisArgument == null ? undefined : (thisArgument as Record<PropertyKey, unknown>)[key as PropertyKey]
            } else {
                fn = evaluate(calleeAst, context, namespaces)
            }
            if (typeof fn !== "function") throw new Error("Not a function")
            const args = (ast.arguments as Expression[]).map(argument => evaluate(argument, context, namespaces))
            return (fn as (...values: unknown[]) => unknown).apply(thisArgument, args)
        }
        case "ArrayExpression":
            return (ast.elements as Expression[]).map(element => evaluate(element, context, namespaces))
        case "ObjectExpression": {
            const out: Record<string, unknown> = {}
            for (const property of ast.properties as { key: Expression; value: Expression }[]) {
                const key = property.key.type === "Identifier"
                    ? String(property.key.name)
                    : String(evaluate(property.key, context, namespaces))
                out[key] = evaluate(property.value, context, namespaces)
            }
            return out
        }
        case "ArrowFunctionExpression": {
            const params = (ast.params as { name: string }[]).map(param => param.name)
            return (...args: unknown[]) => {
                const local = Object.create(context) as Record<string, unknown>
                params.forEach((name, index) => { local[name] = args[index] })
                return evaluate(ast.body as Expression, local, namespaces)
            }
        }
        case "UnaryExpression": {
            const argument = evaluate(ast.argument as Expression, context, namespaces)
            if (ast.operator === "!") return !argument
            if (ast.operator === "-") return -(argument as number)
            if (ast.operator === "+") return +(argument as number)
            throw new Error(`Unknown unary ${String(ast.operator)}`)
        }
        case "BinaryExpression": {
            const left = evaluate(ast.left as Expression, context, namespaces)
            const right = evaluate(ast.right as Expression, context, namespaces)
            switch (ast.operator) {
                case "+": return (left as number) + (right as number)
                case "-": return (left as number) - (right as number)
                case "*": return (left as number) * (right as number)
                case "/": return (left as number) / (right as number)
                case "%": return (left as number) % (right as number)
                case "==": return left == right
                case "!=": return left != right
                case "===": return left === right
                case "!==": return left !== right
                case "<": return (left as number) < (right as number)
                case ">": return (left as number) > (right as number)
                case "<=": return (left as number) <= (right as number)
                case ">=": return (left as number) >= (right as number)
                default: throw new Error(`Unknown binary ${String(ast.operator)}`)
            }
        }
        case "LogicalExpression": {
            const left = evaluate(ast.left as Expression, context, namespaces)
            if (ast.operator === "&&") return left ? evaluate(ast.right as Expression, context, namespaces) : left
            if (ast.operator === "||") return left ? left : evaluate(ast.right as Expression, context, namespaces)
            throw new Error(`Unknown logical ${String(ast.operator)}`)
        }
        case "ConditionalExpression":
            return evaluate(ast.test as Expression, context, namespaces)
                ? evaluate(ast.consequent as Expression, context, namespaces)
                : evaluate(ast.alternate as Expression, context, namespaces)
        default:
            throw new Error(`Unknown AST type: ${ast.type}`)
    }
}

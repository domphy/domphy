/**
 * Minimal Model / ParameterNode surface for pageParamBridge. The real
 * classes live in ParaShape; this package is parked out of that repo, so
 * the listener/collection contract is reproduced here.
 */

type Release = () => void

export class ParameterNode {
    constructor(
        public key: string,
        public method: string,
        public input: string,
    ) {}

    private readonly listeners = new Set<() => void>()

    addListener(_event: string, fn: () => void): Release {
        this.listeners.add(fn)
        return () => { this.listeners.delete(fn) }
    }

    setInput(input: string): void {
        this.input = input
        for (const listener of this.listeners) listener()
    }
}

class NodeCollection {
    private items: unknown[] = []
    private readonly listeners = new Set<() => void>()

    add(node: unknown): void {
        this.items.push(node)
        for (const listener of this.listeners) listener()
    }

    remove(node: unknown): void {
        this.items = this.items.filter(item => item !== node)
        for (const listener of this.listeners) listener()
    }

    keyedNodes(): Iterable<{ node: unknown }> {
        return this.items.map(node => ({ node }))
    }

    addListener(_event: string, fn: () => void): Release {
        this.listeners.add(fn)
        return () => { this.listeners.delete(fn) }
    }
}

export class Model {
    readonly nodes = new NodeCollection()
    constructor(public key: string) {}
    evaluate(): void {}
}

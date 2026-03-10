export function stringify(value: any, indent = 0): string {
  const pad = '  '.repeat(indent)
  const inner = '  '.repeat(indent + 1)

  if (typeof value === 'function') {
    const lines = value.toString().split('\n')
    return lines
      .map((line: string, i: number) => i === 0 ? line : pad + line.trimStart())
      .join('\n')
  }

  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return `"${value}"`
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    const items = value.map((v: any) => `${inner}${stringify(v, indent + 1)}`).join(',\n')
    return `[\n${items}\n${pad}]`
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value)
    if (keys.length === 0) return '{}'
    const items = keys.map(k => {
      const v = stringify(value[k], indent + 1)
      return `${inner}"${k}": ${v}`
    }).join(',\n')
    return `{\n${items}\n${pad}}`
  }

  return String(value)
}
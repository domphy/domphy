import { transform } from 'sucrase'

export function transformCode(code: string): string {
  let result = transform(code, {
    transforms: ['typescript'],
  }).code

  result = result.replace(/import\s+type\s+.*from\s+['"][^'"]+['"]\n?/g, '')
  result = result.replace(
    /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g,
    (_, imports, pkg) => `const {${imports}} = __modules__['${pkg}']`
  )
  result = result.replace(
    /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
    (_, name, pkg) => `const ${name} = __modules__['${pkg}'].default ?? __modules__['${pkg}']`
  )
  result = result.replace(/export\s+default\s+/, 'return ')

  return result
}
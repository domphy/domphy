import { transform } from "sucrase";

/**
 * Converts an ES-module named-import specifier list into an object
 * destructuring pattern: the module-only rename syntax `a as b` becomes
 * `a: b`, and an empty/whitespace list (sucrase leaves `import page, { } from`
 * behind after stripping type-only specifiers) yields an empty string so the
 * caller can skip emitting a broken `const { } = ...`.
 */
function namedImportsToDestructuring(imports: string): string {
  return imports.replace(/(\w+)\s+as\s+(\w+)/g, "$1: $2").trim();
}

export function transformCode(code: string): string {
  let result = transform(code, {
    transforms: ["typescript"],
  }).code;

  result = result.replace(/import\s+type\s+.*from\s+['"][^'"]+['"]\n?/g, "");
  result = result.replace(
    /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
    (_, name, pkg) => `const ${name} = __modules__['${pkg}']`,
  );
  // Mixed default + named import (`import page, { a, b as c } from "pkg"`).
  // Must run before the named-only and default-only patterns below.
  result = result.replace(
    /import\s+(\w+)\s*,\s*\{([^}]*)\}\s*from\s+['"]([^'"]+)['"]/g,
    (_, name, imports, pkg) => {
      const parts = [
        `const ${name} = __modules__['${pkg}'].default ?? __modules__['${pkg}']`,
      ];
      const named = namedImportsToDestructuring(imports);
      if (named) parts.push(`const { ${named} } = __modules__['${pkg}']`);
      return parts.join(";\n");
    },
  );
  result = result.replace(
    /import\s+\{([^}]*)\}\s+from\s+['"]([^'"]+)['"]/g,
    (_, imports, pkg) => {
      const named = namedImportsToDestructuring(imports);
      return named ? `const { ${named} } = __modules__['${pkg}']` : "";
    },
  );
  result = result.replace(
    /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
    (_, name, pkg) =>
      `const ${name} = __modules__['${pkg}'].default ?? __modules__['${pkg}']`,
  );
  result = result.replace(/export\s+default\s+/, "return ");

  return result;
}

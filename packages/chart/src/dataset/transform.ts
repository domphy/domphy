import type { DatasetOption, TransformOption } from "../types.js";

type Row = Record<string, any> | any[];

function getField(row: Row, dim: string | number): any {
  if (Array.isArray(row)) return row[Number(dim)];
  return (row as Record<string, any>)[String(dim)];
}

function applyFilter(source: Row[], config: Record<string, any>): Row[] {
  const dimension = config.dimension;
  const value = config.value;
  const gte = config[">="];
  const lte = config["<="];
  const gt = config[">"];
  const lt = config["<"];
  const eq = config["="];
  const ne = config["!="];
  const inside = config.range;
  const outside = config.outside;
  const method = config.method ?? "AND";

  return source.filter((row) => {
    const v = getField(row, dimension ?? 0);
    const checks: boolean[] = [];
    if (eq !== undefined) checks.push(v === eq);
    if (ne !== undefined) checks.push(v !== ne);
    if (gte !== undefined) checks.push(v >= gte);
    if (lte !== undefined) checks.push(v <= lte);
    if (gt !== undefined) checks.push(v > gt);
    if (lt !== undefined) checks.push(v < lt);
    if (inside !== undefined) checks.push(v >= inside[0] && v <= inside[1]);
    if (outside !== undefined) checks.push(v < outside[0] || v > outside[1]);
    if (checks.length === 0) return true;
    return method === "OR" ? checks.some(Boolean) : checks.every(Boolean);
  });
}

function applySort(source: Row[], config: Record<string, any>): Row[] {
  const dimension = config.dimension ?? 0;
  const order = config.order ?? "asc";
  const parser = config.parser;

  return [...source].sort((a, b) => {
    let va = getField(a, dimension);
    let vb = getField(b, dimension);
    if (parser === "time") { va = new Date(va).getTime(); vb = new Date(vb).getTime(); }
    if (va < vb) return order === "asc" ? -1 : 1;
    if (va > vb) return order === "asc" ? 1 : -1;
    return 0;
  });
}

export function applyTransforms(source: Row[], transforms: TransformOption[]): Row[] {
  let result = source;
  for (const transform of transforms) {
    const config = transform.config ?? {};
    if (transform.type === "filter") {
      result = applyFilter(result, config);
    } else if (transform.type === "sort") {
      result = applySort(result, config);
    }
    // Unknown transforms pass through
  }
  return result;
}

export function resolveDataset(dataset: DatasetOption): Row[] {
  let source: Row[] = [];
  if (Array.isArray(dataset.source)) {
    source = dataset.source as Row[];
    // Handle source header
    if (dataset.sourceHeader !== false && source.length > 0 && !Array.isArray(source[0])) {
      // Object array — no header to strip
    } else if (dataset.sourceHeader !== false && source.length > 0 && Array.isArray(source[0])) {
      // First row is header
      const headers = source[0] as string[];
      source = (source.slice(1) as any[][]).map((row) => {
        const obj: Record<string, any> = {};
        headers.forEach((h, i) => { obj[h] = row[i]; });
        return obj;
      });
    }
  } else if (dataset.source && typeof dataset.source === "object") {
    // Column object format: { x: [...], y: [...] }
    const keys = Object.keys(dataset.source as Record<string, any[]>);
    const columns = dataset.source as Record<string, any[]>;
    const len = columns[keys[0]]?.length ?? 0;
    for (let i = 0; i < len; i++) {
      const row: Record<string, any> = {};
      for (const key of keys) row[key] = columns[key][i];
      source.push(row);
    }
  }

  if (dataset.transform) {
    source = applyTransforms(source, dataset.transform);
  }

  return source;
}

import type {
  DatasetOption,
  EncodeOption,
  SeriesOption,
  TransformOption,
} from "../types.js";

type Row = Record<string, any> | any[];

function getField(row: Row, dim: string | number): any {
  // Nullish rows have no fields: return undefined instead of throwing. A
  // missing field simply fails filter comparisons and sorts as undefined.
  if (row === null || row === undefined) return undefined;
  if (Array.isArray(row)) return row[Number(dim)];
  return (row as Record<string, any>)[String(dim)];
}

function applyFilter(source: Row[], config: Record<string, any>): Row[] {
  const dimension = config.dimension;
  const _value = config.value;
  const gte = config[">="] ?? config.gte;
  const lte = config["<="] ?? config.lte;
  const gt = config[">"] ?? config.gt;
  const lt = config["<"] ?? config.lt;
  const eq = config["="] ?? config.eq;
  const ne = config["!="] ?? config.ne;
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
    if (inside !== undefined) {
      // A range that is not a non-empty array cannot be evaluated — treat the
      // clause as absent (skip this filter dimension) instead of throwing.
      if (Array.isArray(inside) && inside.length > 0) {
        checks.push(v >= inside[0] && v <= inside[1]);
      }
    }
    if (outside !== undefined) {
      // Same as range: a malformed outside clause is treated as absent.
      if (Array.isArray(outside) && outside.length > 0) {
        checks.push(v < outside[0] || v > outside[1]);
      }
    }
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
    if (parser === "time") {
      va = new Date(va).getTime();
      vb = new Date(vb).getTime();
      // Unparseable dates yield NaN, and every NaN comparison is false, which
      // would corrupt the sort. Treat NaN as equal to anything so the relative
      // order of unparseable values stays stable.
      if (Number.isNaN(va) || Number.isNaN(vb)) return 0;
    }
    if (va < vb) return order === "asc" ? -1 : 1;
    if (va > vb) return order === "asc" ? 1 : -1;
    return 0;
  });
}

export function applyTransforms(
  source: Row[],
  transforms: TransformOption[],
): Row[] {
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
    if (
      dataset.sourceHeader !== false &&
      source.length > 0 &&
      !Array.isArray(source[0])
    ) {
      // Object array — no header to strip
    } else if (
      dataset.sourceHeader !== false &&
      source.length > 0 &&
      Array.isArray(source[0])
    ) {
      // First row is header
      const headers = source[0] as string[];
      source = (source.slice(1) as any[][]).map((row) => {
        const obj: Record<string, any> = {};
        headers.forEach((h, i) => {
          obj[h] = row[i];
        });
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

  const transforms = dataset.transform
    ? Array.isArray(dataset.transform)
      ? dataset.transform
      : [dataset.transform]
    : [];
  if (transforms.length > 0) {
    source = applyTransforms(source, transforms);
  }

  return source;
}

function encodeField(
  encode: EncodeOption | undefined,
  key: keyof EncodeOption,
): string | number | undefined {
  const raw = encode?.[key];
  if (Array.isArray(raw)) return raw[0];
  return raw as string | number | undefined;
}

function rowField(row: Row, key: string | number | undefined): unknown {
  if (key === undefined) return undefined;
  if (Array.isArray(row)) {
    const index = typeof key === "number" ? key : Number(key);
    if (Number.isFinite(index)) return row[index];
    return undefined;
  }
  return (row as Record<string, unknown>)[String(key)];
}

function objectKeys(row: Row): string[] {
  if (row === null || row === undefined || Array.isArray(row)) return [];
  return Object.keys(row as Record<string, unknown>);
}

function resolveDatasetList(
  dataset: DatasetOption | DatasetOption[] | undefined,
): Row[][] {
  if (dataset == null) return [];
  const list = Array.isArray(dataset) ? dataset : [dataset];
  const resolved: Row[][] = [];
  const idToIndex = new Map<string, number>();
  for (let index = 0; index < list.length; index++) {
    const entry = list[index];
    if (entry.id) idToIndex.set(entry.id, index);
    let source = entry.source;
    if (source == null) {
      const fromIndex =
        entry.fromDatasetIndex ??
        (entry.fromDatasetId != null
          ? idToIndex.get(entry.fromDatasetId)
          : undefined);
      if (fromIndex != null) source = resolved[fromIndex] as typeof source;
    }
    resolved.push(resolveDataset({ ...entry, source }));
  }
  return resolved;
}

function defaultDimension(
  row: Row,
  offset: number,
): string | number | undefined {
  if (Array.isArray(row)) return offset;
  const keys = objectKeys(row);
  return keys[offset];
}

function encodeCartesianRow(
  row: Row,
  encode: EncodeOption | undefined,
  xFallback: string | number | undefined,
  yFallback: string | number | undefined,
): [unknown, unknown] {
  const xKey = encodeField(encode, "x") ?? xFallback;
  const yKey = encodeField(encode, "y") ?? yFallback;
  return [rowField(row, xKey), rowField(row, yKey)];
}

function encodePieRow(
  row: Row,
  encode: EncodeOption | undefined,
): { name: string; value: number } {
  const nameKey =
    encodeField(encode, "itemName") ??
    encodeField(encode, "seriesName") ??
    encodeField(encode, "x") ??
    defaultDimension(row, 0);
  const valueKey =
    encodeField(encode, "value") ??
    encodeField(encode, "y") ??
    defaultDimension(row, 1);
  const name = rowField(row, nameKey);
  const value = rowField(row, valueKey);
  return {
    name: name == null ? "" : String(name),
    value: typeof value === "number" ? value : Number(value) || 0,
  };
}

function seriesHasOwnData(series: SeriesOption): boolean {
  const data = (series as { data?: unknown }).data;
  return Array.isArray(data) && data.length > 0;
}

/**
 * Join `option.dataset` onto series that have no own `data`. Honors
 * `datasetIndex` / `datasetId` and `encode` (x/y/value/itemName).
 */
export function applyDatasetToSeries<T extends SeriesOption>(
  series: T[],
  dataset: DatasetOption | DatasetOption[] | undefined,
): T[] {
  if (dataset == null) return series;
  const resolved = resolveDatasetList(dataset);
  if (resolved.length === 0) return series;
  const list = Array.isArray(dataset) ? dataset : [dataset];

  const datasetIndexOf = (entry: T): number => {
    const id = (entry as { datasetId?: string }).datasetId;
    if (id != null) {
      const byId = list.findIndex((item) => item.id === id);
      if (byId >= 0) return byId;
    }
    return (entry as { datasetIndex?: number }).datasetIndex ?? 0;
  };

  const rankByDataset = new Map<number, number>();
  return series.map((entry) => {
    if (seriesHasOwnData(entry)) return entry;
    const datasetIndex = datasetIndexOf(entry);
    const rows = resolved[datasetIndex];
    if (!rows || rows.length === 0) return entry;
    const encode = (entry as { encode?: EncodeOption }).encode;
    const rank = rankByDataset.get(datasetIndex) ?? 0;
    rankByDataset.set(datasetIndex, rank + 1);
    const sample = rows[0];
    if (entry.type === "pie") {
      return {
        ...entry,
        data: rows.map((row) => encodePieRow(row, encode)),
      };
    }
    const xFallback = defaultDimension(sample, 0);
    const yFallback = defaultDimension(sample, rank + 1) ?? defaultDimension(sample, 1);
    return {
      ...entry,
      data: rows.map((row) => encodeCartesianRow(row, encode, xFallback, yFallback)),
    };
  });
}

function categoryValue(item: unknown, dim: "x" | "y"): unknown {
  if (Array.isArray(item)) return dim === "x" ? item[0] : item[1];
  if (item && typeof item === "object" && "name" in (item as object)) {
    return (item as { name?: unknown }).name;
  }
  return undefined;
}

/** Fill empty category-axis `data` from encoded series values. */
export function fillCategoryAxes<T extends { type?: string; data?: unknown[] }>(
  axes: T[],
  series: SeriesOption[],
  dim: "x" | "y",
): T[] {
  return axes.map((axis) => {
    const type = axis.type ?? (dim === "x" ? "category" : "value");
    if (type !== "category") return axis;
    if (Array.isArray(axis.data) && axis.data.length > 0) return axis;
    const seen = new Set<string>();
    const categories: unknown[] = [];
    for (const entry of series) {
      for (const item of ((entry as { data?: unknown[] }).data ?? [])) {
        const value = categoryValue(item, dim);
        if (value === undefined || value === null) continue;
        const key = String(value);
        if (seen.has(key)) continue;
        seen.add(key);
        categories.push(value);
      }
    }
    return categories.length > 0 ? { ...axis, data: categories } : axis;
  });
}

import type { SankeySeriesOption, SankeyNode, SankeyLink } from "../types.js";
import { seriesHex } from "../gl/color.js";

interface LayoutNode {
  name: string;
  value: number;
  depth: number;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  inValue: number;
  outValue: number;
  // stacking cursors for link attachment
  sourceY: number;
  targetY: number;
}

interface LayoutLink {
  sourceNode: LayoutNode;
  targetNode: LayoutNode;
  value: number;
  width: number;
  sy: number; // start y center on source
  ty: number; // start y center on target
  color: string;
}

function svgEl(tag: string, attrs: Record<string, string | number>): SVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

// Iterative Sankey layout (simplified Brandes-Köpf-like column assignment)
function layoutSankey(
  rawNodes: SankeyNode[],
  rawLinks: SankeyLink[],
  rect: { x: number; y: number; w: number; h: number },
  nodeWidth: number,
  nodeGap: number,
  iterations: number,
): { nodes: LayoutNode[]; links: LayoutLink[] } {
  const nodeMap = new Map<string, LayoutNode>();

  // Initialize nodes
  for (let i = 0; i < rawNodes.length; i++) {
    const n = rawNodes[i];
    nodeMap.set(n.name, {
      name: n.name,
      value: n.value ?? 0,
      depth: n.depth ?? -1,
      x: 0, y: 0, w: nodeWidth, h: 0,
      color: n.color ? seriesHex(i % 9) : seriesHex(i % 9),
      inValue: 0,
      outValue: 0,
      sourceY: 0,
      targetY: 0,
    });
  }

  // Override colors from index
  rawNodes.forEach((n, i) => {
    const node = nodeMap.get(n.name)!;
    node.color = seriesHex(i % 9);
  });

  const links = rawLinks.map((l) => ({
    source: String(l.source),
    target: String(l.target),
    value: l.value,
  }));

  // Compute in/out flow values
  for (const { source, target, value } of links) {
    const s = nodeMap.get(source);
    const t = nodeMap.get(target);
    if (s) s.outValue += value;
    if (t) t.inValue += value;
  }

  // Assign depths (BFS from sources)
  const nodesArr = [...nodeMap.values()];
  const sourceNames = new Set(links.map((l) => l.source));
  const targetNames = new Set(links.map((l) => l.target));
  const rootNames = [...sourceNames].filter((n) => !targetNames.has(n));

  // BFS depth assignment
  const queue: string[] = rootNames.length > 0 ? rootNames : [nodesArr[0]?.name ?? ""];
  const visited = new Set<string>();
  for (const r of queue) {
    const node = nodeMap.get(r);
    if (node && node.depth < 0) node.depth = 0;
  }

  let head = 0;
  while (head < queue.length) {
    const name = queue[head++];
    if (visited.has(name)) continue;
    visited.add(name);
    const node = nodeMap.get(name);
    if (!node) continue;
    for (const l of links) {
      if (l.source === name) {
        const target = nodeMap.get(l.target);
        if (target) {
          if (target.depth < node.depth + 1) target.depth = node.depth + 1;
          queue.push(l.target);
        }
      }
    }
  }

  // Nodes with no depth assigned get max depth
  const maxDepth = Math.max(...nodesArr.map((n) => n.depth), 0);
  for (const n of nodesArr) {
    if (n.depth < 0) n.depth = maxDepth;
  }

  // Group by depth
  const depthGroups = new Map<number, LayoutNode[]>();
  for (const n of nodesArr) {
    if (!depthGroups.has(n.depth)) depthGroups.set(n.depth, []);
    depthGroups.get(n.depth)!.push(n);
  }

  const numColumns = maxDepth + 1;
  const columnW = rect.w / numColumns;

  // Position nodes horizontally
  for (const [depth, group] of depthGroups) {
    const x = rect.x + depth * columnW + (columnW - nodeWidth) / 2;
    for (const n of group) n.x = x;
  }

  // Compute node heights proportional to max flow
  const maxColumnFlow = Math.max(
    ...[...depthGroups.values()].map((group) =>
      group.reduce((s, n) => s + Math.max(n.inValue, n.outValue, n.value, 1), 0)
    ),
    1,
  );

  // First pass: assign heights and initial y positions
  for (const [, group] of depthGroups) {
    const totalFlow = group.reduce((s, n) => s + Math.max(n.inValue, n.outValue, n.value, 1), 0);
    const totalGap = nodeGap * (group.length - 1);
    const availH = rect.h - totalGap;
    let y = rect.y;
    for (const n of group) {
      const nodeFlow = Math.max(n.inValue, n.outValue, n.value, 1);
      n.h = Math.max(4, (nodeFlow / maxColumnFlow) * availH);
      n.y = y;
      y += n.h + nodeGap;
    }
  }

  // Iterative relaxation for better alignment
  for (let iter = 0; iter < iterations; iter++) {
    // Move nodes toward weighted average of their link counterparts
    for (const [depth, group] of depthGroups) {
      if (depth === 0) continue;
      for (const n of group) {
        const incoming = links.filter((l) => l.target === n.name);
        if (incoming.length === 0) continue;
        let weightedY = 0, totalW = 0;
        for (const l of incoming) {
          const src = nodeMap.get(l.source);
          if (src) {
            weightedY += (src.y + src.h / 2) * l.value;
            totalW += l.value;
          }
        }
        if (totalW > 0) n.y = weightedY / totalW - n.h / 2;
      }
      // Resolve overlaps (top-down pass)
      group.sort((a, b) => a.y - b.y);
      let minY = rect.y;
      for (const n of group) {
        if (n.y < minY) n.y = minY;
        minY = n.y + n.h + nodeGap;
      }
      // If last node goes out of bounds, shift up
      const lastNode = group[group.length - 1];
      if (lastNode && lastNode.y + lastNode.h > rect.y + rect.h) {
        const overflow = lastNode.y + lastNode.h - (rect.y + rect.h);
        for (const n of group) n.y -= overflow;
      }
    }
  }

  // Initialize source/target cursors
  for (const n of nodesArr) {
    n.sourceY = n.y;
    n.targetY = n.y;
  }

  // Build layout links
  const layoutLinks: LayoutLink[] = [];
  const totalMaxFlow = Math.max(...nodesArr.map((n) => Math.max(n.inValue, n.outValue, n.value, 1)), 1);

  for (const l of links) {
    const src = nodeMap.get(l.source);
    const tgt = nodeMap.get(l.target);
    if (!src || !tgt) continue;

    const srcFlow = Math.max(src.inValue, src.outValue, src.value, 1);
    const tgtFlow = Math.max(tgt.inValue, tgt.outValue, tgt.value, 1);
    const linkW = Math.max(1, (l.value / totalMaxFlow) * (rect.h * 0.8));

    const sy = src.sourceY;
    const ty = tgt.targetY;

    // How much of the node height this link occupies
    const srcSpan = (l.value / srcFlow) * src.h;
    const tgtSpan = (l.value / tgtFlow) * tgt.h;

    layoutLinks.push({
      sourceNode: src,
      targetNode: tgt,
      value: l.value,
      width: Math.max(1, Math.min(srcSpan, tgtSpan, linkW)),
      sy: sy + srcSpan / 2,
      ty: ty + tgtSpan / 2,
      color: src.color,
    });

    src.sourceY += srcSpan;
    tgt.targetY += tgtSpan;
  }

  return { nodes: nodesArr, links: layoutLinks };
}

export function renderSankey(
  svg: SVGSVGElement,
  series: SankeySeriesOption[],
  width: number,
  height: number,
  hiddenSeries: Set<string>,
): void {
  const old = svg.querySelector(".dc-sankey");
  if (old) old.remove();
  if (series.length === 0) return;

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-sankey");

  // Add SVG defs for gradients/clips
  let defs = svg.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    svg.insertBefore(defs, svg.firstChild);
  }

  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    if (s.name && hiddenSeries.has(s.name)) continue;

    const rawNodes = (s.nodes ?? s.data ?? []) as SankeyNode[];
    const rawLinks = (s.links ?? s.edges ?? []) as SankeyLink[];
    if (rawNodes.length === 0) continue;

    const left = typeof s.left === "number" ? s.left : typeof s.left === "string" ? parseFloat(s.left) : width * 0.05;
    const top = typeof s.top === "number" ? s.top : typeof s.top === "string" ? parseFloat(s.top) : height * 0.05;
    const sw = typeof s.width === "number" ? s.width : width * 0.9;
    const sh = typeof s.height === "number" ? s.height : height * 0.85;
    const nodeWidth = s.nodeWidth ?? 20;
    const nodeGap = s.nodeGap ?? 8;
    const iterations = s.layoutIterations ?? 32;

    const { nodes, links: layoutLinks } = layoutSankey(
      rawNodes, rawLinks,
      { x: left, y: top, w: sw, h: sh },
      nodeWidth, nodeGap, iterations,
    );

    // Draw links (below nodes)
    const linksGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    linksGroup.setAttribute("opacity", "0.4");

    for (const link of layoutLinks) {
      const { sourceNode: sn, targetNode: tn, sy, ty, width: lw, color } = link;
      const x1 = sn.x + nodeWidth;
      const x2 = tn.x;
      const cx = (x1 + x2) / 2;

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const d = `M ${x1} ${sy} C ${cx} ${sy} ${cx} ${ty} ${x2} ${ty}`;
      path.setAttribute("d", d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", color);
      path.setAttribute("stroke-width", String(lw));
      linksGroup.appendChild(path);
    }
    group.appendChild(linksGroup);

    // Draw nodes (above links)
    for (const node of nodes) {
      const rect = svgEl("rect", {
        x: node.x, y: node.y, width: node.w, height: node.h,
        fill: node.color, rx: 2,
      });
      group.appendChild(rect);

      // Label
      const isLeft = node.depth === 0;
      const labelX = isLeft ? node.x - 4 : node.x + nodeWidth + 4;
      const anchor = isLeft ? "end" : "start";
      if (node.h >= 8) {
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.textContent = node.name;
        label.setAttribute("x", String(labelX));
        label.setAttribute("y", String(node.y + node.h / 2));
        label.setAttribute("fill", "#555");
        label.setAttribute("font-size", "11");
        label.setAttribute("text-anchor", anchor);
        label.setAttribute("dominant-baseline", "middle");
        label.setAttribute("pointer-events", "none");
        group.appendChild(label);
      }
    }
  }

  svg.appendChild(group);
}

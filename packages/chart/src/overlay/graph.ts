import type { GraphSeriesOption, GraphNode, GraphLink } from "../types.js";
import { seriesHex } from "../gl/color.js";

interface PhysicsNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  label: string;
  category: number;
  fixed: boolean;
}

interface PhysicsEdge {
  source: PhysicsNode;
  target: PhysicsNode;
  value: number;
  curved: number; // curvature offset for parallel edges
}

function nodeId(n: GraphNode, index: number): string {
  return n.id ?? n.name ?? String(index);
}

// Fruchterman-Reingold force-directed layout
function runForce(
  nodes: PhysicsNode[],
  edges: PhysicsEdge[],
  width: number,
  height: number,
  iterations: number,
  repulsion: number,
  gravity: number,
  idealLength: number,
): void {
  const cx = width / 2;
  const cy = height / 2;
  const area = width * height;
  const k = Math.sqrt(area / Math.max(nodes.length, 1));

  for (let iter = 0; iter < iterations; iter++) {
    const temp = repulsion * (1 - iter / iterations);

    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      if (a.fixed) continue;
      let fx = 0;
      let fy = 0;

      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
        const force = (k * k) / dist;
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      }

      // Gravity toward center
      fx += (cx - a.x) * gravity;
      fy += (cy - a.y) * gravity;

      a.vx = (a.vx + fx) * 0.85;
      a.vy = (a.vy + fy) * 0.85;
    }

    // Attraction along edges
    for (const edge of edges) {
      if (edge.source.id === edge.target.id) continue;
      const a = edge.source;
      const b = edge.target;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
      const force = (dist * dist) / k;
      const fx = (dx / dist) * force * (idealLength / 200);
      const fy = (dy / dist) * force * (idealLength / 200);
      if (!a.fixed) { a.vx += fx; a.vy += fy; }
      if (!b.fixed) { b.vx -= fx; b.vy -= fy; }
    }

    // Integrate and clamp
    for (const node of nodes) {
      if (node.fixed) continue;
      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      const clamp = Math.min(speed, temp);
      if (speed > 0) {
        node.x += (node.vx / speed) * clamp;
        node.y += (node.vy / speed) * clamp;
      }
      node.x = Math.max(node.radius + 4, Math.min(width - node.radius - 4, node.x));
      node.y = Math.max(node.radius + 4, Math.min(height - node.radius - 4, node.y));
    }
  }
}

export function renderGraph(
  svg: SVGSVGElement,
  series: GraphSeriesOption[],
  width: number,
  height: number,
  hiddenSeries: Set<string>,
): void {
  const old = svg.querySelector(".dc-graph");
  if (old) old.remove();
  if (series.length === 0) return;

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-graph");

  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    if (s.name && hiddenSeries.has(s.name)) continue;

    const rawNodes = (s.nodes ?? s.data ?? []) as GraphNode[];
    const rawLinks = (s.links ?? s.edges ?? []) as GraphLink[];
    const categories = s.categories ?? [];
    const layout = s.layout ?? "force";

    // Chart area
    const left = 20;
    const top = 20;
    const areaW = width - 40;
    const areaH = height - 40;

    const defaultRadius = typeof s.symbolSize === "number" ? s.symbolSize / 2 : 10;

    // Build physics nodes
    const nodeMap = new Map<string, PhysicsNode>();
    const physicsNodes: PhysicsNode[] = rawNodes.map((n, index) => {
      const id = nodeId(n, index);
      const catIndex = n.category ?? (si % 9);
      const color = n.color
        ? seriesHex(catIndex)
        : categories[catIndex]?.color
          ? seriesHex(catIndex)
          : seriesHex(catIndex);

      const radius = n.symbolSize
        ? (Array.isArray(n.symbolSize) ? n.symbolSize[0] : n.symbolSize) / 2
        : defaultRadius;

      // Circular init or given coords
      const angle = (index / rawNodes.length) * Math.PI * 2;
      const initR = Math.min(areaW, areaH) * 0.35;
      const initX = n.x !== undefined ? left + n.x * areaW : left + areaW / 2 + Math.cos(angle) * initR;
      const initY = n.y !== undefined ? top + n.y * areaH : top + areaH / 2 + Math.sin(angle) * initR;

      const node: PhysicsNode = {
        id,
        x: initX,
        y: initY,
        vx: 0,
        vy: 0,
        radius: Math.max(4, radius),
        color,
        label: n.name ?? n.id ?? "",
        category: catIndex,
        fixed: n.x !== undefined && n.y !== undefined,
      };
      nodeMap.set(id, node);
      return node;
    });

    // Build physics edges
    const edgeCountMap = new Map<string, number>();
    const physicsEdges: PhysicsEdge[] = [];
    for (const link of rawLinks) {
      const srcId = String(link.source);
      const tgtId = String(link.target);
      const src = nodeMap.get(srcId) ?? nodeMap.get(
        [...nodeMap.keys()].find((k) => {
          const n = rawNodes.find((_, i) => nodeId(rawNodes[i], i) === k);
          return n && (n.name === srcId || String(n.id) === srcId);
        }) ?? "",
      );
      const tgt = nodeMap.get(tgtId) ?? nodeMap.get(
        [...nodeMap.keys()].find((k) => {
          const n = rawNodes.find((_, i) => nodeId(rawNodes[i], i) === k);
          return n && (n.name === tgtId || String(n.id) === tgtId);
        }) ?? "",
      );
      if (!src || !tgt) continue;

      const pairKey = [src.id, tgt.id].sort().join("→");
      const count = (edgeCountMap.get(pairKey) ?? 0) + 1;
      edgeCountMap.set(pairKey, count);
      physicsEdges.push({ source: src, target: tgt, value: link.value ?? 1, curved: count });
    }

    // Run layout
    if (layout === "force") {
      const forceOpts = s.force ?? {};
      const repulsion = (forceOpts.repulsion ?? 100) as number;
      const gravity = forceOpts.gravity ?? 0.1;
      const edgeLength = Array.isArray(forceOpts.edgeLength)
        ? forceOpts.edgeLength[0]
        : (forceOpts.edgeLength ?? 80);
      runForce(physicsNodes, physicsEdges, areaW + left * 2, areaH + top * 2, 150, repulsion, gravity, edgeLength);
    } else if (layout === "circular") {
      const r = Math.min(areaW, areaH) * 0.4;
      physicsNodes.forEach((n, i) => {
        const angle = (i / physicsNodes.length) * Math.PI * 2 - Math.PI / 2;
        n.x = left + areaW / 2 + Math.cos(angle) * r;
        n.y = top + areaH / 2 + Math.sin(angle) * r;
      });
    }

    // SVG defs for arrowhead
    let defs = svg.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      svg.insertBefore(defs, svg.firstChild);
    }
    const arrowId = `dc-graph-arrow-${si}`;
    if (!defs.querySelector(`#${arrowId}`)) {
      const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
      marker.setAttribute("id", arrowId);
      marker.setAttribute("markerWidth", "8");
      marker.setAttribute("markerHeight", "8");
      marker.setAttribute("refX", "6");
      marker.setAttribute("refY", "3");
      marker.setAttribute("orient", "auto");
      const arrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
      arrow.setAttribute("d", "M0,0 L0,6 L8,3 z");
      arrow.setAttribute("fill", "#999");
      marker.appendChild(arrow);
      defs.appendChild(marker);
    }

    const edgeSymbol = s.edgeSymbol;
    const hasArrow = Array.isArray(edgeSymbol) ? edgeSymbol[1] === "arrow" : edgeSymbol === "arrow";

    // Draw edges first (below nodes)
    const edgesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    edgesGroup.setAttribute("opacity", "0.7");
    for (const edge of physicsEdges) {
      const { source: sn, target: tn } = edge;
      const dx = tn.x - sn.x;
      const dy = tn.y - sn.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      // Shorten line to node edge
      const sx = sn.x + (dx / dist) * sn.radius;
      const sy = sn.y + (dy / dist) * sn.radius;
      const tx = tn.x - (dx / dist) * (tn.radius + (hasArrow ? 8 : 0));
      const ty = tn.y - (dy / dist) * (tn.radius + (hasArrow ? 8 : 0));

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(sx));
      line.setAttribute("y1", String(sy));
      line.setAttribute("x2", String(tx));
      line.setAttribute("y2", String(ty));
      line.setAttribute("stroke", "#aaa");
      line.setAttribute("stroke-width", "1.5");
      if (hasArrow) line.setAttribute("marker-end", `url(#${arrowId})`);
      edgesGroup.appendChild(line);
    }
    group.appendChild(edgesGroup);

    // Draw nodes
    const nodesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    for (const node of physicsNodes) {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", String(node.x));
      circle.setAttribute("cy", String(node.y));
      circle.setAttribute("r", String(node.radius));
      circle.setAttribute("fill", node.color);
      circle.setAttribute("stroke", "white");
      circle.setAttribute("stroke-width", "1.5");
      nodesGroup.appendChild(circle);

      if (node.label && node.radius >= 6) {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.textContent = node.label;
        text.setAttribute("x", String(node.x));
        text.setAttribute("y", String(node.y + node.radius + 11));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("font-size", "10");
        text.setAttribute("fill", "#555");
        text.setAttribute("pointer-events", "none");
        nodesGroup.appendChild(text);
      }
    }
    group.appendChild(nodesGroup);
  }

  svg.appendChild(group);
}

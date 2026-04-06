// visualizer.js — Pure SVG DFA renderer (no external dependencies, no DOM-visibility issues)

/**
 * Renders a DFA as an SVG inside container.
 * Works whether container is visible or not.
 */
function renderDFASimple(container, dfa, options = {}) {
  if (!dfa || !dfa.states || dfa.states.length === 0) {
    container.innerHTML = '<div class="viz-empty">No DFA loaded.</div>';
    return;
  }
  container.innerHTML = '';
  const svg = buildDFASVG(dfa, options);
  container.appendChild(svg);
  // Make SVG fill the container
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
}

function buildDFASVG(dfa, options = {}) {
  const { highlightStates = [] } = options;
  const W = 520, H = 320;
  const n = dfa.states.length;

  // ---- Layout: arrange states in a circle ----
  const cx = W / 2, cy = H / 2;
  const r = Math.min(cx - 48, cy - 48, 30 * n);
  const nodeR = 22;

  const pos = {};
  dfa.states.forEach((st, i) => {
    const angle = (2 * Math.PI * i / n) - Math.PI / 2;
    pos[st] = {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    };
  });

  // ---- Build edge map: group symbols per (src, dst) ----
  const edgeMap = {};
  for (const src of dfa.states) {
    for (const sym of dfa.alphabet) {
      const dst = dfa.transitions[src]?.[sym];
      if (!dst) continue;
      const k = src + '\u0001' + dst;
      if (!edgeMap[k]) edgeMap[k] = { src, dst, syms: [] };
      edgeMap[k].syms.push(sym);
    }
  }

  // SVG namespace
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('xmlns', ns);
  svg.style.background = '#fafaf8';
  svg.style.borderRadius = '6px';
  svg.style.display = 'block';

  // ---- Defs: arrowhead markers ----
  const defs = document.createElementNS(ns, 'defs');

  function makeMarker(id, color) {
    const marker = document.createElementNS(ns, 'marker');
    marker.setAttribute('id', id);
    marker.setAttribute('markerWidth', '8');
    marker.setAttribute('markerHeight', '8');
    marker.setAttribute('refX', '6');
    marker.setAttribute('refY', '3');
    marker.setAttribute('orient', 'auto');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M0,0 L0,6 L8,3 z');
    path.setAttribute('fill', color);
    marker.appendChild(path);
    return marker;
  }
  defs.appendChild(makeMarker('arrow-normal', '#94a3b8'));
  defs.appendChild(makeMarker('arrow-start', '#3b5fe0'));
  defs.appendChild(makeMarker('arrow-loop', '#94a3b8'));
  svg.appendChild(defs);

  // ---- Draw edges ----
  for (const [key, { src, dst, syms }] of Object.entries(edgeMap)) {
    const label = syms.join(', ');
    if (src === dst) {
      drawLoop(svg, ns, pos[src], nodeR, label);
    } else {
      // Check if reverse edge exists (for curve offset)
      const revKey = dst + '\u0001' + src;
      const isBidirectional = revKey in edgeMap;
      drawEdge(svg, ns, pos[src], pos[dst], nodeR, label, isBidirectional);
    }
  }

  // ---- Draw start arrow ----
  if (dfa.startState && pos[dfa.startState]) {
    const sp = pos[dfa.startState];
    const arrowLen = 30;
    const angle = -Math.PI / 2; // point from above
    // Try to come from the upper-left direction
    const fromX = sp.x - arrowLen * 0.7;
    const fromY = sp.y - arrowLen;
    const toX = sp.x - nodeR * Math.cos(Math.atan2(sp.y - fromY, sp.x - fromX));
    const toY = sp.y - nodeR * Math.sin(Math.atan2(sp.y - fromY, sp.x - fromX));
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', fromX);
    line.setAttribute('y1', fromY);
    line.setAttribute('x2', toX);
    line.setAttribute('y2', toY);
    line.setAttribute('stroke', '#3b5fe0');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('marker-end', 'url(#arrow-start)');
    svg.appendChild(line);
  }

  // ---- Draw nodes ----
  for (const st of dfa.states) {
    const { x, y } = pos[st];
    const isStart = st === dfa.startState;
    const isAccept = dfa.acceptStates.includes(st);
    const isHighlighted = highlightStates.includes(st);

    // Outer double-circle for accept state
    if (isAccept) {
      const outerCircle = document.createElementNS(ns, 'circle');
      outerCircle.setAttribute('cx', x);
      outerCircle.setAttribute('cy', y);
      outerCircle.setAttribute('r', nodeR + 5);
      outerCircle.setAttribute('fill', 'none');
      outerCircle.setAttribute('stroke', '#2a8a4a');
      outerCircle.setAttribute('stroke-width', '1.5');
      svg.appendChild(outerCircle);
    }

    // Main circle
    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', nodeR);
    if (isHighlighted) {
      circle.setAttribute('fill', '#fde8d3');
      circle.setAttribute('stroke', '#c05c10');
    } else if (isStart && isAccept) {
      circle.setAttribute('fill', '#d4edd9');
      circle.setAttribute('stroke', '#2a8a4a');
    } else if (isStart) {
      circle.setAttribute('fill', '#dbeafe');
      circle.setAttribute('stroke', '#3b5fe0');
    } else if (isAccept) {
      circle.setAttribute('fill', '#d4edd9');
      circle.setAttribute('stroke', '#2a8a4a');
    } else {
      circle.setAttribute('fill', '#e2e8f0');
      circle.setAttribute('stroke', '#94a3b8');
    }
    circle.setAttribute('stroke-width', '2');
    svg.appendChild(circle);

    // Label
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('font-size', st.length > 4 ? '9' : '11');
    text.setAttribute('font-weight', '700');
    text.setAttribute('font-family', 'Inter, sans-serif');
    text.setAttribute('fill', isHighlighted ? '#6b2800' : '#1a1814');
    text.textContent = st;
    svg.appendChild(text);
  }

  return svg;
}

function drawEdge(svg, ns, from, to, nodeR, label, curved) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / dist, uy = dy / dist;

  // Start and end on circle perimeters
  const x1 = from.x + ux * nodeR;
  const y1 = from.y + uy * nodeR;
  const x2 = to.x - ux * (nodeR + 6); // +6 for arrowhead
  const y2 = to.y - uy * (nodeR + 6);

  let pathD;
  let midX, midY;

  if (curved) {
    // Offset perpendicular to give room for bidirectional edges
    const offset = 28;
    const px = -uy * offset;
    const py = ux * offset;
    const cpX = (x1 + x2) / 2 + px;
    const cpY = (y1 + y2) / 2 + py;
    pathD = `M${x1},${y1} Q${cpX},${cpY} ${x2},${y2}`;
    midX = 0.25 * x1 + 0.5 * cpX + 0.25 * x2;
    midY = 0.25 * y1 + 0.5 * cpY + 0.25 * y2;
  } else {
    pathD = `M${x1},${y1} L${x2},${y2}`;
    midX = (x1 + x2) / 2;
    midY = (y1 + y2) / 2;
  }

  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', pathD);
  path.setAttribute('stroke', '#94a3b8');
  path.setAttribute('stroke-width', '1.5');
  path.setAttribute('fill', 'none');
  path.setAttribute('marker-end', 'url(#arrow-normal)');
  svg.appendChild(path);

  // Label background
  const textBg = document.createElementNS(ns, 'rect');
  const labelW = label.length * 6 + 6;
  textBg.setAttribute('x', midX - labelW / 2);
  textBg.setAttribute('y', midY - 9);
  textBg.setAttribute('width', labelW);
  textBg.setAttribute('height', 14);
  textBg.setAttribute('fill', '#fafaf8');
  textBg.setAttribute('rx', '3');
  svg.appendChild(textBg);

  // Label text
  const text = document.createElementNS(ns, 'text');
  text.setAttribute('x', midX);
  text.setAttribute('y', midY);
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'central');
  text.setAttribute('font-size', '10');
  text.setAttribute('font-family', 'Inter, sans-serif');
  text.setAttribute('fill', '#5a5550');
  text.setAttribute('font-weight', '600');
  text.textContent = label;
  svg.appendChild(text);
}

function drawLoop(svg, ns, pos, nodeR, label) {
  const { x, y } = pos;
  // Loop on top of node
  const loopR = 16;
  const lx = x;
  const ly = y - nodeR - loopR;

  const circle = document.createElementNS(ns, 'circle');
  circle.setAttribute('cx', lx);
  circle.setAttribute('cy', ly);
  circle.setAttribute('r', loopR);
  circle.setAttribute('stroke', '#94a3b8');
  circle.setAttribute('stroke-width', '1.5');
  circle.setAttribute('fill', 'none');
  svg.appendChild(circle);

  // Arrow pointing down into state
  const arrowX = lx + loopR - 2;
  const arrowY = ly + 4;
  const arrowPath = document.createElementNS(ns, 'path');
  arrowPath.setAttribute('d', `M${arrowX - 2},${arrowY - 8} L${arrowX + 2},${arrowY}`);
  arrowPath.setAttribute('stroke', '#94a3b8');
  arrowPath.setAttribute('stroke-width', '1.5');
  arrowPath.setAttribute('marker-end', 'url(#arrow-loop)');
  svg.appendChild(arrowPath);

  // Label above loop
  const text = document.createElementNS(ns, 'text');
  text.setAttribute('x', lx);
  text.setAttribute('y', ly - loopR - 3);
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('font-size', '10');
  text.setAttribute('font-family', 'Inter, sans-serif');
  text.setAttribute('fill', '#5a5550');
  text.setAttribute('font-weight', '600');
  text.textContent = label;
  svg.appendChild(text);
}

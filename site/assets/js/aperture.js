/* ============================================================
   APERTURE — mechanical iris engine
   Builds a 12-blade camera iris in SVG and exposes control to
   open / close it (0 = fully closed/black, 1 = fully open).
   ============================================================ */
(function (global) {
  'use strict';

  const BLADES = 12;
  const PIVOT_R = 250;   // pivot distance from centre (viewBox units)
  const CLOSED_A = 0;    // blade rotation (deg) when iris is shut
  const OPEN_A = 58;     // blade rotation (deg) when iris is wide open

  // A single reference blade: pivots at the top of the ring (0,-PIVOT_R)
  // and sweeps its curved inner edge down through the centre. Twelve of
  // these, each rotated 30deg about the centre, tile the whole disc when
  // shut and open a clean dodecagon as they swing about their pivots.
  function bladePath() {
    const p = -PIVOT_R;
    // pivot -> curve toward centre -> across -> curve back to pivot
    return [
      `M 0 ${p}`,
      `C -120 ${p * 0.55}, -70 -60, 0 24`,   // left edge sweeping past centre
      `C 70 -60, 120 ${p * 0.55}, 0 ${p}`,   // right edge back to pivot
      'Z'
    ].join(' ');
  }

  function build(groupId) {
    const g = document.getElementById(groupId);
    if (!g) return [];
    const d = bladePath();
    const inners = [];
    for (let i = 0; i < BLADES; i++) {
      const outer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      outer.setAttribute('transform', `rotate(${(360 / BLADES) * i} 0 0)`);
      const inner = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      inner.appendChild(path);
      outer.appendChild(inner);
      g.appendChild(outer);
      inners.push(inner);
    }
    return inners;
  }

  // t: 0 (closed) .. 1 (open)
  function setOpen(inners, t) {
    const eased = t;
    const a = CLOSED_A + (OPEN_A - CLOSED_A) * eased;
    for (let i = 0; i < inners.length; i++) {
      inners[i].setAttribute('transform', `rotate(${a} 0 ${-PIVOT_R})`);
    }
  }

  const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  // Animate open/close between two t values.
  function animate(inners, from, to, dur, onDone, onFrame) {
    const start = performance.now();
    function step(now) {
      const p = Math.min(1, (now - start) / dur);
      const e = easeInOut(p);
      const val = from + (to - from) * e;
      setOpen(inners, val);
      if (onFrame) onFrame(val);
      if (p < 1) requestAnimationFrame(step);
      else if (onDone) onDone();
    }
    requestAnimationFrame(step);
  }

  global.Aperture = { build, setOpen, animate, BLADES, easeInOut };
})(window);

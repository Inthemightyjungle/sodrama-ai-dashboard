/*
  The revolving stage.

  One WebGL scene sits behind the opening screen and the four steps. It is a
  theatre revolve: a turning floor split into five curtained bays, each holding
  one set. Scrolling turns the floor so the next set swings into the spotlight.

  Bay 0  a new AI tool on a plinth (opening screen)
  Bay 1  the declaration form being ticked
  Bay 2  the security review
  Bay 3  the purchase request getting its APPROVED stamp
  Bay 4  the tool in use, ON AIR

  The little violet tile with the sparkle is the "AI tool". It appears in every
  bay, so the four steps read as one journey.
*/
import * as THREE from '../vendor/three/three.module.min.js';
import { RoundedBoxGeometry } from '../vendor/three/RoundedBoxGeometry.js';

const TAU = Math.PI * 2;
const SETS = 5;
const STEP = TAU / SETS;
const RING = 4.5;      // how far each set stands from the centre of the revolve
const DISC = 6.7;      // radius of the turning floor
const HOUSE = 0x0c0a10;
const FOCUS = new THREE.Vector3(0, 1.3, RING);

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
const pop = (t, start, length) => { const k = clamp((t - start) / length); return k <= 0 ? 0 : easeOutBack(k); };

// A small seeded random source, so textures and dust look the same every time.
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- materials ---------- */

function makeMaterials() {
  const matte = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...o });
  const gloss = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.22, ...o });
  const metal = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 1, ...o });
  return {
    ivory: matte(0xf2e8d5, { roughness: 0.7 }),
    paper: matte(0xfbf5e9, { roughness: 0.9 }),
    ink: matte(0x1c1624, { roughness: 0.45 }),
    plum: matte(0x34283f, { roughness: 0.5 }),
    lilac: matte(0xcdc3d8, { roughness: 0.7 }),
    wood: matte(0x7a4e33, { roughness: 0.65 }),
    woodLight: matte(0xe9c9a0, { roughness: 0.8 }),
    amber: gloss(0xffb02e),
    red: gloss(0xd22f3b),
    pink: gloss(0xf07a84, { roughness: 0.5, clearcoat: 0.2 }),
    violet: gloss(0x4046e6, { roughness: 0.22, clearcoat: 1 }),
    violetLight: gloss(0x6a70ff, { roughness: 0.3 }),
    brass: metal(0xd0a04a),
    gold: gloss(0xf5b332, { roughness: 0.28, metalness: 0.45, clearcoat: 0.6 }),
    steel: metal(0xbcb7c9, { roughness: 0.36, metalness: 0.8 }),
    steelDark: metal(0x8f8a9c, { roughness: 0.4, metalness: 0.8 }),
    star: new THREE.MeshStandardMaterial({ color: 0xfff4de, emissive: 0xffd58a, emissiveIntensity: 0.45, roughness: 0.4 }),
    spark: new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffb62e, emissiveIntensity: 1.6, roughness: 0.4 }),
    rope: new THREE.MeshPhysicalMaterial({ color: 0xb01f2d, roughness: 0.85, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xff8a94) }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xcfe6ff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.2, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }),
    velvet: new THREE.MeshPhysicalMaterial({ color: 0x6a0e1c, roughness: 0.92, metalness: 0, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xff6a78), side: THREE.DoubleSide }),
  };
}

/* ---------- small building blocks ---------- */

function mesh(geometry, material, o = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = o.cast !== false;
  m.receiveShadow = o.receive !== false;
  if (o.pos) m.position.set(o.pos[0], o.pos[1], o.pos[2]);
  if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
  if (o.scale) m.scale.setScalar(o.scale);
  return m;
}

const rbox = (w, h, d, r, segments = 4) => new RoundedBoxGeometry(w, h, d, segments, r);
const bevelled = (depth, bevel, segments = 3) => ({ depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segments, curveSegments: 22 });

// A flat plate with rounded corners, like a card or a button.
function rplate(w, h, depth, radius, bevel = 0.012) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + radius, y);
  s.lineTo(x + w - radius, y);
  s.quadraticCurveTo(x + w, y, x + w, y + radius);
  s.lineTo(x + w, y + h - radius);
  s.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  s.lineTo(x + radius, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - radius);
  s.lineTo(x, y + radius);
  s.quadraticCurveTo(x, y, x + radius, y);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 14 });
  g.translate(0, 0, -depth / 2);
  return g;
}

function faceted(geometry) {
  const g = geometry.toNonIndexed();
  g.computeVertexNormals();
  return g;
}

function sparkleShape(size = 1, pinch = 0.17) {
  const s = new THREE.Shape();
  const p = pinch * size;
  s.moveTo(0, size);
  s.quadraticCurveTo(p, p, size, 0);
  s.quadraticCurveTo(p, -p, 0, -size);
  s.quadraticCurveTo(-p, -p, -size, 0);
  s.quadraticCurveTo(-p, p, 0, size);
  return s;
}

function tickShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.62, 0.02);
  s.lineTo(-0.48, 0.17);
  s.lineTo(-0.15, -0.12);
  s.lineTo(0.46, 0.56);
  s.lineTo(0.62, 0.42);
  s.lineTo(-0.15, -0.43);
  s.closePath();
  return s;
}

function shieldShape(w, h) {
  const s = new THREE.Shape();
  s.moveTo(-w, h * 0.78);
  s.quadraticCurveTo(-w * 0.45, h * 0.84, 0, h);
  s.quadraticCurveTo(w * 0.45, h * 0.84, w, h * 0.78);
  s.lineTo(w, -h * 0.05);
  s.bezierCurveTo(w, -h * 0.55, w * 0.5, -h * 0.86, 0, -h);
  s.bezierCurveTo(-w * 0.5, -h * 0.86, -w, -h * 0.55, -w, -h * 0.05);
  s.closePath();
  return s;
}

function makeGeometries() {
  const star = new THREE.ExtrudeGeometry(sparkleShape(1), bevelled(0.12, 0.05));
  star.center();
  const tick = new THREE.ExtrudeGeometry(tickShape(), bevelled(0.1, 0.045));
  tick.center();
  return { star, tick };
}

function canvasTexture(width, height, draw) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  draw(c.getContext('2d'), width, height);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function roundRectPath(x, left, top, width, height, radius) {
  x.beginPath();
  x.moveTo(left + radius, top);
  x.arcTo(left + width, top, left + width, top + height, radius);
  x.arcTo(left + width, top + height, left, top + height, radius);
  x.arcTo(left, top + height, left, top, radius);
  x.arcTo(left, top, left + width, top, radius);
  x.closePath();
}

function fitText(x, text, cx, cy, maxWidth) {
  const squeeze = Math.min(1, maxWidth / x.measureText(text).width);
  x.save();
  x.translate(cx, cy);
  x.scale(squeeze, 1);
  x.fillText(text, 0, 0);
  x.restore();
}

function sparklePath(x, cx, cy, size, pinch = 0.17) {
  const p = pinch * size;
  x.beginPath();
  x.moveTo(cx, cy - size);
  x.quadraticCurveTo(cx + p, cy - p, cx + size, cy);
  x.quadraticCurveTo(cx + p, cy + p, cx, cy + size);
  x.quadraticCurveTo(cx - p, cy + p, cx - size, cy);
  x.quadraticCurveTo(cx - p, cy - p, cx, cy - size);
  x.closePath();
}

function glowTexture() {
  return canvasTexture(128, 128, (x, w) => {
    const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,.42)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, w, w);
  });
}

/* ---------- the AI tool ---------- */

function makeTile(M, G) {
  const g = new THREE.Group();
  g.add(mesh(rbox(1.5, 1.5, 0.46, 0.37, 6), M.violet));
  g.add(mesh(rplate(1.16, 1.16, 0.05, 0.26, 0.02), M.violetLight, { pos: [0, 0, 0.225] }));
  const big = mesh(G.star, M.star, { pos: [-0.09, -0.09, 0.285] });
  big.scale.set(0.4, 0.4, 0.5);
  g.add(big);
  const small = mesh(G.star, M.star, { pos: [0.36, 0.36, 0.275] });
  small.scale.set(0.14, 0.14, 0.4);
  g.add(small);
  return g;
}

/* ---------- bay 0: a new AI tool ---------- */

function buildIntro(M, G, glow) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(1.05, 1.14, 0.32, 72), M.ivory, { pos: [0, 0.16, 0] }));
  g.add(mesh(new THREE.TorusGeometry(1.06, 0.04, 12, 96), M.brass, { pos: [0, 0.32, 0], rot: [Math.PI / 2, 0, 0] }));
  g.add(mesh(new THREE.CylinderGeometry(0.8, 0.84, 0.1, 72), M.plum, { pos: [0, 0.37, 0] }));
  const pool = mesh(new THREE.CircleGeometry(0.78, 48), new THREE.MeshBasicMaterial({ map: glow, color: 0xffc061, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }), { pos: [0, 0.425, 0], rot: [-Math.PI / 2, 0, 0], cast: false, receive: false });
  g.add(pool);

  const posts = [-1.62, 1.62].map((x) => {
    const post = new THREE.Group();
    post.position.set(x, 0, 1.0);
    post.add(mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.07, 40), M.brass, { pos: [0, 0.035, 0] }));
    post.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.98, 20), M.brass, { pos: [0, 0.55, 0] }));
    post.add(mesh(new THREE.SphereGeometry(0.085, 24, 16), M.brass, { pos: [0, 1.08, 0] }));
    g.add(post);
    return post;
  });
  const sag = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.62, 0.98, 1.0), new THREE.Vector3(-0.9, 0.76, 1.06), new THREE.Vector3(0, 0.66, 1.1),
    new THREE.Vector3(0.9, 0.76, 1.06), new THREE.Vector3(1.62, 0.98, 1.0),
  ]);
  g.add(mesh(new THREE.TubeGeometry(sag, 48, 0.045, 12), M.rope));

  const tile = makeTile(M, G);
  g.add(tile);
  const stars = [0, 1, 2].map(() => {
    const s = mesh(G.star, M.spark, { cast: false });
    g.add(s);
    return s;
  });

  return {
    group: g,
    update(t, act, clock) {
      tile.position.set(0, 1.74 + Math.sin(clock * 1.25) * 0.07, 0);
      tile.rotation.set(-0.1 + Math.sin(clock * 0.9) * 0.05, 0.3 + Math.sin(clock * 0.55) * 0.5, Math.sin(clock * 0.7) * 0.05);
      pool.material.opacity = 0.42 + Math.sin(clock * 1.25) * 0.1;
      stars.forEach((s, i) => {
        const a = clock * 0.6 + (i * TAU) / 3;
        s.position.set(Math.cos(a) * 1.3, 1.8 + Math.sin(a * 1.7 + i) * 0.55, Math.sin(a) * 0.75);
        s.scale.setScalar(0.13 + 0.05 * Math.sin(clock * 2.2 + i * 2));
        s.rotation.z = clock * 0.8 + i;
      });
    },
  };
}

/* ---------- bay 1: declare ---------- */

function makePencil(M) {
  const g = new THREE.Group();
  const r = 0.085;
  g.add(mesh(new THREE.ConeGeometry(0.03, 0.09, 12), M.ink, { pos: [0, 0.045, 0], rot: [Math.PI, 0, 0] }));
  g.add(mesh(faceted(new THREE.CylinderGeometry(r, 0.03, 0.24, 6)), M.woodLight, { pos: [0, 0.21, 0] }));
  g.add(mesh(faceted(new THREE.CylinderGeometry(r, r, 1.5, 6)), M.amber, { pos: [0, 1.08, 0] }));
  g.add(mesh(new THREE.CylinderGeometry(r * 1.07, r * 1.07, 0.13, 24), M.brass, { pos: [0, 1.895, 0] }));
  g.add(mesh(new THREE.CapsuleGeometry(r * 0.98, 0.08, 6, 16), M.pink, { pos: [0, 2.03, 0] }));
  return g;
}

function buildDeclare(M, G) {
  const g = new THREE.Group();
  const board = new THREE.Group();
  board.position.set(0.4, 0, -0.4);
  board.rotation.y = -0.2;
  g.add(board);
  const lean = new THREE.Group();
  lean.rotation.x = -0.26;
  board.add(lean);

  lean.add(mesh(rbox(2.1, 2.75, 0.14, 0.1), M.plum, { pos: [0, 1.4, 0] }));
  lean.add(mesh(rplate(1.76, 2.22, 0.03, 0.07), M.paper, { pos: [0, 1.26, 0.09] }));
  lean.add(mesh(rbox(0.86, 0.3, 0.16, 0.08), M.brass, { pos: [0, 2.66, 0.1] }));
  lean.add(mesh(new THREE.TorusGeometry(0.13, 0.035, 10, 32), M.brass, { pos: [0, 2.86, 0.1] }));
  lean.add(mesh(rbox(0.86, 0.13, 0.03, 0.05), M.ink, { pos: [-0.32, 2.1, 0.112] }));
  lean.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 40), M.violet, { pos: [0.6, 2.1, 0.12], rot: [Math.PI / 2, 0, 0] }));
  const badge = mesh(G.star, M.star, { pos: [0.6, 2.1, 0.155], cast: false });
  badge.scale.set(0.1, 0.1, 0.2);
  lean.add(badge);

  const ticks = [];
  const fills = [];
  for (let i = 0; i < 3; i++) {
    const y = 1.66 - i * 0.46;
    lean.add(mesh(rplate(0.28, 0.28, 0.03, 0.07), M.lilac, { pos: [-0.6, y, 0.112] }));
    const fill = M.paper.clone();
    lean.add(mesh(rplate(0.2, 0.2, 0.04, 0.05), fill, { pos: [-0.6, y, 0.118], cast: false }));
    fills.push(fill);
    const length = 0.92 - i * 0.16;
    lean.add(mesh(rbox(length, 0.1, 0.03, 0.05), M.lilac, { pos: [-0.36 + length / 2, y, 0.11] }));
    const tick = mesh(G.tick, M.star, { pos: [-0.59, y + 0.012, 0.17], cast: false });
    tick.scale.setScalar(0.001);
    lean.add(tick);
    ticks.push(tick);
  }
  const submitMaterial = M.ink.clone();
  const submit = mesh(rplate(0.66, 0.2, 0.04, 0.1), submitMaterial, { pos: [0.4, 0.42, 0.122] });
  lean.add(submit);
  board.add(mesh(rbox(0.12, 2.3, 0.1, 0.04), M.plum, { pos: [0, 1.02, -1.06], rot: [0.42, 0, 0] }));

  const pencil = makePencil(M);
  lean.add(pencil);

  const tile = makeTile(M, G);
  tile.scale.setScalar(0.5);
  g.add(tile);

  const inkColor = new THREE.Color(0x1c1624);
  const amberColor = new THREE.Color(0xffb02e);
  const paperColor = new THREE.Color(0xfbf5e9);
  const violetColor = new THREE.Color(0x4a50ea);

  return {
    group: g,
    update(t, act, clock) {
      ticks.forEach((tick, i) => {
        const k = pop(t, 0.55 + i * 0.55, 0.45);
        tick.scale.setScalar(Math.max(0.001, 0.2 * k));
        tick.rotation.z = (1 - clamp(k)) * -0.6;
        fills[i].color.lerpColors(paperColor, violetColor, clamp(k));
      });
      const done = smooth(2.15, 2.5, t);
      submitMaterial.color.lerpColors(inkColor, amberColor, done);
      submit.scale.setScalar(1 + 0.1 * Math.sin(clamp((t - 2.15) / 0.5) * Math.PI));

      const row = clamp(Math.floor((t - 0.15) / 0.55), 0, 2);
      const rowY = 1.66 - row * 0.46;
      const rest = smooth(2.0, 2.8, t);
      const writing = 1 - rest;
      const wiggle = Math.sin(clock * 24) * 0.035 * writing;
      pencil.position.set(
        lerp(-0.5 + wiggle, 1.22, rest),
        lerp(rowY - 0.03 + Math.abs(wiggle) * 0.6, 0.95 + Math.sin(clock * 1.4) * 0.05, rest),
        lerp(0.17, 0.7, rest),
      );
      pencil.rotation.set(lerp(0.6, 0.25, rest), 0, lerp(-0.62, -0.32, rest));

      tile.position.set(-1.55, 0.4 + Math.abs(Math.sin(clock * 1.6)) * 0.05, 0.95);
      tile.rotation.set(0, 0.6 + Math.sin(clock * 0.8) * 0.12, 0);
    },
  };
}

/* ---------- bay 2: security review ---------- */

function buildReview(M, G) {
  const g = new THREE.Group();

  const shield = new THREE.Group();
  shield.position.set(0.68, 0, -0.5);
  shield.rotation.y = -0.24;
  g.add(shield);
  const rim = new THREE.ExtrudeGeometry(shieldShape(1.08, 1.32), { ...bevelled(0.26, 0.07, 5), curveSegments: 30 });
  rim.translate(0, 0, -0.13);
  shield.add(mesh(rim, M.brass, { pos: [0, 1.8, 0] }));
  const field = new THREE.ExtrudeGeometry(shieldShape(0.84, 1.05), { ...bevelled(0.06, 0.03), curveSegments: 30 });
  shield.add(mesh(field, M.plum, { pos: [0, 1.82, 0.17] }));
  const check = mesh(G.tick, M.star, { pos: [0, 1.9, 0.36] });
  shield.add(check);
  shield.add(mesh(rbox(1.3, 0.2, 0.62, 0.08), M.plum, { pos: [0, 0.1, 0] }));
  shield.add(mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.36, 24), M.brass, { pos: [0, 0.36, 0] }));

  const plinth = new THREE.Group();
  plinth.position.set(-1.1, 0, 0.65);
  g.add(plinth);
  plinth.add(mesh(new THREE.CylinderGeometry(0.68, 0.74, 0.16, 56), M.ivory, { pos: [0, 0.08, 0] }));
  plinth.add(mesh(new THREE.TorusGeometry(0.69, 0.028, 10, 72), M.brass, { pos: [0, 0.16, 0], rot: [Math.PI / 2, 0, 0] }));
  const tile = makeTile(M, G);
  tile.scale.setScalar(0.5);
  plinth.add(tile);
  const scanMaterial = new THREE.MeshBasicMaterial({ color: 0x86c0ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring = mesh(new THREE.TorusGeometry(0.62, 0.018, 8, 72), scanMaterial, { rot: [Math.PI / 2, 0, 0], cast: false, receive: false });
  plinth.add(ring);

  const glass = new THREE.Group();
  g.add(glass);
  glass.add(mesh(new THREE.TorusGeometry(0.44, 0.065, 14, 56), M.brass));
  glass.add(mesh(new THREE.CircleGeometry(0.43, 48), M.glass, { cast: false, receive: false }));
  glass.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.12, 20), M.brass, { pos: [0.38, -0.38, 0], rot: [0, 0, Math.PI / 4] }));
  glass.add(mesh(new THREE.CapsuleGeometry(0.062, 0.6, 6, 16), M.ink, { pos: [0.66, -0.66, 0], rot: [0, 0, Math.PI / 4] }));

  const lock = new THREE.Group();
  lock.position.set(1.75, 0, 0.9);
  lock.rotation.y = -0.4;
  g.add(lock);
  lock.add(mesh(rbox(0.56, 0.46, 0.26, 0.09), M.amber, { pos: [0, 0.23, 0] }));
  lock.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 20), M.ink, { pos: [0, 0.27, 0.135], rot: [Math.PI / 2, 0, 0], cast: false }));
  lock.add(mesh(rbox(0.04, 0.13, 0.03, 0.012), M.ink, { pos: [0, 0.19, 0.135], cast: false }));
  const shackle = new THREE.Group();
  shackle.add(mesh(new THREE.TorusGeometry(0.17, 0.048, 12, 32, Math.PI), M.steel, { pos: [0, 0.16, 0] }));
  shackle.add(mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.22, 16), M.steel, { pos: [-0.17, 0.05, 0] }));
  shackle.add(mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.22, 16), M.steel, { pos: [0.17, 0.05, 0] }));
  lock.add(shackle);

  return {
    group: g,
    update(t, act, clock) {
      const scanning = 1 - smooth(1.9, 2.3, t);
      ring.visible = scanning > 0.01;
      ring.position.y = 0.3 + (Math.sin(clock * 2.6) * 0.5 + 0.5) * 0.8;
      scanMaterial.opacity = 0.9 * scanning * act;
      tile.position.set(0, 0.7 + Math.sin(clock * 1.4) * 0.03, 0);
      tile.rotation.set(0, 0.45 + Math.sin(clock * 0.5) * 0.5, 0);

      const rest = 1 - scanning;
      const sweep = Math.sin(t * 2.4) * 0.42 * scanning;
      glass.position.set(lerp(-1.1 + sweep, -2.0, rest), lerp(0.84 + Math.sin(t * 4.8) * 0.05, 1.35 + Math.sin(clock * 1.2) * 0.04, rest), lerp(1.4, 0.5, rest));
      glass.rotation.set(lerp(-0.12, 0, rest), lerp(0.1 + sweep * 0.5, 0.5, rest), lerp(0, -0.3, rest));

      const ok = pop(t, 2.1, 0.5);
      check.scale.setScalar(Math.max(0.001, 0.95 * ok));
      shackle.position.y = lerp(0.52, 0.4, smooth(2.25, 2.5, t));
      shield.rotation.z = Math.sin(clamp((t - 2.1) / 0.45) * Math.PI * 2) * 0.025;
    },
  };
}

/* ---------- bay 3: purchase, with approval ---------- */

function approvedTexture() {
  return canvasTexture(1024, 420, (x, w, h) => {
    const rand = seeded(7);
    x.clearRect(0, 0, w, h);
    x.strokeStyle = '#c4202c';
    x.fillStyle = '#c4202c';
    x.lineWidth = h * 0.075;
    roundRectPath(x, h * 0.07, h * 0.07, w - h * 0.14, h - h * 0.14, h * 0.16);
    x.stroke();
    x.font = `900 ${h * 0.5}px Archivo, "Arial Black", Arial, sans-serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    fitText(x, 'APPROVED', w / 2, h * 0.535, w - h * 0.5);
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 260; i++) {
      x.globalAlpha = rand() * 0.55;
      x.beginPath();
      x.arc(rand() * w, rand() * h, rand() * h * 0.022, 0, TAU);
      x.fill();
    }
  });
}

function makeCoin(M, G) {
  const c = new THREE.Group();
  c.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.07, 56), M.gold));
  c.add(mesh(new THREE.TorusGeometry(0.272, 0.03, 10, 56), M.gold, { pos: [0, 0.035, 0], rot: [Math.PI / 2, 0, 0] }));
  c.add(mesh(new THREE.TorusGeometry(0.15, 0.016, 8, 40), M.gold, { pos: [0, 0.036, 0], rot: [Math.PI / 2, 0, 0], cast: false }));
  return c;
}

function buildPurchase(M, G) {
  const g = new THREE.Group();
  g.add(mesh(rbox(1.6, 0.9, 0.7, 0.1), M.ink, { pos: [-0.1, 0.45, -0.55] }));

  const desk = new THREE.Group();
  desk.position.set(-0.1, 0.8, 0);
  desk.rotation.x = 0.48;
  g.add(desk);
  desk.add(mesh(rbox(2.4, 0.16, 1.9, 0.07), M.plum));
  desk.add(mesh(rbox(1.5, 0.03, 1.72, 0.012), M.paper, { pos: [-0.2, 0.095, 0] }));
  const bar = (left, z, width, material, depth = 0.09) => desk.add(mesh(rbox(width, 0.018, depth, 0.008, 2), material, { pos: [left + width / 2, 0.117, z], cast: false }));
  bar(-0.83, -0.66, 0.62, M.ink, 0.12);
  [-0.4, -0.22, -0.04].forEach((z, i) => {
    bar(-0.83, z, 0.66 - i * 0.1, M.lilac);
    bar(0.2, z, 0.22, M.lilac);
  });
  bar(-0.83, 0.13, 1.25, M.ink, 0.016);
  bar(-0.83, 0.3, 0.4, M.ink, 0.1);
  bar(0.14, 0.3, 0.28, M.amber, 0.1);

  const decalMaterial = new THREE.MeshStandardMaterial({ map: approvedTexture(), transparent: true, opacity: 0, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
  const decal = mesh(new THREE.PlaneGeometry(1.16, 0.476), decalMaterial, { pos: [-0.12, 0.128, 0.44], rot: [-Math.PI / 2, 0, 0.22], cast: false, receive: false });
  desk.add(decal);

  const stamp = new THREE.Group();
  desk.add(stamp);
  stamp.add(mesh(rbox(1.0, 0.06, 0.44, 0.025), M.red, { pos: [0, 0.03, 0] }));
  stamp.add(mesh(rbox(1.08, 0.22, 0.52, 0.07), M.wood, { pos: [0, 0.17, 0] }));
  stamp.add(mesh(new THREE.CylinderGeometry(0.085, 0.125, 0.34, 24), M.brass, { pos: [0, 0.44, 0] }));
  const knob = mesh(new THREE.SphereGeometry(0.25, 32, 24), M.red, { pos: [0, 0.75, 0] });
  knob.scale.y = 0.82;
  stamp.add(knob);

  const coins = new THREE.Group();
  coins.position.set(1.65, 0, 1.05);
  g.add(coins);
  const pile = [[0, 0.035, 0, 0], [0.03, 0.108, -0.02, 0.5], [-0.02, 0.181, 0.02, 1.1]].map(([x, y, z, turn]) => {
    const c = makeCoin(M, G);
    c.position.set(x, y, z);
    c.rotation.y = turn;
    c.userData.y = y;
    coins.add(c);
    return c;
  });
  const leaning = makeCoin(M, G);
  leaning.position.set(0.4, 0.27, 0.12);
  leaning.rotation.set(0.2, 0.3, 1.18);
  coins.add(leaning);
  const flat = makeCoin(M, G);
  flat.position.set(-0.5, 0.035, 0.42);
  coins.add(flat);

  const tile = makeTile(M, G);
  tile.scale.setScalar(0.5);
  g.add(tile);

  return {
    group: g,
    update(t, act, clock) {
      const rise = smooth(0.25, 0.6, t);
      const slam = smooth(0.6, 0.74, t);
      const lift = smooth(1.05, 1.8, t);
      let height = lerp(1.05, 1.4, rise);
      height = lerp(height, 0.115, slam * slam);
      height = lerp(height, 1.0, lift);
      const hover = (1 - slam + lift) * Math.sin(clock * 1.8) * 0.03;
      stamp.position.set(lerp(-0.12, 0.95, lift), height + hover, lerp(0.44, -0.45, lift));
      stamp.rotation.set(0, lerp(0.22, -0.25, lift), lerp(0, -0.3, lift));
      stamp.scale.y = 1 - 0.1 * Math.sin(clamp((t - 0.7) / 0.3) * Math.PI);
      decalMaterial.opacity = smooth(0.72, 0.8, t);

      const hit = clamp((t - 0.74) / 0.5);
      const jolt = t > 0.74 && hit < 1 ? Math.sin(hit * 34) * (1 - hit) : 0;
      desk.position.y = 0.8 + jolt * 0.018;
      pile.forEach((c, i) => {
        c.position.y = c.userData.y + Math.max(0, Math.sin(hit * Math.PI)) * (1 - hit) * 0.16 * (i + 1) * (t > 0.74 ? 1 : 0);
      });

      tile.position.set(-1.6, 0.4 + Math.abs(Math.sin(clock * 1.6 + 1)) * 0.05, 1.0);
      tile.rotation.set(0, 0.55 + Math.sin(clock * 0.8 + 2) * 0.12, 0);
    },
  };
}

/* ---------- bay 4: in use ---------- */

function onAirTexture() {
  return canvasTexture(1024, 288, (x, w, h) => {
    x.fillStyle = '#cf2230';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#fff1e2';
    x.font = `900 ${h * 0.7}px Archivo, "Arial Black", Arial, sans-serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    fitText(x, 'ON AIR', w / 2, h * 0.545, w * 0.8);
  });
}

function makeScreen() {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 394;
  const x = c.getContext('2d');
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  let drawn = -1;
  function draw(progress) {
    const step = Math.round(progress * 60);
    if (step === drawn) return;
    drawn = step;
    const w = c.width;
    const h = c.height;
    const bg = x.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#1a1238');
    bg.addColorStop(1, '#3a2a94');
    x.fillStyle = bg;
    x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,255,255,.07)';
    roundRectPath(x, 56, 40, w - 112, h - 80, 22);
    x.fill();
    ['#ff6b6b', '#ffc24a', '#5fd38a'].forEach((color, i) => {
      x.fillStyle = color;
      x.beginPath();
      x.arc(84 + i * 22, 66, 6, 0, TAU);
      x.fill();
    });
    const icon = x.createLinearGradient(0, 100, 0, 220);
    icon.addColorStop(0, '#8a90ff');
    icon.addColorStop(1, '#4d53ea');
    x.fillStyle = icon;
    roundRectPath(x, w / 2 - 60, 100, 120, 120, 30);
    x.fill();
    x.fillStyle = '#fff4de';
    sparklePath(x, w / 2 - 6, 164, 38);
    x.fill();
    sparklePath(x, w / 2 + 32, 126, 13);
    x.fill();
    if (progress < 1) {
      x.fillStyle = 'rgba(255,255,255,.16)';
      roundRectPath(x, w / 2 - 130, 262, 260, 18, 9);
      x.fill();
      x.fillStyle = '#ffb938';
      roundRectPath(x, w / 2 - 130, 262, Math.max(18, 260 * progress), 18, 9);
      x.fill();
    } else {
      x.fillStyle = '#ffb938';
      roundRectPath(x, w / 2 - 74, 252, 148, 40, 20);
      x.fill();
      x.strokeStyle = '#1c1330';
      x.lineWidth = 7;
      x.lineCap = 'round';
      x.lineJoin = 'round';
      x.beginPath();
      x.moveTo(w / 2 - 16, 272);
      x.lineTo(w / 2 - 4, 283);
      x.lineTo(w / 2 + 18, 261);
      x.stroke();
    }
    texture.needsUpdate = true;
  }
  draw(0);
  return { texture, draw };
}

function buildShowtime(M, G, glow) {
  const g = new THREE.Group();

  const laptop = new THREE.Group();
  laptop.position.set(-0.05, 0, 0.2);
  laptop.rotation.y = 0.2;
  g.add(laptop);
  laptop.add(mesh(rbox(2.5, 0.11, 1.7, 0.05), M.steel, { pos: [0, 0.055, 0] }));
  laptop.add(mesh(rbox(2.1, 0.014, 0.86, 0.006, 2), M.ink, { pos: [0, 0.112, -0.2], cast: false }));
  laptop.add(mesh(rbox(0.72, 0.012, 0.42, 0.005, 2), M.steelDark, { pos: [0, 0.112, 0.52], cast: false }));
  const lid = new THREE.Group();
  lid.position.set(0, 0.11, -0.83);
  laptop.add(lid);
  lid.add(mesh(rbox(2.5, 1.64, 0.08, 0.04), M.steel, { pos: [0, 0.82, 0] }));
  lid.add(mesh(rbox(2.36, 1.5, 0.02, 0.009, 2), M.ink, { pos: [0, 0.82, 0.042], cast: false }));
  const screen = makeScreen();
  const screenMaterial = new THREE.MeshStandardMaterial({ color: 0x08060c, emissive: 0xffffff, emissiveMap: screen.texture, emissiveIntensity: 0, roughness: 0.25 });
  lid.add(mesh(new THREE.PlaneGeometry(2.24, 1.38), screenMaterial, { pos: [0, 0.82, 0.054], cast: false, receive: false }));
  const screenLight = new THREE.PointLight(0x8f8cff, 0, 4.5, 2);
  screenLight.position.set(0, 0.8, 0.7);
  lid.add(screenLight);

  const sign = new THREE.Group();
  sign.position.set(0.95, 2.86, -0.75);
  sign.rotation.y = -0.2;
  g.add(sign);
  sign.add(mesh(rbox(1.78, 0.64, 0.26, 0.1), M.ink));
  const signTexture = onAirTexture();
  const signMaterial = new THREE.MeshStandardMaterial({ map: signTexture, emissive: 0xffffff, emissiveMap: signTexture, emissiveIntensity: 0.03, roughness: 0.4 });
  sign.add(mesh(new THREE.PlaneGeometry(1.56, 0.44), signMaterial, { pos: [0, 0, 0.134], cast: false, receive: false }));
  [-0.62, 0.62].forEach((x) => sign.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 5, 8), M.steel, { pos: [x, 2.8, 0] })));
  const signLight = new THREE.PointLight(0xff3344, 0, 7, 2);
  signLight.position.set(0, -0.2, 0.8);
  sign.add(signLight);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xff3848, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.set(4.2, 2.2, 1);
  halo.position.set(0, 0, 0.2);
  sign.add(halo);

  const tile = makeTile(M, G);
  tile.scale.setScalar(0.5);
  g.add(tile);
  const burst = Array.from({ length: 10 }, () => {
    const s = mesh(G.star, M.spark, { cast: false, receive: false });
    g.add(s);
    return s;
  });

  const flicker = [[2.3, 0], [2.36, 1], [2.44, 0.15], [2.5, 0.9], [2.58, 0.3], [2.66, 1]];

  return {
    group: g,
    update(t, act, clock) {
      lid.rotation.x = lerp(1.5, -0.27, easeOutCubic(clamp((t - 0.1) / 0.9)));
      const boot = smooth(0.9, 1.3, t);
      screenMaterial.emissiveIntensity = boot * 1.05;
      screenLight.intensity = boot * 2.2 * act;
      screen.draw(clamp((t - 1.25) / 1.0));

      let on = 0;
      for (let i = 0; i < flicker.length; i++) if (t >= flicker[i][0]) on = flicker[i][1];
      if (t > 2.66) on = 1 + Math.sin(clock * 9) * 0.03;
      signMaterial.emissiveIntensity = 0.03 + on * 0.62;
      signLight.intensity = on * 10 * act;
      halo.material.opacity = on * 0.5 * act;

      const up = pop(t, 2.35, 0.6);
      const x = -1.78;
      const y = lerp(0.4, 1.3, clamp(up)) + Math.sin(clock * 2) * 0.06 * clamp(up);
      tile.position.set(x, y, 1.05);
      tile.rotation.set(0, 0.55 + easeOutCubic(clamp((t - 2.35) / 0.9)) * TAU + Math.sin(clock) * 0.15, Math.sin(clock * 1.3) * 0.06 * clamp(up));

      burst.forEach((s, i) => {
        const phase = clamp((t - 2.45 - i * 0.03) / 0.9);
        const a = (i / burst.length) * TAU + 0.4;
        const reach = 0.55 + easeOutCubic(phase) * 0.6 + (i % 3) * 0.12;
        s.position.set(x + Math.cos(a) * reach, y + Math.sin(a) * reach * 0.9, 0.95 + Math.sin(a * 2) * 0.25);
        const twinkle = phase >= 1 ? 0.045 + 0.035 * Math.sin(clock * 3 + i * 1.7) : 0;
        s.scale.setScalar(Math.max(0.001, Math.sin(phase * Math.PI) * 0.15 + twinkle));
        s.rotation.z = clock + i;
      });
    },
  };
}

/* ---------- the revolve itself ---------- */

function discTexture() {
  return canvasTexture(1024, 1024, (x, w) => {
    const rand = seeded(11);
    const c = w / 2;
    const g = x.createRadialGradient(c, c, 30, c, c, c);
    g.addColorStop(0, '#3a2c46');
    g.addColorStop(0.7, '#2b2135');
    g.addColorStop(1, '#201828');
    x.fillStyle = g;
    x.fillRect(0, 0, w, w);
    for (let r = 60; r < c; r += 46) {
      x.strokeStyle = `rgba(255,255,255,${0.025 + rand() * 0.03})`;
      x.lineWidth = 1.5;
      x.beginPath();
      x.arc(c, c, r, 0, TAU);
      x.stroke();
      x.strokeStyle = 'rgba(0,0,0,.28)';
      x.lineWidth = 2;
      x.beginPath();
      x.arc(c, c, r + 2, 0, TAU);
      x.stroke();
    }
    for (let i = 0; i < 2600; i++) {
      x.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.08)';
      const a = rand() * TAU;
      const r = Math.sqrt(rand()) * c;
      x.fillRect(c + Math.cos(a) * r, c + Math.sin(a) * r, 1 + rand() * 3, 1);
    }
  });
}

function curtainGeometry(length, height) {
  const g = new THREE.PlaneGeometry(length, height, 150, 6);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const high = p.getY(i) / height + 0.5;
    const drift = Math.sin(high * 2.2 + x * 0.9) * 0.35 + 0.7 * Math.sin(x * 1.7);
    const fold = Math.sin(x * 14.5 + drift) * (0.075 + 0.03 * Math.sin(x * 2.3 + 1)) + Math.sin(x * 6.1 + 1.3) * 0.04;
    p.setZ(i, fold * (0.7 + 0.3 * high));
  }
  g.computeVertexNormals();
  return g;
}

function buildRevolve(M, G, glow) {
  const revolve = new THREE.Group();

  const top = new THREE.MeshStandardMaterial({ map: discTexture(), roughness: 0.42, metalness: 0.05 });
  const side = new THREE.MeshStandardMaterial({ color: 0x17111d, roughness: 0.6 });
  revolve.add(mesh(new THREE.CylinderGeometry(DISC, DISC, 0.24, 128), [side, top, side], { pos: [0, -0.12, 0], cast: false }));
  revolve.add(mesh(new THREE.TorusGeometry(DISC - 0.02, 0.05, 12, 200), M.brass, { pos: [0, 0, 0], rot: [Math.PI / 2, 0, 0], cast: false }));
  revolve.add(mesh(new THREE.TorusGeometry(DISC - 0.55, 0.018, 8, 200), M.brass, { pos: [0, 0.004, 0], rot: [Math.PI / 2, 0, 0], cast: false }));

  const curtain = curtainGeometry(DISC - 0.32, 9);
  for (let i = 0; i < SETS; i++) {
    const angle = (i + 0.5) * STEP;
    const wing = new THREE.Group();
    wing.rotation.y = angle - Math.PI / 2;
    wing.add(mesh(curtain, M.velvet, { pos: [0.02 + (DISC - 0.32) / 2, 4.5, 0] }));
    wing.add(mesh(rbox(DISC - 0.34, 0.05, 0.07, 0.02, 2), M.brass, { pos: [0.02 + (DISC - 0.34) / 2, 0.025, 0], cast: false }));
    revolve.add(wing);
  }

  const BULBS = 70;
  const bulbGeometry = new THREE.BufferGeometry();
  const bulbPositions = new Float32Array(BULBS * 3);
  const bulbColors = new Float32Array(BULBS * 3);
  for (let i = 0; i < BULBS; i++) {
    const a = (i / BULBS) * TAU;
    bulbPositions[i * 3] = Math.sin(a) * (DISC - 0.28);
    bulbPositions[i * 3 + 1] = 0.06;
    bulbPositions[i * 3 + 2] = Math.cos(a) * (DISC - 0.28);
  }
  bulbGeometry.setAttribute('position', new THREE.BufferAttribute(bulbPositions, 3));
  bulbGeometry.setAttribute('color', new THREE.BufferAttribute(bulbColors, 3));
  const bulbs = new THREE.Points(bulbGeometry, new THREE.PointsMaterial({ map: glow, size: 0.8, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  bulbs.frustumCulled = false;
  bulbs.renderOrder = 4;
  revolve.add(bulbs);
  const caps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.042, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff1d6 }), BULBS);
  const place = new THREE.Object3D();
  for (let i = 0; i < BULBS; i++) {
    place.position.set(bulbPositions[i * 3], 0.05, bulbPositions[i * 3 + 2]);
    place.updateMatrix();
    caps.setMatrixAt(i, place.matrix);
  }
  revolve.add(caps);
  function lightBulbs(clock, turning) {
    for (let i = 0; i < BULBS; i++) {
      const chase = 0.5 + 0.5 * Math.sin(clock * 2.2 - i * 0.55);
      const level = 0.55 + 0.9 * chase * chase + turning * 0.8;
      bulbColors[i * 3] = level * 1.5;
      bulbColors[i * 3 + 1] = level * 0.95;
      bulbColors[i * 3 + 2] = level * 0.42;
    }
    bulbGeometry.attributes.color.needsUpdate = true;
  }
  lightBulbs(0, 0);

  const builders = [buildIntro, buildDeclare, buildReview, buildPurchase, buildShowtime];
  const sets = builders.map((build, i) => {
    const set = build(M, G, glow);
    const slot = new THREE.Group();
    const angle = i * STEP;
    slot.position.set(Math.sin(angle) * RING, 0, Math.cos(angle) * RING);
    slot.rotation.y = angle;
    slot.add(set.group);
    revolve.add(slot);
    set.time = 0;
    return set;
  });

  return { revolve, sets, lightBulbs };
}

/* ---------- light, haze and dust ---------- */

function buildBeam(lamp, target, radius) {
  const length = lamp.distanceTo(target) * 1.02;
  const geometry = new THREE.CylinderGeometry(0.22, radius, length, 64, 1, true);
  geometry.translate(0, -length / 2, 0);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(0xffd7a0) }, uStrength: { value: 0.42 } },
    vertexShader: `
      varying vec2 vUv; varying vec3 vNormal; varying vec3 vView;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uStrength;
      varying vec2 vUv; varying vec3 vNormal; varying vec3 vView;
      void main() {
        float core = pow(abs(dot(normalize(vNormal), normalize(vView))), 1.8);
        float along = smoothstep(0.03, 0.5, vUv.y) * mix(0.4, 1.0, vUv.y);
        gl_FragColor = vec4(uColor, core * along * uStrength);
      }`,
  });
  const beam = new THREE.Mesh(geometry, material);
  beam.position.copy(lamp);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), target.clone().sub(lamp).normalize());
  beam.renderOrder = 5;
  return beam;
}

function buildDust(lamp, target, radius, glow) {
  const rand = seeded(23);
  const count = 150;
  const axis = target.clone().sub(lamp);
  const length = axis.length();
  axis.normalize();
  const side = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(side, axis).normalize();
  const seeds = [];
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) seeds.push({ along: 0.45 + rand() * 0.55, angle: rand() * TAU, reach: Math.sqrt(rand()), speed: 0.03 + rand() * 0.07, phase: rand() * TAU });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ map: glow, color: 0xffe2b8, size: 0.11, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 6;
  const v = new THREE.Vector3();
  function update(clock) {
    for (let i = 0; i < count; i++) {
      const s = seeds[i];
      const along = 0.45 + ((s.along - 0.45 + clock * s.speed * 0.05) % 0.55);
      const r = radius * along * s.reach;
      const a = s.angle + Math.sin(clock * 0.2 + s.phase) * 0.4;
      v.copy(lamp).addScaledVector(axis, along * length).addScaledVector(side, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y + Math.sin(clock * 0.5 + s.phase) * 0.06;
      positions[i * 3 + 2] = v.z;
    }
    geometry.attributes.position.needsUpdate = true;
  }
  update(0);
  return { points, update };
}

function buildEnvironment(renderer) {
  const room = new THREE.Scene();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), new THREE.MeshBasicMaterial({ color: 0x0b0810, side: THREE.BackSide }));
  room.add(shell);
  const panel = (color, strength, w, h, position) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), side: THREE.DoubleSide }));
    m.position.set(position[0], position[1], position[2]);
    m.lookAt(0, 0, 0);
    room.add(m);
  };
  panel(0xffdcae, 11, 14, 14, [-8, 14, 10]);
  panel(0x8fb8ff, 4, 8, 16, [16, 6, -6]);
  panel(0xffc79a, 2.2, 26, 10, [0, 3, 18]);
  panel(0xff6a70, 1.6, 18, 10, [0, 6, -18]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(room, 0.03).texture;
  pmrem.dispose();
  return texture;
}

/* ---------- the stage ---------- */

export async function createStage(canvas, options = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!options.preserve });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  let pixelRatio = Math.min(window.devicePixelRatio || 1, options.maxPixelRatio || 2);
  renderer.setPixelRatio(pixelRatio);

  if (document.fonts && document.fonts.load) {
    try {
      await Promise.race([document.fonts.load('900 80px Archivo'), new Promise((r) => setTimeout(r, 1500))]);
    } catch (e) { /* the labels fall back to a system face */ }
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(HOUSE);
  scene.fog = new THREE.Fog(HOUSE, 16, 40);
  scene.environment = buildEnvironment(renderer);
  scene.environmentIntensity = 0.7;

  const M = makeMaterials();
  const G = makeGeometries();
  const glow = glowTexture();

  const fade = canvasTexture(256, 256, (x, w) => {
    const g = x.createRadialGradient(w / 2, w / 2, w * 0.27, w / 2, w / 2, w * 0.5);
    g.addColorStop(0, '#fff');
    g.addColorStop(1, '#000');
    x.fillStyle = g;
    x.fillRect(0, 0, w, w);
  });
  const ground = mesh(new THREE.CircleGeometry(DISC * 1.9, 64), new THREE.MeshStandardMaterial({ color: 0x15101a, roughness: 0.9, envMapIntensity: 0, alphaMap: fade, transparent: true }), { pos: [0, -0.24, 0], rot: [-Math.PI / 2, 0, 0], cast: false });
  scene.add(ground);

  const { revolve, sets, lightBulbs } = buildRevolve(M, G, glow);
  scene.add(revolve);

  const lampAt = new THREE.Vector3(-3.4, 10.2, RING + 4.6);
  const lampTarget = new THREE.Vector3(0, 0.5, RING + 0.1);
  const key = new THREE.SpotLight(0xffdcae, 600, 0, 0.25, 0.7, 2);
  key.position.copy(lampAt);
  key.target.position.copy(lampTarget);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 4;
  key.shadow.camera.far = 24;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.03;
  key.shadow.radius = 5;
  scene.add(key, key.target);

  const wash = new THREE.SpotLight(0xff8f6a, 85, 0, 0.62, 1, 2);
  wash.position.set(3.5, 7.5, RING + 7.5);
  wash.target.position.set(0, 2.2, 1.2);
  scene.add(wash, wash.target);

  const rim = new THREE.DirectionalLight(0x86b6ff, 1.5);
  rim.position.set(6, 7, -7);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0x9db6ff, 0x1a0e14, 0.2));

  const beam = buildBeam(lampAt, lampTarget, 3.0);
  scene.add(beam);
  const dust = buildDust(lampAt, lampTarget, 2.7, glow);
  scene.add(dust.points);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 80);
  const state = {
    target: 0, progress: 0, clock: 0, pointerX: 0, pointerY: 0, eyeX: 0, eyeY: 0,
    framing: options.framing || null, distance: 10, running: false, frames: 0, slow: 0, width: 0, height: 0,
  };

  function resize(force) {
    const width = canvas.clientWidth || canvas.width;
    const height = canvas.clientHeight || canvas.height;
    if (!width || !height) return;
    if (!force && width === state.width && height === state.height) return;
    state.width = width;
    state.height = height;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    const aspect = width / height;
    // Where the set sits in the frame: `right` and `up` shift it (as a share of
    // the frame), `fillHeight` and `fillWidth` say how much room it may take.
    const f = state.framing || (aspect > 1.05
      ? { right: 0.21, up: -0.02, fillHeight: 0.66, fillWidth: 0.5 }
      : { right: 0, up: 0.2, fillHeight: 0.42, fillWidth: 0.96 });
    const half = THREE.MathUtils.degToRad(camera.fov) / 2;
    const fitHeight = 4.2 / (2 * Math.tan(half)) / f.fillHeight;
    const fitWidth = 4.8 / (2 * Math.tan(half) * aspect) / f.fillWidth;
    state.distance = Math.max(fitHeight, fitWidth);
    camera.aspect = aspect;
    camera.setViewOffset(width, height, -f.right * width, f.up * height, width, height);
    camera.updateProjectionMatrix();
  }

  function frame(dt) {
    state.clock += dt;
    state.progress += (state.target - state.progress) * (1 - Math.exp(-dt * 7));
    if (Math.abs(state.target - state.progress) < 0.0005) state.progress = state.target;
    const p = clamp(state.progress, 0, SETS - 1);
    const whole = Math.min(Math.floor(p), SETS - 2);
    const part = p - whole;
    const turn = whole + smoother(clamp((part - 0.16) / 0.68));
    revolve.rotation.y = -turn * STEP;

    sets.forEach((set, i) => {
      const act = 1 - smooth(0.28, 0.6, Math.abs(p - i));
      if (act > 0.55) set.time += dt;
      else if (act < 0.02) set.time = 0;
      set.group.visible = Math.abs(p - i) < 0.97;
      if (set.group.visible) set.update(set.time, act, state.clock);
    });

    dust.update(state.clock);
    const travelling = Math.sin(clamp(part) * Math.PI);
    const lit = smooth(0.15, 1.7, state.clock);
    lightBulbs(state.clock, travelling * lit + (lit - 1));
    key.intensity = 600 * lit;
    wash.intensity = 85 * (0.25 + 0.75 * lit);
    beam.material.uniforms.uStrength.value = (0.42 + travelling * 0.08 + Math.sin(state.clock * 0.7) * 0.012) * lit;

    state.eyeX += (state.pointerX - state.eyeX) * (1 - Math.exp(-dt * 3));
    state.eyeY += (state.pointerY - state.eyeY) * (1 - Math.exp(-dt * 3));
    const d = state.distance * (1 + travelling * 0.045);   // the camera eases back a little while the stage turns
    camera.position.set(FOCUS.x + state.eyeX * 0.7, FOCUS.y + d * 0.19 - state.eyeY * 0.35, FOCUS.z + d * 0.982);
    camera.lookAt(FOCUS);
    renderer.render(scene, camera);
  }

  let last = 0;
  function tick(now) {
    const dt = Math.min(0.1, last ? (now - last) / 1000 : 0.016);
    last = now;
    // If this device struggles, trade sharpness for smoothness.
    if (dt > 0.034) state.slow++; else state.slow = Math.max(0, state.slow - 1);
    if (state.slow > 45 && pixelRatio > 1) {
      pixelRatio = Math.max(1, pixelRatio - 0.5);
      state.slow = 0;
      resize(true);
    } else {
      resize(false);
    }
    frame(dt);
    if (!state.frames++ && options.onFirstFrame) options.onFirstFrame();
  }

  resize(true);

  return {
    setProgress(value) { state.target = clamp(value, 0, SETS - 1); },
    setPointer(x, y) { state.pointerX = clamp(x, -1, 1); state.pointerY = clamp(y, -1, 1); },
    setFraming(framing) { state.framing = framing; resize(true); },
    jump() { state.progress = state.target; },
    // Skips ahead in the set that is on stage (used when taking pictures of the page).
    settle(seconds) { sets.forEach((set, i) => { if (Math.abs(state.target - i) < 0.3) set.time = seconds; }); },
    resize() { resize(true); },
    run(on) {
      if (on === state.running) return;
      state.running = on;
      last = 0;
      renderer.setAnimationLoop(on ? tick : null);
    },
    // Draws one still: bay `index`, `seconds` into its little performance.
    still(index, seconds = 6, clock = 2.4) {
      state.target = state.progress = index;
      sets.forEach((set, i) => { set.time = i === index ? seconds : 0; });
      state.clock = clock;
      state.eyeX = state.eyeY = state.pointerX = state.pointerY = 0;
      resize(true);
      frame(0);
    },
    renderer,
    scene,
  };
}

export function stageSupported() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch (e) {
    return false;
  }
}

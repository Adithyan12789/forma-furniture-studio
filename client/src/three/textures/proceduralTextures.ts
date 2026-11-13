import * as THREE from 'three';

/**
 * Procedural texture generation (canvas-based, no external assets).
 * Phase 1 provides wood grain; the full PBR library lands in Phase 3.
 * Textures are cached per species+tint so material switches stay cheap.
 */

const cache = new Map<string, { map: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture; normalMap: THREE.CanvasTexture | null }>();

interface WoodSpec {
  base: string;
  streak: string;
  pore: string;
}

export const WOOD_SPECS: Record<string, WoodSpec> = {
  oak:      { base: '#b0824f', streak: '#8a5f33', pore: '#6f4a24' },
  walnut:   { base: '#5d4230', streak: '#43301f', pore: '#2f2013' },
  mahogany: { base: '#74382a', streak: '#572a1e', pore: '#3f1f16' },
  teak:     { base: '#a97c46', streak: '#86602f', pore: '#66481f' },
  pine:     { base: '#cfa96e', streak: '#b28c4e', pore: '#8f6f38' },
  birch:    { base: '#d9c49a', streak: '#bfab7f', pore: '#a08e63' },
};

/** Deterministic pseudo-random so a species always looks the same. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function getWoodTextures(species: string): { map: THREE.Texture; roughnessMap: THREE.Texture; normalMap: THREE.Texture | null } {
  const key = species in WOOD_SPECS ? species : 'oak';
  const hit = cache.get(key);
  if (hit) return hit;

  const spec = WOOD_SPECS[key];
  const rand = rng(key.split('').reduce((a, c) => a + c.charCodeAt(0), 7));
  const S = 512;

  // --- color map: vertical grain with streaks, pores and a few knots ---
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = spec.base;
  ctx.fillRect(0, 0, S, S);

  for (let i = 0; i < 130; i++) {
    const x = rand() * S;
    const w = 1 + rand() * 5;
    const alpha = 0.05 + rand() * 0.16;
    ctx.strokeStyle = spec.streak;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x, -10);
    for (let y = 0; y <= S + 10; y += 32) {
      ctx.lineTo(x + Math.sin(y * 0.02 + i) * 4 * rand(), y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = spec.pore;
    ctx.globalAlpha = 0.05 + rand() * 0.1;
    ctx.fillRect(rand() * S, rand() * S, 1 + rand() * 2, 4 + rand() * 14);
  }
  ctx.globalAlpha = 1;

  for (let i = 0; i < 3; i++) {
    const kx = rand() * S, ky = rand() * S;
    for (let r = 9; r > 1; r -= 2) {
      ctx.strokeStyle = spec.streak;
      ctx.globalAlpha = 0.16;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(kx, ky, r * 0.7, r * 1.7, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  // --- roughness map: grain lines slightly rougher than the field ---
  const rc = document.createElement('canvas');
  rc.width = rc.height = S;
  const rctx = rc.getContext('2d')!;
  rctx.fillStyle = '#8c8c8c';
  rctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 130; i++) {
    const x = rand() * S;
    rctx.strokeStyle = rand() > 0.5 ? '#a3a3a3' : '#767676';
    rctx.globalAlpha = 0.25;
    rctx.lineWidth = 1 + rand() * 4;
    rctx.beginPath();
    rctx.moveTo(x, 0);
    rctx.lineTo(x + (rand() - 0.5) * 8, S);
    rctx.stroke();
  }
  rctx.globalAlpha = 1;

  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;

  const roughnessMap = new THREE.CanvasTexture(rc);
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;

  // Grain lines are darker = recessed: derive a normal map from the color canvas.
  const entry = { map, roughnessMap, normalMap: heightToNormal(c, 1.1) };
  cache.set(key, entry);
  return entry;
}

/* ------------------------------------------------------------------ */
/* Phase 3: full procedural PBR texture sets                           */
/*                                                                     */
/* Every generator returns { map, roughnessMap, normalMap } drawn in   */
/* NEUTRAL tones (near-white base) so the material's color tint        */
/* multiplies through — one texture set serves every colorway.         */
/* ------------------------------------------------------------------ */

export interface TextureSet {
  map: THREE.Texture;
  roughnessMap: THREE.Texture;
  normalMap: THREE.Texture | null;
}

function applyRepeat(set: TextureSet, repeat: number): TextureSet {
  for (const t of [set.map, set.roughnessMap, set.normalMap]) {
    t?.repeat.set(repeat, repeat);
  }
  return set;
}

const setCache = new Map<string, TextureSet>();

function canvasOf(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')!];
}

function toTexture(canvas: HTMLCanvasElement, srgb = false): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/**
 * Derive a tangent-space normal map from a height canvas (Sobel).
 * Returns null where ImageData is unavailable (headless stubs, old browsers).
 */
export function heightToNormal(height: HTMLCanvasElement, strength = 2): THREE.CanvasTexture | null {
  try {
    const ctx = height.getContext('2d');
    if (!ctx || typeof ctx.getImageData !== 'function') return null;
    const S = height.width;
    const src = ctx.getImageData(0, 0, S, S).data;
    const [out, octx] = canvasOf(S);
    const img = octx.createImageData(S, S);
    const h = (x: number, y: number) =>
      src[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = (h(x - 1, y) - h(x + 1, y)) * strength;
        const dy = (h(x, y - 1) - h(x, y + 1)) * strength;
        const inv = 1 / Math.hypot(dx, dy, 1);
        const i = (y * S + x) * 4;
        img.data[i] = (dx * inv * 0.5 + 0.5) * 255;
        img.data[i + 1] = (dy * inv * 0.5 + 0.5) * 255;
        img.data[i + 2] = inv * 255;
        img.data[i + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    return toTexture(out);
  } catch {
    return null;
  }
}

/** Woven fabric (cotton/linen): interlaced warp/weft threads. */
export function getFabricTextures(kind: 'cotton' | 'linen' | 'velvet'): TextureSet {
  const key = `fabric:${kind}`;
  const hit = setCache.get(key);
  if (hit) return hit;

  const S = 512;
  const rand = rng(kind.length * 131 + 17);
  const [c, ctx] = canvasOf(S);
  const [hc, hctx] = canvasOf(S);
  ctx.fillStyle = '#e6e2da';
  ctx.fillRect(0, 0, S, S);
  hctx.fillStyle = '#808080';
  hctx.fillRect(0, 0, S, S);

  const thread = kind === 'linen' ? 5 : 3;
  for (let y = 0; y < S; y += thread) {
    for (let x = 0; x < S; x += thread) {
      const over = ((x + y) / thread) % 2 === 0;
      const shade = over ? 232 + rand() * 18 : 205 + rand() * 18;
      ctx.fillStyle = `rgb(${shade},${shade - 4},${shade - 12})`;
      ctx.fillRect(x, y, thread, thread);
      const hv = over ? 168 : 96;
      hctx.fillStyle = `rgb(${hv},${hv},${hv})`;
      hctx.fillRect(x, y, thread, thread);
    }
  }
  if (kind === 'linen') {
    // slubs: occasional thicker, lighter yarn runs
    for (let i = 0; i < 26; i++) {
      const y = Math.floor(rand() * S);
      ctx.fillStyle = 'rgba(245,240,228,0.5)';
      ctx.fillRect(0, y, S, 2);
    }
  }
  if (kind === 'velvet') {
    // pile: fine vertical noise, almost no weave structure
    for (let i = 0; i < 9000; i++) {
      const v = 215 + rand() * 35;
      ctx.fillStyle = `rgb(${v},${v},${v + 4})`;
      ctx.fillRect(rand() * S, rand() * S, 1.4, 2.6);
    }
    hctx.fillStyle = '#8a8a8a';
    hctx.fillRect(0, 0, S, S);
  }

  const [rc, rctx] = canvasOf(S);
  rctx.fillStyle = kind === 'velvet' ? '#d9d9d9' : '#c8c8c8';
  rctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 2500; i++) {
    const v = 180 + rand() * 50;
    rctx.fillStyle = `rgb(${v},${v},${v})`;
    rctx.fillRect(rand() * S, rand() * S, 2, 2);
  }

  const set: TextureSet = applyRepeat({
    map: toTexture(c, true),
    roughnessMap: toTexture(rc),
    normalMap: heightToNormal(hc, kind === 'velvet' ? 0.7 : 1.6),
  }, 3);
  setCache.set(key, set);
  return set;
}

/** Leather: pebbled cellular grain. */
export function getLeatherTextures(synthetic = false): TextureSet {
  const key = synthetic ? 'leather:synthetic' : 'leather:full';
  const hit = setCache.get(key);
  if (hit) return hit;

  const S = 512;
  const rand = rng(synthetic ? 991 : 557);
  const [c, ctx] = canvasOf(S);
  const [hc, hctx] = canvasOf(S);
  ctx.fillStyle = '#ded8d2';
  ctx.fillRect(0, 0, S, S);
  hctx.fillStyle = '#7a7a7a';
  hctx.fillRect(0, 0, S, S);

  const cells = synthetic ? 2600 : 1500;
  const cellR = synthetic ? 5 : 8;
  for (let i = 0; i < cells; i++) {
    const x = rand() * S, y = rand() * S;
    const r = cellR * (0.55 + rand() * 0.8);
    const shade = 205 + rand() * 40;
    ctx.fillStyle = `rgb(${shade},${shade - 5},${shade - 12})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.7 + rand() * 0.5), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    const hv = 130 + rand() * 70;
    hctx.fillStyle = `rgb(${hv},${hv},${hv})`;
    hctx.beginPath();
    hctx.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2);
    hctx.fill();
  }
  // creases between cells
  ctx.strokeStyle = 'rgba(120,110,100,0.35)';
  hctx.strokeStyle = 'rgba(40,40,40,0.6)';
  for (let i = 0; i < 300; i++) {
    const x = rand() * S, y = rand() * S;
    ctx.lineWidth = hctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rand() - 0.5) * 22, y + (rand() - 0.5) * 22); ctx.stroke();
    hctx.beginPath(); hctx.moveTo(x, y); hctx.lineTo(x + (rand() - 0.5) * 22, y + (rand() - 0.5) * 22); hctx.stroke();
  }

  const [rc, rctx] = canvasOf(S);
  rctx.fillStyle = '#8f8f8f';
  rctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 1200; i++) {
    const v = 120 + rand() * 60;
    rctx.fillStyle = `rgb(${v},${v},${v})`;
    rctx.fillRect(rand() * S, rand() * S, 3, 3);
  }

  const set: TextureSet = applyRepeat({
    map: toTexture(c, true),
    roughnessMap: toTexture(rc),
    normalMap: heightToNormal(hc, 1.1),
  }, 2);
  setCache.set(key, set);
  return set;
}

/** Brushed metal: fine horizontal streaks drive roughness variation. */
export function getMetalTextures(kind: 'stainless-steel' | 'aluminum' | 'iron'): TextureSet {
  const key = `metal:${kind}`;
  const hit = setCache.get(key);
  if (hit) return hit;

  const S = 512;
  const rand = rng(kind === 'iron' ? 331 : 223);
  const [rc, rctx] = canvasOf(S);
  const base = kind === 'iron' ? 150 : 92;
  rctx.fillStyle = `rgb(${base},${base},${base})`;
  rctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 1600; i++) {
    const y = rand() * S;
    const v = base + (rand() - 0.5) * 70;
    rctx.strokeStyle = `rgba(${v},${v},${v},0.5)`;
    rctx.lineWidth = rand() * 1.4;
    rctx.beginPath();
    rctx.moveTo(0, y);
    rctx.lineTo(S, y + (rand() - 0.5) * 3);
    rctx.stroke();
  }
  if (kind === 'iron') {
    for (let i = 0; i < 500; i++) {
      const v = 130 + rand() * 80;
      rctx.fillStyle = `rgba(${v},${v},${v},0.4)`;
      rctx.fillRect(rand() * S, rand() * S, 2.5, 2.5);
    }
  }

  const [c, ctx] = canvasOf(S);
  ctx.fillStyle = '#f2f2f2';
  ctx.fillRect(0, 0, S, S);

  const set: TextureSet = {
    map: toTexture(c, true),
    roughnessMap: toTexture(rc),
    normalMap: null,
  };
  setCache.set(key, set);
  return set;
}

/** Marble: soft field with wandering veins. */
export function getMarbleTextures(): TextureSet {
  const key = 'marble';
  const hit = setCache.get(key);
  if (hit) return hit;

  const S = 512;
  const rand = rng(777);
  const [c, ctx] = canvasOf(S);
  ctx.fillStyle = '#eceae5';
  ctx.fillRect(0, 0, S, S);
  // cloudy patches
  for (let i = 0; i < 40; i++) {
    const g = ctx.createRadialGradient(rand() * S, rand() * S, 4, rand() * S, rand() * S, 60 + rand() * 120);
    const tone = rand() > 0.5 ? '224,222,216' : '240,238,233';
    g.addColorStop(0, `rgba(${tone},0.5)`);
    g.addColorStop(1, `rgba(${tone},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  }
  // veins: random walks with tapering width
  for (let v = 0; v < 9; v++) {
    let x = rand() * S, y = rand() * S;
    let angle = rand() * Math.PI * 2;
    const steps = 60 + rand() * 80;
    ctx.strokeStyle = v < 2 ? 'rgba(105,100,95,0.55)' : 'rgba(140,135,128,0.35)';
    for (let i = 0; i < steps; i++) {
      ctx.lineWidth = Math.max(0.4, 2.2 * (1 - i / steps) + rand() * 0.6);
      ctx.beginPath();
      ctx.moveTo(x, y);
      angle += (rand() - 0.5) * 0.65;
      x += Math.cos(angle) * 7;
      y += Math.sin(angle) * 7;
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }
  const [rc, rctx] = canvasOf(S);
  rctx.fillStyle = '#4d4d4d';
  rctx.fillRect(0, 0, S, S);

  const set: TextureSet = { map: toTexture(c, true), roughnessMap: toTexture(rc), normalMap: null };
  setCache.set(key, set);
  return set;
}

/** Concrete: blotchy mineral field with speckle and pores. */
export function getConcreteTextures(): TextureSet {
  const key = 'concrete';
  const hit = setCache.get(key);
  if (hit) return hit;

  const S = 512;
  const rand = rng(424);
  const [c, ctx] = canvasOf(S);
  const [hc, hctx] = canvasOf(S);
  ctx.fillStyle = '#ddd9d2';
  ctx.fillRect(0, 0, S, S);
  hctx.fillStyle = '#808080';
  hctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 60; i++) {
    const g = ctx.createRadialGradient(rand() * S, rand() * S, 2, rand() * S, rand() * S, 40 + rand() * 110);
    const tone = rand() > 0.5 ? '200,196,188' : '232,229,222';
    g.addColorStop(0, `rgba(${tone},0.55)`);
    g.addColorStop(1, `rgba(${tone},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  }
  for (let i = 0; i < 5200; i++) {
    const v = 175 + rand() * 70;
    ctx.fillStyle = `rgb(${v},${v - 3},${v - 9})`;
    ctx.fillRect(rand() * S, rand() * S, 1.6, 1.6);
  }
  for (let i = 0; i < 260; i++) { // pores
    const x = rand() * S, y = rand() * S, r = 0.8 + rand() * 2;
    ctx.fillStyle = 'rgba(105,100,94,0.5)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    hctx.fillStyle = 'rgba(30,30,30,0.8)';
    hctx.beginPath(); hctx.arc(x, y, r, 0, Math.PI * 2); hctx.fill();
  }
  const [rc, rctx] = canvasOf(S);
  rctx.fillStyle = '#e2e2e2';
  rctx.fillRect(0, 0, S, S);

  const set: TextureSet = applyRepeat({
    map: toTexture(c, true),
    roughnessMap: toTexture(rc),
    normalMap: heightToNormal(hc, 0.9),
  }, 1.5);
  setCache.set(key, set);
  return set;
}

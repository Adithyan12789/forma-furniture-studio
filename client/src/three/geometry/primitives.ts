import * as THREE from 'three';

/**
 * Reusable procedural geometry components.
 * Every function returns a Mesh with correct normals/UVs, castShadow and
 * receiveShadow enabled, positioned in meters relative to its parent group.
 * Generators compose these — they never hand-roll raw geometry inline.
 */

function finish(mesh: THREE.Mesh, name: string): THREE.Mesh {
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Box with beveled edges, built by extruding a rounded rectangle profile. */
export function roundedSlab(
  name: string,
  width: number,
  height: number,
  depth: number,
  radius = 0.008,
  material?: THREE.Material,
): THREE.Mesh {
  const r = Math.min(radius, width / 2 - 0.001, depth / 2 - 0.001);
  const shape = new THREE.Shape();
  const x = -width / 2, y = -depth / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + depth - r);
  shape.quadraticCurveTo(x + width, y + depth, x + width - r, y + depth);
  shape.lineTo(x + r, y + depth);
  shape.quadraticCurveTo(x, y + depth, x, y + depth - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
    curveSegments: 6,
  });
  geo.rotateX(-Math.PI / 2); // profile (XZ) -> slab standing in Y, base at y=0
  return finish(new THREE.Mesh(geo, material), name);
}

/** Straight tapered box leg (wider at top than at floor). */
export function taperedLeg(
  name: string,
  height: number,
  topSize: number,
  bottomSize: number,
  material?: THREE.Material,
): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(
    topSize * 0.72, bottomSize * 0.72, height, 4, 1,
  );
  geo.rotateY(Math.PI / 4); // flat faces, not corners, face outward
  geo.translate(0, height / 2, 0);
  return finish(new THREE.Mesh(geo, material), name);
}

/** Simple rectangular beam between two points (stretchers, aprons, rails). */
export function beam(
  name: string,
  length: number,
  thickness: number,
  depth: number,
  material?: THREE.Material,
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(length, thickness, depth);
  return finish(new THREE.Mesh(geo, material), name);
}

/** Slightly crowned upholstered cushion (scaled, subdivided sphere cap look). */
export function cushion(
  name: string,
  width: number,
  height: number,
  depth: number,
  material?: THREE.Material,
): THREE.Mesh {
  const geo = new THREE.SphereGeometry(0.5, 24, 16);
  geo.scale(width, height, depth);
  geo.translate(0, height / 2, 0);
  return finish(new THREE.Mesh(geo, material), name);
}

/**
 * Curved horizontal backrest slat: a shallow arc segment of a large cylinder,
 * giving the gentle lumbar curve of a real dining chair splat/slat.
 */
export function curvedSlat(
  name: string,
  width: number,
  height: number,
  thickness: number,
  curveDepth = 0.02,
  material?: THREE.Material,
): THREE.Mesh {
  const radius = (width * width) / (8 * curveDepth) + curveDepth / 2;
  const theta = 2 * Math.asin(Math.min(1, width / 2 / radius));
  const geo = new THREE.CylinderGeometry(
    radius, radius, height, 24, 1, true, -theta / 2, theta,
  );
  geo.rotateZ(Math.PI / 2); // axis -> X (slat runs horizontally)
  geo.rotateY(Math.PI / 2);
  // The open cylinder wall has no thickness; pair it with volume via a second
  // scaled pass is overkill — instead use a thin extruded arc profile:
  const shape = new THREE.Shape();
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps - 0.5) * width;
    const z = curveDepth * (1 - Math.pow(t / (width / 2), 2));
    if (i === 0) shape.moveTo(t, z); else shape.lineTo(t, z);
  }
  for (let i = steps; i >= 0; i--) {
    const t = (i / steps - 0.5) * width;
    const z = curveDepth * (1 - Math.pow(t / (width / 2), 2)) - thickness;
    shape.lineTo(t, z);
  }
  shape.closePath();
  const slab = new THREE.ExtrudeGeometry(shape, {
    depth: height, bevelEnabled: false, curveSegments: 4,
  });
  slab.rotateX(-Math.PI / 2); // extrusion becomes +Y, base at y=0
  slab.translate(0, 0, curveDepth - thickness / 2);
  geo.dispose();
  return finish(new THREE.Mesh(slab, material), name);
}

/** Turned-look cylindrical support via a lathe profile. */
export function latheSupport(
  name: string,
  height: number,
  maxRadius: number,
  material?: THREE.Material,
): THREE.Mesh {
  const pts: THREE.Vector2[] = [];
  const profile: [number, number][] = [
    [0.95, 0], [0.8, 0.025], [0.45, 0.09], [0.52, 0.3], [0.38, 0.5],
    [0.5, 0.68], [0.44, 0.86], [0.62, 0.96], [0.6, 1],
  ];
  for (const [r, y] of profile) pts.push(new THREE.Vector2(r * maxRadius, y * height));
  const geo = new THREE.LatheGeometry(pts, 20);
  return finish(new THREE.Mesh(geo, material), name);
}

/* ------------------------------------------------------------------ */
/* Phase 2 additions: storage/door/drawer/support components           */
/* ------------------------------------------------------------------ */

/** Plain panel (carcass sides, shelves, backs). Base at y=0. */
export function panel(
  name: string,
  width: number,
  height: number,
  thickness: number,
  material?: THREE.Material,
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(width, height, thickness);
  geo.translate(0, height / 2, 0);
  return finish(new THREE.Mesh(geo, material), name);
}

/**
 * Framed cabinet/wardrobe door: stiles + rails around a recessed center
 * panel — the classic shaker profile, built from real geometry.
 * Returns a group with base at y=0, front face toward +z.
 */
export function framedDoor(
  name: string,
  width: number,
  height: number,
  thickness = 0.02,
  material?: THREE.Material,
): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  const rail = Math.min(0.075, width * 0.22);

  const mk = (n: string, w: number, h: number, x: number, y: number, t: number) => {
    const m = panel(n, w, h, t, material);
    m.position.set(x, y, 0);
    group.add(m);
    return m;
  };
  // stiles (full height), rails (between stiles)
  mk('DoorStile', rail, height, -width / 2 + rail / 2, 0, thickness);
  mk('DoorStile', rail, height, width / 2 - rail / 2, 0, thickness);
  mk('DoorRail', width - rail * 2, rail, 0, 0, thickness);
  mk('DoorRail', width - rail * 2, rail, 0, height - rail, thickness);
  // recessed center panel
  const center = panel('DoorPanel', width - rail * 2, height - rail * 2, thickness * 0.45, material);
  center.position.set(0, rail, -thickness * 0.22);
  group.add(center);
  return group;
}

/** Drawer front with a subtle bevelled edge + optional recessed panel line. */
export function drawerFront(
  name: string,
  width: number,
  height: number,
  thickness = 0.018,
  material?: THREE.Material,
): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  const geo = new THREE.BoxGeometry(width, height, thickness);
  const front = finish(new THREE.Mesh(geo, material), name + 'Front');
  front.position.y = height / 2;
  group.add(front);
  const inset = panel(name + 'Inset', width - 0.05, height - 0.05, 0.004, material);
  inset.position.set(0, 0.025, thickness / 2 - 0.001);
  group.add(inset);
  return group;
}

/** Bar handle: two posts + a horizontal bar, front face +z. */
export function barHandle(
  name: string,
  length = 0.12,
  material?: THREE.Material,
): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  const postGeo = new THREE.CylinderGeometry(0.0035, 0.0035, 0.022, 10);
  postGeo.rotateX(Math.PI / 2);
  for (const sx of [-1, 1]) {
    const post = finish(new THREE.Mesh(postGeo, material), 'HandlePost');
    post.position.set(sx * (length / 2 - 0.012), 0, 0.011);
    group.add(post);
  }
  const barGeo = new THREE.CylinderGeometry(0.0045, 0.0045, length, 12);
  barGeo.rotateZ(Math.PI / 2);
  const bar = finish(new THREE.Mesh(barGeo, material), 'HandleBar');
  bar.position.z = 0.024;
  group.add(bar);
  return group;
}

/** Round knob handle. */
export function knobHandle(name: string, radius = 0.014, material?: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  const stemGeo = new THREE.CylinderGeometry(0.004, 0.005, 0.012, 10);
  stemGeo.rotateX(Math.PI / 2);
  const stem = finish(new THREE.Mesh(stemGeo, material), 'KnobStem');
  stem.position.z = 0.006;
  const knob = finish(new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 14), material), 'Knob');
  knob.position.z = 0.012 + radius * 0.7;
  group.add(stem, knob);
  return group;
}

/** Straight cylindrical support leg (metal or wood), base at y=0. */
export function cylinderSupport(
  name: string,
  height: number,
  radius: number,
  material?: THREE.Material,
): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(radius, radius * 0.9, height, 16);
  geo.translate(0, height / 2, 0);
  return finish(new THREE.Mesh(geo, material), name);
}

/** Rounded box via scaled sphere segments — soft upholstered forms. */
export function softBlock(
  name: string,
  width: number,
  height: number,
  depth: number,
  material?: THREE.Material,
): THREE.Mesh {
  const geo = new THREE.SphereGeometry(0.5, 20, 14);
  geo.scale(width, height, depth);
  geo.translate(0, height / 2, 0);
  const mesh = new THREE.Mesh(geo, material);
  // Sphere-scaled blocks shade smoothly but read too blobby at glancing
  // angles; flatten very slightly top/bottom via normals is overkill here.
  return finish(mesh, name);
}

/** Vertical slat screen (headboards, cabinet backs): slats + two rails. */
export function slatScreen(
  name: string,
  width: number,
  height: number,
  slatWidth = 0.045,
  gap = 0.018,
  thickness = 0.018,
  material?: THREE.Material,
): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  const count = Math.max(2, Math.floor((width + gap) / (slatWidth + gap)));
  const used = count * slatWidth + (count - 1) * gap;
  const startX = -used / 2 + slatWidth / 2;
  for (let i = 0; i < count; i++) {
    const slat = panel('Slat', slatWidth, height, thickness, material);
    slat.position.set(startX + i * (slatWidth + gap), 0, 0);
    group.add(slat);
  }
  for (const ry of [0.02, height - 0.07]) {
    const rail = beam('SlatRail', used, 0.05, thickness * 0.8, material);
    rail.position.set(0, ry + 0.025, -thickness * 0.4);
    group.add(rail);
  }
  return group;
}

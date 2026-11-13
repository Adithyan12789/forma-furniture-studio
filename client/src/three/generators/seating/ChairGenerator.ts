import * as THREE from 'three';
import type { FurnitureConfig } from '@shared/types/furniture';
import { materialForComponent } from '../../materials/materialLibrary';
import { roundedSlab, taperedLeg, beam, curvedSlat, cushion } from '../../geometry/primitives';

/**
 * ChairGenerator — procedural wooden dining chair.
 *
 * Framework-independent: consumes a FurnitureConfig, returns a THREE.Group
 * whose origin is the base center (floor). No React, no AI, no I/O.
 *
 * Structure (real dining-chair construction):
 * - 4 tapered legs; rear legs continue up and lean back to form the
 *   backrest uprights (splayed slightly at the floor like real chairs).
 * - Seat slab with aprons beneath; side stretchers + one front stretcher.
 * - Two curved back slats + a shaped top rail between the uprights.
 * - Optional seat cushion (component "cushion", fabric material).
 *
 * Config params (components[].params):
 * - legs:      { legTop, legBottom, splay }
 * - backrest:  { slats, lean (radians), curve }
 * - cushion:   enabled via components
 * - stretchers: enabled via components
 */

export interface ChairParams {
  width: number;
  height: number;
  depth: number;
  seatHeight: number;
  legTop: number;
  legBottom: number;
  splay: number;
  slats: number;
  lean: number;
  curve: number;
  showStretchers: boolean;
  showCushion: boolean;
  showBackrest: boolean;
}

export function chairParamsFromConfig(config: FurnitureConfig): ChairParams {
  const comp = (key: string) => config.components.find((c) => c.key === key);
  const num = (v: unknown, fallback: number) => (typeof v === 'number' ? v : fallback);
  const { width, height, depth } = config.dimensions;
  return {
    width, height, depth,
    seatHeight: num(comp('seat')?.params.seatHeight, Math.min(0.47, Math.max(0.4, height * 0.5))),
    legTop: num(comp('legs')?.params.legTop, 0.042),
    legBottom: num(comp('legs')?.params.legBottom, 0.026),
    splay: num(comp('legs')?.params.splay, 0.02),
    slats: Math.round(num(comp('backrest')?.params.slats, 2)),
    lean: num(comp('backrest')?.params.lean, 0.1),
    curve: num(comp('backrest')?.params.curve, 0.018),
    showStretchers: comp('stretchers')?.enabled ?? true,
    showCushion: comp('cushion')?.enabled ?? false,
    showBackrest: comp('backrest')?.enabled ?? true,
  };
}

export function generateChair(config: FurnitureConfig): THREE.Group {
  const p = chairParamsFromConfig(config);
  const wood = materialForComponent(config.materials, 'frame', 'oak');
  const fabric = materialForComponent(config.materials, 'cushion', 'linen');

  const chair = new THREE.Group();
  chair.name = 'Chair';

  const seatT = 0.035;                 // seat slab thickness
  const seatY = p.seatHeight;          // top of legs / underside area
  const legH = seatY - 0.01;           // legs run to just under the seat
  const insetX = p.legTop / 2 + 0.012; // leg center inset from seat edge
  const insetZ = p.legTop / 2 + 0.012;
  const lx = p.width / 2 - insetX;
  const lz = p.depth / 2 - insetZ;

  // --- legs -------------------------------------------------------------
  const legs = new THREE.Group();
  legs.name = 'Legs';
  const legPositions: [number, number, boolean][] = [
    [-lx, -lz, false], [lx, -lz, false],   // front (z- is front face side)
    [-lx, lz, true], [lx, lz, true],       // rear — extend into backrest
  ];
  for (const [x, z, isRear] of legPositions) {
    const leg = taperedLeg(isRear ? 'RearLeg' : 'FrontLeg', legH, p.legTop, p.legBottom, wood);
    leg.position.set(x, 0, z);
    // Splay: tilt outward from the seat center.
    leg.rotation.z = -Math.sign(x) * (p.splay / legH);
    leg.rotation.x = Math.sign(z) * (p.splay / legH);
    legs.add(leg);

    if (isRear) {
      // Rear upright: continues from seat level to full height, leaning back.
      const upH = p.height - seatY + 0.02;
      const upright = taperedLeg('BackUpright', upH, p.legTop * 0.92, p.legTop * 0.78, wood);
      upright.position.set(x, seatY - 0.01, z);
      upright.rotation.x = p.lean; // lean backwards (+z)
      legs.add(upright);
    }
  }
  chair.add(legs);

  // --- seat + aprons ------------------------------------------------------
  const seatGroup = new THREE.Group();
  seatGroup.name = 'Seat';
  const seat = roundedSlab('SeatSlab', p.width - 0.01, seatT, p.depth - 0.01, 0.01, wood);
  seat.position.y = seatY - seatT;
  seatGroup.add(seat);

  const apronT = 0.022, apronH = 0.07;
  const apronY = seatY - seatT - apronH / 2;
  const front = beam('FrontApron', p.width - insetX * 2, apronH, apronT, wood);
  front.position.set(0, apronY, -(lz));
  const back = beam('BackApron', p.width - insetX * 2, apronH, apronT, wood);
  back.position.set(0, apronY, lz);
  const sideL = beam('SideApron', p.depth - insetZ * 2, apronH, apronT, wood);
  sideL.rotation.y = Math.PI / 2;
  sideL.position.set(-lx, apronY, 0);
  const sideR = sideL.clone();
  sideR.name = 'SideApron';
  sideR.position.x = lx;
  seatGroup.add(front, back, sideL, sideR);
  chair.add(seatGroup);

  // --- stretchers ---------------------------------------------------------
  if (p.showStretchers) {
    const stretchers = new THREE.Group();
    stretchers.name = 'Stretchers';
    const sT = 0.016, sY = 0.16;
    const left = beam('SideStretcher', p.depth - insetZ * 2, sT, sT, wood);
    left.rotation.y = Math.PI / 2;
    left.position.set(-(lx + 0.004), sY, 0);
    const right = left.clone();
    right.name = 'SideStretcher';
    right.position.x = lx + 0.004;
    const frontS = beam('FrontStretcher', p.width - insetX * 2, sT, sT, wood);
    frontS.position.set(0, sY + 0.05, -(lz + 0.004));
    stretchers.add(left, right, frontS);
    chair.add(stretchers);
  }

  // --- backrest -----------------------------------------------------------
  if (p.showBackrest) {
  const backrest = new THREE.Group();
  backrest.name = 'Backrest';
  const backZ = lz;
  const backBaseY = seatY + 0.06;
  const backTopY = p.height - 0.055;
  const slatSpan = backTopY - backBaseY - 0.1;

  for (let i = 0; i < p.slats; i++) {
    const t = p.slats === 1 ? 0.45 : i / (p.slats - 1);
    const y = backBaseY + 0.08 + t * slatSpan * 0.72;
    const slat = curvedSlat('BackSlat', p.width - insetX * 2 - 0.01, 0.085, 0.016, p.curve, wood);
    // Follow the lean: higher slats sit further back.
    const leanOffset = Math.tan(p.lean) * (y - seatY);
    slat.position.set(0, y, backZ + leanOffset - 0.004);
    backrest.add(slat);
  }

  const rail = curvedSlat('TopRail', p.width - insetX * 2 - 0.005, 0.07, 0.02, p.curve * 0.7, wood);
  const railY = backTopY - 0.02;
  rail.position.set(0, railY, backZ + Math.tan(p.lean) * (railY - seatY) - 0.002);
  backrest.add(rail);
  chair.add(backrest);
  }

  // --- optional cushion -----------------------------------------------------
  if (p.showCushion) {
    const pad = cushion('SeatCushion', p.width - 0.06, 0.045, p.depth - 0.07, fabric);
    pad.position.set(0, seatY + 0.002, -0.005);
    pad.name = 'Cushion';
    chair.add(pad);
  }

  return chair;
}

/** Default Phase 1 test-chair configuration (standard dining chair, meters). */
export const DEFAULT_CHAIR_CONFIG: FurnitureConfig = {
  category: 'dining-chair',
  generator: 'chair',
  dimensions: { width: 0.46, height: 0.92, depth: 0.52 },
  components: [
    { key: 'legs', enabled: true, params: { legTop: 0.042, legBottom: 0.026, splay: 0.02 } },
    { key: 'seat', enabled: true, params: {} },
    { key: 'backrest', enabled: true, params: { slats: 2, lean: 0.1, curve: 0.018 } },
    { key: 'stretchers', enabled: true, params: {} },
    { key: 'cushion', enabled: false, params: {} },
  ],
  materials: [{ component: 'frame', material: 'oak' }],
  style: 'Scandinavian dining chair',
};

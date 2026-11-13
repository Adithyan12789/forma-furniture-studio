import * as THREE from 'three';
import type { FurnitureConfig } from '@shared/types/furniture';
import { materialForComponent } from '../../materials/materialLibrary';
import { roundedSlab, beam, panel, cushion, slatScreen, taperedLeg } from '../../geometry/primitives';
import { enabled, strParam } from '../generatorUtils';

/**
 * BedGenerator — side rails, slatted base, headboard (panel or slatted),
 * optional footboard, mattress and pillows. Dimensions: width = bed width,
 * depth = bed length, height = headboard height. Head at +z.
 */
export function generateBed(config: FurnitureConfig): THREE.Group {
  const { width: W, height: H, depth: L } = config.dimensions;
  const wood = materialForComponent(config.materials, 'frame', 'oak');
  const fabric = materialForComponent(config.materials, 'mattress', 'cotton');
  const pillowMat = materialForComponent(config.materials, 'pillows', 'linen');

  const bed = new THREE.Group();
  bed.name = 'Bed';

  const legH = 0.14;
  const railH = 0.22;
  const frameTop = legH + railH;
  const headStyle = strParam(config, 'headboard', 'style', 'panel');
  const showFoot = enabled(config, 'footboard', true);
  const showPillows = enabled(config, 'pillows', true);

  // --- legs ---
  const legs = new THREE.Group();
  legs.name = 'Legs';
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    const leg = taperedLeg('BedLeg', legH, 0.05, 0.036, wood);
    leg.position.set(x * (W / 2 - 0.05), 0, z * (L / 2 - 0.05));
    legs.add(leg);
  }
  bed.add(legs);

  // --- frame rails ---
  const frame = new THREE.Group();
  frame.name = 'Frame';
  for (const sx of [-1, 1]) {
    const rail = beam('SideRail', L - 0.06, railH, 0.028, wood);
    rail.rotation.y = Math.PI / 2;
    rail.position.set(sx * (W / 2 - 0.03), legH + railH / 2, 0);
    frame.add(rail);
  }
  const headRail = beam('HeadRail', W - 0.06, railH, 0.028, wood);
  headRail.position.set(0, legH + railH / 2, L / 2 - 0.03);
  frame.add(headRail);
  if (showFoot) {
    const footRail = beam('FootRail', W - 0.06, railH + 0.1, 0.028, wood);
    footRail.position.set(0, legH + (railH + 0.1) / 2, -(L / 2 - 0.03));
    frame.add(footRail);
  }
  bed.add(frame);

  // --- slatted base ---
  const slats = new THREE.Group();
  slats.name = 'BaseSlats';
  const slatCount = Math.floor(L / 0.11);
  for (let i = 0; i < slatCount; i++) {
    const slat = beam('BaseSlat', W - 0.1, 0.018, 0.055, wood);
    slat.position.set(0, frameTop - 0.03, -L / 2 + 0.1 + i * 0.11);
    slats.add(slat);
  }
  bed.add(slats);

  // --- headboard ---
  if (enabled(config, 'headboard', true)) {
  const headboard = new THREE.Group();
  headboard.name = 'Headboard';
  const hbH = H - frameTop + 0.12;
  if (headStyle === 'slats') {
    const screen = slatScreen('SlattedHeadboard', W - 0.04, hbH, 0.05, 0.02, 0.02, wood);
    screen.position.set(0, legH + 0.04, L / 2 - 0.015);
    headboard.add(screen);
  } else {
    const board = panel('HeadboardPanel', W - 0.02, hbH, 0.035, wood);
    board.position.set(0, legH + 0.04, L / 2 - 0.02);
    headboard.add(board);
    const cap = beam('HeadboardCap', W + 0.01, 0.035, 0.05, wood);
    cap.position.set(0, legH + 0.04 + hbH + 0.017, L / 2 - 0.02);
    headboard.add(cap);
  }
  bed.add(headboard);
  }

  // --- mattress ---
  const mattress = roundedSlab('Mattress', W - 0.04, 0.2, L - 0.04, 0.03, fabric);
  mattress.position.y = frameTop - 0.02;
  bed.add(mattress);

  // --- pillows ---
  if (showPillows) {
    const pillows = new THREE.Group();
    pillows.name = 'Pillows';
    const pillowW = W > 1.2 ? (W - 0.3) / 2 : W - 0.25;
    const count = W > 1.2 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const pillow = cushion('Pillow', pillowW, 0.13, 0.42, pillowMat);
      pillow.position.set(
        count === 2 ? -W / 4 + (i * W) / 2 + 0.02 : 0,
        frameTop + 0.19,
        L / 2 - 0.38,
      );
      pillow.rotation.x = -0.32;
      pillows.add(pillow);
    }
    bed.add(pillows);
  }

  return bed;
}

export const DEFAULT_BED_CONFIG: FurnitureConfig = {
  category: 'bed',
  generator: 'bed',
  dimensions: { width: 1.6, height: 1.05, depth: 2.1 },
  components: [
    { key: 'headboard', enabled: true, params: { style: 'panel' } },
    { key: 'footboard', enabled: true, params: {} },
    { key: 'pillows', enabled: true, params: {} },
    { key: 'mattress', enabled: true, params: {} },
  ],
  materials: [
    { component: 'frame', material: 'oak' },
    { component: 'mattress', material: 'cotton', color: '#e8e4da' },
    { component: 'pillows', material: 'linen', color: '#ddd5c3' },
  ],
  style: 'Scandinavian double bed',
};

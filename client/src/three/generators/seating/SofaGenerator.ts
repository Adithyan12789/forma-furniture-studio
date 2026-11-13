import * as THREE from 'three';
import type { FurnitureConfig } from '@shared/types/furniture';
import { materialForComponent } from '../../materials/materialLibrary';
import { cushion, softBlock, cylinderSupport } from '../../geometry/primitives';
import { enabled, numParam } from '../generatorUtils';

/**
 * SofaGenerator — upholstered seating for 1–3 seats (armchair to sofa).
 * Low platform base, seat cushions, tilted back cushions, rounded arms,
 * short feet. The armchair is the same generator with seats=1 and its own
 * proportions. Origin: base center, front faces -z.
 */
export function generateSofa(config: FurnitureConfig): THREE.Group {
  const { width: W, height: H, depth: D } = config.dimensions;
  const fabric = materialForComponent(config.materials, 'upholstery', 'velvet');
  const wood = materialForComponent(config.materials, 'frame', 'walnut');

  const seats = Math.max(1, Math.min(4, Math.round(numParam(config, 'seat', 'seats', 2))));
  const showArms = enabled(config, 'armrests', true);

  const sofa = new THREE.Group();
  sofa.name = config.generator === 'armchair' ? 'Armchair' : 'Sofa';

  const feetH = 0.09;
  const baseH = 0.26;
  const armW = showArms ? Math.min(0.22, W * 0.12) : 0;
  const armH = H * 0.68;
  const innerW = W - armW * 2;
  const seatY = feetH + baseH;
  const seatDepth = D * 0.58;

  // --- feet ---
  if (enabled(config, 'feet', true)) {
  const feet = new THREE.Group();
  feet.name = 'Feet';
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    const foot = cylinderSupport('Foot', feetH, 0.024, wood);
    foot.position.set(x * (W / 2 - 0.09), 0, z * (D / 2 - 0.09));
    feet.add(foot);
  }
  sofa.add(feet);
  }

  // --- base platform ---
  const base = softBlock('Base', W - 0.02, baseH + 0.1, D - 0.02, fabric);
  base.position.y = feetH - 0.03;
  base.scale.y = 1;
  sofa.add(base);

  // --- back frame ---
  const showBack = enabled(config, 'backrest', true);
  if (showBack) {
  const backFrame = softBlock('BackFrame', W - 0.02, H - seatY - 0.02, D - seatDepth - 0.02, fabric);
  backFrame.position.set(0, seatY - 0.02, seatDepth / 2 + 0.01);
  sofa.add(backFrame);
  }

  // --- arms ---
  if (showArms) {
    const arms = new THREE.Group();
    arms.name = 'Armrests';
    for (const sx of [-1, 1]) {
      const arm = softBlock('Armrest', armW + 0.06, armH - seatY + 0.14, D - 0.04, fabric);
      arm.position.set(sx * (W / 2 - armW / 2 - 0.01), seatY - 0.12, 0);
      arms.add(arm);
    }
    sofa.add(arms);
  }

  // --- seat cushions ---
  const seatGroup = new THREE.Group();
  seatGroup.name = 'SeatCushions';
  const cushionW = innerW / seats;
  for (let i = 0; i < seats; i++) {
    const c = cushion('SeatCushion', cushionW - 0.025, 0.17, seatDepth, fabric);
    c.position.set(-innerW / 2 + cushionW * (i + 0.5), seatY + 0.02, -D / 2 + seatDepth / 2 + 0.03);
    seatGroup.add(c);
  }
  sofa.add(seatGroup);

  // --- back cushions ---
  if (showBack) {
  const backGroup = new THREE.Group();
  backGroup.name = 'BackCushions';
  for (let i = 0; i < seats; i++) {
    const c = cushion('BackCushion', cushionW - 0.03, H - seatY - 0.06, 0.19, fabric);
    c.position.set(-innerW / 2 + cushionW * (i + 0.5), seatY + 0.1, seatDepth / 2 - 0.02);
    c.rotation.x = -0.13;
    backGroup.add(c);
  }
  sofa.add(backGroup);
  }

  return sofa;
}

export const DEFAULT_SOFA_CONFIG: FurnitureConfig = {
  category: 'sofa',
  generator: 'sofa',
  dimensions: { width: 1.9, height: 0.86, depth: 0.92 },
  components: [
    { key: 'seat', enabled: true, params: { seats: 2 } },
    { key: 'backrest', enabled: true, params: {} },
    { key: 'armrests', enabled: true, params: {} },
    { key: 'feet', enabled: true, params: {} },
  ],
  materials: [
    { component: 'upholstery', material: 'velvet', color: '#66755f' },
    { component: 'frame', material: 'walnut' },
  ],
  style: 'Mid-century two-seat sofa',
};

export const DEFAULT_ARMCHAIR_CONFIG: FurnitureConfig = {
  category: 'armchair',
  generator: 'armchair',
  dimensions: { width: 0.86, height: 0.88, depth: 0.88 },
  components: [
    { key: 'seat', enabled: true, params: { seats: 1 } },
    { key: 'backrest', enabled: true, params: {} },
    { key: 'armrests', enabled: true, params: {} },
    { key: 'feet', enabled: true, params: {} },
  ],
  materials: [
    { component: 'upholstery', material: 'leather', color: '#8a5a3b' },
    { component: 'frame', material: 'oak' },
  ],
  style: 'Club armchair',
};

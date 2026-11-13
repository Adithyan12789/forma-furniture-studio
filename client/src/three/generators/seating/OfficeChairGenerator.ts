import * as THREE from 'three';
import type { FurnitureConfig } from '@shared/types/furniture';
import { materialForComponent } from '../../materials/materialLibrary';
import { cushion, cylinderSupport, beam } from '../../geometry/primitives';
import { enabled } from '../generatorUtils';

/**
 * OfficeChairGenerator — five-star caster base, gas lift, upholstered
 * seat, curved back panel and optional armrests. Origin: base center.
 */
export function generateOfficeChair(config: FurnitureConfig): THREE.Group {
  const { width: W, height: H, depth: D } = config.dimensions;
  const fabric = materialForComponent(config.materials, 'upholstery', 'synthetic-leather');
  const metal = materialForComponent(config.materials, 'hardware', 'aluminum');
  const plastic = materialForComponent(config.materials, 'shell', 'plastic');

  const chair = new THREE.Group();
  chair.name = 'OfficeChair';

  const seatH = H * 0.48;
  const baseR = Math.max(W, D) * 0.52;

  // --- five-star base + casters ---
  const base = new THREE.Group();
  base.name = 'Base';
  const hub = cylinderSupport('Hub', 0.05, 0.028, metal);
  hub.position.y = 0.055;
  base.add(hub);
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const spoke = beam('Spoke', baseR, 0.024, 0.04, plastic);
    spoke.position.set(Math.cos(angle) * baseR / 2, 0.055, Math.sin(angle) * baseR / 2);
    spoke.rotation.y = -angle;
    base.add(spoke);
    const wheelGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.02, 18);
    wheelGeo.rotateX(Math.PI / 2);
    const wheel = new THREE.Mesh(wheelGeo, plastic);
    wheel.name = 'Caster';
    wheel.castShadow = true;
    wheel.rotation.y = -angle;
    wheel.position.set(Math.cos(angle) * baseR, 0.032, Math.sin(angle) * baseR);
    base.add(wheel);
  }
  chair.add(base);

  // --- gas lift ---
  const lift = cylinderSupport('GasLift', seatH - 0.1, 0.024, metal);
  lift.position.y = 0.07;
  chair.add(lift);

  // --- seat ---
  const seat = cushion('Seat', W * 0.94, 0.09, D * 0.92, fabric);
  seat.position.set(0, seatH - 0.045, 0.01);
  chair.add(seat);
  const underShell = beam('SeatShell', W * 0.8, 0.025, D * 0.7, plastic);
  underShell.position.set(0, seatH - 0.06, 0.01);
  chair.add(underShell);

  // --- backrest: curved panel + cushion face ---
  const back = new THREE.Group();
  back.name = 'Backrest';
  const backH = H - seatH - 0.04;
  const postL = beam('BackPost', 0.03, backH * 0.5, 0.02, plastic);
  postL.position.set(-W * 0.28, seatH + backH * 0.22, D * 0.42);
  postL.rotation.x = 0.16;
  const postR = postL.clone(); postR.name = 'BackPost'; postR.position.x = W * 0.28;
  back.add(postL, postR);
  const backPad = cushion('BackPad', W * 0.88, backH * 0.8, 0.09, fabric);
  backPad.position.set(0, seatH + backH * 0.45, D * 0.47);
  backPad.rotation.x = 0.1;
  back.add(backPad);
  chair.add(back);

  // --- armrests ---
  if (enabled(config, 'armrests', true)) {
    const arms = new THREE.Group();
    arms.name = 'Armrests';
    for (const sx of [-1, 1]) {
      const post = cylinderSupport('ArmPost', 0.19, 0.014, plastic);
      post.position.set(sx * (W / 2 - 0.02), seatH + 0.01, 0.02);
      const pad = beam('ArmPad', 0.05, 0.025, D * 0.55, plastic);
      pad.position.set(sx * (W / 2 - 0.02), seatH + 0.21, 0.0);
      arms.add(post, pad);
    }
    chair.add(arms);
  }

  return chair;
}

export const DEFAULT_OFFICE_CHAIR_CONFIG: FurnitureConfig = {
  category: 'office-chair',
  generator: 'office-chair',
  dimensions: { width: 0.62, height: 1.05, depth: 0.62 },
  components: [
    { key: 'base', enabled: true, params: {} },
    { key: 'seat', enabled: true, params: {} },
    { key: 'backrest', enabled: true, params: {} },
    { key: 'armrests', enabled: true, params: {} },
  ],
  materials: [
    { component: 'upholstery', material: 'synthetic-leather', color: '#3c4043' },
    { component: 'hardware', material: 'aluminum' },
    { component: 'shell', material: 'plastic', color: '#242628' },
  ],
  style: 'Contemporary office chair',
};

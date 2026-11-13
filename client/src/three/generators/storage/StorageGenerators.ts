import * as THREE from 'three';
import type { FurnitureConfig } from '@shared/types/furniture';
import { materialForComponent } from '../../materials/materialLibrary';
import {
  panel, beam, framedDoor, drawerFront, barHandle, knobHandle, taperedLeg,
} from '../../geometry/primitives';
import { numParam } from '../generatorUtils';

/**
 * Storage generators: wardrobe, cabinet (sideboard) and bookshelf.
 * All share one carcass builder — sides, top, bottom/plinth and a thin
 * back panel — then differ in their fronts and interiors.
 */

interface Carcass {
  group: THREE.Group;
  innerW: number;
  innerH: number;
  innerD: number;
  sideT: number;
}

function carcass(
  name: string, W: number, H: number, D: number,
  material: THREE.Material, opts: { plinth?: number; legH?: number } = {},
): Carcass {
  const group = new THREE.Group();
  group.name = name;
  const sideT = 0.02;
  const plinth = opts.plinth ?? 0;
  const legH = opts.legH ?? 0;
  const base = legH + plinth;
  const bodyH = H - base;

  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(sideT, bodyH, D), material);
    side.name = 'Side';
    side.castShadow = side.receiveShadow = true;
    side.position.set(sx * (W / 2 - sideT / 2), base + bodyH / 2, 0);
    group.add(side);
  }
  const top = panel('Top', W, sideT, D, material);
  top.position.set(0, H - sideT, 0);
  group.add(top);
  const bottom = panel('Bottom', W - sideT * 2, sideT, D - 0.02, material);
  bottom.position.set(0, base, 0);
  group.add(bottom);
  const back = panel('Back', W - sideT * 2, bodyH - sideT, 0.008, material);
  back.position.set(0, base + sideT / 2, D / 2 - 0.012);
  group.add(back);

  if (plinth > 0) {
    const plinthMesh = beam('Plinth', W - 0.06, plinth, 0.018, material);
    plinthMesh.position.set(0, plinth / 2, -(D / 2 - 0.03));
    group.add(plinthMesh);
  }
  if (legH > 0) {
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      const leg = taperedLeg('CabinetLeg', legH, 0.04, 0.028, material);
      leg.position.set(x * (W / 2 - 0.05), 0, z * (D / 2 - 0.05));
      group.add(leg);
    }
  }
  return { group, innerW: W - sideT * 2, innerH: bodyH - sideT * 2, innerD: D - 0.03, sideT };
}

/* ---------------- Wardrobe ---------------- */

export function generateWardrobe(config: FurnitureConfig): THREE.Group {
  const { width: W, height: H, depth: D } = config.dimensions;
  const wood = materialForComponent(config.materials, 'frame', 'oak');
  const metal = materialForComponent(config.materials, 'hardware', 'iron');
  const doors = Math.max(1, Math.min(4, Math.round(numParam(config, 'doors', 'count', 2))));

  const { group } = carcass('Wardrobe', W, H, D, wood, { plinth: 0.08 });
  const bodyBase = 0.08;
  const bodyH = H - bodyBase;

  // cornice
  const cornice = beam('Cornice', W + 0.02, 0.045, D + 0.02, wood);
  cornice.position.set(0, H - 0.032, 0);
  group.add(cornice);

  // doors across the front (-z)
  if (config.components.find((c) => c.key === 'doors')?.enabled ?? true) {
  const doorGroup = new THREE.Group();
  doorGroup.name = 'Doors';
  const doorW = (W - 0.05) / doors;
  const doorH = bodyH - 0.09;
  for (let i = 0; i < doors; i++) {
    const door = framedDoor('WardrobeDoor', doorW - 0.008, doorH, 0.02, wood);
    const x = -W / 2 + 0.025 + doorW * (i + 0.5);
    door.position.set(x, bodyBase + 0.03, -(D / 2 + 0.002));
    door.rotation.y = Math.PI; // face outward (-z)
    doorGroup.add(door);
    const knobSide = i < doors / 2 ? 1 : -1;
    const knob = knobHandle('DoorKnob', 0.015, metal);
    knob.position.set(x + knobSide * (doorW / 2 - 0.055), bodyBase + doorH / 2, -(D / 2 + 0.012));
    knob.rotation.y = Math.PI; // face outward (-z)
    doorGroup.add(knob);
  }
  group.add(doorGroup);
  }
  return group;
}

export const DEFAULT_WARDROBE_CONFIG: FurnitureConfig = {
  category: 'wardrobe',
  generator: 'wardrobe',
  dimensions: { width: 1.2, height: 2.0, depth: 0.6 },
  components: [
    { key: 'doors', enabled: true, params: { count: 2 } },
    { key: 'carcass', enabled: true, params: {} },
  ],
  materials: [{ component: 'frame', material: 'oak' }, { component: 'hardware', material: 'iron' }],
  style: 'Shaker two-door wardrobe',
};

/* ---------------- Cabinet / sideboard ---------------- */

export function generateCabinet(config: FurnitureConfig): THREE.Group {
  const { width: W, height: H, depth: D } = config.dimensions;
  const wood = materialForComponent(config.materials, 'frame', 'walnut');
  const metal = materialForComponent(config.materials, 'hardware', 'stainless-steel');
  const drawers = Math.max(0, Math.min(4, Math.round(numParam(config, 'drawers', 'count', 3))));

  const legH = 0.14;
  const { group } = carcass('Cabinet', W, H, D, wood, { legH });
  const bodyBase = legH;
  const bodyH = H - legH;
  const frontZ = -(D / 2 + 0.002);

  const content = new THREE.Group();
  content.name = 'Fronts';
  const drawerH = drawers > 0 ? Math.min(0.17, bodyH * 0.3) : 0;

  if (drawers > 0) {
    const totalW = W - 0.05;
    const eachW = totalW / drawers;
    for (let i = 0; i < drawers; i++) {
      const front = drawerFront('CabinetDrawer', eachW - 0.008, drawerH - 0.008, 0.018, wood);
      front.position.set(-totalW / 2 + eachW * (i + 0.5), H - drawerH - 0.012, frontZ);
      content.add(front);
      const handle = barHandle('DrawerHandle', Math.min(0.13, eachW * 0.38), metal);
      handle.position.set(-totalW / 2 + eachW * (i + 0.5), H - drawerH / 2 - 0.012, frontZ - 0.002);
      handle.rotation.y = Math.PI;
      content.add(handle);
    }
  }

  const doorAreaH = bodyH - drawerH - 0.03;
  const showDoors = config.components.find((c) => c.key === 'doors')?.enabled ?? true;
  const doorCount = showDoors ? 2 : 0;
  const doorW = (W - 0.05) / doorCount;
  for (let i = 0; i < doorCount; i++) {
    const door = framedDoor('CabinetDoor', doorW - 0.008, doorAreaH, 0.018, wood);
    door.position.set(-W / 2 + 0.025 + doorW * (i + 0.5), bodyBase + 0.015, frontZ);
    door.rotation.y = Math.PI;
    content.add(door);
    const handle = barHandle('DoorHandle', 0.1, metal);
    handle.position.set(
      -W / 2 + 0.025 + doorW * i + (i === 0 ? doorW - 0.05 : 0.05),
      bodyBase + doorAreaH - 0.05, frontZ - 0.002,
    );
    handle.rotation.y = Math.PI;
    content.add(handle);
  }
  group.add(content);
  return group;
}

export const DEFAULT_CABINET_CONFIG: FurnitureConfig = {
  category: 'cabinet',
  generator: 'cabinet',
  dimensions: { width: 1.4, height: 0.82, depth: 0.45 },
  components: [
    { key: 'drawers', enabled: true, params: { count: 3 } },
    { key: 'doors', enabled: true, params: {} },
    { key: 'legs', enabled: true, params: {} },
  ],
  materials: [{ component: 'frame', material: 'walnut' }, { component: 'hardware', material: 'stainless-steel' }],
  style: 'Mid-century sideboard',
};

/* ---------------- Bookshelf ---------------- */

export function generateBookshelf(config: FurnitureConfig): THREE.Group {
  const { width: W, height: H, depth: D } = config.dimensions;
  const wood = materialForComponent(config.materials, 'frame', 'oak');
  const shelves = Math.max(1, Math.min(8, Math.round(numParam(config, 'shelves', 'count', 4))));

  const { group, innerW } = carcass('Bookshelf', W, H, D, wood, { plinth: 0.07 });
  const base = 0.07;
  const innerBottom = base + 0.02;
  const innerTop = H - 0.03;
  const spacing = (innerTop - innerBottom) / shelves;

  const shelfGroup = new THREE.Group();
  shelfGroup.name = 'Shelves';
  for (let i = 1; i < shelves; i++) {
    const shelf = panel('Shelf', innerW, 0.024, D - 0.035, wood);
    shelf.position.set(0, innerBottom + spacing * i - 0.024, -0.004);
    shelfGroup.add(shelf);
  }
  group.add(shelfGroup);
  return group;
}

export const DEFAULT_BOOKSHELF_CONFIG: FurnitureConfig = {
  category: 'bookshelf',
  generator: 'bookshelf',
  dimensions: { width: 0.9, height: 1.8, depth: 0.32 },
  components: [
    { key: 'shelves', enabled: true, params: { count: 4 } },
    { key: 'carcass', enabled: true, params: {} },
  ],
  materials: [{ component: 'frame', material: 'oak' }],
  style: 'Open bookshelf',
};

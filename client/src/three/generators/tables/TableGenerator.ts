import * as THREE from 'three';
import type { FurnitureConfig } from '@shared/types/furniture';
import { materialForComponent } from '../../materials/materialLibrary';
import { roundedSlab, taperedLeg, beam, latheSupport, drawerFront, barHandle } from '../../geometry/primitives';
import { enabled, numParam, strParam } from '../generatorUtils';

/**
 * TableGenerator — dining tables, coffee tables and desks from one
 * parametric system: top (rectangular slab or round disc), apron frame,
 * and a leg style (tapered / turned / panel). Desks add a drawer row.
 * Origin: base center. Front faces -z (drawers open toward -z).
 */
export function generateTable(config: FurnitureConfig): THREE.Group {
  const { width: W, height: H, depth: D } = config.dimensions;
  const wood = materialForComponent(config.materials, 'frame', 'oak');
  const metal = materialForComponent(config.materials, 'hardware', 'stainless-steel');

  const topT = numParam(config, 'top', 'thickness', 0.032);
  const shape = strParam(config, 'top', 'shape', 'rect');
  const legStyle = strParam(config, 'legs', 'style', 'tapered');
  const showApron = enabled(config, 'apron', true);
  const showDrawers = enabled(config, 'drawers', false);
  const drawerCount = Math.round(numParam(config, 'drawers', 'count', 2));
  const showShelf = enabled(config, 'shelf', false);

  const table = new THREE.Group();
  table.name = 'Table';

  // --- top ---
  const topGroup = new THREE.Group();
  topGroup.name = 'Top';
  if (shape === 'round') {
    const geo = new THREE.CylinderGeometry(W / 2, W / 2, topT, 48);
    geo.translate(0, topT / 2, 0);
    const disc = new THREE.Mesh(geo, wood);
    disc.name = 'RoundTop';
    disc.castShadow = disc.receiveShadow = true;
    disc.position.y = H - topT;
    topGroup.add(disc);
  } else {
    const slab = roundedSlab('TableTop', W, topT, D, 0.01, wood);
    slab.position.y = H - topT;
    topGroup.add(slab);
  }
  table.add(topGroup);

  const legH = H - topT;
  const inset = 0.055;
  const lx = W / 2 - inset - 0.025;
  const lz = D / 2 - inset - 0.025;

  // --- apron ---
  if (showApron && shape !== 'round') {
    const apron = new THREE.Group();
    apron.name = 'Apron';
    const aH = 0.085, aT = 0.02;
    const y = H - topT - aH / 2 - 0.002;
    const fb = beam('ApronRail', lx * 2, aH, aT, wood); fb.position.set(0, y, -lz);
    const bb = beam('ApronRail', lx * 2, aH, aT, wood); bb.position.set(0, y, lz);
    const lb = beam('ApronRail', lz * 2, aH, aT, wood); lb.rotation.y = Math.PI / 2; lb.position.set(-lx, y, 0);
    const rb = beam('ApronRail', lz * 2, aH, aT, wood); rb.rotation.y = Math.PI / 2; rb.position.set(lx, y, 0);
    apron.add(fb, bb, lb, rb);
    table.add(apron);
  }

  // --- legs ---
  const legs = new THREE.Group();
  legs.name = 'Legs';
  if (legStyle === 'pedestal') {
    const pedestal = latheSupport('Pedestal', legH, W * 0.16, wood);
    legs.add(pedestal);
  } else if (legStyle === 'panel') {
    for (const sx of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.028, legH, D - inset * 2), wood);
      p.name = 'PanelLeg';
      p.castShadow = p.receiveShadow = true;
      p.position.set(sx * lx, legH / 2, 0);
      legs.add(p);
    }
  } else {
    for (const [x, z] of [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]] as const) {
      const leg = legStyle === 'turned'
        ? latheSupport('TurnedLeg', legH, 0.034, wood)
        : taperedLeg('TableLeg', legH, 0.05, 0.032, wood);
      leg.position.set(x, 0, z);
      legs.add(leg);
    }
  }
  table.add(legs);

  // --- drawers (desk) ---
  if (showDrawers && shape !== 'round') {
    const drawers = new THREE.Group();
    drawers.name = 'Drawers';
    const dH = 0.13, gap = 0.006;
    const totalW = lx * 2 - 0.02;
    const eachW = (totalW - gap * (drawerCount - 1)) / drawerCount;
    for (let i = 0; i < drawerCount; i++) {
      const front = drawerFront('Drawer', eachW, dH, 0.018, wood);
      front.position.set(-totalW / 2 + eachW / 2 + i * (eachW + gap), H - topT - dH - 0.008, -(lz + 0.002));
      const handle = barHandle('DrawerHandle', Math.min(0.14, eachW * 0.4), metal);
      handle.position.set(-totalW / 2 + eachW / 2 + i * (eachW + gap), H - topT - dH / 2 - 0.008, -(lz + 0.012));
      drawers.add(front, handle);
    }
    table.add(drawers);
  }

  // --- lower shelf ---
  if (showShelf && shape !== 'round') {
    const shelf = roundedSlab('LowerShelf', lx * 2 + 0.03, 0.02, lz * 2 + 0.03, 0.006, wood);
    shelf.position.y = 0.14;
    shelf.name = 'Shelf';
    table.add(shelf);
  }

  return table;
}

export const DEFAULT_TABLE_CONFIG: FurnitureConfig = {
  category: 'dining-table',
  generator: 'table',
  dimensions: { width: 1.4, height: 0.75, depth: 0.85 },
  components: [
    { key: 'top', enabled: true, params: { thickness: 0.032, shape: 'rect' } },
    { key: 'legs', enabled: true, params: { style: 'tapered' } },
    { key: 'apron', enabled: true, params: {} },
    { key: 'drawers', enabled: false, params: { count: 2 } },
    { key: 'shelf', enabled: false, params: {} },
  ],
  materials: [{ component: 'frame', material: 'walnut' }, { component: 'hardware', material: 'stainless-steel' }],
  style: 'Modern dining table',
};

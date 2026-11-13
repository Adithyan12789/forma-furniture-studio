import type * as THREE from 'three';

/**
 * Maps generator group names to config component keys. Generators build
 * named sub-groups ("Legs", "SeatCushions", ...); clicking a mesh selects
 * the component of its nearest named ancestor.
 */
export const NAME_TO_COMPONENT: Record<string, string> = {
  Legs: 'legs', PanelLeg: 'legs', Feet: 'feet',
  Seat: 'seat', SeatCushions: 'cushions', BackCushions: 'cushions', Cushion: 'cushion',
  Backrest: 'backrest', BackPost: 'backrest',
  Stretchers: 'stretchers', SideStretcher: 'stretchers',
  Base: 'base', Caster: 'base', BaseSlats: 'slats',
  Armrests: 'armrests',
  Apron: 'apron', SideApron: 'apron',
  Top: 'top', RoundTop: 'top',
  Drawers: 'drawers', Doors: 'doors', Fronts: 'doors',
  Shelf: 'shelf', Shelves: 'shelves',
  Headboard: 'frame', Frame: 'frame', Side: 'carcass',
  Pillows: 'pillows',
};

/** Walk up from an object to find its component key (null = model root/none). */
export function componentKeyForObject(
  obj: THREE.Object3D | null,
  root: THREE.Object3D | null,
  validKeys: Set<string>,
): string | null {
  let current: THREE.Object3D | null = obj;
  while (current && current !== root) {
    const key = NAME_TO_COMPONENT[current.name];
    if (key && validKeys.has(key)) return key;
    current = current.parent;
  }
  return null;
}

/** All meshes under the sub-groups that map to a component key. */
export function meshesForComponent(
  root: THREE.Object3D,
  key: string,
  validKeys: Set<string>,
): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && componentKeyForObject(child, root, validKeys) === key) {
      out.push(child);
    }
  });
  return out;
}

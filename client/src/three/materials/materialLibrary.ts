import * as THREE from 'three';
import {
  getWoodTextures, getFabricTextures, getLeatherTextures,
  getMetalTextures, getMarbleTextures, getConcreteTextures,
} from '../textures/proceduralTextures';
import type { MaterialAssignment, MaterialKind } from '@shared/types/furniture';

/**
 * PBR material library (Phase 3). Every kind is a MeshPhysicalMaterial
 * driven by procedural texture sets — no external image assets.
 *
 * Texture sets are drawn in neutral tones and multiplied by the
 * assignment's color, so one cached set serves every colorway.
 * Finish (matte/satin/gloss/raw) scales roughness and clearcoat.
 */

import { MATERIAL_KIND_GROUPS } from '@shared/constants/furniture';
export const WOOD_KINDS: MaterialKind[] = [...MATERIAL_KIND_GROUPS.wood];
export const FABRIC_KINDS: MaterialKind[] = ['cotton', 'linen', 'velvet'];
export const LEATHER_KINDS: MaterialKind[] = ['leather', 'synthetic-leather'];
export const METAL_KINDS: MaterialKind[] = [...MATERIAL_KIND_GROUPS.metal];
export const MINERAL_KINDS: MaterialKind[] = [...MATERIAL_KIND_GROUPS.surface];
export const ALL_MATERIAL_KINDS: MaterialKind[] = [
  ...WOOD_KINDS, ...FABRIC_KINDS, ...LEATHER_KINDS, ...METAL_KINDS, ...MINERAL_KINDS,
];

type Finish = NonNullable<MaterialAssignment['finish']>;
const FINISH_TUNING: Record<Finish, { roughness: number; clearcoat: number }> = {
  raw: { roughness: 1.25, clearcoat: 0 },
  matte: { roughness: 1.1, clearcoat: 0.05 },
  satin: { roughness: 0.85, clearcoat: 0.3 },
  gloss: { roughness: 0.5, clearcoat: 0.7 },
};

const cache = new Map<string, THREE.Material>();

function physical(params: THREE.MeshPhysicalMaterialParameters): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial(params);
}

export function getMaterial(
  kind: MaterialKind,
  tint?: string,
  finish: Finish = 'satin',
): THREE.Material {
  const key = `${kind}:${tint ?? ''}:${finish}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const tune = FINISH_TUNING[finish] ?? FINISH_TUNING.satin;
  const color = tint ? new THREE.Color(tint) : new THREE.Color('#ffffff');
  let material: THREE.Material;

  if (WOOD_KINDS.includes(kind)) {
    const { map, roughnessMap, normalMap } = getWoodTextures(kind);
    material = physical({
      map, roughnessMap, ...(normalMap ? { normalMap } : {}),
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughness: tune.roughness, metalness: 0,
      clearcoat: tune.clearcoat, clearcoatRoughness: 0.55,
      color, envMapIntensity: 0.75,
    });
  } else if (FABRIC_KINDS.includes(kind)) {
    const tex = getFabricTextures(kind as 'cotton' | 'linen' | 'velvet');
    material = physical({
      map: tex.map, roughnessMap: tex.roughnessMap, ...(tex.normalMap ? { normalMap: tex.normalMap } : {}),
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughness: Math.min(1, 0.95 * tune.roughness), metalness: 0,
      sheen: kind === 'velvet' ? 1 : 0.35,
      sheenRoughness: kind === 'velvet' ? 0.5 : 0.8,
      sheenColor: color.clone(),
      color, envMapIntensity: 0.35,
    });
  } else if (LEATHER_KINDS.includes(kind)) {
    const tex = getLeatherTextures(kind === 'synthetic-leather');
    material = physical({
      map: tex.map, roughnessMap: tex.roughnessMap, ...(tex.normalMap ? { normalMap: tex.normalMap } : {}),
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughness: Math.min(1, 0.62 * tune.roughness), metalness: 0,
      clearcoat: Math.max(0.12, tune.clearcoat * 0.6), clearcoatRoughness: 0.5,
      color, envMapIntensity: 0.6,
    });
  } else if (METAL_KINDS.includes(kind)) {
    const tex = getMetalTextures(kind as 'stainless-steel' | 'aluminum' | 'iron');
    const baseColor = kind === 'iron' ? '#4a4a4e' : kind === 'aluminum' ? '#d7d9db' : '#c9cbce';
    material = physical({
      map: tex.map, roughnessMap: tex.roughnessMap,
      roughness: 1, metalness: 1,
      color: tint ? color : new THREE.Color(baseColor),
      envMapIntensity: 1.25,
    });
  } else if (kind === 'marble') {
    const tex = getMarbleTextures();
    material = physical({
      map: tex.map, roughnessMap: tex.roughnessMap,
      roughness: 0.6 * tune.roughness, metalness: 0,
      clearcoat: Math.max(0.35, tune.clearcoat), clearcoatRoughness: 0.25,
      color, envMapIntensity: 0.9,
    });
  } else if (kind === 'concrete') {
    const tex = getConcreteTextures();
    material = physical({
      map: tex.map, roughnessMap: tex.roughnessMap, ...(tex.normalMap ? { normalMap: tex.normalMap } : {}),
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughness: Math.min(1, 1.0 * tune.roughness), metalness: 0,
      color, envMapIntensity: 0.4,
    });
  } else if (kind === 'glass') {
    material = physical({
      color: tint ? color : new THREE.Color('#dfe9ea'),
      roughness: 0.06, metalness: 0,
      transmission: 0.92, thickness: 0.02, ior: 1.5,
      clearcoat: 1, clearcoatRoughness: 0.06,
      envMapIntensity: 1.4,
    });
  } else {
    // plastic + custom fallback
    material = physical({
      color, roughness: 0.38 * tune.roughness + 0.08, metalness: 0,
      clearcoat: tune.clearcoat, clearcoatRoughness: 0.3,
      envMapIntensity: 0.8,
    });
  }

  cache.set(key, material);
  return material;
}

/** Resolve the material for a named component from a config's assignments. */
export function materialForComponent(
  assignments: MaterialAssignment[],
  component: string,
  fallback: MaterialKind = 'oak',
): THREE.Material {
  const found = assignments.find((a) => a.component === component);
  return found
    ? getMaterial(found.material, found.color, found.finish ?? 'satin')
    : getMaterial(fallback);
}

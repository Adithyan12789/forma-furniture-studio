import type * as THREE from 'three';

/** Shared handle to the live model group (selection, export). */
export const modelGroupRef: { current: THREE.Group | null } = { current: null };

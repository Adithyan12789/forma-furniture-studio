import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

/**
 * GLB / GLTF export (Phase 6). Exports the live model group — geometry,
 * PBR materials and procedural textures are embedded by the exporter
 * (canvas textures become PNG images in the file).
 */
const exporter = new GLTFExporter();

export function exportModel(group: THREE.Group, binary: boolean): Promise<Blob> {
  return new Promise((resolve, reject) => {
    exporter.parse(
      group,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(new Blob([result], { type: 'model/gltf-binary' }));
        } else {
          resolve(new Blob([JSON.stringify(result)], { type: 'model/gltf+json' }));
        }
      },
      (error) => reject(error instanceof Error ? error : new Error(String(error))),
      { binary, animations: [] },
    );
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

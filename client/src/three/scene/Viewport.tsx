import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import StudioScene from './StudioScene';
import { useStudioStore } from '@/store/studioStore';

/** The interactive 3D viewport (lazy-loaded by the Studio page). */
export default function Viewport() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [1.15, 0.95, 1.35], fov: 40, near: 0.05, far: 60 }}
      gl={{ antialias: true }}
      onPointerMissed={() => useStudioStore.getState().setSelectedComponent(null)}
      style={{ background: 'radial-gradient(120% 90% at 50% 20%, #1b1b1e 0%, #0c0c0d 70%)' }}
    >
      <Suspense fallback={null}>
        <StudioScene />
      </Suspense>
    </Canvas>
  );
}

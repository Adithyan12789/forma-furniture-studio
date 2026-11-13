import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Grid, Environment, Lightformer } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { generateFurniture } from '../generators';
import { useStudioStore, type CameraPreset } from '@/store/studioStore';
import { modelGroupRef } from './modelRegistry';
import { componentKeyForObject, meshesForComponent } from './selection';

/**
 * Studio softbox environment (Phase 3): virtual light-formers rendered
 * into an environment map by drei — realistic reflections for metal,
 * glass and polished wood, with no external HDR downloads.
 */
function StudioEnvironment() {
  return (
    <Environment resolution={256}>
      <group rotation={[-Math.PI / 3, 0, 0]}>
        <Lightformer form="circle" intensity={5} position={[0, 5, -9]} scale={2.2} />
        <Lightformer form="rect" intensity={2.2} position={[-5, 1, -1]} scale={[3, 0.8, 1]} />
        <Lightformer form="rect" intensity={2.2} position={[5, 0, -1]} scale={[3, 0.8, 1]} />
        <Lightformer form="rect" intensity={1.1} position={[0, 4, 6]} scale={[4, 1.2, 1]} />
        <Lightformer form="circle" intensity={1.4} position={[0, -4, 2]} scale={1.6} />
      </group>
    </Environment>
  );
}

type Vec3 = [number, number, number];

/** Preset directions, scaled by the loaded model's size at apply time. */
const PRESET_DIRS: Record<CameraPreset, Vec3> = {
  perspective: [0.62, 0.5, 0.73],
  front: [0, 0.32, 1],
  back: [0, 0.32, -1],
  left: [-1, 0.32, 0],
  right: [1, 0.32, 0],
  top: [0, 1, 0.02],
};

function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera);
  const preset = useStudioStore((s) => s.preset);
  const nonce = useStudioStore((s) => s.presetNonce);
  const autoRotate = useStudioStore((s) => s.autoRotate);
  const dims = useStudioStore((s) => s.config.dimensions);

  const targetY = Math.max(0.3, dims.height * 0.45);
  const dist = Math.max(1.4, Math.max(dims.width, dims.depth, dims.height) * 1.55);

  useEffect(() => {
    if (nonce === 0) return;
    const dir = PRESET_DIRS[preset];
    camera.position.set(dir[0] * dist, dir[1] * dist + targetY * 0.4, dir[2] * dist);
    controls.current?.target.set(0, targetY, 0);
    controls.current?.update();
  }, [preset, nonce, camera, dist, targetY]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={[0, targetY, 0]}
      minDistance={0.4}
      maxDistance={5}
      maxPolarAngle={Math.PI / 2 + 0.05}
      enableDamping
      dampingFactor={0.08}
      autoRotate={autoRotate}
      autoRotateSpeed={1.2}
    />
  );
}

/** The generated model, rebuilt from config on every edit (cheap at this scale). */
function GeneratedModel() {
  const config = useStudioStore((s) => s.config);
  const setSelectedComponent = useStudioStore((s) => s.setSelectedComponent);
  const group = useMemo(() => generateFurniture(config), [config]);
  useEffect(() => {
    modelGroupRef.current = group;
    return () => {
      if (modelGroupRef.current === group) modelGroupRef.current = null;
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
      });
    };
  }, [group]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const validKeys = new Set(config.components.map((c) => c.key));
    setSelectedComponent(componentKeyForObject(e.object, group, validKeys));
  };

  return <primitive object={group} onClick={handleClick} />;
}

/** Brass bounding box around the selected component's meshes. */
function SelectionHighlight() {
  const selected = useStudioStore((s) => s.selectedComponent);
  const config = useStudioStore((s) => s.config);
  // Computed in an effect: by then GeneratedModel's effect has registered
  // the current group in modelGroupRef, so the box matches the live model.
  const [helper, setHelper] = useState<THREE.Box3Helper | null>(null);
  useEffect(() => {
    const root = modelGroupRef.current;
    if (!selected || !root) { setHelper(null); return; }
    const validKeys = new Set(config.components.map((c) => c.key));
    const meshes = meshesForComponent(root, selected, validKeys);
    if (meshes.length === 0) { setHelper(null); return; }
    root.updateMatrixWorld(true);
    const box = new THREE.Box3();
    for (const m of meshes) box.expandByObject(m);
    if (box.isEmpty()) { setHelper(null); return; }
    box.expandByScalar(0.008);
    setHelper(new THREE.Box3Helper(box, new THREE.Color('#d8b98a')));
  }, [selected, config]);
  return helper ? <primitive object={helper} /> : null;
}

/** Environment intensity from the lighting controls. */
function EnvironmentTuning() {
  const scene = useThree((s) => s.scene);
  const envIntensity = useStudioStore((s) => s.envIntensity);
  useEffect(() => {
    (scene as unknown as { environmentIntensity?: number }).environmentIntensity = envIntensity;
  }, [scene, envIntensity]);
  return null;
}

export default function StudioScene() {
  const showGrid = useStudioStore((s) => s.showGrid);
  const keyLight = useStudioStore((s) => s.keyLight);
  return (
    <>
      <StudioEnvironment />
      <EnvironmentTuning />
      {/* Key light with soft shadows */}
      <directionalLight
        position={[2.2, 3.4, 1.6]}
        intensity={2.4 * keyLight}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-1.5}
        shadow-camera-right={1.5}
        shadow-camera-top={1.5}
        shadow-camera-bottom={-1.5}
        shadow-bias={-0.0002}
        shadow-radius={4}
      />
      {/* Soft overhead spot: pool of light on the piece */}
      <spotLight position={[0.4, 3.6, 0.4]} angle={0.55} penumbra={1} intensity={55 * keyLight} color="#fff4e0" />
      {/* Fill + rim */}
      <directionalLight position={[-2.4, 1.6, -1.2]} intensity={0.55} />
      <directionalLight position={[-1.2, 2.0, 2.4]} intensity={0.35} />
      <ambientLight intensity={0.12} />

      <GeneratedModel />
      <SelectionHighlight />

      {/* Ground: soft contact shadow + subtle reflective disc */}
      <ContactShadows position={[0, 0.001, 0]} scale={4} far={1.2} blur={2.6} opacity={0.55} resolution={512} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <circleGeometry args={[3.2, 64]} />
        <meshStandardMaterial color="#131315" roughness={0.95} metalness={0} />
      </mesh>
      {showGrid && (
        <Grid
          position={[0, 0.002, 0]}
          args={[8, 8]}
          cellSize={0.1}
          cellColor="#26262a"
          sectionSize={0.5}
          sectionColor="#34343a"
          fadeDistance={4.5}
          fadeStrength={1.5}
          infiniteGrid={false}
        />
      )}
      <CameraRig />
    </>
  );
}

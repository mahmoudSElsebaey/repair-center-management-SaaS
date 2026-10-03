import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Icosahedron, Ring, Torus } from '@react-three/drei';
import type { Group, InstancedMesh } from 'three';
import { Color, Object3D } from 'three';

/**
 * Abstract "service core": a wireframe core inside two tilted rings, with a
 * rotating shell of nodes around it. It reads as diagnostics and precision
 * without illustrating a literal device.
 *
 * Deliberately small: three primitives plus one instanced point cloud, no
 * textures, no post-processing, no external models — so it stays cheap and
 * never becomes the reason a dashboard feels slow.
 */

const PRIMARY = '#4F5BF5';
const SECONDARY = '#22D3EE';
const NODE_COUNT = 48;

function ServiceCore() {
  const group = useRef<Group>(null);

  useFrame((state, delta) => {
    if (!group.current) return;

    group.current.rotation.y += delta * 0.16;
    group.current.rotation.x += delta * 0.05;

    // Gentle parallax toward the pointer. Damped so it never feels twitchy.
    const { x, y } = state.pointer;
    group.current.position.x += (x * 0.35 - group.current.position.x) * 0.04;
    group.current.position.y += (y * 0.22 - group.current.position.y) * 0.04;
  });

  return (
    <group ref={group}>
      <Float speed={1.1} rotationIntensity={0.35} floatIntensity={0.7}>
        {/* Core — wireframe hull */}
        <Icosahedron args={[1.02, 1]}>
          <meshBasicMaterial color={SECONDARY} wireframe transparent opacity={0.42} />
        </Icosahedron>

        {/* Core — solid inner body */}
        <Icosahedron args={[0.64, 0]}>
          <meshStandardMaterial
            color={PRIMARY}
            emissive={PRIMARY}
            emissiveIntensity={0.55}
            metalness={0.75}
            roughness={0.22}
            flatShading
          />
        </Icosahedron>

        {/* Instrument rings */}
        <Ring args={[1.42, 1.46, 96]} rotation={[Math.PI / 2.1, 0.24, 0]}>
          <meshBasicMaterial color={PRIMARY} transparent opacity={0.6} side={2} />
        </Ring>

        <Ring args={[1.62, 1.645, 96]} rotation={[Math.PI / 1.7, -0.35, 0.4]}>
          <meshBasicMaterial color={SECONDARY} transparent opacity={0.34} side={2} />
        </Ring>

        <Torus args={[1.85, 0.012, 8, 128]} rotation={[Math.PI / 1.55, 0.6, 0.2]}>
          <meshBasicMaterial color={SECONDARY} transparent opacity={0.5} />
        </Torus>
      </Float>
    </group>
  );
}

/** Orbiting nodes — one instanced mesh, so 48 nodes cost a single draw call. */
function NodeShell() {
  const meshRef = useRef<InstancedMesh | null>(null);

  const nodes = useMemo(() => {
    const dummy = new Object3D();
    const palette = [new Color(PRIMARY), new Color(SECONDARY), new Color('#8A9AB5')];

    return Array.from({ length: NODE_COUNT }, (_, index) => {
      const theta = (index / NODE_COUNT) * Math.PI * 2;
      const radius = 2.15 + Math.sin(index * 2.1) * 0.32;
      const y = Math.cos(index * 1.7) * 1.15;

      dummy.position.set(Math.cos(theta) * radius, y, Math.sin(theta) * radius);
      const scale = 0.032 + (index % 4) * 0.012;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();

      return {
        matrix: dummy.matrix.clone(),
        color: palette[index % palette.length],
      };
    });
  }, []);

  useFrame((_state, delta) => {
    if (meshRef.current) meshRef.current.rotation.y -= delta * 0.075;
  });

  /** Applies the precomputed transforms once the instanced mesh exists. */
  const attachInstances = (instance: InstancedMesh | null) => {
    meshRef.current = instance;
    if (!instance) return;

    nodes.forEach((node, index) => {
      instance.setMatrixAt(index, node.matrix);
      instance.setColorAt(index, node.color);
    });

    instance.instanceMatrix.needsUpdate = true;
    if (instance.instanceColor) instance.instanceColor.needsUpdate = true;
  };

  return (
    <instancedMesh ref={attachInstances} args={[undefined, undefined, NODE_COUNT]}>
      <sphereGeometry args={[1, 10, 10]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.4, 6.4], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      // The scene is decorative; it must never swallow page scrolling.
      style={{ pointerEvents: 'none' }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 4]} intensity={1.15} color="#EEF2F8" />
      <pointLight position={[-5, -3, -4]} intensity={22} color={PRIMARY} distance={16} />
      <pointLight position={[4, 3, 2]} intensity={14} color={SECONDARY} distance={14} />

      <ServiceCore />
      <NodeShell />
    </Canvas>
  );
}

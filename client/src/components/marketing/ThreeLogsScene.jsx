import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Log({ position, rotation = [0, 0, 0], radius = 0.42, length = 2.4, color = '#6b4a2f' }) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius * 1.02, length, 28, 1]} />
      <meshStandardMaterial attach="material-0" color={color} roughness={0.92} metalness={0.02} />
      <meshStandardMaterial attach="material-1" color="#e8c48f" roughness={0.75} />
      <meshStandardMaterial attach="material-2" color="#c79b64" roughness={0.85} />
    </mesh>
  );
}

function Logs({ dragging }) {
  const group = useRef();
  useFrame((state, delta) => {
    if (!group.current) return;
    if (!dragging.current) group.current.rotation.y += delta * 0.16;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.04;
  });
  return (
    <group ref={group} rotation={[0.15, 0.6, 0.05]}>
      <Log position={[0, -0.42, 0]} rotation={[0, 0.2, Math.PI / 2]} radius={0.4} length={2.5} color="#5b3d26" />
      <Log position={[0, 0.05, 0.72]} rotation={[0.1, -0.15, Math.PI / 2]} radius={0.34} length={2.1} color="#6e4d31" />
      <Log position={[-0.1, 0.05, -0.62]} rotation={[-0.08, 0.3, Math.PI / 2]} radius={0.3} length={1.9} color="#4f3521" />
      <Log position={[0.15, 0.55, 0.2]} rotation={[0.05, 0.55, Math.PI / 2]} radius={0.27} length={1.7} color="#7a5738" />
      <Log position={[-0.35, 0.5, 0.9]} rotation={[0.2, 1.2, Math.PI / 2]} radius={0.2} length={1.2} color="#5f4128" />
      <group position={[0.9, 0.95, -0.2]} rotation={[0.5, 0.2, 0]}>
        <mesh>
          <cylinderGeometry args={[0.17, 0.18, 0.9, 20]} />
          <meshStandardMaterial color="#6f4c2f" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

function Embers() {
  const ref = useRef();
  const count = 42;
  const [positions] = useState(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 5;
      arr[i * 3 + 1] = Math.random() * 3.2 - 0.6;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 3;
    }
    return arr;
  });
  useFrame((state) => {
    if (!ref.current) return;
    const positions = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += 0.004 + (i % 7) * 0.0004;
      if (positions[i + 1] > 3) positions[i + 1] = -0.8;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
    ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.08) * 0.2;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.045} color="#f9a03f" transparent opacity={0.8} sizeAttenuation depthWrite={false} />
    </points>
  );
}

export default function ThreeLogsScene({ onError }) {
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const groupRef = useRef(null);

  return (
    <div
      className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
      onPointerDown={(e) => {
        dragging.current = true;
        last.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragging.current || !groupRef.current) return;
        const dx = e.clientX - last.current.x;
        groupRef.current.rotation.y += dx * 0.012;
        groupRef.current.rotation.x += (e.clientY - last.current.y) * 0.004;
        last.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      }}
      aria-label="Modèle 3D interactif de bûches de bois"
      role="img"
    >
      <Canvas
        dpr={[1, 1.75]}
        shadows
        camera={{ position: [0, 1.4, 4.6], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
        }}
      >
        <ambientLight intensity={0.55} color="#ffe8c9" />
        <directionalLight position={[3, 5, 4]} intensity={2.4} color="#fff1d8" castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-4, 2, -2]} intensity={0.7} color="#9fd8a9" />
        <pointLight position={[0, -0.6, 1.6]} intensity={14} distance={7} color="#f2791b" />
        <group ref={groupRef}>
          <Logs dragging={dragging} />
        </group>
        <Embers />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.86, 0]} receiveShadow>
          <circleGeometry args={[3, 48]} />
          <shadowMaterial transparent opacity={0.35} />
        </mesh>
      </Canvas>
    </div>
  );
}

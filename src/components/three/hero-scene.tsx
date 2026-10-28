"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Float,
  Lightformer,
} from "@react-three/drei";
import * as THREE from "three";

export type HeroSceneProps = {
  accent: string;
  quality: "high" | "low";
  animate: boolean;
  active: boolean;
  theme?: "light" | "dark";
};

type PointerRef = React.RefObject<{ x: number; y: number }>;

function useWindowPointer(): PointerRef {
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((event.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return pointer;
}

function Rig({
  pointer,
  animate,
  children,
}: {
  pointer: PointerRef;
  animate: boolean;
  children: React.ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const entrance = useRef(0);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 1 / 20);
    // Entrance: ease scale from 0.7 to 1 over ~1.2s.
    entrance.current = Math.min(1, entrance.current + dt / 1.2);
    const e = 1 - Math.pow(1 - entrance.current, 3);

    const scroll = typeof window === "undefined" ? 0 : Math.min(window.scrollY / window.innerHeight, 1.5);
    const targetX = pointer.current.y * 0.28 + scroll * 0.6;
    const targetY = pointer.current.x * 0.45 + (animate ? state.clock.elapsedTime * 0.12 : 0);

    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetX, 3.5, dt);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetY, 3.5, dt);
    g.position.y = THREE.MathUtils.damp(g.position.y, -scroll * 1.1, 4, dt);
    const scale = (0.7 + 0.3 * e) * (1 - scroll * 0.12);
    g.scale.setScalar(scale);
  });

  return <group ref={group}>{children}</group>;
}

function Orbit({
  radius,
  tilt,
  speed,
  color,
  animate,
  isDark = false,
}: {
  radius: number;
  tilt: [number, number, number];
  speed: number;
  color: string;
  animate: boolean;
  isDark?: boolean;
}) {
  const node = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!node.current) return;
    const t = animate ? state.clock.elapsedTime * speed : 0.6;
    node.current.position.set(Math.cos(t) * radius, Math.sin(t) * radius, 0);
  });
  return (
    <group rotation={tilt}>
      <mesh>
        <torusGeometry args={[radius, 0.007, 8, 160]} />
        <meshBasicMaterial color={color} transparent opacity={isDark ? 0.45 : 0.35} />
      </mesh>
      <mesh ref={node}>
        <sphereGeometry args={[0.06, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isDark ? 0.85 : 0.6}
          roughness={0.25}
        />
      </mesh>
    </group>
  );
}

function Sculpture({
  accent,
  animate,
  theme = "light",
}: {
  accent: string;
  quality: "high" | "low";
  animate: boolean;
  theme?: "light" | "dark";
}) {
  const isDark = theme === "dark";
  const shellEdges = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.78, 1)), []);
  const core = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!core.current || !animate) return;
    core.current.rotation.x += delta * 0.25;
    core.current.rotation.z += delta * 0.18;
  });

  return (
    <>
      {/* Outer crystalline cage: native physical glass with zero FBO artifacts and depthWrite=false
          so back faces never render as black polygons from any viewing angle */}
      <mesh>
        <icosahedronGeometry args={[1.3, 0]} />
        <meshPhysicalMaterial
          color={isDark ? "#bae6fd" : "#f0f5ff"}
          emissive={isDark ? "#1e3a8a" : "#000000"}
          emissiveIntensity={isDark ? 0.18 : 0}
          roughness={isDark ? 0.05 : 0.08}
          metalness={0.08}
          clearcoat={1}
          clearcoatRoughness={0.06}
          transmission={isDark ? 0.92 : 0.88}
          thickness={0.5}
          ior={1.35}
          transparent
          opacity={isDark ? 0.32 : 0.4}
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Central energy core: vibrant electric blue with subtle cyan highlights and jewel facets */}
      <mesh ref={core} scale={0.55}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color={isDark ? "#2563eb" : accent}
          emissive={isDark ? "#1d4ed8" : "#1f45e0"}
          emissiveIntensity={isDark ? 0.7 : 0.25}
          roughness={isDark ? 0.18 : 0.25}
          metalness={isDark ? 0.4 : 0.35}
          flatShading
        />
      </mesh>

      {/* Internal core illumination projecting soft light outward */}
      <pointLight position={[0, 0, 0]} intensity={isDark ? 4.5 : 2} color={isDark ? "#38bdf8" : accent} distance={3.5} />

      {/* Outer rotating technical wireframe */}
      <lineSegments geometry={shellEdges}>
        <lineBasicMaterial color={isDark ? "#38bdf8" : accent} transparent opacity={isDark ? 0.42 : 0.22} />
      </lineSegments>

      {/* Orbital rings and luminous satellites */}
      <Orbit radius={2.15} tilt={[1.2, 0.2, 0]} speed={0.5} color={isDark ? "#2563eb" : accent} animate={animate} isDark={isDark} />
      <Orbit radius={2.45} tilt={[0.35, -0.9, 0.4]} speed={-0.35} color={isDark ? "#38bdf8" : "#5aa2ff"} animate={animate} isDark={isDark} />
    </>
  );
}

export default function HeroScene({ accent, quality, animate, active, theme = "light" }: HeroSceneProps) {
  const pointer = useWindowPointer();
  const isDark = theme === "dark";

  return (
    <Canvas
      dpr={quality === "high" ? [1, 1.75] : [1, 1.25]}
      camera={{ position: [0, 0, 7.6], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      frameloop={active ? (animate ? "always" : "demand") : "never"}
      style={{ pointerEvents: "none" }}
      aria-hidden
    >
      <ambientLight intensity={isDark ? 0.6 : 0.55} color={isDark ? "#93c5fd" : "#ffffff"} />
      <directionalLight position={[4, 5, 6]} intensity={isDark ? 1.8 : 1.4} />
      <directionalLight position={[-5, -2, -4]} intensity={isDark ? 0.9 : 0.5} color={isDark ? "#38bdf8" : "#9db8ff"} />
      {isDark && (
        <>
          <pointLight position={[-4, 2.5, 3]} intensity={14} color="#38bdf8" distance={12} />
          <pointLight position={[4, -2, 2.5]} intensity={16} color="#2563eb" distance={12} />
        </>
      )}

      <Environment resolution={quality === "high" ? 256 : 64}>
        <Lightformer form="rect" intensity={2.4} position={[0, 4, 3]} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[-5, 0, 2]} scale={[2, 6, 1]} color={isDark ? "#93c5fd" : "#cfe0ff"} />
        <Lightformer form="ring" intensity={1.8} position={[4, 1, -3]} scale={3} color={accent} />
        <Lightformer form="rect" intensity={0.8} position={[0, -4, 2]} scale={[8, 1, 1]} />
      </Environment>

      <Rig pointer={pointer} animate={animate}>
        <Float
          enabled={animate}
          speed={1.2}
          rotationIntensity={0.25}
          floatIntensity={0.6}
          floatingRange={[-0.08, 0.08]}
        >
          <Sculpture accent={accent} quality={quality} animate={animate} theme={theme} />
        </Float>
      </Rig>

      <ContactShadows
        position={[0, -2.35, 0]}
        opacity={isDark ? 0.32 : 0.22}
        scale={9}
        blur={2.8}
        far={4}
        resolution={quality === "high" ? 512 : 256}
        frames={animate ? Infinity : 1}
        color={isDark ? "#030718" : "#1b2a55"}
      />
    </Canvas>
  );
}

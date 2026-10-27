"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Grid, Lightformer } from "@react-three/drei";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";
import { createCardTexture, type CardArt } from "@/components/showcase/gallery/card-texture";
import {
  cameraPose,
  CARD_H,
  CARD_W,
  clamp,
  clampOffset,
  classifyGesture,
  computeLayout,
  layoutExtentX,
  PITCH_LIMIT,
  YAW_LIMIT,
  type Gesture,
} from "@/components/showcase/gallery/layout";

export type GalleryCard = CardArt & { id: string };

export type GallerySceneProps = {
  cards: GalleryCard[];
  featuredIndex: number;
  /** Smoothed scroll progress of the section (0–1) — drives the camera path. */
  progress: MotionValue<number>;
  selected: number | null;
  onSelect: (index: number | null) => void;
  onInteract: () => void;
  resetToken: number;
  running: boolean;
  compact: boolean;
  animate: boolean;
  /** Element that receives a small `data-scene-state` snapshot (for tests and debugging). */
  stateTarget: React.RefObject<HTMLElement | null>;
};

export const SCENE_BG = "#070b16";
const PIVOT_Z = -1;
const FLOOR_Y = -1.75;
const { damp } = THREE.MathUtils;

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

function radialTexture(stops: [number, string][]) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  for (const [offset, color] of stops) g.addColorStop(offset, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

type GestureState = {
  id: number;
  type: string;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  mode: Gesture;
  card: number;
  startOffset: { x: number; y: number };
  startPoint: THREE.Vector3 | null;
};

function Gallery(props: GallerySceneProps) {
  const { cards, featuredIndex, compact, animate } = props;
  const { gl, camera, size } = useThree();

  const slots = useMemo(() => computeLayout(cards.length, featuredIndex, compact), [cards.length, featuredIndex, compact]);
  const extent = useMemo(() => layoutExtentX(slots), [slots]);

  // GPU resources: created once per content change, disposed on change/unmount.
  const shared = useMemo(() => {
    const face = new THREE.ShapeGeometry(roundedRect(CARD_W, CARD_H, 0.11), 10);
    const pos = face.attributes.position;
    const uv = face.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, (pos.getX(i) + CARD_W / 2) / CARD_W, (pos.getY(i) + CARD_H / 2) / CARD_H);
    }
    const slab = new THREE.ExtrudeGeometry(roundedRect(CARD_W + 0.06, CARD_H + 0.06, 0.13), {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 3,
      curveSegments: 10,
    });
    slab.translate(0, 0, -0.075);
    const rim = new THREE.BufferGeometry().setFromPoints(
      roundedRect(CARD_W + 0.02, CARD_H + 0.02, 0.12)
        .getPoints(12)
        .map((p) => new THREE.Vector3(p.x, p.y, 0.012)),
    );
    const slabMaterial = new THREE.MeshPhysicalMaterial({
      color: "#0b1428",
      metalness: 0.35,
      roughness: 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
    });
    const gloss = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.07,
      roughness: 0.05,
      metalness: 0,
      clearcoat: 1,
      depthWrite: false,
    });
    const halo = radialTexture([
      [0, "rgba(37,99,235,0.55)"],
      [0.5, "rgba(37,99,235,0.14)"],
      [1, "rgba(37,99,235,0)"],
    ]);
    return { face, slab, rim, slabMaterial, gloss, halo };
  }, []);
  useEffect(
    () => () => {
      shared.face.dispose();
      shared.slab.dispose();
      shared.rim.dispose();
      shared.slabMaterial.dispose();
      shared.gloss.dispose();
      shared.halo.dispose();
    },
    [shared],
  );

  const perCard = useMemo(() => {
    const anisotropy = gl.capabilities.getMaxAnisotropy();
    return cards.map((card, i) => {
      const art = createCardTexture(card, anisotropy);
      return {
        art,
        face: new THREE.MeshBasicMaterial({ map: art.texture, toneMapped: false, transparent: true }),
        rim: new THREE.LineBasicMaterial({
          color: "#7dd3fc",
          transparent: true,
          opacity: i === featuredIndex ? 0.45 : 0.22,
        }),
      };
    });
  }, [cards, featuredIndex, gl]);
  useEffect(
    () => () => {
      for (const c of perCard) {
        c.art.dispose();
        c.face.dispose();
        c.rim.dispose();
      }
    },
    [perCard],
  );

  const pivot = useRef<THREE.Group>(null);
  const cardGroups = useRef<(THREE.Group | null)[]>([]);
  const faces = useRef<(THREE.Mesh | null)[]>([]);
  const lookAt = useRef(new THREE.Vector3(0, 0.9, PIVOT_Z));
  const state = useRef({
    yaw: 0,
    pitch: 0,
    vyaw: 0,
    vpitch: 0,
    offsets: [] as { x: number; y: number }[],
    shown: [] as { x: number; y: number }[],
    dim: [] as number[],
    hovered: -1,
    pointer: { x: 0, y: 0 },
    gesture: null as GestureState | null,
    lastPublish: 0,
    published: "",
  });

  // Keep per-card interaction state aligned with the card list.
  useEffect(() => {
    const s = state.current;
    s.offsets = cards.map((_, i) => s.offsets[i] ?? { x: 0, y: 0 });
    s.shown = cards.map((_, i) => s.shown[i] ?? { x: 0, y: 0 });
    s.dim = cards.map((_, i) => s.dim[i] ?? 1);
  }, [cards]);

  // Latest props for the imperative handlers below.
  const latest = useRef({ selected: props.selected, onSelect: props.onSelect, onInteract: props.onInteract });
  useEffect(() => {
    latest.current = { selected: props.selected, onSelect: props.onSelect, onInteract: props.onInteract };
  }, [props.selected, props.onSelect, props.onInteract]);

  // Reset restores the original composition.
  useEffect(() => {
    if (props.resetToken === 0) return;
    const s = state.current;
    s.yaw = s.pitch = s.vyaw = s.vpitch = 0;
    s.offsets = s.offsets.map(() => ({ x: 0, y: 0 }));
  }, [props.resetToken]);

  // The canvas element, held in a ref so handlers may style it (cursor).
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    canvasRef.current = gl.domElement;
  }, [gl]);

  // Direct manipulation: click to select, drag a card, drag space to rotate.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const inverse = new THREE.Matrix4();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const s = state.current;

    const toNdc = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
    };
    const hitCard = (e: PointerEvent) => {
      toNdc(e);
      const meshes = faces.current.filter((m): m is THREE.Mesh => Boolean(m));
      const hit = raycaster.intersectObjects(meshes, false)[0];
      return hit ? (hit.object.userData.index as number) : -1;
    };
    // Point on the card's depth plane, in gallery (pivot) space.
    const planePoint = (e: PointerEvent, z: number) => {
      if (!pivot.current) return null;
      toNdc(e);
      inverse.copy(pivot.current.matrixWorld).invert();
      const ray = raycaster.ray.clone().applyMatrix4(inverse);
      plane.constant = -z;
      return ray.intersectPlane(plane, new THREE.Vector3());
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const card = hitCard(e);
      s.gesture = {
        id: e.pointerId,
        type: e.pointerType,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        mode: "pending",
        card,
        startOffset: card >= 0 ? { ...s.offsets[card] } : { x: 0, y: 0 },
        startPoint: card >= 0 ? planePoint(e, slots[card].z) : null,
      };
      s.vyaw = s.vpitch = 0;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // capture is best-effort
      }
      latest.current.onInteract();
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        const r = el.getBoundingClientRect();
        s.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        s.pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      }
      const g = s.gesture;
      if (!g) {
        if (e.pointerType === "mouse") {
          s.hovered = hitCard(e);
          el.style.cursor = s.hovered >= 0 ? "pointer" : "grab";
        }
        return;
      }
      if (e.pointerId !== g.id) return;
      if (g.mode === "pending") {
        g.mode = classifyGesture(Math.hypot(e.clientX - g.startX, e.clientY - g.startY), g.card >= 0, g.type);
        if (g.mode === "pending") return;
        el.style.cursor = "grabbing";
      }
      const dx = e.clientX - g.lastX;
      const dy = e.clientY - g.lastY;
      g.lastX = e.clientX;
      g.lastY = e.clientY;

      if (g.mode === "scene") {
        const dyaw = (dx / el.clientWidth) * 2.4;
        s.yaw = clamp(s.yaw + dyaw, -YAW_LIMIT, YAW_LIMIT);
        s.vyaw = dyaw;
        if (g.type !== "touch") {
          const dpitch = (dy / el.clientHeight) * 1.1;
          s.pitch = clamp(s.pitch + dpitch, -PITCH_LIMIT, PITCH_LIMIT);
          s.vpitch = dpitch;
        }
      } else if (g.mode === "card" && g.startPoint) {
        const p = planePoint(e, slots[g.card].z);
        if (p) {
          s.offsets[g.card] = clampOffset({
            x: g.startOffset.x + p.x - g.startPoint.x,
            y: g.startOffset.y + p.y - g.startPoint.y,
          });
        }
      }
    };

    const end = (e: PointerEvent, cancelled: boolean) => {
      const g = s.gesture;
      if (!g || e.pointerId !== g.id) return;
      s.gesture = null;
      if (g.mode !== "scene") s.vyaw = s.vpitch = 0;
      el.style.cursor = s.hovered >= 0 ? "pointer" : "grab";
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // already released
      }
      // A press that never became a drag is a click: select the card, or
      // clear the selection when clicking empty space.
      if (!cancelled && g.mode === "pending") latest.current.onSelect(g.card >= 0 ? g.card : null);
    };
    const onUp = (e: PointerEvent) => end(e, false);
    const onCancel = (e: PointerEvent) => end(e, true);
    const onLeave = () => {
      if (!s.gesture) s.hovered = -1;
      s.pointer.x = s.pointer.y = 0;
    };

    el.style.cursor = "grab";
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onCancel);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onCancel);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [gl, camera, slots]);

  const world = useMemo(() => new THREE.Vector3(), []);

  /* eslint-disable react-hooks/immutability -- the R3F frame loop mutates three.js
     objects (camera, materials, transforms) imperatively by design. */
  useFrame((frame, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const s = state.current;
    const p = pivot.current;
    if (!p) return;
    const selected = latest.current.selected;

    // Gallery rotation with inertia after a scene drag.
    if (!s.gesture || s.gesture.mode !== "scene") {
      const decay = Math.pow(0.9, dt * 60);
      s.yaw = clamp(s.yaw + s.vyaw, -YAW_LIMIT, YAW_LIMIT);
      s.pitch = clamp(s.pitch + s.vpitch, -PITCH_LIMIT, PITCH_LIMIT);
      s.vyaw *= decay;
      s.vpitch *= decay;
    }
    p.rotation.y = damp(p.rotation.y, s.yaw, 8, dt);
    p.rotation.x = damp(p.rotation.x, s.pitch, 8, dt);

    // Scroll-driven camera path, gentle pointer parallax, and a nudge toward the selection.
    const pose = cameraPose(props.progress.get(), extent, compact);
    let tx = pose.position[0];
    let tz = pose.position[2];
    if (selected !== null && cardGroups.current[selected]) {
      cardGroups.current[selected]!.getWorldPosition(world);
      tx += (world.x - tx) * 0.3;
      tz -= 0.6;
    }
    const parallax = animate ? 0.35 : 0;
    camera.position.x = damp(camera.position.x, tx + s.pointer.x * parallax, 3, dt);
    camera.position.y = damp(camera.position.y, pose.position[1] - s.pointer.y * parallax * 0.5, 3, dt);
    camera.position.z = damp(camera.position.z, tz, 3, dt);
    lookAt.current.x = damp(lookAt.current.x, pose.target[0] + (selected !== null ? (world.x - pose.target[0]) * 0.3 : 0), 3, dt);
    lookAt.current.y = damp(lookAt.current.y, pose.target[1], 3, dt);
    lookAt.current.z = pose.target[2];
    camera.lookAt(lookAt.current);

    // Cards: home slot + dragged offset, selection emphasis, hover lift, calm float.
    const t = frame.clock.elapsedTime;
    for (let i = 0; i < slots.length; i++) {
      const g = cardGroups.current[i];
      const slot = slots[i];
      const c = perCard[i];
      if (!g || !c || !s.shown[i]) continue;
      const isSelected = selected === i;
      const receded = selected !== null && !isSelected;
      const hovered = s.hovered === i && !isSelected;

      s.shown[i].x = damp(s.shown[i].x, s.offsets[i].x, 12, dt);
      s.shown[i].y = damp(s.shown[i].y, s.offsets[i].y, 12, dt);
      const float = animate ? Math.sin(t * 0.6 + i * 1.7) * 0.05 : 0;
      const z = slot.z + (isSelected ? 0.8 : receded ? -0.35 : hovered ? 0.18 : 0);

      g.position.set(
        damp(g.position.x, slot.x + s.shown[i].x, 6, dt),
        damp(g.position.y, slot.y + s.shown[i].y + float, 6, dt),
        damp(g.position.z, z, 6, dt),
      );
      g.rotation.y = damp(g.rotation.y, slot.rotY * (isSelected ? 0.35 : 1), 6, dt);
      g.rotation.x = damp(g.rotation.x, slot.rotX, 6, dt);
      g.scale.setScalar(damp(g.scale.x, slot.scale * (isSelected ? 1.08 : 1), 6, dt));

      s.dim[i] = damp(s.dim[i], receded ? 0.5 : 1, 6, dt);
      c.face.color.setScalar(s.dim[i]);
      c.rim.opacity = damp(
        c.rim.opacity,
        isSelected ? 0.95 : hovered ? 0.7 : slot.featured ? 0.45 : 0.22,
        8,
        dt,
      );
    }

    // Publish a compact state snapshot (throttled).
    const target = props.stateTarget.current;
    if (target && t - s.lastPublish > 0.15) {
      s.lastPublish = t;
      const snapshot = JSON.stringify({
        yaw: +s.yaw.toFixed(3),
        pitch: +s.pitch.toFixed(3),
        selected,
        offsets: s.offsets.map((o) => [+o.x.toFixed(2), +o.y.toFixed(2)]),
        cards: cardGroups.current.map((g) => {
          if (!g) return null;
          g.getWorldPosition(world).project(camera);
          return [Math.round(((world.x + 1) / 2) * size.width), Math.round(((1 - world.y) / 2) * size.height)];
        }),
      });
      if (snapshot !== s.published) {
        s.published = snapshot;
        target.dataset.sceneState = snapshot;
      }
    }
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <group ref={pivot} position={[0, 0, PIVOT_Z]}>
      {/* Atmosphere behind the arrangement */}
      <mesh position={[0, 1.5, -9]} scale={[26, 14, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={shared.halo} transparent depthWrite={false} toneMapped={false} opacity={0.55} fog={false} />
      </mesh>

      {/* Floor: fading grid, light pool and soft contact shadows */}
      <Grid
        position={[0, FLOOR_Y, 0]}
        args={[60, 60]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#14213d"
        sectionSize={2.5}
        sectionThickness={1}
        sectionColor="#1d3a78"
        fadeDistance={24}
        fadeStrength={1.6}
        infiniteGrid
      />
      <mesh position={[0, FLOOR_Y + 0.005, 0.4]} rotation={[-Math.PI / 2, 0, 0]} scale={[16, 10, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={shared.halo} transparent depthWrite={false} toneMapped={false} opacity={0.6} />
      </mesh>
      {!compact && (
        <ContactShadows position={[0, FLOOR_Y + 0.01, 0]} scale={22} far={4.5} blur={2.6} opacity={0.7} resolution={512} color="#000510" />
      )}

      {cards.map((card, i) => (
        <group
          key={card.id}
          ref={(el) => {
            cardGroups.current[i] = el;
          }}
          position={[slots[i].x, slots[i].y, slots[i].z]}
          rotation={[slots[i].rotX, slots[i].rotY, 0]}
          scale={slots[i].scale}
        >
          {slots[i].featured && (
            <mesh position={[0, 0, -0.2]} scale={[CARD_W * 2.2, CARD_H * 2.4, 1]}>
              <planeGeometry />
              <meshBasicMaterial map={shared.halo} transparent depthWrite={false} toneMapped={false} opacity={0.75} />
            </mesh>
          )}
          <mesh geometry={shared.slab} material={shared.slabMaterial} />
          <mesh
            ref={(el) => {
              faces.current[i] = el;
            }}
            geometry={shared.face}
            material={perCard[i]?.face}
            userData={{ index: i }}
          />
          <mesh geometry={shared.face} material={shared.gloss} position={[0, 0, 0.006]} />
          <lineLoop geometry={shared.rim} material={perCard[i]?.rim} />
        </group>
      ))}
    </group>
  );
}

export default function GalleryScene(props: GallerySceneProps) {
  return (
    <Canvas
      dpr={props.compact ? [1, 1.25] : [1, 1.75]}
      camera={{ fov: props.compact ? 50 : 36, position: [0, 3.4, 15], near: 0.1, far: 80 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      frameloop={props.running ? "always" : "never"}
      style={{ touchAction: "pan-y" }}
    >
      <color attach="background" args={[SCENE_BG]} />
      <fog attach="fog" args={[SCENE_BG, 11, 30]} />
      <ambientLight intensity={0.5} color="#a9bcff" />
      <directionalLight position={[4, 7, 6]} intensity={1.2} />
      <pointLight position={[-7, 2.5, -3]} intensity={40} distance={22} color="#22d3ee" />
      <pointLight position={[7, 1, 2]} intensity={25} distance={18} color="#2563eb" />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={1.6} position={[0, 6, 4]} scale={[12, 2, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[-7, 1, 2]} scale={[2, 6, 1]} color="#7dd3fc" />
        <Lightformer form="ring" intensity={1.2} position={[6, 2, -3]} scale={3} color="#2563eb" />
      </Environment>
      <Gallery {...props} />
    </Canvas>
  );
}

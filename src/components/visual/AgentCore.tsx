"use client";

import React, { useEffect, useRef, useState } from "react";

interface AgentCoreProps {
  className?: string;
  /** Disables pointer parallax; used on the compact auth panel. */
  interactive?: boolean;
}

/* ---------------------------------------------------------------------------
   Geometry — a once-subdivided icosahedron, giving a geodesic mesh (42 nodes /
   120 edges) that reads as a structured core rather than a generic sphere.
   ------------------------------------------------------------------------- */

type Vec3 = [number, number, number];

function normalize(v: Vec3): Vec3 {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

function buildGeodesicMesh() {
  const t = (1 + Math.sqrt(5)) / 2;

  const vertices: Vec3[] = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map((v) => normalize(v as Vec3));

  let faces: [number, number, number][] = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];

  // One subdivision pass: each triangle becomes four, with midpoints pushed
  // back onto the unit sphere.
  const midpointCache = new Map<string, number>();
  const midpoint = (a: number, b: number): number => {
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    const cached = midpointCache.get(key);
    if (cached !== undefined) return cached;

    const index = vertices.push(
      normalize([
        (vertices[a][0] + vertices[b][0]) / 2,
        (vertices[a][1] + vertices[b][1]) / 2,
        (vertices[a][2] + vertices[b][2]) / 2,
      ])
    ) - 1;

    midpointCache.set(key, index);
    return index;
  };

  const subdivided: [number, number, number][] = [];
  for (const [a, b, c] of faces) {
    const ab = midpoint(a, b);
    const bc = midpoint(b, c);
    const ca = midpoint(c, a);
    subdivided.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
  }
  faces = subdivided;

  const edgeKeys = new Set<string>();
  const edges: [number, number][] = [];
  for (const [a, b, c] of faces) {
    for (const [from, to] of [[a, b], [b, c], [c, a]] as [number, number][]) {
      const key = from < to ? `${from}_${to}` : `${to}_${from}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      edges.push([from, to]);
    }
  }

  return { vertices, edges };
}

const { vertices: MESH_VERTICES, edges: MESH_EDGES } = buildGeodesicMesh();

/** Data pulses travel along a stable subset of edges so the mesh reads as live. */
const PULSE_COUNT = 14;

interface Pulse {
  edge: number;
  progress: number;
  speed: number;
  hue: "accent" | "plum";
}

export function AgentCore({ className = "", interactive = true }: AgentCoreProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    // Cap DPR: this scene is line-heavy, and 3x on phones costs far more than
    // it visibly adds.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    const resize = () => {
      width = host.clientWidth;
      height = host.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    const pulses: Pulse[] = Array.from({ length: PULSE_COUNT }, (_, index) => ({
      edge: Math.floor((index / PULSE_COUNT) * MESH_EDGES.length) % MESH_EDGES.length,
      progress: (index * 0.137) % 1,
      speed: 0.16 + (index % 5) * 0.045,
      hue: index % 3 === 0 ? "plum" : "accent",
    }));

    // Ambient dust gives the void depth without a heavy particle system.
    const dust = Array.from({ length: 46 }, () => ({
      x: Math.random(),
      y: Math.random(),
      radius: 0.4 + Math.random() * 1.5,
      speed: 0.004 + Math.random() * 0.012,
      drift: Math.random() * Math.PI * 2,
    }));

    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      pointer.current.targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.current.targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    const onPointerLeave = () => {
      pointer.current.targetX = 0;
      pointer.current.targetY = 0;
    };

    if (interactive) {
      host.addEventListener("pointermove", onPointerMove);
      host.addEventListener("pointerleave", onPointerLeave);
    }

    // Skip rendering while the canvas is scrolled out of view.
    let visible = true;
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0.01 }
    );
    visibilityObserver.observe(host);

    const rotate = (point: Vec3, rotX: number, rotY: number): Vec3 => {
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const x = point[0] * cosY - point[2] * sinY;
      const z = point[0] * sinY + point[2] * cosY;

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      return [x, point[1] * cosX - z * sinX, point[1] * sinX + z * cosX];
    };

    let frame = 0;
    let rotation = 0;
    let lastTime = performance.now();

    const render = (time: number) => {
      frame = requestAnimationFrame(render);

      const delta = Math.min(48, time - lastTime);
      lastTime = time;
      if (!visible) return;

      const motionScale = reducedMotion ? 0 : 1;
      rotation += delta * 0.00009 * motionScale;

      pointer.current.x += (pointer.current.targetX - pointer.current.x) * 0.055;
      pointer.current.y += (pointer.current.targetY - pointer.current.y) * 0.055;

      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.31;

      const tiltX = -0.34 + pointer.current.y * 0.24;
      const tiltY = rotation + pointer.current.x * 0.4;

      context.clearRect(0, 0, width, height);

      /* --- ambient dust ------------------------------------------------ */
      for (const particle of dust) {
        particle.drift += 0.004 * motionScale;
        particle.y -= particle.speed * 0.0016 * delta * motionScale;
        if (particle.y < -0.05) particle.y = 1.05;

        context.beginPath();
        context.arc(
          particle.x * width + Math.sin(particle.drift) * 8,
          particle.y * height,
          particle.radius,
          0,
          Math.PI * 2
        );
        context.fillStyle = `rgba(165, 175, 221, ${0.05 + (1 - particle.y) * 0.14})`;
        context.fill();
      }

      /* --- projected mesh ---------------------------------------------- */
      const projected: { x: number; y: number; z: number }[] = [];
      for (const vertex of MESH_VERTICES) {
        const [x, y, z] = rotate(vertex, tiltX, tiltY);
        const perspective = 1 / (1.9 - z * 0.5);
        projected.push({
          x: centerX + x * radius * perspective,
          y: centerY + y * radius * perspective,
          z,
        });
      }

      // Inner atmosphere: sells the volume behind the wireframe.
      const atmosphere = context.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, radius * 1.5
      );
      atmosphere.addColorStop(0, "rgba(91, 141, 239, 0.30)");
      atmosphere.addColorStop(0.42, "rgba(108, 99, 255, 0.14)");
      atmosphere.addColorStop(0.72, "rgba(192, 84, 159, 0.06)");
      atmosphere.addColorStop(1, "rgba(6, 7, 15, 0)");
      context.fillStyle = atmosphere;
      context.beginPath();
      context.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2);
      context.fill();

      // Mesh edges, brightness keyed to depth so the sphere has a front/back.
      context.lineWidth = 1;
      for (const [from, to] of MESH_EDGES) {
        const a = projected[from];
        const b = projected[to];
        const depth = (a.z + b.z) / 2;

        context.strokeStyle = `rgba(157, 185, 245, ${0.06 + ((depth + 1) / 2) * 0.4})`;
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      }

      // Nodes.
      for (const point of projected) {
        const depth = (point.z + 1) / 2;
        context.beginPath();
        context.arc(point.x, point.y, 0.9 + depth * 1.5, 0, Math.PI * 2);
        context.fillStyle = `rgba(233, 237, 251, ${0.16 + depth * 0.62})`;
        context.fill();
      }

      /* --- data pulses -------------------------------------------------- */
      for (const pulse of pulses) {
        pulse.progress += pulse.speed * 0.004 * delta * motionScale;
        if (pulse.progress > 1) {
          pulse.progress = 0;
          pulse.edge = (pulse.edge + 7) % MESH_EDGES.length;
        }

        const [from, to] = MESH_EDGES[pulse.edge];
        const a = projected[from];
        const b = projected[to];
        if ((a.z + b.z) / 2 < -0.35) continue;

        const x = a.x + (b.x - a.x) * pulse.progress;
        const y = a.y + (b.y - a.y) * pulse.progress;
        const core = pulse.hue === "plum" ? "192, 84, 159" : "157, 205, 255";

        const glow = context.createRadialGradient(x, y, 0, x, y, 7);
        glow.addColorStop(0, `rgba(${core}, 0.95)`);
        glow.addColorStop(1, `rgba(${core}, 0)`);
        context.fillStyle = glow;
        context.beginPath();
        context.arc(x, y, 7, 0, Math.PI * 2);
        context.fill();
      }

      /* --- orbit rings -------------------------------------------------- */
      const rings = [
        { tilt: 0.22, spin: 0.55, radius: 1.32, alpha: 0.3 },
        { tilt: -0.68, spin: -0.34, radius: 1.55, alpha: 0.2 },
        { tilt: 1.16, spin: 0.21, radius: 1.16, alpha: 0.16 },
      ];

      const breathe = reducedMotion ? 1 : 1 + Math.sin(time * 0.0009) * 0.02;

      rings.forEach((ring, ringIndex) => {
        const steps = 128;
        context.beginPath();
        for (let step = 0; step <= steps; step += 1) {
          const angle = (step / steps) * Math.PI * 2;
          const [x, y, z] = rotate(
            [Math.cos(angle) * ring.radius * breathe, Math.sin(angle) * ring.radius * breathe * 0.34, 0],
            ring.tilt,
            tiltY * ring.spin
          );
          const perspective = 1 / (1.9 - z * 0.5);
          const px = centerX + x * radius * perspective;
          const py = centerY + y * radius * perspective;
          if (step === 0) context.moveTo(px, py);
          else context.lineTo(px, py);
        }
        context.strokeStyle = `rgba(140, 165, 235, ${ring.alpha})`;
        context.lineWidth = 1;
        context.stroke();

        // A single bright node riding each ring implies continuous operation.
        const nodeAngle = time * 0.0004 * (1 + ringIndex * 0.4) * motionScale + ringIndex * 2.1;
        const [nx, ny, nz] = rotate(
          [
            Math.cos(nodeAngle) * ring.radius * breathe,
            Math.sin(nodeAngle) * ring.radius * breathe * 0.34,
            0,
          ],
          ring.tilt,
          tiltY * ring.spin
        );
        const nodePerspective = 1 / (1.9 - nz * 0.5);
        const nodeX = centerX + nx * radius * nodePerspective;
        const nodeY = centerY + ny * radius * nodePerspective;

        const nodeGlow = context.createRadialGradient(nodeX, nodeY, 0, nodeX, nodeY, 9);
        nodeGlow.addColorStop(0, "rgba(233, 237, 251, 0.95)");
        nodeGlow.addColorStop(0.35, "rgba(91, 141, 239, 0.6)");
        nodeGlow.addColorStop(1, "rgba(91, 141, 239, 0)");
        context.fillStyle = nodeGlow;
        context.beginPath();
        context.arc(nodeX, nodeY, 9, 0, Math.PI * 2);
        context.fill();
      });

      /* --- core -------------------------------------------------------- */
      const corePulse = reducedMotion ? 0.5 : (Math.sin(time * 0.0016) + 1) / 2;
      const coreRadius = radius * (0.2 + corePulse * 0.03);
      const core = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius);
      core.addColorStop(0, "rgba(255, 255, 255, 0.92)");
      core.addColorStop(0.35, "rgba(157, 205, 255, 0.55)");
      core.addColorStop(1, "rgba(108, 99, 255, 0)");
      context.fillStyle = core;
      context.beginPath();
      context.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      context.fill();
    };

    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      if (interactive) {
        host.removeEventListener("pointermove", onPointerMove);
        host.removeEventListener("pointerleave", onPointerLeave);
      }
    };
  }, [reducedMotion, interactive]);

  return (
    <div ref={hostRef} className={`relative ${className}`}>
      <canvas ref={canvasRef} className="block h-full w-full" aria-hidden="true" role="presentation" />
    </div>
  );
}

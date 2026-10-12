"use client";

import React, { useEffect, useRef, useState } from "react";

interface Cinematic3DSceneProps {
  className?: string;
}

export function Cinematic3DScene({ className = "" }: Cinematic3DSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Check if user prefers reduced motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth * window.devicePixelRatio);
    let height = (canvas.height = canvas.offsetHeight * window.devicePixelRatio);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };

    window.addEventListener("resize", handleResize);

    // 3D Icosahedron / Geodesic Core Vertices
    const phi = (1 + Math.sqrt(5)) / 2;
    const baseVertices = [
      [-1, phi, 0],
      [1, phi, 0],
      [-1, -phi, 0],
      [1, -phi, 0],
      [0, -1, phi],
      [0, 1, phi],
      [0, -1, -phi],
      [0, 1, -phi],
      [phi, 0, -1],
      [phi, 0, 1],
      [-phi, 0, -1],
      [-phi, 0, 1],
    ].map(([x, y, z]) => {
      const len = Math.sqrt(x * x + y * y + z * z);
      return [x / len, y / len, z / len];
    });

    // Edges connecting vertices
    const edges: [number, number][] = [];
    for (let i = 0; i < baseVertices.length; i++) {
      for (let j = i + 1; j < baseVertices.length; j++) {
        const [x1, y1, z1] = baseVertices[i];
        const [x2, y2, z2] = baseVertices[j];
        const dist = Math.hypot(x1 - x2, y1 - y2, z1 - z2);
        // Adjacent vertices in normalized icosahedron have distance ~1.05
        if (dist < 1.15) {
          edges.push([i, j]);
        }
      }
    }

    // Interactive Mouse Tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;
    let rotX = 0;
    let rotY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      targetRotY = x * 0.8;
      targetRotX = -y * 0.8;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Particle field orbiting the AI Gateway Core
    const particleCount = 48;
    const particles = Array.from({ length: particleCount }, (_, idx) => ({
      angle: (idx / particleCount) * Math.PI * 2,
      radius: 1.4 + (idx % 5) * 0.25,
      speed: 0.003 + (idx % 3) * 0.002,
      yOffset: Math.sin(idx * 2) * 0.5,
      size: 1.5 + (idx % 3),
      alpha: 0.2 + (idx % 4) * 0.2,
    }));

    let time = 0;

    const render = () => {
      time += 0.012;
      ctx.clearRect(0, 0, width, height);

      // Smooth rotation interpolation
      rotX += (targetRotX - rotX) * 0.05 + 0.002;
      rotY += (targetRotY - rotY) * 0.05 + 0.004;

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      const centerX = width / 2;
      const centerY = height / 2;
      const scale = Math.min(width, height) * 0.32;

      // Project 3D Point to 2D Screen
      const project = (x: number, y: number, z: number) => {
        // Rotate Y
        let x1 = x * cosY - z * sinY;
        let z1 = x * sinY + z * cosY;

        // Rotate X
        let y2 = y * cosX - z1 * sinX;
        let z2 = y * sinX + z1 * cosX;

        // Perspective projection
        const fov = 3.2;
        const pz = z2 + fov;
        const px = (x1 / pz) * scale + centerX;
        const py = (y2 / pz) * scale + centerY;
        const depth = z2;

        return { px, py, depth };
      };

      // Draw Atmospheric Radial Core Glow (Forest Green & Neon Mint)
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        10,
        centerX,
        centerY,
        scale * 1.6
      );
      gradient.addColorStop(0, "rgba(28, 225, 114, 0.22)");
      gradient.addColorStop(0.35, "rgba(53, 92, 73, 0.35)");
      gradient.addColorStop(0.7, "rgba(1, 3, 2, 0.6)");
      gradient.addColorStop(1, "rgba(1, 3, 2, 0)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Render Projected Edges (Wireframe Geodesic AI Core)
      ctx.lineWidth = 1.6 * window.devicePixelRatio;
      for (const [i, j] of edges) {
        const v1 = baseVertices[i];
        const v2 = baseVertices[j];

        const p1 = project(v1[0], v1[1], v1[2]);
        const p2 = project(v2[0], v2[1], v2[2]);

        const avgDepth = (p1.depth + p2.depth) / 2;
        // Edge lighting attenuation based on depth
        const alpha = Math.max(0.12, Math.min(0.85, 0.45 + avgDepth * 0.35));

        ctx.strokeStyle = `rgba(28, 225, 114, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();
      }

      // Render Core Nodes (Pulsing Vertices)
      for (let i = 0; i < baseVertices.length; i++) {
        const v = baseVertices[i];
        const p = project(v[0], v[1], v[2]);
        const nodeAlpha = Math.max(0.2, 0.6 + p.depth * 0.4);

        ctx.fillStyle = `rgba(240, 254, 248, ${nodeAlpha})`;
        ctx.beginPath();
        ctx.arc(p.px, p.py, 3.5 * window.devicePixelRatio, 0, Math.PI * 2);
        ctx.fill();

        // Neon Mint Halo on foreground nodes
        if (p.depth > 0) {
          ctx.strokeStyle = "rgba(28, 225, 114, 0.9)";
          ctx.lineWidth = 1.2 * window.devicePixelRatio;
          ctx.beginPath();
          ctx.arc(p.px, p.py, 6.5 * window.devicePixelRatio, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Render Orbiting Particles (Streaming Tokens / Nodes)
      if (!reducedMotion) {
        particles.forEach((pt) => {
          pt.angle += pt.speed;
          const px = Math.cos(pt.angle) * pt.radius;
          const pz = Math.sin(pt.angle) * pt.radius;
          const py = pt.yOffset + Math.sin(time + pt.angle) * 0.15;

          const proj = project(px, py, pz);
          ctx.fillStyle = `rgba(28, 225, 114, ${pt.alpha})`;
          ctx.beginPath();
          ctx.arc(proj.px, proj.py, pt.size * window.devicePixelRatio, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      if (!reducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [reducedMotion]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}>
      {/* Background radial atmosphere */}
      <div className="absolute inset-0 bg-radial from-[#355C49]/20 via-[#010302]/60 to-[#010302] pointer-events-none" />

      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full relative z-10 cursor-grab active:cursor-grabbing block"
        style={{ touchAction: "none" }}
        aria-label="Interactive 3D AI Gateway Neural Core Visualization"
        role="img"
      />

      {/* Reduced-Motion Static Fallback Badge if enabled by OS */}
      {reducedMotion && (
        <div className="absolute bottom-4 left-4 z-20 text-[10px] font-mono text-zinc-400 bg-black/60 px-2 py-1 rounded border border-white/10">
          Motion: Optimized Static Mode
        </div>
      )}
    </div>
  );
}

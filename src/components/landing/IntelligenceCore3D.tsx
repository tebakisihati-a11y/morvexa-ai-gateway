"use client";

import React, { useEffect, useRef, useState } from "react";

interface IntelligenceCore3DProps {
  interactive?: boolean;
  className?: string;
}

export function IntelligenceCore3D({
  interactive = true,
  className = "",
}: IntelligenceCore3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const mousePos = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 500);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 500);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener("resize", handleResize);

    // Particle nodes circulating the core
    const particleCount = 42;
    const particles: Array<{
      radius: number;
      orbitRadius: number;
      angle: number;
      speed: number;
      tilt: number;
      color: string;
      alpha: number;
    }> = [];

    const colors = ["#ACA3E1", "#C03FB5", "#5449AB", "#A6085B", "#F7F8FD"];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        radius: Math.random() * 2 + 1,
        orbitRadius: 90 + Math.random() * 110,
        angle: Math.random() * Math.PI * 2,
        speed: (Math.random() * 0.008 + 0.004) * (Math.random() > 0.5 ? 1 : -1),
        tilt: (Math.random() - 0.5) * 0.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.6 + 0.3,
      });
    }

    // Provider nodes along the outer ring
    const providerNodes = [
      { name: "CLAUDE", angle: 0, color: "#ACA3E1" },
      { name: "DEEPSEEK", angle: (Math.PI * 2) / 5, color: "#5449AB" },
      { name: "LOCAL:5002", angle: (Math.PI * 4) / 5, color: "#C03FB5" },
      { name: "GROQ", angle: (Math.PI * 6) / 5, color: "#A6085B" },
      { name: "OPENAI", angle: (Math.PI * 8) / 5, color: "#ACA3E1" },
    ];

    let t = 0;

    const render = () => {
      t += 0.015;
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse easing
      mousePos.current.x += (mousePos.current.targetX - mousePos.current.x) * 0.05;
      mousePos.current.y += (mousePos.current.targetY - mousePos.current.y) * 0.05;

      const centerX = width / 2 + mousePos.current.x * 25;
      const centerY = height / 2 + mousePos.current.y * 25;

      // 1. Core Background Atmospheric Glow
      const bgGlow = ctx.createRadialGradient(
        centerX,
        centerY,
        20,
        centerX,
        centerY,
        240
      );
      bgGlow.addColorStop(0, "rgba(192, 63, 181, 0.35)");
      bgGlow.addColorStop(0.35, "rgba(84, 73, 171, 0.2)");
      bgGlow.addColorStop(0.7, "rgba(58, 24, 85, 0.08)");
      bgGlow.addColorStop(1, "rgba(0, 1, 2, 0)");

      ctx.fillStyle = bgGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 240, 0, Math.PI * 2);
      ctx.fill();

      // 2. Multi-orbital Concentric Rings
      const rings = [
        { r: 85, tilt: 0.25, rotSpeed: 0.005, color: "rgba(172, 163, 225, 0.25)", dash: [4, 8] },
        { r: 130, tilt: -0.4, rotSpeed: -0.007, color: "rgba(192, 63, 181, 0.35)", dash: [12, 12] },
        { r: 175, tilt: 0.55, rotSpeed: 0.004, color: "rgba(84, 73, 171, 0.3)", dash: [8, 16] },
        { r: 210, tilt: -0.2, rotSpeed: 0.002, color: "rgba(166, 8, 91, 0.2)", dash: [] },
      ];

      rings.forEach((ring) => {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(t * ring.rotSpeed);
        ctx.scale(1, 0.6 + ring.tilt * 0.3);

        ctx.beginPath();
        ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 1.2;
        if (ring.dash.length) {
          ctx.setLineDash(ring.dash);
        }
        ctx.stroke();
        ctx.restore();
      });

      // 3. Central Intelligence Core Sphere (Nested Glowing Spherical Shells)
      const corePulse = 1 + Math.sin(t * 2) * 0.04;
      const coreRadius = 52 * corePulse;

      // Inner Core Gradient
      const coreGrad = ctx.createRadialGradient(
        centerX - coreRadius * 0.3,
        centerY - coreRadius * 0.3,
        4,
        centerX,
        centerY,
        coreRadius
      );
      coreGrad.addColorStop(0, "#FFFFFF");
      coreGrad.addColorStop(0.2, "#ACA3E1");
      coreGrad.addColorStop(0.5, "#C03FB5");
      coreGrad.addColorStop(0.85, "#5449AB");
      coreGrad.addColorStop(1, "#1A0B2E");

      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.shadowColor = "#C03FB5";
      ctx.shadowBlur = 30;
      ctx.fill();
      ctx.shadowBlur = 0; // reset

      // Central Geometric Lattice Lines (Icosahedron projection illusion)
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(t * 0.4);
      ctx.strokeStyle = "rgba(247, 248, 253, 0.45)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3;
        const x1 = Math.cos(ang) * (coreRadius * 0.9);
        const y1 = Math.sin(ang) * (coreRadius * 0.9);
        const x2 = Math.cos(ang + Math.PI / 3) * (coreRadius * 0.9);
        const y2 = Math.sin(ang + Math.PI / 3) * (coreRadius * 0.9);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore();

      // 4. Circulating Data Particles & Tendrils
      particles.forEach((p) => {
        p.angle += p.speed;
        const x = centerX + Math.cos(p.angle) * p.orbitRadius;
        const y = centerY + Math.sin(p.angle) * (p.orbitRadius * (0.6 + p.tilt));

        // Connect to core if within proximity
        if (Math.sin(p.angle + t) > 0.4) {
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(x, y);
          ctx.strokeStyle = "rgba(192, 63, 181, 0.08)";
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(x, y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      });

      // 5. Provider Endpoints Around Perimeter
      const outerR = 195;
      providerNodes.forEach((node) => {
        const currentAngle = node.angle + t * 0.15;
        const px = centerX + Math.cos(currentAngle) * outerR;
        const py = centerY + Math.sin(currentAngle) * (outerR * 0.65);

        // Beam to core
        const beamGrad = ctx.createLinearGradient(centerX, centerY, px, py);
        beamGrad.addColorStop(0, "rgba(192, 63, 181, 0.4)");
        beamGrad.addColorStop(1, "rgba(172, 163, 225, 0.1)");

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(px, py);
        ctx.strokeStyle = beamGrad;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Endpoint Node Dot
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Node Label Tag
        ctx.font = "9px ui-monospace, monospace";
        ctx.fillStyle = "#ACA3E1";
        ctx.fillText(node.name, px + 7, py + 3);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mousePos.current.targetX = x;
    mousePos.current.targetY = y;
  };

  const handleMouseLeave = () => {
    mousePos.current.targetX = 0;
    mousePos.current.targetY = 0;
    setIsHovered(false);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full aspect-square max-w-[560px] mx-auto flex items-center justify-center select-none overflow-hidden ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full relative z-10 block pointer-events-none"
      />

      {/* Decorative CSS Rings around the 3D core canvas */}
      <div className="absolute inset-8 rounded-full border border-purple-500/10 pointer-events-none animate-orbit-cw-slow" />
      <div className="absolute inset-16 rounded-full border border-pink-500/15 pointer-events-none animate-orbit-ccw-slow" />

      {/* Static Fallback for reduced motion / non-canvas users */}
      <noscript>
        <div className="w-48 h-48 rounded-full bg-gradient-to-tr from-purple-800 to-pink-600 blur-xl opacity-80" />
      </noscript>
    </div>
  );
}

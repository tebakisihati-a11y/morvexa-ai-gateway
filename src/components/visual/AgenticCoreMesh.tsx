"use client";

import React, { useEffect, useRef } from "react";

interface AgenticCoreMeshProps {
  className?: string;
  height?: number;
  interactive?: boolean;
}

export function AgenticCoreMesh({
  className = "",
  height = 240,
  interactive = true,
}: AgenticCoreMeshProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let h = (canvas.height = height);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      h = canvas.height = height;
    };
    window.addEventListener("resize", handleResize);

    // Agent nodes around the perimeter
    const nodes = [
      { name: "Anthropic Claude", color: "#10b981", angle: 0, r: 140, speed: 0.006, size: 4 },
      { name: "DeepSeek V3", color: "#34d399", angle: (Math.PI * 2) / 5, r: 155, speed: 0.005, size: 4 },
      { name: "OpenAI GPT-4o", color: "#059669", angle: (Math.PI * 4) / 5, r: 135, speed: 0.007, size: 3.5 },
      { name: "Groq LPU", color: "#6ee7b7", angle: (Math.PI * 6) / 5, r: 160, speed: 0.008, size: 3 },
      { name: "Gemini 2.0", color: "#10b981", angle: (Math.PI * 8) / 5, r: 145, speed: 0.0055, size: 3.5 },
    ];

    // Ambient floating 3D particle cloud
    const particleCount = 48;
    const particles = Array.from({ length: particleCount }, () => ({
      x: (Math.random() - 0.5) * 360,
      y: (Math.random() - 0.5) * 160,
      z: (Math.random() - 0.5) * 200,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      vz: (Math.random() - 0.5) * 0.2,
      radius: Math.random() * 1.5 + 0.8,
    }));

    let mouseX = 0;
    let mouseY = 0;
    let targetRotY = 0;
    let targetRotX = 0;
    let currentRotY = 0;
    let currentRotX = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      targetRotY = mouseX * 0.35;
      targetRotX = -mouseY * 0.25;
    };

    window.addEventListener("mousemove", handleMouseMove);

    let time = 0;

    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, h);

      currentRotY += (targetRotY - currentRotY) * 0.05;
      currentRotX += (targetRotX - currentRotX) * 0.05;

      const centerX = width / 2;
      const centerY = h / 2;

      // Draw subtle orbital guide rings
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(currentRotY * 0.3);

      ctx.beginPath();
      ctx.ellipse(0, 0, 150, 42, currentRotX, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(16, 185, 129, 0.08)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(0, 0, 95, 26, -currentRotX * 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(16, 185, 129, 0.05)";
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Render 3D particles with depth perspective
      const focalLength = 260;
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        if (p.x > 180) p.x = -180;
        if (p.x < -180) p.x = 180;
        if (p.y > 80) p.y = -80;
        if (p.y < -80) p.y = 80;
        if (p.z > 100) p.z = -100;
        if (p.z < -100) p.z = 100;

        // 3D rotation
        const cosY = Math.cos(currentRotY + time * 0.08);
        const sinY = Math.sin(currentRotY + time * 0.08);
        const rx = p.x * cosY - p.z * sinY;
        const rz = p.x * sinY + p.z * cosY;

        const scale = focalLength / (focalLength + rz);
        const px = centerX + rx * scale;
        const py = centerY + p.y * scale;

        if (scale > 0) {
          ctx.beginPath();
          ctx.arc(px, py, p.radius * scale, 0, Math.PI * 2);
          const alpha = Math.max(0.04, Math.min(0.35, (scale - 0.5) * 0.6));
          ctx.fillStyle = `rgba(16, 185, 129, ${alpha})`;
          ctx.fill();
        }
      });

      // Central Morvexa Master Hub Node
      ctx.save();
      ctx.translate(centerX, centerY);

      // Core pulsating glow
      const glowPulse = Math.sin(time * 2) * 4 + 18;
      const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, glowPulse);
      gradient.addColorStop(0, "rgba(16, 185, 129, 0.9)");
      gradient.addColorStop(0.3, "rgba(5, 150, 105, 0.4)");
      gradient.addColorStop(1, "rgba(16, 185, 129, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, glowPulse, 0, Math.PI * 2);
      ctx.fill();

      // Inner solid geometric core
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#10b981";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      // Compute and draw orbiting agent nodes
      const nodeCoords: { x: number; y: number; name: string; color: string }[] = [];

      nodes.forEach((node) => {
        node.angle += node.speed;
        const orbitAngle = node.angle + currentRotY;
        const nx = centerX + Math.cos(orbitAngle) * node.r;
        const ny = centerY + Math.sin(orbitAngle) * (node.r * 0.28) + Math.sin(node.angle * 2) * 8;

        nodeCoords.push({ x: nx, y: ny, name: node.name, color: node.color });

        // Synaptic beam to center core
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(nx, ny);
        const linkGrad = ctx.createLinearGradient(centerX, centerY, nx, ny);
        linkGrad.addColorStop(0, "rgba(16, 185, 129, 0.25)");
        linkGrad.addColorStop(1, "rgba(16, 185, 129, 0.05)");
        ctx.strokeStyle = linkGrad;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Traveling pulse packet along the beam
        const packetProgress = (time * 0.8 + node.angle) % 1;
        const packetX = centerX + (nx - centerX) * packetProgress;
        const packetY = centerY + (ny - centerY) * packetProgress;

        ctx.beginPath();
        ctx.arc(packetX, packetY, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = "#34d399";
        ctx.shadowColor = "#10b981";
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Render agent node point
        ctx.beginPath();
        ctx.arc(nx, ny, node.size, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        ctx.font = "9px 'Geist Mono', monospace";
        ctx.fillStyle = "rgba(161, 161, 170, 0.75)";
        ctx.textAlign = "center";
        ctx.fillText(node.name, nx, ny + 14);
      });

      // Inter-node telemetry links
      for (let i = 0; i < nodeCoords.length; i++) {
        const next = nodeCoords[(i + 1) % nodeCoords.length];
        ctx.beginPath();
        ctx.moveTo(nodeCoords[i].x, nodeCoords[i].y);
        ctx.lineTo(next.x, next.y);
        ctx.strokeStyle = "rgba(16, 185, 129, 0.04)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [height, interactive]);

  return (
    <div className={`relative w-full overflow-hidden rounded-xl bg-[#06080a]/90 border border-white/[0.08] ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: `${height}px`, display: "block" }}
      />
      {/* Telemetry overlay pill */}
      <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/70 border border-white/10 text-[10px] font-mono text-zinc-300 backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-zinc-400">AGENTIC CONSTELLATION:</span>
        <span className="text-emerald-400 font-semibold">5 MESH NODES SYNCED</span>
      </div>

      <div className="absolute bottom-3 right-3 flex items-center gap-3 text-[10px] font-mono text-zinc-500">
        <span>FAILOVER READY: &lt;150ms</span>
        <span>•</span>
        <span className="text-zinc-400">ZERO BUFFER SSE</span>
      </div>
    </div>
  );
}

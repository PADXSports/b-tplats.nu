"use client";

import { useEffect, useRef } from "react";

const WAVES = [
  { amp: 28, freq: 0.0018, speed: 0.0004, y: 0.42, color: "rgba(13,148,136,0.12)", width: 2 },
  { amp: 20, freq: 0.0024, speed: 0.0006, y: 0.52, color: "rgba(13,148,136,0.08)", width: 1.5 },
  { amp: 14, freq: 0.003, speed: 0.0009, y: 0.6, color: "rgba(255,255,255,0.05)", width: 1 },
  { amp: 32, freq: 0.0014, speed: 0.0003, y: 0.35, color: "rgba(20,184,166,0.06)", width: 2.5 },
  { amp: 10, freq: 0.004, speed: 0.0012, y: 0.7, color: "rgba(255,255,255,0.03)", width: 1 },
];

export default function LandingHeroWave() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    let t = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = canvas.width = parent.clientWidth;
      height = canvas.height = parent.clientHeight;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      t += 1;
      WAVES.forEach((w) => {
        ctx.beginPath();
        ctx.strokeStyle = w.color;
        ctx.lineWidth = w.width;
        for (let x = 0; x <= width; x += 4) {
          const y = w.y * height + Math.sin(x * w.freq + t * w.speed * 1000) * w.amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
      aria-hidden
    />
  );
}

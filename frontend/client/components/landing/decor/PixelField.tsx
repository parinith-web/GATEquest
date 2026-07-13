import React, { useEffect, useRef } from "react";

/* ------------------------------------------------------------------ */
/*  PixelField                                                         */
/*                                                                      */
/*  Nest's PixelBlast.tsx (landing-page/src/components/PixelBlast.tsx) */
/*  is a full WebGL pass built on three.js + postprocessing — a grid of */
/*  pixels that ripple outward from mouse/touch input. Pulling in that  */
/*  full render pipeline for one decorative background isn't worth the  */
/*  dependency weight here, so this is a canvas-2D approximation of the */
/*  same idea: a grid of squares that drift and ripple outward from the */
/*  pointer, faded at the edges. Same visual role (ambient, "circuit    */
/*  board" texture behind a section), much smaller footprint.           */
/* ------------------------------------------------------------------ */

interface PixelFieldProps {
  color?: string;
  pixelSize?: number;
  gap?: number;
  className?: string;
}

export function PixelField({
  color = "#5DA2FA",
  pixelSize = 3,
  gap = 14,
  className = "",
}: PixelFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rippleRef = useRef<{ x: number; y: number; t: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const step = gap;
    let t = 0;

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      rippleRef.current.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        t: 0,
      });
      if (rippleRef.current.length > 6) rippleRef.current.shift();
    };
    canvas.addEventListener("pointermove", onMove);

    const draw = () => {
      t += 0.012;
      ctx.clearRect(0, 0, width, height);

      const cols = Math.ceil(width / step) + 1;
      const rows = Math.ceil(height / step) + 1;

      for (let cx = 0; cx < cols; cx++) {
        for (let cy = 0; cy < rows; cy++) {
          const x = cx * step;
          const y = cy * step;

          // Ambient drift so the field never sits perfectly still.
          let alpha =
            0.05 + 0.05 * Math.sin(cx * 0.35 + cy * 0.25 + t * 1.6);

          // Ripple contribution from recent pointer moves.
          for (const r of rippleRef.current) {
            const dx = x - r.x;
            const dy = y - r.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const wave = Math.sin(dist * 0.12 - r.t * 3.2);
            const falloff = Math.max(0, 1 - dist / 260);
            alpha += Math.max(0, wave) * falloff * 0.5;
          }

          // Edge fade so the grid feels contained within the panel.
          const edgeX = Math.min(x, width - x) / (width * 0.25);
          const edgeY = Math.min(y, height - y) / (height * 0.25);
          const edge = Math.min(1, Math.min(edgeX, edgeY));
          alpha *= Math.max(0, edge);

          if (alpha <= 0.02) continue;

          ctx.fillStyle = color;
          ctx.globalAlpha = Math.min(1, alpha);
          ctx.fillRect(x, y, pixelSize, pixelSize);
        }
      }

      ctx.globalAlpha = 1;
      for (const r of rippleRef.current) r.t += 0.02;
      rippleRef.current = rippleRef.current.filter((r) => r.t < 4);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
    };
  }, [color, pixelSize, gap]);

  return (
    <canvas
      ref={canvasRef}
      className={"block h-full w-full " + className}
      style={{ touchAction: "none" }}
    />
  );
}

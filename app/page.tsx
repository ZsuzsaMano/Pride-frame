"use client";

import { useEffect, useRef, useState } from "react";

const RAINBOW = [
  "#E40303",
  "#FF8C00",
  "#FFED00",
  "#008026",
  "#004DFF",
  "#750787",
];

const CANVAS_SIZE = 1080;

function mixHex(a: string, b: string, t: number) {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  const m = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}

export default function PrideFramePage() {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [frameWidth, setFrameWidth] = useState(8);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const onFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    setOffset({ x: 0, y: 0 });
    setZoom(1);
  };

  useEffect(() => {
    if (!imgSrc) return;
    const i = new Image();
    i.onload = () => setImg(i);
    i.src = imgSrc;
  }, [imgSrc]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    if (!img) {
      ctx.fillStyle = "#f4f4f5";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      return;
    }

    const border = (frameWidth / 100) * CANVAS_SIZE;
    const inner = CANVAS_SIZE - border * 2;
    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;
    const outerR = CANVAS_SIZE / 2;
    const innerR = inner / 2;

    // draw image clipped to inner circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.clip();

    const baseScale = Math.max(inner / img.width, inner / img.height);
    const scale = baseScale * zoom;
    const w = img.width * scale;
    const h = img.height * scale;
    const ix = cx + offset.x;
    const iy = cy + offset.y;
    ctx.drawImage(img, ix - w / 2, iy - h / 2, w, h);
    ctx.restore();

    // rainbow conic gradient ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
    ctx.clip("evenodd");

    const createConic = (
      ctx as CanvasRenderingContext2D & {
        createConicGradient?: (a: number, x: number, y: number) => CanvasGradient;
      }
    ).createConicGradient;

    if (typeof createConic === "function") {
      const grad = createConic.call(ctx, -Math.PI / 2, cx, cy);
      const stops = [...RAINBOW, RAINBOW[0]];
      stops.forEach((color, i) => grad.addColorStop(i / (stops.length - 1), color));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    } else {
      const segs = 360;
      for (let i = 0; i < segs; i++) {
        const t = (i / segs) * RAINBOW.length;
        const i0 = Math.floor(t) % RAINBOW.length;
        const i1 = (i0 + 1) % RAINBOW.length;
        ctx.fillStyle = mixHex(RAINBOW[i0], RAINBOW[i1], t - Math.floor(t));
        const a0 = -Math.PI / 2 + (i / segs) * Math.PI * 2;
        const a1 = -Math.PI / 2 + ((i + 1.5) / segs) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, outerR, a0, a1);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }, [img, zoom, frameWidth, offset]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!img) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const ratio = CANVAS_SIZE / rect.width;
    setOffset({
      x: dragRef.current.ox + (e.clientX - dragRef.current.x) * ratio,
      y: dragRef.current.oy + (e.clientY - dragRef.current.y) * ratio,
    });
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const download = () => {
    const c = canvasRef.current;
    if (!c) return;
    const link = document.createElement("a");
    link.download = "pride-frame.png";
    link.href = c.toDataURL("image/png");
    link.click();
  };

  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(90deg, ${RAINBOW.join(",")})`,
              }}
            >
              Pride Frame
            </span>
          </h1>
          <p className="mt-3 text-neutral-500">
            Upload a photo, position it, and download it with a rainbow frame.
            Runs entirely in your browser — nothing is uploaded or stored.
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-[1fr_280px]">
          <div className="flex flex-col items-center">
            <div
              className="relative w-full max-w-[560px] aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="h-full w-full touch-none select-none"
                style={{ cursor: img ? "grab" : "default" }}
              />
              {!img && (
                <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-2 text-neutral-500">
                  <svg
                    className="h-10 w-10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  <span className="text-sm">Click or drop an image to begin</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
                  />
                </label>
              )}
            </div>
            {img && (
              <p className="mt-3 text-xs text-neutral-500">
                Drag the image to reposition it.
              </p>
            )}
          </div>

          <aside className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-900">
                Image
              </label>
              <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 bg-neutral-100 px-4 py-3 text-sm text-neutral-700 transition-colors hover:bg-neutral-200">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {img ? "Replace image" : "Upload image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
                />
              </label>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-neutral-900">Zoom</label>
                <span className="text-xs text-neutral-500">{zoom.toFixed(2)}×</span>
              </div>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                disabled={!img}
                className="w-full accent-black"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-neutral-900">Frame width</label>
                <span className="text-xs text-neutral-500">{frameWidth}%</span>
              </div>
              <input
                type="range"
                min={3}
                max={18}
                step={1}
                value={frameWidth}
                onChange={(e) => setFrameWidth(parseInt(e.target.value))}
                className="w-full accent-black"
              />
            </div>

            <button
              onClick={download}
              disabled={!img}
              className="w-full rounded-md bg-neutral-950 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
            >
              Download PNG
            </button>

            <p className="text-xs text-neutral-500">
              Output is a 1080×1080 PNG, ready to share.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}

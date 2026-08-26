"use client";

import { useEffect, useRef } from "react";
import theme from "@/content/portfolio-theme.json";

function hexToRgb(hex) {
  return hex.match(/[a-f\d]{2}/gi).map((value) => Number.parseInt(value, 16));
}

const DARK = hexToRgb(theme.palette.background);
const LIGHT = hexToRgb(theme.palette.paper);
const RUST = hexToRgb(theme.palette.accent);

function mix(from, to, amount) {
  return from.map((value, index) => Math.round(value + (to[index] - value) * amount));
}

function coverImage(context, image, width, height) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height
  );
}

function drawProceduralFrame(context, width, height, phase) {
  context.fillStyle = "#151512";
  context.fillRect(0, 0, width, height);

  const pulse = 1 + Math.sin(phase) * 0.035;
  context.save();
  context.translate(width / 2, height / 2);
  context.scale(pulse, pulse);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `600 ${Math.min(width * 0.23, height * 0.42)}px Georgia, serif`;
  context.fillStyle = "#e2d9c8";
  context.fillText("ELIXPO", 0, 0);
  context.restore();

  context.strokeStyle = "#b63b12";
  context.lineWidth = Math.max(2, width / 800);
  for (let index = 0; index < 3; index += 1) {
    const radius = Math.min(width, height) * (0.18 + index * 0.12);
    context.beginPath();
    context.arc(
      width / 2,
      height / 2,
      radius + Math.sin(phase + index) * 2,
      phase * 0.35 * (index % 2 ? -1 : 1),
      Math.PI * (1.05 + index * 0.12)
    );
    context.stroke();
  }
}

export default function PixelBloomCanvas({
  src,
  mode = "portrait",
  className = "",
  cellSize,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext("2d", { alpha: false });
    const sampleCanvas = document.createElement("canvas");
    const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const image = src ? new Image() : null;
    let frameId;
    let lastFrame = 0;
    let ready = !image;

    if (image) {
      image.onload = () => {
        ready = true;
      };
      image.src = src;
    }

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(bounds.width * ratio));
      canvas.height = Math.max(1, Math.round(bounds.height * ratio));
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const render = (time) => {
      frameId = requestAnimationFrame(render);
      if (!ready || (!reducedMotion && time - lastFrame < 42)) return;
      if (reducedMotion && lastFrame > 0) return;
      lastFrame = time;

      const { width, height } = canvas;
      if (!width || !height) return;

      const configuredSize = mode === "background" ? theme.background.cellSize : theme.portrait.cellSize;
      const size = Math.max(4, Math.round((cellSize ?? configuredSize) * (width / canvas.clientWidth)));
      const loopDuration = theme.background.loopSeconds * 1000;
      const phase = ((time % loopDuration) / loopDuration) * Math.PI * 2;
      const gridWidth = Math.ceil(width / size);
      const gridHeight = Math.ceil(height / size);
      if (sampleCanvas.width !== gridWidth || sampleCanvas.height !== gridHeight) {
        sampleCanvas.width = gridWidth;
        sampleCanvas.height = gridHeight;
      }
      sampleContext.clearRect(0, 0, gridWidth, gridHeight);
      if (image) coverImage(sampleContext, image, gridWidth, gridHeight);
      else drawProceduralFrame(sampleContext, gridWidth, gridHeight, phase);

      const pixels = sampleContext.getImageData(0, 0, gridWidth, gridHeight).data;

      context.fillStyle = "#151512";
      context.fillRect(0, 0, width, height);

      for (let gridY = 0; gridY < gridHeight; gridY += 1) {
        for (let gridX = 0; gridX < gridWidth; gridX += 1) {
          const x = gridX * size;
          const y = gridY * size;
          const pixelIndex = (gridY * gridWidth + gridX) * 4;
          const luminance = Math.min(
            1,
            (pixels[pixelIndex] * 0.2126 +
              pixels[pixelIndex + 1] * 0.7152 +
              pixels[pixelIndex + 2] * 0.0722) /
              225
          );
          const wave = Math.sin(phase + x * 0.018 + y * 0.012) * 0.06;
          const level = Math.max(0, Math.min(1, luminance * 1.15 + wave));
          const base = mix(DARK, LIGHT, level);
          const color = mix(base, RUST, Math.max(0, 0.22 - Math.abs(level - 0.5)));
          const inset = mode === "background" ? Math.max(1, size * 0.08) : Math.max(0.5, size * 0.05);

          context.fillStyle = `rgb(${color[0]} ${color[1]} ${color[2]})`;
          context.fillRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
        }
      }

      const vignette = context.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.12,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.72
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, mode === "background" ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.48)");
      context.fillStyle = vignette;
      context.fillRect(0, 0, width, height);
    };

    frameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      if (image) image.onload = null;
    };
  }, [cellSize, mode, src]);

  return <canvas ref={canvasRef} aria-hidden="true" className={`h-full w-full ${className}`} />;
}

"use client";

import { useEffect, useRef } from "react";
import theme from "@/content/portfolio-theme.json";

function coverMedia(context, media, width, height) {
  const mediaWidth = media.videoWidth || media.naturalWidth;
  const mediaHeight = media.videoHeight || media.naturalHeight;
  const scale = Math.max(width / mediaWidth, height / mediaHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (mediaWidth - sourceWidth) / 2;
  const sourceY = (mediaHeight - sourceHeight) / 2;

  context.drawImage(
    media,
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

function roundedRectPath(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
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
  videoSrc,
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
    const video = videoSrc ? document.createElement("video") : null;
    const image = src && !video ? new Image() : null;
    let frameId;
    let lastFrame = 0;
    let ready = !image && !video;

    if (image) {
      image.onload = () => {
        ready = true;
      };
      image.src = src;
    }

    if (video) {
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "auto";
      video.addEventListener("loadeddata", () => {
        ready = true;
        video.play().catch(() => {});
      }, { once: true });
      video.src = videoSrc;
      video.load();
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
      sampleContext.save();
      sampleContext.filter = "blur(0.6px) saturate(1.08)";
      if (video) coverMedia(sampleContext, video, gridWidth, gridHeight);
      else if (image) coverMedia(sampleContext, image, gridWidth, gridHeight);
      else drawProceduralFrame(sampleContext, gridWidth, gridHeight, phase);
      sampleContext.restore();

      const pixels = sampleContext.getImageData(0, 0, gridWidth, gridHeight).data;

      context.save();
      if (video || image) {
        context.filter = "blur(7px) brightness(0.35) saturate(1.06)";
        coverMedia(context, video || image, width, height);
      } else {
        context.fillStyle = "#151512";
        context.fillRect(0, 0, width, height);
      }
      context.restore();
      context.fillStyle = "rgba(12, 12, 10, 0.16)";
      context.fillRect(0, 0, width, height);

      for (let gridY = 0; gridY < gridHeight; gridY += 1) {
        for (let gridX = 0; gridX < gridWidth; gridX += 1) {
          const x = gridX * size;
          const y = gridY * size;
          const pixelIndex = (gridY * gridWidth + gridX) * 4;
          const shimmer = 0.84 + Math.sin(phase + x * 0.018 + y * 0.012) * 0.025;
          const red = Math.round(pixels[pixelIndex] * shimmer);
          const green = Math.round(pixels[pixelIndex + 1] * shimmer);
          const blue = Math.round(pixels[pixelIndex + 2] * shimmer);
          const inset = mode === "background" ? Math.max(1.5, size * 0.1) : Math.max(1, size * 0.07);
          const tileX = x + inset;
          const tileY = y + inset;
          const tileSize = size - inset * 2;
          const radius = Math.max(1.25, tileSize * 0.08);

          roundedRectPath(context, tileX, tileY, tileSize, tileSize, radius);
          context.fillStyle = `rgba(${red}, ${green}, ${blue}, 0.78)`;
          context.fill();
          context.lineWidth = Math.max(0.6, size * 0.045);
          context.strokeStyle = "rgba(255, 255, 255, 0.13)";
          context.stroke();

          context.beginPath();
          context.moveTo(tileX + radius, tileY + context.lineWidth);
          context.lineTo(tileX + tileSize - radius, tileY + context.lineWidth);
          context.moveTo(tileX + context.lineWidth, tileY + radius);
          context.lineTo(tileX + context.lineWidth, tileY + tileSize * 0.58);
          context.lineWidth = Math.max(0.7, size * 0.05);
          context.strokeStyle = "rgba(255, 255, 255, 0.28)";
          context.stroke();

          context.beginPath();
          context.moveTo(tileX + radius, tileY + tileSize - context.lineWidth);
          context.lineTo(tileX + tileSize - radius, tileY + tileSize - context.lineWidth);
          context.moveTo(tileX + tileSize - context.lineWidth, tileY + tileSize * 0.42);
          context.lineTo(tileX + tileSize - context.lineWidth, tileY + tileSize - radius);
          context.strokeStyle = "rgba(0, 0, 0, 0.2)";
          context.stroke();

          context.beginPath();
          context.arc(tileX + radius * 1.35, tileY + radius * 1.35, Math.max(0.7, size * 0.035), 0, Math.PI * 2);
          context.fillStyle = "rgba(255, 255, 255, 0.22)";
          context.fill();
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
      vignette.addColorStop(0.62, "rgba(0,0,0,0.04)");
      vignette.addColorStop(1, mode === "background" ? "rgba(0,0,0,0.46)" : "rgba(0,0,0,0.36)");
      context.fillStyle = vignette;
      context.fillRect(0, 0, width, height);
    };

    frameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      if (image) image.onload = null;
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [cellSize, mode, src, videoSrc]);

  return <canvas ref={canvasRef} aria-hidden="true" className={`h-full w-full ${className}`} />;
}

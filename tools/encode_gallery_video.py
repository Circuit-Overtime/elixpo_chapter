"""Encode a host video as a smooth, bundled Oreo Gallery stream.

The output is RV565 v3: a 12-byte header followed by one continuous zlib
stream of native 320x240 big-endian RGB565 frames. The badge keeps a single
inflater and one frame buffer alive for the whole clip, avoiding the per-frame
allocator/decompressor churn of WiFi-upload format v2.

Usage:
    python3 tools/encode_gallery_video.py spiderman.mp4 \
        apps/gallery/assets/optimized/spiderman.rv565 --seconds 10 --fps 15
"""

import argparse
import shutil
import struct
import subprocess
import sys
import zlib
from pathlib import Path


W = 320
H = 240


def encode(source: Path, output: Path, seconds: float, fps: int):
    if shutil.which("ffmpeg") is None:
        raise SystemExit("ffmpeg is required")
    if not source.is_file():
        raise SystemExit("source not found: %s" % source)
    if fps < 1 or fps > 20:
        raise SystemExit("fps must be between 1 and 20")

    frame_bytes = W * H * 2
    vf = ("fps=%d,scale=%d:%d:force_original_aspect_ratio=increase,"
          "crop=%d:%d" % (fps, W, H, W, H))
    cmd = [
        "ffmpeg", "-v", "error", "-i", str(source),
        "-t", str(seconds), "-an", "-vf", vf,
        "-pix_fmt", "rgb565be", "-f", "rawvideo", "-",
    ]

    output.parent.mkdir(parents=True, exist_ok=True)
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    compressor = zlib.compressobj(level=6)
    frames = 0
    try:
        with output.open("wb+") as out:
            out.write(b"RV5\x03" + struct.pack("<HHBBH", W, H, fps, 0, 0))
            while True:
                frame = proc.stdout.read(frame_bytes)
                if not frame:
                    break
                if len(frame) != frame_bytes:
                    raise RuntimeError("ffmpeg returned a partial frame")
                chunk = compressor.compress(frame)
                if chunk:
                    out.write(chunk)
                frames += 1
            out.write(compressor.flush())
            out.seek(10)
            out.write(struct.pack("<H", frames))
    except Exception:
        try:
            output.unlink()
        except OSError:
            pass
        proc.kill()
        raise
    finally:
        if proc.stdout:
            proc.stdout.close()

    rc = proc.wait()
    if rc != 0 or frames == 0:
        try:
            output.unlink()
        except OSError:
            pass
        raise SystemExit("ffmpeg failed (rc=%d, frames=%d)" % (rc, frames))

    size_mb = output.stat().st_size / (1024 * 1024)
    print("Encoded %d frames at %d FPS: %.2f MB -> %s" %
          (frames, fps, size_mb, output))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--seconds", type=float, default=10.0)
    parser.add_argument("--fps", type=int, default=15)
    args = parser.parse_args()
    encode(args.source, args.output, args.seconds, args.fps)


if __name__ == "__main__":
    main()

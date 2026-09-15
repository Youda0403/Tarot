import { GIFEncoder, quantize } from "gifenc";
let encoder: ReturnType<typeof GIFEncoder> | null = null;
let palette: number[][] | null = null;
// Colour cache, keyed by 5-6-5 bucket: the exact colour that owns each bucket
// and the palette index it resolved to, with every other colour that lands in
// an owned bucket kept in `spill`.
let owner: Int32Array | null = null;
let ownerIndex: Uint8Array | null = null;
let spill: Map<number, number> | null = null;

function resetCache() {
  owner = new Int32Array(65536).fill(-1);
  ownerIndex = new Uint8Array(65536);
  spill = new Map();
}

function nearest(r: number, g: number, b: number) {
  const colors = palette!;
  let best = 0,
    bestDistance = Infinity;
  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    const dr = color[0] - r,
      dg = color[1] - g,
      db = color[2] - b;
    const distance = dr * dr + dg * dg + db * db;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}

// gifenc's applyPalette caches its nearest-colour search per 5-6-5 bucket, so
// colours that share a bucket all take the index of whichever one the scan
// happens to reach first. That order shifts as the scene moves, which repaints
// whole flat areas in a different colour from one frame to the next — the
// colour flicker. Keying the cache on the exact colour instead, and keeping it
// for the whole GIF, makes a pixel's colour depend only on the pixel.
function indexFrame(rgba: Uint8Array, pixels: number) {
  const buckets = owner!,
    indexes = ownerIndex!,
    extra = spill!;
  const index = new Uint8Array(pixels);
  for (let p = 0, q = 0; p < pixels; p++, q += 4) {
    const r = rgba[q],
      g = rgba[q + 1],
      b = rgba[q + 2];
    const bucket = ((r << 8) & 0xf800) | ((g << 2) & 0x03e0) | (b >> 3);
    const color = (r << 16) | (g << 8) | b;
    const held = buckets[bucket];
    if (held === color) {
      index[p] = indexes[bucket];
    } else if (held === -1) {
      const match = nearest(r, g, b);
      buckets[bucket] = color;
      indexes[bucket] = match;
      index[p] = match;
    } else {
      let match = extra.get(color);
      if (match === undefined) {
        match = nearest(r, g, b);
        extra.set(color, match);
      }
      index[p] = match;
    }
  }
  return index;
}

self.onmessage = (event: MessageEvent) => {
  try {
    const { type, data, width, height, delay } = event.data;
    if (type === "start") {
      encoder = GIFEncoder();
      palette = quantize(new Uint8Array(data), 256);
      resetCache();
      self.postMessage({ type: "ready" });
    }
    if (type === "frame") {
      if (!encoder || !palette || !owner) throw new Error("Encoder not initialized");
      const rgba = new Uint8Array(data);
      const index = indexFrame(rgba, width * height);
      encoder.writeFrame(index, width, height, {
        palette,
        delay: delay ?? 40,
        repeat: 0,
      });
      self.postMessage({ type: "frame" });
    }
    if (type === "finish") {
      if (!encoder) throw new Error("Encoder not initialized");
      encoder.finish();
      const bytes = encoder.bytes();
      self.postMessage({ type: "done", bytes });
      encoder = null;
      palette = null;
      owner = null;
      ownerIndex = null;
      spill = null;
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "GIF encoding failed",
    });
  }
};

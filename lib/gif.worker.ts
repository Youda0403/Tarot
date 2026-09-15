import { GIFEncoder, quantize, applyPalette } from "gifenc";
let encoder: ReturnType<typeof GIFEncoder> | null = null;
let palette: number[][] | null = null;
self.onmessage = (event: MessageEvent) => {
  try {
    const { type, data, width, height, delay } = event.data;
    if (type === "start") {
      encoder = GIFEncoder();
      palette = quantize(new Uint8Array(data), 256);
      self.postMessage({ type: "ready" });
    }
    if (type === "frame") {
      if (!encoder || !palette) throw new Error("Encoder not initialized");
      const rgba = new Uint8Array(data);
      const index = applyPalette(rgba, palette);
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
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "GIF encoding failed",
    });
  }
};

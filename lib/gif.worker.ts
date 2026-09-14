import { GIFEncoder, quantize, applyPalette } from "gifenc";
let encoder: ReturnType<typeof GIFEncoder> | null = null;
self.onmessage = (event: MessageEvent) => {
  try {
    const { type, data, width, height } = event.data;
    if (type === "start") {
      encoder = GIFEncoder();
      self.postMessage({ type: "ready" });
    }
    if (type === "frame") {
      if (!encoder) throw new Error("Encoder not initialized");
      const rgba = new Uint8Array(data);
      const palette = quantize(rgba, 256);
      const index = applyPalette(rgba, palette);
      encoder.writeFrame(index, width, height, {
        palette,
        delay: 100,
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
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "GIF encoding failed",
    });
  }
};

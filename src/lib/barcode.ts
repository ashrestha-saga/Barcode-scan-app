import { BARCODE_DETECTOR_FORMATS, DECODE_MAX_WIDTH } from "@/constants/barcode";
import type { BarcodeDetector, BarcodeDetectorConstructor } from "@/interfaces/barcode";

export function getBarcodeDetectorCtor(): BarcodeDetectorConstructor | null {
  if (typeof window === "undefined") return null;
  return (
    (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
      .BarcodeDetector ?? null
  );
}

export async function createBarcodeDetector(): Promise<BarcodeDetector | null> {
  const Ctor = getBarcodeDetectorCtor();
  if (!Ctor) return null;
  let formats: string[] = [...BARCODE_DETECTOR_FORMATS];
  try {
    const supported = await Ctor.getSupportedFormats();
    formats = formats.filter((f) => supported.includes(f));
  } catch {
    /* keep requested defaults */
  }
  try {
    return new Ctor(formats.length ? { formats } : undefined);
  } catch {
    return null;
  }
}

type TorchCaps = { torch?: boolean };

export function streamSupportsTorch(stream: MediaStream | null): boolean {
  const track = stream?.getVideoTracks()[0];
  if (!track || typeof track.getCapabilities !== "function") return false;
  return Boolean((track.getCapabilities() as TorchCaps).torch);
}

export async function setTrackTorch(
  stream: MediaStream | null,
  on: boolean,
): Promise<void> {
  const track = stream?.getVideoTracks()[0];
  if (!track || !streamSupportsTorch(stream)) return;
  await track.applyConstraints({
    advanced: [{ torch: on } as unknown as MediaTrackConstraintSet],
  });
}

/** ZXing logs every miss via console.warn; mute only for the sync decode call. */
export function withSilencedConsoleWarn<T>(fn: () => T): T {
  const warn = console.warn;
  console.warn = () => {};
  try {
    return fn();
  } finally {
    console.warn = warn;
  }
}

export function sizeDecodeCanvas(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
): boolean {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return false;
  const scale = Math.min(1, DECODE_MAX_WIDTH / vw);
  const width = Math.max(1, Math.round(vw * scale));
  const height = Math.max(1, Math.round(vh * scale));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return true;
}

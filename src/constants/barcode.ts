/** Formats we request from BarcodeDetector / ZXing (EAN + GS1 UDI). */
export const BARCODE_DETECTOR_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "data_matrix",
] as const;

/** Ignore repeat reads of the same code for this long. */
export const SCAN_COOLDOWN_MS = 1600;

/** Decode poll interval (native + ZXing). */
export const DETECT_INTERVAL_MS = 200;

/** Downscale camera frames before ZXing decode. */
export const DECODE_MAX_WIDTH = 1280;

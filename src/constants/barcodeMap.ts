/**
 * Demo samples only (chips / docs). Online lookup uses oxean / oxartnum
 * directly via articleapi getArticles — no client-side remapping.
 */

/** GS1 element string: (01) GTIN-14 04262364530128 (17) 26.08.2026 (10) LOT20260827 */
export const UDI_500861 = "01042623645301281726082610LOT20260827";

/** GS1 element string: (01) 30888277436408 (17) 28.11.2027 (10) ZIM24W49 */
export const UDI_5001730 = "01308882774364081727112810ZIM24W49";

/** Sample EAN/UDI strings used in tests and docs. */
export const DEMO_SCAN_SAMPLES = [
  "4006144615694",
  "4260698610998",
  "4262364530128",
  UDI_500861,
  "30888277436408",
  UDI_5001730,
] as const;
122550
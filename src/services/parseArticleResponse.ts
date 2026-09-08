import type { GetArticlesApiResponse, ShopArticle } from "@/interfaces/article";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function parseGetArticlesResponse(
  payload: unknown,
): ShopArticle[] | null {
  const obj = asRecord(payload);
  if (!obj) return null;
  if (obj.status !== "success") return null;
  if (!Array.isArray(obj.data)) return [];
  return obj.data.filter(
    (row): row is ShopArticle => Boolean(row) && typeof row === "object",
  );
}

export function extractArticleError(payload: unknown, fallback: string): string {
  const obj = asRecord(payload) as GetArticlesApiResponse | null;
  if (!obj) return fallback;
  if (typeof obj.message === "string" && obj.message.trim()) return obj.message.trim();
  if (typeof obj.error === "string" && obj.error.trim()) return obj.error.trim();
  return fallback;
}

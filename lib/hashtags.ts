/** record2 해시태그 파싱 — 쉼표/공백/샵 혼재 대응 */
export function parseHashtags(
  value: string | null | undefined,
): string[] {
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];

  const parts = trimmed
    .split(/[,，、\s|/]+/)
    .map((part) => part.replace(/^#+/, "").trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(part);
  }
  return unique;
}

export function hashtagHref(tag: string): string {
  return `/hashtag/${encodeURIComponent(tag)}`;
}

export function normalizeHashtagParam(raw: string): string {
  try {
    return decodeURIComponent(raw).replace(/^#+/, "").trim();
  } catch {
    return raw.replace(/^#+/, "").trim();
  }
}

export function authorHasHashtag(
  record2: string | null | undefined,
  tag: string,
): boolean {
  const needle = tag.replace(/^#+/, "").trim().toLowerCase();
  if (!needle) return false;
  return parseHashtags(record2).some((t) => t.toLowerCase() === needle);
}

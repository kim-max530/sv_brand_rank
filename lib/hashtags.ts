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

/** 시스템 뱃지 전용 태그 (record2가 아닌 랭킹 플래그로 조회) */
export type SystemBadgeTag = "재구매" | "HOT" | "검색어";

export function resolveSystemBadgeTag(
  tag: string,
): SystemBadgeTag | null {
  const normalized = tag.replace(/^#+/, "").trim();
  if (normalized === "재구매") return "재구매";
  if (normalized === "HOT" || normalized.toLowerCase() === "hot") return "HOT";
  if (normalized === "검색어") return "검색어";
  return null;
}

export function authorHasHashtag(
  record2: string | null | undefined,
  tag: string,
): boolean {
  const needle = tag.replace(/^#+/, "").trim().toLowerCase();
  if (!needle) return false;
  return parseHashtags(record2).some((t) => t.toLowerCase() === needle);
}

/** range3 교재 목록 → 해시태그 키워드 */
export function parseRange3Tags(value: string | null | undefined): string[] {
  if (typeof value !== "string") return [];
  const cleaned = value
    .replace(/\s*등\s*$/u, "")
    .replace(/등$/u, "")
    .trim();
  return parseHashtags(cleaned);
}

/** 현재 태그와 함께 자주 등장하는 연관 태그 (최대 limit개) */
export function collectRelatedHashtags(
  authors: Array<{ record2?: string | null }>,
  currentTag: string,
  limit = 7,
): string[] {
  const needle = currentTag.replace(/^#+/, "").trim().toLowerCase();
  if (!needle) return [];

  const counts = new Map<string, { label: string; count: number }>();
  for (const author of authors) {
    const tags = parseHashtags(author.record2);
    if (!tags.some((t) => t.toLowerCase() === needle)) continue;
    for (const tag of tags) {
      const key = tag.toLowerCase();
      if (key === needle) continue;
      const prev = counts.get(key);
      if (prev) prev.count += 1;
      else counts.set(key, { label: tag, count: 1 });
    }
  }

  return [...counts.values()]
    .sort(
      (a, b) =>
        b.count - a.count || a.label.localeCompare(b.label, "ko"),
    )
    .slice(0, limit)
    .map((entry) => entry.label);
}

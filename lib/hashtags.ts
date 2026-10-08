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

/** 쿼리/탭 값을 Subject 필터로 정규화 (EN/KO 방어) */
export function normalizeSubjectFilterParam(
  raw: string | null | undefined,
): "전체" | "영어" | "국어" {
  const value = String(raw ?? "").trim();
  const upper = value.toUpperCase();
  if (value === "영어" || upper === "EN" || upper === "ENGLISH") return "영어";
  if (value === "국어" || upper === "KO" || upper === "KOREAN") return "국어";
  if (value === "전체" || upper === "ALL") return "전체";
  // 빈 값·미지정은 기본 영어 (혼합 노출 방지)
  if (!value) return "영어";
  return "영어";
}

export function hashtagHref(
  tag: string,
  subject?: string | null,
): string {
  const base = `/hashtag/${encodeURIComponent(tag)}`;
  if (subject == null || String(subject).trim() === "") return base;
  const normalized = normalizeSubjectFilterParam(subject);
  if (normalized === "전체") return base;
  return `${base}?subject=${encodeURIComponent(normalized)}`;
}

/** 저자가 선택 과목에 속하는지 (subjects 우선, 없으면 과목 필드) */
export function authorMatchesSubject(
  author: {
    과목?: string | null;
    subjects?: string[] | null;
    subject?: string | null;
  },
  activeSubject: string,
): boolean {
  const target = normalizeSubjectFilterParam(activeSubject);
  if (target === "전체") return true;

  const fromList = (author.subjects ?? [])
    .map((s) => normalizeSubjectFilterParam(s))
    .filter((s): s is "영어" | "국어" => s === "영어" || s === "국어");

  if (fromList.length > 0) {
    return fromList.includes(target);
  }

  const single = normalizeSubjectFilterParam(
    author.과목 ?? author.subject ?? "",
  );
  return single === target;
}

export function normalizeHashtagParam(raw: string): string {
  try {
    return decodeURIComponent(raw).replace(/^#+/, "").trim();
  } catch {
    return raw.replace(/^#+/, "").trim();
  }
}

/** 시스템 뱃지 전용 태그 (record2가 아닌 랭킹 플래그로 조회) */
export type SystemBadgeTag =
  | "재구매"
  | "HOT"
  | "검색어"
  | "인기Top"
  | "쏠북Pick";

export function resolveSystemBadgeTag(
  tag: string,
): SystemBadgeTag | null {
  const normalized = tag.replace(/^#+/, "").trim();
  if (normalized === "재구매") return "재구매";
  if (normalized === "HOT" || normalized.toLowerCase() === "hot") return "HOT";
  if (normalized === "검색어") return "검색어";
  if (
    normalized === "인기Top" ||
    normalized === "인기TOP" ||
    normalized.toLowerCase() === "인기top"
  ) {
    return "인기Top";
  }
  if (
    normalized === "쏠북Pick" ||
    normalized === "쏠북PICK" ||
    normalized.toLowerCase() === "쏠북pick"
  ) {
    return "쏠북Pick";
  }
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

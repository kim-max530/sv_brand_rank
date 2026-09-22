const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";

/** 탭 전환 시 재시도 비용을 줄이기 위한 성공 URL 캐시 */
const resolvedAvatarSrc = new Map<string, string>();
const resolvedBannerSrc = new Map<string, string>();

function safeId(uid: string): string {
  return typeof uid === "string" ? uid.trim() : "";
}

export function getProfileImageCandidates(uid: string): string[] {
  const id = safeId(uid);
  if (!SUPABASE_URL || !id) return [];
  const base = `${SUPABASE_URL}/storage/v1/object/public/brand_image`;
  // 대부분 P_UID.png — 소문자 후보는 폴백으로만 유지
  return [`${base}/P_${id}.png`, `${base}/p_${id}.png`];
}

export function getBannerImageCandidates(uid: string): string[] {
  const id = safeId(uid);
  if (!SUPABASE_URL || !id) return [];
  const base = `${SUPABASE_URL}/storage/v1/object/public/brand_banner`;
  return [
    `${base}/O_${id}.png`,
    `${base}/O_${id}.jpg`,
    `${base}/o_${id}.png`,
    `${base}/o_${id}.jpg`,
  ];
}

export function getCachedAvatarSrc(uid: string): string | undefined {
  return resolvedAvatarSrc.get(safeId(uid));
}

export function cacheAvatarSrc(uid: string, src: string): void {
  const id = safeId(uid);
  if (id && src) resolvedAvatarSrc.set(id, src);
}

export function getCachedBannerSrc(uid: string): string | undefined {
  return resolvedBannerSrc.get(safeId(uid));
}

export function cacheBannerSrc(uid: string, src: string): void {
  const id = safeId(uid);
  if (id && src) resolvedBannerSrc.set(id, src);
}

export function initialCandidateIndex(
  candidates: string[],
  cached: string | undefined,
): number {
  if (!cached) return 0;
  const index = candidates.indexOf(cached);
  return index >= 0 ? index : 0;
}

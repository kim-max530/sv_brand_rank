import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseHashtags } from "@/lib/hashtags";
import type { BrandInfo } from "@/types/ranking";

/** uid → 관리자가 추가한 추가 태그 목록 */
export async function fetchAuthorHashtagOverrides(): Promise<
  Map<string, string[]>
> {
  const map = new Map<string, string[]>();
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("author_hashtag_overrides")
      .select("uid, tags");

    if (error) {
      console.warn("[author_hashtag_overrides]", error.message);
      return map;
    }

    for (const row of data ?? []) {
      const uid = String(row.uid ?? "").trim();
      if (!uid) continue;
      map.set(uid, parseHashtags(String(row.tags ?? "")));
    }
  } catch (error) {
    console.warn("[author_hashtag_overrides]", error);
  }
  return map;
}

export function mergeRecord2Tags(
  base: string | null | undefined,
  extra: string[] | undefined,
): string | undefined {
  const merged = [
    ...parseHashtags(base),
    ...(extra ?? []).map((t) => t.replace(/^#+/, "").trim()).filter(Boolean),
  ];
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const tag of merged) {
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(tag);
  }
  return unique.length > 0 ? unique.join(", ") : undefined;
}

/** BrandInfo 목록에 override 해시태그를 병합 */
export function applyHashtagOverrides(
  list: BrandInfo[],
  overrides: Map<string, string[]>,
): BrandInfo[] {
  if (overrides.size === 0) return list;
  return list.map((info) => {
    const extra = overrides.get(info.UID);
    if (!extra || extra.length === 0) return info;
    const record2 = mergeRecord2Tags(info.record2, extra);
    return record2 ? { ...info, record2 } : info;
  });
}

export function applyHashtagOverridesToMap(
  brandMap: Map<string, BrandInfo>,
  overrides: Map<string, string[]>,
): void {
  if (overrides.size === 0) return;
  for (const [uid, extra] of overrides) {
    if (!extra.length) continue;
    const current = brandMap.get(uid);
    if (!current) continue;
    const record2 = mergeRecord2Tags(current.record2, extra);
    brandMap.set(uid, record2 ? { ...current, record2 } : current);
  }
}

export async function getOverrideTagsForUid(uid: string): Promise<string[]> {
  const trimmed = uid.trim();
  if (!trimmed) return [];
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("author_hashtag_overrides")
      .select("tags")
      .eq("uid", trimmed)
      .maybeSingle();
    if (error) {
      console.warn("[author_hashtag_overrides] get", error.message);
      return [];
    }
    return parseHashtags(String(data?.tags ?? ""));
  } catch {
    return [];
  }
}

export async function saveOverrideTagsForUid(
  uid: string,
  tags: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = uid.trim();
  if (!trimmed) return { ok: false, error: "UID가 필요합니다." };

  try {
    const supabase = getSupabaseAdminClient();
    const unique = parseHashtags(tags.join(", "));
    if (unique.length === 0) {
      const { error } = await supabase
        .from("author_hashtag_overrides")
        .delete()
        .eq("uid", trimmed);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    const { error } = await supabase.from("author_hashtag_overrides").upsert(
      {
        uid: trimmed,
        tags: unique.join(", "),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "uid" },
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "해시태그 저장에 실패했습니다.",
    };
  }
}

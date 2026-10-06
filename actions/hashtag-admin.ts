"use server";

import { requireAdminSession } from "@/lib/admin-auth-server";
import {
  fetchAuthorHashtagOverrides,
  getOverrideTagsForUid,
  mergeRecord2Tags,
  saveOverrideTagsForUid,
} from "@/lib/author-hashtags";
import { fetchBrandInfoList } from "@/lib/csv";
import { warmHashtagAuthorIndex } from "@/lib/hashtag-index";
import { parseHashtags } from "@/lib/hashtags";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { revalidatePath, revalidateTag } from "next/cache";

export type HashtagRankRow = {
  tag: string;
  count: number;
};

export type HashtagAdminResult =
  | { ok: true; message: string; ranks?: HashtagRankRow[] }
  | { ok: false; error: string };

function normalizeTag(value: unknown): string {
  return String(value ?? "")
    .replace(/^#+/, "")
    .trim();
}

async function requireAdmin(): Promise<{ ok: false; error: string } | null> {
  if (await requireAdminSession()) return null;
  return { ok: false, error: "관리자 로그인이 필요합니다." };
}

/** 최근 7일 hashtag_click 집계 랭킹 */
export async function fetchHashtagClickRanksAction(): Promise<
  { ok: true; ranks: HashtagRankRow[] } | { ok: false; error: string }
> {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const supabase = getSupabaseAdminClient();
    const from = new Date();
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("analytics_events")
      .select("target_name")
      .eq("event_type", "hashtag_click")
      .gte("created_at", from.toISOString())
      .not("target_name", "is", null)
      .limit(5000);

    if (error) return { ok: false, error: error.message };

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const tag = normalizeTag(row.target_name);
      if (!tag) continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }

    const ranks = [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort(
        (a, b) =>
          b.count - a.count || a.tag.localeCompare(b.tag, "ko"),
      );

    return { ok: true, ranks };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "해시태그 랭킹을 불러오지 못했습니다.",
    };
  }
}

/** analytics_events 에서 해당 해시태그 클릭 기록 일괄 삭제 */
export async function deleteHashtagClickEventsAction(
  tag: string,
): Promise<HashtagAdminResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const normalized = normalizeTag(tag);
  if (!normalized) return { ok: false, error: "해시태그가 필요합니다." };

  try {
    const supabase = getSupabaseAdminClient();
    const needle = normalized.toLowerCase();

    const { data: rows, error: selectError } = await supabase
      .from("analytics_events")
      .select("id, target_name")
      .eq("event_type", "hashtag_click")
      .not("target_name", "is", null)
      .limit(5000);

    if (selectError) return { ok: false, error: selectError.message };

    const idsToDelete = (rows ?? [])
      .filter((row) => normalizeTag(row.target_name).toLowerCase() === needle)
      .map((row) => String(row.id ?? "").trim())
      .filter(Boolean);

    if (idsToDelete.length > 0) {
      // chunk deletes
      for (let i = 0; i < idsToDelete.length; i += 200) {
        const chunk = idsToDelete.slice(i, i + 200);
        const { error: delError } = await supabase
          .from("analytics_events")
          .delete()
          .in("id", chunk);
        if (delError) return { ok: false, error: delError.message };
      }
    }

    revalidatePath("/");
    revalidatePath("/admin");

    const ranksResult = await fetchHashtagClickRanksAction();
    return {
      ok: true,
      message: `#${normalized} 클릭 기록 ${idsToDelete.length}건이 삭제되었습니다.`,
      ranks: ranksResult.ok ? ranksResult.ranks : [],
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "해시태그 삭제에 실패했습니다.",
    };
  }
}

export async function searchAuthorsForHashtagAction(
  query: string,
): Promise<
  | {
      ok: true;
      authors: Array<{ UID: string; 저자명: string; record2: string }>;
    }
  | { ok: false; error: string }
> {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const q = query.trim().toLowerCase();
    if (!q) {
      return { ok: false, error: "검색어를 입력해 주세요." };
    }

    const [list, overrides] = await Promise.all([
      fetchBrandInfoList({ applyOverrides: false }),
      fetchAuthorHashtagOverrides(),
    ]);

    const authors: Array<{ UID: string; 저자명: string; record2: string }> = [];
    for (const info of list) {
      const nameHit = info.저자명.toLowerCase().includes(q);
      const uidHit = info.UID.toLowerCase().includes(q);
      if (!nameHit && !uidHit) continue;

      const record2 =
        mergeRecord2Tags(info.record2, overrides.get(info.UID)) ?? "";
      authors.push({
        UID: info.UID,
        저자명: info.저자명,
        record2,
      });
      if (authors.length >= 20) break;
    }

    if (authors.length === 0) {
      return {
        ok: false,
        error: "일치하는 저자를 찾지 못했습니다. 저자명 또는 UID를 확인해 주세요.",
      };
    }

    return { ok: true, authors };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "저자 검색에 실패했습니다.",
    };
  }
}

export async function appendAuthorHashtagAction(
  uid: string,
  rawTag: string,
): Promise<
  | { ok: true; message: string; record2: string }
  | { ok: false; error: string }
> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const trimmedUid = uid.trim();
  const tag = normalizeTag(rawTag);
  if (!trimmedUid) return { ok: false, error: "저자를 선택해 주세요." };
  if (!tag) return { ok: false, error: "추가할 해시태그를 입력해 주세요." };

  try {
    const list = await fetchBrandInfoList({ applyOverrides: false });
    const author = list.find((item) => item.UID === trimmedUid);
    if (!author) {
      return { ok: false, error: "해당 UID의 저자를 brand_info에서 찾지 못했습니다." };
    }

    const csvTags = parseHashtags(author.record2);
    const overrideTags = await getOverrideTagsForUid(trimmedUid);
    const existing = new Set(
      [...csvTags, ...overrideTags].map((t) => t.toLowerCase()),
    );

    if (existing.has(tag.toLowerCase())) {
      return { ok: false, error: "이미 등록된 해시태그입니다" };
    }

    const nextOverrides = [...overrideTags, tag];
    const saved = await saveOverrideTagsForUid(trimmedUid, nextOverrides);
    if (!saved.ok) return saved;

    revalidateTag("hashtag-data", { expire: 0 });
    revalidatePath("/");
    revalidatePath(`/hashtag/${encodeURIComponent(tag)}`);
    revalidatePath("/admin");
    try {
      await warmHashtagAuthorIndex();
    } catch (error) {
      console.warn("[hashtag-index] warm failed", error);
    }

    const record2 = mergeRecord2Tags(author.record2, nextOverrides) ?? "";
    return {
      ok: true,
      message: `#${tag} 해시태그가 ${author.저자명}에게 추가되었습니다.`,
      record2,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "해시태그 추가에 실패했습니다.",
    };
  }
}

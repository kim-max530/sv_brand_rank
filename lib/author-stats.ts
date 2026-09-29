import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type AuthorStatsMap = Map<string, number>;

const INITIAL_CLICKS_MIN = 12;
const INITIAL_CLICKS_MAX = 1000;
const IN_QUERY_CHUNK = 200;

/** 신규 UID 전용: 12 ~ 1000 사이 랜덤 초기 클릭수 */
export function randomInitialClicks(): number {
  return (
    Math.floor(Math.random() * (INITIAL_CLICKS_MAX - INITIAL_CLICKS_MIN + 1)) +
    INITIAL_CLICKS_MIN
  );
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * 랭킹 UID에 대해 author_stats를 조회한다.
 * - 기존 UID: total_clicks를 절대 덮어쓰지 않고 그대로 유지
 * - 신규 UID만: 12~1000 랜덤으로 INSERT (on conflict do nothing)
 * CSV 업로드/페이지 로드 시에도 누적 클릭수는 보존된다.
 */
export async function ensureAuthorStatsForUids(
  uids: string[],
): Promise<AuthorStatsMap> {
  const unique = [
    ...new Set(uids.map((uid) => String(uid ?? "").trim()).filter(Boolean)),
  ];
  const result: AuthorStatsMap = new Map();
  if (unique.length === 0) return result;

  try {
    const supabase = getSupabaseAdminClient();

    const found = new Set<string>();
    for (const chunk of chunkArray(unique, IN_QUERY_CHUNK)) {
      const { data: existing, error: selectError } = await supabase
        .from("author_stats")
        .select("uid, total_clicks")
        .in("uid", chunk);

      if (selectError) {
        console.warn("[author_stats] select", selectError.message);
        continue;
      }

      for (const row of existing ?? []) {
        const uid = String(row.uid ?? "").trim();
        if (!uid) continue;
        found.add(uid);
        result.set(uid, Math.max(0, Number(row.total_clicks) || 0));
      }
    }

    const missing = unique.filter((uid) => !found.has(uid));
    if (missing.length === 0) return result;

    const inserts = missing.map((uid) => ({
      uid,
      total_clicks: randomInitialClicks(),
      updated_at: new Date().toISOString(),
    }));

    // 화면에는 즉시 반영 (레이스 시 아래에서 DB 실값으로 재동기화)
    for (const row of inserts) {
      result.set(row.uid, row.total_clicks);
    }

    for (const chunk of chunkArray(inserts, IN_QUERY_CHUNK)) {
      // ignoreDuplicates = ON CONFLICT DO NOTHING → 기존 total_clicks 보존
      const { error: insertError } = await supabase
        .from("author_stats")
        .upsert(chunk, { onConflict: "uid", ignoreDuplicates: true });

      if (insertError) {
        console.warn("[author_stats] insert-new", insertError.message);
        // 행 단위 DO NOTHING 재시도 (절대 total_clicks 갱신 upsert 금지)
        for (const row of chunk) {
          const { error: rowError } = await supabase
            .from("author_stats")
            .upsert(row, { onConflict: "uid", ignoreDuplicates: true });
          if (rowError) {
            console.warn("[author_stats] insert-new row", rowError.message);
          }
        }
      }
    }

    // DB에 실제로 들어 있는 값으로만 재동기화 (기존 UID 클릭수 보존 확인)
    for (const chunk of chunkArray(
      inserts.map((row) => row.uid),
      IN_QUERY_CHUNK,
    )) {
      const { data: refreshed, error: refreshError } = await supabase
        .from("author_stats")
        .select("uid, total_clicks")
        .in("uid", chunk);

      if (refreshError) {
        console.warn("[author_stats] refresh", refreshError.message);
        continue;
      }

      for (const row of refreshed ?? []) {
        const uid = String(row.uid ?? "").trim();
        if (!uid) continue;
        result.set(uid, Math.max(0, Number(row.total_clicks) || 0));
      }
    }

    return result;
  } catch (error) {
    console.warn("[author_stats]", error);
    // DB 실패 시에만 미존재 UID에 임시 랜덤값 (기존 조회분은 유지)
    for (const uid of unique) {
      if (!result.has(uid)) {
        result.set(uid, randomInitialClicks());
      }
    }
    return result;
  }
}

/** total_clicks +1. 성공 시 새 값, 실패 시 null. 기존 값은 절대 0으로 리셋하지 않음. */
export async function incrementAuthorClicks(
  uid: string,
): Promise<number | null> {
  const trimmed = String(uid ?? "").trim();
  if (!trimmed) return null;

  try {
    const supabase = getSupabaseAdminClient();

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "increment_author_clicks",
      { p_uid: trimmed },
    );

    if (!rpcError && rpcData != null) {
      return Math.max(0, Number(rpcData) || 0);
    }

    if (rpcError) {
      console.warn("[author_stats] rpc", rpcError.message);
    }

    const { data: current, error: selectError } = await supabase
      .from("author_stats")
      .select("total_clicks")
      .eq("uid", trimmed)
      .maybeSingle();

    if (selectError) {
      console.warn("[author_stats] increment select", selectError.message);
      return null;
    }

    if (current != null) {
      const next = Math.max(0, Number(current.total_clicks) || 0) + 1;
      const { error: updateError } = await supabase
        .from("author_stats")
        .update({
          total_clicks: next,
          updated_at: new Date().toISOString(),
        })
        .eq("uid", trimmed);

      if (updateError) {
        console.warn("[author_stats] increment update", updateError.message);
        return null;
      }
      return next;
    }

    // 완전 신규 UID: 초기 랜덤값으로 INSERT만 (덮어쓰기 없음)
    const initial = randomInitialClicks();
    const { error: insertError } = await supabase
      .from("author_stats")
      .upsert(
        {
          uid: trimmed,
          total_clicks: initial,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "uid", ignoreDuplicates: true },
      );

    if (insertError) {
      console.warn("[author_stats] increment insert", insertError.message);
      return null;
    }

    const { data: after } = await supabase
      .from("author_stats")
      .select("total_clicks")
      .eq("uid", trimmed)
      .maybeSingle();

    return after != null
      ? Math.max(0, Number(after.total_clicks) || 0)
      : initial;
  } catch (error) {
    console.warn("[author_stats] increment", error);
    return null;
  }
}

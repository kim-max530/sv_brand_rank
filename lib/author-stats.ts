import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type AuthorStatsMap = Map<string, number>;

const INITIAL_CLICKS_MIN = 12;
const INITIAL_CLICKS_MAX = 1000;
const IN_QUERY_CHUNK = 200;

/** 12 ~ 1000 사이 랜덤 초기 클릭수 */
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
 * 랭킹 UID들에 대해 author_stats를 조회하고,
 * DB에 없는 UID는 12~1000 랜덤으로 INSERT한 뒤 Map에 즉시 반영합니다.
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

    // 화면 렌더링에 즉시 반영 (DB 실패 여부와 무관)
    for (const row of inserts) {
      result.set(row.uid, row.total_clicks);
    }

    for (const chunk of chunkArray(inserts, IN_QUERY_CHUNK)) {
      const { error: upsertError } = await supabase
        .from("author_stats")
        .upsert(chunk, { onConflict: "uid", ignoreDuplicates: true });

      if (upsertError) {
        console.warn("[author_stats] upsert", upsertError.message);
        // insert 실패 시 일반 upsert로 재시도
        const { error: retryError } = await supabase
          .from("author_stats")
          .upsert(chunk, { onConflict: "uid" });
        if (retryError) {
          console.warn("[author_stats] upsert retry", retryError.message);
        }
      }
    }

    // DB에 실제로 들어간 값으로 재동기화 (누락 UID는 위에서 넣은 랜덤 유지)
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
    // DB 통신 실패 시에도 누락 UID에 랜덤값을 채워 화면이 비지 않게 함
    for (const uid of unique) {
      if (!result.has(uid)) {
        result.set(uid, randomInitialClicks());
      }
    }
    return result;
  }
}

/** total_clicks +1. 성공 시 새 값, 실패 시 null */
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

    const next =
      current == null
        ? randomInitialClicks()
        : Math.max(0, Number(current.total_clicks) || 0) + 1;

    const { error: writeError } = await supabase.from("author_stats").upsert(
      {
        uid: trimmed,
        total_clicks: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "uid" },
    );

    if (writeError) {
      console.warn("[author_stats] increment upsert", writeError.message);
      return null;
    }

    return next;
  } catch (error) {
    console.warn("[author_stats] increment", error);
    return null;
  }
}

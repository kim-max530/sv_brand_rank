import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type AuthorStatsMap = Map<string, number>;

function randomInitialClicks(): number {
  return Math.floor(Math.random() * 1000) + 1;
}

/** 랭킹 UID들에 대해 author_stats를 조회하고, 없으면 1~1000 랜덤으로 INSERT */
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

    const { data: existing, error: selectError } = await supabase
      .from("author_stats")
      .select("uid, total_clicks")
      .in("uid", unique);

    if (selectError) {
      console.warn("[author_stats] select", selectError.message);
      return result;
    }

    const found = new Set<string>();
    for (const row of existing ?? []) {
      const uid = String(row.uid ?? "").trim();
      if (!uid) continue;
      found.add(uid);
      result.set(uid, Math.max(0, Number(row.total_clicks) || 0));
    }

    const missing = unique.filter((uid) => !found.has(uid));
    if (missing.length === 0) return result;

    const inserts = missing.map((uid) => ({
      uid,
      total_clicks: randomInitialClicks(),
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase
      .from("author_stats")
      .upsert(inserts, { onConflict: "uid", ignoreDuplicates: true });

    if (upsertError) {
      console.warn("[author_stats] upsert", upsertError.message);
    }

    // 경쟁 삽입·ignoreDuplicates 대비 최종 재조회
    const { data: refreshed, error: refreshError } = await supabase
      .from("author_stats")
      .select("uid, total_clicks")
      .in("uid", unique);

    if (refreshError) {
      console.warn("[author_stats] refresh", refreshError.message);
      for (const row of inserts) {
        if (!result.has(row.uid)) result.set(row.uid, row.total_clicks);
      }
      return result;
    }

    result.clear();
    for (const row of refreshed ?? []) {
      const uid = String(row.uid ?? "").trim();
      if (!uid) continue;
      result.set(uid, Math.max(0, Number(row.total_clicks) || 0));
    }

    return result;
  } catch (error) {
    console.warn("[author_stats]", error);
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

    const next = Math.max(0, Number(current?.total_clicks) || 0) + 1;
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

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const DEFAULT_EVENT_DISCOUNT = 35;

export interface AuthorEventRow {
  uid: string;
  author_name: string;
  start_date: string;
  end_date: string;
  /** 할인율(%). DB에 없으면 35 */
  discount_percent: number;
}

function todayKstDateString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function normalizeDiscount(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_EVENT_DISCOUNT;
  return Math.min(100, Math.round(n));
}

/** 오늘(KST)이 이벤트 기간에 포함된 UID → 할인율 */
export async function fetchActiveAuthorEvents(): Promise<Map<string, number>> {
  try {
    const supabase = getSupabaseAdminClient();
    const today = todayKstDateString();
    const { data, error } = await supabase
      .from("author_events")
      .select("uid, start_date, end_date, discount_percent")
      .lte("start_date", today)
      .gte("end_date", today);

    if (error) {
      // discount_percent 컬럼 미적용 DB 폴백
      const fallback = await supabase
        .from("author_events")
        .select("uid, start_date, end_date")
        .lte("start_date", today)
        .gte("end_date", today);
      if (fallback.error) {
        console.warn("[author_events]", error.message);
        return new Map();
      }
      return new Map(
        (fallback.data ?? [])
          .map((row) => String(row.uid ?? "").trim())
          .filter(Boolean)
          .map((uid) => [uid, DEFAULT_EVENT_DISCOUNT] as const),
      );
    }

    const map = new Map<string, number>();
    for (const row of data ?? []) {
      const uid = String(row.uid ?? "").trim();
      if (!uid) continue;
      map.set(uid, normalizeDiscount(row.discount_percent));
    }
    return map;
  } catch (error) {
    console.warn("[author_events]", error);
    return new Map();
  }
}

/** @deprecated use fetchActiveAuthorEvents */
export async function fetchActiveAuthorEventUids(): Promise<Set<string>> {
  return new Set((await fetchActiveAuthorEvents()).keys());
}

export async function listAuthorEvents(): Promise<AuthorEventRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("author_events")
    .select("uid, author_name, start_date, end_date, discount_percent")
    .order("end_date", { ascending: false });

  if (error) {
    const fallback = await supabase
      .from("author_events")
      .select("uid, author_name, start_date, end_date")
      .order("end_date", { ascending: false });
    if (fallback.error) throw new Error(fallback.error.message);
    return (fallback.data ?? []).map((row) => ({
      uid: String(row.uid),
      author_name: String(row.author_name),
      start_date: String(row.start_date),
      end_date: String(row.end_date),
      discount_percent: DEFAULT_EVENT_DISCOUNT,
    }));
  }

  return (data ?? []).map((row) => ({
    uid: String(row.uid),
    author_name: String(row.author_name),
    start_date: String(row.start_date),
    end_date: String(row.end_date),
    discount_percent: normalizeDiscount(row.discount_percent),
  }));
}

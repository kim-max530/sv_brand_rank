import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export interface AuthorEventRow {
  uid: string;
  author_name: string;
  start_date: string;
  end_date: string;
  updated_at?: string;
}

function todayKstDateString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** 오늘(KST)이 이벤트 기간에 포함된 UID 집합 */
export async function fetchActiveAuthorEventUids(): Promise<Set<string>> {
  try {
    const supabase = getSupabaseAdminClient();
    const today = todayKstDateString();
    const { data, error } = await supabase
      .from("author_events")
      .select("uid, start_date, end_date")
      .lte("start_date", today)
      .gte("end_date", today);

    if (error) {
      console.warn("[author_events]", error.message);
      return new Set();
    }

    return new Set(
      (data ?? [])
        .map((row) => String(row.uid ?? "").trim())
        .filter(Boolean),
    );
  } catch (error) {
    console.warn("[author_events]", error);
    return new Set();
  }
}

export async function listAuthorEvents(): Promise<AuthorEventRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("author_events")
    .select("uid, author_name, start_date, end_date, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AuthorEventRow[];
}

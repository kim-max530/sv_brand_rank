"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type AnalyticsPeriod = "day" | "week" | "month";

export interface AnalyticsSummary {
  period: AnalyticsPeriod;
  rangeStart: string;
  rangeEnd: string;
  totals: {
    page_view: number;
    tab_click: number;
    profile_click: number;
    homepage_click: number;
    all: number;
  };
  byTarget: Array<{
    event_type: string;
    target_name: string;
    count: number;
  }>;
  byBucket: Array<{
    label: string;
    page_view: number;
    tab_click: number;
    profile_click: number;
    homepage_click: number;
    all: number;
  }>;
}

function toKstDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function startOfPeriod(period: AnalyticsPeriod): Date {
  const now = new Date();
  if (period === "day") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const d = new Date(now);
  d.setDate(d.getDate() - 29);
  d.setHours(0, 0, 0, 0);
  return d;
}

function bucketKey(iso: string, period: AnalyticsPeriod): string {
  const date = new Date(iso);
  if (period === "day") {
    return toKstDate(date);
  }
  if (period === "week") {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return `${toKstDate(d)} 주`;
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  const m = parts.find((p) => p.type === "month")?.value ?? "";
  return `${y}-${m}`;
}

export async function fetchAnalyticsSummary(
  period: AnalyticsPeriod,
): Promise<{ ok: true; data: AnalyticsSummary } | { ok: false; error: string }> {
  try {
    const supabase = getSupabaseAdminClient();
    const from = startOfPeriod(period);
    const { data, error } = await supabase
      .from("analytics_events")
      .select("event_type, target_name, created_at")
      .gte("created_at", from.toISOString())
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) {
      return { ok: false, error: error.message };
    }

    const rows = data ?? [];
    const totals = {
      page_view: 0,
      tab_click: 0,
      profile_click: 0,
      homepage_click: 0,
      all: rows.length,
    };

    const targetMap = new Map<string, number>();
    const bucketMap = new Map<
      string,
      {
        page_view: number;
        tab_click: number;
        profile_click: number;
        homepage_click: number;
        all: number;
      }
    >();

    for (const row of rows) {
      const type = String(row.event_type ?? "");
      if (type in totals && type !== "all") {
        totals[type as keyof Omit<typeof totals, "all">] += 1;
      }

      const target = String(row.target_name ?? "").trim() || "(없음)";
      const targetKey = `${type}::${target}`;
      targetMap.set(targetKey, (targetMap.get(targetKey) ?? 0) + 1);

      const label = bucketKey(String(row.created_at), period);
      const bucket = bucketMap.get(label) ?? {
        page_view: 0,
        tab_click: 0,
        profile_click: 0,
        homepage_click: 0,
        all: 0,
      };
      bucket.all += 1;
      if (
        type === "page_view" ||
        type === "tab_click" ||
        type === "profile_click" ||
        type === "homepage_click"
      ) {
        bucket[type] += 1;
      }
      bucketMap.set(label, bucket);
    }

    const byTarget = [...targetMap.entries()]
      .map(([key, count]) => {
        const [event_type, target_name] = key.split("::");
        return { event_type, target_name, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);

    const byBucket = [...bucketMap.entries()]
      .map(([label, counts]) => ({ label, ...counts }))
      .sort((a, b) => (a.label < b.label ? 1 : -1));

    return {
      ok: true,
      data: {
        period,
        rangeStart: toKstDate(from),
        rangeEnd: toKstDate(new Date()),
        totals,
        byTarget,
        byBucket,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "애널리틱스 데이터를 불러오지 못했습니다.",
    };
  }
}
